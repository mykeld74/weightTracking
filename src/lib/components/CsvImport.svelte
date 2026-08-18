<script lang="ts">
	import { enhance } from '$app/forms';
	import { csvTemplate } from '$lib/tracking/csv';
	import type { FieldDef } from '$lib/tracking/fields';

	let {
		fields,
		message = '',
		count
	}: {
		fields: readonly FieldDef[];
		message?: string;
		count?: number;
	} = $props();

	let fileLabel = $state('No file chosen');
	let importing = $state(false);

	function onFile(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		fileLabel = input.files?.[0]?.name ?? 'No file chosen';
	}

	function downloadTemplate() {
		const blob = new Blob([csvTemplate(fields)], { type: 'text/csv;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = 'entries-template.csv';
		link.click();
		URL.revokeObjectURL(url);
	}

	function afterImport() {
		importing = true;
		return async ({ update }: { update: () => Promise<void> }) => {
			importing = false;
			fileLabel = 'No file chosen';
			await update();
		};
	}
</script>

<details class="csv-import" {...message ? { open: true } : {}}>
	<summary>Import CSV</summary>
	<p class="hint">
		One row per date. Use <code>recordedOn</code> or <code>date</code>, plus any of the field
		headers. Existing dates are updated; empty cells are left unchanged.
	</p>
	{#if message}
		<p class={['flash', count != null && 'ok']}>{message}</p>
	{/if}
	<form method="post" action="?/importCsv" enctype="multipart/form-data" use:enhance={afterImport}>
		<label class="file-field">
			<span class="file-btn">Choose CSV</span>
			<input type="file" name="csv" accept=".csv,text/csv,text/plain" required onchange={onFile} />
			<span class="file-name">{fileLabel}</span>
		</label>
		<button class="primary-btn" type="submit" disabled={importing}>
			{importing ? 'Importing…' : 'Import entries'}
		</button>
		<button class="ghost-btn" type="button" onclick={downloadTemplate}>Download template</button>
	</form>
</details>

<style>
	.csv-import {
		margin-top: 18px;
		padding-top: 16px;
		border-top: 1px solid var(--line);
	}

	.csv-import summary {
		cursor: pointer;
		color: var(--ink-soft);
		font-size: 0.9rem;
		font-weight: 500;
		width: fit-content;
		list-style: none;
		display: inline-flex;
		align-items: center;
		gap: 8px;
		user-select: none;
	}

	.csv-import summary::-webkit-details-marker {
		display: none;
	}

	.csv-import summary::before {
		content: '';
		width: 0.42em;
		height: 0.42em;
		border-right: 1.5px solid currentColor;
		border-bottom: 1.5px solid currentColor;
		transform: rotate(-45deg);
		transition: transform 160ms ease;
	}

	.csv-import[open] summary::before {
		transform: rotate(45deg);
	}

	.csv-import summary:hover {
		color: var(--ink);
	}

	.hint {
		margin: 12px 0 14px;
		color: var(--ink-soft);
		font-size: 0.88rem;
		max-width: 52ch;
	}

	.hint code {
		font-size: 0.84em;
	}

	form {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		align-items: center;
	}

	.file-field {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		min-width: 0;
	}

	.file-field input {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	.file-btn {
		border: 1px solid var(--line-strong);
		border-radius: 999px;
		padding: 10px 16px;
		color: var(--ink-soft);
		cursor: pointer;
	}

	.file-field:hover .file-btn {
		color: var(--ink);
		filter: brightness(1.08);
	}

	.file-name {
		color: var(--ink-soft);
		font-size: 0.86rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		max-width: 18ch;
	}

	.primary-btn:disabled {
		opacity: 0.65;
		cursor: wait;
	}
</style>
