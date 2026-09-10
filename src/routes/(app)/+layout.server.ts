import type { LayoutServerLoad } from './$types';
import { requireApprovedUser } from '$lib/server/access';
import { loadUserProfile } from '$lib/server/profile';
import { ageOnDate } from '$lib/tracking/compositionCalc';
import { todayIsoDate } from '$lib/tracking/dates';

export const load: LayoutServerLoad = async (event) => {
	// Redirects unauthenticated users to /login and unapproved ones to /pending.
	const user = requireApprovedUser(event);
	const profile = await loadUserProfile(user.id);
	const age = profile.birthday ? ageOnDate(profile.birthday, todayIsoDate()) : null;

	return {
		user: {
			id: user.id,
			name: user.name,
			email: user.email,
			role: user.role
		},
		profile: {
			birthday: profile.birthday,
			heightInches: profile.heightInches,
			gender: profile.gender,
			age
		}
	};
};
