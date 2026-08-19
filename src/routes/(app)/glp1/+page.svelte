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
	import Skeleton from '$lib/components/Skeleton.svelte';
	import { asyncData } from '$lib/client/asyncData.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const log = asyncData(
		() => `glp1:${data.user.id}`,
		() => data.log
	);
	let entries = $derived(log.current?.entries ?? []);
	let regimens = $derived(log.current?.regimens ?? []);

	let medications = $derived(
		mergeOptions(popularMedications, [
			...uniqueValues(entries, 'medication'),
			...regimens.map((item) => item.medication)
		])
	);
	let locations = $derived(mergeOptions(commonLocations, uniqueValues(entries, 'location')));
	let regimen = $derived(currentRegimen(regimens, todayIsoDate()));
	let lastDose = $derived(lastDoseFor(entries));
	let nextLocation = $derived(nextLocationFor(entries));
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
		{#if log.current}
			<div class={{ revalidating: log.isStale }}>
				<Glp1Medication {regimen} {regimens} {medications} message={medicationMessage} />
			</div>
		{:else if log.error}
			<p class="flash">{log.error}</p>
		{:else}
			<Skeleton height="76px" />
		{/if}
	</section>

	{#if regimen}
		<section class="card">
			<div class="section-head">
				<div>
					<h2>Log an injection</h2>
					<p>
						Dose starts from your last shot. The site flips to the other side for the next week.
					</p>
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
				<p>{log.current ? `${entries.length} logged` : 'Loading your log…'}</p>
			</div>
		</div>
		{#if log.current}
			<div class={{ revalidating: log.isStale }}>
				<Glp1List {entries} />
			</div>
		{:else if !log.error}
			<div class="list-skeleton">
				{#each { length: 4 }, row (row)}
					<Skeleton height="34px" />
				{/each}
			</div>
		{/if}
	</section>
</div>

<style>
	.list-skeleton {
		display: grid;
		gap: 10px;
	}

	/* Dim only if the refresh is actually slow, so routine navigation never flickers. */
	.revalidating {
		animation: dim-refreshing 140ms ease-out 350ms forwards;
	}

	@keyframes dim-refreshing {
		to {
			opacity: 0.6;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.revalidating {
			animation: none;
			opacity: 0.6;
		}
	}
</style>
