# Body Ledger

A private log for body composition, measurements, and progress photos. Built with SvelteKit, Drizzle, Neon Postgres, and Better Auth.

## Developing

```sh
pnpm install
cp .env.example .env   # then fill in DATABASE_URL, ORIGIN, BETTER_AUTH_SECRET, RESEND_API_KEY
pnpm db:push
pnpm dev
```

## Accounts and access

Signup is **invite-only**. Any approved user can send an invitation from the
account menu (name → **Invite**); admins can also invite from **Accounts**.
The recipient creates a password and is approved automatically as a regular
user (never an admin). Promote someone later if they should manage accounts.

Change your password from the same menu (name → **Change password**).

Admins can also revoke, promote, demote, and delete accounts. Admins manage
_accounts only_ — there is no path from the admin screen to another person's
measurements or photos. Every query in the app is scoped to the signed-in
user's id.

To create the first admin (or recover admin access):

```sh
pnpm admin:bootstrap mike@msdweb.pro
```

It is safe to re-run; it only ever grants. Falls back to `$ADMIN_EMAIL`, then
to `mike@msdweb.pro`, when no address is given. On a fresh database, create
the first account at `/signup` (no invite needed when there are zero users),
then run bootstrap.

## Database changes

Routine schema edits go through Drizzle:

```sh
pnpm db:push
```

Changes that need existing data preserved (anything `push` would express as a
destructive column rewrite) live in `scripts/migrations/` and run through:

```sh
pnpm db:upgrade --dry-run   # print the statements, change nothing
pnpm db:upgrade             # apply the newest file in one transaction
```

## Importing a CSV export

```sh
node --env-file=.env scripts/import-composition-csv.mjs "Weight Tracking - Weight.csv"
```

## Building

```sh
pnpm build
pnpm preview
```

Deployed through `@sveltejs/adapter-netlify`. Set `DATABASE_URL`, `ORIGIN`,
`BETTER_AUTH_SECRET`, `RESEND_API_KEY`, and `RESEND_FROM` in the Netlify
environment — `ORIGIN` must be the real https origin. `RESEND_FROM` needs a
verified Resend domain in production (`onboarding@resend.dev` only delivers
to the account owner).
