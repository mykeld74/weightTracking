<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatDisplayDate } from '$lib/tracking/dates';

	let {
		invites
	}: {
		invites: Array<{ id: string; email: string; expiresAt: Date | string }>;
	} = $props();

	function isoDay(value: Date | string): string {
		return new Date(value).toISOString().slice(0, 10);
	}
</script>

<section class="card">
	<div class="section-head">
		<div>
			<h2>Invite someone</h2>
			<p>They get an email, create a password, and can start using Body Ledger.</p>
		</div>
	</div>
	<form class="form-row" method="post" action="?/invite" use:enhance>
		<label class="field">
			Email
			<input type="email" name="email" autocomplete="email" required />
		</label>
		<button class="primary-btn" type="submit">Send invitation</button>
	</form>
	{#if invites.length === 0}
		<p class="empty">No open invitations.</p>
	{:else}
		<ul class="invite-list">
			{#each invites as invite (invite.id)}
				<li>
					<span class="who">
						<strong>{invite.email}</strong>
						<small>Expires {formatDisplayDate(isoDay(invite.expiresAt))}</small>
					</span>
					<span class="actions">
						<form method="post" action="?/invite" use:enhance>
							<input type="hidden" name="email" value={invite.email} />
							<button class="ghost-btn" type="submit">Resend</button>
						</form>
						<form method="post" action="?/cancelInvite" use:enhance>
							<input type="hidden" name="id" value={invite.id} />
							<button class="ghost-btn" type="submit">Cancel</button>
						</form>
					</span>
				</li>
			{/each}
		</ul>
	{/if}
</section>

<style>
	.form-row {
		margin: 0 0 16px;
	}

	.form-row .field {
		flex: 1;
		min-width: 220px;
		margin: 0;
	}

	.invite-list {
		list-style: none;
		display: grid;
		gap: 10px;
		margin: 0;
		padding: 0;
	}

	.invite-list li {
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
		font-size: 0.98rem;
	}

	.who small {
		color: var(--ink-soft);
		font-size: 0.82rem;
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
		.invite-list li {
			align-items: flex-start;
		}
	}
</style>
