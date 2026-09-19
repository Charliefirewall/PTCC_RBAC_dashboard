/**
 * Depot capacity & consumables — plan §9.1(a), §9.2 class B, §17 items 5.4/5.5,
 * backlog 47 and 48.
 *
 * THE FRAME. The client was explicit about who is looking at this: *"this is PTPD… they
 * are not the operators. They don't directly manage the driver and shift. They manage the
 * KPI."* So the page answers two oversight questions and stops:
 *
 *   1. is a depot heading over its workshop capacity, and in which week?
 *   2. will a consumable run short, and early enough to do something about it?
 *
 * It does NOT assign a bay, book a slot, roster a technician or raise a purchase order.
 * Those are §9.2 class D — the operators' job, and PTPD is not a procurement authority.
 * There is no write path on this screen at all; the only interaction is which depot you
 * are looking at.
 *
 * THE HONESTY PROBLEM. The client's data model has no depot in it. Not a thin one — none.
 * So unlike every other screen in this build, this one has NOTHING confirmed on it: the
 * depots, their capacities, the bus→depot assignment and the stock levels are all ours.
 * Hence the dashed ASSUMPTION frame at the top, an EvidenceTag on every figure, and ten
 * new parameters in Settings whose `sourceValue` is undefined — which puts each of them
 * on the #/provenance questionnaire as a fresh open question for PTPD. Adding an honest
 * question is a better deliverable than a confident number.
 *
 * The wear model is NOT ours: it is `rules/predict.ts` (Workstream P), so the due dates
 * here and the RUL figures on the predictive worklist cannot disagree.
 */

import { useMemo, useState } from 'react';
import { useSim, useSettings, world } from '../../store';
import { useT } from '../../i18n/t';
import type { I18nKey } from '../../i18n/dict';
import { DEPOTS, DEPOT_BY_ID } from '../../data/depots';
import {
  Callout,
  type Column,
  DataTable,
  Empty,
  EvidenceTag,
  KpiTile,
  Panel,
  PanelLink,
  StatusPill,
  Tooltip,
  fmtInt,
} from '../../components/primitives';
import {
  type Consumable,
  type ConsumableLine,
  type DepotPlan,
  type DepotWeek,
  type Intervention,
  planDepots,
} from './model';

const STATE_COLOR: Record<DepotWeek['state'], string> = {
  ok: 'var(--color-sev-ok)',
  warn: 'var(--color-sev-warn)',
  over: 'var(--color-sev-crit)',
};
const STATE_KEY: Record<DepotWeek['state'], I18nKey> = {
  ok: 'dep.state.ok',
  warn: 'dep.state.warn',
  over: 'dep.state.over',
};

/** predict.ts's eight components, labelled here so this module owns its own strings. */
const COMPONENT_KEY: Record<string, I18nKey> = {
  brakes: 'dep.cons.brakes',
  tyres: 'dep.cons.tyres',
  clutch: 'dep.cons.clutch',
  battery: 'dep.cons.battery',
  doors: 'dep.cmp.doors',
  hvac: 'dep.cmp.hvac',
  driveline: 'dep.cmp.driveline',
  devices: 'dep.cmp.devices',
};

const INPUT_KEYS: I18nKey[] = [
  'dep.in.depots',
  'dep.in.capacity',
  'dep.in.assignment',
  'dep.in.intervals',
  'dep.in.history',
  'dep.in.stock',
  'dep.in.odometer',
];

/**
 * Cell wash. The colour says which band; the opacity says how deep into it, so a 140 %
 * week reads louder than a 101 % one without introducing a fourth colour the legend
 * would then have to explain.
 */
function cellStyle(w: DepotWeek, over: number): { background: string; color: string } {
  const c = STATE_COLOR[w.state];
  // Clamped both ends: a negative or non-finite utilisation would otherwise produce an
  // out-of-range colour-mix percentage and an uncoloured cell.
  const depth = Number.isFinite(w.util_pct) ? Math.min(1, Math.max(0, w.util_pct / Math.max(1, over * 1.3))) : 0;
  return { background: `color-mix(in srgb, ${c} ${Math.round(12 + depth * 62)}%, transparent)`, color: 'var(--color-text1)' };
}

export default function Depot() {
  const t = useT();
  const snap = useSim((s) => s.snap);
  const th = useSettings((s) => s.th);
  const [selected, setSelected] = useState<string>(DEPOTS[0]!.id);

  const plans = useMemo(
    () => (snap ? planDepots(snap.vehicles, world.routeById, th) : []),
    [snap, th],
  );
  const byId = useMemo(() => new Map(plans.map((p) => [p.depot_id, p])), [plans]);
  const plan = byId.get(selected);

  if (!snap || plans.length === 0) return <Empty title={t('dep.empty')} text={t('dep.emptyText')} />;

  const horizon = plans[0]!.weeks.length;
  const overWeeks = plans.reduce((a, p) => a + p.over_weeks, 0);
  const peak = plans.reduce((a, p) => Math.max(a, p.peak_util_pct), 0);
  const buses = plans.reduce((a, p) => a + p.buses.length, 0);
  const shortfall = plans.reduce<number | null>(
    (a, p) => (p.first_shortfall_week === null ? a : a === null ? p.first_shortfall_week : Math.min(a, p.first_shortfall_week)),
    null,
  );

  return (
    <div className="flex h-full flex-col gap-2 overflow-y-auto">
      <Panel
        className="shrink-0"
        title={t('dep.title')}
        sub={t('dep.lede')}
        right={<EvidenceTag label="ASSUMPTION" cite="No depot exists in the ICD" />}
        bodyClassName="p-3"
      >
        <Callout kind="warn" dashed title={t('dep.notOps')}>
          {t('dep.noDepotEntity')}
        </Callout>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <KpiTile
            labelKey="dep.kpiOver"
            icon="depot"
            value={fmtInt(overWeeks)}
            tone={overWeeks > 0 ? 'crit' : 'ok'}
            evidence="ASSUMPTION"
            foot={{ hint: t('dep.heatHint') }}
          />
          <KpiTile
            labelKey="dep.kpiPeak"
            icon="trend-up"
            value={Math.round(peak)}
            unit="%"
            tone={peak >= th.depot_capacity_over_pct ? 'crit' : peak >= th.depot_capacity_warn_pct ? 'warn' : 'ok'}
            evidence="ASSUMPTION"
          />
          <KpiTile labelKey="dep.kpiBuses" icon="bus" value={fmtInt(buses)} evidence="INFERRED" sub={`${DEPOTS.length} ${t('dep.depot')}`} />
          <KpiTile
            labelKey="dep.kpiShortfall"
            icon="warning"
            value={shortfall === null ? '—' : t('dep.weekShort', { n: shortfall })}
            tone={shortfall !== null && shortfall <= th.consumable_cover_weeks ? 'crit' : shortfall !== null ? 'warn' : 'ok'}
            evidence="ASSUMPTION"
            sub={shortfall === null ? t('dep.kpiShortfallNone') : undefined}
          />
        </div>
      </Panel>

      <Panel
        className="shrink-0"
        title={t('dep.heatTitle')}
        sub={t('dep.heatSub')}
        right={<EvidenceTag label="ASSUMPTION" cite="Capacity invented — no source" />}
        bodyClassName="p-3"
        foot={
          <>
            <span>{t('dep.heatHint')}</span>
            <PanelLink href="#/provenance">{t('dep.openQuestions')}</PanelLink>
          </>
        }
      >
        <Heatmap plans={plans} horizon={horizon} selected={selected} onSelect={setSelected} over={th.depot_capacity_over_pct} />
        <Legend />
      </Panel>

      <div className="grid shrink-0 gap-2 xl:grid-cols-2">
        <Detail plan={plan} horizon={horizon} />
        <Consumables plan={plan} coverWeeks={th.consumable_cover_weeks} />
      </div>

      <Panel
        className="shrink-0"
        title={t('dep.inputsTitle')}
        right={<EvidenceTag label="CONFIRMED" cite="§15.1 absence questionnaire" />}
        bodyClassName="p-3"
        foot={
          <>
            <span>{t('dep.notOps')}</span>
            <PanelLink href="#/provenance">{t('dep.openQuestions')}</PanelLink>
          </>
        }
      >
        <ul className="flex flex-col gap-1.5">
          {INPUT_KEYS.map((k) => (
            <li key={k} className="t-body flex items-baseline gap-2 text-[var(--color-text2)]">
              <span aria-hidden className="shrink-0 text-[var(--color-text3)]">—</span>
              <span>{t(k)}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

// ---------------------------------------------------------------- heatmap

function Heatmap({
  plans,
  horizon,
  selected,
  onSelect,
  over,
}: {
  plans: DepotPlan[];
  horizon: number;
  selected: string;
  onSelect: (id: string) => void;
  over: number;
}) {
  const t = useT();
  return (
    <div className="overflow-x-auto">
      <div
        className="grid min-w-[640px] items-center gap-[2px]"
        style={{ gridTemplateColumns: `minmax(140px, 1.4fr) repeat(${horizon}, minmax(28px, 1fr))` }}
      >
        <span className="t-label px-1 text-[var(--color-text3)]">{t('dep.depot')}</span>
        {Array.from({ length: horizon }, (_, i) => (
          <span key={i} className="t-label num text-center text-[var(--color-text3)]">
            {i + 1}
          </span>
        ))}

        {plans.map((p) => {
          const depot = DEPOT_BY_ID.get(p.depot_id)!;
          const on = p.depot_id === selected;
          return (
            <Row key={p.depot_id}>
              <button
                type="button"
                onClick={() => onSelect(p.depot_id)}
                aria-pressed={on}
                className={`flex min-w-0 flex-col items-start rounded px-1 py-1 text-left hover:bg-[var(--color-bg3)] ${
                  on ? 'bg-[var(--color-bg3)]' : ''
                }`}
              >
                <span className="t-body truncate text-[var(--color-text1)]">{depot.name_en}</span>
                <span className="t-meta truncate">
                  {depot.name_mn} · {fmtInt(depot.workshop_hours_per_week)} {t('dep.hours')}/{t('dep.week').toLowerCase()}
                </span>
              </button>
              {p.weeks.map((w) => (
                <Tooltip
                  key={w.week}
                  content={
                    <>
                      <span className="font-semibold">
                        {depot.name_en} · {t('dep.weekShort', { n: w.week })}
                      </span>
                      <br />
                      <span className="t-meta">
                        {t('dep.util')} {Math.round(w.util_pct)} % · {t('dep.totalH')} {Math.round(w.total_h)} /{' '}
                        {fmtInt(w.capacity_h)} {t('dep.hours')}
                        <br />
                        {t('dep.interventions')} {fmtInt(w.interventions)} · {t(STATE_KEY[w.state])}
                      </span>
                    </>
                  }
                >
                  <button
                    type="button"
                    onClick={() => onSelect(p.depot_id)}
                    className="num flex h-7 w-full items-center justify-center rounded text-[10px] font-semibold"
                    style={cellStyle(w, over)}
                    aria-label={`${depot.name_en} ${t('dep.weekShort', { n: w.week })} ${Math.round(w.util_pct)} %`}
                  >
                    {Math.round(w.util_pct)}
                  </button>
                </Tooltip>
              ))}
            </Row>
          );
        })}
      </div>
    </div>
  );
}

/** `display: contents` so each depot's cells join the parent grid rather than nesting. */
function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'contents' }}>{children}</div>;
}

function Legend() {
  const t = useT();
  return (
    <div className="mt-2 flex flex-wrap items-center gap-3">
      {(['ok', 'warn', 'over'] as const).map((s) => (
        <span key={s} className="t-meta flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-4 rounded-sm"
            style={{ background: `color-mix(in srgb, ${STATE_COLOR[s]} 55%, transparent)` }}
            aria-hidden
          />
          {t(STATE_KEY[s])}
        </span>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- depot detail

function Detail({ plan, horizon }: { plan: DepotPlan | undefined; horizon: number }) {
  const t = useT();
  const depot = plan ? DEPOT_BY_ID.get(plan.depot_id) : undefined;

  const weekCols: Column<DepotWeek>[] = [
    { key: 'week', label: t('dep.week'), mono: true, sortable: true, render: (w) => t('dep.weekShort', { n: w.week }) },
    { key: 'interventions', label: t('dep.interventions'), num: true, sortable: true },
    { key: 'routine_h', label: t('dep.routineH'), num: true, sortable: true, render: (w) => Math.round(w.routine_h) },
    { key: 'intervention_h', label: t('dep.interventionH'), num: true, sortable: true, render: (w) => Math.round(w.intervention_h) },
    { key: 'total_h', label: t('dep.totalH'), num: true, sortable: true, render: (w) => Math.round(w.total_h) },
    {
      key: 'util_pct',
      label: t('dep.util'),
      num: true,
      sortable: true,
      render: (w) => (
        <StatusPill tone={w.state === 'over' ? 'crit' : w.state === 'warn' ? 'warn' : 'ok'}>
          {Math.round(w.util_pct)} %
        </StatusPill>
      ),
    },
  ];

  const dueCols: Column<Intervention>[] = [
    { key: 'vehicle_id', label: t('dep.bus'), mono: true, sortable: true },
    {
      key: 'component',
      label: t('dep.component'),
      sortable: true,
      render: (i) => t(COMPONENT_KEY[i.component] ?? 'dep.component'),
    },
    { key: 'week', label: t('dep.dueWeek'), num: true, sortable: true, render: (i) => t('dep.weekShort', { n: i.week }) },
    { key: 'week_lo', label: t('dep.earliest'), num: true, sortable: true, render: (i) => t('dep.weekShort', { n: i.week_lo }) },
    {
      key: 'confidence',
      label: t('dep.confidence'),
      num: true,
      sortable: true,
      render: (i) => `${Math.round(i.confidence * 100)} %`,
    },
  ];

  if (!plan || !depot) {
    return (
      <Panel className="shrink-0" title={t('dep.selectDepot')} bodyClassName="p-3">
        <Empty title={t('dep.selectDepot')} text={t('dep.selectDepotText')} />
      </Panel>
    );
  }

  return (
    <Panel
      className="shrink-0"
      title={t('dep.detailTitle', { depot: depot.name_en })}
      sub={t('dep.detailSub')}
      right={<EvidenceTag label="INFERRED" cite="rules/predict.ts · RUL model" />}
      bodyClassName="p-3"
      foot={<span>{t('dep.rangeNote')}</span>}
    >
      <div className="t-meta mb-2 flex flex-wrap gap-3">
        <span>
          {t('dep.buses')}: <span className="num text-[var(--color-text1)]">{fmtInt(plan.buses.length)}</span>
        </span>
        <span>
          {t('dep.capacity')}: <span className="num text-[var(--color-text1)]">{fmtInt(depot.workshop_hours_per_week)}</span>{' '}
          {t('dep.hours')}
        </span>
        <span>
          {t('dep.peak')}: <span className="num text-[var(--color-text1)]">{Math.round(plan.peak_util_pct)} %</span>
        </span>
        <span>
          {t('dep.overWeeks')}: <span className="num text-[var(--color-text1)]">{fmtInt(plan.over_weeks)}</span> / {horizon}
        </span>
      </div>

      <DataTable columns={weekCols} rows={plan.weeks} rowKey={(w) => String(w.week)} compact maxHeight={220} />

      <p className="t-meta mt-3 mb-1">{t('dep.nonStocked')}</p>
      <DataTable
        columns={dueCols}
        rows={plan.interventions}
        rowKey={(i, n) => `${i.vehicle_id}-${i.component}-${n}`}
        sortKey="week"
        compact
        pageSize={8}
        empty={
          plan.buses.length === 0
            ? { title: t('dep.noBuses'), text: t('dep.noBusesText') }
            : { title: t('dep.dueEmpty'), text: t('dep.dueEmptyText') }
        }
      />
    </Panel>
  );
}

// ---------------------------------------------------------------- consumables

function Consumables({ plan, coverWeeks }: { plan: DepotPlan | undefined; coverWeeks: number }) {
  const t = useT();
  const CONS_KEY: Record<Consumable, I18nKey> = {
    brakes: 'dep.cons.brakes',
    tyres: 'dep.cons.tyres',
    clutch: 'dep.cons.clutch',
    battery: 'dep.cons.battery',
  };

  const cols: Column<ConsumableLine>[] = [
    { key: 'consumable', label: t('dep.consumable'), sortable: true, render: (c) => t(CONS_KEY[c.consumable]) },
    { key: 'opening_stock', label: t('dep.stock'), num: true, sortable: true },
    {
      key: 'demand',
      label: t('dep.demand'),
      num: true,
      sortable: true,
      sortValue: (c) => c.weeks.reduce((a, w) => a + w.units, 0),
      render: (c) => fmtInt(c.weeks.reduce((a, w) => a + w.units, 0)),
    },
    {
      key: 'cover_weeks',
      label: t('dep.cover'),
      num: true,
      sortable: true,
      sortValue: (c) => (Number.isFinite(c.cover_weeks) ? c.cover_weeks : Number.MAX_SAFE_INTEGER),
      /* model.ts yields `Infinity` when nothing is forecast to consume the part. "∞ weeks
         of cover" is a claim about the store room; the honest reading is that there is no
         consumption to divide the stock by, so there is no cover figure to state. */
      render: (c) =>
        Number.isFinite(c.cover_weeks) ? t('dep.coverWeeks', { n: c.cover_weeks.toFixed(1) }) : t('dep.coverNone'),
    },
    {
      key: 'shortfall_week',
      label: t('dep.shortfall'),
      sortable: true,
      sortValue: (c) => c.shortfall_week ?? 999,
      render: (c) =>
        c.shortfall_week === null ? (
          <StatusPill tone="ok">{t('dep.noShortfall')}</StatusPill>
        ) : (
          <StatusPill tone={c.shortfall_week <= coverWeeks ? 'crit' : 'warn'}>
            {t('dep.shortfallAt', { n: c.shortfall_week })}
          </StatusPill>
        ),
    },
  ];

  return (
    <Panel
      className="shrink-0"
      title={t('dep.consTitle')}
      sub={t('dep.consSub')}
      right={<EvidenceTag label="ASSUMPTION" cite="Stock levels invented — PTPD holds none" />}
      bodyClassName="p-3"
    >
      {!plan ? (
        <Empty title={t('dep.selectDepot')} text={t('dep.selectDepotText')} />
      ) : (
        <>
          <DataTable
            columns={cols}
            rows={plan.consumables}
            rowKey={(c) => c.consumable}
            compact
            empty={{ title: t('dep.consEmpty'), text: t('dep.consEmptyText') }}
          />
          <div className="mt-3 flex flex-col gap-2">
            {plan.consumables.map((c) => (
              <BalanceStrip key={c.consumable} line={c} label={t(CONS_KEY[c.consumable])} />
            ))}
          </div>
        </>
      )}
    </Panel>
  );
}

/**
 * Twelve weeks of running stock balance as one strip. A cell that has gone negative is
 * the whole point of the page, so it is the only one that carries the critical colour.
 */
function BalanceStrip({ line, label }: { line: ConsumableLine; label: string }) {
  const t = useT();
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="t-meta w-[8ch] shrink-0 truncate">{label}</span>
      <div className="flex min-w-0 flex-1 gap-[2px]">
        {line.weeks.map((w) => (
          <Tooltip
            key={w.week}
            className="min-w-0 flex-1"
            content={
              <>
                <span className="font-semibold">
                  {label} · {t('dep.weekShort', { n: w.week })}
                </span>
                <br />
                <span className="t-meta">
                  {t('dep.demand')} {fmtInt(w.units)} · {t('dep.stock')} {fmtInt(w.balance)}
                </span>
              </>
            }
          >
            <span
              className="block h-3 w-full rounded-sm"
              style={{
                background:
                  w.balance < 0
                    ? 'var(--color-sev-crit)'
                    : `color-mix(in srgb, var(--color-sev-ok) ${w.units > 0 ? 45 : 14}%, transparent)`,
              }}
            />
          </Tooltip>
        ))}
      </div>
    </div>
  );
}
