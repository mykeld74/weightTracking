import { fail } from '@sveltejs/kit';
import { and, asc, eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { glp1Injection, glp1Regimen } from '$lib/server/db/schema';
import { requireApprovedUser } from '$lib/server/access';
import {
	metricFormError,
	parseOptionalNumber,
	readRecordedOn,
	readRequiredText
} from '$lib/server/form';
import { inferRegimens, medicationForDate } from '$lib/tracking/glp1';
import { todayIsoDate } from '$lib/tracking/dates';

const regimenColumns = {
	id: glp1Regimen.id,
	medication: glp1Regimen.medication,
	startedOn: glp1Regimen.startedOn
};

async function listEntries(userId: string) {
	return db
		.select({
			id: glp1Injection.id,
			recordedOn: glp1Injection.recordedOn,
			medication: glp1Injection.medication,
			dosage: glp1Injection.dosage,
			location: glp1Injection.location
		})
		.from(glp1Injection)
		.where(eq(glp1Injection.userId, userId))
		.orderBy(glp1Injection.recordedOn);
}

async function listRegimens(userId: string) {
	return db
		.select(regimenColumns)
		.from(glp1Regimen)
		.where(eq(glp1Regimen.userId, userId))
		.orderBy(asc(glp1Regimen.startedOn));
}

async function ensureRegimens(
	userId: string,
	entries: Awaited<ReturnType<typeof listEntries>>,
	existing: Awaited<ReturnType<typeof listRegimens>>
) {
	if (existing.length > 0) return existing;

	const inferred = inferRegimens(entries);
	if (inferred.length === 0) return [];

	await db.insert(glp1Regimen).values(
		inferred.map((regimen) => ({
			id: crypto.randomUUID(),
			userId,
			medication: regimen.medication,
			startedOn: regimen.startedOn
		}))
	);

	return listRegimens(userId);
}

// Streamed rather than awaited so navigation paints immediately. The two
// queries still run together — each Neon HTTP call is its own ~50ms round trip.
export const load: PageServerLoad = (event) => {
	const user = requireApprovedUser(event);

	const log = Promise.all([listEntries(user.id), listRegimens(user.id)]).then(
		async ([entries, existingRegimens]) => ({
			entries,
			// Backfilling regimens is a one-time path that only costs extra
			// queries when nothing exists yet.
			regimens: await ensureRegimens(user.id, entries, existingRegimens)
		})
	);

	return { userId: user.id, log };
};

export const actions: Actions = {
	saveMedication: async (event) => {
		const user = requireApprovedUser(event);
		const formData = await event.request.formData();
		const medication = readRequiredText(formData, 'medication');
		if (!medication) return fail(400, { message: 'Enter a medication.', intent: 'medication' });

		const startedOn = readRecordedOn(formData) ?? todayIsoDate();
		const regimens = await listRegimens(user.id);
		const covering = medicationForDate(regimens, startedOn);
		if (covering && covering.toLowerCase() === medication.toLowerCase()) {
			return { success: true, recordedOn: startedOn };
		}

		await db
			.insert(glp1Regimen)
			.values({
				id: crypto.randomUUID(),
				userId: user.id,
				medication,
				startedOn
			})
			.onConflictDoUpdate({
				target: [glp1Regimen.userId, glp1Regimen.startedOn],
				set: { medication }
			});

		return { success: true, recordedOn: startedOn };
	},
	save: async (event) => {
		const user = requireApprovedUser(event);

		const formData = await event.request.formData();
		const recordedOn = readRecordedOn(formData);
		if (!recordedOn) return metricFormError('Choose a valid date.');

		const dosage = parseOptionalNumber(formData.get('dosage'));
		if (dosage == null || dosage <= 0 || dosage > 100) {
			return metricFormError('Enter a dose in mg.', recordedOn);
		}

		const location = readRequiredText(formData, 'location');
		if (!location) return metricFormError('Enter an injection site.', recordedOn);

		const regimens = await listRegimens(user.id);
		const medication = medicationForDate(regimens, recordedOn);
		if (!medication) {
			return metricFormError('Choose a medication first.', recordedOn);
		}

		await db
			.insert(glp1Injection)
			.values({
				id: crypto.randomUUID(),
				userId: user.id,
				recordedOn,
				medication,
				dosage,
				location
			})
			.onConflictDoUpdate({
				target: [glp1Injection.userId, glp1Injection.recordedOn],
				set: { medication, dosage, location }
			});

		return { success: true, recordedOn };
	},
	remove: async (event) => {
		const user = requireApprovedUser(event);

		const id = (await event.request.formData()).get('id')?.toString();
		if (!id) return fail(400, { message: 'Missing entry.' });

		await db
			.delete(glp1Injection)
			.where(and(eq(glp1Injection.id, id), eq(glp1Injection.userId, user.id)));

		return { success: true };
	}
};
