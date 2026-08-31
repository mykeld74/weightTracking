import { parseFlexibleDate } from './dates';
import type { FieldDef } from './fields';

export const csvDateHeaders = [
	'recordedon',
	'date',
	'day',
	'loggedon',
	'logdate',
	'dateandtime',
	'datetime'
] as const;
export const maxCsvBytes = 1_000_000;
export const maxCsvRows = 600;

export type ParsedCsvRow = {
	recordedOn: string;
	values: Record<string, number | null>;
};

export type CsvParseResult = {
	rows: ParsedCsvRow[];
	errors: string[];
};

export function csvTemplate(fields: readonly FieldDef[]): string {
	return ['recordedOn', ...fields.map((field) => field.key)].join(',') + '\n';
}

export function normalizeCsvHeader(value: string): string {
	return value
		.trim()
		.toLowerCase()
		.replace(/\(([^)]*)\)/g, '$1')
		.replace(/[^a-z0-9]+/g, '');
}

function detectDelimiter(text: string): ',' | ';' | '\t' {
	const first = text.split(/\r?\n/).find((line) => line.trim()) ?? '';
	let commas = 0;
	let semicolons = 0;
	let tabs = 0;
	let inQuotes = false;

	for (const char of first) {
		if (char === '"') {
			inQuotes = !inQuotes;
			continue;
		}
		if (inQuotes) continue;
		if (char === ',') commas += 1;
		if (char === ';') semicolons += 1;
		if (char === '\t') tabs += 1;
	}

	if (tabs >= commas && tabs >= semicolons && tabs > 0) return '\t';
	if (semicolons > commas) return ';';
	return ',';
}

export function parseCsv(text: string): string[][] {
	const input = text.replace(/^\uFEFF/, '');
	const delimiter = detectDelimiter(input);
	const rows: string[][] = [];
	let row: string[] = [];
	let cell = '';
	let inQuotes = false;

	for (let index = 0; index < input.length; index += 1) {
		const char = input[index];
		if (inQuotes) {
			if (char === '"') {
				if (input[index + 1] === '"') {
					cell += '"';
					index += 1;
				} else {
					inQuotes = false;
				}
			} else {
				cell += char;
			}
			continue;
		}

		if (char === '"') {
			inQuotes = true;
			continue;
		}

		if (char === delimiter) {
			row.push(cell);
			cell = '';
			continue;
		}

		if (char === '\n' || char === '\r') {
			if (char === '\r' && input[index + 1] === '\n') index += 1;
			row.push(cell);
			cell = '';
			if (row.some((value) => value.trim() !== '')) rows.push(row);
			row = [];
			continue;
		}

		cell += char;
	}

	row.push(cell);
	if (row.some((value) => value.trim() !== '')) rows.push(row);
	return rows;
}

function parseCsvNumber(raw: string): { ok: true; value: number | null } | { ok: false } {
	const cleaned = raw
		.trim()
		.replace(/,/g, '')
		.replace(/%/g, '')
		.replace(/\b(lb|lbs|kg|kcal)\b/gi, '')
		.trim();
	if (cleaned === '' || cleaned === '-' || cleaned === '--' || cleaned === '- -') {
		return { ok: true, value: null };
	}
	const parsed = Number(cleaned);
	if (!Number.isFinite(parsed)) return { ok: false };
	return { ok: true, value: parsed };
}

function headerAliases(field: FieldDef): string[] {
	const aliases = [
		normalizeCsvHeader(field.key),
		normalizeCsvHeader(field.label),
		normalizeCsvHeader(`${field.label}${field.unit}`),
		normalizeCsvHeader(`${field.label} ${field.unit}`)
	];
	// Prefer the lb column from scale exports; never match Weight(kg).
	if (field.key === 'weight') {
		aliases.push('weightlb', 'weightlbs');
	}
	if (field.key === 'skeletalMuscleRate') {
		aliases.push('skeletalmusclerate');
	}
	return aliases;
}

export function parseMetricCsv(text: string, fields: readonly FieldDef[]): CsvParseResult {
	const table = parseCsv(text);
	if (table.length === 0) {
		return { rows: [], errors: ['The CSV is empty.'] };
	}

	const headerRow = table[0].map((header) => normalizeCsvHeader(header));
	const dateIndex = headerRow.findIndex((header) =>
		csvDateHeaders.includes(header as (typeof csvDateHeaders)[number])
	);
	if (dateIndex < 0) {
		return {
			rows: [],
			errors: ['Add a date column named recordedOn or date.']
		};
	}

	const fieldIndex = new Map<string, number>();
	for (const field of fields) {
		const aliases = new Set(headerAliases(field));
		const preferred =
			field.key === 'weight'
				? headerRow.findIndex((header) => header === 'weightlb' || header === 'weightlbs')
				: -1;
		const index = preferred >= 0 ? preferred : headerRow.findIndex((header) => aliases.has(header));
		if (index >= 0) fieldIndex.set(field.key, index);
	}

	if (fieldIndex.size === 0) {
		return {
			rows: [],
			errors: ['No measurement columns matched. Use the template headers.']
		};
	}

	const errors: string[] = [];
	const byDate = new Map<string, ParsedCsvRow>();

	for (let rowNumber = 2; rowNumber <= table.length; rowNumber += 1) {
		const cells = table[rowNumber - 1];
		if (cells.every((cell) => cell.trim() === '')) continue;

		const recordedOn = parseFlexibleDate(cells[dateIndex] ?? '');
		if (!recordedOn) {
			errors.push(`Row ${rowNumber}: invalid date.`);
			continue;
		}

		const values: Record<string, number | null> = {};
		let filledCount = 0;
		let badNumber = false;

		for (const field of fields) {
			const index = fieldIndex.get(field.key);
			if (index == null) {
				values[field.key] = null;
				continue;
			}
			const parsed = parseCsvNumber(cells[index] ?? '');
			if (!parsed.ok) {
				errors.push(`Row ${rowNumber}: ${field.label} is not a number.`);
				badNumber = true;
				break;
			}
			values[field.key] = parsed.value;
			if (parsed.value != null) filledCount += 1;
		}

		if (badNumber) continue;
		if (filledCount === 0) {
			errors.push(`Row ${rowNumber}: enter at least one measurement.`);
			continue;
		}

		byDate.set(recordedOn, { recordedOn, values });
	}

	const rows = [...byDate.values()];
	if (rows.length > maxCsvRows) {
		return {
			rows: [],
			errors: [`CSV can include at most ${maxCsvRows} dates.`]
		};
	}

	return { rows, errors };
}
