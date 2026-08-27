import { browser } from '$app/environment';
import type { PageLoad } from './$types';

export type MeasurementHistory = {
	entries: Array<Record<string, unknown> & { id: string; recordedOn: string }>;
	glp1StartedOn: string | null;
};

/** See the composition page load — same instant-navigation rationale. */
export const load: PageLoad = ({ fetch }) => ({
	entries: browser
		? fetch('/api/measurements').then(async (res): Promise<MeasurementHistory> => {
				if (!res.ok) throw new Error('Could not load your history.');
				const data = await res.json();
				return {
					entries: data.entries,
					glp1StartedOn: data.glp1StartedOn ?? null
				};
			})
		: undefined
});
