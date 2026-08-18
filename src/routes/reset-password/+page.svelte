<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import BrandMark from '$lib/components/BrandMark.svelte';
	import type { ActionData, PageServerData } from './$types';

	let { data, form }: { data: PageServerData; form: ActionData } = $props();

	let token = $derived(form?.token ?? data.token);
</script>

<svelte:head>
	<title>Body Ledger · Reset password</title>
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
		<h1>Choose a new password</h1>

		{#if token}
			<p class="muted">Pick something at least 8 characters. This signs you out everywhere.</p>
			<form method="post" use:enhance>
				<input type="hidden" name="token" value={token} />
				<label class="field">
					New password
					<input
						type="password"
						name="password"
						autocomplete="new-password"
						minlength="8"
						required
					/>
				</label>
				<label class="field">
					Confirm password
					<input
						type="password"
						name="confirm"
						autocomplete="new-password"
						minlength="8"
						required
					/>
				</label>
				{#if form?.message}
					<p class="flash">{form.message}</p>
				{/if}
				<div class="auth-actions">
					<button class="primary-btn" type="submit">Update password</button>
					<a class="ghost-btn" href={resolve('/login')}>Back to sign in</a>
				</div>
			</form>
		{:else}
			<p class="muted">This reset link is invalid or has expired. Request a new one to continue.</p>
			{#if form?.message}
				<p class="flash">{form.message}</p>
			{/if}
			<div class="auth-actions">
				<a class="primary-btn" href={resolve('/forgot-password')}>Request a new link</a>
				<a class="ghost-btn" href={resolve('/login')}>Back to sign in</a>
			</div>
		{/if}
	</section>
</div>
