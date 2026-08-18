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

function throttleKeys(event: RequestEvent, email: string) {
	const ip = event.getClientAddress();
	const account = email.trim().toLowerCase();

	return [
		{ key: `signin:ip:${ip}`, rule: { max: 10, windowSeconds: 60 } },
		{ key: `signin:account:${account}`, rule: { max: 5, windowSeconds: 300 } }
	];
}

function tooManyAttempts(retryAfter: number) {
	const minutes = Math.ceil(retryAfter / 60);
	const wait = retryAfter <= 60 ? 'a moment' : `${minutes} minute${minutes === 1 ? '' : 's'}`;
	return fail(429, { message: `Too many attempts. Try again in ${wait}.` });
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
			return fail(400, { message: 'Email and password are required.' });
		}

		// The form action calls `auth.api.*` directly, which bypasses Better
		// Auth's router-level limiter entirely — so throttle it here.
		const throttle = await consumeAll(throttleKeys(event, email));
		if (!throttle.allowed) return tooManyAttempts(throttle.retryAfter);
		await pruneThrottle();

		let signedIn;
		try {
			signedIn = await auth.api.signInEmail({
				body: { email, password },
				headers: event.request.headers
			});
		} catch (error) {
			if (error instanceof APIError) {
				return fail(400, { message: signInFailed });
			}
			return fail(500, { message: 'Unexpected error.' });
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
	}
};
