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
	const listPhotos = () =>
		db
			.select({
				id: progressPhoto.id,
				recordedOn: progressPhoto.recordedOn,
				view: progressPhoto.view,
				createdAt: progressPhoto.createdAt
			})
			.from(progressPhoto)
			.where(eq(progressPhoto.userId, user.id))
			.orderBy(desc(progressPhoto.recordedOn));

	// Only the selected day's stats are needed, so don't drag the whole history
	// across the wire on every visit.
	const dayStats = (day: string) =>
		Promise.all([
			db
				.select()
				.from(bodyComposition)
				.where(and(eq(bodyComposition.userId, user.id), eq(bodyComposition.recordedOn, day)))
				.limit(1),
			db
				.select()
				.from(bodyMeasurement)
				.where(and(eq(bodyMeasurement.userId, user.id), eq(bodyMeasurement.recordedOn, day)))
				.limit(1)
		]);

	const requested = event.url.searchParams.get('date');
	const knownDate = requested && isIsoDate(requested) ? requested : null;

	// Switching days carries ?date=, so the day's stats don't have to wait on the
	// photo list — one round trip instead of two. Only the first visit, which has
	// to discover the latest day, still needs them in sequence.
	const [photoRows, stats] = knownDate
		? await Promise.all([listPhotos(), dayStats(knownDate)])
		: await (async () => {
				const rows = await listPhotos();
				const fallback = rows[0]?.recordedOn ?? todayIsoDate();
				return [rows, await dayStats(fallback)] as const;
			})();

	const photos = photoRows.map((row) => toPhotoMeta({ ...row, view: row.view as PhotoView }));
	const days = groupPhotosByDate(photos);
	const selectedDate = knownDate ?? days[0]?.recordedOn ?? todayIsoDate();
	const [composition, measurements] = stats;

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
