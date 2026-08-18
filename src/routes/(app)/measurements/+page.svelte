<script lang="ts">
	import EntryForm from '$lib/components/EntryForm.svelte';
	import EntryList from '$lib/components/EntryList.svelte';
	import MetricCharts from '$lib/components/MetricCharts.svelte';
	import MetricTabs from '$lib/components/MetricTabs.svelte';
	import PeriodTabs from '$lib/components/PeriodTabs.svelte';
	import { measurementFields } from '$lib/tracking/fields';
	import { filterEntries, yearsInEntries, type PeriodSelection } from '$lib/tracking/period';
	import type { ActionData, PageServerData } from './$types';

	let { data, form }: { data: PageServerData; form: ActionData } = $props();

	let selectedKey = $state<string>(measurementFields[0].key);
	let selectedKeys = $derived([selectedKey]);
	let tableKeys = $derived(measurementFields.map((field) => field.key));
	let period = $state<PeriodSelection>({ type: 'overall' });
	let years = $derived(yearsInEntries(data.entries));
	let visibleEntries = $derived(filterEntries(data.entries, period));
	let includeYear = $derived(period.type === 'overall' || period.type === 'custom');
</script>

<svelte:head>
	<title>Body Ledger · Measurements</title>
</svelte:head>

<div class="page-grid">
	<section class="history-block">
		<h1>Full history</h1>
		<MetricTabs
			fields={measurementFields}
			{selectedKey}
			primaryKeys={tableKeys}
			onSelect={(key) => (selectedKey = key)}
		/>
		<PeriodTabs {period} {years} onPeriod={(next) => (period = next)} />
		<MetricCharts
			entries={visibleEntries}
			fields={measurementFields}
			{selectedKeys}
			{includeYear}
		/>
	</section>

	<section class="card">
		<div class="section-head">
			<div>
				<h2>Log an entry</h2>
				<p>Saving the same date updates that day’s numbers.</p>
			</div>
		</div>
		<EntryForm fields={measurementFields} recordedOn={form?.recordedOn} message={form?.message} />
	</section>

	<section class="card">
		<div class="section-head">
			<div>
				<h2>Entries</h2>
				<p>{visibleEntries.length} in this range · deltas vs the previous log</p>
			</div>
		</div>
		<EntryList entries={visibleEntries} fields={measurementFields} selectedKeys={tableKeys} />
	</section>
</div>
