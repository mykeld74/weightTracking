-- Goal weight for progress / ETA on the composition page.

ALTER TABLE "user"
	ADD COLUMN IF NOT EXISTS target_weight real;
