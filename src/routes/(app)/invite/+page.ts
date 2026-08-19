import { browser } from '$app/environment';
import type { PageLoad } from './$types';

export type OpenInviteRow = {
	id: string;
	email: string;
	expiresAt: string;
	createdAt: string;
};

/** No server load, so opening this page from the menu costs no round trip. */
export const load: PageLoad = ({ fetch }) => ({
	invites: browser
		? fetch('/api/invites').then(async (res): Promise<OpenInviteRow[]> => {
				if (!res.ok) throw new Error('Could not load your invitations.');
				return (await res.json()).invites;
			})
		: undefined
});
