import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { landingFor } from '$lib/server/access';

export const load: PageServerLoad = (event) => {
	if (event.locals.user) {
		redirect(302, landingFor(event.locals.user));
	}

	redirect(302, '/login');
};
