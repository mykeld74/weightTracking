// Promotes one account to site admin and approves it.
//
//   node scripts/bootstrap-admin.mjs [email]
//
// Defaults to ADMIN_EMAIL, then to mike@msdweb.pro. Safe to re-run: it only
// ever grants, never revokes. Run it after the migration, and again any time
// you need to recover admin access (for example after a database reset).
import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is not set');

const email = (process.argv[2] ?? process.env.ADMIN_EMAIL ?? 'mike@msdweb.pro')
	.trim()
	.toLowerCase();
const sql = neon(databaseUrl);

const [existing] = await sql`
	SELECT id, name, email, role, approved_at
	FROM "user"
	WHERE lower(email) = ${email}
`;

if (!existing) {
	console.error(`No account found for ${email}.`);
	console.error('Create it through the sign-up form first, then re-run this script.');
	process.exit(1);
}

const [updated] = await sql`
	UPDATE "user"
	SET role = 'admin',
	    approved_at = COALESCE(approved_at, now())
	WHERE id = ${existing.id}
	RETURNING name, email, role, approved_at
`;

const [{ count }] = await sql`
	SELECT count(*)::int AS count FROM "user" WHERE role = 'admin'
`;

const wasAdmin = existing.role === 'admin';
const wasApproved = existing.approved_at !== null;

console.log(`${updated.name} <${updated.email}>`);
console.log(`  role:     ${updated.role}${wasAdmin ? ' (already an admin)' : ' (promoted)'}`);
console.log(
	`  approved: ${updated.approved_at.toISOString()}${wasApproved ? '' : ' (just approved)'}`
);
console.log(`\n${count} admin account${count === 1 ? '' : 's'} total.`);
