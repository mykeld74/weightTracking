import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireApprovedUserApi } from '$lib/server/access';
import { listOpenInvites } from '$lib/server/invite';

export const GET: RequestHandler = async (event) => {
	const user = requireApprovedUserApi(event);
	// Scoped to the caller: a regular user only ever sees invitations they sent.
	return json(
		{ invites: await listOpenInvites(user.id) },
		{ headers: { 'Cache-Control': 'private, no-store' } }
	);
};
