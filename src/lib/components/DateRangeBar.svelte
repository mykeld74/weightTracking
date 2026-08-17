<script lang="ts">
	import { yearBounds, yearOptions, type DateRange } from '$lib/tracking/dates';

	let { range }: { range: DateRange } = $props();

	let year = $derived(range.year);
	let from = $derived(range.from);
	let to = $derived(range.to);

	function applyYear(nextYear: number) {
		year = nextYear;
		const bounds = yearBounds(nextYear);
		from = bounds.from;
		to = bounds.to;
	}
</script>

<form class="form-row" method="get">
	<label class="field">
		Year
		<select name="year" bind:value={year} onchange={() => applyYear(Number(year))}>
			{#each yearOptions() as optionYear (optionYear)}
				<option value={optionYear}>{optionYear}</option>
			{/each}
		</select>
	</label>
	<label class="field">
		From
		<input type="date" name="from" bind:value={from} />
	</label>
	<label class="field">
		To
		<input type="date" name="to" bind:value={to} />
	</label>
	<button class="primary-btn" type="submit">Apply range</button>
</form>
