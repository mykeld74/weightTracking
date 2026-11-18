<script lang="ts">
	import { enhance } from '$app/forms';
	import ProfileBodyForm from '$lib/components/ProfileBodyForm.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let profileKey = $derived(
		`${data.profile.birthday ?? ''}:${data.profile.heightInches ?? ''}:${data.profile.gender ?? ''}:${data.profile.targetWeight ?? ''}`
	);
</script>

<svelte:head>
	<title>Body Ledger · Profile</title>
</svelte:head>

<div class="page-grid">
	<section class="card">
		<div class="section-head">
			<div>
				<h2>Body profile</h2>
				<p>
					Birthday, height, and sex power automatic BMI and BMR. Target weight drives goal progress
					on Composition.
				</p>
			</div>
		</div>
		{#if form?.profileMessage}
			<p class={['flash', { ok: Boolean(form.success) }]}>{form.profileMessage}</p>
		{/if}
		{#key profileKey}
			<ProfileBodyForm
				birthday={data.profile.birthday}
				heightInches={data.profile.heightInches}
				gender={data.profile.gender}
				targetWeight={data.profile.targetWeight}
				message={form?.profileMessage && form?.success ? form.profileMessage : ''}
			/>
		{/key}
	</section>

	<section class="card">
		<div class="section-head">
			<div>
				<h2>Change password</h2>
				<p>This signs you out on other devices.</p>
			</div>
		</div>
		{#if form?.passwordMessage}
			<p class={['flash', { ok: Boolean(form.success) }]}>{form.passwordMessage}</p>
		{/if}
		<form class="password-form" method="post" action="?/changePassword" use:enhance>
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
