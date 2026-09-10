<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import DatePicker from './DatePicker.svelte';
	import { todayIsoDate } from '$lib/tracking/dates';
	import {
		applyCompositionCalculations,
		profileIsComplete,
		type UserProfile
	} from '$lib/tracking/compositionCalc';
	import {
		formatFieldValue,
		isCompositionCalculatedKey,
		type FieldDef,
		type TrackingEntry
	} from '$lib/tracking/fields';

	let {
		fields,
		entry = null,
		defaults = null,
		recordedOn = todayIsoDate(),
		message = '',
		primaryKeys,
		profile = null,
		onSaved,
		onCancel
	}: {
		fields: readonly FieldDef[];
		entry?: TrackingEntry | null;
		/** Prefill for a new log (usually the most recent entry). Ignored while editing. */
		defaults?: TrackingEntry | null;
		recordedOn?: string;
		message?: string;
		primaryKeys?: readonly string[];
		profile?: UserProfile | null;
		onSaved?: () => void;
		onCancel?: () => void;
	} = $props();

	let calendarOpen = $state(false);
	let pickedDate = $state<string | undefined>();
	let saving = $state(false);
	let selectedDate = $derived(pickedDate ?? entry?.recordedOn ?? recordedOn);
	let inputFields = $derived(fields.filter((field) => !isCompositionCalculatedKey(field.key)));
	let calculatedFields = $derived(fields.filter((field) => isCompositionCalculatedKey(field.key)));
	let primaryFields = $derived(
		primaryKeys ? inputFields.filter((field) => primaryKeys.includes(field.key)) : inputFields
	);
	let extraFields = $derived(
		primaryKeys ? inputFields.filter((field) => !primaryKeys.includes(field.key)) : []
	);
	let fieldEdits = $state<Record<string, string>>({});
	let valuesSource = $derived(entry ?? defaults);

	function fieldValue(key: string): string {
		if (key in fieldEdits) return fieldEdits[key];
		const value = valuesSource?.[key];
		return typeof value === 'number' && Number.isFinite(value) ? String(value) : '';
	}

	let previewValues = $derived.by(() => {
		const values: Record<string, number | null> = {};
		for (const field of fields) {
			const raw = fieldValue(field.key);
			if (raw.trim() === '') {
				values[field.key] = null;
				continue;
			}
			const parsed = Number(raw);
			values[field.key] = Number.isFinite(parsed) ? parsed : null;
		}
		if (!profile) return values;
		return applyCompositionCalculations(values, profile, selectedDate);
	});

	let canPreviewCalcs = $derived(
		Boolean(profile && (profileIsComplete(profile) || previewValues.weight != null))
	);

	function afterSave() {
		saving = true;
		return async ({
			result,
			update
		}: {
			result: { type: string };
			update: (opts?: { reset: boolean }) => Promise<void>;
		}) => {
			try {
				await update({ reset: result.type === 'success' });
				if (result.type === 'success') onSaved?.();
			} finally {
				saving = false;
			}
		};
	}
</script>

{#snippet fieldInput(field: FieldDef)}
	<label class="field">
		{field.label}{field.unit ? ` (${field.unit})` : ''}
		<input
			type="number"
			name={field.key}
			step={field.decimals === 0 ? '1' : '0.1'}
			inputmode={field.decimals === 0 ? 'numeric' : 'decimal'}
			value={fieldValue(field.key)}
			oninput={(event) => (fieldEdits[field.key] = event.currentTarget.value)}
		/>
	</label>
{/snippet}

<form method="post" action="?/save" use:enhance={afterSave}>
	{#if entry}
		<input type="hidden" name="id" value={entry.id} />
	{/if}
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
		<button class="primary-btn" type="submit" disabled={saving} aria-busy={saving}>
			{#if saving}
				<span class="spinner" aria-hidden="true"></span>
				Saving…
			{:else}
				{entry ? 'Update entry' : 'Save entry'}
			{/if}
		</button>
		{#if entry}
			<button class="ghost-btn" type="button" disabled={saving} onclick={() => onCancel?.()}
				>Cancel</button
			>
		{/if}
	</div>
	<div class="field-grid">
		{#each primaryFields as field (field.key)}
			{@render fieldInput(field)}
		{/each}
	</div>
	{#if extraFields.length > 0}
		<details class="more-details" open={entry != null}>
			<summary>More details</summary>
			<div class="field-grid">
				{#each extraFields as field (field.key)}
					{@render fieldInput(field)}
				{/each}
			</div>
		</details>
	{/if}

	{#if calculatedFields.length > 0}
		<details class="more-details calculated-details" open>
			<summary>Calculated automatically</summary>
			{#if !profile || !profileIsComplete(profile)}
				<p class="calc-hint">
					Add your birthday, height, and gender in
					<a href={resolve('/profile')}>Profile</a>
					so BMI and BMR can be calculated. Fat mass and lean mass still update from weight and body fat.
					Metabolic age comes from the scale export.
				</p>
			{/if}
			<dl class="calc-grid">
				{#each calculatedFields as field (field.key)}
					{@const value = previewValues[field.key]}
					<div>
						<dt>{field.label}</dt>
						<dd class="numeric">
							{#if canPreviewCalcs && typeof value === 'number'}
								{formatFieldValue(value, field)}
							{:else}
								—
							{/if}
						</dd>
					</div>
				{/each}
			</dl>
		</details>
	{/if}
</form>

<style>
	.primary-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		min-width: 8.5rem;
	}

	.primary-btn:disabled {
		opacity: 0.75;
		cursor: wait;
	}

	.spinner {
		width: 14px;
		height: 14px;
		border: 2px solid color-mix(in srgb, var(--accent-text) 35%, transparent);
		border-top-color: var(--accent-text);
		border-radius: 50%;
		animation: spin 0.7s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.spinner {
			animation: none;
			border-top-color: color-mix(in srgb, var(--accent-text) 35%, transparent);
			opacity: 0.7;
		}
	}

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

	.calc-hint {
		margin: 10px 0 0;
		font-size: 0.86rem;
		color: var(--ink-soft);
		max-width: 42rem;
	}

	.calc-hint a {
		color: var(--accent);
	}

	.calc-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
		gap: 10px 16px;
		margin: 12px 0 0;
	}

	.calc-grid div {
		display: grid;
		gap: 2px;
	}

	.calc-grid dt {
		font-size: 0.78rem;
		color: var(--ink-soft);
	}

	.calc-grid dd {
		margin: 0;
		font-size: 1.05rem;
		font-weight: 650;
	}
</style>
