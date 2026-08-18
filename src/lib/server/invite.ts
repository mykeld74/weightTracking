import { fail, type RequestEvent } from '@sveltejs/kit';
import { randomBytes } from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
import { ORIGIN } from '$app/env/private';
import { and, count, eq, isNull } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { invitation, user } from '$lib/server/db/schema';
import { sendInviteEmail } from '$lib/server/email';
import { consumeAll, pruneThrottle } from '$lib/server/throttle';

export const inviteTtlMs = 7 * 24 * 60 * 60 * 1000;

export type OpenInvite = {
	id: string;
	email: string;
	token: string;
	expiresAt: Date;
	createdAt: Date;
};

function newToken() {
	return randomBytes(32).toString('base64url');
}

export function inviteSignupUrl(token: string) {
	return `${ORIGIN}/signup?invite=${encodeURIComponent(token)}`;
}

export async function isFirstAccount(): Promise<boolean> {
	const [row] = await db.select({ total: count() }).from(user);
	return (row?.total ?? 0) === 0;
}

export async function findOpenInviteByToken(token: string): Promise<OpenInvite | null> {
	if (!token) return null;

	const [row] = await db
		.select({
			id: invitation.id,
			email: invitation.email,
			token: invitation.token,
			expiresAt: invitation.expiresAt,
			createdAt: invitation.createdAt
		})
		.from(invitation)
		.where(and(eq(invitation.token, token), isNull(invitation.acceptedAt)))
		.limit(1);

	if (!row || row.expiresAt.getTime() <= Date.now()) return null;
	return row;
}

const inviteTokenStore = new AsyncLocalStorage<string>();

export function withInviteToken<T>(token: string, fn: () => Promise<T>): Promise<T> {
	return inviteTokenStore.run(token, fn);
}

export function inviteTokenFromContext(ctx: unknown): string {
	const fromStore = inviteTokenStore.getStore();
	if (fromStore) return fromStore;
	if (!ctx || typeof ctx !== 'object') return '';

	if ('body' in ctx) {
		const body = ctx.body;
		if (body && typeof body === 'object' && 'invite' in body && typeof body.invite === 'string') {
			return body.invite;
		}
	}

	const headers =
		'headers' in ctx && ctx.headers instanceof Headers
			? ctx.headers
			: 'request' in ctx && ctx.request instanceof Request
				? ctx.request.headers
				: null;

	return headers?.get('x-invite-token') ?? '';
}

export async function consumeInvite(token: string): Promise<void> {
	if (!token) return;
	await db
		.update(invitation)
		.set({ acceptedAt: new Date() })
		.where(and(eq(invitation.token, token), isNull(invitation.acceptedAt)));
}

export async function listOpenInvites(
	invitedBy?: string
): Promise<Array<Pick<OpenInvite, 'id' | 'email' | 'expiresAt' | 'createdAt'>>> {
	const filters = [isNull(invitation.acceptedAt)];
	if (invitedBy) filters.push(eq(invitation.invitedBy, invitedBy));

	const rows = await db
		.select({
			id: invitation.id,
			email: invitation.email,
			expiresAt: invitation.expiresAt,
			createdAt: invitation.createdAt
		})
		.from(invitation)
		.where(and(...filters));

	const now = Date.now();
	return rows
		.filter((row) => row.expiresAt.getTime() > now)
		.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

export async function cancelInvite(id: string, invitedBy?: string): Promise<void> {
	const filters = [eq(invitation.id, id), isNull(invitation.acceptedAt)];
	if (invitedBy) filters.push(eq(invitation.invitedBy, invitedBy));
	await db.delete(invitation).where(and(...filters));
}

export async function createOrRefreshInvite(input: {
	email: string;
	invitedBy: string;
	invitedByEmail?: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
	const email = input.email.trim().toLowerCase();
	if (!email.includes('@')) {
		return { ok: false, message: 'Enter a valid email address.' };
	}

	if (email === input.invitedByEmail?.trim().toLowerCase()) {
		return { ok: false, message: 'That email is already on your account.' };
	}

	const [existing] = await db
		.select({ id: user.id })
		.from(user)
		.where(eq(user.email, email))
		.limit(1);

	if (existing) {
		return { ok: false, message: 'That email already has an account.' };
	}

	const token = newToken();
	const expiresAt = new Date(Date.now() + inviteTtlMs);

	const [open] = await db
		.select({ id: invitation.id })
		.from(invitation)
		.where(and(eq(invitation.email, email), isNull(invitation.acceptedAt)))
		.limit(1);

	if (open) {
		await db
			.update(invitation)
			.set({ token, expiresAt, invitedBy: input.invitedBy })
			.where(eq(invitation.id, open.id));
	} else {
		await db.insert(invitation).values({
			id: crypto.randomUUID(),
			email,
			token,
			invitedBy: input.invitedBy,
			expiresAt
		});
	}

	await sendInviteEmail({ to: email, url: inviteSignupUrl(token) });
	return { ok: true };
}

export async function sendInviteFromEvent(
	event: RequestEvent,
	inviter: { id: string; email: string }
) {
	const formData = await event.request.formData();
	const email = formData.get('email')?.toString() ?? '';

	const throttle = await consumeAll([
		{ key: `invite:ip:${event.getClientAddress()}`, rule: { max: 10, windowSeconds: 3600 } },
		{ key: `invite:user:${inviter.id}`, rule: { max: 10, windowSeconds: 3600 } },
		{
			key: `invite:email:${email.trim().toLowerCase()}`,
			rule: { max: 5, windowSeconds: 3600 }
		}
	]);
	if (!throttle.allowed) {
		const minutes = Math.ceil(throttle.retryAfter / 60);
		const wait =
			throttle.retryAfter <= 60 ? 'a moment' : `${minutes} minute${minutes === 1 ? '' : 's'}`;
		return fail(429, { message: `Too many invitations. Try again in ${wait}.` });
	}
	await pruneThrottle();

	const result = await createOrRefreshInvite({
		email,
		invitedBy: inviter.id,
		invitedByEmail: inviter.email
	});
	if (!result.ok) return fail(400, { message: result.message });
	return { success: true, message: 'Invitation sent.' };
}
