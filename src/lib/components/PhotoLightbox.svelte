<script lang="ts">
	import { cubicOut } from 'svelte/easing';
	import { prefersReducedMotion } from 'svelte/motion';
	import { fade, scale } from 'svelte/transition';
	import {
		alignGhostToCurrent,
		canDetectFaces,
		containRect,
		detectPrimaryFace,
		loadHtmlImage,
		manualGhostPlacement,
		type AlignTransform,
		type FaceBox
	} from '$lib/tracking/photoAlign';
	import { downloadPhoto } from '$lib/tracking/photos';

	let {
		src,
		label,
		filename = `${label.toLowerCase().replace(/\s+/g, '-')}.jpg`,
		ghostSrc = null,
		ghostLabel = 'Previous',
		onCrop,
		onClose
	}: {
		src: string;
		label: string;
		filename?: string;
		ghostSrc?: string | null;
		ghostLabel?: string;
		onCrop?: () => void;
		onClose: () => void;
	} = $props();

	let duration = $derived(prefersReducedMotion.current ? 0 : 280);
	let downloading = $state(false);
	let overlayOn = $state(true);
	/** 0 = only previous, 1 = only current. */
	let blend = $state(0.45);
	let ghostFailed = $state(false);
	let alignStatus = $state<'idle' | 'aligning' | 'aligned' | 'manual' | 'failed'>('idle');
	let scaleAdjust = $state(1);
	let offsetX = $state(0);
	let offsetY = $state(0);
	let stageEl = $state<HTMLDivElement | null>(null);
	let stageSize = $state({ width: 720, height: 640 });
	let currentNatural = $state({ width: 0, height: 0 });
	let ghostNatural = $state({ width: 0, height: 0 });
	let currentFace = $state<FaceBox | null>(null);
	let ghostFace = $state<FaceBox | null>(null);
	let loadedPair = $state<string | null>(null);

	let showOverlay = $derived(Boolean(ghostSrc) && overlayOn && !ghostFailed);
	let pairKey = $derived(`${src}::${ghostSrc ?? ''}`);

	let ghostPlacement = $derived.by((): AlignTransform | null => {
		if (!showOverlay || !ghostNatural.width) return null;

		if (currentFace && ghostFace && currentNatural.width) {
			return alignGhostToCurrent({
				stageWidth: stageSize.width,
				stageHeight: stageSize.height,
				currentWidth: currentNatural.width,
				currentHeight: currentNatural.height,
				currentFace,
				ghostWidth: ghostNatural.width,
				ghostHeight: ghostNatural.height,
				ghostFace,
				scaleAdjust,
				offsetX,
				offsetY
			});
		}

		return manualGhostPlacement({
			stageWidth: stageSize.width,
			stageHeight: stageSize.height,
			ghostWidth: ghostNatural.width,
			ghostHeight: ghostNatural.height,
			scaleAdjust,
			offsetX,
			offsetY
		});
	});

	let currentPlacement = $derived(
		currentNatural.width
			? containRect(
					currentNatural.width,
					currentNatural.height,
					stageSize.width,
					stageSize.height
				)
			: null
	);

	$effect(() => {
		const node = stageEl;
		if (!node || typeof ResizeObserver === 'undefined') return;
		const observer = new ResizeObserver((entries) => {
			const entry = entries[0];
			if (!entry) return;
			stageSize = {
				width: entry.contentRect.width,
				height: entry.contentRect.height
			};
		});
		observer.observe(node);
		stageSize = { width: node.clientWidth, height: node.clientHeight };
		return () => observer.disconnect();
	});

	$effect(() => {
		const nextSrc = src;
		const nextGhost = ghostSrc;
		const key = `${nextSrc}::${nextGhost ?? ''}`;

		ghostFailed = false;
		alignStatus = 'idle';
		currentFace = null;
		ghostFace = null;
		currentNatural = { width: 0, height: 0 };
		ghostNatural = { width: 0, height: 0 };
		loadedPair = null;

		// Reset nudges only when the photo pair changes, not on slider moves.
		scaleAdjust = 1;
		offsetX = 0;
		offsetY = 0;

		if (!nextGhost) return;

		let cancelled = false;
		alignStatus = 'aligning';

		(async () => {
			try {
				const [currentImg, ghostImg] = await Promise.all([
					loadHtmlImage(nextSrc),
					loadHtmlImage(nextGhost)
				]);
				if (cancelled) return;

				currentNatural = {
					width: currentImg.naturalWidth,
					height: currentImg.naturalHeight
				};
				ghostNatural = {
					width: ghostImg.naturalWidth,
					height: ghostImg.naturalHeight
				};
				loadedPair = key;

				if (!canDetectFaces()) {
					alignStatus = 'manual';
					return;
				}

				const [foundCurrent, foundGhost] = await Promise.all([
					detectPrimaryFace(currentImg),
					detectPrimaryFace(ghostImg)
				]);
				if (cancelled) return;

				currentFace = foundCurrent;
				ghostFace = foundGhost;
				alignStatus = foundCurrent && foundGhost ? 'aligned' : 'manual';
			} catch {
				if (!cancelled) {
					ghostFailed = true;
					alignStatus = 'failed';
				}
			}
		})();

		return () => {
			cancelled = true;
		};
	});

	function onKey(event: KeyboardEvent) {
		if (event.key === 'Escape') onClose();
	}

	async function handleDownload() {
		if (downloading) return;
		downloading = true;
		try {
			await downloadPhoto(src, filename);
		} finally {
			downloading = false;
		}
	}

	function attachDialog(node: HTMLElement) {
		node.focus();
		const previous = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = previous;
		};
	}

	function resetAlignNudges() {
		scaleAdjust = 1;
		offsetX = 0;
		offsetY = 0;
	}

	function readRange(event: Event): number {
		return Number((event.currentTarget as HTMLInputElement).value);
	}
</script>

<svelte:window onkeydown={onKey} />

<div
	class="lightbox"
	role="dialog"
	aria-modal="true"
	aria-label={label}
	tabindex="-1"
	{@attach attachDialog}
	transition:fade|global={{ duration }}
>
	<button class="backdrop" type="button" aria-label="Close photo" onclick={onClose}></button>

	<div class="lightbox-toolbar">
		{#if ghostSrc && !ghostFailed}
			<button
				class={['ghost-btn', 'tool-btn', overlayOn && 'active']}
				type="button"
				onclick={() => (overlayOn = !overlayOn)}
				title="Ghost previous same pose"
			>
				<span>{overlayOn ? 'Hide overlay' : 'Overlay previous'}</span>
			</button>
		{:else if ghostSrc && ghostFailed}
			<span class="tool-hint">Couldn’t load previous photo</span>
		{:else}
			<span class="tool-hint">No earlier photo for this pose</span>
		{/if}

		{#if onCrop}
			<button class="ghost-btn tool-btn" type="button" onclick={onCrop} title="Crop photo">
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
		{/if}

		<button
			class="ghost-btn tool-btn"
			type="button"
			onclick={handleDownload}
			disabled={downloading}
			title="Download photo"
		>
			<svg viewBox="0 0 16 16" aria-hidden="true">
				<path
					d="M8 2.5v7.5M4.5 7L8 10.5 11.5 7M3 13.5h10"
					fill="none"
					stroke="currentColor"
					stroke-width="1.7"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
			<span>{downloading ? 'Downloading…' : 'Download'}</span>
		</button>

		<button class="ghost-btn tool-btn close" type="button" onclick={onClose}>Close</button>
	</div>

	<div
		class="shot"
		transition:scale|global={{ duration, start: 0.92, opacity: 0, easing: cubicOut }}
	>
		<figure class="shot-figure">
			<div
				class={['stage', showOverlay && 'overlay-on']}
				style={showOverlay ? `--blend: ${blend}` : undefined}
				bind:this={stageEl}
			>
				{#if showOverlay && ghostSrc && loadedPair === pairKey}
					<img
						src={ghostSrc}
						alt="Previous · {ghostLabel}"
						class="layer ghost placed"
						style={ghostPlacement
							? `width:${ghostPlacement.width}px;height:${ghostPlacement.height}px;left:${ghostPlacement.left}px;top:${ghostPlacement.top}px;opacity:${1 - blend}`
							: `opacity:${1 - blend}`}
						onerror={() => (ghostFailed = true)}
					/>
				{/if}
				<img
					{src}
					alt={label}
					class="layer current"
					class:placed={currentPlacement != null && showOverlay}
					style={showOverlay
						? currentPlacement
							? `width:${currentPlacement.width}px;height:${currentPlacement.height}px;left:${currentPlacement.x}px;top:${currentPlacement.y}px;opacity:${blend}`
							: `opacity:${blend}`
						: undefined}
				/>
			</div>
			<figcaption>
				{#if showOverlay}
					<span class="caption-prev">{ghostLabel}</span>
					<span class="caption-sep">→</span>
					<span class="caption-now">{label}</span>
					{#if alignStatus === 'aligning'}
						<span class="align-note">Aligning faces…</span>
					{:else if alignStatus === 'aligned'}
						<span class="align-note ok">Faces aligned</span>
					{:else if alignStatus === 'manual'}
						<span class="align-note">Adjust scale / position below</span>
					{/if}
				{:else}
					{label}
				{/if}
			</figcaption>
		</figure>

		{#if showOverlay}
			<label class="opacity-control">
				<span>Previous</span>
				<input
					type="range"
					min="0"
					max="1"
					step="0.05"
					value={blend}
					oninput={(event) => (blend = readRange(event))}
				/>
				<span>Current</span>
			</label>

			<div class="align-controls">
				<label>
					<span>Face size</span>
					<input
						type="range"
						min="0.7"
						max="1.4"
						step="0.01"
						value={scaleAdjust}
						oninput={(event) => (scaleAdjust = readRange(event))}
					/>
				</label>
				<label>
					<span>Move X</span>
					<input
						type="range"
						min="-120"
						max="120"
						step="1"
						value={offsetX}
						oninput={(event) => (offsetX = readRange(event))}
					/>
				</label>
				<label>
					<span>Move Y</span>
					<input
						type="range"
						min="-160"
						max="160"
						step="1"
						value={offsetY}
						oninput={(event) => (offsetY = readRange(event))}
					/>
				</label>
				<button class="ghost-btn reset-btn" type="button" onclick={resetAlignNudges}>
					Reset
				</button>
			</div>
		{/if}
	</div>
</div>

<style>
	.lightbox {
		position: fixed;
		inset: 0;
		z-index: 45;
		display: grid;
		place-items: center;
		padding: 60px 20px 36px;
	}

	.backdrop {
		position: absolute;
		inset: 0;
		border: 0;
		background: rgba(8, 9, 12, 0.82);
		cursor: pointer;
	}

	.lightbox-toolbar {
		position: absolute;
		top: 16px;
		right: 16px;
		z-index: 2;
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
		justify-content: flex-end;
		max-width: calc(100% - 32px);
	}

	.tool-btn {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 6px 12px;
		font-size: 0.88rem;
		background: rgba(22, 24, 29, 0.8);
		backdrop-filter: blur(8px);
		border: 1px solid var(--line);
		border-radius: 999px;
	}

	.tool-btn:hover,
	.tool-btn.active {
		background: var(--bg-elev);
		border-color: var(--line-strong);
	}

	.tool-btn.active {
		color: var(--sage-deep);
		border-color: color-mix(in srgb, var(--accent) 45%, transparent);
	}

	.tool-btn svg {
		width: 14px;
		height: 14px;
	}

	.tool-hint {
		padding: 6px 12px;
		font-size: 0.82rem;
		color: var(--ink-soft);
		background: rgba(22, 24, 29, 0.8);
		border: 1px solid var(--line);
		border-radius: 999px;
	}

	.shot {
		position: relative;
		z-index: 1;
		display: grid;
		justify-items: center;
		gap: 10px;
		width: min(720px, 100%);
	}

	.shot-figure {
		margin: 0;
		display: grid;
		justify-items: center;
		gap: 10px;
		width: 100%;
	}

	.stage {
		position: relative;
		display: grid;
		place-items: center;
		width: 100%;
		height: min(72vh, 860px);
		border-radius: 16px;
		overflow: hidden;
		background: var(--bg);
		box-shadow: 0 24px 64px rgba(0, 0, 0, 0.45);
	}

	.layer {
		display: block;
		max-width: 100%;
		max-height: 100%;
		width: auto;
		height: auto;
		object-fit: contain;
	}

	.stage.overlay-on .layer {
		position: absolute;
		object-fit: fill;
		max-width: none;
		max-height: none;
	}

	.stage.overlay-on .layer:not(.placed) {
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: contain;
	}

	figcaption {
		color: var(--ink-soft);
		font-size: 0.9rem;
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
		justify-content: center;
	}

	.caption-sep {
		opacity: 0.5;
	}

	.caption-now {
		color: var(--ink);
	}

	.align-note {
		font-size: 0.8rem;
		color: var(--ink-soft);
	}

	.align-note.ok {
		color: var(--teal);
	}

	.opacity-control,
	.align-controls {
		display: flex;
		align-items: center;
		gap: 10px;
		color: var(--ink-soft);
		font-size: 0.86rem;
		min-width: min(420px, 100%);
		padding: 8px 14px;
		background: rgba(22, 24, 29, 0.9);
		border: 1px solid var(--line);
		border-radius: 999px;
	}

	.align-controls {
		flex-wrap: wrap;
		border-radius: 16px;
		justify-content: center;
	}

	.align-controls label {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		min-width: min(180px, 100%);
	}

	.opacity-control input,
	.align-controls input {
		flex: 1;
		accent-color: var(--accent);
		min-width: 72px;
	}

	.reset-btn {
		padding: 4px 10px;
		font-size: 0.82rem;
	}
</style>
