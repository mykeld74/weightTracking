import { fail } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import type { Actions } from './$types';
import { db } from '$lib/server/db';
import { bodyComposition } from '$lib/server/db/schema';
import { metricFormError, readEntryId, readMetricValues, readRecordedOn } from '$lib/server/form';
import { compositionFields, compositionInputFields } from '$lib/tracking/fields';
import { parseMetricCsv } from '$lib/tracking/csv';
import { requireApprovedUser } from '$lib/server/access';
import { csvImportResult, importCompositionCsv, readCsvText } from '$lib/server/importEntries';
import { loadUserProfile, withCompositionCalculations } from '$lib/server/profile';

export const actions: Actions = {
	save: async (event) => {
		const user = requireApprovedUser(event);
		const profile = await loadUserProfile(user.id);

		const formData = await event.request.formData();
		const recordedOn = readRecordedOn(formData);
		if (!recordedOn) return metricFormError('Choose a valid date.');

		const { values: inputValues, filledCount } = readMetricValues(formData, compositionInputFields);
		if (filledCount === 0) {
			return metricFormError('Enter at least one measurement.', recordedOn);
		}

		// Start from nulls for every composition column, then overlay inputs + calcs.
		const base: Record<string, number | null> = {};
		for (const field of compositionFields) {
			base[field.key] = null;
		}
		const values = withCompositionCalculations({ ...base, ...inputValues }, profile, recordedOn);

		const id = readEntryId(formData);
		if (id) {
			const current = (
				await db
					.select({ id: bodyComposition.id, recordedOn: bodyComposition.recordedOn })
					.from(bodyComposition)
					.where(and(eq(bodyComposition.id, id), eq(bodyComposition.userId, user.id)))
					.limit(1)
			)[0];
			if (!current) return fail(400, { message: 'Missing entry.', recordedOn });

			if (recordedOn !== current.recordedOn) {
				const clash = (
					await db
						.select({ id: bodyComposition.id })
						.from(bodyComposition)
						.where(
							and(eq(bodyComposition.userId, user.id), eq(bodyComposition.recordedOn, recordedOn))
						)
						.limit(1)
				)[0];
				if (clash) return metricFormError('An entry already exists for that date.', recordedOn);
			}

			await db
				.update(bodyComposition)
				.set({ recordedOn, ...values })
				.where(and(eq(bodyComposition.id, id), eq(bodyComposition.userId, user.id)));

			return { success: true, recordedOn };
		}

		await db
			.insert(bodyComposition)
			.values({
				id: crypto.randomUUID(),
				userId: user.id,
				recordedOn,
				...values
			} satisfies typeof bodyComposition.$inferInsert)
			.onConflictDoUpdate({
				target: [bodyComposition.userId, bodyComposition.recordedOn],
				set: values
			});

		return { success: true, recordedOn };
	},
	remove: async (event) => {
		const user = requireApprovedUser(event);

		const id = (await event.request.formData()).get('id')?.toString();
		if (!id) return fail(400, { message: 'Missing entry.' });

		await db
			.delete(bodyComposition)
			.where(and(eq(bodyComposition.id, id), eq(bodyComposition.userId, user.id)));

		return { success: true };
	},
	importCsv: async (event) => {
		const user = requireApprovedUser(event);
		const profile = await loadUserProfile(user.id);
		const formData = await event.request.formData();
		const file = await readCsvText(formData);
		if (!file.ok) return fail(400, { importMessage: file.importMessage });

		// Parse against all headers so scale exports still match, then overwrite calcs.
		const parsed = parseMetricCsv(file.text, compositionFields);
		if (parsed.rows.length === 0) {
			return fail(400, {
				importMessage: parsed.errors[0] ?? 'No valid rows found in the CSV.'
			});
		}

		const rows = parsed.rows.map((row) => ({
			recordedOn: row.recordedOn,
			values: withCompositionCalculations(row.values, profile, row.recordedOn)
		}));

		await importCompositionCsv(user.id, rows);
		return csvImportResult(rows.length, parsed.errors);
	}
};
