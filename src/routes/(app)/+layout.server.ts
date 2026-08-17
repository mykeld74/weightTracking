import type { LayoutServerLoad } from './$types';
import { requireApprovedUser } from '$lib/server/access';

export const load: LayoutServerLoad = (event) => {
	// Redirects unauthenticated users to /login and unapproved ones to /pending.
	const user = requireApprovedUser(event);

	return {
		user: {
			id: user.id,
			name: user.name,
			email: user.email,
			role: user.role
		}
	};
};
