import { browser } from '$app/environment';
import type { PageLoad } from './$types';
import type { ManagedAccount } from '$lib/tracking/users';
import type { OpenInviteRow } from '../invite/+page';

export type AdminAccounts = {
	accounts: ManagedAccount[];
	invites: OpenInviteRow[];
};

/** No server load, so opening Accounts costs no round trip. */
export const load: PageLoad = ({ fetch }) => ({
	admin: browser
		? fetch('/api/admin/accounts').then(async (res): Promise<AdminAccounts> => {
				if (!res.ok) throw new Error('Could not load accounts.');
				return res.json();
			})
		: undefined
});
