<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import BrandMark from '$lib/components/BrandMark.svelte';
	import UserMenu from '$lib/components/UserMenu.svelte';
	import { isAdmin } from '$lib/tracking/users';

	let { data, children } = $props();

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
			<a class={{ active: compositionActive }} href={resolve('/composition')}>Composition</a>
			<a class={{ active: measurementsActive }} href={resolve('/measurements')}>Measurements</a>
			<a class={{ active: photosActive }} href={resolve('/photos')}>Photos</a>
			<a class={{ active: glp1Active }} href={resolve('/glp1')}>GLP-1</a>
		</nav>
		<div class="user-meta">
			<UserMenu name={data.user.name} admin={isAdmin(data.user)} />
		</div>
	</header>
	{@render children()}
</div>
