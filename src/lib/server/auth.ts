import { ORIGIN, BETTER_AUTH_SECRET } from '$app/env/private';
import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { sendPasswordResetEmail } from '$lib/server/email';

export const auth = betterAuth({
	baseURL: ORIGIN,
	secret: BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, { provider: 'pg', schema }),
	emailAndPassword: {
		enabled: true,
		revokeSessionsOnPasswordReset: true,
		sendResetPassword: async ({ user, url }) => {
			// sendPasswordResetEmail never throws, so a Resend outage cannot turn
			// this endpoint into an account-existence oracle.
			await sendPasswordResetEmail({ to: user.email, name: user.name, url });
		}
	},
	user: {
		additionalFields: {
			// `input: false` is load-bearing: without it a crafted sign-up request
			// could set its own role. Better Auth rejects the field outright.
			role: {
				type: 'string',
				required: false,
				defaultValue: 'user',
				input: false
			},
			approvedAt: {
				type: 'date',
				required: false,
				input: false
			}
		}
	},
	session: {
		// Without this every request does a joined SELECT against Neon just to
		// resolve the session — including every image request. 60s still collapses
		// a photo-heavy page load to a single lookup, while capping how long a
		// revoked account can keep using a cached session.
		cookieCache: { enabled: true, maxAge: 60 }
	},
	rateLimit: {
		// The in-memory default is per-instance and dies with each cold start.
		storage: 'database'
	},
	plugins: [
		sveltekitCookies(getRequestEvent) // make sure this is the last plugin in the array
	]
});
