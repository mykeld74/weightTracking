<script lang="ts">
	import PhotoCropper from './PhotoCropper.svelte';
	import PhotoLightbox from './PhotoLightbox.svelte';
	import { formatDisplayDate, formatShortDate } from '$lib/tracking/dates';
	import {
		downloadPhoto,
		photoFileName,
		photoSrc,
		photoThumbSrc,
		photoViewLabels,
		photoViews,
		type PhotoDay,
		type PhotoMeta,
		type PhotoView
	} from '$lib/tracking/photos';

	let {
		days = [],
		initialDates = [],
		onSelectSession
	}: {
		days: PhotoDay[];
		initialDates?: string[];
		onSelectSession?: (date: string) => void;
	} = $props();

	type ViewFilter = 'all' | PhotoView;

	let selectedView = $state<ViewFilter>('all');
	function computeDefaultDates(allDays: PhotoDay[], init: string[]): string[] {
		if (init.length > 0) return init.slice(0, 4);
		if (allDays.length === 0) return [];
		if (allDays.length >= 4) {
			const chronological = [...allDays].sort((a, b) => a.recordedOn.localeCompare(b.recordedOn));
			const first = chronological[0].recordedOn;
			const last = chronological[chronological.length - 1].recordedOn;
			const idx1 = Math.floor(chronological.length / 3);
			const idx2 = Math.floor((chronological.length * 2) / 3);
			const set = new Set([
				first,
				chronological[idx1].recordedOn,
				chronological[idx2].recordedOn,
				last
			]);
			return Array.from(set).slice(0, 4);
		}
		if (allDays.length >= 2) {
			const chronological = [...allDays].sort((a, b) => a.recordedOn.localeCompare(b.recordedOn));
			return [chronological[0].recordedOn, chronological[chronological.length - 1].recordedOn];
		}
		return [allDays[0].recordedOn];
	}

	let selectedDates = $state<string[]>([]);

	$effect(() => {
		if (selectedDates.length === 0 && days.length > 0) {
			selectedDates = computeDefaultDates(days, initialDates);
		}
	});
	let lightbox = $state<{ src: string; label: string; recordedOn: string; view: PhotoView } | null>(
		null
	);
	let cropper = $state<{ src: string; label: string; recordedOn: string; view: PhotoView } | null>(
		null
	);
	let downloadingAll = $state(false);

	// Sorted in chronological order for clear progression
	let sortedSelectedDates = $derived([...selectedDates].sort((a, b) => a.localeCompare(b)));

	let selectedDayMap = $derived(new Map(days.map((d) => [d.recordedOn, d])));

	let availableDaysToAdd = $derived(days.filter((d) => !selectedDates.includes(d.recordedOn)));

	let earliestDate = $derived(sortedSelectedDates.length > 0 ? sortedSelectedDates[0] : '');

	function daysDiff(fromIso: string, toIso: string): number {
		const from = new Date(`${fromIso}T00:00:00`).getTime();
		const to = new Date(`${toIso}T00:00:00`).getTime();
		return Math.round((to - from) / (1000 * 60 * 60 * 24));
	}

	function deltaLabel(date: string): string {
		if (!earliestDate || date === earliestDate) return 'Base';
		const diff = daysDiff(earliestDate, date);
		if (diff === 0) return 'Base';
		return diff > 0 ? `+${diff}d` : `${diff}d`;
	}

	function addDate(date: string) {
		if (selectedDates.length >= 4 || selectedDates.includes(date)) return;
		selectedDates = [...selectedDates, date];
	}

	function removeDate(date: string) {
		selectedDates = selectedDates.filter((d) => d !== date);
	}

	function selectPreset(type: 'first-latest' | 'last-2' | 'last-3' | 'last-4') {
		const chronological = [...days].sort((a, b) => a.recordedOn.localeCompare(b.recordedOn));
		if (chronological.length === 0) return;

		if (type === 'first-latest') {
			if (chronological.length === 1) {
				selectedDates = [chronological[0].recordedOn];
			} else {
				selectedDates = [
					chronological[0].recordedOn,
					chronological[chronological.length - 1].recordedOn
				];
			}
		} else if (type === 'last-2') {
			selectedDates = chronological.slice(-2).map((d) => d.recordedOn);
		} else if (type === 'last-3') {
			selectedDates = chronological.slice(-3).map((d) => d.recordedOn);
		} else if (type === 'last-4') {
			selectedDates = chronological.slice(-4).map((d) => d.recordedOn);
		}
	}

	let visibleViews = $derived<PhotoView[]>(
		selectedView === 'all' ? [...photoViews] : [selectedView]
	);

	function openLightbox(photo: PhotoMeta, recordedOn: string, view: PhotoView) {
		lightbox = {
			src: photoSrc(photo),
			label: `${photoViewLabels[view]} · ${formatDisplayDate(recordedOn)}`,
			recordedOn,
			view
		};
	}

	function startCrop(photo: PhotoMeta, recordedOn: string, view: PhotoView) {
		lightbox = null;
		cropper = {
			src: photoSrc(photo),
			label: `${photoViewLabels[view]} (${formatShortDate(recordedOn, true)})`,
			recordedOn,
			view
		};
	}

	async function downloadAllInCompare() {
		if (downloadingAll || sortedSelectedDates.length === 0) return;
		downloadingAll = true;
		try {
			const toDownload: Array<{ src: string; filename: string }> = [];
			for (const date of sortedSelectedDates) {
				const day = selectedDayMap.get(date);
				if (!day) continue;
				for (const view of visibleViews) {
					const photo = day.photos[view];
					if (photo) {
						toDownload.push({
							src: photoSrc(photo),
							filename: photoFileName(date, view)
						});
					}
				}
			}

			for (let i = 0; i < toDownload.length; i += 1) {
				const item = toDownload[i];
				await downloadPhoto(item.src, item.filename);
				if (i < toDownload.length - 1) {
					await new Promise((resolve) => setTimeout(resolve, 250));
				}
			}
		} finally {
			downloadingAll = false;
		}
	}
</script>

<div class="compare-container">
	<!-- Control Header -->
	<div class="compare-header">
		<div class="header-left">
			<h3>Compare progress</h3>
			<p>Select up to 4 dates to compare angles and track changes over time.</p>
		</div>

		{#if sortedSelectedDates.length > 0}
			<button
				class="ghost-btn download-compare-btn"
				type="button"
				onclick={downloadAllInCompare}
				disabled={downloadingAll}
			>
				<svg viewBox="0 0 16 16" aria-hidden="true" class="icon">
					<path
						d="M8 2.5v7.5M4.5 7L8 10.5 11.5 7M3 13.5h10"
						fill="none"
						stroke="currentColor"
						stroke-width="1.7"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
				{downloadingAll ? 'Downloading…' : 'Download photos'}
			</button>
		{/if}
	</div>

	<!-- Date Selection & Presets -->
	<div class="date-selector-bar">
		<div class="active-dates-list">
			<span class="selector-label">Dates ({sortedSelectedDates.length}/4):</span>
			{#each sortedSelectedDates as date (date)}
				{@const day = selectedDayMap.get(date)}
				{@const thumb =
					day?.photos.front ?? day?.photos.left ?? day?.photos.right ?? day?.photos.back}
				<div class="date-chip">
					{#if thumb}
						<img src={photoThumbSrc(thumb)} alt="" class="chip-thumb" />
					{/if}
					<div class="chip-info">
						<span class="chip-date">{formatShortDate(date, true)}</span>
						<span class="chip-delta">{deltaLabel(date)}</span>
					</div>
					<button
						class="chip-remove"
						type="button"
						title="Remove date"
						aria-label="Remove {formatDisplayDate(date)}"
						onclick={() => removeDate(date)}
					>
						✕
					</button>
				</div>
			{/each}

			{#if selectedDates.length < 4 && availableDaysToAdd.length > 0}
				<div class="add-date-dropdown-wrap">
					<select
						class="add-date-select"
						aria-label="Add date to compare"
						onchange={(e) => {
							const val = (e.currentTarget as HTMLSelectElement).value;
							if (val) {
								addDate(val);
								e.currentTarget.value = '';
							}
						}}
					>
						<option value="">+ Add date ({4 - selectedDates.length} remaining)…</option>
						{#each availableDaysToAdd as day (day.recordedOn)}
							<option value={day.recordedOn}>
								{formatDisplayDate(day.recordedOn)} ({Object.keys(day.photos).length} photos)
							</option>
						{/each}
					</select>
				</div>
			{/if}
		</div>

		<!-- Presets -->
		{#if days.length >= 2}
			<div class="presets-row">
				<span class="presets-label">Presets:</span>
				<button class="chip" type="button" onclick={() => selectPreset('first-latest')}>
					First vs Latest
				</button>
				<button class="chip" type="button" onclick={() => selectPreset('last-2')}> Last 2 </button>
				{#if days.length >= 3}
					<button class="chip" type="button" onclick={() => selectPreset('last-3')}>
						Last 3
					</button>
				{/if}
				{#if days.length >= 4}
					<button class="chip" type="button" onclick={() => selectPreset('last-4')}>
						Last 4
					</button>
				{/if}
			</div>
		{/if}
	</div>

	<!-- View Filters (All / Front / Left / Right / Back) -->
	<div class="view-filter-bar">
		<div class="segmented-control" role="tablist" aria-label="Photo view filter">
			<button
				class={['segment-btn', selectedView === 'all' && 'active']}
				type="button"
				role="tab"
				aria-selected={selectedView === 'all'}
				onclick={() => (selectedView = 'all')}
			>
				All Views
			</button>
			{#each photoViews as v (v)}
				<button
					class={['segment-btn', selectedView === v && 'active']}
					type="button"
					role="tab"
					aria-selected={selectedView === v}
					onclick={() => (selectedView = v)}
				>
					{photoViewLabels[v]}
				</button>
			{/each}
		</div>
	</div>

	<!-- Side-by-Side Comparison Grid -->
	{#if sortedSelectedDates.length === 0}
		<div class="empty-state">
			<p>No dates selected for comparison. Please add at least 1 or 2 dates above.</p>
		</div>
	{:else}
		<div class="compare-table" style:--col-count={sortedSelectedDates.length}>
			<!-- Date Column Headers -->
			<div class="compare-row header-row">
				<div class="row-label-col"></div>
				<div class="columns-grid">
					{#each sortedSelectedDates as date (date)}
						<div class="col-header-cell">
							<div class="col-header-meta">
								<span class="col-date">{formatDisplayDate(date)}</span>
								<span class="col-badge">{deltaLabel(date)}</span>
							</div>
							{#if onSelectSession}
								<button
									class="session-link-btn"
									type="button"
									onclick={() => onSelectSession?.(date)}
									title="Open session in editor"
								>
									Open session
								</button>
							{/if}
						</div>
					{/each}
				</div>
			</div>

			<!-- Rows for each view -->
			{#each visibleViews as view (view)}
				<div class="compare-row view-row">
					<div class="row-label-col">
						<span class="view-title">{photoViewLabels[view]}</span>
					</div>

					<div class="columns-grid">
						{#each sortedSelectedDates as date (date)}
							{@const day = selectedDayMap.get(date)}
							{@const photo = day?.photos[view]}
							<div class="compare-cell">
								{#if photo}
									<div class="photo-card">
										<img
											src={photoSrc(photo)}
											alt="{photoViewLabels[view]} on {formatDisplayDate(date)}"
											loading="lazy"
										/>
										<div class="card-overlay">
											<button
												class="ghost-btn card-action-btn"
												type="button"
												title="View full size"
												onclick={() => openLightbox(photo, date, view)}
											>
												<svg viewBox="0 0 20 20" aria-hidden="true">
													<path
														d="M4 8V4h4 M16 8V4h-4 M4 12v4h4 M16 12v4h-4"
														fill="none"
														stroke="currentColor"
														stroke-width="1.8"
														stroke-linecap="round"
														stroke-linejoin="round"
													/>
												</svg>
												<span>View</span>
											</button>
											<button
												class="ghost-btn card-action-btn"
												type="button"
												title="Crop photo"
												onclick={() => startCrop(photo, date, view)}
											>
												<svg viewBox="0 0 20 20" aria-hidden="true">
													<path
														d="M6 2v12a2 2 0 0 0 2 2h10 M2 6h12a2 2 0 0 1 2 2v10"
														fill="none"
														stroke="currentColor"
														stroke-width="1.8"
														stroke-linecap="round"
														stroke-linejoin="round"
													/>
												</svg>
												<span>Crop</span>
											</button>
										</div>
									</div>
								{:else}
									<div class="missing-photo-slot">
										<span>No {photoViewLabels[view].toLowerCase()} photo</span>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Lightbox Modal -->
{#if lightbox}
	<PhotoLightbox
		src={lightbox.src}
		label={lightbox.label}
		filename={photoFileName(lightbox.recordedOn, lightbox.view)}
		onCrop={() => {
			const active = lightbox;
			if (active) {
				const day = selectedDayMap.get(active.recordedOn);
				const photo = day?.photos[active.view];
				if (photo) {
					startCrop(photo, active.recordedOn, active.view);
				}
			}
		}}
		onClose={() => (lightbox = null)}
	/>
{/if}

<!-- Cropper Modal -->
{#if cropper}
	<PhotoCropper
		src={cropper.src}
		label={cropper.label}
		recordedOn={cropper.recordedOn}
		view={cropper.view}
		onSave={async () => {
			cropper = null;
		}}
		onCancel={() => (cropper = null)}
	/>
{/if}

<style>
	.compare-container {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.compare-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 16px;
		flex-wrap: wrap;
	}

	.compare-header h3 {
		margin: 0;
		font-size: 1.15rem;
		font-weight: 600;
	}

	.compare-header p {
		margin: 3px 0 0;
		font-size: 0.86rem;
		color: var(--ink-soft);
	}

	.download-compare-btn {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-size: 0.86rem;
		padding: 6px 14px;
	}

	.icon {
		width: 14px;
		height: 14px;
	}

	.date-selector-bar {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 12px 14px;
		background: color-mix(in srgb, var(--bg) 60%, transparent);
		border: 1px solid var(--line);
		border-radius: 12px;
	}

	.active-dates-list {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}

	.selector-label,
	.presets-label {
		font-size: 0.82rem;
		font-weight: 500;
		color: var(--ink-soft);
	}

	.date-chip {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 4px 8px 4px 6px;
		background: var(--bg-elev);
		border: 1px solid var(--line-strong);
		border-radius: 999px;
		font-size: 0.82rem;
	}

	.chip-thumb {
		width: 20px;
		height: 20px;
		border-radius: 50%;
		object-fit: cover;
	}

	.chip-info {
		display: flex;
		align-items: baseline;
		gap: 4px;
	}

	.chip-date {
		font-weight: 500;
	}

	.chip-delta {
		font-size: 0.74rem;
		color: var(--accent);
		font-weight: 600;
	}

	.chip-remove {
		border: 0;
		background: transparent;
		color: var(--ink-soft);
		font-size: 0.76rem;
		padding: 2px 4px;
		cursor: pointer;
		border-radius: 50%;
		display: grid;
		place-items: center;
		transition: color 0.15s;
	}

	.chip-remove:hover {
		color: var(--ink);
	}

	.add-date-select {
		background: var(--bg-elev);
		border: 1px dashed var(--line-strong);
		border-radius: 999px;
		color: var(--ink);
		font-size: 0.82rem;
		padding: 4px 10px;
		cursor: pointer;
	}

	.add-date-select:hover {
		border-color: var(--accent);
	}

	.presets-row {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-wrap: wrap;
	}

	.presets-row .chip {
		padding: 3px 10px;
		font-size: 0.78rem;
		border-radius: 999px;
	}

	.view-filter-bar {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.segmented-control {
		display: inline-flex;
		background: var(--bg);
		border: 1px solid var(--line);
		border-radius: 10px;
		padding: 3px;
		gap: 2px;
		overflow-x: auto;
		max-width: 100%;
	}

	.segment-btn {
		border: 0;
		background: transparent;
		color: var(--ink-soft);
		padding: 5px 12px;
		font-size: 0.82rem;
		border-radius: 7px;
		cursor: pointer;
		white-space: nowrap;
		transition:
			background 0.15s,
			color 0.15s;
	}

	.segment-btn:hover {
		color: var(--ink);
	}

	.segment-btn.active {
		background: var(--bg-elev);
		color: var(--ink);
		font-weight: 500;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
	}

	.compare-table {
		display: flex;
		flex-direction: column;
		gap: 14px;
		overflow-x: auto;
		padding-bottom: 8px;
	}

	.compare-row {
		display: grid;
		grid-template-columns: 100px 1fr;
		gap: 12px;
		align-items: start;
	}

	.header-row {
		align-items: end;
	}

	.row-label-col {
		padding-top: 6px;
	}

	.view-title {
		font-size: 0.88rem;
		font-weight: 600;
		color: var(--ink-soft);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.columns-grid {
		display: grid;
		grid-template-columns: repeat(var(--col-count, 2), minmax(180px, 1fr));
		gap: 12px;
	}

	.col-header-cell {
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding-bottom: 6px;
		border-bottom: 1px solid var(--line);
	}

	.col-header-meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 6px;
	}

	.col-date {
		font-size: 0.92rem;
		font-weight: 600;
	}

	.col-badge {
		font-size: 0.76rem;
		padding: 2px 7px;
		background: color-mix(in srgb, var(--accent) 15%, transparent);
		color: var(--accent);
		border-radius: 999px;
		font-weight: 600;
	}

	.session-link-btn {
		align-self: flex-start;
		border: 0;
		background: transparent;
		color: var(--ink-soft);
		font-size: 0.76rem;
		padding: 0;
		cursor: pointer;
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.session-link-btn:hover {
		color: var(--ink);
	}

	.photo-card {
		position: relative;
		border-radius: 12px;
		overflow: hidden;
		aspect-ratio: 3 / 4;
		background: #000;
		border: 1px solid var(--line);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
	}

	.photo-card img {
		width: 100%;
		height: 100%;
		object-fit: contain;
		display: block;
		transition: transform 0.2s ease;
	}

	.card-overlay {
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		opacity: 0;
		transition: opacity 0.18s ease;
	}

	.photo-card:hover .card-overlay,
	.photo-card:focus-within .card-overlay {
		opacity: 1;
	}

	.card-action-btn {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 6px 10px;
		font-size: 0.8rem;
		background: rgba(22, 24, 29, 0.85);
		backdrop-filter: blur(8px);
		border-radius: 999px;
	}

	.card-action-btn svg {
		width: 13px;
		height: 13px;
	}

	.missing-photo-slot {
		aspect-ratio: 3 / 4;
		border: 1px dashed var(--line);
		border-radius: 12px;
		display: grid;
		place-items: center;
		color: var(--ink-soft);
		font-size: 0.8rem;
		text-align: center;
		padding: 12px;
		background: color-mix(in srgb, var(--bg) 40%, transparent);
	}

	.empty-state {
		padding: 32px 16px;
		text-align: center;
		color: var(--ink-soft);
		font-size: 0.9rem;
	}

	@media (max-width: 768px) {
		.compare-row {
			grid-template-columns: 1fr;
			gap: 6px;
		}

		.row-label-col {
			padding-top: 0;
		}

		.columns-grid {
			grid-template-columns: repeat(var(--col-count, 2), minmax(140px, 1fr));
		}
	}
</style>
