<script lang="ts">
	import { enhance } from '$app/forms';
	import Combobox from './Combobox.svelte';
	import DatePicker from './DatePicker.svelte';
	import { todayIsoDate } from '$lib/tracking/dates';

	let {
		recordedOn = todayIsoDate(),
		message = '',
		locations,
		defaultDosage = null,
		defaultLocation = ''
	}: {
		recordedOn?: string;
		message?: string;
		locations: readonly string[];
		defaultDosage?: number | null;
		defaultLocation?: string;
	} = $props();

	let calendarOpen = $state(false);
	let pickedDate = $state<string | undefined>();
	let selectedDate = $derived(pickedDate ?? recordedOn);
	let doseEdit = $state<string | undefined>();
	let dosage = $derived(
		doseEdit != null && doseEdit !== ''
			? doseEdit
			: defaultDosage != null
				? String(defaultDosage)
				: ''
	);
	let locationEdit = $state<string | undefined>();
	let location = $derived(locationEdit ?? defaultLocation);

	function afterSave() {
		return async ({
			result,
			update
		}: {
			result: { type: string };
			update: (opts?: { reset: boolean }) => Promise<void>;
		}) => {
			await update({ reset: false });
			if (result.type !== 'success') return;
			doseEdit = undefined;
			locationEdit = undefined;
		};
	}
</script>

<form method="post" action="?/save" use:enhance={afterSave}>
	{#if message}
		<p class="flash">{message}</p>
	{/if}
	<div class="form-row">
		<DatePicker
			label="Injection date"
			value={selectedDate}
			open={calendarOpen}
			onOpen={() => (calendarOpen = true)}
			onClose={() => (calendarOpen = false)}
			onSelect={(next) => (pickedDate = next)}
		/>
		<input type="hidden" name="recordedOn" value={selectedDate} />
		<button class="primary-btn" type="submit">Save injection</button>
	</div>
	<div class="field-grid">
		<label class="field">
			Dose (mg)
			<input
				type="number"
				name="dosage"
				step="0.25"
				min="0.05"
				max="100"
				inputmode="decimal"
				required
				value={dosage}
				oninput={(event) => (doseEdit = event.currentTarget.value)}
			/>
		</label>
		<Combobox label="Injection site" name="location" options={locations} bind:value={location} />
	</div>
</form>
