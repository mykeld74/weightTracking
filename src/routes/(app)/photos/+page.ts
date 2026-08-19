import { browser } from '$app/environment';
import type { PageLoad } from './$types';
import type { PhotoDay } from '$lib/tracking/photos';

/**
 * Only the photo list is loaded here, and deliberately without reading `url`:
 * that keeps the load from re-running when the ?date= query changes, so
 * switching days never refetches the list. The selected day's stats are
 * fetched in the page component, keyed by date.
 */
export const load: PageLoad = ({ fetch }) => ({
	photoDays: browser
		? fetch('/api/photos').then(async (res): Promise<PhotoDay[]> => {
				if (!res.ok) throw new Error('Could not load your photos.');
				return (await res.json()).days;
			})
		: undefined
});
