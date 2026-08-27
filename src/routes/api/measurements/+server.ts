import { json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { bodyMeasurement } from '$lib/server/db/schema';
import { requireApprovedUserApi } from '$lib/server/access';
import { glp1StartedOnFor } from '$lib/server/glp1';

const entryColumns = {
	id: bodyMeasurement.id,
	recordedOn: bodyMeasurement.recordedOn,
	chest: bodyMeasurement.chest,
	stomach: bodyMeasurement.stomach,
	leftArm: bodyMeasurement.leftArm,
	rightArm: bodyMeasurement.rightArm,
	leftLeg: bodyMeasurement.leftLeg,
	rightLeg: bodyMeasurement.rightLeg
};

export const GET: RequestHandler = async (event) => {
	const user = requireApprovedUserApi(event);

	const [entries, glp1StartedOn] = await Promise.all([
		db
			.select(entryColumns)
			.from(bodyMeasurement)
			.where(eq(bodyMeasurement.userId, user.id))
			.orderBy(bodyMeasurement.recordedOn),
		glp1StartedOnFor(user.id)
	]);

	return json({ entries, glp1StartedOn }, { headers: { 'Cache-Control': 'private, no-store' } });
};
