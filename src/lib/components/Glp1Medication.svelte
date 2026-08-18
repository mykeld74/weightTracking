<script lang="ts">
	import { enhance } from '$app/forms';
	import Combobox from './Combobox.svelte';
	import DatePicker from './DatePicker.svelte';
	import { formatDisplayDate, todayIsoDate } from '$lib/tracking/dates';
	import type { Glp1Regimen } from '$lib/tracking/glp1';

	let {
		regimen,
		regimens,
		medications,
		message = ''
	}: {
		regimen: Glp1Regimen | null;
		regimens: Glp1Regimen[];
		medications: readonly string[];
		message?: string;
	} = $props();

	let switching = $state(false);
	let medication = $state('');
	let calendarOpen = $state(false);
	let pickedDate = $state<string | undefined>();
	let startedOn = $derived(pickedDate ?? todayIsoDate());
	let history = $derived([...regimens].sort((a, b) => b.startedOn.localeCompare(a.startedOn)));

	function beginSwitch() {
		switching = true;
		medication = '';
	}
</script>

{#if message}
	<p class="flash">{message}</p>
{/if}

{#if regimen && !switching}
	<div class="current">
		<div>
			<strong>{regimen.medication}</strong>
			<small>Since {formatDisplayDate(regimen.startedOn)}</small>
		</div>
		<button class="ghost-btn" type="button" onclick={beginSwitch}>Switch medication</button>
	</div>
{:else}
	<form
		class="switch-form"
		method="post"
		action="?/saveMedication"
		use:enhance={() => {
			return async ({ result, update }) => {
				await update();
				if (result.type === 'success') switching = false;
			};
		}}
	>
		<p class="muted">
			{regimen
				? 'New injections from the start date use this medication. Earlier logs stay as they were.'
				: 'Choose what you’re taking. You can switch later without losing past logs.'}
		</p>
		<div class="form-row">
			<Combobox
				label="Medication"
				name="medication"
				options={medications}
				bind:value={medication}
			/>
			{#if regimen}
				<DatePicker
					label="Starting"
					value={startedOn}
					open={calendarOpen}
					onOpen={() => (calendarOpen = true)}
					onClose={() => (calendarOpen = false)}
					onSelect={(next) => (pickedDate = next)}
				/>
				<input type="hidden" name="recordedOn" value={startedOn} />
			{/if}
			<button class="primary-btn" type="submit">{regimen ? 'Switch' : 'Save medication'}</button>
			{#if regimen}
				<button class="ghost-btn" type="button" onclick={() => (switching = false)}>Cancel</button>
			{/if}
		</div>
	</form>
{/if}

{#if history.length > 1}
	<ol class="history">
		{#each history as item, index (item.id)}
			<li>
				<strong>{item.medication}</strong>
				<span>
					{formatDisplayDate(item.startedOn)}
					{#if index === 0}
						– now
					{/if}
				</span>
			</li>
		{/each}
	</ol>
{/if}

<style>
	.current {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		flex-wrap: wrap;
	}

	.current strong {
		display: block;
		font-size: 1.25rem;
	}

	.current small,
	.history span {
		color: var(--ink-soft);
	}

	.switch-form {
		display: grid;
		gap: 8px;
	}

	.switch-form .muted {
		margin: 0;
	}

	.history {
		margin: 16px 0 0;
		padding: 0;
		list-style: none;
		display: grid;
		gap: 8px;
	}

	.history li {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		font-size: 0.9rem;
	}
</style>
