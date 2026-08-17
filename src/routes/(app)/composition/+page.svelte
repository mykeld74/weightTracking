<script lang="ts">
	import EntryForm from '$lib/components/EntryForm.svelte';
	import EntryList from '$lib/components/EntryList.svelte';
	import MetricCharts from '$lib/components/MetricCharts.svelte';
	import MetricTabs from '$lib/components/MetricTabs.svelte';
	import PeriodTabs from '$lib/components/PeriodTabs.svelte';
	import {
		compositionFields,
		defaultCompositionMetricKeys,
		primaryCompositionKeys
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
</script>

<svelte:head>
	<title>Composition · Body Ledger</title>
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

	<section class="card">
		<div class="section-head">
			<div>
				<h2>Log an entry</h2>
				<p>Saving the same date updates that day’s numbers.</p>
			</div>
		</div>
		<EntryForm
			fields={compositionFields}
			primaryKeys={primaryCompositionKeys}
			recordedOn={form?.recordedOn}
			message={form?.message}
		/>
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
		/>
	</section>
</div>
