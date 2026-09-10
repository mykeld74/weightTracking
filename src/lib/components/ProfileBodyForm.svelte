<script lang="ts">
	import { applyAction, enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { ageOnDate, feetAndInchesFromTotal } from '$lib/tracking/compositionCalc';
	import { todayIsoDate } from '$lib/tracking/dates';
	import type { BiologicalSex } from '$lib/tracking/compositionCalc';
	import type { SubmitFunction } from '@sveltejs/kit';

	let {
		birthday: initialBirthday = null,
		heightInches = null,
		gender: initialGender = null,
		message = ''
	}: {
		birthday?: string | null;
		heightInches?: number | null;
		gender?: BiologicalSex | null;
		message?: string;
	} = $props();

	let birthday = $state(initialBirthday ?? '');
	let gender = $state(initialGender ?? '');
	let saving = $state(false);
	let localMessage = $state(message);
	let localOk = $state(Boolean(message));

	let age = $derived(birthday ? ageOnDate(birthday, todayIsoDate()) : null);
	let heightParts = $derived(feetAndInchesFromTotal(heightInches));

	const onSubmit: SubmitFunction = () => {
		saving = true;
		localMessage = '';
		return async ({ result }) => {
			saving = false;
			if (result.type === 'success') {
				await invalidateAll();
			}
			await applyAction(result);
			if (result.type === 'success' && result.data && typeof result.data === 'object') {
				const data = result.data as { profileMessage?: string; success?: boolean };
				localMessage = data.profileMessage ?? 'Profile saved.';
				localOk = Boolean(data.success);
			} else if (result.type === 'failure' && result.data && typeof result.data === 'object') {
				const data = result.data as { profileMessage?: string };
				localMessage = data.profileMessage ?? 'Could not save profile.';
				localOk = false;
			} else if (result.type === 'error') {
				localMessage = 'Could not save profile.';
				localOk = false;
			}
		};
	};
</script>

<form class="profile-form" method="post" action="?/updateProfile" use:enhance={onSubmit}>
	{#if localMessage}
		<p class={['flash', { ok: localOk }]}>{localMessage}</p>
	{/if}
	<div class="birthday-row">
		<label class="field">
			Birthday
			<input type="date" name="birthday" bind:value={birthday} max={todayIsoDate()} />
		</label>
		<div class="age-display" aria-live="polite">
			<span class="age-label">Age</span>
			<span class="age-value numeric">{age != null ? age : '—'}</span>
		</div>
	</div>
	<div class="height-row">
		<label class="field">
			Height (ft)
			<input
				type="number"
				name="heightFeet"
				step="1"
				min="3"
				max="8"
				inputmode="numeric"
				placeholder="5"
				value={heightParts.feet ?? ''}
			/>
		</label>
		<label class="field">
			Height (in)
			<input
				type="number"
				name="heightInchesPart"
				step="1"
				min="0"
				max="11"
				inputmode="numeric"
				placeholder="10"
				value={heightParts.inches ?? ''}
			/>
		</label>
	</div>
	<fieldset class="gender-field">
		<legend>Sex</legend>
		<div class="chip-row gender-options" role="radiogroup" aria-label="Sex">
			<label class={['chip', gender === 'male' && 'active']}>
				<input type="radio" name="gender" value="male" bind:group={gender} />
				Male
			</label>
			<label class={['chip', gender === 'female' && 'active']}>
				<input type="radio" name="gender" value="female" bind:group={gender} />
				Female
			</label>
		</div>
	</fieldset>
	<div class="auth-actions">
		<button class="primary-btn" type="submit" disabled={saving} aria-busy={saving}>
			{saving ? 'Saving…' : 'Save profile'}
		</button>
	</div>
</form>

<style>
	.profile-form {
		display: grid;
		gap: 12px;
		max-width: 420px;
	}

	.birthday-row,
	.height-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
		align-items: end;
	}

	.age-display {
		display: flex;
		flex-direction: column;
		gap: 6px;
		justify-content: flex-end;
		min-height: 100%;
		padding-bottom: 8px;
	}

	.age-label {
		font-size: 0.86rem;
		color: var(--ink-soft);
	}

	.age-value {
		display: block;
		line-height: 1.2;
		font-size: 1.35rem;
		font-weight: 650;
		color: var(--ink);
		letter-spacing: -0.02em;
	}

	.gender-field {
		margin: 0;
		padding: 0;
		border: 0;
		min-width: 0;
	}

	.gender-field legend {
		padding: 0;
		margin-bottom: 6px;
		font-size: 0.86rem;
		color: var(--ink-soft);
	}

	.gender-options {
		margin: 0;
	}

	.gender-options label {
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 5.5rem;
		user-select: none;
		overflow: hidden;
	}

	/* Reset global input chrome so the hit target stays inside the chip
	   and does not cover the Save button below. */
	.gender-options label input {
		position: absolute;
		inset: 0;
		opacity: 0;
		width: 100%;
		height: 100%;
		margin: 0;
		padding: 0;
		border: 0;
		border-radius: 0;
		background: transparent;
		cursor: pointer;
		appearance: none;
		-webkit-appearance: none;
	}

	.gender-options label:focus-within {
		outline: 2px solid var(--accent-soft);
		border-color: var(--accent);
	}

	@media (max-width: 480px) {
		.birthday-row,
		.height-row {
			grid-template-columns: 1fr;
			align-items: stretch;
		}
	}
</style>
