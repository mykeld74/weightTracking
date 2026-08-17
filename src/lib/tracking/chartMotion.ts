import { computeRangeStats, type ChartPoint } from './stats';

export type ChartFrame = {
	dates: string[];
	times: number[];
	values: number[];
	minValue: number;
	maxValue: number;
	minTime: number;
	maxTime: number;
	average: number;
};

export type ChartLayout = {
	width: number;
	height: number;
	pad: { top: number; right: number; bottom: number; left: number };
};

export type MappedPoint = ChartPoint & { x: number; y: number };

export type ChartGeometry = {
	mapped: MappedPoint[];
	line: string;
	area: string;
	yAvg: number;
	yTicks: { value: number; y: number }[];
	xTicks: MappedPoint[];
};

function dateTime(date: string): number {
	return new Date(`${date}T00:00:00`).getTime();
}

export function xForDate(frame: ChartFrame, layout: ChartLayout, date: string): number | null {
	const time = dateTime(date);
	if (time < frame.minTime || time > frame.maxTime) return null;
	const innerWidth = layout.width - layout.pad.left - layout.pad.right;
	const timeSpan = frame.maxTime - frame.minTime || 1;
	return layout.pad.left + ((time - frame.minTime) / timeSpan) * innerWidth;
}

function lerp(from: number, to: number, t: number): number {
	return from + (to - from) * t;
}

function pathFromMapped(
	mapped: MappedPoint[],
	height: number,
	bottom: number
): { line: string; area: string } {
	const line =
		mapped.length === 1
			? `M ${mapped[0].x} ${mapped[0].y}`
			: mapped.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');

	const area =
		mapped.length === 1
			? ''
			: `${line} L ${mapped[mapped.length - 1].x} ${height - bottom} L ${mapped[0].x} ${height - bottom} Z`;

	return { line, area };
}

function resampleByIndex(mapped: MappedPoint[], count: number): MappedPoint[] {
	if (count <= 0) return [];
	if (mapped.length === 0) {
		return Array.from({ length: count }, () => ({ date: '', value: 0, x: 0, y: 0 }));
	}
	if (mapped.length === 1) {
		return Array.from({ length: count }, () => ({ ...mapped[0] }));
	}
	if (mapped.length === count) return mapped;

	return Array.from({ length: count }, (_, index) => {
		const position = (index / (count - 1)) * (mapped.length - 1);
		const leftIndex = Math.floor(position);
		const rightIndex = Math.min(leftIndex + 1, mapped.length - 1);
		const amount = position - leftIndex;
		const left = mapped[leftIndex];
		const right = mapped[rightIndex];
		return {
			date: amount < 0.5 ? left.date : right.date,
			value: lerp(left.value, right.value, amount),
			x: lerp(left.x, right.x, amount),
			y: lerp(left.y, right.y, amount)
		};
	});
}

export function frameFromPoints(points: ChartPoint[]): ChartFrame | null {
	const stats = computeRangeStats(points);
	if (!stats) return null;

	const times = points.map((point) => dateTime(point.date));
	const span = stats.high - stats.low || Math.max(Math.abs(stats.high) * 0.08, 1);

	return {
		dates: points.map((point) => point.date),
		times,
		values: points.map((point) => point.value),
		minValue: stats.low - span * 0.14,
		maxValue: stats.high + span * 0.12,
		minTime: Math.min(...times),
		maxTime: Math.max(...times),
		average: stats.average
	};
}

export function geometryFromFrame(frame: ChartFrame, layout: ChartLayout): ChartGeometry {
	const { width, height, pad } = layout;
	const innerWidth = width - pad.left - pad.right;
	const innerHeight = height - pad.top - pad.bottom;
	const valueSpan = frame.maxValue - frame.minValue || 1;
	const timeSpan = frame.maxTime - frame.minTime || 1;
	const xFor = (time: number) => pad.left + ((time - frame.minTime) / timeSpan) * innerWidth;
	const yFor = (value: number) => pad.top + ((frame.maxValue - value) / valueSpan) * innerHeight;
	const mapped = frame.dates.map((date, index) => ({
		date,
		value: frame.values[index],
		x: xFor(frame.times[index]),
		y: yFor(frame.values[index])
	}));
	const { line, area } = pathFromMapped(mapped, height, pad.bottom);
	const tickCount = 4;
	const yTicks = Array.from({ length: tickCount }, (_, index) => {
		const value = frame.maxValue - (valueSpan * index) / (tickCount - 1);
		return { value, y: yFor(value) };
	});
	const xCount = Math.min(8, mapped.length);
	const xIndexes =
		mapped.length === 1
			? [0]
			: Array.from({ length: xCount }, (_, index) =>
					Math.round((index * (mapped.length - 1)) / (xCount - 1))
				);

	return {
		mapped,
		line,
		area,
		yAvg: yFor(frame.average),
		yTicks,
		xTicks: [...new Set(xIndexes)].map((index) => mapped[index])
	};
}

export function interpolateGeometries(
	from: ChartGeometry | null,
	to: ChartGeometry | null,
	layout: ChartLayout
): (t: number) => ChartGeometry | null {
	if (!to) return (t) => (t >= 1 ? null : from);
	if (!from) return () => to;

	const count = Math.max(from.mapped.length, to.mapped.length, 2);
	const fromSamples = resampleByIndex(from.mapped, count);
	const toSamples = resampleByIndex(to.mapped, count);

	return (t) => {
		if (t >= 1) return to;
		if (t <= 0) return from;

		const mapped = fromSamples.map((point, index) => ({
			date: toSamples[index].date,
			value: lerp(point.value, toSamples[index].value, t),
			x: lerp(point.x, toSamples[index].x, t),
			y: lerp(point.y, toSamples[index].y, t)
		}));
		const { line, area } = pathFromMapped(mapped, layout.height, layout.pad.bottom);
		const yTicks = to.yTicks.map((tick, index) => {
			const source = from.yTicks[index] ?? tick;
			return {
				value: lerp(source.value, tick.value, t),
				y: lerp(source.y, tick.y, t)
			};
		});

		return {
			mapped,
			line,
			area,
			yAvg: lerp(from.yAvg, to.yAvg, t),
			yTicks,
			xTicks: to.xTicks
		};
	};
}
