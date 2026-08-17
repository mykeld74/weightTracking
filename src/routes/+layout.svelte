<script lang="ts">
	import '../app.css';
	import { asset } from '$app/paths';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" type="image/png" href={asset('/favicon.png')} />
	<link rel="apple-touch-icon" href={asset('/favicon.png')} />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
	<link
		href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600&family=Figtree:wght@400;500;600&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

{@render children()}
