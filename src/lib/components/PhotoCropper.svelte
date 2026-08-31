<script lang="ts">
	import { cubicOut } from 'svelte/easing';
	import { prefersReducedMotion } from 'svelte/motion';
	import { fade, scale as scaleTransition } from 'svelte/transition';
	import { downloadBlob, photoFileName, type PhotoView } from '$lib/tracking/photos';

	type AspectMode = '3:4' | 'free';
	type HandleType = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'move';

	let {
		src,
		label = 'Photo',
		recordedOn,
		view,
		onSave,
		onCancel
	}: {
		src: string | File | Blob;
		label?: string;
		recordedOn?: string;
		view?: PhotoView;
		onSave: (file: File) => Promise<void> | void;
		onCancel: () => void;
	} = $props();

	let duration = $derived(prefersReducedMotion.current ? 0 : 280);

	let imageElement = $state<HTMLImageElement | null>(null);
	let imgLoaded = $state(false);
	let loadError = $state('');
	let saving = $state(false);
	let downloading = $state(false);

	let naturalWidth = $state(0);
	let naturalHeight = $state(0);
	let rotation = $state(0);
	let flipHorizontal = $state(false);

	// Display area dimensions for the photo canvas/container
	let containerWidth = $state(320);
	let containerHeight = $state(420);
	let displayedImgWidth = $state(320);
	let displayedImgHeight = $state(420);

	// Crop box coordinates relative to the displayed image (0 <= x, y <= displayedImg)
	let cropX = $state(0);
	let cropY = $state(0);
	let cropW = $state(100);
	let cropH = $state(100);

	let aspectMode = $state<AspectMode>('free');

	// Active drag interaction
	let activeHandle = $state<HandleType | null>(null);
	let dragStartX = 0;
	let dragStartY = 0;
	let initialCropX = 0;
	let initialCropY = 0;
	let initialCropW = 0;
	let initialCropH = 0;

	// Resolve object URL if src is a File or Blob
	let resolvedUrl = $derived.by(() => {
		if (typeof src === 'string') return src;
		return URL.createObjectURL(src);
	});

	$effect(() => {
		const currentUrl = resolvedUrl;
		return () => {
			if (typeof src !== 'string' && currentUrl) {
				URL.revokeObjectURL(currentUrl);
			}
		};
	});

	function initGeometry(w: number, h: number, rot: number) {
		naturalWidth = w;
		naturalHeight = h;
		if (w <= 0 || h <= 0) return;

		const isRotated = rot === 90 || rot === 270;
		const effectiveW = isRotated ? h : w;
		const effectiveH = isRotated ? w : h;

		// Size the display area nicely within typical mobile/desktop viewports
		const maxViewWidth = Math.min(440, Math.max(260, window.innerWidth - 64));
		const maxViewHeight = Math.min(520, Math.max(300, window.innerHeight - 340));

		const scale = Math.min(maxViewWidth / effectiveW, maxViewHeight / effectiveH);
		displayedImgWidth = Math.max(120, Math.round(effectiveW * scale));
		displayedImgHeight = Math.max(120, Math.round(effectiveH * scale));
		containerWidth = displayedImgWidth;
		containerHeight = displayedImgHeight;

		resetCropBox(displayedImgWidth, displayedImgHeight, aspectMode);
		imgLoaded = true;
	}

	function resetCropBox(imgW: number, imgH: number, mode: AspectMode) {
		if (mode === '3:4') {
			const targetRatio = 3 / 4;
			let boxW: number;
			let boxH: number;

			if (imgW / imgH > targetRatio) {
				boxH = Math.round(imgH * 0.94);
				boxW = Math.round(boxH * targetRatio);
			} else {
				boxW = Math.round(imgW * 0.94);
				boxH = Math.round(boxW / targetRatio);
			}

			cropW = Math.min(boxW, imgW);
			cropH = Math.min(boxH, imgH);
			cropX = Math.round((imgW - cropW) / 2);
			cropY = Math.round((imgH - cropH) / 2);
		} else {
			// Freeform default: ~90% centered box
			cropW = Math.round(imgW * 0.9);
			cropH = Math.round(imgH * 0.9);
			cropX = Math.round((imgW - cropW) / 2);
			cropY = Math.round((imgH - cropH) / 2);
		}
	}

	function onImageLoad(event: Event) {
		const img = event.currentTarget as HTMLImageElement;
		imageElement = img;
		initGeometry(img.naturalWidth, img.naturalHeight, rotation);
	}

	function onImageError() {
		loadError = 'Could not load photo for cropping.';
	}

	function setAspectMode(mode: AspectMode) {
		aspectMode = mode;
		resetCropBox(displayedImgWidth, displayedImgHeight, mode);
	}

	function rotateClockwise() {
		rotation = (rotation + 90) % 360;
		if (naturalWidth > 0 && naturalHeight > 0) {
			initGeometry(naturalWidth, naturalHeight, rotation);
		}
	}

	function startDrag(
		handle: HandleType,
		clientX: number,
		clientY: number,
		target: HTMLElement,
		pointerId?: number
	) {
		activeHandle = handle;
		dragStartX = clientX;
		dragStartY = clientY;
		initialCropX = cropX;
		initialCropY = cropY;
		initialCropW = cropW;
		initialCropH = cropH;

		if (pointerId != null) {
			try {
				target.setPointerCapture(pointerId);
			} catch {
				// ignore
			}
		}
	}

	function handlePointerDown(handle: HandleType, event: PointerEvent) {
		event.stopPropagation();
		event.preventDefault();
		startDrag(
			handle,
			event.clientX,
			event.clientY,
			event.currentTarget as HTMLElement,
			event.pointerId
		);
	}

	function handlePointerMove(event: PointerEvent) {
		if (!activeHandle) return;
		event.preventDefault();

		const dx = event.clientX - dragStartX;
		const dy = event.clientY - dragStartY;
		const minSize = 40;
		const imgW = displayedImgWidth;
		const imgH = displayedImgHeight;

		if (activeHandle === 'move') {
			let newX = initialCropX + dx;
			let newY = initialCropY + dy;
			newX = Math.max(0, Math.min(newX, imgW - cropW));
			newY = Math.max(0, Math.min(newY, imgH - cropH));
			cropX = Math.round(newX);
			cropY = Math.round(newY);
			return;
		}

		let newX = initialCropX;
		let newY = initialCropY;
		let newW = initialCropW;
		let newH = initialCropH;

		if (aspectMode === '3:4') {
			const ratio = 3 / 4; // width / height

			if (activeHandle === 'se') {
				let dw = dx;
				let dh = dy;
				const proposedW = Math.max(minSize, Math.min(imgW - initialCropX, initialCropW + dw));
				const proposedH = Math.max(minSize, Math.min(imgH - initialCropY, initialCropH + dh));

				if (proposedW / ratio <= proposedH) {
					newW = proposedW;
					newH = newW / ratio;
				} else {
					newH = proposedH;
					newW = newH * ratio;
				}
			} else if (activeHandle === 'nw') {
				const maxDx = initialCropW - minSize;
				const maxDy = initialCropH - minSize;
				const clampedDx = Math.min(maxDx, Math.max(-initialCropX, dx));
				const clampedDy = Math.min(maxDy, Math.max(-initialCropY, dy));

				let dw = -clampedDx;
				let dh = -clampedDy;
				if (dw / ratio <= dh) {
					newW = dw;
					newH = newW / ratio;
				} else {
					newH = dh;
					newW = newH * ratio;
				}
				newX = initialCropX + (initialCropW - newW);
				newY = initialCropY + (initialCropH - newH);
			} else if (activeHandle === 'ne') {
				const maxDx = imgW - (initialCropX + initialCropW);
				const maxDy = initialCropH - minSize;
				const clampedDx = Math.max(minSize - initialCropW, Math.min(maxDx, dx));
				const clampedDy = Math.min(maxDy, Math.max(-initialCropY, dy));

				let dw = initialCropW + clampedDx;
				let dh = -clampedDy;
				if (dw / ratio <= dh) {
					newW = dw;
					newH = newW / ratio;
				} else {
					newH = dh;
					newW = newH * ratio;
				}
				newX = initialCropX;
				newY = initialCropY + (initialCropH - newH);
			} else if (activeHandle === 'sw') {
				const maxDx = initialCropW - minSize;
				const maxDy = imgH - (initialCropY + initialCropH);
				const clampedDx = Math.min(maxDx, Math.max(-initialCropX, dx));
				const clampedDy = Math.max(minSize - initialCropH, Math.min(maxDy, dy));

				let dw = -clampedDx;
				let dh = initialCropH + clampedDy;
				if (dw / ratio <= dh) {
					newW = dw;
					newH = newW / ratio;
				} else {
					newH = dh;
					newW = newH * ratio;
				}
				newX = initialCropX + (initialCropW - newW);
				newY = initialCropY;
			} else if (activeHandle === 'e' || activeHandle === 'w') {
				if (activeHandle === 'e') {
					newW = Math.max(minSize, Math.min(imgW - initialCropX, initialCropW + dx));
					newH = newW / ratio;
					if (newY + newH > imgH) {
						newH = imgH - newY;
						newW = newH * ratio;
					}
				} else {
					const clampedDx = Math.min(initialCropW - minSize, Math.max(-initialCropX, dx));
					newW = initialCropW - clampedDx;
					newH = newW / ratio;
					if (newY + newH > imgH) {
						newH = imgH - newY;
						newW = newH * ratio;
					}
					newX = initialCropX + (initialCropW - newW);
				}
			} else if (activeHandle === 's' || activeHandle === 'n') {
				if (activeHandle === 's') {
					newH = Math.max(minSize, Math.min(imgH - initialCropY, initialCropH + dy));
					newW = newH * ratio;
					if (newX + newW > imgW) {
						newW = imgW - newX;
						newH = newW / ratio;
					}
				} else {
					const clampedDy = Math.min(initialCropH - minSize, Math.max(-initialCropY, dy));
					newH = initialCropH - clampedDy;
					newW = newH * ratio;
					if (newX + newW > imgW) {
						newW = imgW - newX;
						newH = newW / ratio;
					}
					newY = initialCropY + (initialCropH - newH);
				}
			}
		} else {
			// Freeform mode
			if (activeHandle.includes('e')) {
				newW = Math.max(minSize, Math.min(imgW - initialCropX, initialCropW + dx));
			}
			if (activeHandle.includes('w')) {
				const clampedDx = Math.min(initialCropW - minSize, Math.max(-initialCropX, dx));
				newX = initialCropX + clampedDx;
				newW = initialCropW - clampedDx;
			}
			if (activeHandle.includes('s')) {
				newH = Math.max(minSize, Math.min(imgH - initialCropY, initialCropH + dy));
			}
			if (activeHandle.includes('n')) {
				const clampedDy = Math.min(initialCropH - minSize, Math.max(-initialCropY, dy));
				newY = initialCropY + clampedDy;
				newH = initialCropH - clampedDy;
			}
		}

		cropX = Math.round(Math.max(0, Math.min(newX, imgW - minSize)));
		cropY = Math.round(Math.max(0, Math.min(newY, imgH - minSize)));
		cropW = Math.round(Math.max(minSize, Math.min(newW, imgW - cropX)));
		cropH = Math.round(Math.max(minSize, Math.min(newH, imgH - cropY)));
	}

	function handlePointerUp(event: PointerEvent) {
		if (!activeHandle) return;
		activeHandle = null;
		try {
			(event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
		} catch {
			// ignore
		}
	}

	async function renderCroppedBlob(): Promise<Blob> {
		if (!imageElement || naturalWidth <= 0 || naturalHeight <= 0) {
			throw new Error('Image not ready.');
		}

		const isRotated = rotation === 90 || rotation === 270;
		const effectiveW = isRotated ? naturalHeight : naturalWidth;
		const effectiveH = isRotated ? naturalWidth : naturalHeight;

		// Map displayed crop box back to natural coordinates
		const scaleX = effectiveW / displayedImgWidth;
		const scaleY = effectiveH / displayedImgHeight;

		const naturalCropX = cropX * scaleX;
		const naturalCropY = cropY * scaleY;
		const naturalCropW = cropW * scaleX;
		const naturalCropH = cropH * scaleY;

		// Create rotated/oriented source canvas at full natural resolution
		const orientedCanvas = document.createElement('canvas');
		orientedCanvas.width = effectiveW;
		orientedCanvas.height = effectiveH;
		const orientedCtx = orientedCanvas.getContext('2d');
		if (!orientedCtx) throw new Error('Could not create canvas context.');

		orientedCtx.save();
		orientedCtx.translate(effectiveW / 2, effectiveH / 2);
		orientedCtx.rotate((rotation * Math.PI) / 180);
		if (flipHorizontal) {
			orientedCtx.scale(-1, 1);
		}
		orientedCtx.drawImage(imageElement, -naturalWidth / 2, -naturalHeight / 2);
		orientedCtx.restore();

		// Create final cropped canvas
		// Target up to 1400px edge for high quality output
		const maxTargetEdge = 1400;
		const outputScale = Math.min(1, maxTargetEdge / Math.max(naturalCropW, naturalCropH));
		const targetWidth = Math.max(1, Math.round(naturalCropW * outputScale));
		const targetHeight = Math.max(1, Math.round(naturalCropH * outputScale));

		const outputCanvas = document.createElement('canvas');
		outputCanvas.width = targetWidth;
		outputCanvas.height = targetHeight;
		const outCtx = outputCanvas.getContext('2d');
		if (!outCtx) throw new Error('Could not create output context.');

		outCtx.drawImage(
			orientedCanvas,
			naturalCropX,
			naturalCropY,
			naturalCropW,
			naturalCropH,
			0,
			0,
			targetWidth,
			targetHeight
		);

		return new Promise<Blob>((resolve, reject) => {
			outputCanvas.toBlob(
				(blob) => {
					if (blob) resolve(blob);
					else reject(new Error('Could not render crop.'));
				},
				'image/jpeg',
				0.92
			);
		});
	}

	async function handleSave() {
		if (saving) return;
		saving = true;
		try {
			const blob = await renderCroppedBlob();
			const filename = recordedOn && view ? photoFileName(recordedOn, view) : 'cropped-photo.jpg';
			const file = new File([blob], filename, { type: 'image/jpeg' });
			await onSave(file);
		} catch (err) {
			loadError = err instanceof Error ? err.message : 'Could not save cropped photo.';
			saving = false;
		}
	}

	async function handleDownloadCrop() {
		if (downloading) return;
		downloading = true;
		try {
			const blob = await renderCroppedBlob();
			const filename =
				recordedOn && view
					? photoFileName(recordedOn, view)
					: `cropped-${label.toLowerCase().replace(/\s+/g, '-')}.jpg`;
			downloadBlob(blob, filename);
		} catch (err) {
			loadError = err instanceof Error ? err.message : 'Could not download cropped photo.';
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

	function onKey(event: KeyboardEvent) {
		if (event.key === 'Escape' && !saving) onCancel();
	}
</script>

<svelte:window onkeydown={onKey} />

<div
	class="cropper-overlay"
	role="dialog"
	aria-modal="true"
	aria-label="Crop {label}"
	tabindex="-1"
	{@attach attachDialog}
	transition:fade|global={{ duration }}
>
	<button
		class="backdrop"
		type="button"
		aria-label="Cancel crop"
		onclick={() => !saving && onCancel()}
	></button>

	<div
		class="cropper-card"
		transition:scaleTransition|global={{ duration, start: 0.94, opacity: 0, easing: cubicOut }}
	>
		<div class="cropper-head">
			<div>
				<h2>Crop {label}</h2>
				<p>Drag the corner/edge handles to resize or reposition the crop area.</p>
			</div>
			<button
				class="ghost-btn icon-close"
				type="button"
				aria-label="Cancel"
				onclick={onCancel}
				disabled={saving}
			>
				✕
			</button>
		</div>

		{#if loadError}
			<p class="flash">{loadError}</p>
		{/if}

		<!-- Hidden full image to measure dimensions and render offscreen -->
		<img
			class="hidden-source-img"
			src={resolvedUrl}
			alt=""
			crossorigin="anonymous"
			onload={onImageLoad}
			onerror={onImageError}
		/>

		<!-- Interactive Crop Workspace -->
		<div class="crop-workspace-wrap">
			<div
				class="crop-stage"
				style:width="{containerWidth}px"
				style:height="{containerHeight}px"
				role="region"
				aria-label="Crop adjustment canvas"
				onpointermove={handlePointerMove}
				onpointerup={handlePointerUp}
				onpointercancel={handlePointerUp}
			>
				{#if imgLoaded}
					<!-- Displayed oriented image -->
					<div
						class="stage-image-wrap"
						style:transform="rotate({rotation}deg) scaleX({flipHorizontal ? -1 : 1})"
					>
						<img src={resolvedUrl} alt="" class="stage-img" draggable="false" />
					</div>

					<!-- Darkened backdrop with transparent cutout over crop box -->
					<div
						class="crop-overlay-cutout"
						style:clip-path="polygon(0% 0%, 0% 100%, {cropX}px 100%, {cropX}px {cropY}px, {cropX +
							cropW}px {cropY}px, {cropX + cropW}px {cropY + cropH}px, {cropX}px {cropY + cropH}px, {cropX}px
						100%, 100% 100%, 100% 0%)"
						aria-hidden="true"
					></div>

					<!-- The Interactive Crop Box -->
					<div
						class="crop-box"
						style:left="{cropX}px"
						style:top="{cropY}px"
						style:width="{cropW}px"
						style:height="{cropH}px"
					>
						<!-- Move handle (drag interior) -->
						<div
							class="crop-interior"
							role="button"
							tabindex="0"
							aria-label="Move crop area"
							onpointerdown={(e) => handlePointerDown('move', e)}
						>
							<!-- Rule of thirds grid -->
							<div class="grid-line h1" aria-hidden="true"></div>
							<div class="grid-line h2" aria-hidden="true"></div>
							<div class="grid-line v1" aria-hidden="true"></div>
							<div class="grid-line v2" aria-hidden="true"></div>
						</div>

						<!-- Corner Handles -->
						<div
							class="crop-handle nw"
							role="button"
							tabindex="0"
							aria-label="Resize top-left"
							onpointerdown={(e) => handlePointerDown('nw', e)}
						></div>
						<div
							class="crop-handle ne"
							role="button"
							tabindex="0"
							aria-label="Resize top-right"
							onpointerdown={(e) => handlePointerDown('ne', e)}
						></div>
						<div
							class="crop-handle se"
							role="button"
							tabindex="0"
							aria-label="Resize bottom-right"
							onpointerdown={(e) => handlePointerDown('se', e)}
						></div>
						<div
							class="crop-handle sw"
							role="button"
							tabindex="0"
							aria-label="Resize bottom-left"
							onpointerdown={(e) => handlePointerDown('sw', e)}
						></div>

						<!-- Edge Handles -->
						<div
							class="crop-handle-edge n"
							role="button"
							tabindex="0"
							aria-label="Resize top edge"
							onpointerdown={(e) => handlePointerDown('n', e)}
						></div>
						<div
							class="crop-handle-edge s"
							role="button"
							tabindex="0"
							aria-label="Resize bottom edge"
							onpointerdown={(e) => handlePointerDown('s', e)}
						></div>
						<div
							class="crop-handle-edge w"
							role="button"
							tabindex="0"
							aria-label="Resize left edge"
							onpointerdown={(e) => handlePointerDown('w', e)}
						></div>
						<div
							class="crop-handle-edge e"
							role="button"
							tabindex="0"
							aria-label="Resize right edge"
							onpointerdown={(e) => handlePointerDown('e', e)}
						></div>
					</div>
				{:else if !loadError}
					<div class="loading-state">
						<span>Loading photo…</span>
					</div>
				{/if}
			</div>
		</div>

		<!-- Toolbar: Aspect ratio & Rotation -->
		<div class="cropper-controls">
			<div class="aspect-tabs">
				<button
					class={['chip', aspectMode === 'free' && 'active']}
					type="button"
					onclick={() => setAspectMode('free')}
					disabled={!imgLoaded || saving}
				>
					Freeform
				</button>
				<button
					class={['chip', aspectMode === '3:4' && 'active']}
					type="button"
					onclick={() => setAspectMode('3:4')}
					disabled={!imgLoaded || saving}
				>
					3:4 Portrait
				</button>
			</div>

			<div class="transform-buttons">
				<button
					class={['ghost-btn tool-btn', flipHorizontal && 'active']}
					type="button"
					title="Flip horizontally (mirror)"
					onclick={() => (flipHorizontal = !flipHorizontal)}
					disabled={!imgLoaded || saving}
				>
					<svg viewBox="0 0 20 20" aria-hidden="true">
						<path
							d="M10 2v16 M3 14l5-8v8H3z M17 14l-5-8v8h5z"
							fill="none"
							stroke="currentColor"
							stroke-width="1.7"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
					<span>Flip</span>
				</button>

				<button
					class="ghost-btn tool-btn"
					type="button"
					title="Rotate 90°"
					onclick={rotateClockwise}
					disabled={!imgLoaded || saving}
				>
					<svg viewBox="0 0 20 20" aria-hidden="true">
						<path
							d="M16 10 A6 6 0 1 1 14.2 5.8 L16.5 3.5 M16.5 8 L16.5 3.5 L12 3.5"
							fill="none"
							stroke="currentColor"
							stroke-width="1.8"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
					<span>Rotate</span>
				</button>

				<button
					class="ghost-btn tool-btn"
					type="button"
					title="Reset crop box"
					onclick={() => resetCropBox(displayedImgWidth, displayedImgHeight, aspectMode)}
					disabled={!imgLoaded || saving}
				>
					<svg viewBox="0 0 20 20" aria-hidden="true">
						<path
							d="M4 10a6 6 0 0 1 10.2-4.2L16 4v4h-4 M16 10a6 6 0 0 1-10.2 4.2L4 16v-4h4"
							fill="none"
							stroke="currentColor"
							stroke-width="1.8"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
					<span>Reset</span>
				</button>
			</div>
		</div>

		<!-- Action bar -->
		<div class="cropper-actions">
			<button
				class="ghost-btn"
				type="button"
				onclick={handleDownloadCrop}
				disabled={!imgLoaded || saving || downloading}
			>
				<svg viewBox="0 0 16 16" aria-hidden="true" class="action-icon">
					<path
						d="M8 2.5v7.5M4.5 7L8 10.5 11.5 7M3 13.5h10"
						fill="none"
						stroke="currentColor"
						stroke-width="1.7"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
				{downloading ? 'Downloading…' : 'Download crop'}
			</button>

			<div class="primary-group">
				<button class="ghost-btn" type="button" onclick={onCancel} disabled={saving}>
					Cancel
				</button>
				<button
					class="primary-btn"
					type="button"
					onclick={handleSave}
					disabled={!imgLoaded || saving}
				>
					{#if saving}
						<span class="spinner" aria-hidden="true"></span>
						Saving…
					{:else}
						Save crop
					{/if}
				</button>
			</div>
		</div>
	</div>
</div>

<style>
	.cropper-overlay {
		position: fixed;
		inset: 0;
		z-index: 50;
		display: grid;
		place-items: center;
		padding: 16px;
		background: rgba(8, 9, 12, 0.85);
	}

	.backdrop {
		position: absolute;
		inset: 0;
		border: 0;
		background: transparent;
		cursor: pointer;
	}

	.cropper-card {
		position: relative;
		z-index: 1;
		width: min(520px, 100%);
		max-height: calc(100dvh - 32px);
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: 18px 20px;
		background: var(--bg-elev);
		border: 1px solid var(--line-strong);
		border-radius: 18px;
		box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5);
		overflow-y: auto;
	}

	.cropper-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 12px;
	}

	.cropper-head h2 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
	}

	.cropper-head p {
		margin: 3px 0 0;
		font-size: 0.84rem;
		color: var(--ink-soft);
	}

	.icon-close {
		padding: 4px 8px;
		font-size: 1.1rem;
		line-height: 1;
	}

	.crop-workspace-wrap {
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 6px 0;
		user-select: none;
		-webkit-user-select: none;
	}

	.hidden-source-img {
		position: absolute;
		width: 1px;
		height: 1px;
		opacity: 0;
		pointer-events: none;
	}

	.crop-stage {
		position: relative;
		overflow: hidden;
		border-radius: 12px;
		background: #000;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
		touch-action: none;
	}

	.stage-image-wrap {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		transform-origin: center center;
		pointer-events: none;
	}

	.stage-img {
		width: 100%;
		height: 100%;
		object-fit: contain;
		display: block;
		pointer-events: none;
	}

	.crop-overlay-cutout {
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, 0.65);
		pointer-events: none;
		will-change: clip-path;
	}

	.crop-box {
		position: absolute;
		border: 1.5px solid #fff;
		box-shadow:
			0 0 0 1px rgba(0, 0, 0, 0.5),
			inset 0 0 0 1px rgba(0, 0, 0, 0.3);
		box-sizing: border-box;
		touch-action: none;
	}

	.crop-interior {
		position: absolute;
		inset: 0;
		cursor: move;
		touch-action: none;
	}

	.grid-line {
		position: absolute;
		background: rgba(255, 255, 255, 0.3);
		pointer-events: none;
	}

	.grid-line.h1 {
		top: 33.333%;
		left: 0;
		right: 0;
		height: 1px;
	}
	.grid-line.h2 {
		top: 66.666%;
		left: 0;
		right: 0;
		height: 1px;
	}
	.grid-line.v1 {
		left: 33.333%;
		top: 0;
		bottom: 0;
		width: 1px;
	}
	.grid-line.v2 {
		left: 66.666%;
		top: 0;
		bottom: 0;
		width: 1px;
	}

	/* Corner Handles (L-shaped prominent markers) */
	.crop-handle {
		position: absolute;
		width: 22px;
		height: 22px;
		z-index: 2;
		touch-action: none;
	}

	.crop-handle::after {
		content: '';
		position: absolute;
		border: 3px solid var(--accent);
		width: 12px;
		height: 12px;
		box-sizing: border-box;
		box-shadow: 0 0 3px rgba(0, 0, 0, 0.8);
	}

	.crop-handle.nw {
		top: -11px;
		left: -11px;
		cursor: nwse-resize;
	}
	.crop-handle.nw::after {
		top: 7px;
		left: 7px;
		border-right: 0;
		border-bottom: 0;
	}

	.crop-handle.ne {
		top: -11px;
		right: -11px;
		cursor: nesw-resize;
	}
	.crop-handle.ne::after {
		top: 7px;
		right: 7px;
		border-left: 0;
		border-bottom: 0;
	}

	.crop-handle.se {
		bottom: -11px;
		right: -11px;
		cursor: nwse-resize;
	}
	.crop-handle.se::after {
		bottom: 7px;
		right: 7px;
		border-left: 0;
		border-top: 0;
	}

	.crop-handle.sw {
		bottom: -11px;
		left: -11px;
		cursor: nesw-resize;
	}
	.crop-handle.sw::after {
		bottom: 7px;
		left: 7px;
		border-right: 0;
		border-top: 0;
	}

	/* Edge handles */
	.crop-handle-edge {
		position: absolute;
		z-index: 2;
		touch-action: none;
	}

	.crop-handle-edge::after {
		content: '';
		position: absolute;
		background: #fff;
		border-radius: 999px;
		box-shadow: 0 0 3px rgba(0, 0, 0, 0.8);
	}

	.crop-handle-edge.n,
	.crop-handle-edge.s {
		left: 20px;
		right: 20px;
		height: 16px;
		cursor: ns-resize;
	}
	.crop-handle-edge.n {
		top: -8px;
	}
	.crop-handle-edge.n::after {
		top: 6px;
		left: 50%;
		transform: translateX(-50%);
		width: 24px;
		height: 4px;
	}

	.crop-handle-edge.s {
		bottom: -8px;
	}
	.crop-handle-edge.s::after {
		bottom: 6px;
		left: 50%;
		transform: translateX(-50%);
		width: 24px;
		height: 4px;
	}

	.crop-handle-edge.w,
	.crop-handle-edge.e {
		top: 20px;
		bottom: 20px;
		width: 16px;
		cursor: ew-resize;
	}
	.crop-handle-edge.w {
		left: -8px;
	}
	.crop-handle-edge.w::after {
		left: 6px;
		top: 50%;
		transform: translateY(-50%);
		width: 4px;
		height: 24px;
	}

	.crop-handle-edge.e {
		right: -8px;
	}
	.crop-handle-edge.e::after {
		right: 6px;
		top: 50%;
		transform: translateY(-50%);
		width: 4px;
		height: 24px;
	}

	.loading-state {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		color: var(--ink-soft);
		font-size: 0.9rem;
	}

	.cropper-controls {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		flex-wrap: wrap;
	}

	.aspect-tabs {
		display: flex;
		gap: 6px;
	}

	.aspect-tabs .chip {
		padding: 5px 12px;
		font-size: 0.82rem;
	}

	.transform-buttons {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.tool-btn {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 5px 10px;
		font-size: 0.82rem;
	}

	.tool-btn.active {
		background: color-mix(in srgb, var(--accent) 18%, transparent);
		border-color: var(--accent);
		color: var(--ink);
	}

	.tool-btn svg {
		width: 14px;
		height: 14px;
	}

	.cropper-actions {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		margin-top: 2px;
		padding-top: 12px;
		border-top: 1px solid var(--line);
		flex-wrap: wrap;
	}

	.primary-group {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-left: auto;
	}

	.action-icon {
		width: 14px;
		height: 14px;
	}

	.spinner {
		width: 14px;
		height: 14px;
		border: 2px solid color-mix(in srgb, var(--accent-text) 35%, transparent);
		border-top-color: var(--accent-text);
		border-radius: 50%;
		animation: spin 0.7s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	@media (max-width: 480px) {
		.cropper-card {
			padding: 14px;
			gap: 10px;
		}

		.cropper-controls {
			flex-direction: column;
			align-items: stretch;
		}

		.transform-buttons {
			justify-content: flex-end;
		}

		.cropper-actions {
			flex-direction: column;
			align-items: stretch;
		}

		.primary-group {
			margin-left: 0;
			justify-content: flex-end;
		}
	}
</style>
