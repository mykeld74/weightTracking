export const popularMedications = [
	'Ozempic',
	'Wegovy',
	'Mounjaro',
	'Zepbound',
	'Saxenda',
	'Trulicity'
] as const;

export const commonLocations = [
	'Left abdomen',
	'Right abdomen',
	'Left thigh',
	'Right thigh',
	'Left arm',
	'Right arm',
	'Left hip',
	'Right hip'
] as const;

export type Glp1Entry = {
	id: string;
	recordedOn: string;
	medication: string;
	dosage: number;
	location: string;
};

export type Glp1Regimen = {
	id: string;
	medication: string;
	startedOn: string;
};

export function mergeOptions(popular: readonly string[], extras: Iterable<string>): string[] {
	const seen = new Set<string>();
	const options: string[] = [];

	for (const item of [...popular, ...extras]) {
		const next = item.trim();
		if (!next) continue;
		const key = next.toLowerCase();
		if (seen.has(key)) continue;
		seen.add(key);
		options.push(next);
	}

	return options;
}

export function uniqueValues(
	entries: Array<{ medication: string; location: string }>,
	key: 'medication' | 'location'
): string[] {
	return mergeOptions(
		[],
		entries.map((entry) => entry[key])
	);
}

export function inferRegimens(
	entries: Glp1Entry[]
): Array<{ medication: string; startedOn: string }> {
	const chronological = [...entries].sort((a, b) => a.recordedOn.localeCompare(b.recordedOn));
	const regimens: Array<{ medication: string; startedOn: string }> = [];
	let current: string | null = null;

	for (const entry of chronological) {
		if (entry.medication === current) continue;
		current = entry.medication;
		regimens.push({ medication: entry.medication, startedOn: entry.recordedOn });
	}

	return regimens;
}

export function medicationForDate(regimens: Glp1Regimen[], date: string): string | null {
	const covering = regimens
		.filter((regimen) => regimen.startedOn <= date)
		.sort((a, b) => a.startedOn.localeCompare(b.startedOn));
	if (covering.length > 0) return covering[covering.length - 1].medication;

	const earliest = [...regimens].sort((a, b) => a.startedOn.localeCompare(b.startedOn));
	return earliest[0]?.medication ?? null;
}

export function currentRegimen(regimens: Glp1Regimen[], today: string): Glp1Regimen | null {
	const covering = regimens
		.filter((regimen) => regimen.startedOn <= today)
		.sort((a, b) => a.startedOn.localeCompare(b.startedOn));
	if (covering.length > 0) return covering[covering.length - 1];

	const latest = [...regimens].sort((a, b) => b.startedOn.localeCompare(a.startedOn));
	return latest[0] ?? null;
}

export function lastDoseFor(entries: Glp1Entry[]): number | null {
	const recent = [...entries].sort((a, b) => b.recordedOn.localeCompare(a.recordedOn));
	const value = recent[0]?.dosage;
	const parsed = typeof value === 'number' ? value : Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

export function lastLocationFor(entries: Glp1Entry[]): string {
	const recent = [...entries].sort((a, b) => b.recordedOn.localeCompare(a.recordedOn));
	return recent[0]?.location ?? '';
}

export function alternateLocation(location: string): string {
	if (/\bleft\b/i.test(location)) {
		return location.replace(/\bleft\b/i, (match) => (match[0] === 'l' ? 'right' : 'Right'));
	}
	if (/\bright\b/i.test(location)) {
		return location.replace(/\bright\b/i, (match) => (match[0] === 'r' ? 'left' : 'Left'));
	}
	return location;
}

export function nextLocationFor(entries: Glp1Entry[]): string {
	const last = lastLocationFor(entries);
	return last ? alternateLocation(last) : '';
}

export type InjectionChange = {
	date: string;
	medication: string;
	dosage: number;
};

export function injectionChanges(
	entries: Array<{ recordedOn: string; medication: string; dosage: number }>
): InjectionChange[] {
	const chronological = [...entries].sort((a, b) => a.recordedOn.localeCompare(b.recordedOn));
	const changes: InjectionChange[] = [];
	let previous: (typeof chronological)[number] | null = null;

	for (const entry of chronological) {
		const medicationChanged =
			!previous || previous.medication.toLowerCase() !== entry.medication.toLowerCase();
		const dosageChanged = !previous || previous.dosage !== entry.dosage;
		if (medicationChanged || dosageChanged) {
			changes.push({
				date: entry.recordedOn,
				medication: entry.medication,
				dosage: entry.dosage
			});
		}
		previous = entry;
	}

	return changes;
}
