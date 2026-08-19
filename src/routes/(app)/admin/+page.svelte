<script lang="ts">
	import { enhance } from '$app/forms';
	import InvitePanel from '$lib/components/InvitePanel.svelte';
	import { formatDisplayDate } from '$lib/tracking/dates';
	import Skeleton from '$lib/components/Skeleton.svelte';
	import { asyncData } from '$lib/client/asyncData.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const admin = asyncData(
		() => `admin-accounts:${data.user.id}`,
		() => data.admin
	);
	let accounts = $derived(admin.current?.accounts ?? []);
	let pending = $derived(accounts.filter((account) => !account.approvedAt));
	let active = $derived(accounts.filter((account) => account.approvedAt));

	function isoDay(value: Date | string): string {
		return new Date(value).toISOString().slice(0, 10);
	}

	function confirmDelete(name: string, email: string) {
		return (event: SubmitEvent) => {
			const ok = confirm(
				`Delete ${name} (${email})?\n\nThis permanently removes the account and every entry, measurement, and photo it owns. This cannot be undone.`
			);
			if (!ok) event.preventDefault();
		};
	}
</script>

<svelte:head>
	<title>Body Ledger · Accounts</title>
</svelte:head>

<div class="page-grid">
	{#if form?.message}
		<p class={['flash', { ok: Boolean(form.success) }]}>{form.message}</p>
	{/if}

	{#if admin.current}
		<div class={{ revalidating: admin.isStale }}>
			<InvitePanel invites={admin.current.invites} />
		</div>
	{:else if admin.error}
		<p class="flash">{admin.error}</p>
	{:else}
		<div class="card panel-skeleton">
			<Skeleton height="20px" width="40%" />
			<Skeleton height="44px" />
		</div>
	{/if}

	<section class="card">
		<div class="section-head">
			<div>
				<h2>Awaiting approval</h2>
				<p>
					{#if !admin.current}
						Loading accounts…
					{:else if pending.length === 0}
						Nothing waiting. Revoked accounts show up here.
					{:else}
						{pending.length} account{pending.length === 1 ? '' : 's'} cannot sign in yet.
					{/if}
				</p>
			</div>
		</div>
		{#if !admin.current}
			<div class="panel-skeleton">
				{#each { length: 2 }, row (row)}
					<Skeleton height="52px" />
				{/each}
			</div>
		{:else if pending.length === 0}
			<p class="empty">No pending requests.</p>
		{:else}
			<ul class="account-list">
				{#each pending as account (account.id)}
					<li>
						<span class="who">
							<strong>{account.name}</strong>
							<small>{account.email}</small>
							<small>Requested {formatDisplayDate(isoDay(account.createdAt))}</small>
						</span>
						<span class="actions">
							<form method="post" action="?/approve" use:enhance>
								<input type="hidden" name="id" value={account.id} />
								<button class="primary-btn" type="submit">Approve</button>
							</form>
							<form
								method="post"
								action="?/remove"
								use:enhance
								onsubmit={confirmDelete(account.name, account.email)}
							>
								<input type="hidden" name="id" value={account.id} />
								<button class="danger-btn" type="submit">Delete</button>
							</form>
						</span>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<section class="card">
		<div class="section-head">
			<div>
				<h2>Active accounts</h2>
				<p>
					{#if admin.current}
						{active.length} approved · admins can manage accounts but never see others’ data
					{:else}
						Loading accounts…
					{/if}
				</p>
			</div>
		</div>
		{#if !admin.current}
			<div class="panel-skeleton">
				{#each { length: 3 }, row (row)}
					<Skeleton height="52px" />
				{/each}
			</div>
		{:else}
			<ul class="account-list">
				{#each active as account (account.id)}
					{@const self = account.id === data.user.id}
					<li>
						<span class="who">
							<strong>
								{account.name}
								{#if account.role === 'admin'}<span class="badge">Admin</span>{/if}
								{#if self}<span class="badge you">You</span>{/if}
							</strong>
							<small>{account.email}</small>
							<small
								>Approved {formatDisplayDate(
									isoDay(account.approvedAt ?? account.createdAt)
								)}</small
							>
						</span>
						{#if !self}
							<span class="actions">
								{#if account.role === 'admin'}
									<form method="post" action="?/demote" use:enhance>
										<input type="hidden" name="id" value={account.id} />
										<button class="ghost-btn" type="submit">Remove admin</button>
									</form>
								{:else}
									<form method="post" action="?/promote" use:enhance>
										<input type="hidden" name="id" value={account.id} />
										<button class="ghost-btn" type="submit">Make admin</button>
									</form>
								{/if}
								<form method="post" action="?/revoke" use:enhance>
									<input type="hidden" name="id" value={account.id} />
									<button class="ghost-btn" type="submit">Revoke access</button>
								</form>
								<form
									method="post"
									action="?/remove"
									use:enhance
									onsubmit={confirmDelete(account.name, account.email)}
								>
									<input type="hidden" name="id" value={account.id} />
									<button class="danger-btn" type="submit">Delete</button>
								</form>
							</span>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</div>

<style>
	.panel-skeleton {
		display: grid;
		gap: 12px;
	}

	.revalidating {
		animation: dim-refreshing 140ms ease-out 350ms forwards;
	}

	@keyframes dim-refreshing {
		to {
			opacity: 0.6;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.revalidating {
			animation: none;
			opacity: 0.6;
		}
	}

	.account-list {
		list-style: none;
		display: grid;
		gap: 10px;
		margin: 0;
		padding: 0;
	}

	.account-list li {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		flex-wrap: wrap;
		padding: 12px 14px;
		border: 1px solid var(--line);
		border-radius: 12px;
		background: var(--bg);
	}

	.who {
		display: grid;
		gap: 2px;
		min-width: 0;
	}

	.who strong {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 0.98rem;
	}

	.who small {
		color: var(--ink-soft);
		font-size: 0.82rem;
	}

	.badge {
		padding: 2px 8px;
		border-radius: 999px;
		border: 1px solid color-mix(in srgb, var(--accent) 55%, transparent);
		color: var(--accent);
		font-size: 0.68rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.badge.you {
		border-color: var(--line-strong);
		color: var(--ink-soft);
	}

	.actions {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}

	.actions form {
		margin: 0;
	}

	@media (max-width: 700px) {
		.account-list li {
			align-items: flex-start;
		}
	}
</style>
