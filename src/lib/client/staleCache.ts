/**
 * Last-good values for streamed page data, so a navigation can render the
 * previous result immediately while the fresh one is still in flight.
 *
 * Deliberately in memory only: a full page load starts empty, which is what
 * makes refresh/load always show freshly fetched data rather than a stale copy.
 */
const cache = new Map<string, unknown>();

/** Whose data this cache holds. Guards against showing one account's rows to the next. */
let owner: string | null = null;

export function getCached<T>(key: string): T | undefined {
	return cache.get(key) as T | undefined;
}

export function setCached<T>(key: string, value: T): void {
	cache.set(key, value);
}

export function clearCache(): void {
	cache.clear();
}

/**
 * Drop everything when the signed-in account changes. Without this, signing out
 * and back in as someone else in the same tab could flash the previous user's
 * entries while the new request resolves.
 */
export function syncCacheOwner(userId: string | null): void {
	if (owner === userId) return;
	owner = userId;
	cache.clear();
}
