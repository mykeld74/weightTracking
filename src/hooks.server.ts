import type { Handle } from '@sveltejs/kit';
import { building } from '$app/env';
import { auth } from '$lib/server/auth';
import { isAuthPath, svelteKitHandler } from 'better-auth/svelte-kit';
import type { AppUser } from '$lib/tracking/users';

const securityHeaders: Record<string, string> = {
	// The photo endpoint serves user-uploaded bytes; never let a browser sniff
	// past the Content-Type we set.
	'X-Content-Type-Options': 'nosniff',
	'Referrer-Policy': 'strict-origin-when-cross-origin',
	'X-Frame-Options': 'DENY',
	'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
};

const handleBetterAuth: Handle = async ({ event, resolve }) => {
	if (building) return resolve(event);

	// Better Auth resolves the session itself for its own endpoints, so doing it
	// here first would just double the work on every auth call.
	if (isAuthPath(event.url.toString(), auth.options)) {
		return svelteKitHandler({ event, resolve, auth, building });
	}

	const session = await auth.api.getSession({ headers: event.request.headers });

	if (session) {
		event.locals.session = session.session;
		event.locals.user = session.user as AppUser;
	}

	const response = await svelteKitHandler({ event, resolve, auth, building });

	for (const [header, value] of Object.entries(securityHeaders)) {
		response.headers.set(header, value);
	}

	return response;
};

export const handle: Handle = handleBetterAuth;
