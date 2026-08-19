import { browser } from '$app/environment';
import type { PageLoad } from './$types';

export type Glp1Log = {
	entries: Array<{
		id: string;
		recordedOn: string;
		medication: string;
		dosage: number;
		location: string;
	}>;
	regimens: Array<{ id: string; medication: string; startedOn: string }>;
};

/** No server load, so switching to this page costs no round trip. */
export const load: PageLoad = ({ fetch }) => ({
	log: browser
		? fetch('/api/glp1').then(async (res): Promise<Glp1Log> => {
				if (!res.ok) throw new Error('Could not load your GLP-1 log.');
				return res.json();
			})
		: undefined
});
