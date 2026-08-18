import { sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { bodyComposition, bodyMeasurement } from '$lib/server/db/schema';
import { maxCsvBytes, type ParsedCsvRow } from '$lib/tracking/csv';
import type { FieldDef } from '$lib/tracking/fields';
import { compositionFields, measurementFields } from '$lib/tracking/fields';

export async function readCsvText(
	formData: FormData
): Promise<{ ok: true; text: string } | { ok: false; importMessage: string }> {
	const file = formData.get('csv');
	if (!(file instanceof File) || file.size === 0) {
		return { ok: false, importMessage: 'Choose a CSV file.' };
	}
	if (file.size > maxCsvBytes) {
		return { ok: false, importMessage: 'CSV must be 1 MB or smaller.' };
	}

	return { ok: true, text: await file.text() };
}

function importSummary(count: number, errors: string[]): string {
	const skipped =
		errors.length === 0 ? '' : ` Skipped ${errors.length}: ${errors.slice(0, 4).join(' ')}`;
	const extra = errors.length > 4 ? ' …' : '';
	return `Imported ${count} ${count === 1 ? 'entry' : 'entries'}.${skipped}${extra}`;
}

function coalesceExcluded(
	table: typeof bodyComposition | typeof bodyMeasurement,
	fields: readonly FieldDef[]
) {
	const set: Record<string, ReturnType<typeof sql>> = {};
	for (const field of fields) {
		const column = table[field.key as keyof typeof table] as { name: string };
		set[field.key] = sql`coalesce(excluded.${sql.identifier(column.name)}, ${column})`;
	}
	return set;
}

async function insertChunks<T extends Record<string, unknown>>(
	insert: (chunk: T[]) => Promise<unknown>,
	rows: T[]
) {
	const chunkSize = 80;
	for (let index = 0; index < rows.length; index += chunkSize) {
		await insert(rows.slice(index, index + chunkSize));
	}
}

export async function importCompositionCsv(userId: string, rows: ParsedCsvRow[]) {
	const values = rows.map((row) => ({
		id: crypto.randomUUID(),
		userId,
		recordedOn: row.recordedOn,
		...row.values
	}));

	await insertChunks(async (chunk) => {
		await db
			.insert(bodyComposition)
			.values(chunk)
			.onConflictDoUpdate({
				target: [bodyComposition.userId, bodyComposition.recordedOn],
				set: coalesceExcluded(bodyComposition, compositionFields)
			});
	}, values);
}

export async function importMeasurementCsv(userId: string, rows: ParsedCsvRow[]) {
	const values = rows.map((row) => ({
		id: crypto.randomUUID(),
		userId,
		recordedOn: row.recordedOn,
		...row.values
	}));

	await insertChunks(async (chunk) => {
		await db
			.insert(bodyMeasurement)
			.values(chunk)
			.onConflictDoUpdate({
				target: [bodyMeasurement.userId, bodyMeasurement.recordedOn],
				set: coalesceExcluded(bodyMeasurement, measurementFields)
			});
	}, values);
}

export function csvImportResult(count: number, errors: string[]) {
	return {
		success: true as const,
		importCount: count,
		importMessage: importSummary(count, errors)
	};
}
