import { weekStartIso } from './dates';

export type RangeStats = {
	high: number;
	highDate: string;
	low: number;
	lowDate: string;
	average: number;
	count: number;
	first: ChartPoint;
	last: ChartPoint;
	change: number;
};

export type ChartPoint = {
	date: string;
	value: number;
};

export function computeRangeStats(points: ChartPoint[]): RangeStats | null {
	if (points.length === 0) return null;

	let high = points[0];
	let low = points[0];
	let sum = 0;

	for (const point of points) {
		if (point.value > high.value) high = point;
		if (point.value < low.value) low = point;
		sum += point.value;
	}

	const first = points[0];
	const last = points[points.length - 1];

	return {
		high: high.value,
		highDate: high.date,
		low: low.value,
		lowDate: low.date,
		average: sum / points.length,
		count: points.length,
		first,
		last,
		change: last.value - first.value
	};
}

export function pointsForField(entries: Array<Record<string, unknown>>, key: string): ChartPoint[] {
	const points: ChartPoint[] = [];

	for (const entry of entries) {
		const value = entry[key];
		const date = entry.recordedOn;
		if (typeof value === 'number' && Number.isFinite(value) && typeof date === 'string') {
			points.push({ date, value });
		}
	}

	return points.sort((a, b) => a.date.localeCompare(b.date));
}

/** One point per Sunday–Saturday week, plotted on the last day logged that week. */
export function weeklyAveragePoints(points: ChartPoint[]): ChartPoint[] {
	const groups = new Map<string, ChartPoint[]>();

	for (const point of points) {
		const weekStart = weekStartIso(point.date);
		const group = groups.get(weekStart);
		if (group) group.push(point);
		else groups.set(weekStart, [point]);
	}

	return [...groups.entries()]
		.sort(([left], [right]) => left.localeCompare(right))
		.map(([, group]) => {
			const sum = group.reduce((total, point) => total + point.value, 0);
			return {
				date: group[group.length - 1].date,
				value: sum / group.length
			};
		});
}
