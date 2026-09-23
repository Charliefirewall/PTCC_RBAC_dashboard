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

import { devHistory } from '../../store/forecast';
import { useMemo, useState } from 'react';
import { Empty, EvidenceTag, Panel, Sparkline } from '../../components/primitives';
import { EChart, AXIS, CHART_BASE } from '../../charts/EChart';
import { driverOf, maskName } from '../../data/drivers';
import { segmentName } from '../../data/segments';
import type { I18nKey } from '../../i18n/dict';
import { useT } from '../../i18n/t';
import { forecastStops } from '../../rules/forecast';
import { bandColor } from '../../rules/thresholds';
import { baselineOf, bucketOf, bucketStartS } from '../../sim/baseline';
import { hhmm } from '../../sim/engine';
import { tripIdOf, type Route, type Vehicle } from '../../sim/types';
import { useComms, useEvents, useSelection, useSettings, useSim, world } from '../../store';
import { useSop } from '../../store/sop';

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
  // route trend: a route still holding late keeps this bus late at its remaining stops
  const { norm, ahead, k0 } = forecastStops(world, v, dow, th.forecast_drift_tau_min, devHistory.get(v.route_id));
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
    // Fills the tab body: chart + stops table on the left (~2/3), the bus's facts
    // stacked on the right (~1/3). min-h keeps the table usable on a 768px screen,
    // where the tab body then scrolls instead of squeezing the table to nothing.
    <div className="flex min-h-[440px] flex-1 flex-col gap-2" data-trip-tab="">
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 lg:grid-cols-3">
        <div className="flex min-h-0 min-w-0 flex-col gap-2 lg:col-span-2">
          <Panel
            className="shrink-0"
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
            bodyClassName="px-2 pb-1 pt-1"
          >
            <p className="t-meta px-1">
              {t('trip.normNote', { dow: t(`dow.${dow}` as I18nKey), start: hhmm(bucketStartS(bucketOf(start_s))) })}
            </p>
            <div className="h-[clamp(180px,29vh,330px)]">
              <TripChart
                rows={rows}
                norm={norm}
                names={hops.map((h) => (lang === 'mn' ? h.stop.name_mn : h.stop.name_en))}
                k0={k0}
                prev={showPrev ? prev.map((a) => ({ k: a.stop_idx, dev_s: a.dev_s })) : null}
              />
            </div>
          </Panel>

          <Panel title={t('trip.stops')} className="min-h-[170px] flex-1" bodyClassName="p-0">
            {rows.length === 0 ? (
              <Empty title={t('trip.empty')} text={t('trip.emptyHint')} />
            ) : (
              <table className="num w-full whitespace-nowrap text-[11px]" data-trip-stops="">
                {/* sticky header: the panel body is the scroll area */}
                <thead className="sticky top-0 bg-[var(--color-bg1)] text-left text-[var(--color-text3)]" style={{ zIndex: 'var(--z-raised)' }}>
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
                      style={r.forecast ? { color: 'var(--color-forecast)' } : r.k === k0 ? { background: 'var(--color-bg2)' } : undefined}
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
                      <td className="max-w-[16rem] truncate px-2 py-1 text-[var(--color-text3)]" title={r.seg ? segmentName(r.seg, lang) : undefined}>
                        {r.seg ? segmentName(r.seg, lang) : DASH}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>
        </div>

        <div className="flex min-h-0 min-w-0 flex-col gap-2 lg:overflow-auto">
          {fromAlert ? <SopTimeline alertId={fromAlert} note={t('trip.fromAlert', { id: fromAlert })} /> : null}
          <DriverPanel v={v} />
          <PositionPanel v={v} route={route} />
          <Panel title={t('trip.speed')} className="shrink-0" bodyClassName="px-3 py-2">
            <Sparkline values={tripSpeeds.length > 1 ? tripSpeeds : [0, 0]} width={280} height={40} />
            <p className="num t-meta mt-1">
              {t('trip.speedStats', { avg: avg.toFixed(1), max: max.toFixed(0), n: tripSpeeds.length })}
            </p>
            {/* E4: passenger load along the trip, from the same stop log */}
            <p className="panel-title mt-2">{t('trip.load')}</p>
            <div data-load-profile="">
              <Sparkline values={log.length > 1 ? log.map((a) => (a.pax / Math.max(1, v.capacity)) * 100) : [0, 0]} width={280} height={28} color="var(--color-text2)" />
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function DriverPanel({ v }: { v: Vehicle }) {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const d = driverOf(v.driver_id, v.operator_id);
  return (
    <Panel title={t('trip.driver')} className="shrink-0" right={<EvidenceTag label="ASSUMPTION" cite="S5: id only" />} bodyClassName="px-3 py-2">
      <p className="text-[13px] font-semibold text-[var(--color-text1)]" title={t('trip.maskNote')} data-driver-name="">
        {maskName(lang === 'mn' ? d.name_mn : d.name_en)}
      </p>
      <p className="num t-meta">
        {d.driver_id} · {t('trip.shift')} {d.shift} · {t('trip.radio')} {d.radio} · {t('trip.years')} {d.years}
      </p>
      <p className="t-meta mt-1 italic">{t('trip.maskNote')} · {t('trip.driverNote')}</p>
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
    <Panel title={t('trip.position')} className="shrink-0" bodyClassName="flex items-center gap-3 px-3 py-2">
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="h-auto max-w-[60%] shrink-0" role="img" aria-label={t('trip.position')} data-minimap="">
        <path d={path} fill="none" stroke="var(--color-line)" strokeWidth={3} />
        {route.stops.map((s) => (
          <circle key={s.stop_id} cx={px(s.longitude)} cy={py(s.latitude)} r={1.8} fill="var(--color-text3)" />
        ))}
        <circle cx={px(v.longitude)} cy={py(v.latitude)} r={5} fill="var(--color-accent)" stroke="var(--color-bg1)" strokeWidth={1.5} />
      </svg>
      <div className="flex min-w-0 flex-col gap-1">
      <p className="num t-meta">
        {v.latitude.toFixed(5)}, {v.longitude.toFixed(5)}
        <br />
        {Math.round(v.speed)} km/h
      </p>
      <button
        type="button"
        className="t-meta self-start text-[var(--color-accent)] hover:underline"
        onClick={() => {
          useSelection.getState().selectVehicle(v.vehicle_id);
          location.hash = '#/map';
        }}
      >
        {t('trip.openMap')} ↗
      </button>
      </div>
    </Panel>
  );
}

const toMin = (s: number | null | undefined) => (s === null || s === undefined || !Number.isFinite(s) ? null : Math.round((s / 60) * 10) / 10);

function TripChart({
  rows,
  norm,
  names,
  k0,
  prev,
}: {
  rows: Row[];
  /** every stop's norm, in travel order - drawn in full even where the bus has no log */
  norm: { mean: number; p10: number; p90: number }[];
  names: string[];
  k0: number;
  /** null = the "compare previous trip" toggle is off */
  prev: { k: number; dev_s: number }[] | null;
}) {
  const t = useT();
  const fc = bandColor({ token: '--color-forecast' }, '#b48cf2');
  const accent = bandColor({ token: '--color-accent' }, '#4d8df0');
  const muted = bandColor({ token: '--color-text3' }, '#8794a6');
  const cats = names.map((_, i) => String(i + 1));
  const byK = new Map(rows.map((r) => [r.k, r]));
  const p10 = cats.map((_, k) => toMin(norm[k]?.p10));
  const p90 = cats.map((_, k) => toMin(norm[k]?.p90));
  const mean = cats.map((_, k) => toMin(norm[k]?.mean));
  const actual = cats.map((_, k) => { const r = byK.get(k); return r && !r.forecast ? toMin(r.dev_s) : null; });
  // start the forecast at the last actual point (connectNulls bridges any unlogged
  // stop in between) so the line is continuous
  const lastK = Math.max(-1, ...rows.filter((r) => !r.forecast).map((r) => r.k));
  const fcast = cats.map((_, k) => { const r = byK.get(k); return r && (r.forecast || k === lastK) ? toMin(r.dev_s) : null; });
  const prevByK = new Map((prev ?? []).map((p) => [p.k, p.dev_s]));
  const prevData = cats.map((_, k) => toMin(prevByK.get(k)));
  const L = {
    band: t('trip.bandSeries'), mean: t('trip.normSeries'), actual: t('trip.actualSeries'), fc: t('fc.legend'), prev: t('trip.prevSeries'),
  };
  const fmt = (x: number | null) => (x === null ? DASH : `${x >= 0 ? '+' : '−'}${Math.abs(x).toFixed(1)} min`);
  const dot = (c: string) => `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${c};margin-right:6px"></span>`;
  const esc = (x: string) => x.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
  const option = {
    ...CHART_BASE,
    // 'p10' is the invisible floor of the stacked band - never offered in the legend
    legend: { top: 0, left: 0, itemWidth: 16, itemHeight: 8, textStyle: { fontSize: 10 }, data: [L.actual, L.fc, L.mean, L.band, ...(prev ? [L.prev] : [])] },
    grid: { left: 48, right: 16, top: 36, bottom: 40, containLabel: false },
    tooltip: {
      ...CHART_BASE.tooltip,
      formatter: (ps: { dataIndex: number }[]) => {
        const k = ps[0]?.dataIndex ?? 0;
        const lines = [
          `<b>${k + 1} · ${esc(names[k] ?? '')}</b>${k === k0 ? ` (${t('uxveh.now')})` : ''}`,
          actual[k] !== null ? `${dot(accent)}${L.actual}: ${fmt(actual[k]!)}` : '',
          byK.get(k)?.forecast ? `${dot(fc)}${L.fc}: ${fmt(fcast[k]!)}` : '',
          `${dot(muted)}${L.mean}: ${fmt(mean[k]!)}`,
          `${L.band}: ${fmt(p10[k]!)} … ${fmt(p90[k]!)}`,
          prev && prevData[k] !== null ? `${L.prev}: ${fmt(prevData[k]!)}` : '',
        ];
        return lines.filter(Boolean).join('<br/>');
      },
    },
    xAxis: {
      ...AXIS, type: 'category', data: cats, boundaryGap: false,
      name: t('uxveh.axisStop'), nameLocation: 'middle', nameGap: 24, nameTextStyle: { fontSize: 10 },
      axisLabel: { ...AXIS.axisLabel, hideOverlap: true },
    },
    yAxis: {
      ...AXIS, type: 'value',
      name: t('uxveh.axisDev'), nameLocation: 'middle', nameGap: 34, nameTextStyle: { fontSize: 10 },
    },
    series: [
      // p10-p90 band: an invisible floor plus a stacked fill
      { name: 'p10', type: 'line', stack: 'band', symbol: 'none', silent: true, lineStyle: { opacity: 0 }, data: p10 },
      {
        name: L.band, type: 'line', stack: 'band', symbol: 'none', silent: true, lineStyle: { opacity: 0 },
        itemStyle: { color: muted }, areaStyle: { color: muted, opacity: 0.18 },
        data: cats.map((_, k) => (p10[k] === null || p90[k] === null ? null : Math.round((p90[k]! - p10[k]!) * 10) / 10)),
      },
      { name: L.mean, type: 'line', symbol: 'none', lineStyle: { color: muted, type: 'dotted', width: 1.5 }, itemStyle: { color: muted }, data: mean },
      {
        name: L.actual, type: 'line', symbolSize: 4, lineStyle: { color: accent, width: 2 }, itemStyle: { color: accent }, data: actual,
        // where the bus is now
        markLine: {
          silent: true, symbol: 'none',
          lineStyle: { color: accent, type: 'solid', width: 1, opacity: 0.6 },
          label: { formatter: t('uxveh.now'), position: 'end', distance: 2, color: accent, fontSize: 10 },
          data: [{ xAxis: cats[k0] ?? '1' }],
        },
      },
      { name: L.fc, type: 'line', connectNulls: true, symbolSize: 3, lineStyle: { color: fc, type: 'dashed', width: 2 }, itemStyle: { color: fc }, data: fcast },
      // always present (all-null when off): the wrapper merges options, so a series
      // that disappeared would otherwise linger on the canvas
      { name: L.prev, type: 'line', symbol: 'none', lineStyle: { color: muted, width: 1 }, itemStyle: { color: muted }, data: prev ? prevData : cats.map(() => null) },
    ],
  };
  return <EChart option={option} />;
}

/**
 * E4 - "and then what?": everything recorded against this alert, oldest first - the L1
 * countdown / auto-send / cancel / revoke, the L3 draft, the send, TCC's (simulated)
 * reply, and validation into an event. Read from the audit log; nothing is inferred.
 */
function SopTimeline({ alertId, note }: { alertId: string; note: string }) {
  const t = useT();
  const audit = useEvents((s) => s.audit);
  const comms = useComms((s) => s.coordination);
  const pending = useSop((s) => s.pending[alertId]);
  const mine = new Set(comms.filter((c) => c.alert_id === alertId).map((c) => c.communication_id));
  const rows = audit
    .filter((a) => a.target === alertId || mine.has(a.target) || (a.detail && mine.has(a.detail.split(' ')[0]!)))
    .slice()
    .reverse();
  return (
    <Panel title={t('trip.sopTimeline')} sub={note} className="shrink-0" bodyClassName="max-h-32 px-3 py-1.5">
      <ol className="num flex flex-col gap-0.5 text-[11px]" data-sop-timeline="">
        {rows.map((a, i) => (
          <li key={i}>
            <span className="text-[var(--color-text3)]">{a.at.slice(11, 19)}</span> ·{' '}
            {t(`audit.${a.action}` as I18nKey) === `audit.${a.action}` ? a.action : t(`audit.${a.action}` as I18nKey)} ·{' '}
            <span className="text-[var(--color-text3)]">{a.actor}</span>
          </li>
        ))}
        {pending !== undefined ? <li className="text-[var(--color-sev-warn)]">{t('sop.sendingIn', { s: Math.max(0, Math.round(pending - world.sim_time_s)) })}</li> : null}
        {rows.length === 0 && pending === undefined ? <li className="t-meta">{t('trip.sopNone')}</li> : null}
      </ol>
    </Panel>
  );
}
