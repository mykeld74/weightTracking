import { fail } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { bodyComposition, glp1Injection } from '$lib/server/db/schema';
import { metricFormError, readEntryId, readMetricValues, readRecordedOn } from '$lib/server/form';
import { compositionFields } from '$lib/tracking/fields';
import { parseMetricCsv } from '$lib/tracking/csv';
import { requireApprovedUser } from '$lib/server/access';
import {
	csvImportResult,
	importCompositionCsv,
	readCsvText
} from '$lib/server/importEntries';

export const load: PageServerLoad = async (event) => {
	const user = requireApprovedUser(event);

	const [entries, injections] = await Promise.all([
		db
			.select()
			.from(bodyComposition)
			.where(eq(bodyComposition.userId, user.id))
			.orderBy(bodyComposition.recordedOn),
		db
			.select({
				recordedOn: glp1Injection.recordedOn,
				medication: glp1Injection.medication,
				dosage: glp1Injection.dosage
			})
			.from(glp1Injection)
			.where(eq(glp1Injection.userId, user.id))
			.orderBy(glp1Injection.recordedOn)
	]);

	return { entries, injections };
};

export const actions: Actions = {
	save: async (event) => {
		const user = requireApprovedUser(event);

		const formData = await event.request.formData();
		const recordedOn = readRecordedOn(formData);
		if (!recordedOn) return metricFormError('Choose a valid date.');

		const { values, filledCount } = readMetricValues(formData, compositionFields);
		if (filledCount === 0) {
			return metricFormError('Enter at least one measurement.', recordedOn);
		}

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
		const formData = await event.request.formData();
		const file = await readCsvText(formData);
		if (!file.ok) return fail(400, { importMessage: file.importMessage });

		const parsed = parseMetricCsv(file.text, compositionFields);
		if (parsed.rows.length === 0) {
			return fail(400, {
				importMessage: parsed.errors[0] ?? 'No valid rows found in the CSV.'
			});
		}

		await importCompositionCsv(user.id, parsed.rows);
		return csvImportResult(parsed.rows.length, parsed.errors);
	}
};
