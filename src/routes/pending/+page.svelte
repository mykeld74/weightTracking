<script lang="ts">
	import BrandMark from '$lib/components/BrandMark.svelte';
	import type { PageServerData } from './$types';

	let { data }: { data: PageServerData } = $props();
</script>

<svelte:head>
	<title>Awaiting approval · Body Ledger</title>
</svelte:head>

<div class="auth-shell">
	<section class="card auth-card">
		<div class="brand">
			<BrandMark />
			<span class="brand-copy">
				<small>Personal log</small>
				<strong>Body Ledger</strong>
			</span>
		</div>
		<h1>Waiting on approval</h1>
		<p class="muted">
			Thanks, {data.name}. An administrator needs to approve <strong>{data.email}</strong> before you
			can start logging. You’ll get in as soon as that happens — try signing in again later.
		</p>
		<div class="auth-actions">
			<form method="post" action="/logout">
				<button class="ghost-btn" type="submit">Sign out</button>
			</form>
		</div>
	</section>
</div>

<style>
	.muted strong {
		color: var(--ink);
		font-weight: 600;
	}
</style>
