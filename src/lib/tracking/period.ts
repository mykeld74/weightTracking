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
