import { sql } from 'drizzle-orm';
import { db } from '$lib/server/db';

export type ThrottleRule = {
	/** Requests allowed inside the window. */
	max: number;
	/** Rolling window length in seconds. */
	windowSeconds: number;
};

export type ThrottleResult = {
	allowed: boolean;
	/** Seconds until the current window expires. */
	retryAfter: number;
};

/**
 * Consume one unit against `key`. The whole read-modify-write happens inside a
 * single statement so concurrent requests can't race past the limit.
 */
export async function consume(key: string, rule: ThrottleRule): Promise<ThrottleResult> {
	const window = sql`make_interval(secs => ${rule.windowSeconds}::int)`;

	const result = await db.execute<{ count: number; expires_at: Date | string }>(sql`
		insert into login_throttle ("key", "count", "expires_at")
		values (${key}, 1, now() + ${window})
		on conflict ("key") do update set
			"count" = case
				when login_throttle."expires_at" <= now() then 1
				else login_throttle."count" + 1
			end,
			"expires_at" = case
				when login_throttle."expires_at" <= now() then now() + ${window}
				else login_throttle."expires_at"
			end
		returning "count", "expires_at"
	`);

	const row = result.rows[0];
	if (!row) return { allowed: true, retryAfter: 0 };

	const expiresAt = new Date(row.expires_at).getTime();
	const retryAfter = Math.max(1, Math.ceil((expiresAt - Date.now()) / 1000));

	return {
		allowed: Number(row.count) <= rule.max,
		retryAfter: Number.isFinite(retryAfter) ? retryAfter : rule.windowSeconds
	};
}

/**
 * Check several keys at once (for example per-IP and per-account limits).
 * Every key is consumed so a caller can't dodge one limit by tripping another.
 */
export async function consumeAll(
	entries: Array<{ key: string; rule: ThrottleRule }>
): Promise<ThrottleResult> {
	const results = await Promise.all(entries.map(({ key, rule }) => consume(key, rule)));
	const blocked = results.filter((result) => !result.allowed);

	if (blocked.length === 0) return { allowed: true, retryAfter: 0 };

	return {
		allowed: false,
		retryAfter: Math.max(...blocked.map((result) => result.retryAfter))
	};
}

/** Opportunistic cleanup so abandoned keys don't accumulate forever. */
export async function pruneThrottle(): Promise<void> {
	if (Math.random() > 0.02) return;
	await db.execute(sql`delete from login_throttle where expires_at < now() - interval '1 day'`);
}
