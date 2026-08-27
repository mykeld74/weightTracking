import { json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { bodyComposition, glp1Injection } from '$lib/server/db/schema';
import { requireApprovedUserApi } from '$lib/server/access';
import { glp1StartedOnFor } from '$lib/server/glp1';

// Explicit columns: `select()` also ships user_id (identical on every row) and
// created_at, which the UI never reads.
const entryColumns = {
	id: bodyComposition.id,
	recordedOn: bodyComposition.recordedOn,
	weight: bodyComposition.weight,
	bmi: bodyComposition.bmi,
	bodyFat: bodyComposition.bodyFat,
	muscleMass: bodyComposition.muscleMass,
	muscleMassPercent: bodyComposition.muscleMassPercent,
	bodyWater: bodyComposition.bodyWater,
	leanBodyMass: bodyComposition.leanBodyMass,
	boneMass: bodyComposition.boneMass,
	protein: bodyComposition.protein,
	visceralFat: bodyComposition.visceralFat,
	bmr: bodyComposition.bmr,
	metabolicAge: bodyComposition.metabolicAge,
	skeletalMuscleRate: bodyComposition.skeletalMuscleRate,
	fatContent: bodyComposition.fatContent,
	subcutaneousFat: bodyComposition.subcutaneousFat
};

export const GET: RequestHandler = async (event) => {
	const user = requireApprovedUserApi(event);

	const [entries, injections, glp1StartedOn] = await Promise.all([
		db
			.select(entryColumns)
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
			.orderBy(glp1Injection.recordedOn),
		glp1StartedOnFor(user.id)
	]);

	// Personal health data: never let a shared cache hold it.
	return json(
		{ entries, injections, glp1StartedOn },
		{ headers: { 'Cache-Control': 'private, no-store' } }
	);
};
