<script lang="ts">
	import { cubicOut } from 'svelte/easing';
	import { prefersReducedMotion } from 'svelte/motion';
	import { fade, scale } from 'svelte/transition';
	import { downloadPhoto } from '$lib/tracking/photos';

	let {
		src,
		label,
		filename = `${label.toLowerCase().replace(/\s+/g, '-')}.jpg`,
		onCrop,
		onClose
	}: {
		src: string;
		label: string;
		filename?: string;
		onCrop?: () => void;
		onClose: () => void;
	} = $props();

	let duration = $derived(prefersReducedMotion.current ? 0 : 280);
	let downloading = $state(false);

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

	<figure
		class="shot"
		transition:scale|global={{ duration, start: 0.92, opacity: 0, easing: cubicOut }}
	>
		<img {src} alt={label} />
		<figcaption>{label}</figcaption>
	</figure>
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

	.tool-btn:hover {
		background: var(--bg-elev);
		border-color: var(--line-strong);
	}

	.tool-btn svg {
		width: 14px;
		height: 14px;
	}

	.shot {
		position: relative;
		z-index: 1;
		display: grid;
		justify-items: center;
		gap: 10px;
		margin: 0;
		max-width: min(720px, 100%);
	}

	.shot img {
		display: block;
		width: auto;
		max-width: 100%;
		max-height: min(80vh, 900px);
		border-radius: 16px;
		object-fit: contain;
		background: var(--bg);
		box-shadow: 0 24px 64px rgba(0, 0, 0, 0.45);
	}

	figcaption {
		color: var(--ink-soft);
		font-size: 0.9rem;
	}
</style>
