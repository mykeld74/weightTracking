<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import BrandMark from '$lib/components/BrandMark.svelte';
	import type { ActionData, PageServerData } from './$types';

	let { data, form }: { data: PageServerData; form: ActionData } = $props();

	let canSignUp = $derived(Boolean(data.token) || data.firstAccount);
</script>

<svelte:head>
	<title>Body Ledger · Create account</title>
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
		<h1>Create account</h1>

		{#if canSignUp}
			<p class="muted">
				{data.firstAccount
					? 'This is the first account. After you sign in you can invite everyone else from the account menu.'
					: `You’re joining as ${data.email}. You’ll be able to sign in as soon as this is done.`}
			</p>
			<form method="post" use:enhance>
				<input type="hidden" name="invite" value={data.token} />
				<label class="field">
					Name
					<input name="name" autocomplete="name" required />
				</label>
				<label class="field">
					Email
					<input
						type="email"
						name="email"
						value={data.email}
						autocomplete="email"
						readonly={!data.firstAccount}
						required
					/>
				</label>
				<label class="field">
					Password
					<input
						type="password"
						name="password"
						autocomplete="new-password"
						minlength="8"
						required
					/>
				</label>
				{#if form?.message}
					<p class="flash">{form.message}</p>
				{/if}
				<div class="auth-actions">
					<button class="primary-btn" type="submit">Create account</button>
					<a class="ghost-btn" href={resolve('/login')}>Back to sign in</a>
				</div>
			</form>
		{:else}
			<p class="muted">
				Body Ledger is invite-only. Ask someone with an account to send you an invitation.
			</p>
			{#if form?.message}
				<p class="flash">{form.message}</p>
			{/if}
			<div class="auth-actions">
				<a class="ghost-btn" href={resolve('/login')}>Back to sign in</a>
			</div>
		{/if}
	</section>
</div>
