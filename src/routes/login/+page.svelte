<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import BrandMark from '$lib/components/BrandMark.svelte';
	import type { ActionData, PageServerData } from './$types';

	let { data, form }: { data: PageServerData; form: ActionData } = $props();
</script>

<svelte:head>
	<title>Body Ledger · Sign in</title>
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
		<h1>Welcome back</h1>
		<p class="muted">Track composition and measurements, then read the trend.</p>

		<form method="post" action="?/signInEmail" use:enhance>
			<label class="field">
				Email
				<input type="email" name="email" autocomplete="email" required />
			</label>
			<label class="field">
				Password
				<input type="password" name="password" autocomplete="current-password" required />
			</label>
			<p class="muted"><a href={resolve('/forgot-password')}>Forgot password?</a></p>
			{#if data.passwordUpdated && !form?.message}
				<p class="flash ok">Password updated. Sign in with your new password.</p>
			{/if}
			{#if form?.message}
				<p class="flash">{form.message}</p>
			{/if}
			<div class="auth-actions">
				<button class="primary-btn" type="submit">Sign in</button>
			</div>
		</form>
	</section>
</div>
