<script lang="ts">
	import { entriesToCsv, entriesToJson } from '$lib/tracking/csv';
	import { downloadBlob } from '$lib/tracking/photos';
	import type { FieldDef, TrackingEntry } from '$lib/tracking/fields';

	let {
		entries,
		rangeEntries = null,
		fields,
		filenamePrefix = 'body-ledger'
	}: {
		entries: TrackingEntry[];
		/** When set and shorter than full history, offer a second export for the chart range. */
		rangeEntries?: TrackingEntry[] | null;
		fields: readonly FieldDef[];
		filenamePrefix?: string;
	} = $props();

	let rangeDiffers = $derived(
		Boolean(rangeEntries && rangeEntries.length > 0 && rangeEntries.length !== entries.length)
	);

	function stamp(): string {
		return new Date().toISOString().slice(0, 10);
	}

	function exportCsv(rows: TrackingEntry[], suffix: string) {
		const blob = new Blob([entriesToCsv(rows, fields)], { type: 'text/csv;charset=utf-8' });
		downloadBlob(blob, `${filenamePrefix}-${suffix}-${stamp()}.csv`);
	}

	function exportJson(rows: TrackingEntry[], suffix: string) {
		const blob = new Blob([entriesToJson(rows, fields)], {
			type: 'application/json;charset=utf-8'
		});
		downloadBlob(blob, `${filenamePrefix}-${suffix}-${stamp()}.json`);
	}
</script>

<details class="data-export">
	<summary>Export data</summary>
	<p class="hint">
		Download your logs as CSV (re-importable) or JSON. Full history includes every saved date.
		{#if rangeDiffers}
			“This range” matches the filters above the chart.
		{/if}
	</p>
	<div class="export-actions">
		<button class="ghost-btn" type="button" disabled={entries.length === 0} onclick={() => exportCsv(entries, 'all')}>
			CSV · all ({entries.length})
		</button>
		<button class="ghost-btn" type="button" disabled={entries.length === 0} onclick={() => exportJson(entries, 'all')}>
			JSON · all ({entries.length})
		</button>
		{#if rangeDiffers && rangeEntries}
			<button
				class="ghost-btn"
				type="button"
				onclick={() => exportCsv(rangeEntries, 'range')}
			>
				CSV · this range ({rangeEntries.length})
			</button>
			<button
				class="ghost-btn"
				type="button"
				onclick={() => exportJson(rangeEntries, 'range')}
			>
				JSON · this range ({rangeEntries.length})
			</button>
		{/if}
	</div>
</details>

<style>
	.data-export {
		margin-top: 14px;
		padding-top: 14px;
		border-top: 1px solid var(--line);
	}

	.data-export summary {
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

	.data-export summary::-webkit-details-marker {
		display: none;
	}

	.data-export summary::before {
		content: '';
		width: 0.42em;
		height: 0.42em;
		border-right: 1.5px solid currentColor;
		border-bottom: 1.5px solid currentColor;
		transform: rotate(-45deg);
		transition: transform 160ms ease;
	}

	.data-export[open] summary::before {
		transform: rotate(45deg);
	}

	.data-export summary:hover {
		color: var(--ink);
	}

	.hint {
		margin: 12px 0 14px;
		color: var(--ink-soft);
		font-size: 0.88rem;
		max-width: 52ch;
	}

	.export-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.export-actions .ghost-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
