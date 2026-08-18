<script lang="ts">
	import { weekdayOptions, type WeekdayKey } from '$lib/tracking/period';

	let {
		weekdays,
		onWeekdays
	}: {
		weekdays: readonly WeekdayKey[];
		onWeekdays: (next: WeekdayKey[]) => void;
	} = $props();

	let selectedDay = $derived(weekdays[0] ?? null);
	let allDays = $derived(selectedDay == null);

	function selectAll() {
		onWeekdays([]);
	}

	function select(day: WeekdayKey) {
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
	{#each weekdayOptions as day (day.key)}
		<button
			class={{ active: selectedDay === day.key }}
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

	@media (max-width: 720px) {
		.weekday-tabs {
			justify-content: space-between;
			gap: 0 12px;
		}
	}
</style>
