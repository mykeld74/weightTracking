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
				class={['more-trigger', { active: selectedMore != null, open: menuOpen }]}
				style:--tab-color={chartColorFor(selectedMore?.key ?? selectedKey)}
				type="button"
				aria-haspopup="menu"
				aria-expanded={menuOpen}
				aria-label={selectedMore?.label ?? 'More'}
				onclick={toggleMenu}
			>
				<span class="more-label">{selectedMore?.label ?? 'More'}</span>
				<svg class="more-arrow" viewBox="0 0 12 12" aria-hidden="true">
					<path
						d="M2.5 4.5 L6 8 L9.5 4.5"
						fill="none"
						stroke="currentColor"
						stroke-linecap="round"
					/>
				</svg>
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

<style>
	.more-trigger {
		anchor-name: --metric-more;
	}

	.more-arrow {
		display: none;
		width: 12px;
		height: 12px;
	}

	.metric-menu {
		right: 0;
		left: auto;
		max-width: calc(100vw - 24px);
	}

	@supports (anchor-name: --metric-more) {
		.metric-menu {
			position: fixed;
			position-anchor: --metric-more;
			position-area: bottom span-left;
			position-try-fallbacks: flip-inline;
			position-try: flip-inline;
			top: unset;
			right: unset;
			left: unset;
			margin-top: 8px;
		}
	}

	@media (max-width: 720px) {
		.metric-tabs {
			flex-wrap: nowrap;
			justify-content: space-between;
			gap: 0 12px;
		}

		.metric-tabs > button,
		.more-label {
			white-space: nowrap;
		}

		.more-label {
			display: none;
		}

		.more-arrow {
			display: block;
		}

		.metric-more > button {
			display: inline-flex;
			align-items: center;
		}

		.more-trigger.open .more-arrow {
			transform: rotate(180deg);
		}
	}
</style>
