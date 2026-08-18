<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import PhotoGrid from '$lib/components/PhotoGrid.svelte';
	import DatePicker from '$lib/components/DatePicker.svelte';
	import { formatDisplayDate } from '$lib/tracking/dates';
	import {
		compositionFields,
		formatFieldValue,
		measurementFields,
		type FieldDef
	} from '$lib/tracking/fields';
	import { photoThumbSrc, type PhotoDay } from '$lib/tracking/photos';
	import type { ActionData, PageServerData } from './$types';

	let { data, form }: { data: PageServerData; form: ActionData } = $props();

	let calendarOpen = $state(false);
	let recordedOn = $derived(data.selectedDate);
	let selectedDay = $derived(data.days.find((day) => day.recordedOn === recordedOn));
	let composition = $derived(data.composition);
	let measurement = $derived(data.measurement);

	// The server only sends the selected day's stats, so changing days is a
	// navigation rather than local state.
	function selectDate(next: string) {
		if (next === recordedOn) return;
		const target = new URL(page.url);
		target.searchParams.set('date', next);
		// resolve() only describes pathnames, so the rule can't express "same
		// route, different query string" — which is exactly what this is.
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto(target, { replaceState: true, noScroll: true, keepFocus: true });
	}

	function filledFields(
		entry: Record<string, unknown> | null | undefined,
		fields: readonly FieldDef[]
	) {
		if (!entry) return [];
		return fields.flatMap((field) => {
			const value = entry[field.key];
			if (typeof value !== 'number' || !Number.isFinite(value)) return [];
			return [{ field, value }];
		});
	}

	let compositionStats = $derived(filledFields(composition, compositionFields));
	let measurementStats = $derived(filledFields(measurement, measurementFields));
	let hasStats = $derived(compositionStats.length > 0 || measurementStats.length > 0);

	function dayThumb(day: PhotoDay): string | undefined {
		const photo = day.photos.front ?? day.photos.left ?? day.photos.right ?? day.photos.back;
		return photo ? photoThumbSrc(photo) : undefined;
	}

	function viewCount(day: PhotoDay): number {
		return Object.keys(day.photos).length;
	}
</script>

<svelte:head>
	<title>Body Ledger · Photos</title>
</svelte:head>

<div class="page-grid">
	<section class="card">
		<div class="section-head">
			<div>
				<h2>Progress photos</h2>
				<p>Choose a file or take a photo for each view. Saving the same view replaces it.</p>
			</div>
		</div>
		<div class="form-row">
			<DatePicker
				label="Date"
				value={recordedOn}
				open={calendarOpen}
				onOpen={() => (calendarOpen = true)}
				onClose={() => (calendarOpen = false)}
				onSelect={selectDate}
			/>
			{#if selectedDay}
				<form method="post" action="?/removeDay">
					<input type="hidden" name="recordedOn" value={recordedOn} />
					<button class="ghost-btn" type="submit">Remove this day</button>
				</form>
			{/if}
		</div>
		<PhotoGrid {recordedOn} photos={selectedDay?.photos ?? {}} message={form?.message} />
	</section>

	<div class="photos-split">
		<section class="card">
			<div class="section-head">
				<div>
					<h2>{formatDisplayDate(recordedOn)}</h2>
					<p>Logged composition and measurements for this day.</p>
				</div>
			</div>
			{#if !hasStats}
				<p class="empty">No composition or measurements logged for this day.</p>
			{:else}
				{#if compositionStats.length > 0}
					<h3>Composition</h3>
					<dl class="stat-list">
						{#each compositionStats as item (item.field.key)}
							<div>
								<dt>{item.field.label}</dt>
								<dd class="numeric">{formatFieldValue(item.value, item.field)}</dd>
							</div>
						{/each}
					</dl>
				{/if}
				{#if measurementStats.length > 0}
					<h3>Measurements</h3>
					<dl class="stat-list">
						{#each measurementStats as item (item.field.key)}
							<div>
								<dt>{item.field.label}</dt>
								<dd class="numeric">{formatFieldValue(item.value, item.field)}</dd>
							</div>
						{/each}
					</dl>
				{/if}
			{/if}
		</section>

		<section class="card">
			<div class="section-head">
				<div>
					<h2>Sessions</h2>
					<p>{data.days.length} day{data.days.length === 1 ? '' : 's'} with photos</p>
				</div>
			</div>
			{#if data.days.length === 0}
				<p class="empty">No photo sessions yet.</p>
			{:else}
				<ul class="session-list">
					{#each data.days as day (day.recordedOn)}
						{@const thumb = dayThumb(day)}
						<li>
							<button
								class={{ active: day.recordedOn === recordedOn }}
								type="button"
								onclick={() => selectDate(day.recordedOn)}
							>
								{#if thumb}
									<img src={thumb} alt="" width="44" height="58" loading="lazy" decoding="async" />
								{:else}
									<span class="thumb-blank"></span>
								{/if}
								<span>
									<strong>{formatDisplayDate(day.recordedOn)}</strong>
									<small>{viewCount(day)} view{viewCount(day) === 1 ? '' : 's'}</small>
								</span>
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	</div>
</div>

<style>
	h3 {
		margin: 0 0 10px;
		font-size: 0.72rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--ink-soft);
	}

	h3:not(:first-child) {
		margin-top: 22px;
	}

	.photos-split {
		display: grid;
		grid-template-columns: minmax(0, 1.4fr) minmax(260px, 0.8fr);
		gap: 18px;
	}

	.stat-list {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
		gap: 10px 16px;
		margin: 0;
	}

	.stat-list div {
		display: grid;
		gap: 2px;
	}

	.stat-list dt {
		font-size: 0.78rem;
		color: var(--ink-soft);
	}

	.stat-list dd {
		margin: 0;
		font-size: 1.15rem;
		font-weight: 650;
	}

	.session-list {
		list-style: none;
		display: grid;
		gap: 8px;
		margin: 0;
		padding: 0;
		max-height: 540px;
		overflow: auto;
	}

	.session-list button {
		display: flex;
		align-items: center;
		gap: 12px;
		width: 100%;
		padding: 8px;
		border: 1px solid transparent;
		border-radius: 12px;
		background: transparent;
		color: inherit;
		text-align: left;
		cursor: pointer;
	}

	.session-list button:hover,
	.session-list button.active {
		background: var(--bg);
		border-color: var(--line);
	}

	.session-list button.active {
		border-color: color-mix(in srgb, var(--accent) 55%, transparent);
	}

	.session-list img,
	.thumb-blank {
		width: 44px;
		height: 58px;
		border-radius: 8px;
		object-fit: cover;
		background: var(--bg);
		flex: none;
	}

	.session-list span {
		display: grid;
		gap: 2px;
	}

	.session-list strong {
		font-size: 0.95rem;
	}

	.session-list small {
		color: var(--ink-soft);
	}

	@media (max-width: 900px) {
		.photos-split {
			grid-template-columns: 1fr;
		}
	}
</style>
