import { defineEnvVars } from '@sveltejs/kit/hooks';

export const variables = defineEnvVars({
	DATABASE_URL: { description: 'The database connection string.' },
	ORIGIN: {
		description: 'The app origin (base URL), e.g. `http://localhost:5173`.'
	},
	BETTER_AUTH_SECRET: {
		description:
			'Secret used to sign tokens. For production use 32 characters generated with high entropy. See [Better Auth installation](https://www.better-auth.com/docs/installation).'
	},
	RESEND_API_KEY: {
		description: 'Resend API key used to send password reset emails.'
	},
	RESEND_FROM: {
		description:
			'From address for transactional email, e.g. `Body Ledger <noreply@yourdomain.com>`. Resend’s `onboarding@resend.dev` only delivers to the account owner.'
	}
});
