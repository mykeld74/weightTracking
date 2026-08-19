import { error, json } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { bodyComposition, bodyMeasurement } from '$lib/server/db/schema';
import { requireApprovedUserApi } from '$lib/server/access';
import { isIsoDate } from '$lib/tracking/dates';

/** Composition and measurements for a single day, for the photo detail panel. */
export const GET: RequestHandler = async (event) => {
	const user = requireApprovedUserApi(event);

	const date = event.url.searchParams.get('date') ?? '';
	if (!isIsoDate(date)) error(400, 'Invalid date');

	const [composition, measurements] = await Promise.all([
		db
			.select()
			.from(bodyComposition)
			.where(and(eq(bodyComposition.userId, user.id), eq(bodyComposition.recordedOn, date)))
			.limit(1),
		db
			.select()
			.from(bodyMeasurement)
			.where(and(eq(bodyMeasurement.userId, user.id), eq(bodyMeasurement.recordedOn, date)))
			.limit(1)
	]);

	return json(
		{ composition: composition[0] ?? null, measurement: measurements[0] ?? null },
		{ headers: { 'Cache-Control': 'private, no-store' } }
	);
};
