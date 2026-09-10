-- Body profile fields for automatic BMI / BMR / metabolic age.

ALTER TABLE "user"
	ADD COLUMN IF NOT EXISTS birthday date;
--> statement-breakpoint
ALTER TABLE "user"
	ADD COLUMN IF NOT EXISTS height_inches real;
--> statement-breakpoint
ALTER TABLE "user"
	ADD COLUMN IF NOT EXISTS gender text;
