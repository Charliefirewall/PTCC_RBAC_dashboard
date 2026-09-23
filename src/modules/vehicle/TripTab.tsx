/**
 * Trip drill-down - PTCC scenario 1: "all the alert when click can link to more drill
 * down information like car number, driver, real time position and other data like
 * historical data of bus speed in this trip, all bus stop stopped each with deviation
 * (+x mins) from the schedule. Also have comparison with the normal of trip in similar
 * time." Scenario 2 adds: "some of the data are forecasted, can use different colour".
 *
 * Every number comes from the engine's own logs (world.tripLog, world.speedLog), the
 * synthetic baseline (sim/baseline.ts) and the forecast model (rules/forecast.ts).
 * Planned arrival = actual - deviation: the engine tracks deviation against its plan at
 * every instant, so no second timetable is needed.
 *
 * Evidence: stop log and speed CONFIRMED in kind (AVL fields, Table 8) but SIMULATED;
 * the norm is a formula (ASSUMPTION); driver details are placeholders (ASSUMPTION);
 * forecast rows are an extension outside R1096 scope.
 */

import { useMemo, useState } from 'react';
import { Empty, EvidenceTag, Panel, Sparkline } from '../../components/primitives';
import { EChart, AXIS, CHART_BASE } from '../../charts/EChart';
import { driverOf } from '../../data/drivers';
import { segmentName } from '../../data/segments';
import type { I18nKey } from '../../i18n/dict';
import { useT } from '../../i18n/t';
import { forecastStops } from '../../rules/forecast';
import { bandColor } from '../../rules/thresholds';
import { baselineOf, bucketOf, bucketStartS } from '../../sim/baseline';
import { hhmm } from '../../sim/engine';
import { tripIdOf, type Route, type Vehicle } from '../../sim/types';
import { useSelection, useSettings, useSim, world } from '../../store';

const DASH = '—';
const fmtDev = (s: number) => (Number.isFinite(s) ? `${s >= 0 ? '+' : '−'}${Math.abs(s / 60).toFixed(1)}` : DASH);
const devColor = (s: number, th_s: number) =>
  s > th_s * 3 ? 'var(--color-sev-crit)' : s > th_s ? 'var(--color-sev-warn)' : 'var(--color-text1)';

interface Row {
  k: number;
  name: string;
  planned_s: number | null;
  actual_s: number | null;
  dev_s: number;
  norm: { mean: number; p10: number; p90: number };
  seg: string | null;
  forecast: boolean;
}

export function TripTab({ v, fromAlert }: { v: Vehicle; fromAlert?: string | null }) {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const dow = useSettings((s) => s.dow);
  const th = useSettings((s) => s.th);
  // re-render every tick: the logs live on the world object, outside React state
  useSim((s) => s.tick);
  const [showPrev, setShowPrev] = useState(false);
  const route = world.routeById.get(v.route_id);
  if (!route) return <Empty title={t('trip.empty')} text={t('trip.emptyHint')} />;

  const log = world.tripLog.get(tripIdOf(v)) ?? [];
  const prev = world.tripLog.get(tripIdOf(v, (v.trip_seq ?? 0) - 1)) ?? [];
  const { norm, ahead } = forecastStops(world, v, dow, th.forecast_drift_tau_min);
  const hops = baselineOf(world).hops(route, v.direction);
  const byK = new Map(log.map((a) => [a.stop_idx, a]));
  const aheadByK = new Map(ahead.map((a) => [a.k, a]));
  const start_s = v.trip_start_s ?? world.sim_time_s;

  const rows: Row[] = hops
    .map((h): Row | null => {
      const a = byK.get(h.k);
      const f = aheadByK.get(h.k);
      const name = lang === 'mn' ? h.stop.name_mn : h.stop.name_en;
      if (a) {
        return { k: h.k, name, planned_s: a.t_s - a.dev_s, actual_s: a.t_s, dev_s: a.dev_s, norm: norm[h.k]!, seg: a.seg_key, forecast: false };
      }
      if (f) {
        return { k: h.k, name, planned_s: f.eta_s - f.mean, actual_s: f.eta_s, dev_s: f.mean, norm: norm[h.k]!, seg: h.seg_key, forecast: true };
      }
      return null;
    })
    .filter((r): r is Row => r !== null);

  const speeds = world.speedLog.get(v.vehicle_id)?.toArray() ?? [];
  const sinceStart = Math.max(2, Math.round((world.sim_time_s - start_s) / 5));
  const tripSpeeds = speeds.slice(-sinceStart);
  const avg = tripSpeeds.length ? tripSpeeds.reduce((s, x) => s + x, 0) / tripSpeeds.length : 0;
  const max = tripSpeeds.length ? Math.max(...tripSpeeds) : 0;

  return (
    <div className="flex flex-col gap-3" data-trip-tab="">
      {fromAlert ? <p className="t-meta">{t('trip.fromAlert', { id: fromAlert })}</p> : null}
      <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
        <DriverPanel v={v} />
        <PositionPanel v={v} route={route} />
        <Panel title={t('trip.speed')} bodyClassName="p-3">
          <Sparkline values={tripSpeeds.length > 1 ? tripSpeeds : [0, 0]} width={240} height={48} />
          <p className="num t-meta mt-1">
            {t('trip.speedStats', { avg: avg.toFixed(1), max: max.toFixed(0), n: tripSpeeds.length })}
          </p>
        </Panel>
      </div>

      <Panel
        title={t('trip.chart')}
        right={
          <span className="flex items-center gap-2">
            <label className="t-meta flex items-center gap-1">
              <input type="checkbox" checked={showPrev} onChange={(e) => setShowPrev(e.target.checked)} />
              {t('trip.showPrev')}
            </label>
            <EvidenceTag label="ASSUMPTION" cite="norm = formula" />
          </span>
        }
        bodyClassName="p-2"
      >
        <p className="t-meta mb-1">
          {t('trip.normNote', { dow: t(`dow.${dow}` as I18nKey), start: hhmm(bucketStartS(bucketOf(start_s))) })}
        </p>
        <div style={{ height: 220 }}>
          <TripChart rows={rows} prev={showPrev ? prev.map((a) => ({ k: a.stop_idx, dev_s: a.dev_s })) : []} hops={hops.length} />
        </div>
      </Panel>

      <Panel title={t('trip.stops')} bodyClassName="p-0">
        {rows.length === 0 ? (
          <Empty title={t('trip.empty')} text={t('trip.emptyHint')} />
        ) : (
          <table className="num w-full text-[11px]" data-trip-stops="">
            <thead className="text-left text-[var(--color-text3)]">
              <tr>
                <th className="px-2 py-1">#</th>
                <th className="px-2 py-1">{t('trip.stop')}</th>
                <th className="px-2 py-1">{t('trip.planned')}</th>
                <th className="px-2 py-1">{t('trip.actual')}</th>
                <th className="px-2 py-1">{t('trip.dev')}</th>
                <th className="px-2 py-1">{t('trip.norm')}</th>
                <th className="px-2 py-1">{t('trip.vsNorm')}</th>
                <th className="px-2 py-1">{t('trip.segment')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.k}
                  data-stop-row=""
                  data-forecast={r.forecast ? '' : undefined}
                  className="border-t border-[var(--color-line)]"
                  style={r.forecast ? { color: 'var(--color-forecast)' } : undefined}
                >
                  <td className="px-2 py-1">{r.k + 1}</td>
                  <td className="px-2 py-1">
                    {r.name}
                    {r.forecast ? <span className="ml-1 text-[10px] italic">({t('trip.forecastRow')})</span> : null}
                  </td>
                  <td className="px-2 py-1">{r.planned_s === null ? DASH : hhmm(r.planned_s)}</td>
                  <td className="px-2 py-1">{r.actual_s === null ? DASH : `${r.forecast ? '≈' : ''}${hhmm(r.actual_s)}`}</td>
                  <td className="px-2 py-1 font-semibold" style={r.forecast ? undefined : { color: devColor(r.dev_s, th.schedule_deviation_s) }}>
                    {t('trip.min', { v: fmtDev(r.dev_s) })}
                  </td>
                  <td className="px-2 py-1 text-[var(--color-text3)]">
                    {fmtDev(r.norm.mean)} ({fmtDev(r.norm.p10)}…{fmtDev(r.norm.p90)})
                  </td>
                  <td className="px-2 py-1">{fmtDev(r.dev_s - r.norm.mean)}</td>
                  <td className="px-2 py-1 text-[var(--color-text3)]">{r.seg ? segmentName(r.seg, lang) : DASH}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}

function DriverPanel({ v }: { v: Vehicle }) {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const d = driverOf(v.driver_id, v.operator_id);
  return (
    <Panel title={t('trip.driver')} right={<EvidenceTag label="ASSUMPTION" cite="S5: id only" />} bodyClassName="p-3">
      <p className="text-[13px] font-semibold text-[var(--color-text1)]">{lang === 'mn' ? d.name_mn : d.name_en}</p>
      <p className="num t-meta">
        {d.driver_id} · {t('trip.shift')} {d.shift} · {t('trip.radio')} {d.radio} · {t('trip.years')} {d.years}
      </p>
      <p className="t-meta mt-1 italic">{t('trip.driverNote')}</p>
    </Panel>
  );
}

/** Inline-SVG mini-map: the route, its stops, the bus. No second MapLibre instance. */
function PositionPanel({ v, route }: { v: Vehicle; route: Route }) {
  const t = useT();
  const W = 240;
  const H = 110;
  const xs = route.shape.map((p) => p[0]);
  const ys = route.shape.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  // keep aspect: 1 deg lon ~ 0.67 deg lat at UB's latitude
  const sx = (W - 12) / Math.max((x1 - x0) * 0.67, y1 - y0, 1e-6);
  const px = (lon: number) => 6 + (lon - x0) * 0.67 * sx;
  const py = (lat: number) => H - 6 - (lat - y0) * sx;
  const path = useMemo(
    () => route.shape.map((p, i) => `${i ? 'L' : 'M'}${px(p[0]).toFixed(1)},${py(p[1]).toFixed(1)}`).join(''),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [route],
  );
  return (
    <Panel title={t('trip.position')} bodyClassName="p-3">
      <svg width={W} height={H} role="img" aria-label={t('trip.position')} data-minimap="">
        <path d={path} fill="none" stroke="var(--color-line)" strokeWidth={3} />
        {route.stops.map((s) => (
          <circle key={s.stop_id} cx={px(s.longitude)} cy={py(s.latitude)} r={1.8} fill="var(--color-text3)" />
        ))}
        <circle cx={px(v.longitude)} cy={py(v.latitude)} r={5} fill="var(--color-accent)" stroke="var(--color-bg1)" strokeWidth={1.5} />
      </svg>
      <p className="num t-meta">
        {v.latitude.toFixed(5)}, {v.longitude.toFixed(5)} · {Math.round(v.speed)} km/h
      </p>
      <button
        type="button"
        className="t-meta mt-1 text-[var(--color-accent)] hover:underline"
        onClick={() => {
          useSelection.getState().selectVehicle(v.vehicle_id);
          location.hash = '#/map';
        }}
      >
        {t('trip.openMap')} ↗
      </button>
    </Panel>
  );
}

function TripChart({ rows, prev, hops }: { rows: Row[]; prev: { k: number; dev_s: number }[]; hops: number }) {
  const t = useT();
  const fc = bandColor({ token: '--color-forecast' }, '#b48cf2');
  const accent = bandColor({ token: '--color-accent' }, '#4d8df0');
  const muted = bandColor({ token: '--color-text3' }, '#8794a6');
  const cats = Array.from({ length: hops }, (_, i) => String(i + 1));
  const at = (k: number, f: (r: Row) => number | null) => {
    const r = rows.find((x) => x.k === k);
    const v = r ? f(r) : null;
    return v === null ? null : Math.round((v / 60) * 10) / 10;
  };
  const option = {
    ...CHART_BASE,
    legend: { top: 0, right: 0, textStyle: { fontSize: 10 } },
    grid: { ...CHART_BASE.grid, top: 24 },
    xAxis: { ...AXIS, type: 'category', data: cats, name: t('trip.stop'), nameLocation: 'middle', nameGap: 20 },
    yAxis: { ...AXIS, type: 'value', name: 'min' },
    series: [
      // p10-p90 band: an invisible floor plus a stacked fill
      { name: 'p10', type: 'line', stack: 'band', symbol: 'none', lineStyle: { opacity: 0 }, data: cats.map((_, k) => at(k, (r) => r.norm.p10)), tooltip: { show: false } },
      {
        name: t('trip.bandSeries'), type: 'line', stack: 'band', symbol: 'none', lineStyle: { opacity: 0 },
        areaStyle: { color: muted, opacity: 0.18 },
        data: cats.map((_, k) => { const lo = at(k, (r) => r.norm.p10); const hi = at(k, (r) => r.norm.p90); return lo === null || hi === null ? null : Math.round((hi - lo) * 10) / 10; }),
      },
      { name: t('trip.normSeries'), type: 'line', symbol: 'none', lineStyle: { color: muted, type: 'dotted' }, itemStyle: { color: muted }, data: cats.map((_, k) => at(k, (r) => r.norm.mean)) },
      { name: t('trip.actualSeries'), type: 'line', symbolSize: 4, lineStyle: { color: accent, width: 2 }, itemStyle: { color: accent }, data: cats.map((_, k) => at(k, (r) => (r.forecast ? null : r.dev_s))) },
      {
        name: t('fc.legend'), type: 'line', symbolSize: 3, lineStyle: { color: fc, type: 'dashed', width: 2 }, itemStyle: { color: fc },
        // join the forecast to the last actual point so the line is continuous
        data: cats.map((_, k) => {
          const r = rows.find((x) => x.k === k);
          if (!r) return null;
          const nextIsForecast = rows.find((x) => x.k === k + 1)?.forecast;
          return r.forecast || nextIsForecast ? Math.round((r.dev_s / 60) * 10) / 10 : null;
        }),
      },
      ...(prev.length
        ? [{ name: t('trip.prevSeries'), type: 'line', symbol: 'none', lineStyle: { color: muted, width: 1 }, itemStyle: { color: muted }, data: cats.map((_, k) => { const p = prev.find((x) => x.k === k); return p ? Math.round((p.dev_s / 60) * 10) / 10 : null; }) }]
        : []),
    ],
  };
  return <EChart option={option} />;
}
