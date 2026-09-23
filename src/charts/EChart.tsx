/**
 * Minimal ECharts wrapper. Replaces `echarts-for-react` (25 lines vs a dependency).
 * Canvas renderer only, tree-shaken imports - see plan section 27.4.
 */

import { useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import { BarChart, LineChart, ScatterChart, HeatmapChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  MarkAreaComponent,
  MarkLineComponent,
  VisualMapComponent,
  DataZoomComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  BarChart,
  LineChart,
  ScatterChart,
  HeatmapChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  MarkAreaComponent,
  MarkLineComponent,
  VisualMapComponent,
  DataZoomComponent,
  CanvasRenderer,
]);

export const CHART_BASE = {
  backgroundColor: 'transparent',
  animation: false as const,
  textStyle: { fontFamily: 'Inter, system-ui, sans-serif', color: '#9caabb', fontSize: 11 },
  // Labels and axis names belong inside the chart allocation. Individual charts can
  // still reserve extra room for rotated labels, but this prevents translated text
  // and responsive tick labels from being clipped at the panel edge by default.
  grid: { left: 18, right: 18, top: 24, bottom: 18, containLabel: true },
  tooltip: {
    trigger: 'axis' as const,
    // ECharts otherwise allows a long tooltip to escape the canvas and disappear
    // beneath the adjacent dashboard panel at narrow widths.
    confine: true,
    backgroundColor: '#171e2a',
    borderColor: '#273241',
    textStyle: { color: '#e7edf5', fontSize: 11 },
  },
};

export const AXIS = {
  axisLine: { lineStyle: { color: '#273241' } },
  axisTick: { show: false },
  splitLine: { lineStyle: { color: '#1c2532' } },
  axisLabel: { color: '#8794a6', fontSize: 10 }, // mirrors --color-text3 (dark)
  nameTextStyle: { color: '#8794a6', fontSize: 10, padding: 2 },
};

/**
 * Replace component collections whose length/shape changes between renders. ECharts'
 * default merge keeps unmatched old series alive, which produced ghost comparison and
 * actual-trip lines after users changed Route Profile controls.
 */
export const SET_OPTION_OPTS = {
  notMerge: false,
  lazyUpdate: true,
  replaceMerge: ['series', 'xAxis', 'yAxis', 'legend', 'visualMap', 'dataZoom'],
};

/*
 * Theme handling for charts.
 *
 * The constants above are dark-theme fallbacks for a non-DOM environment ONLY - once
 * there is a document, readTheme() overrides every colour they set.
 *
 * Every chart option in the app is
 * built inside a `useMemo` that does NOT depend on the theme, so on a theme switch
 * those memos do not re-run and the chart would keep painting dark axes on a white
 * panel. Rather than touch ~20 call sites (and rely on every future one remembering),
 * the wrapper re-reads the live CSS variables and merges them over whatever option it
 * is handed, then re-applies on the `ptcc:theme` event.
 *
 * Canvas cannot resolve `var(--x)`, which is why this has to be a read-and-merge
 * rather than just handing ECharts the variable name.
 */
function cssVar(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

interface AxisTheme {
  axisLine: { lineStyle: { color: string } };
  splitLine: { lineStyle: { color: string } };
  axisLabel: { color: string };
  nameTextStyle: { color: string };
}

function readTheme(): { base: Record<string, unknown>; axis: AxisTheme } {
  const text1 = cssVar('--color-text1', '#e7edf5');
  const text2 = cssVar('--color-text2', '#9caabb');
  const text3 = cssVar('--color-text3', '#8794a6');
  const line = cssVar('--color-line', '#273241');
  const lineSoft = cssVar('--color-line-soft', '#1c2532');
  const surface = cssVar('--color-bg2', '#171e2a');
  return {
    base: {
      textStyle: { color: text2 },
      tooltip: { backgroundColor: surface, borderColor: line, textStyle: { color: text1 } },
      legend: { textStyle: { color: text2 } },
    },
    axis: {
      axisLine: { lineStyle: { color: line } },
      splitLine: { lineStyle: { color: lineSoft } },
      axisLabel: { color: text3 },
      nameTextStyle: { color: text3 },
    },
  };
}

/**
 * Apply the axis theme without clobbering per-chart axis config (formatters, interval).
 *
 * PRECEDENCE, and the comment above this file's constants used to claim the opposite:
 * the call-site value was spread LAST, and every call site spreads `...AXIS` - which
 * carries the dark hex literals. So the dark literals beat the live theme on every chart
 * in the app, and a canvas histogram measured 4,676 px of #1c2532 grid lines on white in
 * the light theme. The LIVE theme wins now.
 *
 * It is safe for the theme to win because `axis` only ever carries colours: `formatter`,
 * `interval`, `fontSize`, `show`, `rotate` and friends all live on the call-site object
 * and are spread first, so they survive.
 */
function themeAxis(a: unknown, axis: AxisTheme): unknown {
  if (Array.isArray(a)) return a.map((x) => themeAxis(x, axis));
  if (!a || typeof a !== 'object') return a;
  const o = a as Record<string, any>;
  return {
    ...o,
    axisLine: { ...(o.axisLine ?? {}), lineStyle: { ...(o.axisLine?.lineStyle ?? {}), ...axis.axisLine.lineStyle } },
    splitLine: { ...(o.splitLine ?? {}), lineStyle: { ...(o.splitLine?.lineStyle ?? {}), ...axis.splitLine.lineStyle } },
    axisLabel: { ...(o.axisLabel ?? {}), ...axis.axisLabel },
    nameTextStyle: { ...(o.nameTextStyle ?? {}), ...axis.nameTextStyle },
  };
}

function themed(option: Record<string, unknown>): Record<string, unknown> {
  const { base, axis } = readTheme();
  const out: Record<string, unknown> = {
    ...option,
    textStyle: { ...(option.textStyle as object), ...(base.textStyle as object) },
    tooltip: { ...(option.tooltip as object), ...(base.tooltip as object) },
  };
  if (option.legend) out.legend = { ...(option.legend as object), ...(base.legend as object) };
  if (option.xAxis) out.xAxis = themeAxis(option.xAxis, axis);
  if (option.yAxis) out.yAxis = themeAxis(option.yAxis, axis);
  return out;
}

export function EChart({
  option,
  className = '',
  style,
  ariaLabel,
}: {
  option: Record<string, unknown>;
  className?: string;
  style?: React.CSSProperties;
  /** Concise chart purpose for screen readers; defaults to the named data series. */
  ariaLabel?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inst = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    inst.current = echarts.init(ref.current, undefined, { renderer: 'canvas' });
    const ro = new ResizeObserver(() => inst.current?.resize());
    ro.observe(ref.current);
    return () => {
      ro.disconnect();
      inst.current?.dispose();
      inst.current = null;
    };
  }, []);

  useEffect(() => {
    const apply = () => inst.current?.setOption(themed(option), SET_OPTION_OPTS);
    apply();
    window.addEventListener('ptcc:theme', apply);
    return () => window.removeEventListener('ptcc:theme', apply);
  }, [option]);

  const inferredLabel = ariaLabel ?? (() => {
    const series = Array.isArray(option.series) ? option.series : [];
    const names = series
      .map((s) => (s && typeof s === 'object' ? (s as { name?: unknown }).name : undefined))
      .filter((n): n is string => typeof n === 'string' && n.length > 0);
    return names.length ? names.join(', ') : 'Operational data chart';
  })();

  return (
    <div
      ref={ref}
      className={className}
      style={{ width: '100%', height: '100%', ...style }}
      role="img"
      aria-label={inferredLabel}
    />
  );
}
