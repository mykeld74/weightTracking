<script lang="ts">
	import DatePicker from './DatePicker.svelte';
	import { todayIsoDate } from '$lib/tracking/dates';
	import { recentYears, type PeriodSelection } from '$lib/tracking/period';

	let {
		period,
		years,
		glp1StartedOn = null,
		onPeriod
	}: {
		period: PeriodSelection;
		years: number[];
		glp1StartedOn?: string | null;
		onPeriod: (next: PeriodSelection) => void;
	} = $props();

	let customFrom = $state(`${new Date().getFullYear()}-01-01`);
	let customTo = $state(todayIsoDate());
	let openField = $state<'from' | 'to' | null>(null);
	let menuOpen = $state(false);

	let primaryYears = $derived(recentYears());
	let olderYears = $derived(years.filter((year) => !primaryYears.includes(year)));
	let selectedOlderYear = $derived(
		period.type === 'year' && !primaryYears.includes(period.year) ? period.year : null
	);
	let moreLabel = $derived(
		period.type === 'recent'
			? 'Last 3 years'
			: period.type === 'overall'
				? 'Overall'
				: selectedOlderYear != null
					? String(selectedOlderYear)
					: 'More'
	);
	let moreActive = $derived(
		period.type === 'recent' || period.type === 'overall' || selectedOlderYear != null
	);

	function selectCustom() {
		const from =
			period.type === 'custom'
				? period.from
				: `${primaryYears[0] ?? new Date().getFullYear()}-01-01`;
		const to = period.type === 'custom' ? period.to : todayIsoDate();
		customFrom = from;
		customTo = to;
		openField = null;
		menuOpen = false;
		onPeriod({ type: 'custom', from, to });
	}

	function applyRange() {
		const from = customFrom <= customTo ? customFrom : customTo;
		const to = customFrom <= customTo ? customTo : customFrom;
		customFrom = from;
		customTo = to;
		onPeriod({ type: 'custom', from, to });
	}

	function selectMore(next: PeriodSelection) {
		menuOpen = false;
		onPeriod(next);
	}

	function toggleMenu(event: MouseEvent) {
		event.stopPropagation();
		menuOpen = !menuOpen;
	}
</script>

<svelte:window
	onclick={() => (menuOpen = false)}
	onkeydown={(event) => event.key === 'Escape' && (menuOpen = false)}
/>

<div class="period-tabs" role="tablist" aria-label="History range">
	<div class="metric-more">
		<button
			class={['more-trigger', { active: moreActive, open: menuOpen }]}
			type="button"
			aria-haspopup="menu"
			aria-expanded={menuOpen}
			aria-label={moreLabel}
			onclick={toggleMenu}
		>
			<span class="more-label">{moreLabel}</span>
			<svg class="more-arrow" viewBox="0 0 12 12" aria-hidden="true">
				<path d="M2.5 4.5 L6 8 L9.5 4.5" fill="none" stroke="currentColor" stroke-linecap="round" />
			</svg>
		</button>
		{#if menuOpen}
			<div class="metric-menu" role="menu">
				<button
					class={{ active: period.type === 'recent' }}
					type="button"
					role="menuitem"
					onclick={(event) => {
						event.stopPropagation();
						selectMore({ type: 'recent' });
					}}
				>
					Last 3 years
				</button>
				<button
					class={{ active: period.type === 'overall' }}
					type="button"
					role="menuitem"
					onclick={(event) => {
						event.stopPropagation();
						selectMore({ type: 'overall' });
					}}
				>
					Overall
				</button>
				{#each olderYears as year (year)}
					<button
						class={{ active: period.type === 'year' && period.year === year }}
						type="button"
						role="menuitem"
						onclick={(event) => {
							event.stopPropagation();
							selectMore({ type: 'year', year });
						}}
					>
						{year}
					</button>
				{/each}
			</div>
		{/if}
	</div>
	{#if glp1StartedOn}
		<button
			class={{ active: period.type === 'glp1' }}
			type="button"
			role="tab"
			aria-selected={period.type === 'glp1'}
			onclick={() => {
				menuOpen = false;
				onPeriod({ type: 'glp1' });
			}}
		>
			Since GLP-1
		</button>
	{/if}
	{#each primaryYears as year (year)}
		<button
			class={{ active: period.type === 'year' && period.year === year }}
			type="button"
			role="tab"
			aria-selected={period.type === 'year' && period.year === year}
			onclick={() => {
				menuOpen = false;
				onPeriod({ type: 'year', year });
			}}
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

<style>
	.more-trigger {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		anchor-name: --period-more;
	}

	.more-arrow {
		width: 12px;
		height: 12px;
		flex: none;
		transition: transform 160ms ease;
	}

	.more-trigger.open .more-arrow {
		transform: rotate(180deg);
	}

	.metric-menu {
		left: 0;
		right: auto;
		max-width: calc(100vw - 24px);
	}

	@supports (anchor-name: --period-more) {
		.metric-menu {
			position: fixed;
			position-anchor: --period-more;
			position-area: bottom span-right;
			position-try-fallbacks: flip-inline;
			position-try: flip-inline;
			top: unset;
			right: unset;
			left: unset;
			margin-top: 8px;
		}
	}
</style>
