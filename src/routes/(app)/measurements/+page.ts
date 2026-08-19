import { browser } from '$app/environment';
import type { PageLoad } from './$types';

export type MeasurementHistory = Array<
	Record<string, unknown> & { id: string; recordedOn: string }
>;

/** See the composition page load — same instant-navigation rationale. */
export const load: PageLoad = ({ fetch }) => ({
	entries: browser
		? fetch('/api/measurements').then(async (res): Promise<MeasurementHistory> => {
				if (!res.ok) throw new Error('Could not load your history.');
				return (await res.json()).entries;
			})
		: undefined
});
