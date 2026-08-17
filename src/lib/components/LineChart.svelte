<script lang="ts">
	import { cubicOut } from 'svelte/easing';
	import { prefersReducedMotion, Tween } from 'svelte/motion';
	import { formatAxisDate } from '$lib/tracking/dates';
	import {
		frameFromPoints,
		geometryFromFrame,
		interpolateGeometries,
		xForDate
	} from '$lib/tracking/chartMotion';
	import { computeRangeStats, type ChartPoint } from '$lib/tracking/stats';
	import { chartColorFor, formatFieldValue, type FieldDef } from '$lib/tracking/fields';

	let {
		points,
		field,
		markers = []
	}: {
		points: ChartPoint[];
		field: FieldDef;
		markers?: Array<{ date: string; label: string }>;
	} = $props();

	const uid = $props.id();

	const width = 960;
	const height = 340;
	const pad = { top: 18, right: 18, bottom: 42, left: 48 };
	const layout = { width, height, pad };

	let hoverIndex = $state<number | null>(null);
	let color = $derived(chartColorFor(field.key));
	let stats = $derived(computeRangeStats(points));
	let includeYear = $derived(
		points.length > 0 && points[0].date.slice(0, 4) !== points[points.length - 1].date.slice(0, 4)
	);
	let targetGeometry = $derived.by(() => {
		const frame = frameFromPoints(points);
		return frame ? geometryFromFrame(frame, layout) : null;
	});
	const geometryTween = Tween.of(() => targetGeometry, {
		duration: () => (prefersReducedMotion.current ? 0 : 480),
		easing: cubicOut,
		interpolate: (from, to) => interpolateGeometries(from, to, layout)
	});
	let geometry = $derived(geometryTween.current);
	let markerXs = $derived.by(() => {
		const frame = frameFromPoints(points);
		if (!frame) return [];
		const placed: Array<{ date: string; x: number; label: string }> = [];
		const seen: Record<string, boolean> = {};
		for (const marker of markers) {
			if (seen[marker.date]) continue;
			seen[marker.date] = true;
			const x = xForDate(frame, layout, marker.date);
			if (x == null) continue;
			placed.push({ date: marker.date, x, label: marker.label });
		}
		return placed;
	});

	function onMove(event: MouseEvent & { currentTarget: SVGSVGElement }) {
		if (!geometry) return;
		const bounds = event.currentTarget.getBoundingClientRect();
		const svgX = ((event.clientX - bounds.left) / bounds.width) * width;
		let nearest = 0;
		let nearestDistance = Infinity;
		for (const [index, point] of geometry.mapped.entries()) {
			const distance = Math.abs(point.x - svgX);
			if (distance < nearestDistance) {
				nearest = index;
				nearestDistance = distance;
			}
		}
		hoverIndex = nearest;
	}

	function formatTick(value: number) {
		if (!stats) return '';
		if (Math.abs(stats.high) >= 20) return value.toFixed(0);
		return value.toFixed(field.decimals);
	}
</script>

{#if !stats || !geometry}
	<div class="empty">No values in this range yet.</div>
{:else}
	<svg
		class="chart"
		style:--chart-color={color}
		viewBox="0 0 {width} {height}"
		role="img"
		aria-label="{field.label} trend"
		onmousemove={onMove}
		onmouseleave={() => (hoverIndex = null)}
	>
		<defs>
			<linearGradient id="area-{uid}" x1="0" y1="0" x2="0" y2="1">
				<stop class="area-start" offset="0%" />
				<stop class="area-mid" offset="70%" />
				<stop class="area-end" offset="100%" />
			</linearGradient>
			<clipPath id="plot-{uid}">
				<rect
					x={pad.left}
					y={pad.top}
					width={width - pad.left - pad.right}
					height={height - pad.top - pad.bottom}
				/>
			</clipPath>
		</defs>
		{#each geometry.yTicks as tick, index (`y-${index}`)}
			<line class="grid" x1={pad.left} x2={width - pad.right} y1={tick.y} y2={tick.y} />
			<text class="tick y" x={pad.left - 8} y={tick.y + 4}>{formatTick(tick.value)}</text>
		{/each}
		<line class="avg" x1={pad.left} x2={width - pad.right} y1={geometry.yAvg} y2={geometry.yAvg} />
		{#each markerXs as marker (marker.date)}
			<g>
				<line class="marker" x1={marker.x} x2={marker.x} y1={pad.top} y2={height - pad.bottom} />
				<line class="marker-hit" x1={marker.x} x2={marker.x} y1={pad.top} y2={height - pad.bottom}>
					<title>{marker.label} · {formatAxisDate(marker.date, true)}</title>
				</line>
			</g>
		{/each}
		<g clip-path="url(#plot-{uid})">
			{#if geometry.area}
				<path class="area" d={geometry.area} fill="url(#area-{uid})" />
			{/if}
			<path class="line" d={geometry.line} />
		</g>
		{#each geometry.xTicks as tick, index (`x-${index}`)}
			<text
				class={['tick', 'x', tick.x > width - 70 && 'end']}
				x={tick.x}
				y={height - 14}
				text-anchor={tick.x < pad.left + 24 ? 'start' : tick.x > width - 70 ? 'end' : 'middle'}
			>
				{formatAxisDate(tick.date, includeYear)}
			</text>
		{/each}
		{#if hoverIndex != null && Number.isFinite(geometry.mapped[hoverIndex]?.value)}
			{@const hover = geometry.mapped[hoverIndex]}
			<line class="hover" x1={hover.x} x2={hover.x} y1={pad.top} y2={height - pad.bottom} />
			<circle class="dot" cx={hover.x} cy={hover.y} r="4.5" />
			<text
				class="tooltip"
				x={hover.x}
				y={Math.max(16, hover.y - 12)}
				text-anchor={hover.x > width - 160 ? 'end' : hover.x < 160 ? 'start' : 'middle'}
			>
				{formatAxisDate(hover.date, true)} · {formatFieldValue(hover.value, field)}
			</text>
		{/if}
	</svg>
	{#if markerXs.length > 0}
		<p class="marker-hint">Dashed lines mark GLP-1 starts and dose changes</p>
	{/if}
{/if}

<style>
	.chart {
		width: 100%;
		height: auto;
		display: block;
		overflow: visible;
	}

	.area-start {
		stop-color: var(--chart-color, var(--accent));
		stop-opacity: 0.32;
		transition: stop-color 480ms ease-out;
	}

	.area-mid {
		stop-color: var(--chart-color, var(--accent));
		stop-opacity: 0.05;
		transition: stop-color 480ms ease-out;
	}

	.area-end {
		stop-color: var(--chart-color, var(--accent));
		stop-opacity: 0;
		transition: stop-color 480ms ease-out;
	}

	.grid,
	.avg {
		stroke: rgba(255, 255, 255, 0.12);
		stroke-width: 1;
		stroke-dasharray: 4 6;
	}

	.avg {
		stroke: rgba(255, 255, 255, 0.28);
	}

	.marker {
		stroke: #c084fc;
		stroke-width: 1.25;
		stroke-dasharray: 3 5;
		opacity: 0.72;
		pointer-events: none;
	}

	.marker-hit {
		stroke: transparent;
		stroke-width: 12;
	}

	.line {
		fill: none;
		stroke: var(--chart-color, var(--accent));
		stroke-width: 2.2;
		stroke-linecap: round;
		stroke-linejoin: round;
		transition: stroke 480ms ease-out;
	}

	.dot {
		fill: var(--chart-color, var(--accent));
		stroke: var(--bg-elev);
		stroke-width: 2;
		transition: fill 480ms ease-out;
	}

	.tick,
	.tooltip {
		font-size: 12px;
		font-family: 'Figtree', system-ui, sans-serif;
		fill: var(--ink-soft);
	}

	.tick.y {
		text-anchor: end;
	}

	.tooltip {
		fill: var(--ink);
		font-size: 12px;
	}

	.hover {
		stroke: rgba(255, 255, 255, 0.2);
		stroke-width: 1;
	}

	.empty {
		margin: 10px 0 0;
		padding: 48px 8px;
		color: var(--ink-soft);
		font-size: 0.86rem;
		text-align: center;
	}

	.marker-hint {
		margin: 8px 4px 0;
		color: var(--ink-soft);
		font-size: 0.78rem;
	}

	@media (prefers-reduced-motion: reduce) {
		.line,
		.dot,
		.area-start,
		.area-mid,
		.area-end {
			transition: none;
		}
	}
</style>
