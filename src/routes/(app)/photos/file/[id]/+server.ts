import { error } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { progressPhoto } from '$lib/server/db/schema';
import { requireApprovedUser } from '$lib/server/access';

/** Fetch exactly one blob column so a thumbnail request never reads the full image. */
async function readColumn(userId: string, id: string, column: PgColumn) {
	const [row] = await db
		.select({ mimeType: progressPhoto.mimeType, bytes: column })
		.from(progressPhoto)
		.where(and(eq(progressPhoto.id, id), eq(progressPhoto.userId, userId)))
		.limit(1);

	return row as { mimeType: string; bytes: Buffer | null } | undefined;
}

export const GET: RequestHandler = async (event) => {
	const user = requireApprovedUser(event);
	const wantsThumb = event.url.searchParams.get('size') === 'thumb';
	const id = event.params.id;

	let photo = await readColumn(
		user.id,
		id,
		wantsThumb ? progressPhoto.thumbData : progressPhoto.imageData
	);
	if (!photo) error(404, 'Photo not found');

	// Rows written before thumbnails existed have no preview; fall back to the
	// full image only in that case, so it stays off the hot path.
	if (!photo.bytes && wantsThumb) {
		photo = await readColumn(user.id, id, progressPhoto.imageData);
	}

	const bytes = photo?.bytes;
	if (!bytes) error(404, 'Photo not found');

	return new Response(new Uint8Array(bytes), {
		headers: {
			'Content-Type': photo!.mimeType,
			// Short private cache: long enough that a page full of photos is cheap,
			// short enough that copies don't linger for a year after sign-out.
			// URLs already carry ?t=<updatedAt>, so edits show up immediately.
			'Cache-Control': 'private, max-age=300, must-revalidate',
			'X-Content-Type-Options': 'nosniff',
			'Content-Disposition': 'inline'
		}
	});
};
