import { fail } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { bodyMeasurement } from '$lib/server/db/schema';
import { metricFormError, readMetricValues, readRecordedOn } from '$lib/server/form';
import { measurementFields } from '$lib/tracking/fields';
import { requireApprovedUser } from '$lib/server/access';

export const load: PageServerLoad = async (event) => {
	const user = requireApprovedUser(event);

	const entries = await db
		.select()
		.from(bodyMeasurement)
		.where(eq(bodyMeasurement.userId, user.id))
		.orderBy(bodyMeasurement.recordedOn);

	return { entries };
};

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
	}
};
