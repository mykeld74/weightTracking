<script lang="ts">
	import { chartColorFor, type FieldDef } from '$lib/tracking/fields';

	let {
		fields,
		selectedKey,
		primaryKeys,
		onSelect
	}: {
		fields: readonly FieldDef[];
		selectedKey: string;
		primaryKeys: readonly string[];
		onSelect: (key: string) => void;
	} = $props();

	let menuOpen = $state(false);

	let primaryFields = $derived(fields.filter((field) => primaryKeys.includes(field.key)));
	let moreFields = $derived(fields.filter((field) => !primaryKeys.includes(field.key)));
	let selectedMore = $derived(moreFields.find((field) => field.key === selectedKey));

	function select(key: string) {
		onSelect(key);
		menuOpen = false;
	}

	function toggleMenu(event: MouseEvent) {
		event.stopPropagation();
		menuOpen = !menuOpen;
	}
</script>

<svelte:window
	onclick={() => (menuOpen = false)}
	onkeydown={(event) => event.key === 'Escape' && (menuOpen = false)}
/>

<div class="period-tabs metric-tabs" role="tablist" aria-label="Metric">
	{#each primaryFields as field (field.key)}
		<button
			class={{ active: selectedKey === field.key }}
			style:--tab-color={chartColorFor(field.key)}
			type="button"
			role="tab"
			aria-selected={selectedKey === field.key}
			onclick={() => select(field.key)}
		>
			{field.label}
		</button>
	{/each}
	{#if moreFields.length > 0}
		<div class="metric-more">
			<button
				class={{ active: selectedMore != null, open: menuOpen }}
				style:--tab-color={chartColorFor(selectedMore?.key ?? selectedKey)}
				type="button"
				aria-haspopup="menu"
				aria-expanded={menuOpen}
				onclick={toggleMenu}
			>
				{selectedMore?.label ?? 'More'}
			</button>
			{#if menuOpen}
				<div class="metric-menu">
					{#each moreFields as field (field.key)}
						<button
							class={{ active: selectedKey === field.key }}
							type="button"
							onclick={(event) => {
								event.stopPropagation();
								select(field.key);
							}}
						>
							{field.label}
						</button>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>
