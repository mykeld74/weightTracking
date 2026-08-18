<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatDisplayDate } from '$lib/tracking/dates';
	import type { ActionData, PageServerData } from './$types';

	let { data, form }: { data: PageServerData; form: ActionData } = $props();

	let pending = $derived(data.accounts.filter((account) => !account.approvedAt));
	let active = $derived(data.accounts.filter((account) => account.approvedAt));

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
		<p class="flash">{form.message}</p>
	{/if}

	<section class="card">
		<div class="section-head">
			<div>
				<h2>Awaiting approval</h2>
				<p>
					{pending.length === 0
						? 'Nothing waiting.'
						: `${pending.length} account${pending.length === 1 ? '' : 's'} cannot sign in yet.`}
				</p>
			</div>
		</div>
		{#if pending.length === 0}
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
				<p>{active.length} approved · admins can manage accounts but never see others’ data</p>
			</div>
		</div>
		<ul class="account-list">
			{#each active as account (account.id)}
				{@const self = account.id === data.adminId}
				<li>
					<span class="who">
						<strong>
							{account.name}
							{#if account.role === 'admin'}<span class="badge">Admin</span>{/if}
							{#if self}<span class="badge you">You</span>{/if}
						</strong>
						<small>{account.email}</small>
						<small
							>Approved {formatDisplayDate(isoDay(account.approvedAt ?? account.createdAt))}</small
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
	</section>
</div>

<style>
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
