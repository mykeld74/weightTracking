import { fail } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { progressPhoto } from '$lib/server/db/schema';
import { isPhotoView, type PhotoMeta, type PhotoView } from '$lib/tracking/photos';
import { todayIsoDate } from '$lib/tracking/dates';

const allowedTypes = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const maxBytes = 2_500_000;
const maxThumbBytes = 200_000;

export function photoFormError(message: string, recordedOn = todayIsoDate()) {
	return fail(400, { message, recordedOn });
}

export function toPhotoMeta(row: {
	id: string;
	recordedOn: string;
	view: PhotoView;
	createdAt: Date;
}): PhotoMeta {
	return {
		id: row.id,
		recordedOn: row.recordedOn,
		view: row.view,
		updatedAt: row.createdAt.getTime()
	};
}

export function readPhotoView(formData: FormData): PhotoView | null {
	const view = formData.get('view')?.toString() ?? '';
	return isPhotoView(view) ? view : null;
}

async function readImagePart(
	value: FormDataEntryValue | null,
	limit: number
): Promise<{ mimeType: string; bytes: Buffer } | null> {
	if (!(value instanceof File) || value.size === 0) return null;
	if (value.size > limit) return null;
	if (!allowedTypes.has(value.type)) return null;

	return {
		mimeType: value.type === 'image/jpg' ? 'image/jpeg' : value.type,
		bytes: Buffer.from(await value.arrayBuffer())
	};
}

export async function readPhotoFile(formData: FormData): Promise<{
	mimeType: string;
	imageData: Buffer;
	thumbData: Buffer | null;
} | null> {
	const image = await readImagePart(formData.get('image'), maxBytes);
	if (!image) return null;

	// The client sends a downscaled preview alongside the full image. If it's
	// missing or rejected we simply store none and fall back to the full image.
	const thumb = await readImagePart(formData.get('thumb'), maxThumbBytes);

	return {
		mimeType: image.mimeType,
		imageData: image.bytes,
		thumbData: thumb?.bytes ?? null
	};
}

export async function upsertPhoto(input: {
	userId: string;
	recordedOn: string;
	view: PhotoView;
	mimeType: string;
	imageData: Buffer;
	thumbData: Buffer | null;
}) {
	await db
		.insert(progressPhoto)
		.values({
			id: crypto.randomUUID(),
			userId: input.userId,
			recordedOn: input.recordedOn,
			view: input.view,
			mimeType: input.mimeType,
			imageData: input.imageData,
			thumbData: input.thumbData
		})
		.onConflictDoUpdate({
			target: [progressPhoto.userId, progressPhoto.recordedOn, progressPhoto.view],
			set: {
				mimeType: input.mimeType,
				imageData: input.imageData,
				thumbData: input.thumbData,
				createdAt: new Date()
			}
		});
}

export async function deletePhoto(userId: string, id: string) {
	await db
		.delete(progressPhoto)
		.where(and(eq(progressPhoto.id, id), eq(progressPhoto.userId, userId)));
}
