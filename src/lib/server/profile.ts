import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { bodyComposition, user } from '$lib/server/db/schema';
import {
	applyCompositionCalculations,
	compositionCalculatedKeys,
	isBiologicalSex,
	type UserProfile
} from '$lib/tracking/compositionCalc';
import { compositionFields } from '$lib/tracking/fields';
import type { AppUser } from '$lib/tracking/users';

export function profileFromUser(userRow: AppUser): UserProfile {
	const gender = userRow.gender;
	return {
		birthday: userRow.birthday ?? null,
		heightInches:
			typeof userRow.heightInches === 'number' && Number.isFinite(userRow.heightInches)
				? userRow.heightInches
				: null,
		gender: typeof gender === 'string' && isBiologicalSex(gender) ? gender : null
	};
}

export async function loadUserProfile(userId: string): Promise<UserProfile> {
	const [row] = await db
		.select({
			birthday: user.birthday,
			heightInches: user.heightInches,
			gender: user.gender
		})
		.from(user)
		.where(eq(user.id, userId))
		.limit(1);

	if (!row) {
		return { birthday: null, heightInches: null, gender: null };
	}

	return {
		birthday: row.birthday ?? null,
		heightInches: row.heightInches ?? null,
		gender: row.gender && isBiologicalSex(row.gender) ? row.gender : null
	};
}

/** Fill calculated columns; leave measured columns as provided. */
export function withCompositionCalculations(
	values: Record<string, number | null>,
	profile: UserProfile,
	recordedOn: string
): Record<string, number | null> {
	const calculated = applyCompositionCalculations(values, profile, recordedOn);
	const merged: Record<string, number | null> = { ...values };
	for (const key of compositionCalculatedKeys) {
		merged[key] = calculated[key] ?? null;
	}
	return merged;
}

/** Recompute derived metrics for every composition entry after a profile change. */
export async function recomputeCompositionForUser(userId: string, profile: UserProfile) {
	const rows = await db.select().from(bodyComposition).where(eq(bodyComposition.userId, userId));

	for (const row of rows) {
		const values: Record<string, number | null> = {};
		for (const field of compositionFields) {
			const raw = row[field.key as keyof typeof row];
			values[field.key] = typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
		}

		const next = withCompositionCalculations(values, profile, row.recordedOn);
		const set: Record<string, number | null> = {};
		for (const key of compositionCalculatedKeys) {
			set[key] = next[key] ?? null;
		}

		await db.update(bodyComposition).set(set).where(eq(bodyComposition.id, row.id));
	}
}
