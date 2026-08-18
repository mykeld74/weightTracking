<script lang="ts">
	let {
		name
	}: {
		name: 'composition' | 'measurements' | 'photos' | 'glp1';
	} = $props();
</script>

<svg viewBox="0 0 24 24" aria-hidden="true">
	{#if name === 'composition'}
		<rect x="4" y="4" width="16" height="16" rx="2.4" />
		<rect x="8" y="7.2" width="8" height="4" rx="0.9" />
		<path d="M9.6 9.2h4.8" />
	{:else if name === 'measurements'}
		<path d="M3.4 10.4 Q12 4.4 20.6 10.4" />
		<path d="M3.4 15.6 Q12 9.6 20.6 15.6" />
		<path d="M3.4 10.4v5.2M20.6 10.4v5.2" />
		<path d="M6.8 8.5v2.6M9.4 7.7v1.5M12 7.4v2.8M14.6 7.7v1.5M17.2 8.5v2.6" />
	{:else if name === 'photos'}
		<path
			d="M8.2 7 9.5 5.2A1.2 1.2 0 0 1 10.5 4.7h3a1.2 1.2 0 0 1 1 .5L15.8 7H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3.2Z"
		/>
		<circle cx="12" cy="13.2" r="3" />
	{:else}
		<path d="m18 2 4 4" />
		<path d="m17 7 3-3" />
		<path d="M19 9 8.7 19.3a2.4 2.4 0 0 1-3.4 0l-.6-.6a2.4 2.4 0 0 1 0-3.4L15 5" />
		<path d="m9 11 4 4" />
		<path d="m5 19-3 3" />
		<path d="m14 4 6 6" />
	{/if}
</svg>

<style>
	svg {
		width: var(--tab-icon-size, 18px);
		height: var(--tab-icon-size, 18px);
		flex: none;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.75;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
</style>
