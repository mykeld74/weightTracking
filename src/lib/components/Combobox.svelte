<script lang="ts">
	let {
		value = $bindable(''),
		label,
		name,
		options,
		placeholder = 'Type to search or add'
	}: {
		value: string;
		label: string;
		name: string;
		options: readonly string[];
		placeholder?: string;
	} = $props();

	const uid = $props.id();
	const listId = `combo-list-${uid}`;

	let open = $state(false);
	let highlight = $state(0);
	let root: HTMLDivElement | undefined;

	type Choice = { label: string; value: string; custom: boolean };

	let choices = $derived.by((): Choice[] => {
		const query = value.trim();
		const needle = query.toLowerCase();
		const matches = needle
			? options.filter((option) => option.toLowerCase().includes(needle))
			: [...options];
		const exact = matches.some((option) => option.toLowerCase() === needle);
		const items = matches.map((option) => ({
			label: option,
			value: option,
			custom: false
		}));
		if (query && !exact) {
			items.push({ label: `Add “${query}”`, value: query, custom: true });
		}
		return items;
	});

	function openList() {
		open = true;
		const exact = choices.findIndex(
			(choice) => choice.value.toLowerCase() === value.trim().toLowerCase()
		);
		highlight = exact >= 0 ? exact : 0;
	}

	function closeList() {
		open = false;
	}

	function pick(choice: Choice) {
		value = choice.value;
		closeList();
	}

	function attachRoot(element: HTMLDivElement) {
		root = element;
		return () => {
			if (root === element) root = undefined;
		};
	}

	function onWindowClick(event: MouseEvent) {
		if (!root) return;
		if (event.target instanceof Node && root.contains(event.target)) return;
		closeList();
	}

	function onKey(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			closeList();
			return;
		}
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			if (!open) {
				openList();
				return;
			}
			highlight = Math.min(highlight + 1, Math.max(0, choices.length - 1));
			return;
		}
		if (event.key === 'ArrowUp') {
			event.preventDefault();
			if (!open) {
				openList();
				return;
			}
			highlight = Math.max(highlight - 1, 0);
			return;
		}
		if (event.key === 'Enter' && open) {
			const choice = choices[highlight];
			if (!choice) return;
			event.preventDefault();
			pick(choice);
		}
	}
</script>

<svelte:window onclick={onWindowClick} />

<div class="combo" {@attach attachRoot}>
	<label class="field-label" for="combo-input-{uid}">{label}</label>
	<input
		id="combo-input-{uid}"
		class="combo-input"
		{name}
		{placeholder}
		autocomplete="off"
		role="combobox"
		aria-autocomplete="list"
		aria-expanded={open}
		aria-controls={listId}
		aria-activedescendant={open && choices[highlight] ? `${listId}-${highlight}` : undefined}
		bind:value
		onfocus={openList}
		oninput={openList}
		onkeydown={onKey}
		required
	/>
	{#if open && choices.length > 0}
		<ul class="combo-list" id={listId} role="listbox">
			{#each choices as choice, index (choice.custom ? `custom:${choice.value}` : choice.value)}
				<li>
					<button
						id={`${listId}-${index}`}
						class={{ active: index === highlight, custom: choice.custom }}
						type="button"
						role="option"
						aria-selected={index === highlight}
						onpointerdown={(event) => event.preventDefault()}
						onclick={() => pick(choice)}
					>
						{choice.label}
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.combo {
		position: relative;
		min-width: 180px;
	}

	.field-label {
		display: block;
		margin-bottom: 6px;
		font-size: 0.86rem;
		color: var(--ink-soft);
	}

	.combo-input {
		width: 100%;
		border: 1px solid var(--line-strong);
		background: var(--bg);
		border-radius: 12px;
		padding: 10px 12px;
		color: var(--ink);
	}

	.combo-input:focus {
		outline: 2px solid var(--accent-soft);
		border-color: var(--accent);
	}

	.combo-list {
		position: absolute;
		top: calc(100% + 8px);
		left: 0;
		right: 0;
		z-index: 12;
		margin: 0;
		padding: 6px;
		list-style: none;
		background: var(--bg-elev);
		border: 1px solid var(--line-strong);
		border-radius: 12px;
		box-shadow: 0 16px 40px rgba(0, 0, 0, 0.35);
		max-height: 240px;
		overflow: auto;
	}

	.combo-list button {
		display: block;
		width: 100%;
		appearance: none;
		background: none;
		border: 0;
		border-radius: 8px;
		padding: 9px 12px;
		color: var(--ink-soft);
		cursor: pointer;
		font: inherit;
		text-align: left;
	}

	.combo-list button:hover,
	.combo-list button.active {
		background: rgba(255, 255, 255, 0.05);
		color: var(--ink);
	}

	.combo-list button.custom {
		color: var(--accent);
	}
</style>
