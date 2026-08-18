import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad, RequestEvent } from './$types';
import { ORIGIN } from '$app/env/private';
import { auth } from '$lib/server/auth';
import { APIError } from 'better-auth/api';
import { consumeAll, pruneThrottle } from '$lib/server/throttle';
import { landingFor } from '$lib/server/access';

const sentMessage = 'If that email is on an account, a reset link is on its way.';

function throttleKeys(event: RequestEvent, email: string) {
	const ip = event.getClientAddress();
	const account = email.trim().toLowerCase();

	return [
		{ key: `reset:ip:${ip}`, rule: { max: 5, windowSeconds: 3600 } },
		{ key: `reset:account:${account}`, rule: { max: 3, windowSeconds: 3600 } }
	];
}

export const load: PageServerLoad = (event) => {
	if (event.locals.user) {
		redirect(302, landingFor(event.locals.user));
	}

	return {};
};

export const actions: Actions = {
	default: async (event) => {
		const formData = await event.request.formData();
		const email = formData.get('email')?.toString() ?? '';

		if (!email.includes('@')) {
			return fail(400, { message: 'Enter a valid email address.' });
		}

		const throttle = await consumeAll(throttleKeys(event, email));
		if (!throttle.allowed) {
			const minutes = Math.ceil(throttle.retryAfter / 60);
			const wait =
				throttle.retryAfter <= 60 ? 'a moment' : `${minutes} minute${minutes === 1 ? '' : 's'}`;
			return fail(429, { message: `Too many attempts. Try again in ${wait}.` });
		}
		await pruneThrottle();

		try {
			await auth.api.requestPasswordReset({
				body: { email, redirectTo: `${ORIGIN}/reset-password` },
				headers: event.request.headers
			});
		} catch (error) {
			if (error instanceof APIError) {
				return fail(400, { message: 'Could not send a reset link. Try again.' });
			}
			return fail(500, { message: 'Unexpected error.' });
		}

		return { sent: true, message: sentMessage };
	}
};
