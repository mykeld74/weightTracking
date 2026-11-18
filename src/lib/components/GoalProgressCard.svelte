<script lang="ts">
	import { resolve } from '$app/paths';
	import { formatDisplayDate } from '$lib/tracking/dates';
	import { computeGoalProgress } from '$lib/tracking/stats';

	let {
		currentWeight,
		targetWeight,
		weeklyChange
	}: {
		currentWeight: number | null;
		targetWeight: number | null;
		weeklyChange: number | null;
	} = $props();

	let progress = $derived(
		currentWeight != null && targetWeight != null
			? computeGoalProgress(currentWeight, targetWeight, weeklyChange)
			: null
	);

	function signedLbs(value: number) {
		const formatted = Math.abs(value).toFixed(1);
		if (value > 0) return `+${formatted}`;
		if (value < 0) return `−${formatted}`;
		return formatted;
	}
</script>

{#if targetWeight == null}
	<section class="goal-bar empty">
		<span class="eyebrow">Goal</span>
		<p>
			Set a target weight in
			<a href={resolve('/profile')}>Profile</a>
			to track distance and ETA.
		</p>
	</section>
{:else if currentWeight == null || !progress}
	<section class="goal-bar empty">
		<span class="eyebrow">Goal</span>
		<p>Log a weight to see progress toward {targetWeight.toFixed(1)} lbs.</p>
	</section>
{:else}
	<section class={['goal-bar', progress.reached ? 'reached' : progress.direction]}>
		<span class="eyebrow">Goal</span>
		<strong class="numeric range"
			>{progress.currentWeight.toFixed(1)} → {progress.targetWeight.toFixed(1)} lbs</strong
		>
		<span class="sep" aria-hidden="true"></span>
		<div class="stat">
			<span>Remaining</span>
			<strong class="numeric"
				>{progress.reached ? 'At goal' : `${signedLbs(progress.remainingLbs)} lbs`}</strong
			>
		</div>
		<span class="sep" aria-hidden="true"></span>
		<div class="stat">
			<span>ETA</span>
			<strong>
				{#if progress.reached}
					Now
				{:else if progress.etaDate && progress.weeksRemaining != null}
					{formatDisplayDate(progress.etaDate)}
					<small>~{progress.weeksRemaining.toFixed(1)} wk</small>
				{:else if weeklyChange == null}
					Need 2+ weigh-ins
				{:else}
					Not toward goal
				{/if}
			</strong>
		</div>
	</section>
{/if}

<style>
	.goal-bar {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 8px 16px;
		background: var(--bg-elev);
		border-radius: 12px;
		padding: 10px 16px;
		margin-bottom: 14px;
		border: 1px solid var(--line);
	}

	.goal-bar.empty {
		align-items: center;
	}

	.goal-bar.empty p {
		margin: 0;
		color: var(--ink-soft);
		font-size: 0.9rem;
	}

	.goal-bar.empty a {
		color: var(--sage-deep);
		text-decoration: underline;
		text-decoration-color: color-mix(in srgb, var(--accent) 45%, transparent);
		text-underline-offset: 2px;
	}

	.goal-bar.empty a:hover {
		color: var(--accent);
	}

	.eyebrow {
		font-size: 0.68rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--ink-soft);
		flex: none;
	}

	.range {
		font-size: 1.05rem;
		font-weight: 700;
		letter-spacing: -0.02em;
		font-family: 'Figtree', system-ui, sans-serif;
	}

	.sep {
		width: 1px;
		align-self: stretch;
		min-height: 1.4em;
		background: var(--line);
		flex: none;
	}

	.stat {
		display: flex;
		align-items: baseline;
		gap: 8px;
		min-width: 0;
	}

	.stat > span {
		font-size: 0.68rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--ink-soft);
	}

	.stat strong {
		font-size: 0.98rem;
		font-weight: 600;
		white-space: nowrap;
	}

	.stat small {
		margin-left: 6px;
		font-size: 0.82rem;
		font-weight: 500;
		color: var(--ink-soft);
	}

	.goal-bar.loss .stat strong {
		color: var(--teal);
	}

	.goal-bar.gain .stat strong {
		color: var(--accent);
	}

	.goal-bar.reached .stat strong {
		color: var(--teal);
	}

	@media (max-width: 720px) {
		.sep {
			display: none;
		}

		.goal-bar {
			gap: 6px 14px;
		}
	}
</style>
