/**
 * Module 3 - Route & Service Regularity. Layer 2 of the five-layer drill-down
 * (L1188-L1199, S5) and the home of the deck's hero chart (S8 Chart B).
 *
 * The only hard numbers the source supplies here are the RANKING COUNTS: Top 10 by
 * schedule deviation (L1053) and Top 3 bunching (L1054). Both are read from the
 * thresholds store so Settings can move them, but those source-fixed values are the
 * defaults. Every other number on this screen comes from `useSim().metrics`.
 *
 * The planned-headway series is SYNTHETIC: no timetable exists in the deck or in the
 * design document (src/sim/timetable.ts). That is stated on screen, always - it is
 * the honesty requirement that makes the rest of the chart credible.
 */

import { useTx } from '../../i18n/t';
import { useEffect, useMemo } from 'react';
import { AXIS, CHART_BASE, EChart } from '../../charts/EChart';
import {
  DataTable,
  DrillBreadcrumb,
  Empty,
  EvidenceTag,
  Panel,
  StatusPill,
  Tooltip,
  fmtInt,
  fmtMin,
} from '../../components/primitives';
import type { I18nKey } from '../../i18n/dict';
import { useT } from '../../i18n/t';
import type { RouteMetrics } from '../../rules/evaluate';
import { rankBy } from '../../rules/regularity';
import { hhmmss } from '../../sim/engine';
import { TIMETABLE_PROVENANCE } from '../../sim/timetable';
import { history, useSelection, useSettings, useSim } from '../../store';

/** Canvas cannot resolve `var(--x)`, so series colours are read off the live root. */
const cssVar = (n: string, f: string) =>
  typeof document === 'undefined' ? f : getComputedStyle(document.documentElement).getPropertyValue(n).trim() || f;

/**
 * `fmtInt` in primitives renders "NaN" for a non-finite input and is not this
 * workstream's file, so every call site here goes through this guard instead. The
 * live cases are real: a bus with `capacity` 0 makes the load percentage Infinity,
 * and a route with no planned headway makes the planned line NaN.
 */
const EM_DASH = '—';
function intOr(n: number, dash = EM_DASH): string {
  return Number.isFinite(n) ? fmtInt(n) : dash;
}
/** Same guard for `fmtMin`, which formats seconds and is just as happy to print NaN. */
function minOr(s: number): string {
  return Number.isFinite(s) ? fmtMin(s) : EM_DASH;
}

const STATE_LABEL: Record<
  RouteMetrics['state'],
  { key: I18nKey; tone: 'ok' | 'warn' | 'crit' | 'neutral' }
> = {
  normal: { key: 'legend.normal', tone: 'ok' },
  slower: { key: 'legend.slower', tone: 'warn' },
  disrupted: { key: 'legend.disrupted', tone: 'crit' },
  noservice: { key: 'legend.noservice', tone: 'neutral' },
};

export default function Regularity() {
  const t = useT();
  const tx = useTx();
  const metrics = useSim((s) => s.metrics);
  const snap = useSim((s) => s.snap);
  const tick = useSim((s) => s.tick);
  const th = useSettings((s) => s.th);
  // Chart colours are read off the DOM, so the option memo must re-run on a theme switch.
  const theme = useSettings((s) => s.theme);
  const selected = useSelection((s) => s.route_id);

  const rows = useMemo(
    () => (metrics ? [...metrics.per_route.values()].filter((r) => r.vehicles > 0) : []),
    [metrics],
  );

  // L1053 Top 10 "by schedule deviation" - ranked on the ABSOLUTE value, so a route
  // running early is as visible as one running late. The source says deviation, not delay.
  const topDeviation = useMemo(
    () => rankBy(rows, (r) => Math.abs(r.mean_dev_s), th.top_route_ranking_n),
    [rows, th.top_route_ranking_n],
  );

  // L1054 Top 3 bunching. Primary key is the count; the tightest pair breaks ties,
  // because two routes with one bunch each are not equally bad.
  const topBunching = useMemo(
    () =>
      rankBy(
        rows.filter((r) => r.bunching_count > 0),
        (r) => r.bunching_count * 1e6 - r.min_headway_s,
        th.bunching_ranking_n,
      ),
    [rows, th.bunching_ranking_n],
  );

  const gapRoutes = useMemo(
    () =>
      rows
        .filter((r) => r.max_gap_s > th.service_gap_max_s)
        .sort((a, b) => b.max_gap_s - a.max_gap_s),
    [rows, th.service_gap_max_s],
  );

  // Default selection: the route with the largest current gap, so D1 opens on the
  // route the alert is about without the presenter clicking anything.
  const worstGap = useMemo(
    () =>
      rows.reduce<RouteMetrics | null>(
        (best, r) => (!best || r.max_gap_s > best.max_gap_s ? r : best),
        null,
      ),
    [rows],
  );
  const routeId = selected && metrics?.per_route.has(selected) ? selected : worstGap?.route_id ?? null;
  /*
   * `routeId` is the route this page is actually showing: the selected one while it
   * still exists, the worst-gap route otherwise. Writing it back covers BOTH cases -
   * no selection yet, and a selected route that stopped running while the page was
   * open, which used to leave the store pointing at a route nothing on screen was
   * about. When the selection is already valid this is a no-op.
   */
  useEffect(() => {
    if (routeId && selected !== routeId) useSelection.getState().selectRoute(routeId);
  }, [selected, routeId]);

  const rm = routeId ? metrics?.per_route.get(routeId) ?? null : null;


  const option = useMemo(() => {
    void tick; // redraw each tick: the rings are mutable, their identity never changes
    if (!rm) return null;
    const ts = history.t.toArray();
    const hw = history.headway.get(rm.route_id)?.toArray() ?? [];
    // Both rings are pushed in the same bridge callback, but a route that started
    // reporting late has a shorter one. Align on the TAIL, never on index 0.
    const n = Math.min(ts.length, hw.length);
    // Two samples is the minimum a line can be drawn from; below that the panel says
    // so rather than drawing a chart with one dot in it.
    if (n < 2) return null;
    const x = ts.slice(ts.length - n).map(hhmmss);
    // A ring is a Float32Array: a sample that was never written, or was written from a
    // division by zero, is non-finite. ECharts draws `null` as a break in the line,
    // which is the honest rendering of "no sample", where NaN paints nothing at all.
    const actual = hw
      .slice(hw.length - n)
      .map((s) => (Number.isFinite(s) ? +(s / 60).toFixed(2) : null));
    const plannedMin = Number.isFinite(rm.planned_headway_s) ? +(rm.planned_headway_s / 60).toFixed(2) : null;
    const gapMin = Number.isFinite(th.service_gap_max_s) ? th.service_gap_max_s / 60 : Infinity;

    // A fixed 0-30 axis clips the service-gap spike, which is the one thing this chart
    // exists to show (S8 Chart B). Keep 30 as the floor so a calm route still reads
    // against the deck's scale, then grow to fit an actual gap.
    // Only the real samples decide the axis. `Math.max()` of an empty list is
    // -Infinity and `Math.max(null)` is 0, and either one would silently produce a
    // nonsense axis maximum.
    const real = actual.filter((v): v is number => v !== null);
    const peakMin = real.length ? Math.max(...real) : 0;
    const yMax = Math.max(30, Math.ceil((Math.max(peakMin, Number.isFinite(gapMin) ? gapMin : 0) + 5) / 5) * 5);

    // markArea over every contiguous span above the service-gap threshold. S8 shades
    // one such span and labels it "Service gap (28 min)"; here the rule threshold
    // decides where the shading goes, so it follows the data, not a fixed window.
    // Positions are sample INDICES, not HH:MM labels: labels repeat (several samples per
    // minute) and ECharts resolves a repeated label to its first occurrence, so a span
    // inside one minute collapsed to zero width and its label floated over nothing.
    const areas: { xAxis: number; label?: Record<string, unknown> }[][] = [];
    let start = -1;
    for (let i = 0; i <= actual.length; i++) {
      const v = (i < actual.length ? actual[i] : null) ?? null;
      const over = v !== null && v > gapMin;
      if (over && start < 0) start = i;
      if (!over && start >= 0) {
        const span = actual.slice(start, i).filter((s): s is number => s !== null);
        const peak = span.length ? Math.max(...span) : 0;
        areas.push([
          {
            xAxis: start,
            label: {
              formatter: t('reg.serviceGap', { min: Math.round(peak) }),
              position: 'insideTop',
              color: cssVar('--color-text1', '#e7edf5'),
              fontSize: 10,
            },
          },
          { xAxis: i - 1 },
        ]);
        start = -1;
      }
    }

    const accent = cssVar('--color-accent', '#4d8df0');
    const muted = cssVar('--color-text3', '#667588');
    // Canvas cannot resolve `color-mix`, so the 16 % fill is a hex-alpha suffix (0x29).
    const gapFill = cssVar('--color-sev-crit', '#e5484d') + '29';
    const warn = cssVar('--color-sev-warn', '#e0a02e');
    const text2 = cssVar('--color-text2', '#9caabb');
    const fmt1 = (v: number | null | undefined) => (v === null || v === undefined ? EM_DASH : v.toFixed(1));

    return {
      ...CHART_BASE,
      // bottom room for the 45° tick labels plus the axis name under them
      grid: { ...CHART_BASE.grid, top: 30, left: 52, right: 16, bottom: 64 },
      // No textStyle here: EChart's themer overwrites legend.textStyle wholesale.
      legend: { show: true, top: 0, right: 0, itemHeight: 8 },
      tooltip: {
        ...CHART_BASE.tooltip,
        formatter: (ps: { dataIndex: number }[]) => {
          const i = ps[0]?.dataIndex ?? 0;
          const a = actual[i];
          const d = a !== null && a !== undefined && plannedMin !== null ? a - plannedMin : null;
          return [
            `<b>${rm.route_id} · ${x[i]}</b>`,
            `${t('reg.actual')}: ${fmt1(a)} ${t('unit.min')}`,
            `${t('reg.planned')}: ${fmt1(plannedMin)} ${t('unit.min')}`,
            `${t('uxreg.hw.diff')}: ${d === null ? EM_DASH : (d > 0 ? '+' : '') + d.toFixed(1)} ${t('unit.min')}`,
          ].join('<br/>');
        },
      },
      xAxis: {
        ...AXIS,
        type: 'category',
        data: x,
        boundaryGap: false,
        splitLine: { show: false },
        name: t('uxreg.axis.time'),
        nameLocation: 'middle',
        nameGap: 46,
        nameTextStyle: { color: muted, fontSize: 10 },
        // Samples are seconds apart, so labels are HH:MM:SS (an HH:MM label repeated the
        // same minute several times) and thinned to ~12 so the 45° labels never collide.
        axisLabel: {
          ...(AXIS as { axisLabel?: Record<string, unknown> }).axisLabel,
          rotate: 45,
          interval: Math.max(0, Math.ceil(x.length / 12) - 1),
        },
      },
      yAxis: {
        ...AXIS,
        type: 'value',
        min: 0,
        // A fixed 0-30 axis clips the service-gap spike, which is the one thing this
        // chart exists to show (S8 Chart B). Keep 30 as the floor so a calm route still
        // reads against the deck's scale, but grow to fit an actual gap.
        max: yMax,
        name: t('reg.headwayMin'),
        nameLocation: 'middle',
        nameRotate: 90,
        nameTextStyle: { color: muted, fontSize: 10 },
        nameGap: 32,
      },
      series: [
        {
          id: 'planned-headway',
          name: t('reg.planned'),
          type: 'line',
          data: x.map(() => plannedMin),
          showSymbol: false,
          sampling: 'lttb',
          lineStyle: { type: 'dashed', width: 1.5, color: muted },
          itemStyle: { color: muted },
          // Labels for the two horizontal reference lines, drawn at their right end.
          markLine: {
            silent: true,
            symbol: 'none',
            label: { position: 'insideEndTop', fontSize: 10 },
            data: [
              ...(plannedMin !== null
                ? [
                    {
                      yAxis: plannedMin,
                      lineStyle: { type: 'dashed', width: 1.5, color: muted },
                      label: { formatter: t('uxreg.hw.plannedMark', { min: +plannedMin.toFixed(1) }), color: text2 },
                    },
                  ]
                : []),
              ...(Number.isFinite(gapMin)
                ? [
                    {
                      yAxis: gapMin,
                      lineStyle: { type: 'dotted', width: 1, color: warn },
                      label: { formatter: t('uxreg.hw.gapMark', { min: Math.round(gapMin) }), color: warn },
                    },
                  ]
                : []),
            ],
          },
        },
        {
          id: 'actual-headway',
          name: t('reg.actual'),
          type: 'line',
          data: actual,
          showSymbol: false,
          sampling: 'lttb',
          lineStyle: { type: 'solid', width: 2, color: accent },
          itemStyle: { color: accent },
          markArea: { silent: true, itemStyle: { color: gapFill }, data: areas },
        },
      ],
    } as Record<string, unknown>;
  }, [rm, th.service_gap_max_s, tick, t, theme]);

  const vehicles = useMemo(
    () =>
      snap && routeId
        ? snap.vehicles
            .filter((v) => v.route_id === routeId && v.status === 'in_service')
            .sort((a, b) => a.trip_progress - b.trip_progress)
        : [],
    [snap, routeId],
  );
  const stripVehicles = vehicles.map((v, i) => ({
    v,
    lane: vehicles.slice(0, i).filter((x) => Math.abs(x.trip_progress - v.trip_progress) < 0.015).length,
  }));

  /*
   * Not a loading spinner: nothing is in flight. The simulation has simply not
   * produced its first snapshot, which is a state the operator can act on - so the
   * panel says what is missing and what to press.
   */
  if (!metrics) return <Empty title={t('mod.warmingTitle')} text={t('reg.warmingText')} />;

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 p-2">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <DrillBreadcrumb
          path={[
            {
              key: 'drill.network',
              onClick: () => {
                location.hash = '#/command';
              },
            },
            { key: 'drill.route', label: routeId ?? undefined },
          ]}
        />
        <EvidenceTag label="INFERRED" cite="BR-12" />
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-12 gap-2">
        {/* ------------------------------------------------------- left: the rankings */}
        <div className="col-span-12 flex min-h-0 flex-col gap-2 overflow-auto lg:col-span-4">
          <RankTable
            titleKey="reg.topDeviation"
            titleParams={{ n: th.top_route_ranking_n }}
            rows={topDeviation}
            selected={routeId}
            threshold={th.schedule_deviation_s}
            empty={{ title: t('reg.devEmptyTitle'), text: t('reg.devEmptyText') }}
          />
          <RankTable
            titleKey="reg.topBunching"
            titleParams={{ n: th.bunching_ranking_n }}
            rows={topBunching}
            selected={routeId}
            threshold={th.schedule_deviation_s}
            extra={(r) => `${intOr(r.bunching_count)} < ${intOr(th.bunching_min_headway_s / 60)} ${t('unit.min')}`}
            empty={{ title: t('reg.bunchEmptyTitle'), text: t('reg.bunchEmptyText'), tone: 'ok' }}
            open={false}
            summary={
              topBunching.length ? `${topBunching.length} · ${intOr(topBunching[0]!.bunching_count)}` : '0'
            }
          />
          <RankTable
            titleKey="reg.serviceGaps"
            rows={gapRoutes}
            selected={routeId}
            threshold={th.schedule_deviation_s}
            extra={(r) => `${intOr(r.max_gap_s / 60)} ${t('unit.min')}`}
            empty={{ title: t('reg.gapEmptyTitle'), text: t('reg.gapEmptyText'), tone: 'ok' }}
            open={false}
            summary={
              gapRoutes.length ? `${gapRoutes.length} · ${intOr(gapRoutes[0]!.max_gap_s / 60)} ${t('unit.min')}` : '0'
            }
          />
        </div>

        {/* -------------------------------------------- right: S8 Chart B + the strip */}
        <div className="col-span-12 flex min-h-0 flex-col gap-2 lg:col-span-8">
          <Panel
            title={t('reg.headwayTitle', { route: rm?.route_id ?? '—' })}
            className="min-h-[240px] flex-[3]"
            sub={
              rm
                ? t('uxreg.hw.sub', {
                    route: rm.route_id,
                    planned: intOr(rm.planned_headway_s / 60),
                    gap: intOr(th.service_gap_max_s / 60),
                  })
                : undefined
            }
            right={
              rm ? (
                <span className="num t-meta min-w-0 truncate">
                  {t('reg.planned')} {intOr(rm.planned_headway_s / 60)} {t('unit.min')}
                  <span className="hidden xl:inline">
                    {' · '}
                    {t('reg.avgDelay')} {minOr(rm.mean_dev_s)} {t('unit.min')}
                  </span>
                </span>
              ) : null
            }
            bodyClassName="p-1"
          >
            {/* Three distinct states, and they are not the same sentence: no route
                chosen, a route chosen whose ring has not filled yet, and the chart. */}
            {option ? (
              <EChart option={option} ariaLabel={`${t('reg.headwayTitle', { route: rm?.route_id ?? '—' })} · ${t('reg.actual')} vs ${t('reg.planned')} · ${t('reg.headwayMin')} / ${t('uxreg.axis.time')}`} />
            ) : rm ? (
              <Empty title={t('reg.chartWarmTitle')} text={t('reg.chartWarmText', { route: rm.route_id })} />
            ) : (
              <Empty title={t('reg.selectRoute')} text={t('reg.chartEmptyText')} />
            )}
          </Panel>
          {rm ? (
            <p className="t-body shrink-0 border-l-2 border-[var(--color-accent)] pl-2 text-[var(--color-text1)]" data-regularity-insight>
              {t('uxreg.routeInsight', { route: rm.route_id, gap: (rm.max_gap_s / 60).toFixed(1), planned: (rm.planned_headway_s / 60).toFixed(1), buses: vehicles.length, action: rm.max_gap_s > th.service_gap_max_s ? t('reg.serviceGaps') : t('legend.normal') })}
            </p>
          ) : null}

          {/* "String" strip: one marker per vehicle at its trip_progress, coloured by
              delay class. Bunching shows as clustered markers, a gap as empty track. */}
          <Panel
            title={t('reg.strip', { route: rm?.route_id ?? '—' })}
            className="min-h-[96px] flex-1"
            bodyClassName="p-2"
          >
            {vehicles.length === 0 ? (
              rm ? (
                <Empty
                  title={t('reg.stripEmptyTitle', { route: rm.route_id })}
                  text={t('reg.stripEmptyText')}
                />
              ) : (
                <Empty title={t('reg.selectRoute')} text={t('reg.stripNoRouteText')} />
              )
            ) : (
              <div>
                <div className="mb-2 flex flex-wrap gap-3 t-meta" aria-label={t('uxreg.stripLegend')}>
                  {([
                    ['legend.normal', 'var(--color-sev-ok)'],
                    ['legend.slower', 'var(--color-sev-warn)'],
                    ['legend.disrupted', 'var(--color-sev-crit)'],
                  ] as const).map(([key, color]) => <span key={key} className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />{t(key)}</span>)}
                </div>
              <div className="relative h-16 w-full rounded-md bg-[var(--color-bg3)]">
                {stripVehicles.map(({ v, lane }) => (
                  <span
                    key={v.vehicle_id}
                    className="absolute -translate-x-1/2 -translate-y-1/2"
                    style={{
                      // 0..1 mapped into a 2%..98% inset: a marker at either end of the
                      // trip would otherwise hang half outside the rounded track.
                      left: `${2 + v.trip_progress * 96}%`,
                      top: `${16 + Math.min(3, lane) * 11}px`,
                      zIndex: 'var(--z-raised)',
                    }}
                  >
                    <Tooltip
                      content={t('kit.tip.stripMarker', {
                        bus: v.vehicle_id,
                        dev: minOr(v.schedule_deviation),
                        // capacity 0 would make this Infinity, and t() would print the
                        // word "Infinity" into the tooltip.
                        load: intOr((v.pax_count / v.capacity) * 100),
                      })}
                    >
                      <button
                        type="button"
                        aria-label={v.vehicle_id}
                        onClick={() => {
                          location.hash = `#/vehicle/${v.vehicle_id}`;
                        }}
                        className="h-4 w-4 rounded-full border border-[var(--color-bg0)] transition-transform hover:scale-150"
                        style={{ background: devColor(v.schedule_deviation, th.schedule_deviation_s) }}
                      />
                    </Tooltip>
                  </span>
                ))}
              </div>
              </div>
            )}
          </Panel>
        </div>
      </div>

      {/* Always visible, never collapsible: the planned service is synthesised and the
          plan makes saying so on screen an explicit requirement. */}
      <footer className="t-meta flex shrink-0 items-start gap-2 border-t border-[var(--color-line)] px-2 pt-1.5">
        <EvidenceTag label="INFERRED" />
        {/* Wraps rather than truncates: a disclosure the plan makes mandatory is the one
            string on the screen that may never be cut off mid-sentence. */}
        <span className="min-w-0">{t('reg.timetableNote')}</span>
        <span className="ml-auto hidden shrink-0 opacity-60 xl:inline">{tx(TIMETABLE_PROVENANCE)}</span>
      </footer>
    </div>
  );
}

/** Delay classes mirror the rule engine's own bands: on time / >1x / >3x threshold. */
function devColor(dev_s: number, threshold_s: number): string {
  const a = Math.abs(dev_s);
  if (a > threshold_s * 3) return 'var(--color-sev-crit)';
  if (a > threshold_s) return 'var(--color-sev-warn)';
  return 'var(--color-sev-ok)';
}

function RankTable({
  titleKey,
  titleParams,
  rows,
  selected,
  threshold,
  extra,
  open = true,
  summary,
  empty,
}: {
  titleKey: I18nKey;
  titleParams?: Record<string, string | number>;
  rows: RouteMetrics[];
  selected: string | null;
  threshold: number;
  extra?: (r: RouteMetrics) => string;
  /** false => collapsed by default; the headline number stays visible via `summary`. */
  open?: boolean;
  summary?: string;
  /**
   * Per-table, and never optional. Three rankings sharing one "No active alerts"
   * answered none of the three questions: an empty bunching table is GOOD NEWS, an
   * empty deviation table means nothing is reporting at all.
   */
  empty: { title: string; text: string; tone?: 'neutral' | 'ok' };
}) {
  const t = useT();
  return (
    <Panel
      title={t(titleKey, titleParams)}
      className="shrink-0"
      bodyClassName="p-0"
      collapsible={!open}
      defaultOpen={false}
      summary={summary}
    >
      {/* The Empty primitive rather than DataTable's in-body empty row, because only
          Empty can carry tone="ok": "no bunching anywhere" is a RESULT, and rendering
          it in the same grey as "nothing is reporting" loses that distinction. */}
      {rows.length === 0 ? (
        <Empty title={empty.title} text={empty.text} tone={empty.tone} />
      ) : (
      <DataTable
        rows={rows}
        rowKey={(r) => r.route_id}
        maxHeight={260}
        // 121 routes exist and the service-gap table is not capped by a ranking count,
        // so this one can be the full network on a bad morning. Page it.
        pageSize={10}
        onRowClick={(r) => useSelection.getState().selectRoute(r.route_id)}
        // bg2 sits a hair off bg1 on white; the selected row uses bg3 so the highlight
        // is legible in both themes.
        rowClass={(r) => (r.route_id === selected ? 'bg-[var(--color-bg3)]' : '')}
        empty={empty}
        columns={[
          { key: 'route_id', label: t('reg.route'), mono: true, sortable: true },
          {
            key: 'mean_dev_s',
            label: t('reg.avgDelay'),
            num: true,
            sortable: true,
            // Rank on the ABSOLUTE deviation, as L1053 says: a route running early is
            // as interesting as one running late.
            sortValue: (r) => Math.abs(r.mean_dev_s),
            render: (r) => <span style={{ color: devColor(r.mean_dev_s, threshold) }}>{minOr(r.mean_dev_s)}</span>,
          },
          {
            key: 'state',
            label: t('reg.status'),
            render: (r) => <StatusPill tone={STATE_LABEL[r.state].tone}>{extra ? extra(r) : t(STATE_LABEL[r.state].key)}</StatusPill>,
          },
        ]}
      />
      )}
    </Panel>
  );
}
