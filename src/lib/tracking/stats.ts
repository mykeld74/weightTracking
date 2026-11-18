import { addDaysIso, calendarDaysBetween, todayIsoDate, weekStartIso } from './dates';

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
	/** (last − first) / weeks between first and last log. */
	weeklyChange: number | null;
};

export type ChartPoint = {
	date: string;
	value: number;
};

/** Average change per week from the first to last point. */
export function averageWeeklyChange(points: ChartPoint[]): number | null {
	if (points.length < 2) return null;
	const first = points[0];
	const last = points[points.length - 1];
	const spanWeeks = Math.max(1 / 7, calendarDaysBetween(first.date, last.date) / 7);
	return (last.value - first.value) / spanWeeks;
}

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
		change: last.value - first.value,
		weeklyChange: averageWeeklyChange(points)
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

export type GoalProgress = {
	currentWeight: number;
	targetWeight: number;
	remainingLbs: number;
	/** Positive when moving toward the goal at `weeklyChange`. */
	weeksRemaining: number | null;
	etaDate: string | null;
	reached: boolean;
	direction: 'loss' | 'gain';
};

/** Distance to target weight and ETA from the current weekly rate. */
export function computeGoalProgress(
	currentWeight: number,
	targetWeight: number,
	weeklyChange: number | null,
	asOf = todayIsoDate()
): GoalProgress {
	const remainingLbs = targetWeight - currentWeight;
	const direction: 'loss' | 'gain' = targetWeight < currentWeight ? 'loss' : 'gain';
	const reached = Math.abs(remainingLbs) < 0.05;

	if (reached || weeklyChange == null || weeklyChange === 0) {
		return {
			currentWeight,
			targetWeight,
			remainingLbs,
			weeksRemaining: reached ? 0 : null,
			etaDate: reached ? asOf : null,
			reached,
			direction
		};
	}

	const movingTowardGoal =
		(direction === 'loss' && weeklyChange < 0) || (direction === 'gain' && weeklyChange > 0);

	if (!movingTowardGoal) {
		return {
			currentWeight,
			targetWeight,
			remainingLbs,
			weeksRemaining: null,
			etaDate: null,
			reached: false,
			direction
		};
	}

	const weeksRemaining = Math.abs(remainingLbs) / Math.abs(weeklyChange);
	const etaDate = addDaysIso(asOf, Math.ceil(weeksRemaining * 7));

	return {
		currentWeight,
		targetWeight,
		remainingLbs,
		weeksRemaining,
		etaDate,
		reached: false,
		direction
	};
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
