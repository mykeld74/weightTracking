import { fail } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import type { Actions } from './$types';
import { db } from '$lib/server/db';
import { bodyMeasurement } from '$lib/server/db/schema';
import { metricFormError, readEntryId, readMetricValues, readRecordedOn } from '$lib/server/form';
import { measurementFields } from '$lib/tracking/fields';
import { parseMetricCsv } from '$lib/tracking/csv';
import { requireApprovedUser } from '$lib/server/access';
import { csvImportResult, importMeasurementCsv, readCsvText } from '$lib/server/importEntries';

export const actions: Actions = {
	save: async (event) => {
		const user = requireApprovedUser(event);

		const formData = await event.request.formData();
		const recordedOn = readRecordedOn(formData);
		if (!recordedOn) return metricFormError('Choose a valid date.');

		const { values, filledCount } = readMetricValues(formData, measurementFields);
		if (filledCount === 0) {
			return metricFormError('Enter at least one measurement.', recordedOn);
		}

		const id = readEntryId(formData);
		if (id) {
			const current = (
				await db
					.select({ id: bodyMeasurement.id, recordedOn: bodyMeasurement.recordedOn })
					.from(bodyMeasurement)
					.where(and(eq(bodyMeasurement.id, id), eq(bodyMeasurement.userId, user.id)))
					.limit(1)
			)[0];
			if (!current) return fail(400, { message: 'Missing entry.', recordedOn });

			if (recordedOn !== current.recordedOn) {
				const clash = (
					await db
						.select({ id: bodyMeasurement.id })
						.from(bodyMeasurement)
						.where(
							and(eq(bodyMeasurement.userId, user.id), eq(bodyMeasurement.recordedOn, recordedOn))
						)
						.limit(1)
				)[0];
				if (clash) return metricFormError('An entry already exists for that date.', recordedOn);
			}

			await db
				.update(bodyMeasurement)
				.set({ recordedOn, ...values })
				.where(and(eq(bodyMeasurement.id, id), eq(bodyMeasurement.userId, user.id)));

			return { success: true, recordedOn };
		}

		await db
			.insert(bodyMeasurement)
			.values({
				id: crypto.randomUUID(),
				userId: user.id,
				recordedOn,
				...values
			} satisfies typeof bodyMeasurement.$inferInsert)
			.onConflictDoUpdate({
				target: [bodyMeasurement.userId, bodyMeasurement.recordedOn],
				set: values
			});

		return { success: true, recordedOn };
	},
	remove: async (event) => {
		const user = requireApprovedUser(event);

		const id = (await event.request.formData()).get('id')?.toString();
		if (!id) return fail(400, { message: 'Missing entry.' });

		await db
			.delete(bodyMeasurement)
			.where(and(eq(bodyMeasurement.id, id), eq(bodyMeasurement.userId, user.id)));

		return { success: true };
	},
	importCsv: async (event) => {
		const user = requireApprovedUser(event);
		const formData = await event.request.formData();
		const file = await readCsvText(formData);
		if (!file.ok) return fail(400, { importMessage: file.importMessage });

		const parsed = parseMetricCsv(file.text, measurementFields);
		if (parsed.rows.length === 0) {
			return fail(400, {
				importMessage: parsed.errors[0] ?? 'No valid rows found in the CSV.'
			});
		}

		await importMeasurementCsv(user.id, parsed.rows);
		return csvImportResult(parsed.rows.length, parsed.errors);
	}
};
