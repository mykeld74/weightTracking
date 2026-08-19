<script lang="ts">
	let {
		height = '1rem',
		width = '100%',
		rounded = '8px'
	}: { height?: string; width?: string; rounded?: string } = $props();
</script>

<span class="skeleton" style:height style:width style:border-radius={rounded} aria-hidden="true"
></span>

<style>
	.skeleton {
		display: block;
		background: linear-gradient(
			90deg,
			var(--bg) 0%,
			color-mix(in srgb, var(--line-strong) 45%, transparent) 50%,
			var(--bg) 100%
		);
		background-size: 200% 100%;
		animation: shimmer 1.2s ease-in-out infinite;
	}

	@keyframes shimmer {
		from {
			background-position: 200% 0;
		}
		to {
			background-position: -200% 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.skeleton {
			animation: none;
			background: var(--bg);
		}
	}
</style>
