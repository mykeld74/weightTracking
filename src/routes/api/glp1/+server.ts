import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireApprovedUserApi } from '$lib/server/access';
import { loadGlp1 } from '$lib/server/glp1';

export const GET: RequestHandler = async (event) => {
	const user = requireApprovedUserApi(event);
	return json(await loadGlp1(user.id), { headers: { 'Cache-Control': 'private, no-store' } });
};
