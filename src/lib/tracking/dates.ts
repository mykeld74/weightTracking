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
	const parsed = new Date(`${value}T00:00:00`);
	return !Number.isNaN(parsed.getTime());
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
