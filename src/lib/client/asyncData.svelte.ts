import { getCached, setCached } from './staleCache';

export type AsyncState<T> = {
	/** Fresh value, or the previous good one while a new request is in flight. */
	readonly current: T | undefined;
	/** True when `current` is a cached copy being revalidated. */
	readonly isStale: boolean;
	readonly error: string;
};

/**
 * Stale-while-revalidate over a streamed `load` promise.
 *
 * Navigation renders instantly: the page shell paints straight away, this shows
 * the last good value for the same key while the new one streams in, and swaps
 * when it lands. With nothing cached (a fresh page load) `current` is undefined
 * so the caller can show a loading state.
 */
export function asyncData<T>(key: () => string, value: () => Promise<T> | T): AsyncState<T> {
	let settled = $state<{ key: string; data: T } | null>(null);
	let error = $state('');

	$effect(() => {
		const currentKey = key();
		const source = value();

		// Undefined during SSR: the universal load only issues its fetch in the
		// browser, so there is nothing to settle yet — fall through to the
		// loading state rather than caching a bogus value.
		if (source === undefined) return;

		if (typeof (source as { then?: unknown })?.then !== 'function') {
			const data = source as T;
			setCached(currentKey, data);
			settled = { key: currentKey, data };
			error = '';
			return;
		}

		error = '';
		let cancelled = false;

		(source as Promise<T>).then(
			(data) => {
				if (cancelled) return;
				setCached(currentKey, data);
				settled = { key: currentKey, data };
			},
			(caught: unknown) => {
				if (cancelled) return;
				error = caught instanceof Error ? caught.message : 'Could not load that data.';
			}
		);

		// A newer navigation supersedes this one; ignore whatever it resolves to.
		return () => {
			cancelled = true;
		};
	});

	const fresh = $derived(settled?.key === key() ? settled.data : undefined);
	const current = $derived(fresh ?? getCached<T>(key()));
	const isStale = $derived(fresh === undefined && current !== undefined);

	return {
		get current() {
			return current;
		},
		get isStale() {
			return isStale;
		},
		get error() {
			return error;
		}
	};
}
