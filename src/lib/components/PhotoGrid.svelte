<script lang="ts">
	import { enhance } from '$app/forms';
	import CameraCapture from './CameraCapture.svelte';
	import PhotoLightbox from './PhotoLightbox.svelte';
	import { compressImage } from '$lib/tracking/compressImage';
	import {
		photoSrc,
		photoViewLabels,
		photoViews,
		type PhotoMeta,
		type PhotoView
	} from '$lib/tracking/photos';

	let {
		recordedOn,
		photos,
		message = ''
	}: {
		recordedOn: string;
		photos: Partial<Record<PhotoView, PhotoMeta>>;
		message?: string;
	} = $props();

	let previewUrl = $state<Partial<Record<PhotoView, string>>>({});
	let uploading = $state<PhotoView | null>(null);
	let pickerView = $state<PhotoView | null>(null);
	let cameraView = $state<PhotoView | null>(null);
	let lightbox = $state<{ src: string; label: string } | null>(null);
	let localError = $state('');
	const fileInputs: Partial<Record<PhotoView, HTMLInputElement>> = {};
	const captureInputs: Partial<Record<PhotoView, HTMLInputElement>> = {};

	function srcFor(view: PhotoView): string | undefined {
		return previewUrl[view] ?? (photos[view] ? photoSrc(photos[view]) : undefined);
	}

	function attachInput(store: Partial<Record<PhotoView, HTMLInputElement>>, view: PhotoView) {
		return (node: HTMLInputElement) => {
			store[view] = node;
			return () => {
				if (store[view] === node) delete store[view];
			};
		};
	}

	function preferNativeCapture() {
		return window.matchMedia('(pointer: coarse)').matches;
	}

	function openPicker(view: PhotoView, event: MouseEvent) {
		event.stopPropagation();
		if (uploading) return;
		lightbox = null;
		pickerView = pickerView === view ? null : view;
	}

	function openPhoto(view: PhotoView, event: MouseEvent) {
		event.stopPropagation();
		if (uploading) return;
		const src = srcFor(view);
		if (!src) {
			openPicker(view, event);
			return;
		}
		pickerView = null;
		lightbox = { src, label: photoViewLabels[view] };
	}

	function closePicker() {
		pickerView = null;
	}

	function chooseFile(view: PhotoView, event: MouseEvent) {
		event.stopPropagation();
		pickerView = null;
		fileInputs[view]?.click();
	}

	function takePhoto(view: PhotoView, event: MouseEvent) {
		event.stopPropagation();
		pickerView = null;
		// mediaDevices is undefined on insecure origins, so the guard matters at
		// runtime even though TS types it as always present.
		if (!preferNativeCapture() && typeof navigator.mediaDevices?.getUserMedia === 'function') {
			cameraView = view;
			return;
		}
		captureInputs[view]?.click();
	}

	async function ingest(view: PhotoView, file: File) {
		const input = fileInputs[view];
		if (!input?.form) return;

		localError = '';
		uploading = view;
		cameraView = null;
		try {
			const { image, thumb } = await compressImage(file);

			const imageTransfer = new DataTransfer();
			imageTransfer.items.add(image);
			input.files = imageTransfer.files;

			const thumbInput = input.form.elements.namedItem('thumb');
			if (thumbInput instanceof HTMLInputElement) {
				const thumbTransfer = new DataTransfer();
				thumbTransfer.items.add(thumb);
				thumbInput.files = thumbTransfer.files;
			}

			const previous = previewUrl[view];
			if (previous) URL.revokeObjectURL(previous);
			previewUrl[view] = URL.createObjectURL(image);
			input.form.requestSubmit();
		} catch (caught) {
			uploading = null;
			localError = caught instanceof Error ? caught.message : 'Could not prepare that photo.';
			input.value = '';
		}
	}

	async function onPick(view: PhotoView, event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		await ingest(view, file);
	}

	function afterSave(view: PhotoView) {
		return async ({
			result,
			update
		}: {
			result: { type: string };
			update: () => Promise<void>;
		}) => {
			await update();
			uploading = null;
			if (result.type !== 'success') return;
			const previous = previewUrl[view];
			if (previous) URL.revokeObjectURL(previous);
			previewUrl[view] = undefined;
		};
	}

	function onWindowKey(event: KeyboardEvent) {
		if (event.key !== 'Escape' || cameraView || lightbox) return;
		pickerView = null;
	}
</script>

<svelte:window onclick={closePicker} onkeydown={onWindowKey} />

{#if message || localError}
	<p class="flash">{localError || message}</p>
{/if}

<div class="photo-grid">
	{#each photoViews as view (view)}
		{@const photo = photos[view]}
		{@const src = srcFor(view)}
		<article class="photo-slot">
			<form
				class="slot-form"
				method="post"
				action="?/save"
				enctype="multipart/form-data"
				use:enhance={() => afterSave(view)}
			>
				<input type="hidden" name="recordedOn" value={recordedOn} />
				<input type="hidden" name="view" value={view} />
				<div class="photo-frame">
					{#if src}
						<img {src} alt="{photoViewLabels[view]} view" />
					{:else}
						<span class="placeholder">
							<strong>+</strong>
							Add {photoViewLabels[view].toLowerCase()}
						</span>
					{/if}
					{#if uploading === view}
						<span class="busy">Saving…</span>
					{/if}
					{#if pickerView === view}
						<div class="source-menu">
							<button class="ghost-btn" type="button" onclick={(event) => chooseFile(view, event)}>
								Choose file
							</button>
							<button class="ghost-btn" type="button" onclick={(event) => takePhoto(view, event)}>
								Take photo
							</button>
						</div>
					{:else}
						<button
							class={['frame-hit', src && 'has-photo']}
							type="button"
							disabled={uploading === view}
							onclick={(event) => (src ? openPhoto(view, event) : openPicker(view, event))}
						>
							{src
								? `View ${photoViewLabels[view].toLowerCase()}`
								: `Add ${photoViewLabels[view].toLowerCase()}`}
						</button>
					{/if}
				</div>
				<input
					class="sr-only"
					type="file"
					name="image"
					accept="image/jpeg,image/png,image/webp,image/*"
					{@attach attachInput(fileInputs, view)}
					onchange={(event) => onPick(view, event)}
				/>
				<input
					class="sr-only"
					type="file"
					accept="image/*"
					capture="environment"
					tabindex="-1"
					aria-hidden="true"
					{@attach attachInput(captureInputs, view)}
					onchange={(event) => onPick(view, event)}
				/>
				<input class="sr-only" type="file" name="thumb" tabindex="-1" aria-hidden="true" />
			</form>
			<div class="slot-meta">
				<span>{photoViewLabels[view]}</span>
				<div class="slot-actions">
					{#if src}
						<button class="text-btn" type="button" onclick={(event) => openPicker(view, event)}>
							Replace
						</button>
					{/if}
					{#if photo}
						<form method="post" action="?/remove" use:enhance>
							<input type="hidden" name="id" value={photo.id} />
							<input type="hidden" name="recordedOn" value={recordedOn} />
							<button class="text-btn" type="submit">Remove</button>
						</form>
					{/if}
				</div>
			</div>
		</article>
	{/each}
</div>

{#if lightbox}
	<PhotoLightbox src={lightbox.src} label={lightbox.label} onClose={() => (lightbox = null)} />
{/if}

{#if cameraView}
	{@const view = cameraView}
	<CameraCapture
		label={photoViewLabels[view]}
		onCapture={(file) => ingest(view, file)}
		onCancel={() => (cameraView = null)}
	/>
{/if}

<style>
	.photo-grid {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 12px;
	}

	.slot-form {
		margin: 0;
	}

	.photo-frame {
		position: relative;
		display: grid;
		place-items: center;
		aspect-ratio: 3 / 4;
		overflow: hidden;
		border: 1px dashed var(--line-strong);
		border-radius: 14px;
		background: var(--bg);
		color: var(--ink-soft);
	}

	.photo-frame:hover {
		border-color: var(--accent);
		color: var(--ink);
	}

	.photo-frame img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.frame-hit {
		position: absolute;
		inset: 0;
		border: 0;
		background: transparent;
		color: transparent;
		cursor: pointer;
	}

	.frame-hit.has-photo {
		cursor: zoom-in;
	}

	.frame-hit:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: -2px;
	}

	.source-menu {
		position: absolute;
		inset: 0;
		z-index: 1;
		display: grid;
		align-content: center;
		gap: 8px;
		padding: 12px;
		background: rgba(12, 13, 16, 0.78);
	}

	.source-menu .ghost-btn {
		width: 100%;
		justify-content: center;
	}

	.placeholder {
		display: grid;
		justify-items: center;
		gap: 6px;
		font-size: 0.86rem;
		padding: 12px;
		text-align: center;
	}

	.placeholder strong {
		font-size: 1.6rem;
		font-weight: 500;
		line-height: 1;
		color: var(--accent);
	}

	.busy {
		position: absolute;
		inset: 0;
		z-index: 2;
		display: grid;
		place-items: center;
		background: rgba(12, 13, 16, 0.55);
		color: var(--ink);
		font-size: 0.86rem;
	}

	.slot-meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		margin-top: 8px;
		font-size: 0.86rem;
		color: var(--ink-soft);
	}

	.slot-actions {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	@media (max-width: 900px) {
		.photo-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
</style>
