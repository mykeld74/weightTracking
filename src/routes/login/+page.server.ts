import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad, RequestEvent } from './$types';
import { auth } from '$lib/server/auth';
import { APIError } from 'better-auth/api';
import { consumeAll, pruneThrottle } from '$lib/server/throttle';
import { landingFor } from '$lib/server/access';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';

// Deliberately vague: a distinct "no such account" reply turns the form into an
// account-enumeration oracle.
const signInFailed = 'Email or password is incorrect.';
const signUpFailed = 'Could not create that account. Try a different email.';

function throttleKeys(event: RequestEvent, scope: 'signin' | 'signup', email: string) {
	const ip = event.getClientAddress();
	const account = email.trim().toLowerCase();

	if (scope === 'signup') {
		return [{ key: `signup:ip:${ip}`, rule: { max: 3, windowSeconds: 3600 } }];
	}

	return [
		{ key: `signin:ip:${ip}`, rule: { max: 10, windowSeconds: 60 } },
		{ key: `signin:account:${account}`, rule: { max: 5, windowSeconds: 300 } }
	];
}

function tooManyAttempts(retryAfter: number, mode: 'signin' | 'signup') {
	const minutes = Math.ceil(retryAfter / 60);
	const wait = retryAfter <= 60 ? 'a moment' : `${minutes} minute${minutes === 1 ? '' : 's'}`;
	return fail(429, { message: `Too many attempts. Try again in ${wait}.`, mode });
}

export const load: PageServerLoad = (event) => {
	if (event.locals.user) {
		redirect(302, landingFor(event.locals.user));
	}

	return { passwordUpdated: event.url.searchParams.get('reset') === '1' };
};

export const actions: Actions = {
	signInEmail: async (event) => {
		const formData = await event.request.formData();
		const email = formData.get('email')?.toString() ?? '';
		const password = formData.get('password')?.toString() ?? '';

		if (!email || !password) {
			return fail(400, { message: 'Email and password are required.', mode: 'signin' });
		}

		// The form action calls `auth.api.*` directly, which bypasses Better
		// Auth's router-level limiter entirely — so throttle it here.
		const throttle = await consumeAll(throttleKeys(event, 'signin', email));
		if (!throttle.allowed) return tooManyAttempts(throttle.retryAfter, 'signin');
		await pruneThrottle();

		let signedIn;
		try {
			signedIn = await auth.api.signInEmail({
				body: { email, password },
				headers: event.request.headers
			});
		} catch (error) {
			if (error instanceof APIError) {
				return fail(400, { message: signInFailed, mode: 'signin' });
			}
			return fail(500, { message: 'Unexpected error.', mode: 'signin' });
		}

		// The new session cookie is on the *response*, so re-reading the session
		// from the request headers would still look signed-out. Ask the database
		// about this specific account instead.
		const [account] = await db
			.select({ approvedAt: user.approvedAt })
			.from(user)
			.where(eq(user.id, signedIn.user.id))
			.limit(1);

		redirect(302, landingFor({ approvedAt: account?.approvedAt ?? null }));
	},
	signUpEmail: async (event) => {
		const formData = await event.request.formData();
		const email = formData.get('email')?.toString() ?? '';
		const password = formData.get('password')?.toString() ?? '';
		const name = formData.get('name')?.toString() ?? '';

		if (!email || !password || !name) {
			return fail(400, { message: 'Name, email, and password are required.', mode: 'signup' });
		}

		if (password.length < 8) {
			return fail(400, { message: 'Password must be at least 8 characters.', mode: 'signup' });
		}

		const throttle = await consumeAll(throttleKeys(event, 'signup', email));
		if (!throttle.allowed) return tooManyAttempts(throttle.retryAfter, 'signup');
		await pruneThrottle();

		try {
			await auth.api.signUpEmail({
				body: { email, password, name },
				headers: event.request.headers
			});
		} catch (error) {
			if (error instanceof APIError) {
				return fail(400, { message: signUpFailed, mode: 'signup' });
			}
			return fail(500, { message: 'Unexpected error.', mode: 'signup' });
		}

		// New accounts start unapproved regardless of what happens here.
		redirect(302, '/pending');
	}
};
