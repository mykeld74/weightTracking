import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import { APIError } from 'better-auth/api';
import { auth } from '$lib/server/auth';
import { requireApprovedUser } from '$lib/server/access';
import { consumeAll, pruneThrottle } from '$lib/server/throttle';

export const actions: Actions = {
	default: async (event) => {
		const user = requireApprovedUser(event);
		const formData = await event.request.formData();
		const currentPassword = formData.get('currentPassword')?.toString() ?? '';
		const newPassword = formData.get('newPassword')?.toString() ?? '';
		const confirm = formData.get('confirm')?.toString() ?? '';

		if (!currentPassword || !newPassword || !confirm) {
			return fail(400, { message: 'Fill in your current password and the new one twice.' });
		}

		if (newPassword !== confirm) {
			return fail(400, { message: 'New passwords do not match.' });
		}

		if (newPassword.length < 8) {
			return fail(400, { message: 'Password must be at least 8 characters.' });
		}

		const throttle = await consumeAll([
			{ key: `changepw:ip:${event.getClientAddress()}`, rule: { max: 10, windowSeconds: 3600 } },
			{ key: `changepw:user:${user.id}`, rule: { max: 5, windowSeconds: 3600 } }
		]);
		if (!throttle.allowed) {
			const minutes = Math.ceil(throttle.retryAfter / 60);
			const wait =
				throttle.retryAfter <= 60 ? 'a moment' : `${minutes} minute${minutes === 1 ? '' : 's'}`;
			return fail(429, { message: `Too many attempts. Try again in ${wait}.` });
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
				return fail(400, { message: 'Current password is incorrect.' });
			}
			return fail(500, { message: 'Unexpected error.' });
		}

		return { success: true, message: 'Password updated. Other devices were signed out.' };
	}
};
