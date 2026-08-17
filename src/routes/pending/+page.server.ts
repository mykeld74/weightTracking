import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { auth } from '$lib/server/auth';

export const load: PageServerLoad = async (event) => {
	if (!event.locals.user) redirect(302, '/login');

	// This is the one page where session freshness matters more than the saved
	// query: skip the cookie cache so approval takes effect on the next reload
	// rather than up to a minute later.
	const session = await auth.api.getSession({
		headers: event.request.headers,
		query: { disableCookieCache: true }
	});

	const user = session?.user as
		{ name: string; email: string; approvedAt: Date | null } | undefined;
	if (!user) redirect(302, '/login');
	if (user.approvedAt) redirect(302, '/composition');

	return { name: user.name, email: user.email };
};
