export function todayIsoDate(): string {
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, '0');
	const day = String(now.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

export function yearBounds(year: number): { from: string; to: string } {
	return {
		from: `${year}-01-01`,
		to: `${year}-12-31`
	};
}

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: string): boolean {
	if (!isoDatePattern.test(value)) return false;
	const [year, month, day] = value.split('-').map(Number);
	return toIsoDate(year, month, day) === value;
}

export function parseFlexibleDate(value: string): string | null {
	const raw = value.trim();
	if (!raw) return null;
	if (isIsoDate(raw)) return raw;

	const isoSlash = raw.replace(/\//g, '-');
	if (isIsoDate(isoSlash)) return isoSlash;

	// Scale exports: "2026.01.05 10:39 PM"
	const dotted = raw.match(/^(\d{4})\.(\d{1,2})\.(\d{1,2})(?:\b|$)/);
	if (dotted) {
		const year = Number(dotted[1]);
		const month = Number(dotted[2]);
		const day = Number(dotted[3]);
		const iso = toIsoDate(year, month, day);
		const expected = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
		return iso === expected ? iso : null;
	}

	const match = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
	if (!match) return null;

	const month = Number(match[1]);
	const day = Number(match[2]);
	let year = Number(match[3]);
	if (year < 100) year += year >= 70 ? 1900 : 2000;

	const iso = toIsoDate(year, month, day);
	const expected = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
	return iso === expected ? iso : null;
}

export type DateRange = {
	from: string;
	to: string;
	year: number;
	isCustom: boolean;
};

export function parseDateRange(url: URL): DateRange {
	const currentYear = new Date().getFullYear();
	const yearParam = url.searchParams.get('year');
	const fromParam = url.searchParams.get('from');
	const toParam = url.searchParams.get('to');

	const parsedYear = yearParam ? Number(yearParam) : currentYear;
	const year = Number.isInteger(parsedYear) && parsedYear >= 1970 ? parsedYear : currentYear;
	const defaults = yearBounds(year);

	const from = fromParam && isIsoDate(fromParam) ? fromParam : defaults.from;
	const to = toParam && isIsoDate(toParam) ? toParam : defaults.to;
	const orderedFrom = from <= to ? from : to;
	const orderedTo = from <= to ? to : from;
	const isCustom = orderedFrom !== defaults.from || orderedTo !== defaults.to;

	return { from: orderedFrom, to: orderedTo, year, isCustom };
}

export function formatDisplayDate(isoDate: string): string {
	const parsed = new Date(`${isoDate}T00:00:00`);
	if (Number.isNaN(parsed.getTime())) return isoDate;

	return parsed.toLocaleDateString(undefined, {
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	});
}

export function formatShortDate(isoDate: string, includeYear = false): string {
	const parsed = new Date(`${isoDate}T00:00:00`);
	if (Number.isNaN(parsed.getTime())) return isoDate;

	return parsed.toLocaleDateString(undefined, {
		month: 'short',
		day: 'numeric',
		year: includeYear ? 'numeric' : undefined
	});
}

export function formatAxisDate(isoDate: string, includeYear: boolean): string {
	const parsed = new Date(`${isoDate}T00:00:00`);
	if (Number.isNaN(parsed.getTime())) return isoDate;

	return parsed.toLocaleDateString(undefined, {
		month: 'short',
		day: 'numeric',
		year: includeYear ? 'numeric' : undefined
	});
}

export type CalendarCell = {
	iso: string;
	inMonth: boolean;
};

export function toIsoDate(year: number, month: number, day: number): string {
	const parsed = new Date(year, month - 1, day);
	const nextYear = parsed.getFullYear();
	const nextMonth = String(parsed.getMonth() + 1).padStart(2, '0');
	const nextDay = String(parsed.getDate()).padStart(2, '0');
	return `${nextYear}-${nextMonth}-${nextDay}`;
}

export function addDaysIso(isoDate: string, days: number): string {
	const parsed = new Date(`${isoDate}T00:00:00`);
	parsed.setDate(parsed.getDate() + days);
	return toIsoDate(parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate());
}

/** Sunday-start week, matching the weekday tabs. */
export function weekStartIso(isoDate: string): string {
	const parsed = new Date(`${isoDate}T00:00:00`);
	parsed.setDate(parsed.getDate() - parsed.getDay());
	return toIsoDate(parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate());
}

export function shiftMonth(
	year: number,
	month: number,
	delta: number
): { year: number; month: number } {
	const parsed = new Date(year, month - 1 + delta, 1);
	return { year: parsed.getFullYear(), month: parsed.getMonth() + 1 };
}

export function monthCells(year: number, month: number): CalendarCell[] {
	const first = new Date(year, month - 1, 1);
	const startWeekday = first.getDay();
	const daysInMonth = new Date(year, month, 0).getDate();
	const prevMonthDays = new Date(year, month - 1, 0).getDate();
	const cells: CalendarCell[] = [];

	for (let index = startWeekday - 1; index >= 0; index -= 1) {
		cells.push({
			iso: toIsoDate(year, month - 1, prevMonthDays - index),
			inMonth: false
		});
	}

	for (let day = 1; day <= daysInMonth; day += 1) {
		cells.push({ iso: toIsoDate(year, month, day), inMonth: true });
	}

	while (cells.length < 42) {
		const overflow = cells.length - startWeekday - daysInMonth + 1;
		cells.push({ iso: toIsoDate(year, month + 1, overflow), inMonth: false });
	}

	return cells;
}

export function yearOptions(currentYear = new Date().getFullYear()): number[] {
	const years: number[] = [];
	for (let year = currentYear; year >= currentYear - 6; year -= 1) {
		years.push(year);
	}
	return years;
}
