<script lang="ts">
	import { enhance } from '$app/forms';
	import BrandMark from '$lib/components/BrandMark.svelte';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	let overrideMode = $state<'signin' | 'signup' | null>(null);
	let mode = $derived(overrideMode ?? (form?.mode === 'signup' ? 'signup' : 'signin'));
</script>

<svelte:head>
	<title>Sign in · Body Ledger</title>
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
		<h1>{mode === 'signup' ? 'Create account' : 'Welcome back'}</h1>
		<p class="muted">
			{mode === 'signup'
				? 'New accounts need an administrator’s approval before you can log anything.'
				: 'Track composition and measurements, then read the trend.'}
		</p>

		<form method="post" action="?/{mode === 'signup' ? 'signUpEmail' : 'signInEmail'}" use:enhance>
			{#if mode === 'signup'}
				<label class="field">
					Name
					<input name="name" autocomplete="name" required />
				</label>
			{/if}
			<label class="field">
				Email
				<input type="email" name="email" autocomplete="email" required />
			</label>
			<label class="field">
				Password
				<input
					type="password"
					name="password"
					autocomplete={mode === 'signup' ? 'new-password' : 'current-password'}
					required
				/>
			</label>
			{#if form?.message}
				<p class="flash">{form.message}</p>
			{/if}
			<div class="auth-actions">
				<button class="primary-btn" type="submit"
					>{mode === 'signup' ? 'Create account' : 'Sign in'}</button
				>
				<button
					class="ghost-btn"
					type="button"
					onclick={() => (overrideMode = mode === 'signup' ? 'signin' : 'signup')}
				>
					{mode === 'signup' ? 'Have an account?' : 'Need an account?'}
				</button>
			</div>
		</form>
	</section>
</div>
