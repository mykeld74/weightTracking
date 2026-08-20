<script lang="ts">
	import CsvImport from '$lib/components/CsvImport.svelte';
	import EntryForm from '$lib/components/EntryForm.svelte';
	import EntryList from '$lib/components/EntryList.svelte';
	import MetricCharts from '$lib/components/MetricCharts.svelte';
	import MetricTabs from '$lib/components/MetricTabs.svelte';
	import PeriodTabs from '$lib/components/PeriodTabs.svelte';
	import WeekdayTabs from '$lib/components/WeekdayTabs.svelte';
	import {
		measurementFields,
		primaryMeasurementKeys,
		type TrackingEntry
	} from '$lib/tracking/fields';
	import {
		filterEntries,
		filterEntriesByWeekdays,
		yearsInEntries,
		type ChartGrain,
		type PeriodSelection,
		type WeekdayKey
	} from '$lib/tracking/period';
	import Skeleton from '$lib/components/Skeleton.svelte';
	import { asyncData } from '$lib/client/asyncData.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const history = asyncData(
		() => `measurements:${data.user.id}`,
		() => data.entries
	);
	let entries = $derived(history.current ?? []);

	let selectedKey = $state<string>(measurementFields[0].key);
	let selectedKeys = $derived([selectedKey]);
	let tableKeys = $derived(measurementFields.map((field) => field.key));
	let period = $state<PeriodSelection>({ type: 'overall' });
	let weekdays = $state<WeekdayKey[]>([]);
	let grain = $state<ChartGrain>('day');
	let years = $derived(yearsInEntries(entries));
	let visibleEntries = $derived(
		filterEntriesByWeekdays(filterEntries(entries, period), weekdays)
	);
	let includeYear = $derived(period.type === 'overall' || period.type === 'custom');
	let editingEntry = $state<TrackingEntry | null>(null);

	function editEntry(entry: TrackingEntry) {
		editingEntry = entry;
		queueMicrotask(() => {
			document.getElementById('entry-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
		});
	}
</script>

<svelte:head>
	<title>Body Ledger · Measurements</title>
</svelte:head>

<div class="page-grid">
	<section class="history-block">
		<h1>Full history</h1>
		<div class="history-filters">
			<MetricTabs
				fields={measurementFields}
				{selectedKey}
				primaryKeys={primaryMeasurementKeys}
				desktopKeys={tableKeys}
				onSelect={(key) => (selectedKey = key)}
			/>
			<PeriodTabs {period} {years} onPeriod={(next) => (period = next)} />
			<WeekdayTabs
				{weekdays}
				{grain}
				onWeekdays={(next) => (weekdays = next)}
				onGrain={(next) => (grain = next)}
			/>
		</div>
		{#if history.current}
			<div class={{ revalidating: history.isStale }}>
				<MetricCharts
					entries={visibleEntries}
					fields={measurementFields}
					{selectedKeys}
					{includeYear}
					{grain}
				/>
			</div>
		{:else if history.error}
			<p class="flash">{history.error}</p>
		{:else}
			<div class="chart-skeleton">
				<Skeleton height="96px" />
				<Skeleton height="340px" />
			</div>
		{/if}
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
				fields={measurementFields}
				entry={editingEntry}
				recordedOn={form?.recordedOn}
				message={form?.message}
				onSaved={() => (editingEntry = null)}
				onCancel={() => (editingEntry = null)}
			/>
		{/key}
		{#if !editingEntry}
			<CsvImport
				fields={measurementFields}
				message={form?.importMessage}
				count={form?.importCount}
			/>
		{/if}
	</section>

	<section class="card">
		<div class="section-head">
			<div>
				<h2>Entries</h2>
				<p>
					{#if history.current}
						{visibleEntries.length} in this range · deltas vs the previous log
					{:else}
						Loading your history…
					{/if}
				</p>
			</div>
		</div>
		{#if history.current}
			<div class={{ revalidating: history.isStale }}>
				<EntryList
					entries={visibleEntries}
					fields={measurementFields}
					selectedKeys={tableKeys}
					editingId={editingEntry?.id}
					onEdit={editEntry}
				/>
			</div>
		{:else if !history.error}
			<div class="list-skeleton">
				{#each { length: 6 }, row (row)}
					<Skeleton height="34px" />
				{/each}
			</div>
		{/if}
	</section>
</div>

<style>
	.chart-skeleton,
	.list-skeleton {
		display: grid;
		gap: 10px;
	}

	/* Dim only if the refresh is actually slow. The 350ms delay means a fast
	   revalidation finishes before the animation starts, so routine navigation
	   never flickers. */
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
