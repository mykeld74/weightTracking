import { fail } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import type { Actions } from './$types';
import { db } from '$lib/server/db';
import { progressPhoto } from '$lib/server/db/schema';
import { todayIsoDate } from '$lib/tracking/dates';
import {
	deletePhoto,
	photoFormError,
	readPhotoFile,
	readPhotoView,
	upsertPhoto
} from '$lib/server/photos';
import { readRecordedOn } from '$lib/server/form';
import { requireApprovedUser } from '$lib/server/access';

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
