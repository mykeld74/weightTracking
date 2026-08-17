import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is not set');

const csvPath = process.argv[2] ?? 'Weight Tracking - Weight.csv';
const sql = neon(databaseUrl);

const headerToColumn = {
	Date: 'recordedOn',
	Weight: 'weight',
	BMI: 'bmi',
	'Body Fat': 'bodyFat',
	'Muscle Mass': 'muscleMass',
	'Muscle Mass %': 'muscleMassPercent',
	'Body Water': 'bodyWater',
	'Lean Body Mass': 'leanBodyMass',
	'Bone Mass': 'boneMass',
	Protein: 'protein',
	'Visceral Fat': 'visceralFat',
	BMR: 'bmr',
	'Fat Content': 'fatContent',
	'Subcutaneous Fat': 'subcutaneousFat'
};

const metricColumns = [
	['weight', 'weight'],
	['bmi', 'bmi'],
	['bodyFat', 'body_fat'],
	['muscleMass', 'muscle_mass'],
	['muscleMassPercent', 'muscle_mass_percent'],
	['bodyWater', 'body_water'],
	['leanBodyMass', 'lean_body_mass'],
	['boneMass', 'bone_mass'],
	['protein', 'protein'],
	['visceralFat', 'visceral_fat'],
	['bmr', 'bmr'],
	['fatContent', 'fat_content'],
	['subcutaneousFat', 'subcutaneous_fat']
];

function parseNumber(raw) {
	const value = raw.trim().replace(/%/g, '');
	if (!value || value === '-' || value === '--' || value === '- -') return null;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

function parseDate(raw) {
	const [month, day, year] = raw.trim().split('/');
	if (!month || !day || !year) throw new Error(`Invalid date: ${raw}`);
	return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function parseCsv(text) {
	const lines = text
		.replace(/^\uFEFF/, '')
		.trim()
		.split(/\r?\n/);
	const headers = lines[0].split(',').map((header) => header.trim());
	const mappedHeaders = headers.map((header) => headerToColumn[header]);
	const missing = headers.filter((_, index) => !mappedHeaders[index]);
	if (missing.length) throw new Error(`Unknown CSV columns: ${missing.join(', ')}`);

	const byDate = new Map();
	for (const line of lines.slice(1)) {
		if (!line.trim()) continue;
		const cells = line.split(',');
		const row = {};
		for (const [index, key] of mappedHeaders.entries()) {
			const cell = cells[index] ?? '';
			row[key] = key === 'recordedOn' ? parseDate(cell) : parseNumber(cell);
		}
		byDate.set(row.recordedOn, row);
	}

	return [...byDate.values()];
}

function chunk(items, size) {
	const groups = [];
	for (let index = 0; index < items.length; index += size) {
		groups.push(items.slice(index, index + size));
	}
	return groups;
}

const users = await sql`SELECT id, name FROM "user"`;
if (users.length !== 1) {
	throw new Error(`Expected exactly one user, found ${users.length}`);
}

const user = users[0];
const rows = parseCsv(readFileSync(csvPath, 'utf8'));

const insertColumns = [
	'id',
	'user_id',
	'recorded_on',
	...metricColumns.map(([, column]) => column)
];
const updateSet = metricColumns
	.map(([, column]) => `"${column}" = EXCLUDED."${column}"`)
	.join(', ');

for (const batch of chunk(rows, 80)) {
	const placeholders = batch
		.map((_, rowIndex) => {
			const offset = rowIndex * insertColumns.length;
			return `(${insertColumns.map((__, colIndex) => `$${offset + colIndex + 1}`).join(', ')})`;
		})
		.join(', ');

	const params = batch.flatMap((row) => [
		randomUUID(),
		user.id,
		row.recordedOn,
		...metricColumns.map(([key]) => row[key])
	]);

	await sql.query(
		`INSERT INTO body_composition (${insertColumns.map((column) => `"${column}"`).join(', ')})
		 VALUES ${placeholders}
		 ON CONFLICT (user_id, recorded_on) DO UPDATE SET ${updateSet}`,
		params
	);
}

const [{ count }] = await sql`
	SELECT count(*)::int AS count
	FROM body_composition
	WHERE user_id = ${user.id}
`;

console.log(
	`Imported ${rows.length} composition entries for ${user.name}. Table now has ${count} rows.`
);
