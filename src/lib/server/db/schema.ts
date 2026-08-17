import {
	customType,
	date,
	index,
	integer,
	pgTable,
	real,
	text,
	timestamp,
	unique
} from 'drizzle-orm/pg-core';
import { photoViews } from '../../tracking/photos';
import { user } from './auth.schema';

export * from './auth.schema';

// The Neon HTTP driver encodes Buffer params as `\x…` bytea literals and parses
// bytea results back into Buffers, so this round-trips without extra plumbing.
const bytea = customType<{ data: Buffer; driverData: Buffer }>({
	dataType: () => 'bytea'
});

export const bodyComposition = pgTable(
	'body_composition',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		recordedOn: date('recorded_on', { mode: 'string' }).notNull(),
		weight: real('weight'),
		bmi: real('bmi'),
		bodyFat: real('body_fat'),
		muscleMass: real('muscle_mass'),
		muscleMassPercent: real('muscle_mass_percent'),
		bodyWater: real('body_water'),
		leanBodyMass: real('lean_body_mass'),
		boneMass: real('bone_mass'),
		protein: real('protein'),
		visceralFat: real('visceral_fat'),
		bmr: real('bmr'),
		fatContent: real('fat_content'),
		subcutaneousFat: real('subcutaneous_fat'),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [unique('body_composition_user_date_unique').on(table.userId, table.recordedOn)]
);

export const bodyMeasurement = pgTable(
	'body_measurement',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		recordedOn: date('recorded_on', { mode: 'string' }).notNull(),
		chest: real('chest'),
		stomach: real('stomach'),
		leftArm: real('left_arm'),
		rightArm: real('right_arm'),
		leftLeg: real('left_leg'),
		rightLeg: real('right_leg'),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [unique('body_measurement_user_date_unique').on(table.userId, table.recordedOn)]
);

export const glp1Injection = pgTable(
	'glp1_injection',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		recordedOn: date('recorded_on', { mode: 'string' }).notNull(),
		medication: text('medication').notNull(),
		dosage: real('dosage').notNull(),
		location: text('location').notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [unique('glp1_injection_user_date_unique').on(table.userId, table.recordedOn)]
);

export const glp1Regimen = pgTable(
	'glp1_regimen',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		medication: text('medication').notNull(),
		startedOn: date('started_on', { mode: 'string' }).notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [unique('glp1_regimen_user_started_unique').on(table.userId, table.startedOn)]
);

export const progressPhoto = pgTable(
	'progress_photo',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		recordedOn: date('recorded_on', { mode: 'string' }).notNull(),
		view: text('view', { enum: photoViews }).notNull(),
		mimeType: text('mime_type').notNull(),
		imageData: bytea('image_data').notNull(),
		// Small square-ish preview used by the sessions list so it never has to
		// download the full image. Null only for rows predating the column.
		thumbData: bytea('thumb_data'),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [
		unique('progress_photo_user_date_view_unique').on(table.userId, table.recordedOn, table.view)
	]
);

// Rolling counters for the sign-in / sign-up form actions. Better Auth's own
// limiter only covers requests routed through /api/auth, so the form actions —
// which call `auth.api.*` directly — need their own shared-state throttle.
export const loginThrottle = pgTable(
	'login_throttle',
	{
		key: text('key').primaryKey(),
		count: integer('count').notNull(),
		expiresAt: timestamp('expires_at', { withTimezone: true }).notNull()
	},
	// Supports the periodic prune of expired counters.
	(table) => [index('login_throttle_expires_at_idx').on(table.expiresAt)]
);
