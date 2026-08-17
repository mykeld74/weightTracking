import { fail } from '@sveltejs/kit';
import { asc, count, eq, ne, and } from 'drizzle-orm';
import type { Actions, PageServerLoad, RequestEvent } from './$types';
import { db } from '$lib/server/db';
import { session, user } from '$lib/server/db/schema';
import { requireAdmin } from '$lib/server/access';

/**
 * Only account fields are ever selected here. An admin manages who can get in;
 * they never gain a route to another person's measurements or photos.
 */
const accountColumns = {
	id: user.id,
	name: user.name,
	email: user.email,
	role: user.role,
	approvedAt: user.approvedAt,
	createdAt: user.createdAt
};

async function listAccounts() {
	return db.select(accountColumns).from(user).orderBy(asc(user.createdAt));
}

async function targetId(event: RequestEvent, adminId: string) {
	const id = (await event.request.formData()).get('id')?.toString();
	if (!id) return { error: fail(400, { message: 'Missing account.' }) } as const;
	// Blocks the whole class of "admin locks themselves out" mistakes.
	if (id === adminId) {
		return { error: fail(400, { message: 'You cannot change your own account here.' }) } as const;
	}
	return { id } as const;
}

async function adminCount(): Promise<number> {
	const [row] = await db.select({ total: count() }).from(user).where(eq(user.role, 'admin'));
	return row?.total ?? 0;
}

export const load: PageServerLoad = async (event) => {
	const admin = requireAdmin(event);
	return { accounts: await listAccounts(), adminId: admin.id };
};

export const actions: Actions = {
	approve: async (event) => {
		const admin = requireAdmin(event);
		const target = await targetId(event, admin.id);
		if ('error' in target) return target.error;

		await db.update(user).set({ approvedAt: new Date() }).where(eq(user.id, target.id));
		return { success: true, message: 'Account approved.' };
	},
	revoke: async (event) => {
		const admin = requireAdmin(event);
		const target = await targetId(event, admin.id);
		if ('error' in target) return target.error;

		await db.update(user).set({ approvedAt: null }).where(eq(user.id, target.id));
		// Drop their live sessions too, otherwise they keep browsing until the
		// current session cookie expires.
		await db.delete(session).where(eq(session.userId, target.id));
		return { success: true, message: 'Access revoked and sessions ended.' };
	},
	promote: async (event) => {
		const admin = requireAdmin(event);
		const target = await targetId(event, admin.id);
		if ('error' in target) return target.error;

		// An admin who can't sign in is useless, so approve as part of promoting.
		await db
			.update(user)
			.set({ role: 'admin', approvedAt: new Date() })
			.where(eq(user.id, target.id));
		return { success: true, message: 'Promoted to admin.' };
	},
	demote: async (event) => {
		const admin = requireAdmin(event);
		const target = await targetId(event, admin.id);
		if ('error' in target) return target.error;

		if ((await adminCount()) <= 1) {
			return fail(400, { message: 'There must be at least one admin.' });
		}

		await db.update(user).set({ role: 'user' }).where(eq(user.id, target.id));
		// Force a fresh session so the cached admin role can't linger.
		await db.delete(session).where(eq(session.userId, target.id));
		return { success: true, message: 'Admin rights removed.' };
	},
	remove: async (event) => {
		const admin = requireAdmin(event);
		const target = await targetId(event, admin.id);
		if ('error' in target) return target.error;

		// Deletes the account and, via ON DELETE CASCADE, everything that person
		// logged. The `ne` guard is belt-and-braces on top of targetId().
		await db.delete(user).where(and(eq(user.id, target.id), ne(user.id, admin.id)));
		return { success: true, message: 'Account and all of its data deleted.' };
	}
};
