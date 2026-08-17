import { error, redirect } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import type { AppUser } from '$lib/tracking/users';

/**
 * Signed in, approved, and therefore allowed to touch tracking data.
 * Everything under `(app)` funnels through this.
 */
export function requireApprovedUser(event: RequestEvent): AppUser {
	const user = event.locals.user;
	if (!user) redirect(302, '/login');
	if (!user.approvedAt) redirect(302, '/pending');
	return user;
}

/** Signed in and holding the admin role. */
export function requireAdmin(event: RequestEvent): AppUser {
	const user = requireApprovedUser(event);
	// 404 rather than 403 so the admin area isn't discoverable by probing.
	if (user.role !== 'admin') error(404, 'Not found');
	return user;
}

/** Where a signed-in user belongs right now. */
export function landingFor(user: Pick<AppUser, 'approvedAt'>): string {
	return user.approvedAt ? '/composition' : '/pending';
}
