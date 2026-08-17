import { fail } from '@sveltejs/kit';
import { and, desc, eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { bodyComposition, bodyMeasurement, progressPhoto } from '$lib/server/db/schema';
import { isIsoDate, todayIsoDate } from '$lib/tracking/dates';
import { groupPhotosByDate, type PhotoView } from '$lib/tracking/photos';
import {
	deletePhoto,
	photoFormError,
	readPhotoFile,
	readPhotoView,
	toPhotoMeta,
	upsertPhoto
} from '$lib/server/photos';
import { readRecordedOn } from '$lib/server/form';
import { requireApprovedUser } from '$lib/server/access';

export const load: PageServerLoad = async (event) => {
	const user = requireApprovedUser(event);

	// Photo metadata only — the image bytes are served by /photos/file/[id].
	const photoRows = await db
		.select({
			id: progressPhoto.id,
			recordedOn: progressPhoto.recordedOn,
			view: progressPhoto.view,
			createdAt: progressPhoto.createdAt
		})
		.from(progressPhoto)
		.where(eq(progressPhoto.userId, user.id))
		.orderBy(desc(progressPhoto.recordedOn));

	const photos = photoRows.map((row) => toPhotoMeta({ ...row, view: row.view as PhotoView }));
	const days = groupPhotosByDate(photos);
	const requested = event.url.searchParams.get('date');
	const selectedDate =
		requested && isIsoDate(requested) ? requested : (days[0]?.recordedOn ?? todayIsoDate());

	// Only the selected day's stats are needed, so don't drag the whole history
	// across the wire on every visit.
	const [composition, measurements] = await Promise.all([
		db
			.select()
			.from(bodyComposition)
			.where(and(eq(bodyComposition.userId, user.id), eq(bodyComposition.recordedOn, selectedDate)))
			.limit(1),
		db
			.select()
			.from(bodyMeasurement)
			.where(and(eq(bodyMeasurement.userId, user.id), eq(bodyMeasurement.recordedOn, selectedDate)))
			.limit(1)
	]);

	return {
		days,
		composition: composition[0] ?? null,
		measurement: measurements[0] ?? null,
		selectedDate
	};
};

export const actions: Actions = {
	save: async (event) => {
		const user = requireApprovedUser(event);

		const formData = await event.request.formData();
		const recordedOn = readRecordedOn(formData);
		if (!recordedOn) return photoFormError('Choose a valid date.');

		const view = readPhotoView(formData);
		if (!view) return photoFormError('Choose a view.', recordedOn);

		const file = await readPhotoFile(formData);
		if (!file) {
			return photoFormError('Choose a JPEG, PNG, or WebP under 2.5 MB.', recordedOn);
		}

		await upsertPhoto({
			userId: user.id,
			recordedOn,
			view,
			mimeType: file.mimeType,
			imageData: file.imageData,
			thumbData: file.thumbData
		});

		return { success: true, recordedOn };
	},
	remove: async (event) => {
		const user = requireApprovedUser(event);

		const formData = await event.request.formData();
		const recordedOn = readRecordedOn(formData) ?? todayIsoDate();
		const id = formData.get('id')?.toString();
		if (!id) return fail(400, { message: 'Missing photo.', recordedOn });

		await deletePhoto(user.id, id);
		return { success: true, recordedOn };
	},
	removeDay: async (event) => {
		const user = requireApprovedUser(event);

		const formData = await event.request.formData();
		const recordedOn = readRecordedOn(formData);
		if (!recordedOn) return photoFormError('Choose a valid date.');

		await db
			.delete(progressPhoto)
			.where(and(eq(progressPhoto.userId, user.id), eq(progressPhoto.recordedOn, recordedOn)));

		return { success: true, recordedOn };
	}
};
