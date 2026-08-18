export type PeriodSelection =
	| { type: 'overall' }
	| { type: 'year'; year: number }
	| { type: 'custom'; from: string; to: string };

export function yearsInEntries(entries: Array<{ recordedOn: string }>): number[] {
	const years = new Set<number>();
	for (const entry of entries) {
		const year = Number(entry.recordedOn.slice(0, 4));
		if (Number.isInteger(year)) years.add(year);
	}
	return [...years].sort((a, b) => a - b);
}

export function filterEntries<T extends { recordedOn: string }>(
	entries: T[],
	period: PeriodSelection
): T[] {
	if (period.type === 'overall') return entries;
	if (period.type === 'year') {
		const prefix = `${period.year}-`;
		return entries.filter((entry) => entry.recordedOn.startsWith(prefix));
	}
	return entries.filter(
		(entry) => entry.recordedOn >= period.from && entry.recordedOn <= period.to
	);
}

export const weekdayOptions = [
	{ key: 0, short: 'Su', label: 'Sunday' },
	{ key: 1, short: 'Mo', label: 'Monday' },
	{ key: 2, short: 'Tu', label: 'Tuesday' },
	{ key: 3, short: 'We', label: 'Wednesday' },
	{ key: 4, short: 'Th', label: 'Thursday' },
	{ key: 5, short: 'Fr', label: 'Friday' },
	{ key: 6, short: 'Sa', label: 'Saturday' }
] as const;

export type WeekdayKey = (typeof weekdayOptions)[number]['key'];

export function weekdayFromIso(isoDate: string): WeekdayKey | null {
	const day = new Date(`${isoDate}T00:00:00`).getDay();
	if (!Number.isInteger(day) || day < 0 || day > 6) return null;
	return day as WeekdayKey;
}

/** Empty means every day — the graph is unfiltered. */
export function filterEntriesByWeekdays<T extends { recordedOn: string }>(
	entries: T[],
	weekdays: readonly WeekdayKey[]
): T[] {
	if (weekdays.length === 0 || weekdays.length === 7) return entries;
	const allowed = new Set(weekdays);
	return entries.filter((entry) => {
		const day = weekdayFromIso(entry.recordedOn);
		return day != null && allowed.has(day);
	});
}
