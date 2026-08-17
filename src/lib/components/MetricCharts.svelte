<script lang="ts">
	import LineChart from './LineChart.svelte';
	import { formatShortDate } from '$lib/tracking/dates';
	import { computeRangeStats, pointsForField } from '$lib/tracking/stats';
	import type { FieldDef, TrackingEntry } from '$lib/tracking/fields';

	let {
		entries,
		fields,
		selectedKeys,
		includeYear = true,
		markers = []
	}: {
		entries: TrackingEntry[];
		fields: readonly FieldDef[];
		selectedKeys: string[];
		includeYear?: boolean;
		markers?: Array<{ date: string; label: string }>;
	} = $props();

	let selectedFields = $derived(fields.filter((field) => selectedKeys.includes(field.key)));
	let field = $derived(selectedFields[0]);
	let points = $derived(field ? pointsForField(entries, field.key) : []);
	let stats = $derived(computeRangeStats(points));

	function signedValue(value: number, field: FieldDef) {
		const formatted = Math.abs(value).toFixed(field.decimals);
		if (value > 0) return `+${formatted}`;
		if (value < 0) return `−${formatted}`;
		return formatted;
	}

	function changeTone(value: number) {
		if (value < 0) return 'down';
		if (value > 0) return 'up';
		return '';
	}
</script>

{#if !field}
	<p class="empty">Select at least one metric to graph.</p>
{:else}
	<div class="chart-grid">
		<section class="history-metric">
			{#if stats}
				<div class="summary-grid">
					<article class={['summary-card', changeTone(stats.change)]}>
						<span>Change</span>
						<strong class="numeric">{signedValue(stats.change, field)}</strong>
						<small>{formatShortDate(stats.first.date)} → {formatShortDate(stats.last.date)}</small>
					</article>
					<article class="summary-card latest">
						<span>Latest</span>
						<strong class="numeric">{stats.last.value.toFixed(field.decimals)}</strong>
						<small>{formatShortDate(stats.last.date, true)}</small>
					</article>
					<article class="summary-card low">
						<span>Lowest</span>
						<strong class="numeric">{stats.low.toFixed(field.decimals)}</strong>
						<small>{formatShortDate(stats.lowDate, includeYear)}</small>
					</article>
					<article class="summary-card high">
						<span>Highest</span>
						<strong class="numeric">{stats.high.toFixed(field.decimals)}</strong>
						<small>{formatShortDate(stats.highDate, includeYear)}</small>
					</article>
					<article class="summary-card avg">
						<span>Avg</span>
						<strong class="numeric">{stats.average.toFixed(field.decimals)}</strong>
						<small>{stats.count} entries</small>
					</article>
				</div>
			{/if}
			<div class="chart-shell">
				<LineChart {points} {field} {markers} />
			</div>
		</section>
	</div>
{/if}
