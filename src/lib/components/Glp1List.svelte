<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatShortDate } from '$lib/tracking/dates';
	import type { Glp1Entry } from '$lib/tracking/glp1';

	let { entries }: { entries: Glp1Entry[] } = $props();

	let recent = $derived([...entries].sort((a, b) => b.recordedOn.localeCompare(a.recordedOn)));
	let includeYear = $derived(
		recent.length > 0 &&
			recent[0].recordedOn.slice(0, 4) !== recent[recent.length - 1].recordedOn.slice(0, 4)
	);
</script>

{#if recent.length === 0}
	<p class="empty">No injections logged yet.</p>
{:else}
	<div class="entry-chart">
		<table>
			<thead>
				<tr>
					<th class="sticky">Date</th>
					<th>Medication</th>
					<th>Dose</th>
					<th>Site</th>
					<th class="actions"><span class="sr-only">Actions</span></th>
				</tr>
			</thead>
			<tbody>
				{#each recent as entry (entry.id)}
					<tr>
						<th class="sticky">{formatShortDate(entry.recordedOn, includeYear)}</th>
						<td>{entry.medication}</td>
						<td class="val numeric">{entry.dosage.toFixed(2)} mg</td>
						<td>{entry.location}</td>
						<td class="actions">
							<form method="post" action="?/remove" use:enhance>
								<input type="hidden" name="id" value={entry.id} />
								<button class="danger-btn" type="submit">Delete</button>
							</form>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}

<style>
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
		max-height: min(560px, 70vh);
		overflow: auto;
		border-radius: 12px;
		background: var(--bg);
	}

	table {
		width: 100%;
		border-collapse: separate;
		border-spacing: 0;
		font-variant-numeric: tabular-nums;
	}

	th,
	td {
		padding: 10px 14px;
		text-align: left;
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
	tbody tr:hover td {
		background: #1a1d24;
	}

	.sticky {
		position: sticky;
		left: 0;
		z-index: 1;
		font-weight: 600;
	}

	thead .sticky {
		z-index: 3;
	}

	.val {
		font-weight: 600;
		text-align: right;
	}

	thead th:nth-child(3),
	tbody td.val {
		text-align: right;
	}

	.actions {
		width: 1%;
		padding-right: 12px;
		text-align: right;
	}

	.actions :global(.danger-btn) {
		font-size: 0.8rem;
	}
</style>
