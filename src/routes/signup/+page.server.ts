import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad, RequestEvent } from './$types';
import { auth } from '$lib/server/auth';
import { APIError } from 'better-auth/api';
import { consumeAll, pruneThrottle } from '$lib/server/throttle';
import { landingFor } from '$lib/server/access';
import { findOpenInviteByToken, isFirstAccount, withInviteToken } from '$lib/server/invite';

const signUpFailed = 'Could not create that account. Try a different email.';
const inviteFailed = 'This invitation is invalid or has expired.';

function throttleKeys(event: RequestEvent) {
	return [{ key: `signup:ip:${event.getClientAddress()}`, rule: { max: 3, windowSeconds: 3600 } }];
}

function tooManyAttempts(retryAfter: number) {
	const minutes = Math.ceil(retryAfter / 60);
	const wait = retryAfter <= 60 ? 'a moment' : `${minutes} minute${minutes === 1 ? '' : 's'}`;
	return fail(429, { message: `Too many attempts. Try again in ${wait}.` });
}

export const load: PageServerLoad = async (event) => {
	if (event.locals.user) {
		redirect(302, landingFor(event.locals.user));
	}

	const token = event.url.searchParams.get('invite') ?? '';
	const invite = await findOpenInviteByToken(token);
	if (invite) {
		return { email: invite.email, token: invite.token, firstAccount: false };
	}

	if (await isFirstAccount()) {
		return { email: '', token: '', firstAccount: true };
	}

	return { email: '', token: '', firstAccount: false };
};

export const actions: Actions = {
	default: async (event: RequestEvent) => {
		const formData = await event.request.formData();
		const email = formData.get('email')?.toString() ?? '';
		const password = formData.get('password')?.toString() ?? '';
		const name = formData.get('name')?.toString() ?? '';
		const token = formData.get('invite')?.toString() ?? '';

		if (!email || !password || !name) {
			return fail(400, { message: 'Name, email, and password are required.' });
		}

		if (password.length < 8) {
			return fail(400, { message: 'Password must be at least 8 characters.' });
		}

		const invite = await findOpenInviteByToken(token);
		const firstAccount = await isFirstAccount();
		if (!firstAccount && (!invite || invite.email !== email.trim().toLowerCase())) {
			return fail(400, { message: inviteFailed });
		}

		const throttle = await consumeAll(throttleKeys(event));
		if (!throttle.allowed) return tooManyAttempts(throttle.retryAfter);
		await pruneThrottle();

		try {
			const headers = new Headers(event.request.headers);
			if (token) headers.set('x-invite-token', token);
			await withInviteToken(token, () =>
				auth.api.signUpEmail({
					body: { email, password, name },
					headers
				})
			);
		} catch (error) {
			if (error instanceof APIError) {
				return fail(400, { message: signUpFailed });
			}
			return fail(500, { message: 'Unexpected error.' });
		}

		redirect(302, '/composition');
	}
};
