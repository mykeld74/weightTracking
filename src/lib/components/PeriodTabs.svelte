<script lang="ts">
	import DatePicker from './DatePicker.svelte';
	import { todayIsoDate } from '$lib/tracking/dates';
	import type { PeriodSelection } from '$lib/tracking/period';

	let {
		period,
		years,
		onPeriod
	}: {
		period: PeriodSelection;
		years: number[];
		onPeriod: (next: PeriodSelection) => void;
	} = $props();

	let customFrom = $state(`${new Date().getFullYear()}-01-01`);
	let customTo = $state(todayIsoDate());
	let openField = $state<'from' | 'to' | null>(null);

	function selectCustom() {
		const from =
			period.type === 'custom' ? period.from : `${years[0] ?? new Date().getFullYear()}-01-01`;
		const to = period.type === 'custom' ? period.to : todayIsoDate();
		customFrom = from;
		customTo = to;
		openField = null;
		onPeriod({ type: 'custom', from, to });
	}

	function applyRange() {
		const from = customFrom <= customTo ? customFrom : customTo;
		const to = customFrom <= customTo ? customTo : customFrom;
		customFrom = from;
		customTo = to;
		onPeriod({ type: 'custom', from, to });
	}
</script>

<div class="period-tabs" role="tablist" aria-label="History range">
	<button
		class={{ active: period.type === 'overall' }}
		type="button"
		role="tab"
		aria-selected={period.type === 'overall'}
		onclick={() => onPeriod({ type: 'overall' })}
	>
		Overall
	</button>
	{#each years as year (year)}
		<button
			class={{ active: period.type === 'year' && period.year === year }}
			type="button"
			role="tab"
			aria-selected={period.type === 'year' && period.year === year}
			onclick={() => onPeriod({ type: 'year', year })}
		>
			{year}
		</button>
	{/each}
	<button
		class={{ active: period.type === 'custom' }}
		type="button"
		role="tab"
		aria-selected={period.type === 'custom'}
		onclick={selectCustom}
	>
		Custom
	</button>
</div>

{#if period.type === 'custom'}
	<div class="form-row period-custom">
		<DatePicker
			label="From"
			bind:value={customFrom}
			rangeFrom={customFrom}
			rangeTo={customTo}
			open={openField === 'from'}
			onOpen={() => (openField = 'from')}
			onClose={() => (openField = null)}
			onSelect={applyRange}
		/>
		<DatePicker
			label="To"
			bind:value={customTo}
			rangeFrom={customFrom}
			rangeTo={customTo}
			open={openField === 'to'}
			onOpen={() => (openField = 'to')}
			onClose={() => (openField = null)}
			onSelect={applyRange}
		/>
	</div>
{/if}
