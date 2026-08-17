<script lang="ts">
	import { enhance } from '$app/forms';
	import DatePicker from './DatePicker.svelte';
	import { todayIsoDate } from '$lib/tracking/dates';
	import type { FieldDef } from '$lib/tracking/fields';

	let {
		fields,
		recordedOn = todayIsoDate(),
		message = '',
		primaryKeys
	}: {
		fields: readonly FieldDef[];
		recordedOn?: string;
		message?: string;
		primaryKeys?: readonly string[];
	} = $props();

	let calendarOpen = $state(false);
	let pickedDate = $state<string | undefined>();
	let selectedDate = $derived(pickedDate ?? recordedOn);
	let primaryFields = $derived(
		primaryKeys ? fields.filter((field) => primaryKeys.includes(field.key)) : fields
	);
	let extraFields = $derived(
		primaryKeys ? fields.filter((field) => !primaryKeys.includes(field.key)) : []
	);
</script>

{#snippet fieldInput(field: FieldDef)}
	<label class="field">
		{field.label}{field.unit ? ` (${field.unit})` : ''}
		<input type="number" name={field.key} step="0.1" inputmode="decimal" />
	</label>
{/snippet}

<form method="post" action="?/save" use:enhance>
	{#if message}
		<p class="flash">{message}</p>
	{/if}
	<div class="form-row">
		<DatePicker
			label="Date"
			value={selectedDate}
			open={calendarOpen}
			onOpen={() => (calendarOpen = true)}
			onClose={() => (calendarOpen = false)}
			onSelect={(next) => (pickedDate = next)}
		/>
		<input type="hidden" name="recordedOn" value={selectedDate} />
		<button class="primary-btn" type="submit">Save entry</button>
	</div>
	<div class="field-grid">
		{#each primaryFields as field (field.key)}
			{@render fieldInput(field)}
		{/each}
	</div>
	{#if extraFields.length > 0}
		<details class="more-details">
			<summary>More details</summary>
			<div class="field-grid">
				{#each extraFields as field (field.key)}
					{@render fieldInput(field)}
				{/each}
			</div>
		</details>
	{/if}
</form>

<style>
	.more-details {
		margin-top: 14px;
	}

	.more-details summary {
		cursor: pointer;
		color: var(--ink-soft);
		font-size: 0.9rem;
		font-weight: 500;
		width: fit-content;
		list-style: none;
		display: inline-flex;
		align-items: center;
		gap: 8px;
		user-select: none;
	}

	.more-details summary::-webkit-details-marker {
		display: none;
	}

	.more-details summary::before {
		content: '';
		width: 0.42em;
		height: 0.42em;
		border-right: 1.5px solid currentColor;
		border-bottom: 1.5px solid currentColor;
		transform: rotate(-45deg);
		transition: transform 160ms ease;
	}

	.more-details[open] summary::before {
		transform: rotate(45deg);
	}

	.more-details summary:hover {
		color: var(--ink);
	}

	.more-details .field-grid {
		margin-top: 12px;
	}
</style>
