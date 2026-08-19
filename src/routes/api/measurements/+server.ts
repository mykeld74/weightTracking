import { json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { bodyMeasurement } from '$lib/server/db/schema';
import { requireApprovedUserApi } from '$lib/server/access';

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

	const entries = await db
		.select(entryColumns)
		.from(bodyMeasurement)
		.where(eq(bodyMeasurement.userId, user.id))
		.orderBy(bodyMeasurement.recordedOn);

	return json({ entries }, { headers: { 'Cache-Control': 'private, no-store' } });
};
