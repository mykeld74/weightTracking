import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireApprovedUser } from '$lib/server/access';
import { cancelInvite, listOpenInvites, sendInviteFromEvent } from '$lib/server/invite';

export const load: PageServerLoad = async (event) => {
	const user = requireApprovedUser(event);
	return { invites: await listOpenInvites(user.id) };
};

export const actions: Actions = {
	invite: async (event) => {
		const user = requireApprovedUser(event);
		return sendInviteFromEvent(event, user);
	},
	cancelInvite: async (event) => {
		const user = requireApprovedUser(event);
		const id = (await event.request.formData()).get('id')?.toString();
		if (!id) return fail(400, { message: 'Missing invitation.' });
		await cancelInvite(id, user.id);
		return { success: true, message: 'Invitation cancelled.' };
	}
};
