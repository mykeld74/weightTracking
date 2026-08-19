<script lang="ts">
	import InvitePanel from '$lib/components/InvitePanel.svelte';
	import Skeleton from '$lib/components/Skeleton.svelte';
	import { asyncData } from '$lib/client/asyncData.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const openInvites = asyncData(
		() => `invites:${data.user.id}`,
		() => data.invites
	);
</script>

<svelte:head>
	<title>Body Ledger · Invite</title>
</svelte:head>

<div class="page-grid">
	{#if form?.message}
		<p class={['flash', { ok: Boolean(form.success) }]}>{form.message}</p>
	{/if}

	{#if openInvites.current}
		<div class={{ revalidating: openInvites.isStale }}>
			<InvitePanel invites={openInvites.current} />
		</div>
	{:else if openInvites.error}
		<p class="flash">{openInvites.error}</p>
	{:else}
		<div class="card panel-skeleton">
			<Skeleton height="20px" width="40%" />
			<Skeleton height="44px" />
			<Skeleton height="34px" />
		</div>
	{/if}
</div>

<style>
	.panel-skeleton {
		display: grid;
		gap: 12px;
	}

	.revalidating {
		animation: dim-refreshing 140ms ease-out 350ms forwards;
	}

	@keyframes dim-refreshing {
		to {
			opacity: 0.6;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.revalidating {
			animation: none;
			opacity: 0.6;
		}
	}
</style>
