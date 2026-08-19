import { json } from '@sveltejs/kit';
import { asc } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { requireAdminApi } from '$lib/server/access';
import { listOpenInvites } from '$lib/server/invite';

/**
 * Account fields only. An admin manages who can get in; this is never a route
 * to another person's measurements or photos.
 */
const accountColumns = {
	id: user.id,
	name: user.name,
	email: user.email,
	role: user.role,
	approvedAt: user.approvedAt,
	createdAt: user.createdAt
};

export const GET: RequestHandler = async (event) => {
	requireAdminApi(event);

	const [accounts, invites] = await Promise.all([
		db.select(accountColumns).from(user).orderBy(asc(user.createdAt)),
		listOpenInvites()
	]);

	return json({ accounts, invites }, { headers: { 'Cache-Control': 'private, no-store' } });
};
