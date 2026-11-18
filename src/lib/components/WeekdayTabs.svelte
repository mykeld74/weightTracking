<script lang="ts">
	import { weekdayOptions, type ChartGrain, type WeekdayKey } from '$lib/tracking/period';

	let {
		weekdays,
		grain = 'day',
		onWeekdays,
		onGrain
	}: {
		weekdays: readonly WeekdayKey[];
		grain?: ChartGrain;
		onWeekdays: (next: WeekdayKey[]) => void;
		onGrain: (next: ChartGrain) => void;
	} = $props();

	let selectedDay = $derived(weekdays[0] ?? null);
	let allDays = $derived(grain === 'day' && selectedDay == null);
	let weekly = $derived(grain === 'week');

	function selectAll() {
		onGrain('day');
		onWeekdays([]);
	}

	function selectWeekly() {
		onGrain('week');
		onWeekdays([]);
	}

	function select(day: WeekdayKey) {
		onGrain('day');
		onWeekdays([day]);
	}
</script>

<div class="period-tabs weekday-tabs" role="tablist" aria-label="Days of the week">
	<button
		class={{ active: allDays }}
		type="button"
		role="tab"
		aria-selected={allDays}
		onclick={selectAll}
	>
		All days
	</button>
	<button
		class={{ active: weekly }}
		type="button"
		role="tab"
		aria-selected={weekly}
		onclick={selectWeekly}
	>
		<span class="weekly-full">Weekly avg</span>
		<span class="weekly-short">Week</span>
	</button>
	<span class="day-sep" aria-hidden="true"></span>
	{#each weekdayOptions as day (day.key)}
		<button
			class={['day-btn', { active: selectedDay === day.key }]}
			type="button"
			role="tab"
			aria-selected={selectedDay === day.key}
			aria-label={day.label}
			onclick={() => select(day.key)}
		>
			{day.short}
		</button>
	{/each}
</div>

<style>
	.weekday-tabs {
		flex-wrap: nowrap;
	}

	.weekday-tabs button {
		flex: none;
		white-space: nowrap;
	}

	.day-sep {
		align-self: stretch;
		width: 1px;
		margin: 10px 2px 12px;
		background: var(--line);
	}

	.day-btn {
		min-width: 1.6em;
		text-align: center;
	}

	.weekly-short {
		display: none;
	}

	@media (max-width: 720px) {
		.weekday-tabs {
			justify-content: space-between;
			gap: 0 12px;
		}

		.weekly-full {
			display: none;
		}

		.weekly-short {
			display: inline;
		}
	}
</style>
