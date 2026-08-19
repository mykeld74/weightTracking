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

/**
 * API variant of the same gate. JSON callers need a status code, not a 302 to
 * an HTML sign-in page (which a `fetch` would happily follow and then fail to
 * parse). Same rules, different failure mode.
 */
export function requireApprovedUserApi(event: RequestEvent): AppUser {
	const user = event.locals.user;
	if (!user) error(401, 'Not signed in');
	if (!user.approvedAt) error(403, 'Account is awaiting approval');
	return user;
}

/** Signed in and holding the admin role. */
export function requireAdmin(event: RequestEvent): AppUser {
	const user = requireApprovedUser(event);
	// 404 rather than 403 so the admin area isn't discoverable by probing.
	if (user.role !== 'admin') error(404, 'Not found');
	return user;
}

/** API variant of the admin gate — 404 rather than a redirect, for JSON callers. */
export function requireAdminApi(event: RequestEvent): AppUser {
	const user = requireApprovedUserApi(event);
	// 404 rather than 403 so the admin API isn't discoverable by probing.
	if (user.role !== 'admin') error(404, 'Not found');
	return user;
}

/** Where a signed-in user belongs right now. */
export function landingFor(user: Pick<AppUser, 'approvedAt'>): string {
	return user.approvedAt ? '/composition' : '/pending';
}
