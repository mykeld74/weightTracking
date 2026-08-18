<script lang="ts">
	import InvitePanel from '$lib/components/InvitePanel.svelte';
	import type { ActionData, PageServerData } from './$types';

	let { data, form }: { data: PageServerData; form: ActionData } = $props();
</script>

<svelte:head>
	<title>Body Ledger · Invite</title>
</svelte:head>

<div class="page-grid">
	{#if form?.message}
		<p class={['flash', { ok: Boolean(form.success) }]}>{form.message}</p>
	{/if}

	<InvitePanel invites={data.invites} />
</div>
