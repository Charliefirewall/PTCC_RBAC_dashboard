/**
 * Passenger Intelligence - CONFIRMED end to end.
 *
 * The chain is the deck's own: Demand -> Boarding -> Occupancy -> Capacity ->
 * Overcrowding -> Operational action (S8, plan section 11.1). Occupancy and boardings
 * are Table 8 fields (pax_count, R1039) fed by APC/AFC; only "demand" itself is an
 * inference, because no source measures unserved demand.
 *
 * The five load bands (>90 / 70-90 / 50-70 / 30-50 / <30 %) are the ONLY numeric
 * threshold set that exists anywhere in the client's material (S8 Chart D). They are
 * used verbatim from LOAD_BANDS - never re-derived, never re-coloured here.
 *
 * The one INFERRED item on this page is the derived waiting time: no source measures
 * waiting passengers at stops. R1314 names "waiting time" as a KPI and the design
 * covers it through headway and bunching thresholds - i.e. the design itself treats it
 * as derived. The tile says so, on screen, every time.
 *
 * No map import here on purpose: the heat LAYER is the map module's file; this page
 * shows the same banding as bars.
 *
 * Disclosure: the headline (chevron strip, KPI row, load bands, top-5) stays open. The
 * two provenance lines are demoted to `t-meta` - kept verbatim, just no longer shouting
 * - and the two detail panels fold to a one-number summary, because the client's
 * complaint was "everything at once".
 */

import { useMemo } from 'react';
import { EChart, AXIS, CHART_BASE } from '../../charts/EChart';
import {
  Bar,
  DataTable,
  Empty,
  EvidenceTag,
  KpiTile,
  Panel,
  StatusPill,
  Stepper,
  fmtCompact,
  fmtInt,
} from '../../components/primitives';
import { useT } from '../../i18n/t';
import { LOAD_BANDS, bandColor, bandOf } from '../../rules/thresholds';
import type { RouteMetrics } from '../../rules/evaluate';
import { history, useSelection, useSettings, useSim } from '../../store';

/**
 * `fmtInt` / `fmtCompact` in primitives print the literal "NaN" for a non-finite
 * input, and that file belongs to another workstream - so every call site on this
 * page goes through a guard and renders an em dash instead.
 */
const EM_DASH = '—';
function intOr(n: number): string {
  return Number.isFinite(n) ? fmtInt(n) : EM_DASH;
}
function compactOr(n: number): string {
  return Number.isFinite(n) ? fmtCompact(n) : EM_DASH;
}
/** A load percentage, rounded, or an em dash. Never "NaN %" and never "Infinity %". */
function pctOr(n: number): string {
  return Number.isFinite(n) ? `${Math.round(n)} %` : EM_DASH;
}

export default function Passenger() {
  const t = useT();
  const snap = useSim((s) => s.snap);
  const metrics = useSim((s) => s.metrics);
  const th = useSettings((s) => s.th);
  const theme = useSettings((s) => s.theme);
  const selectedRoute = useSelection((s) => s.route_id);
  const selectRoute = useSelection((s) => s.selectRoute);

  const vehicles = snap?.vehicles ?? [];

  /** Boardings + left-behind per route. left_behind is simulated (engine, not a feed). */
  const byRoute = useMemo(() => {
    const m = new Map<string, { boardings: number; left: number }>();
    for (const v of vehicles) {
      const e = m.get(v.route_id) ?? { boardings: 0, left: 0 };
      e.boardings += v.boardings_today;
      e.left += v.left_behind;
      m.set(v.route_id, e);
    }
    return m;
  }, [vehicles]);

  const ranked = useMemo(() => {
    if (!metrics) return [] as RouteMetrics[];
    return [...metrics.per_route.values()]
      .filter((r) => r.vehicles > 0)
      .sort((a, b) => b.load_pct - a.load_pct);
  }, [metrics]);

  const byBoardings = useMemo(
    () => [...byRoute.entries()].sort((a, b) => b[1].boardings - a[1].boardings),
    [byRoute],
  );

  const heat = useMemo(() => ranked.slice(0, 24), [ranked]);

  /*
   * Memoised so ECharts is not handed a brand-new option object on every sim tick.
   * No axis/label colour here on purpose: CHART_BASE + AXIS plus EChart's live
   * CSS-variable themer own those, which is exactly what makes the light theme right.
   */
  const chartOption = useMemo(
    () => {
      const peak = Math.max(100, ...heat.map((r) => Number.isFinite(r.load_pct) ? r.load_pct : 0));
      const scaleMax = Math.ceil(peak / 10) * 10;
      return ({
      ...CHART_BASE,
      grid: { ...CHART_BASE.grid, left: 8, right: 24, top: 8, bottom: 8 },
      tooltip: {
        ...CHART_BASE.tooltip,
        trigger: 'item' as const,
        formatter: (p: { dataIndex: number; value: number }) =>
          `<b>${t('chart.tooltip.route', { route: heat[p.dataIndex]?.route_id ?? '—' })}</b><br/>${t('chart.series.load')}: ${Math.round(p.value)} %`,
      },
      xAxis: { ...AXIS, type: 'value', min: 0, max: scaleMax, name: t('chart.axis.loadPct'), nameLocation: 'middle' as const, nameGap: 24 },
      yAxis: { ...AXIS, type: 'category', inverse: true, data: heat.map((r) => r.route_id), name: t('chart.axis.route'), nameLocation: 'end' as const, nameGap: 6 },
      series: [
        {
          id: 'route-load',
          name: t('chart.series.load'),
          type: 'bar',
          // A non-finite load is drawn as a missing bar (null), never as a zero-height
          // bar that reads as "this route is empty".
          data: heat.map((r) => ({
            value: Number.isFinite(r.load_pct) ? Math.round(r.load_pct) : null,
            itemStyle: { color: bandColor(bandOf(r.load_pct)) },
          })),
          barMaxWidth: 12,
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { color: bandColor({ token: '--color-text3' }), type: 'dashed', width: 1 },
            label: { formatter: '100%', color: bandColor({ token: '--color-text3' }), fontSize: 9, position: 'insideEndTop' },
            data: [{ xAxis: 100 }],
          },
        },
      ],
    }); },
    [heat, t, theme],
  );

  /*
   * Not a spinner: every number on this page is computed synchronously from the
   * snapshot. What is missing is the snapshot itself, so the panel says that and
   * says what to press.
   */
  if (!snap || !metrics) return <Empty title={t('mod.warmingTitle')} text={t('pax.warmingText')} />;

  const top5 = ranked.slice(0, 5);
  const overcrowded = ranked.filter((r) => r.load_pct >= th.passenger_load_pct);

  // Waiting time is derived from the OBSERVED headway, not measured. Worst route unless
  // the presenter has selected one.
  const focus = ranked.find((r) => r.route_id === selectedRoute) ?? ranked[0];
  // max_gap_s is finite for every route the engine produces, but half of a missing
  // gap is NaN and `NaN.toFixed(1)` renders "NaN min" in a headline tile.
  const rawWait = focus ? focus.max_gap_s / 2 / 60 : NaN;
  const waitMin = Number.isFinite(rawWait) ? rawWait : null;
  const leftBehind = focus ? (byRoute.get(focus.route_id)?.left ?? 0) : 0;

  // Collapsed-panel headlines: numbers plus keys that already exist in the dictionary.
  const topBoard = byBoardings[0];
  const worst = heat[0];

  return (
    <div className="flex h-full flex-col gap-2 overflow-auto">
      {/* S8 three-step chevron strip + banner - the client's own diagram, stays open */}
      <div className="shrink-0">
        {/* The client's own Slide 8 diagram, now the shared Stepper's chevron variant. */}
        <Stepper
          variant="chevron"
          steps={[
            { label: t('pax.chevron1'), state: 'done' },
            { label: t('pax.chevron2'), state: 'done' },
            { label: t('pax.chevron3'), state: 'active' },
          ]}
        />
        <p className="t-body mt-1 text-center italic text-[var(--color-text2)]">{t('pax.banner')}</p>
      </div>

      {/* the chain, stated. Evidence, so kept verbatim - only the box around it went. */}
      <p className="t-meta flex shrink-0 flex-wrap items-center gap-1.5">
        <EvidenceTag label="CONFIRMED" cite="S8" />
        <span className="font-semibold">{t('pax.chain')}</span>
        <span>{t('pax.chainNote')}</span>
      </p>

      <div className="grid shrink-0 grid-cols-2 gap-2 lg:grid-cols-4">
        <KpiTile labelKey="kpi.ridershipToday" value={compactOr(metrics.ridership_today)} evidence="CONFIRMED" spark={history.kpi.ridership.toArray()} />
        <KpiTile
          labelKey="pax.waiting"
          value={waitMin === null ? EM_DASH : `${waitMin.toFixed(1)} ${t('unit.min')}`}
          tone={waitMin !== null && waitMin > 10 ? 'warn' : 'neutral'}
          evidence="INFERRED"
          sub={
            focus && Number.isFinite(focus.max_gap_s)
              ? t('pax.waitingBasis', { gap: (focus.max_gap_s / 60).toFixed(0), route: focus.route_id })
              : ''
          }
        />
        <KpiTile
          labelKey="pax.leftBehind"
          value={intOr(leftBehind)}
          tone={leftBehind > 0 ? 'warn' : 'neutral'}
          evidence="INFERRED"
          sub={`${t('health.simulated')} · ${focus?.route_id ?? '—'}`}
        />
        <KpiTile
          labelKey="widget.highestLoad"
          value={top5[0] ? pctOr(top5[0].load_pct) : EM_DASH}
          tone={top5[0] && top5[0].load_pct >= th.passenger_load_pct ? 'crit' : 'neutral'}
          evidence="CONFIRMED"
          sub={top5[0]?.route_id ?? EM_DASH}
        />
      </div>

      {/* waiting-time provenance, spelled out under the tile row */}
      <p className="t-meta shrink-0">
        <EvidenceTag label="INFERRED" cite="R1314" className="mr-1" />
        {t('pax.waitingNote')}
      </p>

      {top5[0] ? (
        <p className="t-body shrink-0 border-l-2 border-[var(--color-accent)] pl-2 text-[var(--color-text1)]" data-passenger-insight>
          {t('uxreg.paxInsight', { route: top5[0].route_id, load: top5[0].load_pct.toFixed(0), threshold: th.passenger_load_pct, action: top5[0].load_pct >= th.passenger_load_pct ? t('pax.action') : t('legend.normal') })}
        </p>
      ) : null}

      {/* overcrowding callouts - capped at 6, the rest shown as a bare count */}
      {/* Emptiness here is the good news on this page, so it is stated rather than
          left as a missing row of chips. */}
      {ranked.length > 0 && overcrowded.length === 0 ? (
        <p className="t-meta shrink-0" style={{ color: 'var(--color-sev-ok)' }}>
          {t('pax.noOvercrowding')} <span className="text-[var(--color-text3)]">{t('pax.noOvercrowdingText')}</span>
        </p>
      ) : null}

      {overcrowded.length > 0 && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {overcrowded.slice(0, 6).map((r) => (
            <button
              key={r.route_id}
              type="button"
              onClick={() => selectRoute(r.route_id)}
              className="t-body flex min-w-0 max-w-full items-center gap-2 rounded border px-2 py-1 font-semibold"
              style={{ borderColor: bandOf(r.load_pct).color, color: bandOf(r.load_pct).color }}
            >
              <span className="truncate">{t('pax.overcrowded', { route: r.route_id, pct: pctOr(r.load_pct).replace(' %', '') })}</span>
              <span className="t-meta min-w-0 truncate font-normal">{t('pax.action')}</span>
            </button>
          ))}
          {overcrowded.length > 6 && <span className="t-meta num">+{overcrowded.length - 6}</span>}
        </div>
      )}

      <div className="grid min-h-0 grid-cols-1 gap-2 lg:grid-cols-3">
        {/* Top-5 busiest routes - S8 Chart C shape (R5 96, R18 91, R22 87, R10 78, R3 72). */}
        <Panel
          title={t('pax.topBusiest', { n: top5.length })}
          right={<EvidenceTag label="CONFIRMED" cite="S8" />}
          className="max-h-[320px]"
        >
          <DataTable
            rows={top5}
            rowKey={(r) => r.route_id}
            sortKey="load_pct"
            sortDir="desc"
            onRowClick={(r) => selectRoute(r.route_id)}
            rowClass={(r) => (r.route_id === selectedRoute ? 'bg-[var(--color-bg3)]' : '')}
            empty={{ title: t('pax.top5EmptyTitle'), text: t('pax.top5EmptyText') }}
            columns={[
              { key: 'route_id', label: t('reg.route'), mono: true, sortable: true, render: (r) => <span className="font-semibold">{r.route_id}</span> },
              { key: 'load_pct', label: t('pax.avgLoad'), num: true, sortable: true, render: (r) => pctOr(r.load_pct) },
              {
                key: 'band',
                label: t('pax.band'),
                sortable: true,
                sortValue: (r) => r.load_pct,
                render: (r) => (
                  <span
                    className="t-meta rounded-full px-2 py-0.5 font-semibold"
                    style={{ color: bandOf(r.load_pct).color, background: `color-mix(in srgb, ${bandOf(r.load_pct).color} 16%, transparent)` }}
                  >
                    {t(bandOf(r.load_pct).key)}
                  </span>
                ),
              },
              {
                key: 'status',
                label: t('reg.status'),
                render: (r) =>
                  r.load_pct >= th.passenger_load_pct ? (
                    <StatusPill tone="crit">{t('alerts.type.overcrowding')}</StatusPill>
                  ) : (
                    <StatusPill tone="ok">{t('legend.normal')}</StatusPill>
                  ),
              },
            ]}
          />
        </Panel>

        {/* Load band legend - verbatim S8. The only sourced threshold set, so never folded. */}
        <Panel titleKey="pax.loadBands" right={<EvidenceTag label="CONFIRMED" cite="S8" />} className="max-h-[320px]">
          {ranked.length === 0 ? (
            <Empty title={t('pax.bandsEmptyTitle')} text={t('pax.bandsEmptyText')} />
          ) : (
          <div className="flex flex-col gap-1 p-2">
            {LOAD_BANDS.map((b) => {
              const n = ranked.filter((r) => bandOf(r.load_pct).key === b.key).length;
              return (
                <div key={b.key} className="t-body flex items-center gap-2">
                  <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: b.color }} />
                  <span className="w-20 shrink-0 truncate text-[var(--color-text1)]">{t(b.key)}</span>
                  <div className="min-w-0 flex-1">
                    <Bar pct={ranked.length ? (n / ranked.length) * 100 : 0} color={b.color} />
                  </div>
                  <span className="num w-8 shrink-0 text-right text-[var(--color-text3)]">{n}</span>
                </div>
              );
            })}
            <p className="t-meta mt-2">{t('pax.loadBandsNote')}</p>
          </div>
          )}
        </Panel>

        {/* Top / bottom by boardings (R1161-R1164, R1162). Detail, so folded by default. */}
        <Panel
          titleKey="pax.ridership"
          right={<EvidenceTag label="CONFIRMED" cite="R1161–R1164" />}
          className="max-h-[320px]"
          collapsible
          defaultOpen={false}
          summary={topBoard ? `${t('pax.boardings')}: ${topBoard[0]} · ${compactOr(topBoard[1].boardings)}` : undefined}
        >
          {byBoardings.length === 0 ? (
            <Empty title={t('pax.boardEmptyTitle')} text={t('pax.boardEmptyText')} />
          ) : (
          <div className="t-body grid grid-cols-2 gap-2 p-2">
            <div className="min-w-0">
              <div className="t-label mb-1 truncate">{t('pax.topByBoardings')}</div>
              {byBoardings.slice(0, 5).map(([id, e]) => (
                <div key={id} className="flex justify-between gap-2 border-t border-[var(--color-line)] py-1">
                  <span className="num min-w-0 truncate">{id}</span>
                  <span className="num shrink-0 text-[var(--color-text2)]">{compactOr(e.boardings)}</span>
                </div>
              ))}
            </div>
            <div className="min-w-0">
              <div className="t-label mb-1 truncate">{t('pax.bottomByBoardings')}</div>
              {byBoardings.slice(-5).reverse().map(([id, e]) => (
                <div key={id} className="flex justify-between gap-2 border-t border-[var(--color-line)] py-1">
                  <span className="num min-w-0 truncate">{id}</span>
                  <span className="num shrink-0 text-[var(--color-text2)]">{compactOr(e.boardings)}</span>
                </div>
              ))}
            </div>
          </div>
          )}
        </Panel>
      </div>

      {/* Demand heat: the same banding as the map layer, as bars. Open, but foldable. */}
      <Panel
        titleKey="pax.demandHeat"
        right={<EvidenceTag label="CONFIRMED" cite="S8 Chart D" />}
        className="shrink-0"
        bodyClassName="p-1"
        collapsible
        defaultOpen
        summary={worst ? `${t('widget.highestLoad')}: ${worst.route_id} · ${pctOr(worst.load_pct)}` : undefined}
      >
        {heat.length === 0 ? (
          <Empty title={t('pax.heatEmptyTitle')} text={t('pax.heatEmptyText')} />
        ) : (
          <EChart option={chartOption} style={{ height: 300 }} ariaLabel={`${t('pax.demandHeat')} · ${t('chart.axis.loadPct')} by ${t('chart.axis.route')}`} />
        )}
      </Panel>
    </div>
  );
}
