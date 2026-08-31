<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import PhotoGrid from '$lib/components/PhotoGrid.svelte';
	import PhotoCompare from '$lib/components/PhotoCompare.svelte';
	import DatePicker from '$lib/components/DatePicker.svelte';
	import {
		compositionFields,
		formatFieldValue,
		measurementFields,
		type FieldDef
	} from '$lib/tracking/fields';
	import {
		downloadPhoto,
		photoFileName,
		photoSrc,
		photoThumbSrc,
		type PhotoDay,
		type PhotoMeta,
		type PhotoView
	} from '$lib/tracking/photos';
	import { formatDisplayDate, isIsoDate, todayIsoDate } from '$lib/tracking/dates';
	import { browser } from '$app/environment';
	import Skeleton from '$lib/components/Skeleton.svelte';
	import { asyncData } from '$lib/client/asyncData.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let calendarOpen = $state(false);
	let downloadingDay = $state(false);
	let activeTab = $state<'session' | 'compare'>(
		page.url.searchParams.get('mode') === 'compare' ? 'compare' : 'session'
	);

	function setTab(tab: 'session' | 'compare') {
		activeTab = tab;
		const target = new URL(page.url);
		if (tab === 'compare') {
			target.searchParams.set('mode', 'compare');
		} else {
			target.searchParams.delete('mode');
		}
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto(target, { replaceState: true, noScroll: true, keepFocus: true });
	}

	function openSessionFromCompare(date: string) {
		selectDate(date);
		setTab('session');
	}

	const photoDays = asyncData(
		() => `photo-days:${data.user.id}`,
		() => data.photoDays
	);
	let days = $derived(photoDays.current ?? []);

	// The day comes from the URL so refresh and back still work; when it is
	// absent we fall back to the most recent session once the list arrives.
	let requestedDate = $derived(page.url.searchParams.get('date'));
	let recordedOn = $derived(
		requestedDate && isIsoDate(requestedDate)
			? requestedDate
			: (days[0]?.recordedOn ?? todayIsoDate())
	);
	let selectedDay = $derived(days.find((day) => day.recordedOn === recordedOn));

	// Re-created whenever the day changes, which is exactly when new stats are
	// needed. The page load never reads ?date=, so switching days costs one
	// small request and no navigation work.
	let statsRequest = $derived(
		browser
			? fetch(`/api/photos/day?date=${encodeURIComponent(recordedOn)}`).then(async (res) => {
					if (!res.ok) throw new Error('Could not load that day.');
					return res.json() as Promise<{
						composition: Record<string, unknown> | null;
						measurement: Record<string, unknown> | null;
					}>;
				})
			: undefined
	);
	const dayStats = asyncData(
		() => `photo-day:${data.user.id}:${recordedOn}`,
		() => statsRequest
	);
	let composition = $derived(dayStats.current?.composition ?? null);
	let measurement = $derived(dayStats.current?.measurement ?? null);

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

	async function downloadAllPhotosForDay() {
		if (!selectedDay || downloadingDay) return;
		downloadingDay = true;
		try {
			const entries = Object.entries(selectedDay.photos) as Array<[PhotoView, PhotoMeta]>;
			for (let i = 0; i < entries.length; i += 1) {
				const [view, photo] = entries[i];
				if (!photo) continue;
				await downloadPhoto(photoSrc(photo), photoFileName(recordedOn, view));
				if (i < entries.length - 1) {
					await new Promise((resolve) => setTimeout(resolve, 250));
				}
			}
		} finally {
			downloadingDay = false;
		}
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
				<p>
					{#if activeTab === 'session'}
						Choose a file or take a photo for each view. Saving the same view replaces it.
					{:else}
						Compare photos across up to 4 dates side-by-side to track changes over time.
					{/if}
				</p>
			</div>
			<div class="mode-tabs" role="tablist" aria-label="Photos view mode">
				<button
					class={['chip mode-chip', activeTab === 'session' && 'active']}
					type="button"
					role="tab"
					aria-selected={activeTab === 'session'}
					onclick={() => setTab('session')}
				>
					Session view
				</button>
				<button
					class={['chip mode-chip', activeTab === 'compare' && 'active']}
					type="button"
					role="tab"
					aria-selected={activeTab === 'compare'}
					onclick={() => setTab('compare')}
				>
					Compare {days.length >= 2 ? `(${Math.min(4, days.length)})` : ''}
				</button>
			</div>
		</div>

		{#if activeTab === 'session'}
			<div class="form-row">
				<DatePicker
					label="Date"
					value={recordedOn}
					open={calendarOpen}
					onOpen={() => (calendarOpen = true)}
					onClose={() => (calendarOpen = false)}
					onSelect={selectDate}
				/>
				{#if selectedDay && viewCount(selectedDay) > 0}
					<button
						class="ghost-btn"
						type="button"
						onclick={downloadAllPhotosForDay}
						disabled={downloadingDay}
					>
						{downloadingDay ? 'Downloading…' : 'Download all'}
					</button>
				{/if}
				{#if selectedDay}
					<form method="post" action="?/removeDay">
						<input type="hidden" name="recordedOn" value={recordedOn} />
						<button class="ghost-btn" type="submit">Remove this day</button>
					</form>
				{/if}
			</div>
			<PhotoGrid {recordedOn} photos={selectedDay?.photos ?? {}} message={form?.message} />
		{:else}
			<PhotoCompare {days} onSelectSession={openSessionFromCompare} />
		{/if}
	</section>

	<div class="photos-split">
		<section class="card">
			<div class="section-head">
				<div>
					<h2>{formatDisplayDate(recordedOn)}</h2>
					<p>Logged composition and measurements for this day.</p>
				</div>
			</div>
			{#if !dayStats.current && !dayStats.error}
				<div class="stat-skeleton">
					<Skeleton height="18px" width="60%" />
					<Skeleton height="18px" width="45%" />
					<Skeleton height="18px" width="52%" />
				</div>
			{:else if dayStats.error}
				<p class="flash">{dayStats.error}</p>
			{:else if !hasStats}
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
					<p>
						{#if photoDays.current}
							{days.length} day{days.length === 1 ? '' : 's'} with photos
						{:else}
							Loading your sessions…
						{/if}
					</p>
				</div>
				{#if days.length >= 2}
					<button
						class="ghost-btn session-compare-btn"
						type="button"
						onclick={() => setTab('compare')}
					>
						Compare
					</button>
				{/if}
			</div>
			{#if !photoDays.current && !photoDays.error}
				<div class="session-skeleton">
					{#each { length: 4 }, row (row)}
						<Skeleton height="58px" />
					{/each}
				</div>
			{:else if photoDays.error}
				<p class="flash">{photoDays.error}</p>
			{:else if days.length === 0}
				<p class="empty">No photo sessions yet.</p>
			{:else}
				<ul class="session-list">
					{#each days as day (day.recordedOn)}
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
	.mode-tabs {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.mode-chip {
		font-size: 0.84rem;
		padding: 5px 14px;
	}

	.session-compare-btn {
		font-size: 0.8rem;
		padding: 4px 10px;
	}

	.stat-skeleton,
	.session-skeleton {
		display: grid;
		gap: 10px;
	}

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
