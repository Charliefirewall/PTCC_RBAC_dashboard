/**
 * Predictive worklist and component-life detail — plan §9.2 class A, §17 items 5.1–5.3,
 * backlog 18 and 49.
 *
 * The surface for `rules/predict.ts`. Three rules govern every pixel below:
 *
 *  1. **No literal figure.** Every number on this screen comes out of the model or out
 *     of `thresholds.ts`. There is no hard-coded RUL, count or percentage in this file.
 *  2. **No point estimate stands alone.** Wherever a median appears, its p10–p90 range
 *     appears beside it, in the same cell. A median on its own would read as a
 *     measurement, and nothing here is measured.
 *  3. **Every figure is graded.** The section frame is dashed and carries INFERRED; each
 *     evidence factor carries its own tag, INFERRED for a simulated observation and
 *     ASSUMPTION for a term we invented. Nothing here is ever CONFIRMED — §9.3.
 *
 * Zones use OUR operational-state language (§13.2): the same four words and the same
 * four `--color-sev-*` tokens the alert layer uses. Not the reference product's
 * Black/Orange/Yellow/Green, and deliberately not the 3-level alert scale or the 5-level
 * event scale, which stay unmerged (L1182, R1433).
 */

import { useMemo, useState } from 'react';
import type { Route, Vehicle } from '../../sim/types';
import type { I18nKey } from '../../i18n/dict';
import { useT } from '../../i18n/t';
import { useSelection, useSettings } from '../../store';
import {
  CONFIDENCE_CEILING,
  type ComponentId,
  type ComponentPrediction,
  type Zone,
  fleetForecast,
  predictFleet,
} from '../../rules/predict';
import {
  Callout,
  type Column,
  DataTable,
  Empty,
  EvidenceTag,
  KpiTile,
  Panel,
  StatusPill,
  Stepper,
  Tooltip,
  fmtInt,
} from '../../components/primitives';

/** Zone → our operational-state token, word key and pill tone. Colour never travels alone. */
const ZONE_UI: Record<Zone, { color: string; tone: 'crit' | 'warn' | 'info' | 'ok'; key: I18nKey }> = {
  critical: { color: 'var(--color-sev-crit)', tone: 'crit', key: 'health.risk.critical' },
  high: { color: 'var(--color-sev-warn)', tone: 'warn', key: 'health.risk.high' },
  elevated: { color: 'var(--color-accent)', tone: 'info', key: 'health.risk.elevated' },
  low: { color: 'var(--color-sev-ok)', tone: 'ok', key: 'health.risk.low' },
};

const CMP_KEY: Record<ComponentId, I18nKey> = {
  brakes: 'pred.cmp.brakes',
  tyres: 'pred.cmp.tyres',
  clutch: 'pred.cmp.clutch',
  battery: 'pred.cmp.battery',
  doors: 'pred.cmp.doors',
  hvac: 'pred.cmp.hvac',
  driveline: 'pred.cmp.driveline',
  devices: 'pred.cmp.devices',
};

/** The absences this model creates. Listed here so the count on screen is derived. */
const INPUT_KEYS: I18nKey[] = ['pred.input1', 'pred.input2', 'pred.input3', 'pred.input4', 'pred.input5'];

/*
 * Every number on this screen comes out of a division inside the RUL model, and `fmtInt`
 * (components/primitives) prints the literal "NaN" for a non-finite input. One guard in
 * each of the two formatters covers every figure in the file — an unanswerable number
 * reads as an em dash, never as a word.
 */
const DASH = '—';
const d0 = (n: number) => (Number.isFinite(n) ? fmtInt(Math.round(n)) : DASH);
const pct = (x: number) => (Number.isFinite(x) ? `${Math.round(x * 100)} %` : DASH);

function ZoneCell({ zone }: { zone: Zone }) {
  const t = useT();
  const z = ZONE_UI[zone];
  return <StatusPill tone={z.tone}>{t(z.key)}</StatusPill>;
}

export default function Predictive({ vehicles, routes }: { vehicles: readonly Vehicle[]; routes: readonly Route[] }) {
  const t = useT();
  const th = useSettings((s) => s.th);
  const selected = useSelection((s) => s.vehicle_id);
  const selectVehicle = useSelection((s) => s.selectVehicle);
  const [cmp, setCmp] = useState<ComponentId | null>(null);

  const routeById = useMemo(() => new Map(routes.map((r) => [r.route_id, r])), [routes]);
  const list = useMemo(() => predictFleet(vehicles, routeById, th), [vehicles, routeById, th]);
  const forecast = useMemo(() => fleetForecast(vehicles, routeById, th), [vehicles, routeById, th]);

  const focus = useMemo(
    () => list.find((p) => p.vehicle_id === selected) ?? list[0],
    [list, selected],
  );

  /** Worst component of the focused bus — the one the operator would look at first. */
  const worstCmp = useMemo(() => {
    if (!focus) return null;
    return [...focus.components].sort((a, b) => a.rulDays - b.rulDays)[0] ?? null;
  }, [focus]);

  const shownCmp: ComponentPrediction | null =
    (cmp ? (focus?.components.find((c) => c.component === cmp) ?? null) : null) ?? worstCmp;

  /* An empty fleet is NOT "no bus is at risk" — it is no bus at all, and saying the
     first while meaning the second is exactly the kind of flattering emptiness this
     build is not allowed to show. */
  if (!vehicles.length) return <Empty title={t('pred.noFleet')} text={t('pred.noFleetText')} />;

  const dueTotal = forecast.perComponent.reduce((a, c) => a + c.due, 0);
  const dueLoTotal = forecast.perComponent.reduce((a, c) => a + c.dueLo, 0);
  const dueHiTotal = forecast.perComponent.reduce((a, c) => a + c.dueHi, 0);
  const range = (lo: number, hi: number) => `${d0(lo)}–${d0(hi)}`;

  /** "12 d (7–19)" — the median never appears without the interval that qualifies it. */
  const rulCell = (c: ComponentPrediction) => (
    <span>
      <span className="num">{d0(c.rulDays)}</span> {t('pred.days')}{' '}
      <span className="num text-[var(--color-text3)]">({range(c.rulLo, c.rulHi)})</span>
    </span>
  );

  const worklistCols: Column<(typeof list)[number]>[] = [
    {
      key: 'zone',
      label: (
        <Tooltip content={t('pred.tip.zone')}>
          <span tabIndex={0}>{t('pred.zone')}</span>
        </Tooltip>
      ),
      sortable: true,
      sortValue: (p) => p.dueDays,
      render: (p) => <ZoneCell zone={p.zone} />,
    },
    { key: 'bus', label: t('health.bus'), mono: true, sortable: true, sortValue: (p) => p.vehicle_id, render: (p) => p.vehicle_id },
    { key: 'route', label: t('reg.route'), mono: true, sortable: true, sortValue: (p) => p.route_id, render: (p) => p.route_id },
    {
      key: 'worst',
      label: t('pred.worst'),
      render: (p) => {
        // A prediction with no components would make `[0]!` a runtime TypeError, and a
        // crash is a worse demo than a dash.
        const w = [...p.components].sort((a, b) => a.rulDays - b.rulDays)[0];
        return <span className="text-[var(--color-text2)]">{w ? t(CMP_KEY[w.component]) : DASH}</span>;
      },
    },
    {
      key: 'due',
      label: (
        <Tooltip content={t('pred.tip.rul')}>
          <span tabIndex={0}>{t('pred.due')}</span>
        </Tooltip>
      ),
      num: true,
      sortable: true,
      sortValue: (p) => p.dueDays,
      render: (p) => {
        const w = [...p.components].sort((a, b) => a.rulDays - b.rulDays)[0];
        return <span style={{ color: ZONE_UI[p.zone].color }}>{w ? rulCell(w) : DASH}</span>;
      },
    },
    {
      key: 'exposure',
      label: (
        <Tooltip content={t('kit.tip.exposure')}>
          <span tabIndex={0}>{t('health.exposure')}</span>
        </Tooltip>
      ),
      num: true,
      sortable: true,
      sortValue: (p) => p.exposure,
      render: (p) => <span className="text-[var(--color-text3)]">{d0(p.exposure)}</span>,
    },
  ];

  return (
    <section className="shrink-0">
      <Callout kind="info" dashed icon={<EvidenceTag label="INFERRED" cite="CV ¶3 · §9.2 A" />} className="mb-2">
        {t('pred.notML', { cap: Math.round(CONFIDENCE_CEILING * 100) })}
      </Callout>
      <Callout kind="warn" className="mb-2" title={t('pred.action')}>
        {t('support.pred.governance')}
      </Callout>

      <div className="mb-2 grid shrink-0 grid-cols-2 gap-2 lg:grid-cols-4">
        <KpiTile
          labelKey="pred.kpiCritical"
          icon="alert"
          value={d0(forecast.zones.critical)}
          tone={forecast.zones.critical ? 'crit' : 'ok'}
          evidence="INFERRED"
          foot={{ dist: { crit: forecast.zones.critical, warn: forecast.zones.high, ok: forecast.zones.elevated + forecast.zones.low } }}
        />
        <KpiTile
          labelKey="pred.kpiHigh"
          value={d0(forecast.zones.high)}
          tone={forecast.zones.high ? 'warn' : 'ok'}
          evidence="INFERRED"
          sub={`${t('pred.horizon')} ${d0(forecast.horizonDays)} ${t('pred.days')}`}
        />
        <KpiTile
          labelKey="pred.kpiDue"
          value={d0(dueTotal)}
          unit={`(${range(dueLoTotal, dueHiTotal)})`}
          evidence="INFERRED"
          sub={t('pred.range')}
        />
        <KpiTile
          labelKey="pred.kpiExposure"
          value={d0(forecast.exposureAtRisk)}
          tone={forecast.exposureAtRisk ? 'warn' : 'ok'}
          evidence="INFERRED"
        />
      </div>

      <div className="grid min-h-0 grid-cols-1 gap-2 lg:grid-cols-3">
        <Panel
          className="max-h-[340px] min-w-0 lg:col-span-2"
          titleKey="pred.worklist"
          sub={t('pred.worklistSub')}
          right={<EvidenceTag label="INFERRED" cite="§9.2 A · backlog 49" />}
          foot={<span className="t-meta">{t('pred.worklistNote')}</span>}
        >
          <DataTable
            rows={list.slice(0, 40)}
            rowKey={(p) => p.vehicle_id}
            pageSize={8}
            onRowClick={(p) => {
              selectVehicle(p.vehicle_id);
              setCmp(null);
            }}
            rowClass={(p) => (p.vehicle_id === selected ? 'bg-[var(--color-bg3)]' : '')}
            empty={{ title: t('pred.noRisk'), text: t('pred.noRiskText') }}
            columns={worklistCols}
          />
        </Panel>

        <Panel
          className="max-h-[340px] min-w-0"
          titleKey="pred.inputsTitle"
          collapsible
          defaultOpen={false}
          summary={d0(INPUT_KEYS.length)}
          right={<EvidenceTag label="ASSUMPTION" cite="§9.3" />}
        >
          <ol className="t-body list-decimal p-2 pl-6 text-[var(--color-text2)]">
            {INPUT_KEYS.map((k) => (
              <li key={k}>{t(k)}</li>
            ))}
          </ol>
        </Panel>
      </div>

      <div className="mt-2 grid min-h-0 grid-cols-1 gap-2 lg:grid-cols-3">
        <Panel
          className="max-h-[360px] min-w-0 lg:col-span-2"
          title={focus ? t('pred.detail', { bus: focus.vehicle_id }) : t('pred.selectBus')}
          sub={`${t('pred.dailyKm')}: ${focus ? d0(focus.dailyKm) : DASH} km · ${t('pred.sig.age')}: ${focus ? d0(focus.ageYears) : DASH}`}
          right={<EvidenceTag label="INFERRED" cite="§17 · 5.2" />}
          foot={<span className="t-meta font-mono">{t('pred.model')}</span>}
        >
          <DataTable
            rows={focus?.components ?? []}
            rowKey={(c) => c.component}
            sortKey="rul"
            sortDir="asc"
            onRowClick={(c) => setCmp(c.component)}
            rowClass={(c) => (c.component === shownCmp?.component ? 'bg-[var(--color-bg3)]' : '')}
            empty={{ title: t('pred.selectBus'), text: t('pred.selectBusText') }}
            columns={[
              { key: 'component', label: t('pred.component'), render: (c) => t(CMP_KEY[c.component]) },
              {
                key: 'rul',
                label: (
                  <Tooltip content={t('pred.tip.rul')}>
                    <span tabIndex={0}>{t('pred.rul')}</span>
                  </Tooltip>
                ),
                num: true,
                sortable: true,
                sortValue: (c) => c.rulDays,
                render: (c) => <span style={{ color: ZONE_UI[c.zone].color }}>{rulCell(c)}</span>,
              },
              {
                key: 'km',
                label: t('pred.rulKm'),
                num: true,
                sortable: true,
                sortValue: (c) => c.rulKm,
                render: (c) => <span className="num text-[var(--color-text3)]">{d0(c.rulKm)} {t('unit.km')}</span>,
              },
              {
                key: 'confidence',
                label: (
                  <Tooltip content={t('pred.tip.confidence', { cap: Math.round(CONFIDENCE_CEILING * 100) })}>
                    <span tabIndex={0}>{t('pred.confidence')}</span>
                  </Tooltip>
                ),
                num: true,
                sortable: true,
                sortValue: (c) => c.confidence,
                render: (c) => <span className="num text-[var(--color-text2)]">{pct(c.confidence)}</span>,
              },
              { key: 'zone', label: t('pred.zone'), sortable: true, sortValue: (c) => c.rulDays, render: (c) => <ZoneCell zone={c.zone} /> },
              {
                key: 'window',
                label: (
                  <Tooltip content={t('pred.tip.window')}>
                    <span tabIndex={0}>{t('pred.window')}</span>
                  </Tooltip>
                ),
                num: true,
                sortable: true,
                sortValue: (c) => c.window.toDays,
                render: (c) => (
                  <span className="num text-[var(--color-text3)]">
                    {d0(c.window.fromDays)}–{d0(c.window.toDays)} {t('pred.days')}
                  </span>
                ),
              },
            ]}
          />
        </Panel>

        {/* "Why is this bus at risk" — the evidence factors, each with its own grade. */}
        <Panel
          className="max-h-[360px] min-w-0"
          titleKey="pred.factors"
          sub={shownCmp ? t(CMP_KEY[shownCmp.component]) : undefined}
          right={<EvidenceTag label="INFERRED" cite="§17 · 5.2" />}
        >
          {shownCmp ? (
            <div className="flex flex-col gap-2 p-2">
              <Stepper
                steps={[
                  { label: t('pred.step.signals'), state: 'done' },
                  { label: t('pred.step.duty'), state: 'done' },
                  { label: t('pred.step.life'), state: 'done' },
                  { label: t('pred.step.zone'), state: 'active' },
                ]}
              />
              <ul className="flex flex-col gap-1">
                {shownCmp.factors.map((f) => (
                  <li
                    key={f.labelKey}
                    className="flex min-w-0 items-center justify-between gap-2 rounded bg-[var(--color-bg2)] px-2 py-1"
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="t-body break-words leading-tight text-[var(--color-text1)]">{t(f.labelKey)}</span>
                      <span className="t-meta">{f.dir === 'up' ? t('pred.raises') : t('pred.lowers')}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="num t-card" style={{ color: f.dir === 'up' ? 'var(--color-sev-warn)' : 'var(--color-sev-ok)' }}>
                        {Number.isFinite(f.value) ? f.value : DASH}
                        {f.unit}
                      </span>
                      <EvidenceTag label={f.evidence} />
                    </span>
                  </li>
                ))}
              </ul>
              <Callout kind="info" title={t('pred.action')}>
                {t(shownCmp.recommendedAction)}
              </Callout>
            </div>
          ) : (
            <Empty title={t('pred.selectBus')} text={t('pred.worklistNote')} />
          )}
        </Panel>
      </div>

      {/* The aggregate Workstream Q's ROI engine consumes. Shown, not hidden, so the
          number the ROI argument rests on is auditable on the same screen. */}
      <Panel
        className="mt-2 min-w-0"
        titleKey="pred.forecast"
        sub={t('pred.forecastSub')}
        collapsible
        defaultOpen={false}
        summary={`${d0(dueTotal)} (${range(dueLoTotal, dueHiTotal)})`}
        right={<EvidenceTag label="INFERRED" cite="§9.1(b)" />}
      >
        <DataTable
          rows={forecast.perComponent}
          rowKey={(c) => c.component}
          sortKey="due"
          sortDir="desc"
          empty={{ title: t('pred.noRisk'), text: t('pred.noRiskText') }}
          columns={[
            { key: 'component', label: t('pred.component'), render: (c) => t(CMP_KEY[c.component]) },
            {
              key: 'due',
              label: t('pred.dueIn'),
              num: true,
              sortable: true,
              sortValue: (c) => c.due,
              render: (c) => (
                <span>
                  <span className="num">{d0(c.due)}</span>{' '}
                  <span className="num text-[var(--color-text3)]">({range(c.dueLo, c.dueHi)})</span>
                </span>
              ),
            },
            {
              key: 'annualised',
              label: t('pred.annualised'),
              num: true,
              sortable: true,
              sortValue: (c) => c.annualised,
              render: (c) => <span className="num text-[var(--color-accent)]">{d0(c.annualised)}</span>,
            },
            {
              key: 'conf',
              label: t('pred.confidence'),
              num: true,
              sortable: true,
              sortValue: (c) => c.meanConfidence,
              render: (c) => <span className="num text-[var(--color-text2)]">{pct(c.meanConfidence)}</span>,
            },
          ]}
        />
      </Panel>
    </section>
  );
}
