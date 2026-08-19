<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import BrandMark from '$lib/components/BrandMark.svelte';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import UserMenu from '$lib/components/UserMenu.svelte';
	import { isAdmin } from '$lib/tracking/users';
	import { syncCacheOwner } from '$lib/client/staleCache';

	let { data, children } = $props();

	// Signing in as someone else in the same tab must not leave the previous
	// account's cached rows sitting in memory for the stale-while-revalidate pass.
	$effect(() => {
		syncCacheOwner(data.user.id);
	});

	let compositionActive = $derived(page.url.pathname.startsWith('/composition'));
	let measurementsActive = $derived(page.url.pathname.startsWith('/measurements'));
	let photosActive = $derived(page.url.pathname.startsWith('/photos'));
	let glp1Active = $derived(page.url.pathname.startsWith('/glp1'));
</script>

<div class="app-shell">
	<header class="topbar">
		<a class="brand" href={resolve('/composition')}>
			<BrandMark />
			<span class="brand-copy">
				<small>Personal log</small>
				<strong>Body Ledger</strong>
			</span>
		</a>
		<nav class="tabs">
			<a class={{ active: compositionActive }} href={resolve('/composition')} title="Composition">
				<NavIcon name="composition" />
				<span class="tab-label">Composition</span>
			</a>
			<a
				class={{ active: measurementsActive }}
				href={resolve('/measurements')}
				title="Measurements"
			>
				<NavIcon name="measurements" />
				<span class="tab-label">Measurements</span>
			</a>
			<a class={{ active: photosActive }} href={resolve('/photos')} title="Photos">
				<NavIcon name="photos" />
				<span class="tab-label">Photos</span>
			</a>
			<a class={{ active: glp1Active }} href={resolve('/glp1')} title="GLP-1">
				<NavIcon name="glp1" />
				<span class="tab-label">GLP-1</span>
			</a>
		</nav>
		<div class="user-meta">
			<UserMenu name={data.user.name} admin={isAdmin(data.user)} />
		</div>
	</header>
	{@render children()}
</div>
