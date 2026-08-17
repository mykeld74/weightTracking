import { fail } from '@sveltejs/kit';
import type { FieldDef } from '$lib/tracking/fields';
import { isIsoDate, todayIsoDate } from '$lib/tracking/dates';

export function parseOptionalNumber(value: FormDataEntryValue | null): number | null {
	if (value == null) return null;
	const raw = value.toString().trim();
	if (raw === '') return null;
	const parsed = Number(raw);
	return Number.isFinite(parsed) ? parsed : null;
}

export function readMetricValues(formData: FormData, fields: readonly FieldDef[]) {
	const values: Record<string, number | null> = {};
	let filledCount = 0;

	for (const field of fields) {
		const parsed = parseOptionalNumber(formData.get(field.key));
		values[field.key] = parsed;
		if (parsed != null) filledCount += 1;
	}

	return { values, filledCount };
}

export function readRecordedOn(formData: FormData): string | null {
	const raw = formData.get('recordedOn')?.toString() ?? '';
	if (!isIsoDate(raw)) return null;
	return raw;
}

export function metricFormError(message: string, recordedOn = todayIsoDate()) {
	return fail(400, { message, recordedOn });
}

export function readRequiredText(formData: FormData, key: string, maxLength = 80): string | null {
	const raw = formData.get(key)?.toString().trim() ?? '';
	if (!raw || raw.length > maxLength) return null;
	return raw;
}
