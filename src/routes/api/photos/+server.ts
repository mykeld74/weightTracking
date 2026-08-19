import { json } from '@sveltejs/kit';
import { desc, eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { progressPhoto } from '$lib/server/db/schema';
import { requireApprovedUserApi } from '$lib/server/access';
import { toPhotoMeta } from '$lib/server/photos';
import { groupPhotosByDate, type PhotoView } from '$lib/tracking/photos';

export const GET: RequestHandler = async (event) => {
	const user = requireApprovedUserApi(event);

	// Metadata only — the image bytes are served by /photos/file/[id].
	const rows = await db
		.select({
			id: progressPhoto.id,
			recordedOn: progressPhoto.recordedOn,
			view: progressPhoto.view,
			createdAt: progressPhoto.createdAt
		})
		.from(progressPhoto)
		.where(eq(progressPhoto.userId, user.id))
		.orderBy(desc(progressPhoto.recordedOn));

	const photos = rows.map((row) => toPhotoMeta({ ...row, view: row.view as PhotoView }));

	return json(
		{ days: groupPhotosByDate(photos) },
		{ headers: { 'Cache-Control': 'private, no-store' } }
	);
};
