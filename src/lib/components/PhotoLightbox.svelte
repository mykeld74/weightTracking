<script lang="ts">
	import { cubicOut } from 'svelte/easing';
	import { prefersReducedMotion } from 'svelte/motion';
	import { fade, scale } from 'svelte/transition';

	let {
		src,
		label,
		onClose
	}: {
		src: string;
		label: string;
		onClose: () => void;
	} = $props();

	let duration = $derived(prefersReducedMotion.current ? 0 : 280);

	function onKey(event: KeyboardEvent) {
		if (event.key === 'Escape') onClose();
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
	<figure
		class="shot"
		transition:scale|global={{ duration, start: 0.92, opacity: 0, easing: cubicOut }}
	>
		<img {src} alt={label} />
		<figcaption>{label}</figcaption>
	</figure>
	<button class="ghost-btn close" type="button" onclick={onClose}>Close</button>
</div>

<style>
	.lightbox {
		position: fixed;
		inset: 0;
		z-index: 45;
		display: grid;
		place-items: center;
		padding: 28px 20px 36px;
	}

	.backdrop {
		position: absolute;
		inset: 0;
		border: 0;
		background: rgba(8, 9, 12, 0.82);
		cursor: pointer;
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
		max-height: min(82vh, 920px);
		border-radius: 16px;
		object-fit: contain;
		background: var(--bg);
		box-shadow: 0 24px 64px rgba(0, 0, 0, 0.45);
	}

	figcaption {
		color: var(--ink-soft);
		font-size: 0.9rem;
	}

	.close {
		position: absolute;
		top: 16px;
		right: 16px;
		z-index: 1;
	}
</style>
