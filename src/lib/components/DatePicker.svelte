<script lang="ts">
	import { formatDisplayDate, monthCells, shiftMonth, todayIsoDate } from '$lib/tracking/dates';

	let {
		value = $bindable(),
		label,
		rangeFrom,
		rangeTo,
		open,
		onOpen,
		onClose,
		onSelect
	}: {
		value: string;
		label: string;
		rangeFrom?: string;
		rangeTo?: string;
		open: boolean;
		onOpen: () => void;
		onClose: () => void;
		onSelect?: (next: string) => void;
	} = $props();

	const weekdayLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
	const monthNames = Array.from({ length: 12 }, (_, index) =>
		new Date(2000, index, 1).toLocaleDateString(undefined, { month: 'short' })
	);
	const today = todayIsoDate();

	let viewYear = $state(new Date().getFullYear());
	let viewMonth = $state(new Date().getMonth() + 1);
	let viewMode = $state<'days' | 'months' | 'years'>('days');
	let cells = $derived(monthCells(viewYear, viewMonth));
	let monthName = $derived(
		new Date(viewYear, viewMonth - 1, 1).toLocaleDateString(undefined, { month: 'long' })
	);
	let yearBlockStart = $derived(Math.floor(viewYear / 12) * 12);
	let yearChoices = $derived(Array.from({ length: 12 }, (_, index) => yearBlockStart + index));
	let rangeStart = $derived(rangeFrom ?? value);
	let rangeEnd = $derived(rangeTo ?? value);

	function toggle(event: MouseEvent) {
		event.stopPropagation();
		if (open) {
			onClose();
			return;
		}
		const [year, month] = value.split('-').map(Number);
		viewYear = year;
		viewMonth = month;
		viewMode = 'days';
		onOpen();
	}

	function pick(iso: string) {
		value = iso;
		onSelect?.(iso);
		onClose();
	}

	function pickMonth(month: number) {
		viewMonth = month;
		viewMode = 'days';
	}

	function pickYear(year: number) {
		viewYear = year;
		viewMode = 'months';
	}

	function step(delta: number, event: MouseEvent) {
		event.stopPropagation();
		if (viewMode === 'years') {
			viewYear += delta * 12;
			return;
		}
		if (viewMode === 'months') {
			viewYear += delta;
			return;
		}
		const next = shiftMonth(viewYear, viewMonth, delta);
		viewYear = next.year;
		viewMonth = next.month;
	}

	function onWindowKey(event: KeyboardEvent) {
		if (event.key !== 'Escape') return;
		if (viewMode !== 'days') {
			viewMode = 'days';
			return;
		}
		onClose();
	}

	function dayClass(iso: string, inMonth: boolean) {
		const inRange = iso >= rangeStart && iso <= rangeEnd;
		return {
			muted: !inMonth,
			today: iso === today,
			selected: iso === value,
			range: inRange && iso !== value
		};
	}
</script>

<svelte:window onclick={onClose} onkeydown={onWindowKey} />

<div class="date-picker">
	<span class="field-label">{label}</span>
	<button
		class="date-trigger"
		type="button"
		aria-haspopup="dialog"
		aria-expanded={open}
		onclick={toggle}
	>
		{formatDisplayDate(value)}
		<svg viewBox="0 0 20 20" aria-hidden="true">
			<rect x="3" y="4.5" width="14" height="12.5" rx="2.5" fill="none" stroke="currentColor" />
			<path d="M3 8h14" fill="none" stroke="currentColor" />
			<path d="M7 3v3M13 3v3" fill="none" stroke="currentColor" stroke-linecap="round" />
		</svg>
	</button>
	{#if open}
		<div
			class="date-panel"
			role="dialog"
			tabindex="-1"
			aria-label="{label} calendar"
			onclick={(event) => event.stopPropagation()}
			onkeydown={(event) => event.stopPropagation()}
		>
			<div class="date-head">
				<button class="ghost-btn nav-btn" type="button" onclick={(event) => step(-1, event)}>
					‹
				</button>
				<div class="date-title">
					{#if viewMode === 'days'}
						<button class="title-btn" type="button" onclick={() => (viewMode = 'months')}>
							{monthName}
						</button>
						<button class="title-btn" type="button" onclick={() => (viewMode = 'years')}>
							{viewYear}
						</button>
					{:else if viewMode === 'months'}
						<button class="title-btn" type="button" onclick={() => (viewMode = 'years')}>
							{viewYear}
						</button>
					{:else}
						<strong>{yearChoices[0]} – {yearChoices[11]}</strong>
					{/if}
				</div>
				<button class="ghost-btn nav-btn" type="button" onclick={(event) => step(1, event)}>
					›
				</button>
			</div>
			{#if viewMode === 'years'}
				<div class="choice-grid">
					{#each yearChoices as year (year)}
						<button
							class={{ selected: year === viewYear }}
							type="button"
							onclick={() => pickYear(year)}
						>
							{year}
						</button>
					{/each}
				</div>
			{:else if viewMode === 'months'}
				<div class="choice-grid">
					{#each monthNames as name, index (name)}
						<button
							class={{ selected: index + 1 === viewMonth }}
							type="button"
							onclick={() => pickMonth(index + 1)}
						>
							{name}
						</button>
					{/each}
				</div>
			{:else}
				<div class="weekday-row">
					{#each weekdayLabels as weekday (weekday)}
						<span>{weekday}</span>
					{/each}
				</div>
				<div class="day-grid">
					{#each cells as cell (cell.iso)}
						<button
							class={dayClass(cell.iso, cell.inMonth)}
							type="button"
							onclick={() => pick(cell.iso)}
						>
							{Number(cell.iso.slice(8))}
						</button>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.date-picker {
		position: relative;
		min-width: 180px;
	}

	.field-label {
		display: block;
		margin-bottom: 6px;
		font-size: 0.86rem;
		color: var(--ink-soft);
	}

	.date-trigger {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		width: 100%;
		border: 1px solid var(--line-strong);
		background: var(--bg);
		border-radius: 12px;
		padding: 10px 12px;
		color: var(--ink);
		cursor: pointer;
		text-align: left;
	}

	.date-trigger:hover,
	.date-trigger[aria-expanded='true'] {
		border-color: var(--accent);
	}

	.date-trigger svg {
		width: 18px;
		height: 18px;
		flex: none;
		color: var(--ink-soft);
	}

	.date-panel {
		position: absolute;
		top: calc(100% + 8px);
		left: 0;
		z-index: 12;
		width: 280px;
		padding: 12px;
		background: var(--bg-elev);
		border: 1px solid var(--line-strong);
		border-radius: 14px;
		box-shadow: 0 16px 40px rgba(0, 0, 0, 0.35);
	}

	.date-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		margin-bottom: 10px;
	}

	.date-head strong {
		font-size: 0.95rem;
		font-weight: 600;
	}

	.date-title {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 2px;
	}

	.title-btn {
		appearance: none;
		background: none;
		border: 0;
		border-radius: 8px;
		padding: 4px 8px;
		color: var(--ink);
		cursor: pointer;
		font: inherit;
		font-size: 0.95rem;
		font-weight: 600;
	}

	.title-btn:hover {
		background: rgba(255, 255, 255, 0.06);
	}

	.choice-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 4px;
	}

	.choice-grid button {
		appearance: none;
		border: 0;
		background: transparent;
		border-radius: 10px;
		height: 40px;
		color: var(--ink);
		cursor: pointer;
		font: inherit;
		font-size: 0.9rem;
	}

	.choice-grid button:hover {
		background: rgba(255, 255, 255, 0.06);
	}

	.choice-grid button.selected {
		background: var(--accent);
		color: var(--accent-text);
		font-weight: 600;
	}

	.nav-btn {
		width: 32px;
		height: 32px;
		padding: 0;
		border-radius: 10px;
		font-size: 1.2rem;
		line-height: 1;
	}

	.weekday-row,
	.day-grid {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 2px;
	}

	.weekday-row span {
		padding: 4px 0 8px;
		color: var(--ink-soft);
		font-size: 0.72rem;
		text-align: center;
		letter-spacing: 0.04em;
	}

	.day-grid button {
		appearance: none;
		border: 0;
		background: transparent;
		border-radius: 9px;
		height: 34px;
		color: var(--ink);
		cursor: pointer;
		font: inherit;
		font-size: 0.86rem;
	}

	.day-grid button:hover {
		background: rgba(255, 255, 255, 0.06);
	}

	.day-grid button.muted {
		color: var(--ink-soft);
		opacity: 0.55;
	}

	.day-grid button.range {
		background: var(--accent-soft);
		color: var(--ink);
	}

	.day-grid button.today:not(.selected) {
		box-shadow: inset 0 0 0 1px var(--line-strong);
	}

	.day-grid button.selected {
		background: var(--accent);
		color: var(--accent-text);
		font-weight: 600;
	}
</style>
