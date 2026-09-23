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

import { devHistory } from '../../store/forecast';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { getInstanceByDom } from 'echarts/core';
import { useSettings, useSim, world } from '../../store';
import { baselineOf, bucketOf, bucketStartS, BUCKETS, SIM_DOW } from '../../sim/baseline';
import { hhmm } from '../../sim/engine';
import { tripIdOf } from '../../sim/types';
import { forecastStops } from '../../rules/forecast';
import { segmentName } from '../../data/segments';
import { EChart, AXIS, CHART_BASE } from '../../charts/EChart';
import { Button, DataTable, Panel, type Column } from '../../components/primitives';
import { Select } from '../../components/kit';
import { dayMatrix } from './dayMatrix';
import { routeInsight } from './routeInsight';
import { useLang, useT } from '../../i18n/t';
import type { I18nKey } from '../../i18n/dict';

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
  const heatRef = useRef<HTMLDivElement>(null);
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
    const fc = bus ? forecastStops(world, bus.v, dow, tau, devHistory.get(bus.v.route_id)) : null;
    const rows: Row[] = hops.map((h, i) => ({
      k: h.k,
      stop: lang === 'mn' ? h.stop.name_mn : h.stop.name_en,
      planned_s: bucketStartS(bucket) + h.offset_s,
      norm: norm[i]!.mean,
      half: (norm[i]!.p90 - norm[i]!.p10) / 2,
      actual: actual.get(h.k) ?? null,
      seg: h.seg_key ? segmentName(h.seg_key, lang) : EM_DASH,
    }));
    return { hops, norm, bus, fc, rows };
    // tick: the live trip's log and forecast change every sim step
  }, [base, route, routeId, dir, dow, bucket, tau, lang, tick]);

  // compare day's norm + the insight strip's numbers (the per-hop bars come from here too)
  const cmpNorm = useMemo(() => (cmp === null ? null : base.profile(route, dir, cmp, bucket)), [base, route, dir, cmp, bucket]);
  const ins = useMemo(() => routeInsight(view.hops, view.norm, cmpNorm), [view, cmpNorm]);
  const dayName = t(`dow.${dow}` as I18nKey);
  const cmpName = cmp === null ? '' : t(`dow.${cmp}` as I18nKey);

  const option = useMemo(() => {
    const { norm, bus, fc, rows } = view;
    const F = cssVar('--color-forecast', '#b48cf2');
    const T1 = cssVar('--color-text1', '#e7edf5');
    const T3 = cssVar('--color-text3', '#8794a6');
    const P = cssVar('--color-accent', '#4d8df0');
    const C = cssVar('--color-ev-high', '#e07b39');
    const band = (name: string, stack: string, p: typeof norm, col: string, alpha: string, z: number, edge?: string) => [
      // edge: the compare band is drawn as dotted p10/p90 outlines over a faint fill, so two
      // overlapping bands stay two colours instead of blending to grey
      // band = invisible p10 line + stacked (p90 - p10) area; 'all' so negative p10 still stacks
      { name: stack, type: 'line', stack, stackStrategy: 'all', symbol: 'none', lineStyle: edge ? { color: edge, width: 1, type: 'dotted' } : { opacity: 0 }, data: p.map((n) => min(n.p10)), silent: true, z },
      {
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
        name: t('rp.s.mean', { dow: cmpName }),
        type: 'line',
        symbol: 'none',
        z: 3,
        lineStyle: { color: C, width: 2, type: [6, 3] },
        itemStyle: { color: C },
        data: cmpNorm.map((n) => min(n.mean)),
      });
    }
    let fcData: (number | null)[] = norm.map((n) => min(n.mean));
    let actData: (number | null)[] | null = null;
    if (bus && fc) {
      const k0 = fc.k0;
      actData = rows.map((r) => (r.k <= k0 && r.actual !== null ? min(r.actual) : null));
      series.push({
        name: t('rp.actual'),
        type: 'line',
        symbolSize: 5,
        connectNulls: true,
        z: 6,
        lineStyle: { color: T1, width: 2 },
        itemStyle: { color: T1 },
        data: actData,
      });
      const ahead = new Map(fc.ahead.map((a) => [a.k, a.mean]));
      // starts at the bus's current deviation so the tail joins the actual line
      fcData = rows.map((r) => (r.k === k0 ? min(bus.v.schedule_deviation) : ahead.has(r.k) ? min(ahead.get(r.k)!) : null));
    }
    series.push({
      name: bus && fc ? t('rp.forecast') : t('rp.forecastNorm'),
      type: 'line',
      symbol: 'none',
      // no live trip: the forecast IS the norm mean - a soft violet halo under the mean
      // line instead of dashes that hide it
      z: bus && fc ? 5 : 3,
      lineStyle: bus && fc ? { color: F, width: 2, type: 'dashed' } : { color: F, width: 7, opacity: 0.35 },
      itemStyle: { color: F },
      data: fcData,
    });
    // delay each hop adds: own small grid under the chart, seconds, same stop axis
    const bar = (name: string, d: number[], col: string, hot: number) => ({
      name,
      type: 'bar',
      xAxisIndex: 1,
      yAxisIndex: 1,
      barMaxWidth: 12,
      barGap: '15%',
      itemStyle: { color: col + 'aa' }, // legend swatch
      data: d.map((v, i) => ({ value: Math.round(v), itemStyle: { color: v < 0 ? T3 + '88' : i === hot ? col : col + 'aa' } })),
    });
    series.push(bar(t('rp.s.hop', { dow: dayName }), ins.hop, P, ins.fastestK));
    if (ins.hopCmp) series.push(bar(t('rp.s.hop', { dow: cmpName }), ins.hopCmp, C, -1));

    const dot = (c: string) => `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${c};margin-right:6px"></span>`;
    const line = (c: string, label: string, n: { mean: number; p10: number; p90: number }) =>
      `${dot(c)}${label} <b>${sgn(n.mean)} min</b> <span style="opacity:.7">(${t('rp.tt.range', { lo: m1(n.p10), hi: m1(n.p90) })})</span>`;
    const secs = (v: number) => `${v >= 0 ? '+' : ''}${Math.round(v)} s`;
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
          out.push(`&nbsp;&nbsp;&nbsp;Δ ${t('rp.tt.diff', { a: dayName, b: cmpName })}: <b>${sgn(norm[i]!.mean - cmpNorm[i]!.mean)} min</b>`);
        }
        if (actData?.[i] != null) out.push(`${dot(T1)}${t('rp.actual')} <b>${sgn(actData[i]! * 60)} min</b>`);
        else if (bus && fcData[i] != null) out.push(`${dot(F)}${t('rp.forecast')} <b>${sgn(fcData[i]! * 60)} min</b>`);
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
        { left: 58, right: 18, top: 34, bottom: 232 },
        { left: 58, right: 18, height: 72, bottom: 128 },
      ],
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
          axisLabel: { ...AXIS.axisLabel, rotate: 45, interval: 0, fontSize: 10, width: 110, overflow: 'truncate' },
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
  }, [view, t, theme, cmpNorm, ins, dayName, cmpName]);

  // E13: whole day at a glance - rows = start buckets, cols = stops, value = norm mean (min)
  const heatOption = useMemo(() => {
    if (mode !== 'heat') return null;
    const m = dayMatrix(base, route, dir, dow);
    const flat = m.flat();
    const times = Array.from({ length: BUCKETS }, (_, b) => hhmm(bucketStartS(b)));
    const stops = view.rows.map((r) => r.stop);
    return {
      ...CHART_BASE,
      tooltip: {
        ...CHART_BASE.tooltip,
        trigger: 'item',
        formatter: (p: { value: [number, number, number] }) => `${times[p.value[1]]} · ${stops[p.value[0]]}: ${p.value[2].toFixed(1)} min`,
      },
      grid: { ...CHART_BASE.grid, left: 44, right: 12, top: 8, bottom: 110 },
      xAxis: { type: 'category', data: stops, ...AXIS, axisLabel: { ...AXIS.axisLabel, rotate: 40, fontSize: 9, hideOverlap: true } },
      yAxis: { type: 'category', data: times, inverse: true, ...AXIS, axisLabel: { ...AXIS.axisLabel, interval: 3 } },
      visualMap: {
        min: Math.min(...flat),
        max: Math.max(...flat),
        precision: 1,
        orient: 'horizontal',
        left: 'center',
        bottom: 0,
        itemHeight: 120,
        textStyle: { color: cssVar('--color-text3', '#8794a6'), fontSize: 10 },
        inRange: { color: [cssVar('--color-accent', '#4d8df0'), cssVar('--color-sev-warn', '#e0a02e'), cssVar('--color-sev-crit', '#ee5f63')] },
      },
      series: [{ type: 'heatmap', data: m.flatMap((row, b) => row.map((v, i) => [i, b, v])) }],
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

  const columns: Column<Row>[] = [
    { key: 'stop', label: t('rp.col.stop') },
    { key: 'planned_s', label: t('rp.col.planned'), mono: true, render: (r) => hhmm(r.planned_s) },
    { key: 'norm', label: t('rp.col.norm'), num: true, render: (r) => `${(r.norm / 60).toFixed(1)} ± ${(r.half / 60).toFixed(1)}` },
    { key: 'actual', label: t('rp.col.actual'), num: true, render: (r) => (r.actual === null ? EM_DASH : (r.actual / 60).toFixed(1)) },
    {
      key: 'delta',
      label: t('rp.col.delta'),
      num: true,
      render: (r) => (r.actual === null ? EM_DASH : `${r.actual >= r.norm ? '+' : ''}${((r.actual - r.norm) / 60).toFixed(1)}`),
    },
    { key: 'seg', label: t('rp.col.segment') },
  ];

  const startLabel = hhmm(bucketStartS(bucket));
  const note = view.bus
    ? t('rp.live', { vehicle: view.bus.v.vehicle_id, time: hhmm(view.bus.v.trip_start_s!) })
    : dow !== SIM_DOW
      ? t('rp.otherDay', { dow: dayName })
      : t('rp.noLive', { route: routeId, time: startLabel });

  // ---- insight strip
  const lastStop = view.rows.at(-1)!.stop;
  const tone = (s: number) => (s > 60 ? 'var(--color-sev-warn)' : s < -60 ? 'var(--color-accent)' : 'var(--color-sev-ok)');
  const segLabel = ins.worstSeg ? segmentName(ins.worstSeg.key, lang) : '';
  const tk = ins.end.mean > 60 && ins.worstSeg ? 'rp.take.late' : ins.end.mean < -60 ? 'rp.take.early' : 'rp.take.onTime';
  const takeaway = t(tk, { dow: dayName, time: startLabel, stop: lastStop, m: m1(Math.abs(ins.end.mean)), seg: segLabel });
  const cmpSentence =
    ins.diff === null
      ? ''
      : t(Math.abs(ins.diff) < 3 ? 'rp.ins.same' : ins.diff > 0 ? 'rp.ins.worse' : 'rp.ins.better', { a: dayName, b: cmpName, d: m1(Math.abs(ins.diff)) });
  // quick compare: the busiest weekday and the quietest day, never the day already shown
  const quick = [FRI, SUN, MON].filter((d) => d !== dow).slice(0, 2);
  const planMin = ins.plannedS / 60;

  return (
    <Panel titleKey="rp.title" sub={t('rp.sub')} bodyClassName="flex flex-col gap-2 p-2">
      <div className="flex flex-wrap items-end gap-2">
        <Select
          label={t('rp.route')}
          value={routeId}
          onChange={setRouteId}
          options={routes.map((r) => ({ value: r.route_id, label: `${r.route_id} · ${lang === 'mn' ? r.name_mn : r.name_en}` }))}
        />
        <Select
          label={t('rp.dir')}
          value={String(dir) as '0' | '1'}
          onChange={(v) => setDir(v === '1' ? 1 : 0)}
          options={[
            { value: '0', label: t('rp.dir0') },
            { value: '1', label: t('rp.dir1') },
          ]}
        />
        <Select
          label={t('rp.dow')}
          value={String(dow)}
          onChange={(v) => setDow(+v)}
          options={[0, 1, 2, 3, 4, 5, 6].map((d) => ({ value: String(d), label: t(`dow.${d}` as I18nKey) }))}
        />
        <Select
          label={t('rp.start')}
          value={String(bucket)}
          onChange={(v) => setBucket(+v)}
          options={Array.from({ length: BUCKETS }, (_, b) => ({ value: String(b), label: hhmm(bucketStartS(b)) }))}
        />
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
      {mode === 'heat' && heatOption ? (
        <div key="heat" className="shrink-0" style={{ height: 520 }} data-route-profile-heatmap ref={heatRef}>
          <EChart option={heatOption} />
        </div>
      ) : (
        <>
          <div className="grid shrink-0 grid-cols-2 gap-2 xl:grid-cols-4" data-route-profile-insights>
            <Tile
              label={t('rp.ins.end')}
              value={`${sgn(ins.end.mean)} min`}
              tone={tone(ins.end.mean)}
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
              value={t('rp.ins.durVal', { act: (planMin + ins.end.mean / 60).toFixed(0), plan: planMin.toFixed(0) })}
              tone={tone(ins.end.mean)}
              sub={t('rp.ins.durSub', { pct: `${ins.pct >= 0 ? '+' : ''}${(ins.pct * 100).toFixed(1)}` })}
            />
          </div>
          <p className="t-body text-[var(--color-text2)]" data-route-profile-takeaway>
            {takeaway} {cmpSentence ? `${cmpSentence}.` : ''}
          </p>
          <div key="trip" className="shrink-0" style={{ height: 500 }} data-route-profile-chart>
            <EChart option={option} />
          </div>
        </>
      )}
      <DataTable columns={columns} rows={view.rows} rowKey={(r) => String(r.k)} compact maxHeight={240} />
    </Panel>
  );
}
