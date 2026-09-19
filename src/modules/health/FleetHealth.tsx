/**
 * Fleet Health & Predictive Maintenance.
 *
 * This module is deliberately SPLIT down the middle, and the split is visible on
 * screen:
 *
 *   TOP (CONFIRMED)    - device status monitoring. "System health monitoring of AFC /
 *                        on-board device / cameras" (L1119-L1122, L1134-L1138) and
 *                        "repeated failures across specific buses or operators" as an
 *                        analytics target (L1124). Counts come straight from
 *                        DerivedMetrics.offline / offline_by_operator - S9 tiles.
 *
 *   BOTTOM (INFERRED)  - health score, component risk and cost per bus. The business
 *                        INTENT is sourced: the client asked for "an estimate on their
 *                        spend by the bus... maintenance type A, type B, brakes, tires,
 *                        clutches... then we can work through predictive analytics and
 *                        show them how much we can save". The DATA is not: the same
 *                        speaker said "I don't have the answer". And R1096 places
 *                        predictive functions OUTSIDE PTCC scope - PTCC would visualise
 *                        such outputs, not compute them.
 *
 * Therefore every figure below the divider lives inside a dashed "Proposed extension"
 * frame, carries health.simulated + an INFERRED tag, and the page states exactly which
 * inputs PTPD would have to supply. A simulated cost must never read as a real one.
 */

import { useMemo, useState } from 'react';
import { mulberry32 } from '../../sim/rng';
import type { OperatorId, Vehicle } from '../../sim/types';
import type { I18nKey } from '../../i18n/dict';
import { useT } from '../../i18n/t';
import { useSelection, useSim } from '../../store';
import { LOAD_BANDS, bandOf } from '../../rules/thresholds';
import { seedOf } from '../../rules/predict';
import Predictive from './Predictive';
import {
  Bar,
  Button,
  Callout,
  type Column,
  DataTable,
  Empty,
  EvidenceTag,
  KpiTile,
  Panel,
  StatusPill,
  Tooltip,
  fmtInt,
  fmtMnt,
} from '../../components/primitives';

// ---------------------------------------------------------------- simulated cost model
//
// EVERYTHING in this section is invented. It exists so the ROI argument can be shown
// at all; it is seeded off the vehicle id via mulberry32 so a given bus shows the same
// figure on every render and in every module (plan section 14.3 determinism), which
// stops the demo contradicting itself mid-presentation.

/** The six cost lines the client named verbatim (CV para 3). */
export const COST_LINES = [
  'cost.maintenance',
  'cost.fuel_gas',
  'cost.electricity',
  'cost.driver_salary',
  'cost.insurance',
  'cost.accidents',
] as const;
export type CostKey = (typeof COST_LINES)[number];

/** The five servicing/cost categories the client named verbatim (CV para 3).
 *  NOT telemetry signals - PTCC has no sensor for tyre or clutch wear. */
export const COMPONENTS = [
  'cmp.maintenance_type_a',
  'cmp.maintenance_type_b',
  'cmp.brakes',
  'cmp.tyres',
  'cmp.clutches',
] as const;
export type ComponentKey = (typeof COMPONENTS)[number];

export interface VehicleCostProfile {
  vehicle_id: string;
  /** Annual km per bus. No source holds this - see the "inputs required" list. */
  annual_km: number;
  lines: Record<CostKey, number>;
  components: { key: ComponentKey; annual_cost: number; next_service_km: number }[];
  annual_total: number;
  /** Seeded per-vehicle wear term 0-4, the second term of the health score. */
  wear: number;
}

/* `seedOf` used to live here. It now lives in rules/predict.ts and is imported, because
   the RUL model has to seed off the SAME hash or a bus would carry one wear story in the
   cost panel and a different one in the prediction panel - the exact self-contradiction
   the determinism rule exists to prevent (plan §14.3). */

const cache = new Map<string, VehicleCostProfile>();

/**
 * Simulated annual cost profile for one bus, in MNT. Stable across renders.
 * Ranges are plausible-looking placeholders, not benchmarks - there is no source.
 */
export function simulatedCostPerBus(vehicle_id: string): VehicleCostProfile {
  const hit = cache.get(vehicle_id);
  if (hit) return hit;
  const r = mulberry32(seedOf(vehicle_id));
  const annual_km = Math.round(r.range(45_000, 75_000));
  const maintenance = Math.round(r.range(6_000_000, 14_000_000));
  const lines: Record<CostKey, number> = {
    'cost.maintenance': maintenance,
    'cost.fuel_gas': Math.round(r.range(20_000_000, 34_000_000)),
    // CV lists "electricity" beside "gas", implying an electric/hybrid element. No
    // other source mentions one, so the line is present and ZEROED - nothing is
    // built on it.
    'cost.electricity': 0,
    'cost.driver_salary': Math.round(r.range(18_000_000, 26_000_000)),
    'cost.insurance': Math.round(r.range(1_200_000, 2_400_000)),
    'cost.accidents': Math.round(r.range(300_000, 3_000_000)),
  };
  // Split the maintenance line across the five client-named categories.
  const w = COMPONENTS.map(() => r.range(0.5, 1.5));
  const wsum = w.reduce((a, b) => a + b, 0);
  const components = COMPONENTS.map((key, i) => ({
    key,
    annual_cost: Math.round((maintenance * w[i]!) / wsum),
    next_service_km: Math.round(r.range(800, 20_000)),
  }));
  const annual_total = Object.values(lines).reduce((a, b) => a + b, 0);
  const profile: VehicleCostProfile = {
    vehicle_id,
    annual_km,
    lines,
    components,
    annual_total,
    wear: r.range(0, 4),
  };
  cache.set(vehicle_id, profile);
  return profile;
}

/** Derived spend per km, MNT. The one figure CV asks for - and cannot yet be answered. */
export function spendPerKm(p: VehicleCostProfile): number {
  return p.annual_total / Math.max(1, p.annual_km);
}

/**
 * Health score, INVENTED for the demo. The formula is printed on screen beside the
 * numbers precisely so nobody mistakes it for a model: PTCC receives device status and
 * telematics alerts, never a score.
 */
export function healthScore(v: Vehicle): number {
  const offline =
    (v.equipment.afc === 'offline' ? 1 : 0) +
    (v.equipment.cctv === 'offline' ? 1 : 0) +
    (v.equipment.tbox === 'offline' ? 1 : 0);
  return Math.max(0, Math.min(100, 100 - 15 * offline - 10 * simulatedCostPerBus(v.vehicle_id).wear));
}

export interface RiskBand {
  key: I18nKey;
  actKey: I18nKey;
  color: string;
}

/** Plan section 9.5. Bands and action text are invented. */
export function riskBandOf(score: number): RiskBand {
  if (score >= 80) return { key: 'health.risk.low', actKey: 'health.act.low', color: 'var(--color-sev-ok)' };
  if (score >= 60) return { key: 'health.risk.elevated', actKey: 'health.act.elevated', color: 'var(--color-sev-warn)' };
  // Tokens only - the value lands in a DOM `style` so a CSS variable resolves fine.
  if (score >= 40) return { key: 'health.risk.high', actKey: 'health.act.high', color: 'var(--color-ev-high)' };
  return { key: 'health.risk.critical', actKey: 'health.act.critical', color: 'var(--color-sev-crit)' };
}

// ---------------------------------------------------------------- small bits

/**
 * `fmtInt` and `fmtMnt` (components/primitives) render the literal "NaN" / "NaN ₮" for a
 * non-finite input, and `t(key, params)` interpolates a nullish param as "undefined".
 * Every figure below — including anything handed to `t()` as a parameter — goes through
 * one of these, so an absent or degenerate number reads as an em dash and not as a word.
 */
export const DASH = '—';
export const int = (n: number) => (Number.isFinite(n) ? fmtInt(n) : DASH);
export const mny = (n: number) => (Number.isFinite(n) ? fmtMnt(n) : DASH);

function Simulated() {
  const t = useT();
  return (
    <Tooltip content={t('kit.tip.simulated')}>
      {/* Honesty label - t-meta would force text3 onto it, so the warn colour is inline. */}
      <span
        tabIndex={0}
        className="t-label rounded bg-[var(--color-bg3)] px-1"
        style={{ color: 'var(--color-sev-warn)' }}
      >
        {t('health.simulated')}
      </span>
    </Tooltip>
  );
}

// ---------------------------------------------------------------- module

export default function FleetHealth() {
  const t = useT();
  const snap = useSim((s) => s.snap);
  const metrics = useSim((s) => s.metrics);
  const selected = useSelection((s) => s.vehicle_id);
  const selectVehicle = useSelection((s) => s.selectVehicle);
  const [tab, setTab] = useState<'afc' | 'tbox' | 'cctv'>('afc');

  const vehicles = snap?.vehicles ?? [];

  /** Boardings per route - the passenger-exposure half of the queue ordering (S8). */
  const boardingsByRoute = useMemo(() => {
    const m = new Map<string, number>();
    for (const v of vehicles) m.set(v.route_id, (m.get(v.route_id) ?? 0) + v.boardings_today);
    return m;
  }, [vehicles]);

  const offlineLists = useMemo(() => {
    const afc: Vehicle[] = [];
    const tbox: Vehicle[] = [];
    const cctv: Vehicle[] = [];
    for (const v of vehicles) {
      if (v.equipment.afc === 'offline') afc.push(v);
      if (v.equipment.tbox === 'offline') tbox.push(v);
      if (v.equipment.cctv === 'offline') cctv.push(v);
    }
    return { afc, tbox, cctv };
  }, [vehicles]);

  /**
   * Priority queue = risk band x passenger exposure. The exposure factor reuses the
   * deck's own logic that a deviation matters more when passenger impact is high (S8);
   * the risk factor is invented. Both are labelled as such on screen.
   */
  const queue = useMemo(() => {
    if (!metrics) return [];
    return vehicles
      .map((v) => {
        const score = healthScore(v);
        const rm = metrics.per_route.get(v.route_id);
        const bandIdx = LOAD_BANDS.length - LOAD_BANDS.indexOf(bandOf(rm?.load_pct ?? 0)); // 5 = >90 %
        const exposure = bandIdx * (boardingsByRoute.get(v.route_id) ?? 0);
        return { v, score, exposure, priority: (100 - score) * exposure };
      })
      .filter((x) => x.score < 80)
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 15);
  }, [vehicles, metrics, boardingsByRoute]);

  const focus = useMemo(() => {
    const byId = vehicles.find((v) => v.vehicle_id === selected);
    return byId ?? queue[0]?.v ?? vehicles[0];
  }, [vehicles, selected, queue]);

  /* Not a loading state: nothing on this page is asynchronous. What is missing is the
     fleet snapshot the whole page is computed from, so the copy says so and says what
     brings it back. */
  if (!snap || !metrics) return <Empty title={t('health.emptyTitle')} text={t('health.emptyText')} />;

  const list = offlineLists[tab];
  const offlineCols: Column<Vehicle>[] = [
    { key: 'vehicle_id', label: t('health.bus'), mono: true, sortable: true },
    { key: 'route_id', label: t('reg.route'), mono: true, sortable: true },
    { key: 'operator_id', label: t('op.operator'), sortable: true },
    {
      key: 'status',
      label: t('reg.status'),
      render: () => <StatusPill tone="warn">{tab.toUpperCase()} offline</StatusPill>,
    },
  ];
  const profile = focus ? simulatedCostPerBus(focus.vehicle_id) : null;
  const score = focus ? healthScore(focus) : 0;
  const band = riskBandOf(score);

  // L1124 threshold: "repeated failures across specific buses or operators" - >= 3.
  const repeatOps = (['A', 'B', 'C'] as OperatorId[]).filter((op) => metrics.offline_by_operator[op] >= 3);

  /* Collapsed-panel summaries: the headline figure the operator would otherwise have to
     re-expand the panel to see. Numbers + existing i18n keys only. */
  const componentTotal = profile?.components.reduce((a, c) => a + c.annual_cost, 0) ?? 0;
  const repeatSummary = repeatOps.length ? `${t('op.operator')} ${repeatOps.join(', ')}` : t('health.noOffline');
  const componentSummary = `${t('health.annualCost')} ${mny(componentTotal)}`;
  const costSummary = profile ? `${t('roi.spendPerKm')} ${mny(spendPerKm(profile))}` : DASH;
  const top = queue[0];
  const querySummary = top ? `${queue.length} · ${top.v.vehicle_id} ${Math.round(top.score)}` : t('health.noOffline');

  return (
    <div className="flex h-full flex-col gap-2 overflow-auto">
      {/* ------------------------------------------------ CONFIRMED half */}
      <div className="grid shrink-0 grid-cols-2 gap-2 lg:grid-cols-4">
        <KpiTile labelKey="widget.afcOffline" value={int(metrics.offline.afc)} tone={metrics.offline.afc ? 'warn' : 'ok'} evidence="CONFIRMED" />
        <KpiTile labelKey="widget.tboxOffline" value={int(metrics.offline.tbox)} tone={metrics.offline.tbox ? 'warn' : 'ok'} evidence="CONFIRMED" />
        <KpiTile labelKey="widget.cctvOffline" value={int(metrics.offline.cctv)} tone={metrics.offline.cctv ? 'warn' : 'ok'} evidence="CONFIRMED" />
        <KpiTile labelKey="widget.network" value={Number.isFinite(metrics.network_uptime_pct) ? `${metrics.network_uptime_pct.toFixed(0)} %` : DASH} tone="ok" evidence="CONFIRMED" sub={t('widget.systemHealth')} />
      </div>

      <div className="grid shrink-0 grid-cols-1 gap-2 lg:grid-cols-3">
        <Panel
          className="max-h-[280px] min-w-0 lg:col-span-2"
          titleKey="health.confirmedSection"
          right={
            // One button style, wrapping instead of overflowing at narrow widths.
            <div className="flex min-w-0 flex-wrap items-center justify-end gap-1.5">
              {(['afc', 'tbox', 'cctv'] as const).map((k) => (
                <Button key={k} size="sm" variant={tab === k ? 'primary' : 'ghost'} onClick={() => setTab(k)}>
                  {k.toUpperCase()} {offlineLists[k].length}
                </Button>
              ))}
              <EvidenceTag label="CONFIRMED" cite="L1119–L1122" />
            </div>
          }
        >
          <DataTable
            rows={list}
            rowKey={(v) => v.vehicle_id}
            pageSize={8}
            onRowClick={(v) => selectVehicle(v.vehicle_id)}
            rowClass={(v) => (v.vehicle_id === selected ? 'bg-[var(--color-bg3)]' : '')}
            /* Good news, not absence: an empty offline list is the fleet working. The
               DataTable empty row has no `tone`, so the reassurance has to be carried by
               the words. See the defect note in the report. */
            empty={{ title: t('health.noOffline'), text: t('health.devicesOkText') }}
            columns={offlineCols}
          />
        </Panel>

        {/* L1124 names "repeated failures across specific buses or operators" as a
            monitoring target - this card IS in the source; only the data is simulated. */}
        <Panel
          titleKey="alerts.type.equipment_failure"
          className="max-h-[280px] min-w-0"
          collapsible
          defaultOpen={false}
          summary={repeatSummary}
          right={<EvidenceTag label="CONFIRMED" cite="L1124" />}
        >
          <div className="flex flex-col p-2" style={{ gap: 'var(--sp-2)' }}>
            {repeatOps.map((op) => (
              <Callout key={op} kind="warn" title={t('health.repeated', { op })}>
                <span className="num t-metric block text-[var(--color-text1)]">{metrics.offline_by_operator[op]}</span>
                <span className="t-meta">{t('alerts.type.equipment_failure')} · ≥ 3</span>
              </Callout>
            ))}
            {repeatOps.length === 0 && (
              <Empty tone="ok" title={t('health.noOffline')} text={t('health.noRepeatText')} />
            )}
          </div>
        </Panel>
      </div>

      {/* ------------------------------------------------ INFERRED half: proposed extension */}
      <section className="shrink-0">
        {/* Source/provenance text - kept verbatim, rendered quietly. */}
        <Callout kind="info" dashed icon={<EvidenceTag label="INFERRED" cite="CV ¶3 · R1096" />} className="mb-2">
          {t('health.proposed')}
        </Callout>

        <div className="grid grid-cols-1 gap-2 lg:grid-cols-2 xl:grid-cols-3">
          {/* health score - the one open card of this section */}
          <Panel titleKey="health.score" className="min-w-0" right={<Simulated />}>
            {/* With no bus in focus the score is 0, and 0 bands as CRITICAL. A red
                "critical" reading for a bus that does not exist is the worst kind of
                wrong number on a demo screen, so the panel says it has no subject. */}
            {!focus ? (
              <Empty title={t('health.noBusTitle')} text={t('health.noBusText')} />
            ) : (
              <div className="flex flex-col gap-2 p-2">
                <div className="flex items-end gap-3">
                  <span className="num t-metric" style={{ color: band.color }}>
                    {int(score)}
                  </span>
                  <div className="flex min-w-0 flex-col gap-1">
                    <StatusPill tone="neutral">{focus.vehicle_id}</StatusPill>
                    <span className="t-card truncate" style={{ color: band.color }}>{t(band.key)}</span>
                  </div>
                </div>
                <Bar pct={Number.isFinite(score) ? score : 0} color={band.color} height={8} />
                <p className="t-meta">{t(band.actKey)}</p>
                {/* The formula is on screen ON PURPOSE - see the module header. */}
                <Tooltip content={t('kit.tip.healthScore')}>
                  <p tabIndex={0} className="t-meta rounded bg-[var(--color-bg2)] p-2 font-mono">{t('health.formula')}</p>
                </Tooltip>
              </div>
            )}
          </Panel>

          {/* components */}
          <Panel
            titleKey="health.components"
            className="min-w-0"
            collapsible
            defaultOpen={false}
            summary={componentSummary}
            right={<Simulated />}
          >
            <DataTable
              rows={profile?.components ?? []}
              rowKey={(c) => c.key}
              sortKey="annual_cost"
              sortDir="desc"
              empty={{ title: t('health.noBusTitle'), text: t('health.noBusText') }}
              columns={[
                { key: 'key', label: t('pax.band'), render: (c) => t(c.key) },
                { key: 'annual_cost', label: t('health.annualCost'), num: true, sortable: true, render: (c) => mny(c.annual_cost) },
                {
                  key: 'next_service_km',
                  label: t('health.nextService'),
                  num: true,
                  sortable: true,
                  render: (c) => <span className="text-[var(--color-text3)]">{int(c.next_service_km)} km</span>,
                },
              ]}
            />
            {/* provenance footnote - stays, quietly */}
            <p className="t-meta p-2">{t('health.componentNote')}</p>
          </Panel>

          {/* cost lines + spend per km */}
          <Panel
            titleKey="health.costPerBus"
            className="min-w-0"
            collapsible
            defaultOpen={false}
            summary={costSummary}
            right={<Simulated />}
          >
            <DataTable
              rows={profile ? [...COST_LINES] : []}
              rowKey={(k) => k}
              empty={{ title: t('health.noBusTitle'), text: t('health.noBusText') }}
              columns={[
                { key: 'line', label: t('health.costPerBus'), render: (k) => t(k) },
                {
                  key: 'amount',
                  label: t('health.annualCost'),
                  num: true,
                  sortable: true,
                  sortValue: (k) => profile?.lines[k] ?? 0,
                  render: (k) => mny(profile!.lines[k]),
                },
              ]}
              /* The derived figure the client actually asked for. In the tfoot so no
                 sort and no pager can move it away from the lines it sums. */
              foot={
                profile ? (
                  <tr className="border-t border-[var(--color-line)] bg-[var(--color-bg2)]">
                    <td className="px-2 py-1 font-semibold">{t('roi.spendPerKm')}</td>
                    <td className="num px-2 py-1 text-right font-semibold text-[var(--color-accent)]">
                      {mny(spendPerKm(profile))}
                    </td>
                  </tr>
                ) : null
              }
            />
            {profile && (
              <p className="t-meta px-2 py-1">
                {t('health.annualKm')}: <span className="num">{int(profile.annual_km)}</span> km
              </p>
            )}
            {/* provenance footnote - stays, quietly */}
            <p className="t-meta p-2">{t('health.electricityNote')}</p>
          </Panel>
        </div>

        <div className="mt-2 grid grid-cols-1 gap-2 lg:grid-cols-2 xl:grid-cols-3">
          {/* priority queue */}
          <Panel
            className="max-h-[300px] min-w-0 lg:col-span-2"
            titleKey="health.priorityQueue"
            collapsible
            defaultOpen={false}
            summary={querySummary}
            right={<Simulated />}
          >
            <DataTable
              rows={queue}
              rowKey={(q) => q.v.vehicle_id}
              pageSize={8}
              sortKey="priority"
              sortDir="desc"
              onRowClick={(q) => selectVehicle(q.v.vehicle_id)}
              rowClass={(q) => (q.v.vehicle_id === selected ? 'bg-[var(--color-bg3)]' : '')}
              empty={{ title: t('health.queueEmpty'), text: t('health.queueEmptyText') }}
              columns={[
                { key: 'bus', label: t('health.bus'), mono: true, sortable: true, sortValue: (q) => q.v.vehicle_id, render: (q) => q.v.vehicle_id },
                { key: 'route', label: t('reg.route'), mono: true, sortable: true, sortValue: (q) => q.v.route_id, render: (q) => q.v.route_id },
                {
                  key: 'priority',
                  label: t('health.score'),
                  num: true,
                  sortable: true,
                  sortValue: (q) => 100 - q.score,
                  // Severity colour on the score only; the band word rides neutral.
                  render: (q) => <span style={{ color: riskBandOf(q.score).color }}>{Math.round(q.score)}</span>,
                },
                { key: 'band', label: t('pax.band'), sortable: true, sortValue: (q) => q.score, render: (q) => <span className="text-[var(--color-text2)]">{t(riskBandOf(q.score).key)}</span> },
                {
                  key: 'exposure',
                  label: (
                    <Tooltip content={t('kit.tip.exposure')}>
                      <span tabIndex={0}>{t('health.exposure')}</span>
                    </Tooltip>
                  ),
                  num: true,
                  sortable: true,
                  sortValue: (q) => q.exposure,
                  render: (q) => <span className="text-[var(--color-text3)]">{int(q.exposure)}</span>,
                },
              ]}
            />
            {/* provenance footnote - stays, quietly */}
            <p className="t-meta p-2">{t('health.priorityNote')}</p>
          </Panel>

          {/* the ask */}
          <Panel
            titleKey="health.inputsRequired"
            className="max-h-[300px] min-w-0"
            collapsible
            defaultOpen={false}
            summary="8"
            right={<EvidenceTag label="INFERRED" cite="CV ¶3" />}
          >
            <ol className="t-body list-decimal p-2 pl-6 text-[var(--color-text2)]">
              <li>{t('health.input1')}</li>
              <li>{t('health.input2')}</li>
              <li>{t('health.input3')}</li>
              <li>{t('health.input4')}</li>
              <li>{t('health.input5')}</li>
              <li>{t('health.input6')}</li>
              <li>{t('health.input7')}</li>
              <li>{t('health.input8')}</li>
            </ol>
          </Panel>
        </div>
      </section>

      {/* ---------------------------------------------- component prediction (§9.2 A) */}
      <Predictive vehicles={vehicles} routes={snap.routes} />
    </div>
  );
}
