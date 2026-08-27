-- Add metabolic age and skeletal muscle rate from scale exports.
-- Safe additive columns; `pnpm db:push` can also apply these.

ALTER TABLE body_composition
	ADD COLUMN IF NOT EXISTS metabolic_age real;
--> statement-breakpoint
ALTER TABLE body_composition
	ADD COLUMN IF NOT EXISTS skeletal_muscle_rate real;
