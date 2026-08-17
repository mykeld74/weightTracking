// Applies a SQL file from scripts/migrations/ in a single transaction.
//
//   pnpm db:upgrade                                    # newest file
//   node scripts/migrate.mjs 0001_accounts_and_binary_photos.sql
//   node scripts/migrate.mjs --dry-run                 # print, change nothing
//
// This project manages schema with `drizzle-kit push`, which can't express the
// base64 -> bytea conversion (it would emit a bare SET DATA TYPE and fail on
// existing rows). So structural changes that need data preserved live here.
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { neon } from '@neondatabase/serverless';

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), 'migrations');
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const requested = args.find((arg) => !arg.startsWith('--'));

const available = readdirSync(migrationsDir)
	.filter((name) => name.endsWith('.sql'))
	.sort();

if (available.length === 0) throw new Error(`No .sql files in ${migrationsDir}`);

const fileName = requested ?? available[available.length - 1];
if (!available.includes(fileName)) {
	throw new Error(`Unknown migration "${fileName}". Available:\n  ${available.join('\n  ')}`);
}

const breakpoint = '--> statement-breakpoint';

// Strip comment-only lines first — otherwise prose that happens to mention the
// breakpoint marker would split a statement in half. The marker itself starts
// with `--`, so it has to survive that pass.
const statements = readFileSync(join(migrationsDir, fileName), 'utf8')
	.split('\n')
	.filter((line) => {
		const trimmed = line.trim();
		return trimmed === breakpoint || !trimmed.startsWith('--');
	})
	.join('\n')
	.split(breakpoint)
	.map((chunk) => chunk.trim())
	.filter((chunk) => chunk.length > 0);

console.log(`${fileName}: ${statements.length} statement(s)`);

if (dryRun) {
	statements.forEach((statement, index) => {
		console.log(`\n--- ${index + 1} ---\n${statement}`);
	});
	console.log('\nDry run — nothing was executed.');
	process.exit(0);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is not set');

const sql = neon(databaseUrl);

// neon's HTTP transaction API runs the whole array atomically: either every
// statement lands or none of them do.
await sql.transaction(statements.map((statement) => sql.query(statement)));

console.log(`Applied ${fileName}.`);
console.log('Verify with `pnpm db:push` — it should report no schema changes.');
