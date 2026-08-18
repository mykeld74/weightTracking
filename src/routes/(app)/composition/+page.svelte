<script lang="ts">
	import CsvImport from '$lib/components/CsvImport.svelte';
	import EntryForm from '$lib/components/EntryForm.svelte';
	import EntryList from '$lib/components/EntryList.svelte';
	import MetricCharts from '$lib/components/MetricCharts.svelte';
	import MetricTabs from '$lib/components/MetricTabs.svelte';
	import PeriodTabs from '$lib/components/PeriodTabs.svelte';
	import {
		compositionFields,
		defaultCompositionMetricKeys,
		primaryCompositionKeys,
		type TrackingEntry
	} from '$lib/tracking/fields';
	import { injectionChanges } from '$lib/tracking/glp1';
	import { filterEntries, yearsInEntries, type PeriodSelection } from '$lib/tracking/period';
	import type { ActionData, PageServerData } from './$types';

	let { data, form }: { data: PageServerData; form: ActionData } = $props();

	let selectedKey = $state<string>(defaultCompositionMetricKeys[0]);
	let selectedKeys = $derived([selectedKey]);
	let period = $state<PeriodSelection>({ type: 'overall' });
	let years = $derived(yearsInEntries(data.entries));
	let visibleEntries = $derived(filterEntries(data.entries, period));
	let includeYear = $derived(period.type === 'overall' || period.type === 'custom');
	let markers = $derived(
		injectionChanges(data.injections).map((change) => ({
			date: change.date,
			label: `${change.medication} ${change.dosage} mg`
		}))
	);
	let editingEntry = $state<TrackingEntry | null>(null);

	function editEntry(entry: TrackingEntry) {
		editingEntry = entry;
		queueMicrotask(() => {
			document.getElementById('entry-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
		});
	}
</script>

<svelte:head>
	<title>Body Ledger · Composition</title>
</svelte:head>

<div class="page-grid">
	<section class="history-block">
		<h1>Full history</h1>
		<MetricTabs
			fields={compositionFields}
			{selectedKey}
			primaryKeys={primaryCompositionKeys}
			onSelect={(key) => (selectedKey = key)}
		/>
		<PeriodTabs {period} {years} onPeriod={(next) => (period = next)} />
		<MetricCharts
			entries={visibleEntries}
			fields={compositionFields}
			{selectedKeys}
			{includeYear}
			{markers}
		/>
	</section>

	<section class="card" id="entry-form">
		<div class="section-head">
			<div>
				<h2>{editingEntry ? 'Edit entry' : 'Log an entry'}</h2>
				<p>
					{editingEntry
						? 'Update the numbers or date for this log.'
						: 'Saving the same date updates that day’s numbers.'}
				</p>
			</div>
		</div>
		{#key editingEntry?.id ?? 'new'}
			<EntryForm
				fields={compositionFields}
				primaryKeys={primaryCompositionKeys}
				entry={editingEntry}
				recordedOn={form?.recordedOn}
				message={form?.message}
				onSaved={() => (editingEntry = null)}
				onCancel={() => (editingEntry = null)}
			/>
		{/key}
		{#if !editingEntry}
			<CsvImport
				fields={compositionFields}
				message={form?.importMessage}
				count={form?.importCount}
			/>
		{/if}
	</section>

	<section class="card">
		<div class="section-head">
			<div>
				<h2>Entries</h2>
				<p>{visibleEntries.length} in this range · deltas vs the previous log</p>
			</div>
		</div>
		<EntryList
			entries={visibleEntries}
			fields={compositionFields}
			{selectedKeys}
			pinnedKeys={['weight', 'bmi']}
			editingId={editingEntry?.id}
			onEdit={editEntry}
		/>
	</section>
</div>
