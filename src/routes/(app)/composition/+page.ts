import { browser } from '$app/environment';
import type { PageLoad } from './$types';

export type CompositionHistory = {
	entries: Array<Record<string, unknown> & { id: string; recordedOn: string }>;
	injections: Array<{ recordedOn: string; medication: string; dosage: number }>;
	glp1StartedOn: string | null;
};

/**
 * Universal load with no server counterpart, so a client-side navigation needs
 * no round trip at all — SvelteKit mounts the page immediately and the fetch
 * below resolves into it afterwards (see asyncData for the stale-while-
 * revalidate handoff). Undefined during SSR so the first paint is the skeleton.
 */
export const load: PageLoad = ({ fetch }) => ({
	history: browser
		? fetch('/api/composition').then(async (res): Promise<CompositionHistory> => {
				if (!res.ok) throw new Error('Could not load your history.');
				return res.json();
			})
		: undefined
});
