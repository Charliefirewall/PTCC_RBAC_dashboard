/**
 * Command Centre — Slide 7 of the client deck, live (plan sections 6.1, 7.2, 17.4).
 *
 * Two layouts, one component tree:
 *   operator — hero, KPI row, then funnel+agent feed | map | next hour + priority
 *              alerts, four summary cards below;
 *   wall     — the fixed 3-band canvas of plan 6.1/17.3 (30 / 45 / 25 %), no hover,
 *              no scroll, no modals, everything scaled by `--wall-scale`.
 *
 * The exception funnel (S3) is the thesis of the whole demo: normal operation
 * stays in the background, abnormal operation comes to the operator. It is
 * rendered big and first, not tucked into a corner. Its numbers come from
 * `metrics.funnel`, which counts each vehicle's OWN condition (see the note in
 * rules/evaluate.ts) — nothing here re-derives them.
 *
 * Every number on screen is read from the stores. Nothing is invented.
 */

import { useForecast } from '../../store/forecast';
import { HORIZONS } from '../../rules/forecast';
import { drillHref, LevelBadge } from '../alerts/sop';
import { useMemo } from 'react';
import { MapCanvas } from '../map/LiveMap';
import { AgentActivityFeed } from '../agentic/AgentConsole';
import {
  Bar,
  Button,
  Empty,
  KpiTile,
  Panel,
  PanelLink,
  SeverityChip,
  StatusPill,
  fmtCompact,
  fmtInt,
  type KpiFoot,
} from '../../components/primitives';
import { EChart, AXIS, CHART_BASE } from '../../charts/EChart';
import { history, useAlerts, useSelection, useSettings, useSim, world } from '../../store';
import { bandOf } from '../../rules/thresholds';
import type { DerivedMetrics, RouteMetrics } from '../../rules/evaluate';
import type { Alert, OperatorId } from '../../sim/types';
import { hhmmss, hhmm } from '../../sim/engine';
import { useT } from '../../i18n/t';
import type { I18nKey } from '../../i18n/dict';

// ---------------------------------------------------------------- degenerate data

/**
 * Nothing non-finite reaches the screen.
 *
 * `fmtInt`/`fmtCompact` in components/primitives render the STRING "NaN" for a NaN or
 * Infinity input (`Math.round(NaN).toLocaleString()` === "NaN"), and `toFixed` does the
 * same - so a single division by an empty denominator anywhere upstream puts "NaN" on a
 * client's wall display. Those primitives are not owned by this change, so every call
 * site here goes through `num()` instead, which substitutes an em dash.
 */
const DASH = '—';
const num = (n: number | undefined | null, fmt: (x: number) => string = fmtInt): string =>
  typeof n === 'number' && Number.isFinite(n) ? fmt(n) : DASH;
/** For props that must stay numeric (bar widths, tones): a safe fallback, never NaN. */
const fin = (n: number | undefined | null, fallback = 0): number =>
  typeof n === 'number' && Number.isFinite(n) ? n : fallback;

// ---------------------------------------------------------------- KPI row (S7)

/**
 * Change across the sparkline window, plus the sim time that window opens at, so the
 * delta says WHEN as well as how much. It reads the same ring the tile's sparkline
 * draws, so a tile can never disagree with its own trend line.
 */
function windowDelta(values: number[]): { d: number; sinceS: number } | null {
  const ts = history.t.toArray();
  if (values.length < 2 || ts.length < 2) return null;
  const d = Math.round(values[values.length - 1]! - values[0]!);
  // A ring that has not been written yet holds undefined; a delta of NaN would print
  // "+NaN since NaN:NaN" in the tile foot. No delta is honest, "+NaN" is not.
  if (!Number.isFinite(d) || !Number.isFinite(ts[0]!)) return null;
  return { d, sinceS: ts[0]! };
}

/** `good` follows the meaning, not the arrow: fewer alerts is good news, not red. */
function deltaFoot(
  values: number[],
  upIsGood: boolean,
  t: (k: I18nKey, p?: Record<string, string | number>) => string,
): KpiFoot | undefined {
  const w = windowDelta(values);
  if (!w) return undefined;
  return {
    delta: {
      dir: w.d > 0 ? 'up' : w.d < 0 ? 'down' : 'flat',
      text: t('dash.kpiSince', { d: `${w.d > 0 ? '+' : ''}${fmtInt(w.d)}`, time: hhmm(w.sinceS) }),
      good: w.d === 0 ? undefined : w.d > 0 === upIsGood,
    },
  };
}

function KpiRow({ metrics, alerts, wall }: { metrics: DerivedMetrics; alerts: Alert[]; wall: boolean }) {
  const t = useT();
  const critical = alerts.filter((a) => a.severity === 'critical').length;
  const f = metrics.funnel;
  return (
    // §13.9: fluid, not fixed. `grid-cols-6` divided whatever width it was given by six,
    // so at 1024 each tile got ~121 px and every KPI foot - the denominators and the
    // funnel split, i.e. the numbers - truncated. auto-fit wraps to four tiles and two
    // rows instead of clipping six. The wall keeps its budgeted fixed 2-up canvas.
    <div
      className={wall ? 'grid grid-cols-2 gap-2' : 'grid shrink-0 gap-2'}
      style={wall ? undefined : { gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}
    >
      <KpiTile
        labelKey="kpi.busesInService"
        icon="bus"
        value={num(metrics.in_service)}
        spark={history.kpi.in_service.toArray()}
        wall={wall}
        evidence="CONFIRMED"
        // The tile carries the funnel split, so "in service" is never just a count.
        // Foots are operator-mode only: the wall is a fixed no-scroll canvas and its
        // band heights are budgeted at --wall-scale 2.2 for the tiles as they were.
        foot={wall ? undefined : { dist: { crit: f.critical, warn: f.attention, ok: f.normal } }}
      />
      <KpiTile
        labelKey="kpi.routesOperating"
        icon="route"
        value={num(metrics.routes_operating)}
        wall={wall}
        evidence="CONFIRMED"
        foot={wall ? undefined : { hint: t('dash.kpiOfPlanned', { total: num(world.routes.length) }) }}
      />
      <KpiTile
        labelKey="kpi.activeAlerts"
        icon="alert"
        value={num(alerts.length)}
        spark={history.kpi.alerts.toArray()}
        tone={alerts.length ? 'warn' : 'ok'}
        wall={wall}
        evidence="CONFIRMED"
        onClick={wall ? undefined : () => { location.hash = '#/alerts'; }}
        foot={wall ? undefined : deltaFoot(history.kpi.alerts.toArray(), false, t)}
      />
      <KpiTile
        labelKey="kpi.criticalAlerts"
        icon="danger"
        value={num(critical)}
        spark={history.kpi.critical.toArray()}
        // S7 shows this tile red the moment anything is critical.
        tone={critical > 0 ? 'crit' : 'ok'}
        wall={wall}
        evidence="CONFIRMED"
        onClick={wall ? undefined : () => { location.hash = '#/alerts'; }}
        foot={wall ? undefined : deltaFoot(history.kpi.critical.toArray(), false, t)}
      />
      <KpiTile
        labelKey="kpi.ridershipToday"
        icon="passengers"
        value={num(metrics.ridership_today, fmtCompact)}
        spark={history.kpi.ridership.toArray()}
        wall={wall}
        evidence="CONFIRMED"
        foot={wall ? undefined : { hint: t('dash.kpiPaxToday') }}
      />
      <KpiTile
        labelKey="kpi.systemHealth"
        icon="health"
        value={num(metrics.system_health_pct, (x) => x.toFixed(1))}
        // An em dash carries no unit, and a non-finite health must not read as "crit":
        // an unknown number is neutral, not an emergency.
        unit={Number.isFinite(metrics.system_health_pct) ? '%' : undefined}
        spark={history.kpi.health.toArray()}
        tone={
          !Number.isFinite(metrics.system_health_pct) ? 'neutral'
          : metrics.system_health_pct >= 98 ? 'ok'
          : metrics.system_health_pct >= 95 ? 'warn'
          : 'crit'
        }
        wall={wall}
        // formula is INFERRED: % of on-board devices reporting (plan 7.2, module 1)
        evidence="INFERRED"
        foot={wall ? undefined : { hint: t('dash.kpiHealthHint') }}
      />
    </div>
  );
}

// ---------------------------------------------------------------- exception funnel (S3)

function Funnel({ metrics, wall }: { metrics: DerivedMetrics; wall: boolean }) {
  const t = useT();
  const f = metrics.funnel;
  const focus = f.attention + f.critical;
  const cells: { key: I18nKey; n: number; color: string }[] = [
    { key: 'funnel.normal', n: f.normal, color: 'var(--color-sev-ok)' },
    { key: 'funnel.attention', n: f.attention, color: 'var(--color-sev-warn)' },
    { key: 'funnel.critical', n: f.critical, color: 'var(--color-sev-crit)' },
  ];
  return (
    <section className="panel flex shrink-0 flex-col gap-2 px-3 py-2.5">
      <div className="flex items-baseline gap-2">
        <span
          className="num font-semibold leading-none text-[var(--color-text1)]"
          style={{ fontSize: wall ? '3.2em' : '2.4rem' }}
        >
          {num(f.total)}
        </span>
        <span className="text-[var(--color-text3)]" style={{ fontSize: wall ? '0.9em' : 12 }}>
          {t('funnel.operating')}
        </span>
      </div>

      {/* 76 px in operator mode: the funnel now sits in the narrow left column of the
          working band (~280 px at 1366), where 88 px dropped "Critical" to a second row. */}
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(${wall ? 88 : 76}px, 1fr))` }}>
        {cells.map((c) => (
          <div
            key={c.key}
            className="flex flex-col gap-1 rounded border-l-2 bg-[var(--color-bg2)] px-2 py-1.5"
            style={{ borderColor: c.color }}
          >
            <span
              className="num font-semibold leading-none"
              style={{ color: c.color, fontSize: wall ? '2.2em' : '1.6rem' }}
            >
              {num(c.n)}
            </span>
            {/* "Require attention" needs 125 px and the cell gives 115 at 1024, so in
                operator mode the label wraps. The wall budgets its band heights, so there
                it keeps truncating. */}
            <span className={`panel-title ${wall ? 'truncate' : ''}`}>{t(c.key)}</span>
          </div>
        ))}
      </div>

      <div
        className="rounded bg-[var(--color-bg2)] px-2 py-1.5 font-semibold text-[var(--color-accent)]"
        style={{ fontSize: wall ? '1em' : 13 }}
      >
        {/* t() interpolates a nullish or NaN param as the literal "undefined"/"NaN",
            so the numbers are formatted before they go in, never after. */}
        {t('funnel.focus', { n: num(focus), total: num(f.total) })}
      </div>
      <p className="text-[var(--color-text3)]" style={{ fontSize: wall ? '0.72em' : 11 }}>
        {t('funnel.banner')}
      </p>
    </section>
  );
}

// ---------------------------------------------------------------- priority alerts (S7/S10)

/** The breached rule, inline: "gap 28 min > 20 min". Seconds are shown in
 *  minutes because that is how the deck states them (S8 "Service gap (28 min)"). */
function ruleLine(a: Alert, t: (k: I18nKey, p?: Record<string, string | number>) => string): string {
  const s = a.metric.unit === 's';
  // Every parameter is stringified first: t() would otherwise interpolate a missing
  // rule_id as the literal "undefined" and a non-finite metric as "NaN".
  return t('alerts.threshold', {
    rule: a.rule_id || DASH,
    value: num(a.metric.value, (x) => String(s ? Math.round(x / 60) : x)),
    threshold: num(a.metric.threshold, (x) => String(s ? Math.round(x / 60) : x)),
    unit: s ? ' min' : (a.metric.unit ?? ''),
  });
}

function openAlert(a: Alert): void {
  // Delay SOP alerts drill to their worst bus's trip (PTCC drill-down), same as Alerts.
  const drill = drillHref(a);
  if (drill && !a.vehicle_id && drill.startsWith('#/vehicle/')) {
    useSelection.getState().selectVehicle(String(a.params.bus));
    location.hash = drill;
    return;
  }
  if (a.vehicle_id) {
    useSelection.getState().selectVehicle(a.vehicle_id);
    location.hash = `#/vehicle/${a.vehicle_id}`;
  } else if (a.route_id) {
    useSelection.getState().selectRoute(a.route_id);
    location.hash = '#/regularity';
  }
}

/**
 * E10 - PTCC scenario 2 "can use the same dashboard": the next hour at a glance, in the
 * forecast colour. Reads useForecast only; a click opens the Forecast tab.
 *
 * A slim strip of four equal chips (+15m / +30m / +45m / +1h), each carrying the count of
 * routes forecast late and the top SOP level as a DASHED badge - the same forecast
 * convention the Alerts forecast tab uses, so a prediction never reads as a live alert.
 * It used to be a sentence per horizon, which wrapped mid-phrase in a 450 px column and
 * stole two rows from the Priority alerts below it. The full sentence is still on each
 * chip as its tooltip.
 */
function NextHour() {
  const t = useT();
  const byH = useForecast((s) => s.byHorizon);
  return (
    <a
      href="#/forecast"
      data-next-hour=""
      className="panel flex min-h-[176px] shrink-0 flex-col gap-2 border-l-4 border-l-[var(--color-forecast)] px-3 py-2 hover:bg-[var(--color-bg2)]"
    >
      <div className="flex min-w-0 items-baseline justify-between gap-2">
        <span className="panel-title shrink-0 text-[var(--color-forecast)]">{t('cc.nextHour')}</span>
        <span className="t-meta truncate">{t('uxcc.nextHourLegend')}</span>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-1.5">
        {HORIZONS.map((h) => {
          const rows = byH[h].filter((a) => a.route_id);
          const top = rows.reduce((m, a) => Math.max(m, a.level), 0);
          const lead = rows[0];
          return (
            <span
              key={h}
              title={rows.length ? t('cc.nextHourRow', { n: rows.length, level: top }) : t('cc.nextHourNone')}
              className="flex min-h-[58px] min-w-0 flex-col justify-center gap-0.5 rounded bg-[var(--color-bg2)] px-2 py-1"
            >
              <span className="flex w-full items-center justify-between gap-1">
                <span className="num text-[10px] text-[var(--color-forecast)]">+{h === 60 ? '1h' : `${h}m`}</span>
                <span className="num min-w-0 flex-1 break-words text-center text-[10px] font-semibold leading-tight">
                  {lead?.route_id ?? t('cc.nextHourNone')}
                </span>
                {top >= 1 && top <= 3 ? <LevelBadge level={top as 1 | 2 | 3} forecast /> : null}
              </span>
              {lead ? (
                <>
                  <span className="t-meta w-full truncate">
                    {t('uxcc.forecastExpected', { min: lead.metric.value, chance: Math.round(lead.probability * 100) })}
                  </span>
                  <span className="t-meta w-full truncate">
                    {t('uxcc.forecastImpact', { pax: lead.pax_affected, confidence: Math.round(lead.confidence * 100) })}
                  </span>
                </>
              ) : null}
            </span>
          );
        })}
      </div>
      <span className="t-meta text-right text-[var(--color-forecast)]">{t('uxcc.forecastReview')} →</span>
    </a>
  );
}

function PriorityAlerts({ alerts, wall, className = '' }: { alerts: Alert[]; wall: boolean; className?: string }) {
  const t = useT();
  const n = useSettings((s) => s.th.top_route_ranking_n);
  const top = alerts.slice(0, n); // already sorted by impact_score in the store

  return (
    <Panel
      titleKey="alerts.priority"
      className={className}
      bodyClassName={wall ? '!overflow-hidden' : ''}
      // Wall mode is a fixed no-scroll canvas: sub and foot are operator-mode reading aids.
      sub={wall ? undefined : t('dash.subPriority')}
      // The foot hints do not truncate: the Panel foot is a `justify-between` flex with
      // no fixed height, so a hint that does not fit wraps to a second line instead of
      // losing its last clause. At 1024 all five of them were being cut mid-sentence.
      foot={
        wall ? undefined : (
          <>
            <span className="min-w-0">{t('dash.footPriority')}</span>
            <PanelLink href="#/alerts">{t('dash.linkAlerts')}</PanelLink>
          </>
        )
      }
      right={
        <span className="num text-[10px] text-[var(--color-text3)]">
          {t('alerts.showingTop', { n: num(top.length), total: num(alerts.length) })}
        </span>
      }
    >
      {top.length === 0 ? (
        // No breached rule is GOOD NEWS on an operations wall, so it reads as
        // reassurance - and it still says what would appear here and how to make it.
        <Empty tone="ok" title={t('alerts.none')} text={t('alerts.noneHint')} />
      ) : (
        <ul className="divide-y divide-[var(--color-line)]">
          {top.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => openAlert(a)}
                disabled={wall}
                // py-1 in operator mode: the list owns the right column and every 4 px per
                // row is another alert above the fold at 950 px.
                className={`flex w-full items-center gap-2 px-2 text-left enabled:hover:bg-[var(--color-bg2)] ${wall ? 'py-1.5' : 'py-1'}`}
              >
                {a.level ? <LevelBadge level={a.level} /> : null}
                <SeverityChip severity={a.severity} size={wall ? 'wall' : 'sm'} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium" style={{ fontSize: wall ? '0.9em' : 13 }}>
                    {t(a.title_key as I18nKey, a.params)}
                  </span>
                  {/* D-3: no `truncate` in operator mode. This line IS the breached
                      threshold ("gap 28 min > 20 min"); ellipsising it removes the number
                      the operator is being asked to judge, so it wraps instead - the panel
                      body already scrolls. The WALL is a fixed no-scroll canvas whose band
                      heights are budgeted, so there it still truncates. */}
                  <span
                    className={`num block text-[var(--color-text3)] ${wall ? 'truncate' : 'leading-tight'}`}
                    style={{ fontSize: wall ? '0.68em' : 10 }}
                  >
                    {a.vehicle_id ?? a.route_id ?? a.operator_id ?? DASH} · {ruleLine(a, t)}
                  </span>
                </span>
                <span className="num shrink-0 text-[var(--color-text3)]" style={{ fontSize: wall ? '0.7em' : 10 }}>
                  {num(a.raised_at_s, hhmm)}
                </span>
                {!wall && <span className="shrink-0 text-[var(--color-text3)]">›</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

// ---------------------------------------------------------------- the four S7 widgets

function topRoutes(metrics: DerivedMetrics, by: (r: RouteMetrics) => number, k = 3): RouteMetrics[] {
  return [...metrics.per_route.values()]
    .filter((r) => r.vehicles > 0)
    .sort((a, b) => by(b) - by(a))
    .slice(0, k);
}

function MostDelayed({ metrics, wall }: { metrics: DerivedMetrics; wall: boolean }) {
  const t = useT();
  const th = useSettings((s) => s.th.schedule_deviation_s);
  const rows = topRoutes(metrics, (r) => r.mean_dev_s);
  // A single non-finite deviation would make Math.max NaN and every bar width NaN, so
  // the scale is built from finite values only. The floor of 1 also keeps the division
  // below defined when every route is exactly on time.
  const max = Math.max(1, ...rows.map((r) => fin(r.mean_dev_s)));
  return (
    <Panel
      titleKey="widget.mostDelayed"
      bodyClassName={`px-2 py-1.5 ${wall ? '!overflow-hidden' : ''}`}
      collapsible={!wall}
      summary={rows[0] ? `${rows[0].route_id} +${num(rows[0].mean_dev_s / 60, (x) => x.toFixed(1))} ${t('unit.min')}` : t('cc.emptyDelayed')}
      /* Empty, the panel gives its whole body to the empty state. These three bottom-row
         panels are ~140px tall: `sub` + `foot` leave 48px, which clips a two-line Empty
         mid-sentence and lets its title collide with the sub. The empty state SAYS what
         the panel shows, so the sub is redundant exactly when there is nothing to foot. */
      sub={wall || rows.length === 0 ? undefined : t('dash.subDelayed')}
      foot={
        wall || rows.length === 0 ? undefined : (
          <>
            <span className="min-w-0">{t('dash.footDelayed')}</span>
            <PanelLink href="#/regularity">{t('dash.linkRegularity')}</PanelLink>
          </>
        )
      }
    >
      {rows.length === 0 ? (
        <Empty title={t('cc.emptyDelayed')} text={t('cc.emptyDelayedHint')} />
      ) : (
        <ul className="flex flex-col gap-1.5">
          {rows.map((r) => {
            const color =
              r.mean_dev_s > th * 3 ? 'var(--color-map-disrupted)'
              : r.mean_dev_s > th ? 'var(--color-map-slower)'
              : 'var(--color-map-normal)';
            return (
              <li key={r.route_id} className="flex min-w-0 flex-col gap-0.5">
                <div className="flex min-w-0 justify-between gap-2" style={{ fontSize: wall ? '0.78em' : 11 }}>
                  {/* A long route name must not push the number off the panel. */}
                  <span className="num min-w-0 truncate text-[var(--color-text2)]" title={r.route_id}>
                    {r.route_id}
                  </span>
                  <span className="num shrink-0 font-semibold" style={{ color }}>
                    {num(r.mean_dev_s / 60, (x) => x.toFixed(1))} {t('unit.min')}
                  </span>
                </div>
                <Bar pct={(fin(r.mean_dev_s) / max) * 100} color={color} height={wall ? 8 : 5} />
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

function HighestLoad({ metrics, wall }: { metrics: DerivedMetrics; wall: boolean }) {
  const t = useT();
  const rows = topRoutes(metrics, (r) => r.load_pct);
  return (
    <Panel
      titleKey="widget.highestLoad"
      bodyClassName={`px-2 py-1.5 ${wall ? '!overflow-hidden' : ''}`}
      collapsible={!wall}
      summary={rows[0] ? `${rows[0].route_id} ${num(rows[0].load_pct)} %` : t('cc.emptyLoad')}
      sub={wall || rows.length === 0 ? undefined : t('dash.subLoad')}
      foot={
        wall || rows.length === 0 ? undefined : (
          <>
            <span className="min-w-0">{t('dash.footLoad')}</span>
            <PanelLink href="#/passenger">{t('dash.linkPassenger')}</PanelLink>
          </>
        )
      }
    >
      {rows.length === 0 ? (
        <Empty title={t('cc.emptyLoad')} text={t('cc.emptyLoadHint')} />
      ) : (
        <ul className="flex flex-col gap-1.5">
          {rows.map((r) => {
            // S8 bands - the only threshold set that exists in any source. `bandOf`
            // compares with >=, which is false for NaN and would silently return the
            // lowest band, so the load is made finite once and used everywhere.
            const load = fin(r.load_pct);
            const band = bandOf(load);
            return (
              <li key={r.route_id} className="flex min-w-0 flex-col gap-0.5">
                <div className="flex min-w-0 justify-between gap-2" style={{ fontSize: wall ? '0.78em' : 11 }}>
                  <span className="num min-w-0 truncate text-[var(--color-text2)]" title={r.route_id}>
                    {r.route_id}
                  </span>
                  <span className="num shrink-0 font-semibold" style={{ color: band.color }}>
                    {num(r.load_pct)} %
                  </span>
                </div>
                <Bar pct={load} color={band.color} height={wall ? 8 : 5} />
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

/** On-time % per operator, weighted by vehicles so a 2-bus route cannot swing
 *  the same as a 20-bus one. The weighting is a demo decision; the source
 *  states the KPI (L1143-L1146), not the arithmetic. */
function operatorOnTime(metrics: DerivedMetrics): { op: OperatorId; pct: number; w: number }[] {
  const acc: Record<OperatorId, { w: number; s: number }> = { A: { w: 0, s: 0 }, B: { w: 0, s: 0 }, C: { w: 0, s: 0 } };
  for (const rm of metrics.per_route.values()) {
    // Only finite contributions enter the accumulator: one NaN on_time_pct would
    // otherwise poison the whole operator's weighted mean, and `w > 0` below cannot
    // detect that - the division is defined, the result is still NaN.
    if (!Number.isFinite(rm.vehicles) || rm.vehicles <= 0 || !Number.isFinite(rm.on_time_pct)) continue;
    const op = world.routeById.get(rm.route_id)?.operator_id;
    if (!op) continue;
    acc[op].w += rm.vehicles;
    acc[op].s += rm.on_time_pct * rm.vehicles;
  }
  return (['A', 'B', 'C'] as OperatorId[]).map((op) => ({
    op,
    // `w` is carried out so the panel can tell "0 % on time" from "nothing measured yet".
    pct: acc[op].w > 0 ? acc[op].s / acc[op].w : 0,
    w: acc[op].w,
  }));
}

/** The green band boundary the bars are already coloured by - one constant, two uses. */
const ON_TIME_TARGET_PCT = 90;

function OperatorOnTime({ metrics, wall }: { metrics: DerivedMetrics; wall: boolean }) {
  const t = useT();
  const rows = operatorOnTime(metrics);
  // Three bars at a flat 0 % is not "all three operators are failing", it is "nothing has
  // been measured". Those are different statements and the panel must not conflate them.
  const measured = rows.some((r) => r.w > 0);
  // Series colours have to be resolved to literals: the canvas renderer cannot read
  // `var(--x)`, and EChart's theme merge only reaches text, tooltip and axes - not
  // itemStyle. Reading them here (keyed on the theme, so the memo re-runs on a switch)
  // keeps the bars on the token scale without a hex literal in this file.
  const theme = useSettings((s) => s.theme);
  const bar = useMemo(() => {
    const v = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
    return { ok: v('--color-sev-ok'), warn: v('--color-sev-warn'), crit: v('--color-sev-crit'), label: v('--color-text3') };
  }, [theme]);
  const option = useMemo(
    () => ({
      ...CHART_BASE,
      grid: { ...CHART_BASE.grid, left: 8, right: 20, top: 8, bottom: 6 },
      tooltip: {
        ...CHART_BASE.tooltip,
        trigger: 'item' as const,
        formatter: (p: { dataIndex: number; value: number }) =>
          `<b>${t('chart.tooltip.operator', { operator: rows[p.dataIndex]?.op ?? DASH })}</b><br/>${t('widget.onTime')}: ${Number(p.value).toFixed(1)} %`,
      },
      xAxis: {
        ...AXIS,
        type: 'value' as const,
        max: 100,
        name: t('chart.axis.onTimePct'),
        nameLocation: 'middle' as const,
        nameGap: 23,
        splitLine: { show: false },
      },
      yAxis: {
        ...AXIS,
        type: 'category' as const,
        inverse: true,
        data: rows.map((r) => r.op),
        name: t('chart.axis.operator'),
        nameLocation: 'end' as const,
        nameGap: 7,
      },
      series: [
        {
          type: 'bar' as const,
          data: rows.map((r) => ({
            value: Number(fin(r.pct).toFixed(1)),
            itemStyle: { color: fin(r.pct) >= ON_TIME_TARGET_PCT ? bar.ok : fin(r.pct) >= 75 ? bar.warn : bar.crit },
          })),
          barWidth: wall ? '55%' : '45%',
          label: { show: true, position: 'right' as const, formatter: '{c} %', color: bar.label, fontSize: 10 },
          // §13.8: the bars are coloured BY a threshold and the threshold itself was
          // invisible - the reader could see that B is amber but not what it missed.
          markLine: {
            silent: true,
            symbol: 'none' as const,
            lineStyle: { color: bar.ok, type: 'dashed' as const, width: 1 },
            label: { formatter: `${ON_TIME_TARGET_PCT} %`, color: bar.label, fontSize: 9, position: 'insideEndTop' as const },
            data: [{ xAxis: ON_TIME_TARGET_PCT }],
          },
        },
      ],
    }),
    [rows.map((r) => `${r.op}:${r.pct.toFixed(1)}`).join('|'), wall, bar, t],
  );
  const worst = [...rows].sort((a, b) => a.pct - b.pct)[0];
  return (
    <Panel
      titleKey="widget.onTime"
      bodyClassName={wall ? '!overflow-hidden' : ''}
      collapsible={!wall}
      summary={measured && worst ? `${worst.op} ${num(worst.pct, (x) => x.toFixed(1))} %` : t('cc.emptyOnTime')}
      sub={wall || !measured ? undefined : t('dash.subOnTime')}
      foot={
        wall || !measured ? undefined : (
          <>
            <span className="min-w-0">{t('dash.footOnTime')}</span>
            <PanelLink href="#/operators">{t('dash.linkOperators')}</PanelLink>
          </>
        )
      }
    >
      {measured ? <EChart option={option} /> : <Empty title={t('cc.emptyOnTime')} text={t('cc.emptyOnTimeHint')} />}
    </Panel>
  );
}

function SystemHealth({ metrics, wall }: { metrics: DerivedMetrics; wall: boolean }) {
  const t = useT();
  const rows: { key: I18nKey; n: number }[] = [
    { key: 'widget.afcOffline', n: metrics.offline.afc },
    { key: 'widget.cctvOffline', n: metrics.offline.cctv },
    { key: 'widget.tboxOffline', n: metrics.offline.tbox },
  ];
  const offline = metrics.offline.afc + metrics.offline.cctv + metrics.offline.tbox;
  return (
    <Panel
      titleKey="widget.systemHealth"
      bodyClassName={`px-2 py-1.5 ${wall ? '!overflow-hidden' : ''}`}
      collapsible={!wall}
      summary={`${num(offline)} offline`}
      sub={wall ? undefined : t('dash.subHealth')}
      foot={
        wall ? undefined : (
          <>
            <span className="min-w-0">{t('dash.footHealth')}</span>
            <PanelLink href="#/health">{t('dash.linkHealth')}</PanelLink>
          </>
        )
      }
    >
      <ul className="flex flex-col gap-1.5">
        {rows.map((r) => (
          <li key={r.key} className="flex items-center justify-between gap-2" style={{ fontSize: wall ? '0.78em' : 11 }}>
            <span className="truncate text-[var(--color-text2)]">{t(r.key)}</span>
            <StatusPill tone={!Number.isFinite(r.n) ? 'neutral' : r.n === 0 ? 'ok' : r.n > 10 ? 'crit' : 'warn'}>
              <span className="num">{num(r.n)}</span>
            </StatusPill>
          </li>
        ))}
        <li className="flex items-center justify-between gap-2" style={{ fontSize: wall ? '0.78em' : 11 }}>
          <span className="truncate text-[var(--color-text2)]">{t('widget.network')}</span>
          <StatusPill tone="ok">
            <span className="num">{num(metrics.network_uptime_pct, (x) => x.toFixed(0))} %</span>
          </StatusPill>
        </li>
      </ul>
    </Panel>
  );
}

// ---------------------------------------------------------------- narrative hero (§6.3)

/**
 * The page used to open with six unlabelled numbers. It now opens with the conclusion,
 * in a sentence, the way the reference product does ("Good evening. 13 trucks need
 * action this week.").
 *
 * Every figure is a parameter read from `metrics.funnel`, `metrics.offline` and the
 * alert list at render time - there is no literal number in this component, so it
 * recomposes on every tick along with the tiles below it. The greeting comes from the
 * SIMULATION clock, not the wall clock: the demo runs at 07:40 sim time whatever hour
 * the room happens to be in.
 *
 * Attributed to the analysis cycle (plan §10.4): the hero is agent output, so it says
 * so, with the cycle's own timestamp.
 */
function Hero({ metrics, alerts, sim_time_s, running }: { metrics: DerivedMetrics; alerts: Alert[]; sim_time_s: number; running: boolean }) {
  const t = useT();
  const f = metrics.funnel;
  const focus = f.attention + f.critical;
  const critical = alerts.filter((a) => a.severity === 'critical').length;
  const routesAffected = new Set(alerts.map((a) => a.route_id).filter(Boolean)).size;
  const offline = metrics.offline.afc + metrics.offline.cctv + metrics.offline.tbox;
  // A non-finite clock would make `hour` NaN, and every comparison below false - the
  // greeting would silently become "Good evening" at 07:40. Default to the morning the
  // demo actually opens in rather than to the last branch of a chain.
  const hour = Number.isFinite(sim_time_s) ? Math.floor((sim_time_s % 86400) / 3600) : 0;
  const greeting = t(hour < 12 ? 'dash.greetMorning' : hour < 18 ? 'dash.greetAfternoon' : 'dash.greetEvening');

  return (
    // The actions sit BESIDE the sentence rather than under it: a fourth line of buttons
    // cost the page ~45 px of height that the worklist below needed. `flex-wrap` drops
    // them under the text again when the row is too narrow for both.
    <section className="panel flex shrink-0 flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-2.5">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="t-meta flex items-center gap-2">
          <span
            className="inline-block shrink-0 rounded-full"
            style={{ width: 6, height: 6, background: running ? 'var(--color-agent)' : 'var(--color-text3)' }}
            aria-hidden
          />
          <span className="num truncate">
            {t('dash.heroKicker', {
              status: t(running ? 'dash.cycleLive' : 'dash.cyclePaused'),
              time: num(sim_time_s, hhmmss),
            })}
          </span>
        </div>

        {/* h2, not h1: the page's <h1> is the route name, rendered once by Shell. */}
        <h2 className="t-metric text-[var(--color-text1)]">
          {/* "All clear" is the one headline that must never be reached by accident: an
              unknown focus count is not an all-clear, so only a finite zero earns it. */}
          {t(!Number.isFinite(focus) || focus > 0 ? 'dash.heroHeadline' : 'dash.heroHeadlineClear', {
            greeting,
            n: num(focus),
            total: num(f.total),
          })}
        </h2>

        <p className="t-body text-[var(--color-text2)]">
          {t('dash.heroSub', {
            crit: num(critical),
            routes: num(routesAffected),
            offline: num(offline),
          })}
        </p>
      </div>

      {/* The "last updated" clock rides above the actions instead of taking a line of its
          own under the summary cards - same component, same text, 28 px given back. */}
      <div className="flex flex-col items-start gap-1.5 min-[1440px]:items-end">
        <Clock sim_time_s={sim_time_s} wall={false} />
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="primary" onClick={() => { location.hash = '#/alerts'; }}>
            {t('dash.ctaAlerts', { n: num(alerts.length) })}
          </Button>
          <Button variant="agent" onClick={() => { location.hash = '#/agentic'; }}>
            {t('dash.ctaAgent')}
          </Button>
          <Button onClick={() => { location.hash = '#/map'; }}>{t('dash.ctaMap')}</Button>
          <Button onClick={() => { location.hash = '#/health'; }}>
            {t('dash.ctaHealth', { n: num(offline) })}
          </Button>
        </div>
      </div>
    </section>
  );
}

function OperationalBrief({ alerts }: { alerts: Alert[] }) {
  const t = useT();
  const nextHour = useForecast((s) => s.byHorizon[60]);
  const critical = alerts.filter((a) => a.severity === 'critical').length;
  const routes = new Set(alerts.map((a) => a.route_id).filter(Boolean)).size;
  const forecastRoutes = new Set(nextHour.map((a) => a.route_id).filter(Boolean)).size;
  const items = [
    { key: 'now', label: t('uxcc.brief.now'), value: t('uxcc.brief.nowValue', { critical, routes }), href: '#/alerts', tone: critical ? 'var(--color-sev-crit)' : 'var(--color-sev-ok)' },
    { key: 'next', label: t('uxcc.brief.next'), value: t('uxcc.brief.nextValue', { routes: forecastRoutes }), href: '#/forecast', tone: 'var(--color-forecast)' },
    { key: 'action', label: t('uxcc.brief.action'), value: t(critical ? 'uxcc.brief.actionCritical' : 'uxcc.brief.actionNormal'), href: critical ? '#/alerts' : '#/agentic', tone: 'var(--color-agent)' },
  ];
  return (
    <section className="panel shrink-0 px-3 py-2" aria-label={t('uxcc.brief.title')} data-operational-brief>
      <div className="mb-1 t-label">{t('uxcc.brief.title')}</div>
      <div className="grid gap-1.5 sm:grid-cols-3">
        {items.map((item) => (
          <a key={item.key} href={item.href} className="min-w-0 rounded border border-[var(--color-line)] bg-[var(--color-bg2)] px-2 py-1 hover:border-[var(--color-text3)]">
            <span className="t-label block" style={{ color: item.tone }}>{item.label}</span>
            <span className="t-body block leading-snug text-[var(--color-text2)]">{item.value}</span>
          </a>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- shell

function Clock({ sim_time_s, wall }: { sim_time_s: number; wall: boolean }) {
  const t = useT();
  return (
    <div
      className="flex shrink-0 items-center gap-2 text-[var(--color-text3)]"
      style={{ fontSize: wall ? '0.78em' : 11 }}
    >
      <span>{t('app.lastUpdated')}</span>
      <span className="num font-semibold text-[var(--color-text1)]">{num(sim_time_s, hhmmss)}</span>
    </div>
  );
}

export default function CommandCentre() {
  const t = useT();
  const metrics = useSim((s) => s.metrics);
  const snap = useSim((s) => s.snap);
  const alerts = useAlerts((s) => s.alerts);
  const running = useSim((s) => s.running);
  const mode = useSettings((s) => s.mode);
  const wall = mode === 'wall';

  // Before the engine's first tick there is no snapshot to read. This is NOT a loading
  // spinner: the derivation is synchronous, so there is nothing to wait for except the
  // operator starting the clock - which is exactly what the text asks them to do.
  if (!metrics || !snap) return <Empty title={t('cc.bootTitle')} text={t('cc.bootText')} />;

  // ---- wall: fixed 3-band canvas, no scroll anywhere (plan 6.1 / 17.3)
  if (wall) {
    return (
      <div className="flex min-h-0 flex-1 gap-3 overflow-hidden p-3">
        <div className="flex min-h-0 min-w-0 flex-col gap-3 overflow-hidden" style={{ flex: '30 1 0%' }}>
          <Funnel metrics={metrics} wall />
          <div className="min-h-0 flex-1 overflow-hidden">
            <KpiRow metrics={metrics} alerts={alerts} wall />
          </div>
        </div>
        <div className="flex min-h-0 min-w-0 flex-col gap-2 overflow-hidden" style={{ flex: '45 1 0%' }}>
          <MapCanvas className="min-h-0 flex-1" />
          <Clock sim_time_s={snap.sim_time_s} wall />
        </div>
        <div className="grid min-h-0 min-w-0 gap-3 overflow-hidden" style={{ flex: '25 1 0%', gridTemplateRows: '1.6fr 1fr 1fr' }}>
          <PriorityAlerts alerts={alerts} wall className="min-h-0" />
          <MostDelayed metrics={metrics} wall />
          <SystemHealth metrics={metrics} wall />
        </div>
      </div>
    );
  }

  // ---- operator
  //
  // Below ~1400 the fluid KPI row wraps to two rows, which needs ~90 px the fixed-height
  // page does not have - and a fixed-height page has nowhere to put it, so the bands below
  // it used to be squeezed until the map disappeared. A minimum height lets the page grow
  // and `main` (overflow-auto since D-3) scroll, which is the affordance that was missing.
  // From 1400 up the row is 6-across again and the page fits the viewport exactly as before.
  //
  // Reading order, top to bottom: the conclusion (hero), the six numbers (KPI row), then
  // one working band of three columns, then the four summary cards.
  //   left   - the exception funnel (the thesis) over the agent feed that acts on it;
  //   centre - the map, the widest cell, because it is the only spatial view;
  //   right  - the worklist: a slim "next hour" forecast strip over Priority alerts, which
  //            owns the whole remaining column height (~6+ rows at 1600x950).
  // The working band is the only element that flexes; everything else is sized by its
  // content, so nothing is squeezed into a scroll-within-a-scroll.
  return (
    <div className="flex h-full min-h-[920px] flex-col gap-2 min-[1400px]:min-h-0">
      {/* The hero states the conclusion before the numbers restate it (plan §6.3 /
          item 9). Operator mode only - the wall has its own fixed 3-band layout. */}
      <Hero metrics={metrics} alerts={alerts} sim_time_s={snap.sim_time_s} running={running} />
      <OperationalBrief alerts={alerts} />
      <KpiRow metrics={metrics} alerts={alerts} wall={false} />
      <div
        data-command-workspace
        className="grid flex-none grid-cols-1 gap-2 min-[900px]:grid-cols-2 min-[1400px]:min-h-0 min-[1400px]:flex-1 min-[1400px]:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.3fr)_minmax(360px,1.05fr)]"
      >
        <div className="order-2 flex min-h-[420px] min-w-0 flex-col gap-2 overflow-hidden min-[1400px]:order-1 min-[1400px]:min-h-0">
          <Funnel metrics={metrics} wall={false} />
          {/* Item 13: the agent feed is what makes the system read as agentic rather than
              as a rule engine (plan §10.2). Exported by AgentConsole so the same stream
              renders here and on #/agentic. It takes whatever the funnel leaves in this
              column (the feed is `flex-1` inside this wrapper), with a floor so at least
              three entries always show. Operator mode only. */}
          {/* min-h-0 + overflow-hidden: longer (Mongolian) text in the funnel must shrink the
              feed, never push it over the cards below. The feed scrolls inside itself. */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <AgentActivityFeed limit={10} />
          </div>
        </div>
        <div data-command-map className="order-1 min-h-[340px] min-w-0 min-[900px]:col-span-2 min-[1400px]:order-2 min-[1400px]:col-span-1 min-[1400px]:min-h-0">
          <MapCanvas className="h-full min-h-0 min-w-0" />
        </div>
        <div className="order-3 flex min-h-[420px] min-w-0 flex-col gap-2 min-[1400px]:min-h-0">
          <NextHour />
          <PriorityAlerts alerts={alerts} wall={false} className="min-h-0 flex-1" />
        </div>
      </div>
      {/* Defect A-1 (plan §6.6/§7.2): all four panels open, as one card grid of equal
          cells. The band is sized by its CONTENT (`shrink-0`, rows at least 184 px so the
          on-time chart has room), not by a flex share of what was left - a flex share is
          what cut the third route and the foot off every card at 950 px. auto-fit at 220px
          keeps all four on one row down to ~1100 and reflows below that instead of
          squeezing four fixed columns. */}
      <div
        className="grid shrink-0 gap-2"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gridAutoRows: 'minmax(184px, auto)' }}
      >
        <MostDelayed metrics={metrics} wall={false} />
        <HighestLoad metrics={metrics} wall={false} />
        <OperatorOnTime metrics={metrics} wall={false} />
        <SystemHealth metrics={metrics} wall={false} />
      </div>
    </div>
  );
}
