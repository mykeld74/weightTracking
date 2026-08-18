<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<svelte:head>
	<title>Body Ledger · Change password</title>
</svelte:head>

<div class="page-grid">
	{#if form?.message}
		<p class={['flash', { ok: Boolean(form.success) }]}>{form.message}</p>
	{/if}

	<section class="card">
		<div class="section-head">
			<div>
				<h2>Change password</h2>
				<p>This signs you out on other devices.</p>
			</div>
		</div>
		<form class="password-form" method="post" use:enhance>
			<label class="field">
				Current password
				<input type="password" name="currentPassword" autocomplete="current-password" required />
			</label>
			<label class="field">
				New password
				<input
					type="password"
					name="newPassword"
					autocomplete="new-password"
					minlength="8"
					required
				/>
			</label>
			<label class="field">
				Confirm new password
				<input type="password" name="confirm" autocomplete="new-password" minlength="8" required />
			</label>
			<div class="auth-actions">
				<button class="primary-btn" type="submit">Update password</button>
			</div>
		</form>
	</section>
</div>

<style>
	.password-form {
		display: grid;
		gap: 12px;
		max-width: 420px;
	}
</style>
