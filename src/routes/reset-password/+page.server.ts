import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad, RequestEvent } from './$types';
import { auth } from '$lib/server/auth';
import { APIError } from 'better-auth/api';
import { consume, pruneThrottle } from '$lib/server/throttle';
import { landingFor } from '$lib/server/access';

const expiredMessage = 'This reset link is invalid or has expired.';

function tooManyAttempts(retryAfter: number, token: string) {
	const minutes = Math.ceil(retryAfter / 60);
	const wait = retryAfter <= 60 ? 'a moment' : `${minutes} minute${minutes === 1 ? '' : 's'}`;
	return fail(429, { message: `Too many attempts. Try again in ${wait}.`, token });
}

export const load: PageServerLoad = (event) => {
	if (event.locals.user) {
		redirect(302, landingFor(event.locals.user));
	}

	const token = event.url.searchParams.get('token');
	const error = event.url.searchParams.get('error');

	if (!token || error) {
		return { token: null, expired: true };
	}

	return { token, expired: false };
};

export const actions: Actions = {
	default: async (event: RequestEvent) => {
		const formData = await event.request.formData();
		const token = formData.get('token')?.toString() ?? '';
		const password = formData.get('password')?.toString() ?? '';
		const confirm = formData.get('confirm')?.toString() ?? '';

		if (!token) {
			return fail(400, { message: expiredMessage, token: '' });
		}

		if (!password || !confirm) {
			return fail(400, { message: 'Enter and confirm your new password.', token });
		}

		if (password !== confirm) {
			return fail(400, { message: 'Passwords do not match.', token });
		}

		if (password.length < 8) {
			return fail(400, { message: 'Password must be at least 8 characters.', token });
		}

		const throttle = await consume(`resetpw:ip:${event.getClientAddress()}`, {
			max: 10,
			windowSeconds: 3600
		});
		if (!throttle.allowed) return tooManyAttempts(throttle.retryAfter, token);
		await pruneThrottle();

		try {
			await auth.api.resetPassword({
				body: { newPassword: password, token },
				headers: event.request.headers
			});
		} catch (error) {
			if (error instanceof APIError) {
				return fail(400, { message: expiredMessage, token: '' });
			}
			return fail(500, { message: 'Unexpected error.', token });
		}

		redirect(302, '/login?reset=1');
	}
};
