<script lang="ts">
	import Glp1Form from '$lib/components/Glp1Form.svelte';
	import Glp1List from '$lib/components/Glp1List.svelte';
	import Glp1Medication from '$lib/components/Glp1Medication.svelte';
	import { todayIsoDate } from '$lib/tracking/dates';
	import {
		commonLocations,
		currentRegimen,
		lastDoseFor,
		mergeOptions,
		nextLocationFor,
		popularMedications,
		uniqueValues
	} from '$lib/tracking/glp1';
	import type { ActionData, PageServerData } from './$types';

	let { data, form }: { data: PageServerData; form: ActionData } = $props();

	let medications = $derived(
		mergeOptions(popularMedications, [
			...uniqueValues(data.entries, 'medication'),
			...data.regimens.map((item) => item.medication)
		])
	);
	let locations = $derived(mergeOptions(commonLocations, uniqueValues(data.entries, 'location')));
	let regimen = $derived(currentRegimen(data.regimens, todayIsoDate()));
	let lastDose = $derived(lastDoseFor(data.entries));
	let nextLocation = $derived(nextLocationFor(data.entries));
	let medicationMessage = $derived(
		form && 'intent' in form && form.intent === 'medication' ? form.message : ''
	);
	let injectionMessage = $derived(
		form && 'intent' in form && form.intent === 'medication' ? undefined : form?.message
	);
</script>

<svelte:head>
	<title>Body Ledger · GLP-1</title>
</svelte:head>

<div class="page-grid">
	<section class="card">
		<div class="section-head">
			<div>
				<h2>Medication</h2>
				<p>Saved as your current medication until you switch.</p>
			</div>
		</div>
		<Glp1Medication
			{regimen}
			regimens={data.regimens}
			{medications}
			message={medicationMessage}
		/>
	</section>

	{#if regimen}
		<section class="card">
			<div class="section-head">
				<div>
					<h2>Log an injection</h2>
					<p>Dose starts from your last shot. The site flips to the other side for the next week.</p>
				</div>
			</div>
			<Glp1Form
				recordedOn={form?.recordedOn}
				message={injectionMessage}
				{locations}
				defaultDosage={lastDose}
				defaultLocation={nextLocation}
			/>
		</section>
	{/if}

	<section class="card">
		<div class="section-head">
			<div>
				<h2>Injections</h2>
				<p>{data.entries.length} logged</p>
			</div>
		</div>
		<Glp1List entries={data.entries} />
	</section>
</div>
