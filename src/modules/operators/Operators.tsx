/**
 * Operator Performance & Revenue - CONFIRMED.
 *
 * Everything on this page except the fare VALUE comes from the source:
 *   - km operated per operator and on-time performance are the design's own operator
 *     KPIs (Table 14 aggregation interval, R931 performance-based contracts);
 *   - "Revenue" is an integer in MNT per day (R1042); revenue monitoring is total of
 *     the day plus top-10 / bottom-10 routes and an anomaly vs baseline (R1233-R1236,
 *     L1107-L1113) - hence the two ranking panels and the variance chip;
 *   - the variance case reproduces the deck's "Operator B revenue variance" (S7) and
 *     the design document's OWN hypothesis for it, a potential fare-system malfunction
 *     (L1092-L1097): AFC validators offline under-record boardings, so AFC-recorded
 *     revenue falls below the revenue implied by APC boardings.
 *
 * The fare itself is the one assumption - see FARE_MNT.
 *
 * Role filtering: a bus operator OCC may see only its own fleet (R2627-R2642, L718).
 */

import { useMemo } from 'react';
import { EChart, AXIS, CHART_BASE } from '../../charts/EChart';
import {
  Callout,
  type Column,
  DataTable,
  Empty,
  EvidenceTag,
  KpiTile,
  Panel,
  StatusPill,
  Tooltip,
  fmtCompact,
  fmtInt,
  fmtMnt,
} from '../../components/primitives';
import { useT } from '../../i18n/t';
import type { OperatorId } from '../../sim/types';
import { useSettings, useSim, world } from '../../store';

/**
 * Flat fare in MNT used to turn boardings into revenue.
 *
 * NO FARE FIGURE EXISTS IN ANY SOURCE - not in the deck, not in the detailed design,
 * not in the client conversation. 500 ₮ is a demo placeholder, and fare fixation sits
 * with PTPD, not PTCC (R992). Every revenue number on this page inherits that
 * assumption and is tagged with it.
 */
export const FARE_MNT = 500;

/** Canvas cannot resolve `var(--x)`, so series colours read the live token value. */
const cssVar = (n: string, f: string) =>
  typeof document === 'undefined' ? f : getComputedStyle(document.documentElement).getPropertyValue(n).trim() || f;

/**
 * `fmtInt` / `fmtCompact` / `fmtMnt` in primitives all render the literal "NaN" for a
 * non-finite input and live in another workstream's file, so this page guards at every
 * call site instead and prints an em dash.
 */
const EM_DASH = '—';
function intOr(n: number): string {
  return Number.isFinite(n) ? fmtInt(n) : EM_DASH;
}
function compactOr(n: number): string {
  return Number.isFinite(n) ? fmtCompact(n) : EM_DASH;
}
function mntOr(n: number): string {
  return Number.isFinite(n) ? fmtMnt(n) : EM_DASH;
}

interface OpRow {
  id: OperatorId;
  km: number;
  on_time_pct: number;
  /**
   * False when NOT ONE of this operator's routes has a bus in service. The old code
   * showed 100 % in that case, which reads as a perfect score rather than as no data.
   */
  on_time_known: boolean;
  interruptions: number;
  boardings: number;
  /** Boardings on buses whose AFC validator is actually reporting. */
  recorded_boardings: number;
  afc_offline: number;
  revenue: number;
  expected_revenue: number;
  variance_pct: number;
}

type RevenueRow = [route_id: string, e: { operator: OperatorId; revenue: number }];

export default function Operators() {
  const t = useT();
  const snap = useSim((s) => s.snap);
  const metrics = useSim((s) => s.metrics);
  const role = useSettings((s) => s.role);
  const theme = useSettings((s) => s.theme);
  const revenueAnomalyPct = useSettings((s) => s.th.revenue_anomaly_pct);

  const vehicles = snap?.vehicles ?? [];

  const rows = useMemo<OpRow[]>(() => {
    const base: Record<OperatorId, OpRow> = {
      A: blank('A'), B: blank('B'), C: blank('C'),
    };
    for (const v of vehicles) {
      const r = base[v.operator_id];
      r.km += v.km_today;
      r.boardings += v.boardings_today;
      if (v.equipment.afc === 'offline') r.afc_offline++;
      else r.recorded_boardings += v.boardings_today;
      if (v.status === 'breakdown') r.interruptions++;
    }
    // On-time % is a ROUTE metric; weight each operator's routes by vehicles in service.
    if (metrics) {
      const acc: Record<OperatorId, { num: number; den: number }> = {
        A: { num: 0, den: 0 }, B: { num: 0, den: 0 }, C: { num: 0, den: 0 },
      };
      for (const rm of metrics.per_route.values()) {
        const route = world.routeById.get(rm.route_id);
        if (!route || rm.vehicles === 0) continue;
        acc[route.operator_id].num += rm.on_time_pct * rm.vehicles;
        acc[route.operator_id].den += rm.vehicles;
      }
      for (const id of ['A', 'B', 'C'] as OperatorId[]) {
        base[id].on_time_known = acc[id].den > 0 && Number.isFinite(acc[id].num);
        base[id].on_time_pct = base[id].on_time_known ? acc[id].num / acc[id].den : 0;
      }
    }
    // A suspended route is a service interruption for the operator that runs it.
    for (const route_id of world.suspended) {
      const route = world.routeById.get(route_id);
      if (route) base[route.operator_id].interruptions++;
    }
    for (const id of ['A', 'B', 'C'] as OperatorId[]) {
      const r = base[id];
      r.revenue = r.recorded_boardings * FARE_MNT;
      r.expected_revenue = r.boardings * FARE_MNT;
      r.variance_pct = r.expected_revenue ? ((r.revenue - r.expected_revenue) / r.expected_revenue) * 100 : 0;
    }
    const all = [base.A, base.B, base.C];
    // R2627-R2642 / L718: an operator OCC sees only its own fleet.
    return role === 'bus_operator_occ' ? all.filter((r) => r.id === 'B') : all;
  }, [vehicles, metrics, role]);

  const routeRevenue = useMemo(() => {
    const m = new Map<string, { operator: OperatorId; revenue: number }>();
    for (const v of vehicles) {
      if (v.equipment.afc === 'offline') continue; // AFC-recorded revenue only
      const e = m.get(v.route_id) ?? { operator: v.operator_id, revenue: 0 };
      e.revenue += v.boardings_today * FARE_MNT;
      m.set(v.route_id, e);
    }
    const visible = role === 'bus_operator_occ' ? [...m].filter(([, e]) => e.operator === 'B') : [...m];
    return visible.sort((a, b) => b[1].revenue - a[1].revenue);
  }, [vehicles, role]);

  // `theme` is in the deps on purpose: the series colours below are resolved token
  // values, so the option has to be rebuilt when the theme flips.
  const chartOption = useMemo(
    () => ({
      ...CHART_BASE,
      legend: { top: 0 },
      grid: { ...CHART_BASE.grid, top: 28, right: 44 },
      xAxis: { ...AXIS, type: 'category', data: rows.map((r) => r.id) },
      yAxis: [
        { ...AXIS, type: 'value', name: 'km' },
        { ...AXIS, type: 'value', name: '%', max: 100, splitLine: { show: false } },
      ],
      series: [
        // An operator with no data is a MISSING bar (null), not a zero-height one and
        // certainly not a full-height 100 %.
        { name: t('op.serviceKm'), type: 'bar', data: rows.map((r) => (Number.isFinite(r.km) ? Math.round(r.km) : null)), itemStyle: { color: cssVar('--color-accent', '#4d8df0') }, barMaxWidth: 36 },
        { name: t('widget.onTime'), type: 'bar', yAxisIndex: 1, data: rows.map((r) => (r.on_time_known ? Number(r.on_time_pct.toFixed(1)) : null)), itemStyle: { color: cssVar('--color-sev-ok', '#37b978') }, barMaxWidth: 36 },
      ],
    }),
    [rows, t, theme],
  );

  /*
   * Nothing is in flight - the aggregation below is synchronous. What is missing is
   * the simulation snapshot itself, so the panel names it and names the fix.
   */
  if (!snap || !metrics) return <Empty title={t('mod.warmingTitle')} text={t('op.warmingText')} />;

  const total = rows.reduce((s, r) => s + r.revenue, 0);
  /* One column set, both ranking panels. They were byte-identical markup twice. */
  const revenueCols: Column<RevenueRow>[] = [
    { key: 'route', label: t('reg.route'), mono: true, sortable: true, sortValue: ([id]) => id, render: ([id]) => id },
    { key: 'operator', label: t('op.operator'), sortable: true, sortValue: ([, e]) => e.operator, render: ([, e]) => e.operator },
    { key: 'revenue', label: t('op.revenue'), num: true, sortable: true, sortValue: ([, e]) => e.revenue, render: ([, e]) => mntOr(e.revenue) },
  ];
  // Bottom-10 shown best-first, so [0] is the leading row of that table.
  const bottom = routeRevenue.slice(-10).reverse();

  return (
    <div className="flex h-full flex-col gap-2 overflow-auto">
      {role === 'bus_operator_occ' && (
        <Callout kind="info" className="shrink-0">
          {t('op.roleFiltered')}
        </Callout>
      )}

      <div className="grid shrink-0 grid-cols-2 gap-2 lg:grid-cols-4">
        <KpiTile labelKey="op.totalKm" value={compactOr(rows.reduce((s, r) => s + r.km, 0))} evidence="CONFIRMED" />
        <KpiTile labelKey="op.revenue" value={mntOr(total)} evidence="CONFIRMED" sub={`${t('evidence.ASSUMPTION')}: ${FARE_MNT} ₮ / boarding`} />
        <KpiTile labelKey="kpi.ridershipToday" value={compactOr(metrics.ridership_today)} evidence="CONFIRMED" />
        <KpiTile labelKey="op.interruptions" value={intOr(rows.reduce((s, r) => s + r.interruptions, 0))} tone="warn" evidence="CONFIRMED" />
      </div>

      {/* The fare is the one assumption on this page - say it once, loudly. */}
      <p className="t-meta flex shrink-0 flex-wrap items-start gap-2">
        <EvidenceTag label="ASSUMPTION" cite="R992" />
        {t('op.fareNote')}
      </p>

      {/* Operators side by side. The role filter (R2627-R2642 / L718) is what can make
          this list short - and, if a future role matches no operator at all, empty. The
          filter itself is unchanged; only the empty case now says which view you are in. */}
      {rows.length === 0 ? (
        <Empty title={t('op.noneTitle')} text={t('op.noneText')} />
      ) : null}
      <div className="grid shrink-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((r) => {
          // The deck's "Operator B revenue variance" beat: recorded revenue drifts below
          // the revenue boardings imply, because that operator's AFC devices are down.
          const drifting = Number.isFinite(r.variance_pct) && Math.abs(r.variance_pct) >= revenueAnomalyPct;
          return (
            <Panel
              key={r.id}
              title={`${t('op.operator')} ${r.id}`}
              right={
                <Tooltip content={t('kit.tip.variance')}>
                  <span tabIndex={0}>
                    {drifting ? (
                      <StatusPill tone="crit">{t('op.revenueVariance', { pct: Number.isFinite(r.variance_pct) ? r.variance_pct.toFixed(1) : EM_DASH })}</StatusPill>
                    ) : (
                      <StatusPill tone="ok">{t('legend.normal')}</StatusPill>
                    )}
                  </span>
                </Tooltip>
              }
            >
              <div className="grid grid-cols-2 gap-2 p-2">
                <Metric label={t('op.serviceKm')} value={`${compactOr(r.km)} km`} />
                <Metric
                  label={t('widget.onTime')}
                  value={r.on_time_known ? `${r.on_time_pct.toFixed(1)} %` : EM_DASH}
                  tone={r.on_time_known ? (r.on_time_pct < 80 ? 'warn' : 'ok') : undefined}
                  hint={r.on_time_known ? undefined : t('op.onTimeNoData')}
                />
                <Metric label={t('op.interruptions')} value={intOr(r.interruptions)} tone={r.interruptions ? 'warn' : 'ok'} />
                <Metric label={t('op.revenue')} value={mntOr(r.revenue)} />
                <Metric label={t('op.recorded')} value={compactOr(r.recorded_boardings)} />
                <Metric label={t('op.expected')} value={compactOr(r.boardings)} />
              </div>
              {drifting && (
                /* `.t-meta` sets its own colour, so the warn tone has to come from style. */
                <p className="t-meta border-t border-[var(--color-line)] p-2" style={{ color: 'var(--color-sev-warn)' }}>
                  {t('op.revenueVarianceNote', { n: r.afc_offline })}
                </p>
              )}
            </Panel>
          );
        })}
      </div>

      <div className="grid shrink-0 grid-cols-1 gap-2 lg:grid-cols-3">
        <Panel titleKey="op.kmVsOnTime" className="h-[280px] lg:col-span-2" right={<EvidenceTag label="CONFIRMED" cite="R931" />} bodyClassName="p-1">
          <EChart option={chartOption} />
        </Panel>

        <Panel titleKey="op.topRevenue" className="h-[280px]" right={<EvidenceTag label="CONFIRMED" cite="R1233–R1236" />}>
          <DataTable
            rows={routeRevenue.slice(0, 10)}
            rowKey={([id]) => id}
            columns={revenueCols}
            empty={{ title: t('op.revEmptyTitle'), text: t('op.revEmptyText') }}
          />
        </Panel>
      </div>

      {/* Secondary ranking: folded away by default, headline figure kept in the header. */}
      <Panel
        titleKey="op.bottomRevenue"
        className="shrink-0"
        bodyClassName="max-h-[240px]"
        collapsible
        defaultOpen={false}
        summary={bottom.length ? `${bottom.length} ${t('reg.route')} · ${t('op.operator')} ${bottom[0]![1].operator} ${mntOr(bottom[0]![1].revenue)}` : undefined}
        right={<EvidenceTag label="CONFIRMED" cite="R1233–R1236" />}
      >
        <DataTable
          rows={bottom}
          rowKey={([id]) => id}
          columns={revenueCols}
          empty={{ title: t('op.revEmptyTitle'), text: t('op.revEmptyText') }}
        />
      </Panel>

      {/* Note strip - all CONFIRMED context, no numbers invented. Quiet, not boxed:
          two more bordered cards competed with the panels above for no extra meaning. */}
      <div className="flex shrink-0 flex-col gap-1.5 px-1 pb-1">
        <p className="t-meta flex flex-wrap items-start gap-2">
          <EvidenceTag label="CONFIRMED" cite="R958 · R931" />
          {t('op.kmHourNote')}
        </p>
        <p className="t-meta flex flex-wrap items-start gap-2">
          <EvidenceTag label="CONFIRMED" cite="L718" />
          {t('op.kpiNote')}
        </p>
      </div>
    </div>
  );
}

function blank(id: OperatorId): OpRow {
  return {
    id,
    km: 0,
    on_time_pct: 0,
    on_time_known: false,
    interruptions: 0,
    boardings: 0,
    recorded_boardings: 0,
    afc_offline: 0,
    revenue: 0,
    expected_revenue: 0,
    variance_pct: 0,
  };
}

function Metric({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: string;
  tone?: 'ok' | 'warn';
  /** Why the value is an em dash. An unexplained dash is the defect, not the dash. */
  hint?: string;
}) {
  const color = tone === 'warn' ? 'var(--color-sev-warn)' : tone === 'ok' ? 'var(--color-sev-ok)' : 'var(--color-text1)';
  return (
    <div className="flex min-w-0 flex-col">
      <span className="t-label">{label}</span>
      <span className="t-card num" style={{ color }}>{value}</span>
      {hint ? <span className="t-meta break-words">{hint}</span> : null}
    </div>
  );
}
