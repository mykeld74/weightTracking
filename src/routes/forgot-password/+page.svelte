<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import BrandMark from '$lib/components/BrandMark.svelte';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<svelte:head>
	<title>Body Ledger · Forgot password</title>
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
		<h1>Forgot password</h1>
		<p class="muted">Enter the email on your account and we’ll send a reset link if it matches.</p>

		{#if form?.sent}
			{#if form.message}
				<p class="flash ok">{form.message}</p>
			{/if}
			<div class="auth-actions">
				<a class="ghost-btn" href={resolve('/login')}>Back to sign in</a>
			</div>
		{:else}
			<form method="post" use:enhance>
				<label class="field">
					Email
					<input type="email" name="email" autocomplete="email" required />
				</label>
				{#if form?.message}
					<p class="flash">{form.message}</p>
				{/if}
				<div class="auth-actions">
					<button class="primary-btn" type="submit">Send reset link</button>
					<a class="ghost-btn" href={resolve('/login')}>Back to sign in</a>
				</div>
			</form>
		{/if}
	</section>
</div>
