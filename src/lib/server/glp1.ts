import { asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { glp1Injection, glp1Regimen } from '$lib/server/db/schema';
import { inferRegimens } from '$lib/tracking/glp1';

const regimenColumns = {
	id: glp1Regimen.id,
	medication: glp1Regimen.medication,
	startedOn: glp1Regimen.startedOn
};

export async function listEntries(userId: string) {
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

export async function listRegimens(userId: string) {
	return db
		.select(regimenColumns)
		.from(glp1Regimen)
		.where(eq(glp1Regimen.userId, userId))
		.orderBy(asc(glp1Regimen.startedOn));
}

/**
 * One-time backfill for users whose injections predate the regimen table.
 * Idempotent: it only writes when the user has no regimens at all.
 */
export async function ensureRegimens(
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

/** Entries plus regimens, with the backfill applied. Both queries run together. */
export async function loadGlp1(userId: string) {
	const [entries, existing] = await Promise.all([listEntries(userId), listRegimens(userId)]);
	return { entries, regimens: await ensureRegimens(userId, entries, existing) };
}
