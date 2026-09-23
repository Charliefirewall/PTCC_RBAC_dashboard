/**
 * Route profile (PTCC scenario 3a) - "forecast by route the potential deviation over time
 * of the day (Mon to Sun) ... the whole trip with all bus stops, with the forecast
 * deviation, also with the norm for comparison". Extension - outside R1096 scope.
 *
 * Every number here is read, not modelled anew:
 *   norm band / mean   baseline.profile()     - synthetic 8-week norm (SIMULATED)
 *   actual             world.tripLog          - the live trip's stop arrivals
 *   forecast tail      forecastStops()        - the same model as the scenario-2 forecast
 *   bars ("other data") profile mean step      - where along the trip the norm gains delay
 *   insight strip      routeInsight()         - the chart's numbers, summarised
 *
 * A live overlay exists only when a bus on this route and direction started its trip in
 * the chosen 15-min bucket AND the chosen day is the sim date's day; otherwise the
 * forecast for that start is the norm itself, and the screen says so.
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { getInstanceByDom } from 'echarts/core';
import { useSettings, useSim, world } from '../../store';
import { baselineOf, bucketOf, bucketStartS, BUCKETS, SIM_DOW } from '../../sim/baseline';
import { hhmm } from '../../sim/engine';
import { tripIdOf } from '../../sim/types';
import { segmentName } from '../../data/segments';
import { EChart, AXIS, CHART_BASE } from '../../charts/EChart';
import { Button, Empty, Panel, StatusPill } from '../../components/primitives';
import { Select } from '../../components/kit';
import { dayMatrix } from './dayMatrix';
import { routeInsight } from './routeInsight';
import { useLang, useT } from '../../i18n/t';
import type { I18nKey } from '../../i18n/dict';
import { buildPreTripRouteForecast, type RouteForecastStop } from './routeForecast';

const HERO_FIRST = ['R7', 'R12', 'R5'];
const EM_DASH = '—';
const MON = 0, FRI = 4, SUN = 6;

function cssVar(n: string, f: string): string {
  return typeof document === 'undefined' ? f : getComputedStyle(document.documentElement).getPropertyValue(n).trim() || f;
}
const min = (s: number) => +(s / 60).toFixed(2);
const m1 = (s: number) => (Math.round(s / 6) / 10 || 0).toFixed(1); // || 0: no "-0.0"
const sgn = (s: number) => `${s >= 0.05 * 60 ? '+' : ''}${m1(s)}`;

interface Row {
  k: number;
  stop: string;
  planned_s: number;
  norm: number;
  half: number;
  actual: number | null;
  seg: string;
}

type ForecastRow = Row & RouteForecastStop;

function Tile({ label, value, tone, sub, text, children }: { label: string; value?: ReactNode; tone?: string; sub?: ReactNode; text?: boolean; children?: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-md border border-[var(--color-line)] bg-[var(--color-bg2)] px-3 py-2">
      <span className="t-label truncate">{label}</span>
      {value !== undefined ? (
        <span className={`${text ? 't-head py-[3px]' : 'num text-[1.15rem]'} truncate font-semibold leading-tight`} style={{ color: tone ?? 'var(--color-text1)' }} title={text ? String(value) : undefined}>
          {value}
        </span>
      ) : null}
      {sub ? <span className="t-meta truncate" title={typeof sub === 'string' ? sub : undefined}>{sub}</span> : null}
      {children}
    </div>
  );
}

export default function RouteProfile({ initialRoute }: { initialRoute?: string | null }) {
  const t = useT();
  const lang = useLang();
  const dow = useSettings((s) => s.dow);
  const setDow = useSettings((s) => s.setDow);
  const tau = useSettings((s) => s.th.forecast_drift_tau_min);
  const theme = useSettings((s) => s.theme);
  const tick = useSim((s) => s.tick); // live overlay moves with the sim

  const routes = useMemo(() => {
    const act = world.routes.filter((r) => r.active);
    const rank = (id: string) => (HERO_FIRST.includes(id) ? HERO_FIRST.indexOf(id) : 99);
    return act.sort((a, b) => rank(a.route_id) - rank(b.route_id) || +a.route_id.slice(1) - +b.route_id.slice(1));
  }, []);
  const [routeId, setRouteId] = useState(() =>
    initialRoute && routes.some((r) => r.route_id === initialRoute) ? initialRoute : routes[0]!.route_id,
  );
  const [dir, setDir] = useState<0 | 1>(0);
  const [bucket, setBucket] = useState(() => bucketOf(world.sim_time_s));
  const [cmp, setCmp] = useState<number | null>(null); // E12 "compare with" day
  const [mode, setMode] = useState<'trip' | 'heat'>('trip'); // E13
  const [selectedK, setSelectedK] = useState<number | null>(null);
  const heatRef = useRef<HTMLDivElement>(null);
  const tripRef = useRef<HTMLDivElement>(null);
  const route = world.routeById.get(routeId)!;
  const base = baselineOf(world);

  const view = useMemo(() => {
    const hops = base.hops(route, dir);
    const norm = base.profile(route, dir, dow, bucket);
    // the live trip for this start, if any: most stops logged wins
    const bus =
      dow === SIM_DOW
        ? world.vehicles
            .filter(
              (v) =>
                v.route_id === routeId &&
                v.direction === dir &&
                v.status === 'in_service' &&
                v.trip_start_s !== undefined &&
                bucketOf(v.trip_start_s) === bucket,
            )
            .map((v) => ({ v, log: world.tripLog.get(tripIdOf(v)) ?? [] }))
            .sort((a, b) => b.log.length - a.log.length)[0]
        : undefined;
    const actual = new Map((bus?.log ?? []).map((a) => [a.stop_idx, a.dev_s]));
    const rows: Row[] = hops.map((h, i) => ({
      k: h.k,
      stop: lang === 'mn' ? h.stop.name_mn : h.stop.name_en,
      planned_s: bucketStartS(bucket) + h.offset_s,
      norm: norm[i]!.mean,
      half: (norm[i]!.p90 - norm[i]!.p10) / 2,
      actual: actual.get(h.k) ?? null,
      seg: h.seg_key ? segmentName(h.seg_key, lang) : EM_DASH,
    }));
    return { hops, norm, bus, rows };
    // tick: the live trip's log and forecast change every sim step
  }, [base, route, routeId, dir, dow, bucket, tau, lang, tick]);

  const tripForecast = useMemo(
    () => buildPreTripRouteForecast(world, { routeId, direction: dir, dow, startBucket: bucket, tauMin: tau }),
    [routeId, dir, dow, bucket, tau, tick],
  );
  const forecastRows = useMemo<ForecastRow[]>(
    () =>
      view.rows.map((r, i) => ({
        ...r,
        ...tripForecast.stops[i]!,
        // Keep the localized display strings already used by the chart/table.
        stop: r.stop,
        seg: r.seg,
      })),
    [view.rows, tripForecast],
  );

  // compare day's norm + the insight strip's numbers (the per-hop bars come from here too)
  const cmpNorm = useMemo(() => (cmp === null ? null : base.profile(route, dir, cmp, bucket)), [base, route, dir, cmp, bucket]);
  const ins = useMemo(() => routeInsight(view.hops, view.norm, cmpNorm), [view, cmpNorm]);
  const dayName = t(`dow.${dow}` as I18nKey);
  const cmpName = cmp === null ? '' : t(`dow.${cmp}` as I18nKey);

  const option = useMemo(() => {
    const { norm, bus, rows } = view;
    const F = cssVar('--color-forecast', '#b48cf2');
    const T1 = cssVar('--color-text1', '#e7edf5');
    const T3 = cssVar('--color-text3', '#8794a6');
    const P = cssVar('--color-accent', '#4d8df0');
    const C = cssVar('--color-ev-high', '#e07b39');
    const band = (name: string, stack: string, p: typeof norm, col: string, alpha: string, z: number, edge?: string) => [
      // edge: the compare band is drawn as dotted p10/p90 outlines over a faint fill, so two
      // overlapping bands stay two colours instead of blending to grey
      // band = invisible p10 line + stacked (p90 - p10) area; 'all' so negative p10 still stacks
      { id: `${stack}-floor`, name: stack, type: 'line', stack, stackStrategy: 'all', symbol: 'none', lineStyle: edge ? { color: edge, width: 1, type: 'dotted' } : { opacity: 0 }, data: p.map((n) => min(n.p10)), silent: true, z },
      {
        id: `${stack}-band`,
        name,
        type: 'line',
        stack,
        stackStrategy: 'all',
        symbol: 'none',
        lineStyle: edge ? { color: edge, width: 1, type: 'dotted' } : { opacity: 0 },
        areaStyle: { color: col + alpha },
        itemStyle: { color: col + '88' }, // legend swatch
        data: p.map((n) => min(n.p90 - n.p10)),
        silent: true,
        z,
      },
    ];
    const series: Record<string, unknown>[] = [
      ...band(t('rp.s.band', { dow: dayName }), 'p10', norm, P, '40', 2),
      {
        id: 'selected-norm-mean',
        name: t('rp.s.mean', { dow: dayName }),
        type: 'line',
        symbol: 'circle',
        symbolSize: 4,
        showSymbol: false,
        z: 4,
        lineStyle: { color: P, width: 2.5 },
        itemStyle: { color: P },
        data: norm.map((n) => min(n.mean)),
        // "on schedule" reference
        markLine: { silent: true, symbol: 'none', label: { show: false }, lineStyle: { color: T3, type: 'dashed', width: 1 }, data: [{ yAxis: 0 }] },
      },
    ];
    if (cmpNorm) {
      series.push(...band(t('rp.s.band', { dow: cmpName }), 'p10c', cmpNorm, C, '14', 1, C + 'cc'), {
        id: 'compare-norm-mean',
        name: t('rp.s.mean', { dow: cmpName }),
        type: 'line',
        symbol: 'none',
        z: 3,
        lineStyle: { color: C, width: 2, type: [6, 3] },
        itemStyle: { color: C },
        data: cmpNorm.map((n) => min(n.mean)),
      });
    }
    const fcData: (number | null)[] = forecastRows.map((r) => min(r.forecastDeviationS));
    let actData: (number | null)[] | null = null;
    if (bus) {
      const arrived = rows.filter((r) => r.actual !== null);
      const k0 = arrived.at(-1)?.k ?? -1;
      actData = rows.map((r) => (r.k <= k0 && r.actual !== null ? min(r.actual) : null));
      series.push({
        id: 'live-actual',
        name: t('rp.actual'),
        type: 'line',
        symbolSize: 5,
        connectNulls: true,
        z: 6,
        lineStyle: { color: T1, width: 2 },
        itemStyle: { color: T1 },
        data: actData,
      });
    }
    series.push({
      id: 'pretrip-forecast',
      name: t('rp.forecast'),
      type: 'line',
      symbol: 'circle',
      symbolSize: 6,
      z: 5,
      lineStyle: { color: F, width: 2, type: 'dashed' },
      itemStyle: {
        color: (p: { dataIndex: number }) => {
          const state = forecastRows[p.dataIndex]?.state;
          return state === 'significant' ? cssVar('--color-sev-crit', '#ee5f63') : state === 'delay' ? cssVar('--color-sev-warn', '#e0a02e') : state === 'recovery' ? cssVar('--color-accent', '#4d8df0') : cssVar('--color-sev-ok', '#45b985');
        },
      },
      data: fcData,
    });
    // delay each hop adds: own small grid under the chart, seconds, same stop axis
    const bar = (id: string, name: string, d: number[], col: string, hot: number) => ({
      id,
      name,
      type: 'bar',
      xAxisIndex: 1,
      yAxisIndex: 1,
      barMaxWidth: 12,
      barGap: '15%',
      itemStyle: { color: col + 'aa' }, // legend swatch
      data: d.map((v, i) => ({ value: Math.round(v), itemStyle: { color: v < 0 ? T3 + '88' : i === hot ? col : col + 'aa' } })),
    });
    series.push(bar('selected-hop-delay', t('rp.s.hop', { dow: dayName }), ins.hop, P, ins.fastestK));
    if (ins.hopCmp) series.push(bar('compare-hop-delay', t('rp.s.hop', { dow: cmpName }), ins.hopCmp, C, -1));

    const dot = (c: string) => `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${c};margin-right:6px"></span>`;
    const line = (c: string, label: string, n: { mean: number; p10: number; p90: number }) =>
      `${dot(c)}${label} <b>${sgn(n.mean)} ${t('unit.min')}</b> <span style="opacity:.7">(${t('rp.tt.range', { lo: m1(n.p10), hi: m1(n.p90) })})</span>`;
    const secs = (v: number) => `${v >= 0 ? '+' : ''}${Math.round(v)} ${t('unit.s')}`;
    const tooltip = {
      ...CHART_BASE.tooltip,
      trigger: 'axis',
      axisPointer: { type: 'line', lineStyle: { color: T3 } },
      formatter: (ps: { dataIndex: number }[]) => {
        const i = ps[0]?.dataIndex ?? 0;
        const r = rows[i]!;
        const out = [`<b>${r.stop}</b> <span style="opacity:.7">· ${t('rp.tt.planned', { time: hhmm(r.planned_s) })}</span>`, line(P, dayName, norm[i]!)];
        if (cmpNorm) {
          out.push(line(C, cmpName, cmpNorm[i]!));
          out.push(`&nbsp;&nbsp;&nbsp;Δ ${t('rp.tt.diff', { a: dayName, b: cmpName })}: <b>${sgn(norm[i]!.mean - cmpNorm[i]!.mean)} ${t('unit.min')}</b>`);
        }
        if (actData?.[i] != null) out.push(`${dot(T1)}${t('rp.actual')} <b>${sgn(actData[i]! * 60)} ${t('unit.min')}</b>`);
        if (fcData[i] != null) out.push(`${dot(F)}${t('rp.forecast')} <b>${sgn(fcData[i]! * 60)} ${t('unit.min')}</b> · ${t(`rp.state.${forecastRows[i]!.state}` as I18nKey)}`);
        if (i > 0) {
          const hc = ins.hopCmp ? ` · ${cmpName} ${secs(ins.hopCmp[i]!)}` : '';
          out.push(`<span style="opacity:.7">${t('rp.tt.hop')}: ${dayName} ${secs(ins.hop[i]!)}${hc}</span>`);
        }
        return out.join('<br/>');
      },
    };
    const stops = rows.map((r) => r.stop);
    return {
      ...CHART_BASE,
      tooltip,
      axisPointer: { link: [{ xAxisIndex: 'all' }] },
      legend: {
        type: 'scroll',
        top: 0,
        left: 'center',
        itemWidth: 16,
        itemHeight: 8,
        itemGap: 14,
        textStyle: { fontSize: 11 },
        data: series.map((s) => s.name as string).filter((n) => n !== 'p10' && n !== 'p10c'),
      },
      grid: [
        { left: 58, right: 18, top: 34, bottom: 232, containLabel: true },
        { left: 58, right: 18, height: 72, bottom: 128, containLabel: true },
      ],
      dataZoom: [{ type: 'inside', xAxisIndex: [0, 1], filterMode: 'none', minValueSpan: Math.min(5, stops.length) }],
      xAxis: [
        { type: 'category', gridIndex: 0, data: stops, ...AXIS, axisLabel: { show: false } },
        {
          type: 'category',
          gridIndex: 1,
          data: stops,
          ...AXIS,
          name: t('rp.axis.stop'),
          nameLocation: 'middle',
          nameGap: 112,
          nameTextStyle: { fontSize: 11 },
          axisLabel: { ...AXIS.axisLabel, rotate: 45, interval: Math.max(0, Math.ceil(stops.length / 14) - 1), fontSize: 10, width: 110, overflow: 'truncate' },
        },
      ],
      yAxis: [
        { type: 'value', gridIndex: 0, ...AXIS, name: t('rp.axis.dev'), nameLocation: 'middle', nameGap: 38, nameTextStyle: { fontSize: 11 } },
        {
          type: 'value',
          gridIndex: 1,
          ...AXIS,
          splitNumber: 2,
          name: t('rp.axis.hop'),
          nameLocation: 'end',
          nameGap: 8,
          nameTextStyle: { fontSize: 10, align: "left" },
        },
      ],
      series,
    };
  }, [view, forecastRows, t, theme, cmpNorm, ins, dayName, cmpName]);

  // E13: whole day at a glance - rows = start buckets, cols = stops, value = norm mean (min)
  const heatOption = useMemo(() => {
    if (mode !== 'heat') return null;
    const m = dayMatrix(base, route, dir, dow);
    const flat = m.flat();
    if (!flat.length) return null;
    const times = Array.from({ length: BUCKETS }, (_, b) => hhmm(bucketStartS(b)));
    const stops = view.rows.map((r) => r.stop);
    return {
      ...CHART_BASE,
      tooltip: {
        ...CHART_BASE.tooltip,
        trigger: 'item',
        formatter: (p: { value: [number, number, number] }) =>
          `<b>${routeId} · ${dayName}</b><br/>${times[p.value[1]]} · ${stops[p.value[0]]}<br/>${t('rp.axis.dev')}: ${p.value[2].toFixed(1)} ${t('unit.min')}`,
      },
      grid: { ...CHART_BASE.grid, left: 8, right: 12, top: 8, bottom: 94 },
      xAxis: { ...AXIS, type: 'category', data: stops, name: t('chart.axis.stop'), nameLocation: 'middle', nameGap: 60, axisLabel: { ...AXIS.axisLabel, rotate: 45, fontSize: 9, hideOverlap: true } },
      yAxis: { ...AXIS, type: 'category', data: times, inverse: true, name: t('chart.axis.startTime'), nameLocation: 'middle', nameGap: 34, axisLabel: { ...AXIS.axisLabel, interval: 3 } },
      dataZoom: [{ type: 'inside', xAxisIndex: 0, filterMode: 'none', minValueSpan: Math.min(5, stops.length) }],
      visualMap: {
        min: Math.min(...flat) === Math.max(...flat) ? Math.min(...flat) - 0.5 : Math.min(...flat),
        max: Math.min(...flat) === Math.max(...flat) ? Math.max(...flat) + 0.5 : Math.max(...flat),
        precision: 1,
        orient: 'horizontal',
        left: 'center',
        bottom: 0,
        itemHeight: 120,
        formatter: (value: number) => `${value.toFixed(1)} ${t('unit.min')}`,
        textStyle: { color: cssVar('--color-text3', '#8794a6'), fontSize: 10 },
        inRange: { color: [cssVar('--color-accent', '#4d8df0'), cssVar('--color-sev-warn', '#e0a02e'), cssVar('--color-sev-crit', '#ee5f63')] },
      },
      series: [{ id: 'route-day-heat', name: t('rp.axis.dev'), type: 'heatmap', data: m.flatMap((row, b) => row.map((v, i) => [i, b, v])) }],
    };
  }, [mode, base, route, dir, dow, view.rows, theme]);

  // EChart has no click prop; the instance lives on its own div, created in the child's
  // mount effect, which runs before this one. heatOption in the deps: under StrictMode (dev)
  // the fresh child chart is disposed and re-created after this effect ran once, so re-bind
  // to the live instance on the next render (the sim tick re-renders every step).
  useEffect(() => {
    const el = heatRef.current?.firstElementChild as HTMLElement | null;
    const inst = el ? getInstanceByDom(el) : undefined;
    if (!inst) return;
    const onClick = (p: { value?: unknown }) => {
      const v = p.value as [number, number, number] | undefined;
      if (!v) return;
      setBucket(v[1]);
      setMode('trip');
    };
    inst.on('click', onClick);
    return () => {
      inst.off('click', onClick);
    };
  }, [mode, heatOption]);

  useEffect(() => {
    if (mode !== 'trip') return;
    const el = tripRef.current?.firstElementChild as HTMLElement | null;
    const inst = el ? getInstanceByDom(el) : undefined;
    if (!inst) return;
    const onClick = (p: { dataIndex?: number; componentType?: string }) => {
      if (p.componentType !== 'series' || p.dataIndex === undefined) return;
      const row = forecastRows[p.dataIndex];
      if (row) setSelectedK(row.k);
    };
    inst.on('click', onClick);
    return () => {
      inst.off('click', onClick);
    };
  }, [mode, option, forecastRows]);

  const startLabel = hhmm(bucketStartS(bucket));
  const note = view.bus
    ? t('rp.live', { vehicle: view.bus.v.vehicle_id, time: hhmm(view.bus.v.trip_start_s!) })
    : dow !== SIM_DOW
      ? t('rp.otherDay', { dow: dayName })
      : t('rp.noLive', { route: routeId, time: startLabel });

  // ---- insight strip
  const tone = (s: number) => (s > 60 ? 'var(--color-sev-warn)' : s < -60 ? 'var(--color-accent)' : 'var(--color-sev-ok)');
  const segLabel = ins.worstSeg ? segmentName(ins.worstSeg.key, lang) : '';
  const cmpSentence =
    ins.diff === null
      ? ''
      : t(Math.abs(ins.diff) < 3 ? 'rp.ins.same' : ins.diff > 0 ? 'rp.ins.worse' : 'rp.ins.better', { a: dayName, b: cmpName, d: m1(Math.abs(ins.diff)) });
  // quick compare: the busiest weekday and the quietest day, never the day already shown
  const quick = [FRI, SUN, MON].filter((d) => d !== dow).slice(0, 2);
  const planMin = tripForecast.plannedDurationS / 60;
  const onset = forecastRows.find((r) => r.state === 'delay' || r.state === 'significant') ?? null;
  const selected = forecastRows.find((r) => r.k === selectedK) ?? null;
  const forecastEnd = forecastRows.at(-1)?.forecastDeviationS ?? 0;
  const forecastPct = planMin ? (tripForecast.forecastDurationS - tripForecast.plannedDurationS) / tripForecast.plannedDurationS : 0;
  const needsReview = forecastRows.some((r) => r.state === 'significant');
  const stateTone = (state: RouteForecastStop['state']): 'ok' | 'warn' | 'crit' | 'info' =>
    state === 'significant' ? 'crit' : state === 'delay' ? 'warn' : state === 'recovery' ? 'info' : 'ok';
  const evidence = tripForecast.evidence;
  const openHotspots = () => {
    const q = new URLSearchParams({ tab: 'hotspots', route: routeId, dow: String(dow), start: String(bucket) });
    location.hash = `#/analytics?${q.toString()}`;
  };

  return (
    <div data-route-profile>
    <Panel titleKey="rp.title" sub={t('rp.sub')} bodyClassName="flex flex-col gap-2 p-2">
      <div className="flex flex-wrap items-end gap-2">
        <div data-route-select>
        <Select
          label={t('rp.route')}
          value={routeId}
          onChange={setRouteId}
          options={routes.map((r) => ({ value: r.route_id, label: `${r.route_id} · ${lang === 'mn' ? r.name_mn : r.name_en}` }))}
        />
        </div>
        <div><Select
          label={t('rp.dir')}
          value={String(dir) as '0' | '1'}
          onChange={(v) => setDir(v === '1' ? 1 : 0)}
          options={[
            { value: '0', label: t('rp.dir0') },
            { value: '1', label: t('rp.dir1') },
          ]}
        /></div>
        <div data-route-day><Select
          label={t('rp.dow')}
          value={String(dow)}
          onChange={(v) => setDow(+v)}
          options={[0, 1, 2, 3, 4, 5, 6].map((d) => ({ value: String(d), label: t(`dow.${d}` as I18nKey) }))}
        /></div>
        <div data-route-start><Select
          label={t('rp.start')}
          value={String(bucket)}
          onChange={(v) => setBucket(+v)}
          options={Array.from({ length: BUCKETS }, (_, b) => ({ value: String(b), label: hhmm(bucketStartS(b)) }))}
        /></div>
        <Select
          label={t('rp.compare')}
          value={cmp === null ? '' : String(cmp)}
          onChange={(v) => setCmp(v === '' ? null : +v)}
          options={[
            { value: '', label: t('rp.compareNone') },
            ...[0, 1, 2, 3, 4, 5, 6].map((d) => ({ value: String(d), label: t(`dow.${d}` as I18nKey) })),
          ]}
        />
        <div className="flex gap-1" role="group">
          <Button size="sm" variant={mode === 'trip' ? 'primary' : 'ghost'} onClick={() => setMode('trip')}>
            {t('rp.view.trip')}
          </Button>
          <Button size="sm" variant={mode === 'heat' ? 'primary' : 'ghost'} onClick={() => setMode('heat')}>
            {t('rp.view.heat')}
          </Button>
        </div>
      </div>
      <p className="t-meta" data-route-profile-note>
        {mode === 'heat' ? t('rp.heat.hint', { dow: dayName }) : note}
      </p>
      {mode === 'trip' ? (
        <p className="t-meta" data-route-forecast-evidence>
          {t('rp.evidence', {
            method: evidence.methodology,
            weeks: evidence.baselineWeeks,
            coverage: Math.round(evidence.liveSegmentCoverage * 100),
          })}
        </p>
      ) : null}
      {mode === 'heat' && heatOption ? (
        <div key="heat" className="shrink-0" style={{ height: 520 }} data-route-profile-heatmap ref={heatRef}>
          <EChart option={heatOption} ariaLabel={`${routeId} ${dayName} ${t('rp.axis.dev')} · ${t('chart.axis.startTime')} × ${t('chart.axis.stop')}`} />
        </div>
      ) : mode === 'heat' ? (
        <div className="h-[320px]"><Empty title={t('rp.ins.segNone')} text={t('rp.heat.hint', { dow: dayName })} /></div>
      ) : (
        <>
          <div className="grid shrink-0 grid-cols-2 gap-2 xl:grid-cols-4" data-route-profile-insights>
            <Tile
              label={t('rp.ins.end')}
              value={`${sgn(forecastEnd)} ${t('unit.min')}`}
              tone={tone(forecastEnd)}
              sub={t('rp.ins.endSub', { dow: dayName, time: startLabel, lo: m1(ins.end.p10), hi: m1(ins.end.p90) })}
            />
            {ins.diff !== null && ins.endCmp ? (
              <Tile
                label={t('rp.ins.cmp')}
                value={cmpSentence}
                text
                tone={Math.abs(ins.diff) < 3 ? undefined : ins.diff > 0 ? 'var(--color-sev-warn)' : 'var(--color-sev-ok)'}
                sub={t('rp.ins.cmpSub', { b: cmpName, m: sgn(ins.endCmp.mean) })}
              />
            ) : (
              <Tile label={t('rp.ins.cmp')} sub={t('rp.ins.quick')}>
                <div className="mt-0.5 flex gap-1">
                  {quick.map((d) => (
                    <Button key={d} size="sm" onClick={() => setCmp(d)}>
                      {t(`dow.${d}` as I18nKey)}
                    </Button>
                  ))}
                </div>
              </Tile>
            )}
            <Tile
              label={t('rp.ins.seg')}
              value={ins.worstSeg ? segLabel : t('rp.ins.segNone')}
              text
              sub={
                ins.worstSeg
                  ? t('rp.ins.segSub', { m: m1(ins.worstSeg.s), stop: view.rows[ins.fastestK]!.stop, s: Math.round(ins.hop[ins.fastestK]!) })
                  : undefined
              }
            />
            <Tile
              label={t('rp.ins.dur')}
              value={t('rp.ins.durVal', { act: (tripForecast.forecastDurationS / 60).toFixed(0), plan: planMin.toFixed(0) })}
              tone={tone(forecastEnd)}
              sub={t('rp.ins.durSub', { pct: `${forecastPct >= 0 ? '+' : ''}${(forecastPct * 100).toFixed(1)}` })}
            />
          </div>
          <p className="t-body text-[var(--color-text2)]" data-route-profile-takeaway>
            {t('rp.forecast.summary', { end: sgn(forecastEnd), norm: sgn(ins.end.mean), comparison: cmpSentence ? `${cmpSentence}.` : '' })}
          </p>
          <div className="flex flex-wrap items-center gap-2 rounded border border-[var(--color-line)] bg-[var(--color-bg2)] px-3 py-2" data-route-state-legend>
            <span className="t-label mr-1">{t('rp.legend.states')}</span>
            {(['within_norm', 'delay', 'significant', 'recovery'] as const).map((state) => (
              <StatusPill key={state} tone={stateTone(state)}>{t(`rp.state.${state}` as I18nKey)}</StatusPill>
            ))}
            <span className="t-body ml-auto text-[var(--color-text2)]" data-route-deviation-onset>
              {onset
                ? t('rp.onset', { stop: onset.stop, time: hhmm(onset.forecastArrivalS), dev: m1(onset.forecastDeviationS) })
                : t('rp.onset.none')}
            </span>
          </div>
          <p className="t-meta rounded border border-dashed border-[var(--color-line)] px-3 py-2">{t('rp.modelDisclaimer')}</p>
          <div key="trip" ref={tripRef} className="shrink-0" style={{ height: 500 }} data-route-profile-chart>
            <EChart option={option} ariaLabel={`${routeId} · ${dayName} ${startLabel} · ${t('rp.axis.dev')} / ${t('rp.axis.stop')}`} />
          </div>
          <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.45fr)]">
            <div className="rounded border border-[var(--color-line)] bg-[var(--color-bg2)] p-3" data-route-stop-detail>
              <div className="t-label">{t('rp.detail.title')}</div>
              {selected ? (
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
                  <Tile label={t('rp.col.stop')} value={selected.stop} text sub={selected.seg} />
                  <Tile label={t('rp.col.forecastArrival')} value={hhmm(selected.forecastArrivalS)} sub={`${t('rp.col.scheduledArrival')}: ${hhmm(selected.scheduledArrivalS)}`} />
                  <Tile label={t('rp.col.normArrival')} value={hhmm(selected.normArrivalS)} sub={`${sgn(selected.normDeviationS)} ${t('unit.min')}`} />
                  <Tile label={t('rp.detail.segmentGain')} value={`${sgn(selected.hopForecastAccumulationS)} ${t('unit.min')}`} tone={tone(selected.hopForecastAccumulationS)} />
                  <Tile label={t('rp.detail.confidence')} value={`${Math.round(selected.confidence * 100)}%`}>
                    <StatusPill tone={stateTone(selected.state)}>{t(`rp.state.${selected.state}` as I18nKey)}</StatusPill>
                  </Tile>
                </div>
              ) : <p className="t-meta mt-1">{t('rp.detail.hint')}</p>}
            </div>
            <div className="rounded border border-[var(--color-line)] bg-[var(--color-bg2)] p-3" data-route-operational-action>
              <div className="t-label">{t('rp.action.title')}</div>
              <p className="t-body mt-1 text-[var(--color-text1)]">{t(needsReview ? 'rp.action.review' : 'rp.action.monitor')}</p>
              <p className="t-meta mt-1">
                {t('rp.action.evidence', {
                  state: t(`rp.state.${onset?.state ?? 'within_norm'}` as I18nKey),
                  stop: onset?.stop ?? forecastRows[0]?.stop ?? EM_DASH,
                  end: m1(forecastEnd),
                  confidence: Math.round(tripForecast.confidence * 100),
                })}
              </p>
              <Button size="sm" className="mt-2" onClick={openHotspots}>{t('rp.action.openHotspots')}</Button>
            </div>
          </div>
        </>
      )}
      <div className="max-h-[280px] overflow-auto rounded border border-[var(--color-line)]" data-route-stop-table>
        <table className="t-body w-full min-w-[1050px]">
          <thead className="sticky top-0 bg-[var(--color-bg1)]" style={{ zIndex: 'var(--z-sticky)' }}>
            <tr>{[
              t('rp.col.stop'), t('rp.col.scheduledArrival'), t('rp.col.normArrival'), t('rp.col.forecastArrival'),
              t('rp.col.forecastDev'), t('rp.col.cumulative'), t('rp.col.state'), t('rp.col.segment'),
            ].map((label) => <th key={label} scope="col" className="t-label px-2 py-1 text-left">{label}</th>)}</tr>
          </thead>
          <tbody>
            {forecastRows.map((r) => (
              <tr
                key={r.k}
                role="button"
                tabIndex={0}
                data-route-stop-row
                data-stop-index={r.k}
                data-deviation-state={r.state}
                aria-pressed={selectedK === r.k}
                onClick={() => setSelectedK(r.k)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedK(r.k); } }}
                className={`cursor-pointer border-t border-[var(--color-line)] hover:bg-[var(--color-bg2)] ${selectedK === r.k ? 'bg-[var(--color-bg3)]' : ''}`}
              >
                <td className="px-2 py-1 font-medium">{r.stop}</td>
                <td className="num px-2 py-1" data-scheduled-arrival>{hhmm(r.scheduledArrivalS)}</td>
                <td className="num px-2 py-1" data-norm-arrival>{hhmm(r.normArrivalS)}</td>
                <td className="num px-2 py-1" data-forecast-arrival>{hhmm(r.forecastArrivalS)}</td>
                <td className="num px-2 py-1" data-forecast-deviation>{sgn(r.forecastDeviationS)} {t('unit.min')}</td>
                <td className="num px-2 py-1" data-cumulative-deviation>{sgn(r.cumulativeForecastDeviationS)} {t('unit.min')}</td>
                <td className="px-2 py-1"><StatusPill tone={stateTone(r.state)}>{t(`rp.state.${r.state}` as I18nKey)}</StatusPill></td>
                <td className="px-2 py-1">{r.seg}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
    </div>
  );
}
