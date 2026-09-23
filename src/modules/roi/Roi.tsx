/**
 * Cost & ROI Intelligence — the ROI ENGINE, not an ROI answer.
 *
 * The client asked for this in terms (CV ¶3): "we should also get an estimate on their
 * spend per bus — for the maintenance, or gas, electricity, driver's salary, insurance,
 * accidents… so that we know what their actual spend is… and then we can work through
 * predicting and show them how much we can save. That's the ROI kind of thing."
 *
 * And, in the same breath: "I don't have the answer."
 *
 * So plan §21 forbids the obvious deliverable. What is built instead is a live model:
 * every input is on screen, every output recomputes as it is typed, and every cost
 * figure is graded ASSUMPTION — never INFERRED, which would claim the figure follows
 * necessarily from a client source. It does not. Nothing does, yet. That is the finding.
 *
 * Two things this screen previously got wrong, both fixed here:
 *   - the four cost tiles were tagged INFERRED while the provenance page said (correctly)
 *     that every cost figure on this screen is an assumption;
 *   - `fmtCompact` — built for "17.3k" boardings — was applied to tens of billions and
 *     rendered "68489876k ₮". See `mnt()` in engine.ts.
 *
 * The fleet-sizing tab below is unchanged in substance: it is a separate ASSUMPTION
 * (no source mentions fleet procurement at all) and keeps its own refusal banner.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { EChart, AXIS, CHART_BASE } from '../../charts/EChart';
import {
  Button,
  Callout,
  DataTable,
  Empty,
  EvidenceTag,
  KpiTile,
  NumberInput,
  Panel,
  PanelLink,
  Range,
  Select,
  StatusPill,
  Tooltip,
  fmtInt,
  fmtMnt,
} from '../../components/primitives';
import type { I18nKey } from '../../i18n/dict';
import { useT } from '../../i18n/t';
import { fleetForecast } from '../../rules/predict';
import type { OperatorId } from '../../sim/types';
import { engine as simEngine, useSettings, useSim, world } from '../../store';
import { simulatedCostPerBus } from '../health/FleetHealth';
import {
  FALLBACK_INPUTS,
  SCENARIOS,
  compute,
  fmtPct,
  fmtT,
  mnt,
  num,
  scaleTo,
  type RoiInputKey,
  type RoiInputs,
  type ScenarioName,
} from './engine';

/**
 * `fmtInt` and `fmtMnt` (components/primitives) print the literal "NaN" / "NaN ₮" for a
 * non-finite input, and `t(key, params)` interpolates a nullish param as the literal
 * "undefined". Neither may reach a client's screen, so every numeric render on this page
 * — including every number handed to `t()` as a parameter — goes through these two.
 */
const int = (n: number) => num(n, fmtInt);
const mny = (n: number) => num(n, fmtMnt);

/** Canvas cannot resolve `var(--x)`, so series colours read the live value instead. */
const cssVar = (n: string, f: string) =>
  typeof document === 'undefined' ? f : getComputedStyle(document.documentElement).getPropertyValue(n).trim() || f;

const OPERATORS: OperatorId[] = ['A', 'B', 'C'];
const VIEWS = ['authority', 'operator', 'perBus', 'fleet'] as const;
type View = (typeof VIEWS)[number];
const VIEW_LABEL: Record<View, I18nKey> = {
  authority: 'roi.viewAuthority',
  operator: 'roi.viewOperator',
  perBus: 'roi.viewPerBus',
  fleet: 'roi.tabFleet',
};

/** The eight things PTPD must supply before any of this can leave ASSUMPTION. */
const PTPD_INPUTS: I18nKey[] = [
  'health.input1', 'health.input2', 'health.input3', 'health.input4',
  'health.input5', 'health.input6', 'health.input7', 'health.input8',
];

/** Input specs live here rather than in JSX so no figure is written as a literal. */
interface Spec { k: RoiInputKey; label: I18nKey; step: number; max: number; unit?: string }
const MNT = '₮';
const FLEET_FIELDS: Spec[] = [
  { k: 'fleetSize', label: 'roi.inFleet', step: 10, max: 5_000 },
  { k: 'annualKmPerBus', label: 'roi.inKm', step: 5_000, max: 200_000, unit: 'km' },
  { k: 'platformCostPerBusYear', label: 'roi.inPlatform', step: 50_000, max: 10_000_000, unit: MNT },
];
const SPEND_FIELDS: Spec[] = [
  { k: 'maintenancePerBusYear', label: 'roi.inMaint', step: 500_000, max: 60_000_000, unit: MNT },
  { k: 'consumablesPerBusYear', label: 'roi.inConsumables', step: 250_000, max: 40_000_000, unit: MNT },
  { k: 'energyPerKm', label: 'roi.inEnergy', step: 25, max: 5_000, unit: MNT },
  { k: 'driverSalaryPerBusYear', label: 'roi.inDriver', step: 1_000_000, max: 90_000_000, unit: MNT },
  { k: 'insurancePerBusYear', label: 'roi.inInsurance', step: 100_000, max: 20_000_000, unit: MNT },
  { k: 'accidentCostPerBusYear', label: 'roi.inAccident', step: 100_000, max: 20_000_000, unit: MNT },
];
const RELIABILITY_FIELDS: Spec[] = [
  { k: 'breakdownsPer100BusesYear', label: 'roi.inBreakdowns', step: 5, max: 400 },
  { k: 'downtimeDaysPerFailure', label: 'roi.inDowntimeDays', step: 0.5, max: 30 },
  { k: 'downtimeValuePerDay', label: 'roi.inDowntimeValue', step: 100_000, max: 20_000_000, unit: MNT },
];
const LEVER_FIELDS: Spec[] = [
  { k: 'preventedFailuresPct', label: 'roi.inPrevented', step: 1, max: 80 },
  { k: 'plannedMaintReductionPct', label: 'roi.inPlannedMaint', step: 1, max: 40 },
  { k: 'energyReductionPct', label: 'roi.inEnergyRed', step: 1, max: 25 },
  { k: 'accidentReductionPct', label: 'roi.inAccidentRed', step: 1, max: 40 },
];

/**
 * Starting values, taken from the demo's ONE simulated cost model (FleetHealth) so a bus
 * does not cost two different amounts on two pages. That model is itself a placeholder
 * with no source — which is the point: these are defaults to argue with, not findings.
 * The reliability and lever defaults have no counterpart anywhere and come from
 * FALLBACK_INPUTS.
 */
function defaultsFromFleet(ids: string[]): RoiInputs {
  if (ids.length === 0) return FALLBACK_INPUTS;
  let maint = 0, cons = 0, energy = 0, driver = 0, ins = 0, acc = 0, km = 0;
  for (const id of ids) {
    const p = simulatedCostPerBus(id);
    const c = p.components
      .filter((x) => x.key === 'cmp.brakes' || x.key === 'cmp.tyres' || x.key === 'cmp.clutches')
      .reduce((a, b) => a + b.annual_cost, 0);
    cons += c;
    maint += Math.max(0, p.lines['cost.maintenance'] - c);
    energy += p.lines['cost.fuel_gas'] + p.lines['cost.electricity'];
    driver += p.lines['cost.driver_salary'];
    ins += p.lines['cost.insurance'];
    acc += p.lines['cost.accidents'];
    km += p.annual_km;
  }
  const n = ids.length;
  return {
    ...FALLBACK_INPUTS,
    fleetSize: n,
    annualKmPerBus: Math.round(km / n),
    maintenancePerBusYear: Math.round(maint / n),
    consumablesPerBusYear: Math.round(cons / n),
    energyPerKm: Math.round(energy / Math.max(1, km)),
    driverSalaryPerBusYear: Math.round(driver / n),
    insurancePerBusYear: Math.round(ins / n),
    accidentCostPerBusYear: Math.round(acc / n),
  };
}

export default function Roi() {
  const t = useT();
  const snap = useSim((s) => s.snap);
  const metrics = useSim((s) => s.metrics);
  const theme = useSettings((s) => s.theme);
  const th = useSettings((s) => s.th);
  const wall = useSettings((s) => s.mode) === 'wall';
  const [view, setView] = useState<View>('authority');
  const [peakKmh, setPeakKmh] = useState(() => simEngine.speeds.centralPeak);

  const vehicles = snap?.vehicles ?? [];
  const ids = useMemo(() => vehicles.map((v) => v.vehicle_id), [vehicles]);

  // Computed once, from whatever fleet was loaded on first paint. Re-deriving on every
  // tick would silently overwrite whatever the presenter had just typed.
  const [defaults, setDefaults] = useState<RoiInputs>(() => defaultsFromFleet(ids));
  const [inputs, setInputs] = useState<RoiInputs>(defaults);
  const [scenario, setScenario] = useState<ScenarioName>('base');
  const [failureSrc, setFailureSrc] = useState<'predicted' | 'assumed'>('predicted');

  /*
   * A cold load paints before the first tick, so `defaultsFromFleet([])` returns the
   * generic 500-bus fallback and the screen would keep arguing about a fleet that is not
   * the one on the map. Seeded ONCE, on the transition from no fleet to a fleet, and only
   * while the presenter has not typed anything — `scenario === 'custom'` is already the
   * app's record of "an input was touched", so nothing typed is ever overwritten.
   */
  const seeded = useRef(ids.length > 0);
  useEffect(() => {
    if (seeded.current || ids.length === 0) return;
    seeded.current = true;
    const d = defaultsFromFleet(ids);
    setDefaults(d);
    setInputs((prev) => (scenario === 'custom' ? prev : d));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids]);

  /**
   * The one coupling to Workstream P. `fleetForecast()` (src/rules/predict.ts) is the
   * fleet-level aggregate of predicted interventions; summing `annualised` across
   * components gives the interventions an annual budget would carry, which is exactly
   * the failure count `compute()` wants. The presenter can switch back to the
   * breakdown-rate assumption, because a forecast is still a model and saying so out
   * loud is cheaper than being caught.
   *
   * Sampled on the fleet ROSTER, not on every tick: a figure that drifts while the
   * presenter is mid-sentence is not a feature.
   */
  const forecast = useMemo(
    () => (ids.length > 0 ? fleetForecast(vehicles, world.routeById, th) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ids, th],
  );
  const predBand = forecast
    ? forecast.perComponent.reduce(
        (a, c) => ({
          lo: a.lo + (c.dueLo * 365) / forecast.horizonDays,
          hi: a.hi + (c.dueHi * 365) / forecast.horizonDays,
        }),
        { lo: 0, hi: 0 },
      )
    : null;
  const predictedFailures =
    failureSrc === 'predicted' && forecast
      ? forecast.perComponent.reduce((a, c) => a + c.annualised, 0)
      : undefined;

  /**
   * Degenerate input guard at the keyboard, not at the maths. An empty field yields
   * `Number('') === 0`; a typed minus sign, a paste, or twenty digits yield a negative,
   * a NaN or an overflow. `<input type="number" min max>` does not clamp any of them —
   * it only styles the field. So the value is clamped to the field's own declared range
   * before it enters state, and `compute()` sanitises again for any other caller.
   */
  const set = (k: RoiInputKey, v: number, max?: number) => {
    const clean = Number.isFinite(v) ? Math.min(Math.max(0, v), max ?? Number.MAX_SAFE_INTEGER) : 0;
    setInputs((p) => ({ ...p, [k]: clean }));
    // A moved slider is never a preset. This is the whole honesty contract of the presets.
    setScenario('custom');
  };
  const applyScenario = (name: ScenarioName) => {
    setScenario(name);
    if (name !== 'custom') setInputs((p) => ({ ...p, ...SCENARIOS[name] }));
  };

  const out = useMemo(() => compute(inputs, predictedFailures), [inputs, predictedFailures]);
  const perBus = useMemo(() => scaleTo(inputs, 1, predictedFailures), [inputs, predictedFailures]);

  /** Bus counts per operator are REAL — they come off the live simulated fleet. */
  const opBuses = useMemo(() => {
    const m: Record<OperatorId, number> = { A: 0, B: 0, C: 0 };
    for (const v of vehicles) m[v.operator_id]++;
    return m;
  }, [vehicles]);

  const sizing = useMemo(() => {
    if (!metrics) return { required: 0, current: 0, rows: [] as { route_id: string; need: number; have: number }[] };
    const rows: { route_id: string; need: number; have: number }[] = [];
    let required = 0;
    let current = 0;
    for (const rm of metrics.per_route.values()) {
      if (rm.vehicles === 0) continue;
      const route = world.routeById.get(rm.route_id);
      if (!route) continue;
      const cycle_s = ((2 * route.length_m) / 1000 / Math.max(1, peakKmh)) * 3600;
      const need = Math.ceil(cycle_s / Math.max(60, rm.planned_headway_s));
      required += need;
      current += rm.vehicles;
      rows.push({ route_id: rm.route_id, need, have: rm.vehicles });
    }
    rows.sort((a, b) => b.need - b.have - (a.need - a.have));
    return { required, current, rows };
  }, [metrics, peakKmh]);

  const termChart = useMemo(
    () => ({
      ...CHART_BASE,
      grid: { ...CHART_BASE.grid, left: 8, right: 18, top: 8, bottom: 8 },
      tooltip: {
        ...CHART_BASE.tooltip,
        trigger: 'item' as const,
        formatter: (p: { dataIndex: number; value: number }) => {
          const row = out.terms[p.dataIndex];
          return `<b>${row ? t(row.key as I18nKey) : '—'}</b><br/>${t('chart.series.annualCost')}: ${fmtT(Number(p.value), (k) => t(k))} MNT / ${t('uxreg.year')}`;
        },
      },
      // The whole reason this module has its own formatter: a raw 2,500,000,000 tick is
      // not a number anybody reads off a wall.
      xAxis: {
        ...AXIS,
        type: 'value',
        name: t('chart.axis.annualCost'),
        nameLocation: 'middle',
        nameGap: 26,
        axisLabel: { ...AXIS.axisLabel, formatter: (v: number) => fmtT(v, (k) => t(k)) },
      },
      yAxis: { ...AXIS, type: 'category', inverse: true, data: out.terms.map((x) => t(x.key as I18nKey)), name: t('chart.axis.costDriver'), nameLocation: 'end', nameGap: 7 },
      series: [
        {
          id: 'annual-value-driver',
          name: t('chart.series.annualCost'),
          type: 'bar',
          data: out.terms.map((x) => Math.round(x.annual)),
          itemStyle: { color: cssVar('--color-accent', '#4d8df0') },
          barMaxWidth: 16,
        },
      ],
    }),
    // `theme` is not read here — it is the trigger that makes cssVar() re-read on a switch.
    [out, t, theme],
  );

  /* Not a loading spinner: the model is synchronous arithmetic and computes in under a
     millisecond. What is missing here is the simulated fleet the defaults are read from,
     so the honest copy says what will appear and what produces it. */
  if (!snap || !metrics) return <Empty title={t('roi.emptyTitle')} text={t('roi.emptyText')} />;

  const unit = (k: 'roi.unitBn' | 'roi.unitMn' | 'roi.unitNone') => t(k);
  const money = (n: number) => fmtT(n, unit);
  const tile = (n: number) => {
    const m = mnt(n);
    return { value: m.value, unit: `${t(m.unitKey)} ${MNT}`.trim() };
  };
  const assumption = <EvidenceTag label="ASSUMPTION" cite={t('roi.citeNoData')} />;
  const payback =
    out.paybackMonths === null ? t('roi.never') : out.paybackMonths.toFixed(out.paybackMonths >= 10 ? 0 : 1);
  const largestTerm = [...out.terms].sort((a, b) => b.annual - a.annual)[0];

  const numField = (f: Spec, pctLever = false) =>
    pctLever ? (
      <Range
        key={f.k}
        label={t(f.label)}
        min={0}
        max={f.max}
        step={f.step}
        value={inputs[f.k]}
        onChange={(v) => set(f.k, v, f.max)}
        format={(v) => `${v} %`}
      />
    ) : (
      <NumberInput
        key={f.k}
        label={t(f.label)}
        value={inputs[f.k]}
        min={0}
        max={f.max}
        step={f.step}
        unit={f.unit}
        onChange={(v) => set(f.k, v, f.max)}
      />
    );

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-hidden">
      {/* §21, said out loud, before anything else on the page. */}
      <Callout kind="warn" dashed className="shrink-0" icon={assumption}>
        {t('roi.scenarioNotice')}
      </Callout>
      <p className="t-body shrink-0 border-l-2 border-[var(--color-accent)] pl-2 text-[var(--color-text1)]" data-roi-insight>
        {largestTerm
          ? t('uxreg.roiInsight', { driver: t(largestTerm.key as I18nKey), annual: money(largestTerm.annual), net: money(out.net), payback })
          : t('uxreg.roiInsightEmpty')}
      </p>

      <div className="flex min-h-0 flex-1 gap-2">
        {/* ------------------------------------------------ the persistent input column */}
        <Panel
          titleKey="roi.assumptions"
          sub={t('roi.assumptionsSub')}
          className="w-[300px] shrink-0"
          // The cited form does not fit a 300 px header; it crowds the title out. The
          // citation is on the banner above, which is where it has to be read anyway.
          right={<EvidenceTag label="ASSUMPTION" />}
        >
          <div className="flex flex-col gap-3 p-3">
            <Select<ScenarioName>
              label={t('roi.scenario')}
              value={scenario}
              onChange={applyScenario}
              hint={t('roi.scenarioHint')}
              options={[
                { value: 'conservative', label: t('roi.scConservative') },
                { value: 'base', label: t('roi.scBase') },
                { value: 'optimistic', label: t('roi.scOptimistic') },
                { value: 'custom', label: t('roi.scCustom') },
              ]}
            />
            <Button onClick={() => { setInputs(defaults); setScenario('base'); }} size="sm">
              {t('roi.reset')}
            </Button>

            <Group title={t('roi.groupFleet')}>{FLEET_FIELDS.map((f) => numField(f))}</Group>
            <Group title={t('roi.groupSpend')}>{SPEND_FIELDS.map((f) => numField(f))}</Group>
            <Group title={t('roi.groupReliability')}>
              <Select<'predicted' | 'assumed'>
                label={t('roi.failureSource')}
                value={failureSrc}
                onChange={setFailureSrc}
                options={[
                  { value: 'predicted', label: t('roi.srcPredicted') },
                  { value: 'assumed', label: t('roi.srcAssumed') },
                ]}
              />
              {RELIABILITY_FIELDS.map((f) => numField(f))}
              <p className="t-meta">{t(out.failuresFromPrediction ? 'roi.predictionLive' : 'roi.predictionInput')}</p>
            </Group>
            <Group title={t('roi.groupLevers')}>
              {LEVER_FIELDS.map((f) => numField(f, true))}
              {/* Kept verbatim from the previous screen: it is the sentence §21 asks for. */}
              <p className="t-meta">{t('roi.sliderNote')}</p>
            </Group>
          </div>
        </Panel>

        {/* ------------------------------------------------ outputs */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-auto">
          <div className="flex shrink-0 flex-wrap gap-2">
            {VIEWS.map((k) => (
              <Button key={k} onClick={() => setView(k)} variant={view === k ? 'primary' : 'ghost'}>
                {t(VIEW_LABEL[k])}
              </Button>
            ))}
          </div>

          {view === 'authority' && (
            <>
              <div className="grid shrink-0 grid-cols-4 gap-2">
                <KpiTile
                  labelKey="roi.outGross"
                  {...tile(out.gross)}
                  tone="ok"
                  icon="trend-up"
                  wall={wall}
                  evidence="ASSUMPTION"
                  foot={{ hint: t('roi.ofSpend', { p: fmtPct(out.grossShareOfSpend) }) }}
                />
                <KpiTile
                  labelKey="roi.outPlatform"
                  {...tile(out.platformCost)}
                  icon="roi"
                  wall={wall}
                  evidence="ASSUMPTION"
                  foot={{ hint: `${money(inputs.platformCostPerBusYear)} ${t('roi.perBusYear')}` }}
                />
                <KpiTile
                  labelKey="roi.outNet"
                  {...tile(out.net)}
                  tone={out.net >= 0 ? 'ok' : 'crit'}
                  icon="check"
                  wall={wall}
                  evidence="ASSUMPTION"
                  foot={{ hint: out.netMultiple === null ? t('roi.onTheseAssumptions') : t('roi.netPerPlatform', { x: out.netMultiple.toFixed(1) }) }}
                />
                <KpiTile
                  labelKey="roi.outPayback"
                  value={payback}
                  unit={t('roi.months')}
                  icon="clock"
                  wall={wall}
                  evidence="ASSUMPTION"
                  foot={{ hint: t('roi.onTheseAssumptions') }}
                />
              </div>

              <div className="grid shrink-0 grid-cols-4 gap-2">
                <KpiTile labelKey="roi.outBaseline" {...tile(out.baselineSpend)} wall={wall} evidence="ASSUMPTION" />
                <KpiTile labelKey="roi.perKmBefore" value={mny(out.perKmBefore)} wall={wall} evidence="ASSUMPTION" />
                <KpiTile labelKey="roi.perKmAfter" value={mny(out.perKmAfter)} tone="ok" wall={wall} evidence="ASSUMPTION" />
                <KpiTile
                  labelKey="roi.failuresAvoided"
                  value={int(out.failuresAvoided)}
                  icon="shield"
                  wall={wall}
                  evidence="ASSUMPTION"
                  foot={{
                    hint:
                      out.failuresFromPrediction && predBand
                        ? t('roi.predBand', { lo: int(predBand.lo), hi: int(predBand.hi) })
                        : t('roi.ofFailures', { n: int(out.failures) }),
                  }}
                />
              </div>

              <div className="grid shrink-0 grid-cols-2 gap-2">
                <Panel titleKey="roi.breakdownChart" sub={t('roi.authoritySub')} className="h-[280px]" right={assumption} bodyClassName="p-1">
                  <EChart option={termChart} ariaLabel={`${t('roi.breakdownChart')} · ${t('chart.axis.annualCost')} by ${t('chart.axis.costDriver')}`} />
                </Panel>
                <Panel titleKey="roi.breakdown" className="h-[280px]" right={assumption}>
                  <DataTable
                    rows={out.terms}
                    rowKey={(r) => r.key}
                    empty={{ title: t('roi.breakdownEmpty'), text: t('roi.breakdownEmptyText') }}
                    columns={[
                      { key: 'key', label: t('roi.colSource'), render: (r) => t(r.key as I18nKey) },
                      { key: 'annual', label: t('roi.colAnnual'), num: true, sortable: true, sortValue: (r) => r.annual, render: (r) => money(r.annual) },
                      { key: 'share', label: t('roi.colShare'), num: true, sortable: true, sortValue: (r) => r.share, render: (r) => fmtPct(r.share, 0) },
                    ]}
                  />
                </Panel>
              </div>
            </>
          )}

          {view === 'operator' && (
            <Panel titleKey="roi.viewOperator" sub={t('roi.operatorSub')} className="min-h-0 flex-1" right={assumption}>
              <DataTable
                rows={OPERATORS}
                rowKey={(id) => id}
                empty={{ title: t('roi.operatorEmpty'), text: t('roi.operatorEmptyText') }}
                columns={[
                  { key: 'id', label: t('op.operator'), render: (id) => id },
                  { key: 'buses', label: t('roi.colBuses'), num: true, sortable: true, sortValue: (id) => opBuses[id], render: (id) => int(opBuses[id]) },
                  { key: 'spend', label: t('roi.outBaseline'), num: true, sortable: true, sortValue: (id) => opBuses[id], render: (id) => money(scaleTo(inputs, opBuses[id], predictedFailures).baselineSpend) },
                  { key: 'gross', label: t('roi.outGross'), num: true, sortable: true, sortValue: (id) => opBuses[id], render: (id) => money(scaleTo(inputs, opBuses[id], predictedFailures).gross) },
                  { key: 'platform', label: t('roi.outPlatform'), num: true, sortable: true, sortValue: (id) => opBuses[id], render: (id) => money(scaleTo(inputs, opBuses[id], predictedFailures).platformCost) },
                  {
                    key: 'net',
                    label: t('roi.outNet'),
                    num: true,
                    sortable: true,
                    sortValue: (id) => opBuses[id],
                    render: (id) => {
                      const r = scaleTo(inputs, opBuses[id], predictedFailures);
                      return <span style={{ color: r.net >= 0 ? 'var(--color-sev-ok)' : 'var(--color-sev-crit)' }}>{money(r.net)}</span>;
                    },
                  },
                ]}
              />
              <p className="t-meta p-3">{t('roi.onTheseAssumptions')} · {t('health.proposed')}</p>
            </Panel>
          )}

          {view === 'perBus' && (
            <>
              <div className="grid shrink-0 grid-cols-4 gap-2">
                <KpiTile labelKey="roi.outBaseline" {...tile(perBus.baselineSpend)} icon="bus" wall={wall} evidence="ASSUMPTION" foot={{ hint: t('roi.perBusYear') }} />
                <KpiTile labelKey="roi.outGross" {...tile(perBus.gross)} tone="ok" wall={wall} evidence="ASSUMPTION" foot={{ hint: t('roi.perBusYear') }} />
                <KpiTile labelKey="roi.outPlatform" {...tile(perBus.platformCost)} wall={wall} evidence="ASSUMPTION" foot={{ hint: t('roi.perBusYear') }} />
                <KpiTile labelKey="roi.outNet" {...tile(perBus.net)} tone={perBus.net >= 0 ? 'ok' : 'crit'} wall={wall} evidence="ASSUMPTION" foot={{ hint: t('roi.perBusYear') }} />
              </div>
              <Panel titleKey="roi.breakdown" sub={t('roi.perBusSub')} className="min-h-0 flex-1" right={assumption}>
                <DataTable
                  rows={perBus.terms}
                  rowKey={(r) => r.key}
                  empty={{ title: t('roi.breakdownEmpty'), text: t('roi.breakdownEmptyText') }}
                  columns={[
                    { key: 'key', label: t('roi.colSource'), render: (r) => t(r.key as I18nKey) },
                    { key: 'annual', label: t('roi.colAnnual'), num: true, sortable: true, sortValue: (r) => r.annual, render: (r) => money(r.annual) },
                    { key: 'share', label: t('roi.colShare'), num: true, sortable: true, sortValue: (r) => r.share, render: (r) => fmtPct(r.share, 0) },
                  ]}
                />
              </Panel>
            </>
          )}

          {view === 'fleet' && (
            <>
              <Callout kind="warn" className="shrink-0" icon={<EvidenceTag label="ASSUMPTION" />}>
                {t('roi.fleetRefusal')}
              </Callout>

              <div className="grid shrink-0 grid-cols-3 gap-2">
                <KpiTile labelKey="roi.peakRequirement" value={int(sizing.required)} wall={wall} evidence="ASSUMPTION" sub={`${peakKmh} ${t('unit.kmh')}`} />
                <KpiTile labelKey="roi.currentFleet" value={int(sizing.current)} wall={wall} evidence="CONFIRMED" />
                <KpiTile
                  labelKey="roi.gap"
                  value={int(sizing.required - sizing.current)}
                  tone={sizing.required > sizing.current ? 'warn' : 'ok'}
                  wall={wall}
                  evidence="ASSUMPTION"
                />
              </div>

              <Panel titleKey="roi.speedSlider" className="shrink-0" right={<EvidenceTag label="INFERRED" cite="CD · S5" />}>
                <div className="flex flex-col gap-2 p-3">
                  <Range
                    label={t('kit.label.peakSpeed')}
                    min={4}
                    max={30}
                    value={peakKmh}
                    onChange={setPeakKmh}
                    format={(v) => `${v} ${t('unit.kmh')}`}
                    hint={t('roi.speedNote')}
                    right={<StatusPill tone="info">{t('roi.currentFleet')}: {int(sizing.current)}</StatusPill>}
                  />
                  <p className="t-meta rounded border border-[var(--color-line)] bg-[var(--color-bg2)] p-3 font-mono">
                    {t('roi.fleetFormula')}
                  </p>
                </div>
              </Panel>

              <Panel titleKey="roi.peakRequirement" className="min-h-0 flex-1" right={<EvidenceTag label="ASSUMPTION" />}>
                <DataTable
                  rows={sizing.rows}
                  rowKey={(r) => r.route_id}
                  pageSize={12}
                  empty={{ title: t('roi.sizingEmpty'), text: t('roi.sizingEmptyText') }}
                  columns={[
                    { key: 'route_id', label: t('reg.route'), mono: true, sortable: true },
                    { key: 'need', label: t('roi.peakRequirement'), num: true, sortable: true },
                    { key: 'have', label: t('roi.currentFleet'), num: true, sortable: true },
                    {
                      key: 'gap',
                      label: (
                        <Tooltip content={t('kit.tip.gap')}>
                          <span tabIndex={0}>{t('roi.gap')}</span>
                        </Tooltip>
                      ),
                      num: true,
                      sortable: true,
                      sortValue: (r) => r.need - r.have,
                      render: (r) => (
                        <span style={{ color: r.need > r.have ? 'var(--color-sev-warn)' : 'var(--color-sev-ok)' }}>
                          {r.need - r.have > 0 ? `+${r.need - r.have}` : r.need - r.have}
                        </span>
                      ),
                    },
                  ]}
                />
              </Panel>
            </>
          )}

          {/* The list §21 says is worth more than a confident-looking wrong number. */}
          <Panel
            titleKey="health.inputsRequired"
            sub={t('roi.inputsSub')}
            className="shrink-0"
            collapsible
            summary={int(PTPD_INPUTS.length)}
            right={assumption}
            foot={<>
              <span className="t-meta">{t('roi.onTheseAssumptions')}</span>
              <PanelLink href="#/provenance">{t('roi.inputsLink')}</PanelLink>
            </>}
          >
            <ol className="t-body columns-1 list-decimal p-3 pl-6 text-[var(--color-text2)] md:columns-2">
              {PTPD_INPUTS.map((k) => <li key={k}>{t(k)}</li>)}
            </ol>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-2 border-t border-[var(--color-line)] pt-2">
      <legend className="panel-title px-1">{title}</legend>
      {children}
    </fieldset>
  );
}
