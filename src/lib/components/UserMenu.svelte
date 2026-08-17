<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';

	let {
		name,
		admin = false
	}: {
		name: string;
		admin?: boolean;
	} = $props();

	let open = $state(false);
	let accountsActive = $derived(page.url.pathname.startsWith('/admin'));

	function toggle(event: MouseEvent) {
		event.stopPropagation();
		open = !open;
	}

	function close() {
		open = false;
	}
</script>

<svelte:window
	onclick={close}
	onkeydown={(event) => event.key === 'Escape' && close()}
/>

<div class="user-menu">
	<button
		class="user-menu-trigger"
		type="button"
		aria-haspopup="menu"
		aria-expanded={open}
		onclick={toggle}
	>
		{name}
		<svg viewBox="0 0 12 12" aria-hidden="true">
			<path d="M2.5 4.5 L6 8 L9.5 4.5" fill="none" stroke="currentColor" stroke-linecap="round" />
		</svg>
	</button>
	{#if open}
		<div
			class="user-menu-panel"
			role="menu"
			tabindex="-1"
			onclick={(event) => event.stopPropagation()}
			onkeydown={(event) => event.stopPropagation()}
		>
			{#if admin}
				<a
					class={{ active: accountsActive }}
					href={resolve('/admin')}
					role="menuitem"
					onclick={close}
				>
					Accounts
				</a>
			{/if}
			<form method="post" action={resolve('/logout')}>
				<button class="sign-out" type="submit" role="menuitem">Sign out</button>
			</form>
		</div>
	{/if}
</div>

<style>
	.user-menu {
		position: relative;
	}

	.user-menu-trigger {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 6px 8px;
		border: 0;
		border-radius: 10px;
		background: transparent;
		color: var(--ink-soft);
		cursor: pointer;
		font: inherit;
	}

	.user-menu-trigger:hover,
	.user-menu-trigger[aria-expanded='true'] {
		color: var(--ink);
		background: rgba(255, 255, 255, 0.05);
	}

	.user-menu-trigger svg {
		width: 12px;
		height: 12px;
		flex: none;
	}

	.user-menu-panel {
		position: absolute;
		top: calc(100% + 8px);
		right: 0;
		z-index: 12;
		min-width: 180px;
		padding: 6px;
		background: var(--bg-elev);
		border: 1px solid var(--line-strong);
		border-radius: 12px;
		box-shadow: 0 16px 40px rgba(0, 0, 0, 0.35);
	}

	.user-menu-panel a,
	.user-menu-panel button {
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
		text-decoration: none;
	}

	.user-menu-panel a:hover,
	.user-menu-panel a.active,
	.user-menu-panel button:hover {
		background: rgba(255, 255, 255, 0.05);
		color: var(--ink);
	}

	.sign-out {
		color: var(--ink-soft);
	}
</style>
