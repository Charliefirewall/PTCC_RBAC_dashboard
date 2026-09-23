/**
 * Route profile (PTCC scenario 3a) - "forecast by route the potential deviation over time
 * of the day (Mon to Sun) ... the whole trip with all bus stops, with the forecast
 * deviation, also with the norm for comparison". Extension - outside R1096 scope.
 *
 * Every number here is read, not modelled anew:
 *   norm band / mean   baseline.profile()     - synthetic 8-week norm (SIMULATED)
 *   actual             world.tripLog          - the live trip's stop arrivals
 *   forecast tail      forecastStops()        - the same model as the scenario-2 forecast
 *   bars ("other data") segExcess × hop_km    - where along the trip the norm gains delay
 *
 * A live overlay exists only when a bus on this route and direction started its trip in
 * the chosen 15-min bucket AND the chosen day is the sim date's day; otherwise the
 * forecast for that start is the norm itself, and the screen says so.
 */

import { useMemo, useState } from 'react';
import { useSettings, useSim, world } from '../../store';
import { baselineOf, bucketOf, bucketStartS, BUCKET_MIN, BUCKETS, SIM_DOW } from '../../sim/baseline';
import { hhmm } from '../../sim/engine';
import { tripIdOf } from '../../sim/types';
import { forecastStops } from '../../rules/forecast';
import { segmentName } from '../../data/segments';
import { EChart, AXIS, CHART_BASE } from '../../charts/EChart';
import { DataTable, Panel, type Column } from '../../components/primitives';
import { Select } from '../../components/kit';
import { useLang, useT } from '../../i18n/t';
import type { I18nKey } from '../../i18n/dict';

const HERO_FIRST = ['R7', 'R12', 'R5'];
const EM_DASH = '—';

function cssVar(n: string, f: string): string {
  return typeof document === 'undefined' ? f : getComputedStyle(document.documentElement).getPropertyValue(n).trim() || f;
}
const min = (s: number) => +(s / 60).toFixed(2);

interface Row {
  k: number;
  stop: string;
  planned_s: number;
  norm: number;
  half: number;
  actual: number | null;
  seg: string;
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
    const fc = bus ? forecastStops(world, bus.v, dow, tau) : null;
    const rows: Row[] = hops.map((h, i) => ({
      k: h.k,
      stop: lang === 'mn' ? h.stop.name_mn : h.stop.name_en,
      planned_s: bucketStartS(bucket) + h.offset_s,
      norm: norm[i]!.mean,
      half: (norm[i]!.p90 - norm[i]!.p10) / 2,
      actual: actual.get(h.k) ?? null,
      seg: h.seg_key ? segmentName(h.seg_key, lang) : EM_DASH,
    }));
    const bars = hops.map((h) =>
      h.seg_key ? Math.round(base.segExcess(h.seg_key, dow, bucket + Math.floor(h.offset_s / (BUCKET_MIN * 60))).mean * h.hop_km) : 0,
    );
    return { hops, norm, bus, fc, rows, bars };
    // tick: the live trip's log and forecast change every sim step
  }, [base, route, routeId, dir, dow, bucket, tau, lang, tick]);

  const option = useMemo(() => {
    const { norm, bus, fc, rows, bars } = view;
    const F = cssVar('--color-forecast', '#b48cf2');
    const T3 = cssVar('--color-text3', '#8794a6');
    const T2 = cssVar('--color-text2', '#9caabb');
    const A = cssVar('--color-accent', '#4d8df0');
    const series: Record<string, unknown>[] = [
      // band = invisible p10 line + stacked (p90 - p10) area; 'all' so negative p10 still stacks
      { name: 'p10', type: 'line', stack: 'band', stackStrategy: 'all', symbol: 'none', lineStyle: { opacity: 0 }, data: norm.map((n) => min(n.p10)), tooltip: { show: false } },
      {
        name: t('rp.band'),
        type: 'line',
        stack: 'band',
        stackStrategy: 'all',
        symbol: 'none',
        lineStyle: { opacity: 0 },
        areaStyle: { color: T3 + '33' },
        itemStyle: { color: T3 }, // legend swatch
        data: norm.map((n) => min(n.p90 - n.p10)),
        tooltip: { show: false },
      },
      { name: t('rp.normMean'), type: 'line', symbol: 'none', lineStyle: { color: T2, width: 1.5 }, itemStyle: { color: T2 }, data: norm.map((n) => min(n.mean)) },
      {
        name: t('rp.segExcess'),
        type: 'bar',
        yAxisIndex: 1,
        barWidth: '40%',
        itemStyle: { color: T3 + '66' },
        data: bars,
      },
    ];
    if (bus && fc) {
      const k0 = fc.k0;
      series.push({
        name: t('rp.actual'),
        type: 'line',
        symbolSize: 4,
        connectNulls: true,
        lineStyle: { color: A, width: 2 },
        itemStyle: { color: A },
        data: rows.map((r) => (r.k <= k0 && r.actual !== null ? min(r.actual) : null)),
      });
      const ahead = new Map(fc.ahead.map((a) => [a.k, a.mean]));
      series.push({
        name: t('rp.forecast'),
        type: 'line',
        symbol: 'none',
        lineStyle: { color: F, width: 2, type: 'dashed' },
        itemStyle: { color: F },
        // starts at the bus's current deviation so the tail joins the actual line
        data: rows.map((r) => (r.k === k0 ? min(bus.v.schedule_deviation) : ahead.has(r.k) ? min(ahead.get(r.k)!) : null)),
      });
    } else {
      series.push({
        name: t('rp.forecastNorm'),
        type: 'line',
        symbol: 'none',
        lineStyle: { color: F, width: 2, type: 'dashed' },
        itemStyle: { color: F },
        data: norm.map((n) => min(n.mean)),
      });
    }
    return {
      ...CHART_BASE,
      grid: { ...CHART_BASE.grid, left: 44, right: 44, top: 30, bottom: 70 },
      legend: { top: 0, itemWidth: 14, itemHeight: 6, textStyle: { fontSize: 10 }, data: series.map((s) => s.name as string).filter((n) => n !== 'p10') },
      xAxis: { type: 'category', data: rows.map((r) => r.stop), ...AXIS, axisLabel: { ...AXIS.axisLabel, rotate: 40, fontSize: 9, hideOverlap: true } },
      yAxis: [
        { type: 'value', name: 'min', ...AXIS },
        { type: 'value', name: 's', ...AXIS, splitLine: { show: false } },
      ],
      series,
    };
  }, [view, t, theme]);

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
      ? t('rp.otherDay', { dow: t(`dow.${dow}` as I18nKey) })
      : t('rp.noLive', { route: routeId, time: startLabel });

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
      </div>
      <p className="t-meta" data-route-profile-note>
        {note}
      </p>
      <div style={{ height: 340 }} data-route-profile-chart>
        <EChart option={option} />
      </div>
      <DataTable columns={columns} rows={view.rows} rowKey={(r) => String(r.k)} compact maxHeight={320} />
    </Panel>
  );
}
