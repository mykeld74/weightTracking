-- Account approval + roles, Better Auth's rate-limit store, the sign-in
-- throttle, and the base64 -> bytea photo conversion.
--
-- Every statement is additive or an in-place rewrite of existing values, and
-- the whole file runs in one transaction. Take a Neon branch or backup first
-- regardless. Run it with:  pnpm db:upgrade
--
-- Statements are separated by `--> statement-breakpoint` (drizzle's own
-- convention) so the runner can send them individually.

--------------------------------------------------------------------------
-- 1. Roles and approval state
--------------------------------------------------------------------------
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "role" text DEFAULT 'user' NOT NULL;
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "approved_at" timestamp;
--> statement-breakpoint

-- Grandfather everyone who already had an account: they were using the site
-- before approval existed, so locking them out here would be a surprise.
UPDATE "user" SET "approved_at" = "created_at" WHERE "approved_at" IS NULL;
--> statement-breakpoint

--------------------------------------------------------------------------
-- 2. Better Auth rate limiter storage (rateLimit.storage = 'database')
--------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "rate_limit" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"count" integer NOT NULL,
	"last_request" bigint NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "rate_limit_key_unique" ON "rate_limit" ("key");
--> statement-breakpoint

--------------------------------------------------------------------------
-- 3. Throttle for the sign-in / sign-up form actions
--------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "login_throttle" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "login_throttle_expires_at_idx" ON "login_throttle" ("expires_at");
--> statement-breakpoint

--------------------------------------------------------------------------
-- 4. Photos: base64 text -> bytea, plus a stored thumbnail
--------------------------------------------------------------------------
ALTER TABLE "progress_photo" ADD COLUMN IF NOT EXISTS "thumb_data" bytea;
--> statement-breakpoint

-- decode() reads the existing base64 text straight into binary, so this is a
-- single in-place rewrite rather than a drop and recreate.
ALTER TABLE "progress_photo"
	ALTER COLUMN "image_data" TYPE bytea
	USING decode("image_data", 'base64');
