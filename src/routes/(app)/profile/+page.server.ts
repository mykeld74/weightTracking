import { fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { APIError } from 'better-auth/api';
import { auth } from '$lib/server/auth';
import { requireApprovedUser } from '$lib/server/access';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { consumeAll, pruneThrottle } from '$lib/server/throttle';
import { loadUserProfile, recomputeCompositionForUser } from '$lib/server/profile';
import { inchesFromFeetAndInches, isBiologicalSex } from '$lib/tracking/compositionCalc';
import { isIsoDate } from '$lib/tracking/dates';
import { parseOptionalNumber } from '$lib/server/form';

export const load: PageServerLoad = async (event) => {
	const current = requireApprovedUser(event);
	return { profile: await loadUserProfile(current.id) };
};

export const actions: Actions = {
	updateProfile: async (event) => {
		const current = requireApprovedUser(event);
		const formData = await event.request.formData();

		const birthdayRaw = formData.get('birthday')?.toString().trim() ?? '';
		const genderRaw = formData.get('gender')?.toString().trim() ?? '';
		const heightFeet = parseOptionalNumber(formData.get('heightFeet'));
		const heightInchesPart = parseOptionalNumber(formData.get('heightInchesPart'));
		const heightInches = inchesFromFeetAndInches(heightFeet, heightInchesPart);

		const birthday = birthdayRaw === '' ? null : birthdayRaw;
		if (birthday && !isIsoDate(birthday)) {
			return fail(400, { profileMessage: 'Enter a valid birthday.' });
		}
		if (birthday && birthday > new Date().toISOString().slice(0, 10)) {
			return fail(400, { profileMessage: 'Birthday cannot be in the future.' });
		}

		if (
			heightInchesPart != null &&
			(!Number.isInteger(heightInchesPart) || heightInchesPart < 0 || heightInchesPart > 11)
		) {
			return fail(400, { profileMessage: 'Inches should be a whole number from 0 to 11.' });
		}
		if (heightInches != null && (heightInches < 36 || heightInches > 96)) {
			return fail(400, { profileMessage: 'Height should be between 3′0″ and 8′0″.' });
		}

		const gender = genderRaw === '' ? null : genderRaw;
		if (gender && !isBiologicalSex(gender)) {
			return fail(400, { profileMessage: 'Choose male or female for BMR calculations.' });
		}

		const profile = {
			birthday,
			heightInches,
			gender: gender && isBiologicalSex(gender) ? gender : null
		};

		await db
			.update(user)
			.set({
				birthday: profile.birthday,
				heightInches: profile.heightInches,
				gender: profile.gender
			})
			.where(eq(user.id, current.id));

		await recomputeCompositionForUser(current.id, profile);

		return {
			success: true,
			profileMessage: 'Profile saved. Composition calculations were updated.'
		};
	},
	changePassword: async (event) => {
		const current = requireApprovedUser(event);
		const formData = await event.request.formData();
		const currentPassword = formData.get('currentPassword')?.toString() ?? '';
		const newPassword = formData.get('newPassword')?.toString() ?? '';
		const confirm = formData.get('confirm')?.toString() ?? '';

		if (!currentPassword || !newPassword || !confirm) {
			return fail(400, { passwordMessage: 'Fill in your current password and the new one twice.' });
		}

		if (newPassword !== confirm) {
			return fail(400, { passwordMessage: 'New passwords do not match.' });
		}

		if (newPassword.length < 8) {
			return fail(400, { passwordMessage: 'Password must be at least 8 characters.' });
		}

		const throttle = await consumeAll([
			{ key: `changepw:ip:${event.getClientAddress()}`, rule: { max: 10, windowSeconds: 3600 } },
			{ key: `changepw:user:${current.id}`, rule: { max: 5, windowSeconds: 3600 } }
		]);
		if (!throttle.allowed) {
			const minutes = Math.ceil(throttle.retryAfter / 60);
			const wait =
				throttle.retryAfter <= 60 ? 'a moment' : `${minutes} minute${minutes === 1 ? '' : 's'}`;
			return fail(429, { passwordMessage: `Too many attempts. Try again in ${wait}.` });
		}
		await pruneThrottle();

		try {
			await auth.api.changePassword({
				body: {
					currentPassword,
					newPassword,
					revokeOtherSessions: true
				},
				headers: event.request.headers
			});
		} catch (error) {
			if (error instanceof APIError) {
				return fail(400, { passwordMessage: 'Current password is incorrect.' });
			}
			return fail(500, { passwordMessage: 'Unexpected error.' });
		}

		return {
			success: true,
			passwordMessage: 'Password updated. Other devices were signed out.'
		};
	}
};
