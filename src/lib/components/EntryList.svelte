<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatShortDate } from '$lib/tracking/dates';
	import type { FieldDef, TrackingEntry } from '$lib/tracking/fields';

	let {
		entries,
		fields,
		selectedKeys = [],
		pinnedKeys = [],
		editingId = null,
		onEdit
	}: {
		entries: TrackingEntry[];
		fields: readonly FieldDef[];
		selectedKeys?: string[];
		pinnedKeys?: string[];
		editingId?: string | null;
		onEdit?: (entry: TrackingEntry) => void;
	} = $props();

	let columns = $derived.by(() => {
		const wanted = new Set([...selectedKeys, ...pinnedKeys]);
		if (wanted.size === 0) return [...fields];
		return fields.filter((field) => wanted.has(field.key));
	});
	let recent = $derived([...entries].sort((a, b) => b.recordedOn.localeCompare(a.recordedOn)));

	// The table lives in a ~560px scroll box that shows roughly 15 rows, so
	// rendering the full history (hundreds of rows, each with its own enhanced
	// delete form) costs thousands of DOM nodes per navigation for no benefit.
	const pageSize = 100;
	let visibleCount = $state(pageSize);

	$effect(() => {
		// Reset the window when the underlying list changes (navigation, filters).
		void entries.length;
		visibleCount = pageSize;
	});

	// Deltas still read from the full `recent` array, so the row at the window
	// edge compares against the entry just outside it.
	let shown = $derived(recent.slice(0, visibleCount));
	let hiddenCount = $derived(Math.max(0, recent.length - shown.length));
	let includeYear = $derived(
		recent.length > 0 &&
			recent[0].recordedOn.slice(0, 4) !== recent[recent.length - 1].recordedOn.slice(0, 4)
	);

	function numericValue(entry: TrackingEntry, key: string): number | null {
		const value = entry[key];
		return typeof value === 'number' && Number.isFinite(value) ? value : null;
	}

	function deltaFor(
		entry: TrackingEntry,
		older: TrackingEntry | undefined,
		key: string
	): number | null {
		if (!older) return null;
		const current = numericValue(entry, key);
		const previous = numericValue(older, key);
		if (current == null || previous == null) return null;
		const delta = current - previous;
		return delta === 0 ? 0 : delta;
	}

	function formatDelta(value: number, field: FieldDef): string {
		const formatted = Math.abs(value).toFixed(field.decimals);
		return `${value < 0 ? '-' : '+'}${formatted}`;
	}
</script>

{#if recent.length === 0}
	<p class="empty">No entries in this range.</p>
{:else}
	<div class="entry-chart">
		<table>
			<thead>
				<tr>
					<th class="sticky">Date</th>
					{#each columns as field (field.key)}
						<th class="metric-head" colspan="2">
							{field.label}
							{#if field.unit}<span class="unit">{field.unit}</span>{/if}
						</th>
					{/each}
					<th class="actions"><span class="sr-only">Actions</span></th>
				</tr>
			</thead>
			<tbody>
				{#each shown as entry, index (entry.id)}
					{@const older = recent[index + 1]}
					<tr class={{ editing: editingId === entry.id }}>
						<th class="sticky">{formatShortDate(entry.recordedOn, includeYear)}</th>
						{#each columns as field (field.key)}
							{@const value = numericValue(entry, field.key)}
							{@const delta = deltaFor(entry, older, field.key)}
							<td class="val">
								{#if value == null}
									<span class="blank">—</span>
								{:else}
									<span class="numeric">{value.toFixed(field.decimals)}</span>
								{/if}
							</td>
							<td
								class={[
									'delta',
									delta != null && delta < 0 && 'down',
									delta != null && delta > 0 && 'up'
								]}
							>
								{delta == null ? '' : formatDelta(delta, field)}
							</td>
						{/each}
						<td class="actions">
							<div class="action-row">
								{#if onEdit}
									<button class="text-btn" type="button" onclick={() => onEdit(entry)}>Edit</button>
								{/if}
								<form method="post" action="?/remove" use:enhance>
									<input type="hidden" name="id" value={entry.id} />
									<button class="danger-btn" type="submit">Delete</button>
								</form>
							</div>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
		{#if hiddenCount > 0}
			<div class="more-row">
				<button class="ghost-btn" type="button" onclick={() => (visibleCount += pageSize)}>
					Show {Math.min(pageSize, hiddenCount)} more
				</button>
				<small>{shown.length} of {recent.length}</small>
			</div>
		{/if}
	</div>
{/if}

<style>
	.more-row {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 12px;
		padding: 12px;
	}

	.more-row small {
		color: var(--ink-soft);
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	.entry-chart {
		width: 100%;
		max-width: 100%;
		min-width: 0;
		max-height: min(560px, 70vh);
		overflow: auto;
		overscroll-behavior: contain;
		border-radius: 12px;
		background: var(--bg);
	}

	table {
		width: max-content;
		min-width: 100%;
		border-collapse: separate;
		border-spacing: 0;
		font-variant-numeric: tabular-nums;
	}

	th,
	td {
		padding: 10px 14px;
		text-align: right;
		white-space: nowrap;
		border-bottom: 1px solid var(--line);
	}

	thead th {
		position: sticky;
		top: 0;
		z-index: 2;
		background: #1c1f26;
		color: var(--ink-soft);
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	tbody th,
	tbody td {
		background: var(--bg);
	}

	tbody tr:hover th,
	tbody tr:hover td,
	tbody tr.editing th,
	tbody tr.editing td {
		background: #1a1d24;
	}

	.action-row {
		display: inline-flex;
		align-items: center;
		gap: 12px;
	}

	.sticky {
		position: sticky;
		left: 0;
		z-index: 1;
		text-align: left;
		font-weight: 600;
	}

	thead .sticky {
		z-index: 3;
		font-weight: 600;
	}

	.unit {
		display: block;
		margin-top: 2px;
		letter-spacing: 0;
		text-transform: none;
		font-weight: 500;
		opacity: 0.75;
	}

	.val {
		font-weight: 600;
		font-family: 'Figtree', system-ui, sans-serif;
		padding-right: 8px;
	}

	.delta {
		width: 6ch;
		min-width: 6ch;
		padding-left: 0;
		font-size: 0.8rem;
		font-variant-numeric: tabular-nums lining-nums;
		text-align: right;
		color: var(--ink-soft);
	}

	.delta.down {
		color: var(--teal);
	}

	.delta.up {
		color: var(--accent);
	}

	.blank {
		color: var(--ink-soft);
		opacity: 0.55;
	}

	.actions {
		width: 1%;
		padding-right: 12px;
	}

	.actions :global(.text-btn),
	.actions :global(.danger-btn) {
		font-size: 0.8rem;
	}
</style>
