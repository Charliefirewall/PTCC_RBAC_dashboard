/**
 * Role dashboard widgets.
 *
 * Every widget reads numbers that already exist in the stores - none of them re-derives a
 * metric, and none of them invents a threshold. What IS ours is the composition: which of
 * these a role sees, and in what order. That judgement is graded on each panel.
 *
 * The two severity scales stay apart, as everywhere else: alerts use SeverityChip (3
 * levels, L1182), events use EventSeverityBadge (integer 1-5, R1433). No widget here maps
 * one onto the other.
 */

import { useTx } from '../../i18n/t';
import { useMemo, useState, type ReactNode } from 'react';
import {
  Bar,
  Button,
  Empty,
  EvidenceTag,
  EventSeverityBadge,
  Panel,
  SeverityChip,
  StatusPill,
  TierBadge,
  fmtCompact,
  fmtInt,
} from '../../components/primitives';
import { MapCanvas } from '../map/LiveMap';
import { StageChip } from '../agentic/AgentConsole';
import { useAlerts, useComms, useEvents, useSelection, useSettings, useSim, world } from '../../store';
import { AGENTS, isHumanStage, useAgentic, type AgentDecision, type DecisionStage } from '../../store/agentic';
import { PLAYBOOKS } from '../../rules/playbooks';
import { useT } from '../../i18n/t';
import { dict, type I18nKey } from '../../i18n/dict';
import type { Alert, EmergencyEvent, Evidence, OperatorId, PlaybookId, RoleId } from '../../sim/types';
import { WORKFLOW_STAGES } from '../../sim/types';
import { can, type Permission, type WidgetId } from './roles';

// ---------------------------------------------------------------- degenerate-data guards

/**
 * Nothing non-finite may reach the screen.
 *
 * `fmtInt` / `fmtCompact` / `fmtMnt` in components/primitives.tsx print the literal
 * "NaN" for NaN and "Infinity" for ±∞ (they are `toLocaleString` / `String` wrappers with
 * no finiteness check) - and `t(key, params)` interpolates `String(undefined)`, i.e. the
 * word "undefined", into a sentence. That file is not this workstream's to change, so
 * every call site below goes through these four helpers instead. Reported as a defect.
 */
const DASH = '—';
const isNum = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
const nInt = (n: unknown): string => (isNum(n) ? fmtInt(n) : DASH);
const nCompact = (n: unknown): string => (isNum(n) ? fmtCompact(n) : DASH);
/** A percentage or a fixed-point number, em dash when the input is not a real number. */
const nFixed = (n: unknown, d = 1, suffix = ''): string => (isNum(n) ? `${n.toFixed(d)}${suffix}` : DASH);
/** Safe interpolation parameter: never "undefined", never "NaN", never an empty gap. */
const p = (v: unknown): string => {
  if (typeof v === 'number') return isNum(v) ? String(v) : DASH;
  const s = v == null ? '' : String(v);
  return s.trim() ? s : DASH;
};
/** Ratio as a percentage, guarding a zero, absent or non-finite denominator. */
const ratioPct = (num: number, den: number): number => (isNum(num) && isNum(den) && den > 0 ? (num / den) * 100 : 0);
/** 0-1 confidence as a percentage. `undefined` confidence used to render "NaN %". */
const confPct = (c: unknown): string => (isNum(c) ? `${Math.round(c * 100)} %` : DASH);

/**
 * `PLAYBOOKS` and `AGENTS` are total records over their id unions, so these lookups
 * cannot miss while the data is well-formed. They are guarded anyway because a miss
 * costs the whole panel - `pb.recommended` on `undefined` throws inside render, and a
 * throwing widget takes the dashboard down with it, not just itself.
 */
const pbOf = (id: PlaybookId): { recommended: string[]; compulsory: string[] } =>
  PLAYBOOKS[id] ?? { recommended: [], compulsory: [] };

/**
 * A dictionary lookup that cannot throw.
 *
 * `t()` (i18n/t.ts:8) reads `dict[key].mn` with no membership check, so a key built from
 * data - a stage name, a recipient, a playbook action, a role id - takes the whole
 * dashboard down if the record carries a value the dictionary has never heard of. This
 * prints the raw key instead, which is ugly but survivable and obvious in review.
 */
function useTk() {
  const t = useT();
  const tx = useTx();
  return (k: string | undefined, params?: Record<string, string | number>): string =>
    k && k in dict ? t(k as I18nKey, params) : tx(p(k));
}

function AgentName({ id }: { id: string }) {
  const t = useT();
  const k = AGENTS[id as keyof typeof AGENTS]?.nameKey as I18nKey | undefined;
  return <>{k ? t(k) : p(id)}</>;
}

/**
 * How many rows a widget will actually render. A role dashboard panel is a summary, not
 * a table: at a few thousand events the browser spent its frame budget on rows nobody
 * scrolled to. The overflow is never hidden - every capped list states the remainder and
 * points at the screen that holds all of it.
 */
const ROW_CAP = 25;

function MoreRows({ shown, total, href }: { shown: number; total: number; href?: string }) {
  const t = useT();
  if (total <= shown) return null;
  const label = t('dash.e.moreRows', { n: p(total - shown) });
  return href ? (
    <li className="t-meta px-1 py-1">
      <a href={href} className="text-[var(--color-accent)] hover:underline">
        {label}
      </a>
    </li>
  ) : (
    <li className="t-meta px-1 py-1">{label}</li>
  );
}

// ---------------------------------------------------------------- shared shell

function W({
  titleKey,
  evidence,
  cite,
  summary,
  right,
  children,
  bodyClassName = 'px-3 py-2',
}: {
  titleKey: I18nKey;
  evidence: Evidence;
  cite: string;
  summary?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
}) {
  return (
    <Panel
      titleKey={titleKey}
      collapsible
      summary={summary}
      className="min-h-0"
      bodyClassName={bodyClassName}
      right={
        <span className="flex shrink-0 items-center gap-2">
          {right}
          <EvidenceTag label={evidence} cite={cite} />
        </span>
      }
    >
      {children}
    </Panel>
  );
}

function Row({ label, value, tone }: { label: ReactNode; value: ReactNode; tone?: 'ok' | 'warn' | 'crit' }) {
  return (
    <li className="flex items-center justify-between gap-2 py-1">
      {/* D-3: no `truncate`. These rows are label/value pairs of live metrics, and at
          1024 the dashboard columns cut labels like "Mean schedule deviation" in half. */}
      <span className="t-body min-w-0 text-[var(--color-text2)]">{label}</span>
      {tone ? (
        <StatusPill tone={tone}>
          <span className="num">{value}</span>
        </StatusPill>
      ) : (
        // `max-w` + `break-words`: several of these values are free text from the record
        // (playbook id, detection source, a proposed event type). An 80-character one used
        // to push the label out of the panel instead of wrapping inside its own column.
        <span className="num max-w-[60%] shrink-0 break-words text-right font-semibold text-[var(--color-text1)]">{value}</span>
      )}
    </li>
  );
}

/** Actions a role may not take are shown, disabled, with the reason. Hiding them would
 *  hide the fact that permissions differ at all, which is the point being demonstrated. */
function Gated({
  perm,
  role,
  onClick,
  children,
  variant = 'ghost',
}: {
  perm: Permission;
  role: RoleId;
  onClick: () => void;
  children: ReactNode;
  variant?: 'primary' | 'ghost' | 'danger';
}) {
  const t = useT();
  const allowed = can(role, perm);
  return (
    <Button
      size="sm"
      variant={variant}
      disabled={!allowed}
      onClick={onClick}
      title={allowed ? undefined : t('rw.notPermitted', { perm: t(`role.perm.${perm}` as I18nKey) })}
    >
      {children}
    </Button>
  );
}

const openEventsOf = (events: EmergencyEvent[]) => events.filter((e) => e.stage !== 'closure');

/** Highest severity (1) first, then oldest first. Ordering is ours; the scale is R1433. */
const byPriority = (a: EmergencyEvent, b: EmergencyEvent) =>
  a.severity_level - b.severity_level || a.timestamp.localeCompare(b.timestamp);

function openEventHash(id: string): void {
  useSelection.getState().selectEvent(id);
  location.hash = '#/alerts';
}

function EventLine({ e, onClick }: { e: EmergencyEvent; onClick?: () => void }) {
  const tk = useTk();
  return (
    <button
      type="button"
      onClick={onClick ?? (() => openEventHash(e.event_id))}
      className="flex w-full items-center gap-2 px-1 py-1.5 text-left hover:bg-[var(--color-bg2)]"
    >
      <EventSeverityBadge level={e.severity_level} size="sm" />
      <span className="min-w-0 flex-1">
        <span className="t-body block truncate font-medium">{tk(e.event_type)}</span>
        <span className="num t-meta block truncate">
          {p(e.event_id)} · {tk(e.route_number ?? e.bus_number ?? e.location?.label)} · {tk(`ev.stage.${e.stage}`)}
        </span>
      </span>
      <span className="t-meta shrink-0">›</span>
    </button>
  );
}

// ---------------------------------------------------------------- the agent queue

/**
 * D-4, decided in plan 1.5: compose the dashboards from the AGENT DECISION QUEUE as well
 * as from events.
 *
 * A widget that reads only `useEvents` is empty on arrival, and correctly so - an event
 * exists only after an operator validates an alert (L1235). Decisions exist from second
 * one, because `useAgentic` rebuilds them from `useAlerts` on every tick. Nothing below
 * fabricates a row or runs a scenario: every line is a decision the agent layer already
 * holds, read exactly the way AgentConsole reads it.
 */
function useOpenDecisions(): AgentDecision[] {
  const decisions = useAgentic((s) => s.decisions);
  const alerts = useAlerts((s) => s.alerts);
  // alerts arrive sorted by impact_score, so the queue inherits that order for free.
  return useMemo(
    () => alerts.map((a) => decisions[a.id]).filter((d): d is AgentDecision => !!d && !isHumanStage(d.stage)),
    [alerts, decisions],
  );
}

/** The decision the role is working on: top of the queue. Mirrors useFocusEvent(). */
function useFocusDecision(): AgentDecision | undefined {
  return useOpenDecisions()[0];
}

function openAgentConsole(): void {
  location.hash = '#/agentic';
}

function AgentConsoleButton() {
  const t = useT();
  return (
    <Button size="sm" onClick={openAgentConsole}>
      {t('dash.openConsole')}
    </Button>
  );
}

/** One queued decision. The alert's own 3-level scale is used, because that is what
 *  actually exists; the recommended 1-5 event severity is stated as text, never as an
 *  EventSeverityBadge, so the two scales still cannot be read as one (L1182 vs R1433). */
function DecisionLine({ d, alert }: { d: AgentDecision; alert?: Alert }) {
  const t = useT();
  const tk = useTk();
  return (
    <button
      type="button"
      onClick={openAgentConsole}
      className="flex w-full items-center gap-2 px-1 py-1.5 text-left hover:bg-[var(--color-bg2)]"
    >
      {alert ? <SeverityChip severity={alert.severity} size="sm" /> : null}
      <span className="min-w-0 flex-1">
        <span className="t-body block truncate font-medium">
          {alert ? tk(alert.title_key, alert.params) : tk(d.recommendation.event_type)}
        </span>
        <span className="num t-meta block truncate">
          <AgentName id={d.agentId} /> · {confPct(d.confidence)} ·{' '}
          {tk(alert?.vehicle_id ?? alert?.route_id ?? alert?.operator_id ?? d.recommendation.event_type)}
        </span>
      </span>
      <StageChip stage={d.stage} small />
    </button>
  );
}

/** The block every event-based list falls back to. Renders nothing when the queue is
 *  empty, so a genuinely quiet network still shows its own empty state. */
function AgentQueue({ max = 8, rollup = false }: { max?: number; rollup?: boolean }) {
  const t = useT();
  const open = useOpenDecisions();
  const alerts = useAlerts((s) => s.alerts);
  const byId = useMemo(() => new Map(alerts.map((a) => [a.id, a])), [alerts]);
  // Per-agent counts, so a dashboard that carries this block twice says something
  // different the second time instead of repeating the same rows.
  const perAgent = useMemo(() => {
    const acc = new Map<string, number>();
    for (const d of open) acc.set(d.agentId, (acc.get(d.agentId) ?? 0) + 1);
    return [...acc.entries()].sort((x, y) => y[1] - x[1]);
  }, [open]);
  if (open.length === 0) return null;
  const next = open[0]!;
  const nextAlert = byId.get(next.alertIds[0]!);
  return (
    <section className="mt-1 border-t border-[var(--color-line-soft)] pt-1.5">
      <header className="flex items-center gap-2">
        <span className="panel-title truncate" style={{ color: 'var(--color-agent)' }}>
          {t('dash.agentQueue')}
        </span>
        <span className="num t-meta">{nInt(open.length)}</span>
        <span className="ml-auto shrink-0">
          <EvidenceTag
            label="ASSUMPTION"
            cite="the agent framing is ours; each line is an alert the rule engine raised, before the L1235 gate"
          />
        </span>
      </header>
      <p className="t-meta py-0.5">{t('dash.agentQueueNote')}</p>
      <div className="mb-1.5 rounded border-l-2 border-l-[var(--color-agent)] bg-[var(--color-bg2)] px-2 py-1.5" data-role-next-action="">
        <div className="flex flex-wrap items-center gap-2">
          <span className="panel-title" style={{ color: 'var(--color-agent)' }}>{t('rw.nextSafeAction')}</span>
          <span className="t-body min-w-0 flex-1 font-semibold text-[var(--color-text1)]">
            {t(next.recommendation.label.key as I18nKey, next.recommendation.label.params)}
          </span>
          <Button size="sm" onClick={openAgentConsole}>{t('rw.reviewRecommendation')}</Button>
        </div>
        <p className="t-meta mt-0.5">
          {t('rw.nextActionWhy', {
            subject: nextAlert?.vehicle_id ?? nextAlert?.route_id ?? nextAlert?.operator_id ?? next.recommendation.event_type,
            confidence: confPct(next.confidence),
          })}
        </p>
      </div>
      {rollup && (
        <ul className="flex flex-wrap gap-1.5 pb-1">
          {perAgent.map(([id, n]) => (
            <li
              key={id}
              className="t-meta rounded-full border border-[var(--color-line)] px-2 py-0.5"
              style={{ color: 'var(--color-agent)' }}
            >
              <AgentName id={id} /> <span className="num">{nInt(n)}</span>
            </li>
          ))}
        </ul>
      )}
      <ul className="divide-y divide-[var(--color-line-soft)]">
        {open.slice(0, max).map((d) => (
          <li key={d.id}>
            <DecisionLine d={d} alert={byId.get(d.alertIds[0]!)} />
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------- network / ops

/**
 * The "no snapshot yet" state, shared by the four widgets that read the simulation
 * directly. Deliberately NOT a spinner: the metrics are computed synchronously on the
 * tick, so there is nothing to spin for. What it says is what is true - the clock has
 * not produced a snapshot yet, and here is the control that starts it.
 */
function AwaitingTick({ titleKey, cite }: { titleKey: I18nKey; cite: string }) {
  const t = useT();
  const running = useSim((s) => s.running);
  return (
    <W titleKey={titleKey} evidence="CONFIRMED" cite={cite}>
      <Empty title={t('dash.e.waitTitle')} text={running ? t('dash.e.waitText') : t('dash.e.waitPausedText')} />
    </W>
  );
}

function NetworkHealth() {
  const t = useT();
  const m = useSim((s) => s.metrics);
  if (!m) return <AwaitingTick titleKey="rw.networkHealth" cite="S7 KPI tiles" />;
  const offline = m.offline.afc + m.offline.cctv + m.offline.tbox;
  return (
    <W
      titleKey="rw.networkHealth"
      evidence="CONFIRMED"
      cite="S7 KPI tiles"
      summary={nFixed(m.system_health_pct, 1, ' %')}
    >
      <ul className="divide-y divide-[var(--color-line-soft)]">
        <Row label={t('kpi.busesInService')} value={nInt(m.in_service)} />
        <Row label={t('kpi.routesOperating')} value={nInt(m.routes_operating)} />
        <Row label={t('kpi.ridershipToday')} value={nCompact(m.ridership_today)} />
        <Row
          label={t('kpi.systemHealth')}
          value={nFixed(m.system_health_pct, 1, ' %')}
          tone={!isNum(m.system_health_pct) ? undefined : m.system_health_pct >= 98 ? 'ok' : m.system_health_pct >= 95 ? 'warn' : 'crit'}
        />
        <Row
          label={t('rw.devicesOffline')}
          value={nInt(offline)}
          tone={!isNum(offline) ? undefined : offline === 0 ? 'ok' : offline > 30 ? 'crit' : 'warn'}
        />
        <Row label={t('rw.uptime')} value={nFixed(m.network_uptime_pct, 0, ' %')} tone={isNum(m.network_uptime_pct) ? 'ok' : undefined} />
      </ul>
    </W>
  );
}

function OpsKpi() {
  const t = useT();
  const m = useSim((s) => s.metrics);
  if (!m) return <AwaitingTick titleKey="rw.opsKpi" cite="KPIs L1143-L1146" />;
  let w = 0;
  let onTime = 0;
  let bunching = 0;
  let disrupted = 0;
  let dev = 0;
  for (const r of m.per_route.values()) {
    // A route with no vehicles contributes no weight; a route carrying a non-finite
    // metric would poison the whole weighted mean, so it is skipped the same way.
    if (!isNum(r.vehicles) || r.vehicles === 0) continue;
    w += r.vehicles;
    if (isNum(r.on_time_pct)) onTime += r.on_time_pct * r.vehicles;
    if (isNum(r.mean_dev_s)) dev += r.mean_dev_s * r.vehicles;
    if (isNum(r.bunching_count)) bunching += r.bunching_count;
    if (r.state === 'disrupted') disrupted++;
  }
  // w === 0 is the honest "no route is running a vehicle" case: an on-time percentage of
  // a fleet that is not moving is not 0 %, it is unknown. Both render as an em dash.
  const pct = w > 0 ? onTime / w : undefined;
  const devMin = w > 0 ? dev / w / 60 : undefined;
  return (
    <W
      titleKey="rw.opsKpi"
      evidence="INFERRED"
      cite="KPIs L1143-L1146; vehicle weighting is ours"
      summary={`${nFixed(pct, 1, ' %')} ${t('rw.onTime')}`}
    >
      {w === 0 ? (
        <Empty title={t('dash.e.opsIdleTitle')} text={t('dash.e.opsIdleText')} />
      ) : (
        <ul className="divide-y divide-[var(--color-line-soft)]">
          <Row
            label={t('rw.onTime')}
            value={nFixed(pct, 1, ' %')}
            tone={!isNum(pct) ? undefined : pct >= 90 ? 'ok' : pct >= 75 ? 'warn' : 'crit'}
          />
          <Row label={t('rw.meanDev')} value={isNum(devMin) ? `${devMin.toFixed(1)} ${t('unit.min')}` : DASH} />
          <Row label={t('rw.disrupted')} value={nInt(disrupted)} tone={disrupted === 0 ? 'ok' : 'warn'} />
          <Row label={t('rw.bunching')} value={nInt(bunching)} tone={bunching === 0 ? 'ok' : 'warn'} />
        </ul>
      )}
    </W>
  );
}

/** Tier 3 = the repeated-failure pattern counters (L1124), not a threshold breach. */
function AiAlerts() {
  const t = useT();
  const tk = useTk();
  const alerts = useAlerts((s) => s.alerts).filter((a) => a.tier === 3);
  return (
    <W titleKey="rw.aiAlerts" evidence="INFERRED" cite="L1124 pattern detection" summary={nInt(alerts.length)}>
      {alerts.length === 0 ? (
        // Good news, not absence: no repeated-failure pattern is a result the operator
        // wants to read as "clear", which is what tone="ok" says.
        <Empty tone="ok" title={t('dash.e.aiAlertsTitle')} text={t('dash.e.aiAlertsText')} />
      ) : (
        <ul className="divide-y divide-[var(--color-line-soft)]">
          {alerts.slice(0, ROW_CAP).map((a) => (
            <li key={a.id} className="flex items-center gap-2 py-1.5">
              <SeverityChip severity={a.severity} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="t-body block break-words">{tk(a.title_key, a.params)}</span>
                <span className="num t-meta block truncate">{p(a.operator_id ?? a.route_id ?? a.vehicle_id)}</span>
              </span>
              <TierBadge tier={a.tier} />
            </li>
          ))}
          <MoreRows shown={ROW_CAP} total={alerts.length} href="#/alerts" />
        </ul>
      )}
    </W>
  );
}

function ActiveIncidents() {
  const t = useT();
  const events = openEventsOf(useEvents((s) => s.events)).sort(byPriority);
  const open = useOpenDecisions();
  return (
    <W
      titleKey="rw.activeIncidents"
      evidence="CONFIRMED"
      cite="L1246-L1258 event record; the queue block below is the agent layer (plan 1.5)"
      summary={t('dash.eventsAndQueue', { n: events.length, q: open.length })}
    >
      {events.length === 0 && open.length === 0 ? (
        <Empty tone="ok" title={t('dash.e.incidentsTitle')} text={t('dash.e.incidentsText')} />
      ) : (
        <>
          {events.length > 0 && (
            <ul className="divide-y divide-[var(--color-line-soft)]">
              {events.slice(0, 8).map((e) => (
                <li key={e.event_id}>
                  <EventLine e={e} />
                </li>
              ))}
              <MoreRows shown={8} total={events.length} href="#/alerts" />
            </ul>
          )}
          <AgentQueue max={4} rollup />
        </>
      )}
    </W>
  );
}

// ---------------------------------------------------------------- incident manager

function IncidentQueue() {
  const t = useT();
  const role = useSettings((s) => s.role);
  const events = openEventsOf(useEvents((s) => s.events)).sort(byPriority);
  const selected = useSelection((s) => s.event_id);
  const crisis = events.filter((e) => e.severity_level <= 2).length;
  const open = useOpenDecisions();
  return (
    <W
      titleKey="rw.incidentQueue"
      evidence="INFERRED"
      cite="R2919-R2921; queue ordering is ours. The agent queue block is plan 1.5"
      summary={`${t('rw.queueSummary', { n: events.length, crit: crisis })} · ${t('dash.proposedN', { n: open.length })}`}
    >
      {events.length === 0 && open.length === 0 ? (
        <Empty tone="ok" title={t('dash.e.queueTitle')} text={t('dash.e.queueText')} />
      ) : (
        <ol className="divide-y divide-[var(--color-line-soft)]">
          {events.slice(0, ROW_CAP).map((e, i) => (
            <li
              key={e.event_id}
              className={`flex items-center gap-2 py-1.5 ${selected === e.event_id ? 'bg-[var(--color-accent-soft)]' : ''}`}
            >
              <span className="num t-meta w-4 shrink-0 text-right">{i + 1}</span>
              <EventLine e={e} onClick={() => useSelection.getState().selectEvent(e.event_id)} />
              <Gated perm="escalate_event" role={role} onClick={() => openEventHash(e.event_id)}>
                {t('rw.escalate')}
              </Gated>
            </li>
          ))}
          <MoreRows shown={ROW_CAP} total={events.length} href="#/alerts" />
          <AgentQueue />
        </ol>
      )}
    </W>
  );
}

/** The event the role is working on: explicit selection, else the top of the queue. */
function useFocusEvent(): EmergencyEvent | undefined {
  const id = useSelection((s) => s.event_id);
  const events = useEvents((s) => s.events);
  return events.find((e) => e.event_id === id) ?? openEventsOf(events).sort(byPriority)[0];
}

/**
 * What the top of the agent queue proposes, shown where an event would be.
 *
 * Every field is read off the decision the agent layer already built: the recommended
 * event type, severity and playbook are the ones the Validate dialog would be pre-filled
 * with, and the reasoning steps are the stored phrases, rendered - never composed here.
 */
function ProposedDetail({ d, alert }: { d: AgentDecision; alert?: Alert }) {
  const t = useT();
  const tk = useTk();
  const pb = pbOf(d.recommendation.playbook);
  return (
    <W
      titleKey="rw.incidentDetail"
      evidence="INFERRED"
      cite="L1349-L1382 playbooks + the alert's own metric; showing it before validation is plan 1.5"
      summary={t('dash.proposal')}
      right={<StageChip stage={d.stage} small />}
    >
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="t-body font-semibold" style={{ color: 'var(--color-agent)' }}>
            <AgentName id={d.agentId} />
          </span>
          {alert ? <SeverityChip severity={alert.severity} size="sm" /> : null}
          <span className="num t-meta">{tk(d.alertIds[0])}</span>
        </div>
        <p className="t-body break-words text-[var(--color-text2)]">
          {alert ? tk(alert.title_key, alert.params) : tk(d.recommendation.event_type)}
        </p>
        <ul className="divide-y divide-[var(--color-line-soft)]">
          <Row label={t('dash.propType')} value={tk(d.recommendation.event_type)} />
          <Row label={t('dash.propSeverity')} value={p(d.recommendation.severity_level)} />
          <Row label={t('dash.propPlaybook')} value={tk(d.recommendation.playbook)} />
          <Row label={t('dash.propActions')} value={`${pb.recommended.length + pb.compulsory.length} / ${pb.compulsory.length}`} />
          <Row label={t('dash.confidence')} value={confPct(d.confidence)} />
        </ul>
        <div className="rounded border-l-2 border-[var(--color-agent)] bg-[var(--color-bg2)] px-2 py-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="panel-title">{t('dash.why')}</span>
            <EvidenceTag label="CONFIRMED" cite="each step carries the rule and the metric it read" />
          </div>
          <ul className="mt-1 flex flex-col gap-0.5">
            {d.reasoning.map((step, i) => (
              <li key={i} className="t-meta break-words text-[var(--color-text2)]">
                {tk(step.text.key, step.text.params)}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex items-center gap-2">
          <AgentConsoleButton />
          <span className="t-meta">{t('dash.notYetEvent')}</span>
        </div>
      </div>
    </W>
  );
}

function IncidentDetail() {
  const t = useT();
  const tk = useTk();
  const e = useFocusEvent();
  const alerts = useAlerts((s) => s.alerts);
  const d = useFocusDecision();
  if (!e) {
    // D-4: before any validation there is no event, but there is a queue. Show the head
    // of it rather than a dead panel; fall back to the empty state only when both are empty.
    if (d) return <ProposedDetail d={d} alert={alerts.find((a) => a.id === d.alertIds[0])} />;
    return (
      <W titleKey="rw.incidentDetail" evidence="CONFIRMED" cite="L1246-L1258">
        <Empty title={t('dash.e.pickTitle')} text={t('dash.e.detailText')} />
      </W>
    );
  }
  const linked = alerts.filter((a) => e.associated_alert_ids.includes(a.id));
  const comp = e.actions.filter((a) => a.compulsory);
  const done = comp.filter((a) => a.done || a.overridden_by).length;
  return (
    <W titleKey="rw.incidentDetail" evidence="CONFIRMED" cite="L1246-L1258 event record" summary={p(e.event_id)}>
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex items-center gap-2">
          <EventSeverityBadge level={e.severity_level} />
          <span className="num t-meta">{p(e.event_id)}</span>
        </div>
        {/* An operator-typed description has no length limit. `break-words` keeps a
            2 000-character paste inside the panel instead of widening the grid column. */}
        <p className="t-body break-words text-[var(--color-text2)]">{p(e.description)}</p>
        <ul className="divide-y divide-[var(--color-line-soft)]">
          <Row label={t('rw.detectedBy')} value={p(e.detection_source)} />
          <Row label={t('rw.location')} value={p(e.location?.label)} />
          <Row label={t('rw.playbook')} value={p(e.playbook)} />
          <Row label={t('rw.compulsory')} value={`${done} / ${comp.length}`} tone={done === comp.length ? 'ok' : 'warn'} />
          <Row label={t('rw.linkedAlerts')} value={nInt(linked.length)} />
        </ul>
        {/* ASSUMPTION: the wording of this assessment is ours. The facts in it are the
            event's own record - playbook, compulsory-action count, linked alerts. */}
        <div className="rounded border-l-2 border-[var(--color-accent)] bg-[var(--color-bg2)] px-2 py-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="panel-title">{t('rw.assessment')}</span>
            <EvidenceTag label="ASSUMPTION" cite="phrasing ours; facts from the event record" />
          </div>
          <p className="t-body mt-1 break-words text-[var(--color-text2)]">
            {t('rw.assessmentText', {
              playbook: p(e.playbook),
              n: comp.length - done,
              alerts: linked.length,
              stage: tk(`ev.stage.${e.stage}`),
            })}
          </p>
        </div>
      </div>
    </W>
  );
}

/** Escalation and resolution: the seven stages of L1298-L1310, gated by L1346. */
/** The four lifecycle stages the agent layer itself moves through. The fourth is always
 *  the human one - there is no autonomy here (L718, L1235). */
const AGENT_TRACK: DecisionStage[] = ['detected', 'reasoning', 'recommended', 'approved'];

/** Shown in the escalation slot before an event exists: the seven-stage workflow has not
 *  started, so what is live is the decision's own lifecycle. */
function ProposedEscalation({ d }: { d: AgentDecision }) {
  const t = useT();
  const i = AGENT_TRACK.indexOf(d.stage);
  return (
    <W
      titleKey="rw.escalation"
      evidence="CONFIRMED"
      cite="L1298-L1310 stages begin after validation (L1235); the lifecycle shown is the agent's"
      summary={t('dash.lifecycle')}
      right={<StageChip stage={d.stage} small />}
    >
      <ol className="flex flex-col gap-0.5">
        {AGENT_TRACK.map((st, si) => (
          <li key={st} className="flex items-center gap-2">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: si <= i ? 'var(--color-agent)' : 'var(--color-line)' }}
            />
            <span className={`t-body truncate ${si === i ? 'font-semibold text-[var(--color-text1)]' : 'text-[var(--color-text3)]'}`}>
              {t(`ag.stage.${st}` as I18nKey)}
            </span>
          </li>
        ))}
      </ol>
      <p className="t-meta mt-2">{t('dash.thenWorkflow')}</p>
      <div className="mt-2 flex items-center gap-2">
        <AgentConsoleButton />
      </div>
    </W>
  );
}

function Escalation() {
  const t = useT();
  const tk = useTk();
  const role = useSettings((s) => s.role);
  const e = useFocusEvent();
  const d = useFocusDecision();
  /*
   * The blocked list is TIED TO THE EVENT it came from. It used to be a bare string[],
   * so "cannot advance: two compulsory actions outstanding" stayed on screen after the
   * selection moved to a different incident - a warning about an event the panel was no
   * longer showing. Stamping it with the id makes a stale one unrenderable.
   */
  const [blocked, setBlocked] = useState<{ id: string; list: string[] }>({ id: '', list: [] });
  if (!e) {
    if (d) return <ProposedEscalation d={d} />;
    return (
      <W titleKey="rw.escalation" evidence="CONFIRMED" cite="L1298-L1310">
        <Empty title={t('dash.e.pickTitle')} text={t('dash.e.escalationText')} />
      </W>
    );
  }
  const i = WORKFLOW_STAGES.indexOf(e.stage);
  const shownBlocked = blocked.id === e.event_id ? blocked.list : [];
  return (
    <W
      titleKey="rw.escalation"
      evidence="CONFIRMED"
      cite="L1298-L1310 stages, L1346 gating"
      summary={tk(`ev.stage.${e.stage}`)}
    >
      <ol className="flex flex-col gap-0.5">
        {WORKFLOW_STAGES.map((s, si) => (
          <li key={s} className="flex items-center gap-2">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: si <= i ? 'var(--color-accent)' : 'var(--color-line)' }}
            />
            <span className={`t-body truncate ${si === i ? 'font-semibold text-[var(--color-text1)]' : 'text-[var(--color-text3)]'}`}>
              {t(`ev.stage.${s}` as I18nKey)}
            </span>
          </li>
        ))}
      </ol>
      <div className="mt-2 flex items-center gap-2">
        <Gated
          perm="advance_stage"
          role={role}
          variant="primary"
          onClick={() => {
            // Re-read the event: between render and click the simulation may have closed
            // it, and advancing an event that is no longer in the store writes nothing but
            // would still clear a warning the operator has not dealt with.
            if (!useEvents.getState().events.some((x) => x.event_id === e.event_id)) return;
            const r = useEvents.getState().advance(e.event_id, role);
            setBlocked({ id: e.event_id, list: r.ok ? [] : r.blocked });
          }}
        >
          {t('rw.advance')}
        </Gated>
        <Button size="sm" onClick={() => openEventHash(e.event_id)}>{t('rw.openInAlerts')}</Button>
      </div>
      {shownBlocked.length > 0 && (
        <p className="t-meta mt-1.5 break-words text-[var(--color-sev-warn)]">
          {t('rw.blockedBy', { list: shownBlocked.map((k) => tk(k)).join(', ') })}
        </p>
      )}
    </W>
  );
}

// ---------------------------------------------------------------- communication

/**
 * Which playbook actions are communication work. The action vocabulary is the source's
 * (L1349-L1382); the judgement that these seven are the Communication Controller's is
 * ours, so this panel is graded INFERRED.
 */
const COMMS_ACTIONS = new Set([
  'pb.notify_operator_dispatch',
  'pb.notify_traffic_police',
  'pb.notify_authorities',
  'pb.broadcast_update',
  'pb.contact_operator',
  'pb.contact_driver',
  'pb.inform_operator_dispatch',
]);

/** The comms workload the open queue implies. No message is invented - this counts
 *  playbook actions, and says so. */
function useCommsWork(): [string, { n: number; compulsory: boolean }][] {
  const open = useOpenDecisions();
  return useMemo(() => {
    const acc = new Map<string, { n: number; compulsory: boolean }>();
    for (const d of open) {
      const pb = PLAYBOOKS[d.recommendation.playbook];
      for (const k of pb.recommended) if (COMMS_ACTIONS.has(k)) {
        acc.set(k, { n: (acc.get(k)?.n ?? 0) + 1, compulsory: acc.get(k)?.compulsory ?? false });
      }
      for (const k of pb.compulsory) if (COMMS_ACTIONS.has(k)) {
        acc.set(k, { n: (acc.get(k)?.n ?? 0) + 1, compulsory: true });
      }
    }
    return [...acc.entries()].sort((a, b) => b[1].n - a[1].n);
  }, [open]);
}

function QueuedCommsWork({ rows }: { rows: [string, { n: number; compulsory: boolean }][] }) {
  const t = useT();
  const tk = useTk();
  if (rows.length === 0) return null;
  return (
    <section className="mt-1 border-t border-[var(--color-line-soft)] pt-1.5">
      <header className="flex items-center gap-2">
        <span className="panel-title truncate" style={{ color: 'var(--color-agent)' }}>
          {t('dash.commsRequired')}
        </span>
        <span className="ml-auto shrink-0">
          <EvidenceTag label="INFERRED" cite="playbook actions L1349-L1382; classing them as communication work is ours" />
        </span>
      </header>
      <p className="t-meta py-0.5">{t('dash.commsRequiredNote')}</p>
      <ul className="divide-y divide-[var(--color-line-soft)]">
        {rows.map(([k, v]) => (
          <li key={k} className="flex items-center gap-2 py-1">
            <span className="t-body min-w-0 flex-1 truncate text-[var(--color-text2)]">{tk(k)}</span>
            {v.compulsory && (
              <span className="t-meta shrink-0 font-semibold text-[var(--color-sev-warn)]">{t('rw.compulsory')}</span>
            )}
            <span className="num t-meta shrink-0">{t('dash.timesN', { n: v.n })}</span>
          </li>
        ))}
      </ul>
      <div className="mt-1.5">
        <AgentConsoleButton />
      </div>
    </section>
  );
}

function PendingApprovals() {
  const t = useT();
  const role = useSettings((s) => s.role);
  const msgs = useComms((s) => s.passenger).filter((m) => m.status === 'pending_approval');
  const work = useCommsWork();
  return (
    <W
      titleKey="rw.pendingApprovals"
      evidence="CONFIRMED"
      cite="L1443 approval before dispatch; the queue roll-up below is plan 1.5"
      summary={nInt(msgs.length)}
    >
      {msgs.length === 0 ? (
        // Nothing waiting on you is GOOD NEWS in a control room, so it reads as
        // reassurance rather than as a hole. When the roll-up below has rows, the panel
        // is not empty at all - one line is enough and the full-height state would push
        // the actual content off the panel.
        work.length > 0 ? (
          <p className="t-meta py-1">{t('dash.e.approvalsTitle')}</p>
        ) : (
          <Empty tone="ok" title={t('dash.e.approvalsTitle')} text={t('dash.e.approvalsText')} />
        )
      ) : (
        <ul className="divide-y divide-[var(--color-line-soft)]">
          {msgs.slice(0, ROW_CAP).map((m) => (
            <li key={m.message_id} className="flex items-start gap-2 py-1.5">
              <span className="min-w-0 flex-1">
                {/* Wraps: this is the text the operator is being asked to APPROVE, and a
                    truncated message is one they would be approving unread (L1443). */}
                <span className="t-body block">{p(m.content_en)}</span>
                <span className="num t-meta block truncate">{p(m.message_id)} · {p(m.channels?.join(', '))}</span>
              </span>
              <Gated
                perm="approve_message"
                role={role}
                variant="primary"
                onClick={() => {
                  // Double-click protection. `approve()` maps over the list unconditionally
                  // and appends an audit row every time it is called, so two clicks landing
                  // in the same frame wrote the same approval into the audit log twice.
                  // Re-reading the live status is the cheapest honest guard.
                  const cur = useComms.getState().passenger.find((x) => x.message_id === m.message_id);
                  if (cur?.status !== 'pending_approval') return;
                  useComms.getState().approve(m.message_id, role);
                }}
              >
                {t('rw.approve')}
              </Gated>
            </li>
          ))}
          <MoreRows shown={ROW_CAP} total={msgs.length} href="#/comms" />
        </ul>
      )}
      <QueuedCommsWork rows={work} />
    </W>
  );
}

function CommsLog() {
  const t = useT();
  const tk = useTk();
  const msgs = useComms((s) => s.coordination);
  return (
    <W titleKey="rw.commsLog" evidence="CONFIRMED" cite="L1533-L1541 coordination record" summary={nInt(msgs.length)}>
      {msgs.length === 0 ? (
        <Empty title={t('dash.e.commsLogTitle')} text={t('dash.e.commsLogText')} />
      ) : (
        <ul className="divide-y divide-[var(--color-line-soft)]">
          {msgs.slice(0, 10).map((m) => (
            <li key={m.communication_id} className="py-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="t-body min-w-0 truncate font-medium">{tk(`rcpt.${m.recipient}`)}</span>
                <span className="num t-meta shrink-0">{p(m.sent_at?.slice(11, 16))}</span>
              </div>
              <p className="t-meta truncate">{p(m.content)}</p>
            </li>
          ))}
          <MoreRows shown={10} total={msgs.length} href="#/comms" />
        </ul>
      )}
    </W>
  );
}

// ---------------------------------------------------------------- dispatcher

function ResourceStatus() {
  const t = useT();
  const snap = useSim((s) => s.snap);
  if (!snap) return <AwaitingTick titleKey="rw.resourceStatus" cite="ICD vehicle status (R1031-R1043)" />;
  let inService = 0;
  let out = 0;
  let breakdown = 0;
  for (const v of snap.vehicles) {
    if (v.status === 'in_service') inService++;
    else if (v.status === 'breakdown') breakdown++;
    else out++;
  }
  return (
    <W
      titleKey="rw.resourceStatus"
      evidence="CONFIRMED"
      cite="ICD vehicle status (R1031-R1043)"
      summary={`${nInt(inService)} / ${nInt(snap.vehicles.length)}`}
    >
      <ul className="divide-y divide-[var(--color-line-soft)]">
        <Row label={t('rw.inService')} value={nInt(inService)} tone="ok" />
        <Row label={t('rw.outOfService')} value={nInt(out)} tone={out > 0 ? 'warn' : 'ok'} />
        <Row label={t('rw.breakdown')} value={nInt(breakdown)} tone={breakdown > 0 ? 'crit' : 'ok'} />
      </ul>
    </W>
  );
}

/**
 * Dispatch recommendations.
 *
 * The action vocabulary is the source's own - R2885 names "Deploy standby buses",
 * "Suspend route X", "Activate diversion Y" and explicitly forbids vague instructions.
 * WHICH action follows WHICH alert type is our mapping, not the source's: ASSUMPTION.
 */
const REC_FOR: Record<Alert['type'], I18nKey> = {
  overcrowding: 'rw.recStandby',
  service_deviation: 'rw.recDiversion',
  vehicle_safety: 'rw.recInspector',
  security: 'rw.recInspector',
  equipment_failure: 'rw.recSwap',
};

function DispatchRecs() {
  const t = useT();
  const tk = useTk();
  const role = useSettings((s) => s.role);
  const alerts = useAlerts((s) => s.alerts).filter((a) => a.severity !== 'informational').slice(0, 6);
  return (
    <W
      titleKey="rw.dispatchRecs"
      evidence="ASSUMPTION"
      cite="action vocabulary R2885/R2929; alert→action mapping is ours"
      summary={nInt(alerts.length)}
    >
      {alerts.length === 0 ? (
        // No warning or critical alert to act on: reassurance, not a void.
        <Empty tone="ok" title={t('dash.e.recsTitle')} text={t('dash.e.recsText')} />
      ) : (
        <ul className="divide-y divide-[var(--color-line-soft)]">
          {alerts.map((a) => (
            <li key={a.id} className="flex items-center gap-2 py-1.5">
              <SeverityChip severity={a.severity} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="t-body block truncate font-medium">{tk(REC_FOR[a.type])}</span>
                <span className="num t-meta block truncate">
                  {p(a.vehicle_id ?? a.route_id ?? a.operator_id)} · {tk(a.title_key, a.params)}
                </span>
              </span>
              <Gated
                perm="assign_resource"
                role={role}
                onClick={() => {
                  if (a.vehicle_id) {
                    useSelection.getState().selectVehicle(a.vehicle_id);
                    location.hash = `#/vehicle/${a.vehicle_id}`;
                  } else location.hash = '#/map';
                }}
              >
                {t('rw.assign')}
              </Gated>
            </li>
          ))}
        </ul>
      )}
    </W>
  );
}

// ---------------------------------------------------------------- field inspector

/** "Assigned" = the workflow stages at which ground verification is live (L1298-L1310).
 *  No source assigns a named inspector to a named incident, so nothing is invented here. */
const assignedOf = (events: EmergencyEvent[]) =>
  events.filter((e) => e.stage === 'response_assignment' || e.stage === 'response_monitoring').sort(byPriority);

function AssignedIncidents() {
  const t = useT();
  const events = assignedOf(useEvents((s) => s.events));
  const open = useOpenDecisions();
  return (
    <W
      titleKey="rw.assignedIncidents"
      evidence="INFERRED"
      cite="R2906/R2917 ground verification; stage filter is ours. Agent queue block is plan 1.5"
      summary={t('dash.eventsAndQueue', { n: events.length, q: open.length })}
    >
      {events.length === 0 && open.length === 0 ? (
        // Nothing assigned to this inspector is good news, not a missing feature.
        <Empty tone="ok" title={t('dash.e.assignedTitle')} text={t('dash.e.assignedText')} />
      ) : (
        <>
          {events.length > 0 && (
            <ul className="divide-y divide-[var(--color-line-soft)]">
              {events.slice(0, ROW_CAP).map((e) => (
                <li key={e.event_id}>
                  <EventLine e={e} onClick={() => useSelection.getState().selectEvent(e.event_id)} />
                </li>
              ))}
              <MoreRows shown={ROW_CAP} total={events.length} href="#/alerts" />
            </ul>
          )}
          <AgentQueue max={6} />
        </>
      )}
    </W>
  );
}

/**
 * MapCanvas brings its own Panel and legend, so it is NOT wrapped in `W` - nesting it
 * produced a panel inside a panel. The explicit pixel height matters: MapLibre sizes its
 * canvas once at init, and in an auto-height grid row that measured zero and the map
 * rendered blank.
 */
function FieldMap() {
  return (
    <div className="h-[320px]">
      <MapCanvas className="h-full" />
    </div>
  );
}

/** The checklist the incident will carry once validated - the playbook the agent
 *  recommends, verbatim from L1349-L1382. Read-only: there is no event to write to yet,
 *  so nothing here is checkable and nothing is invented. */
function ProposedChecklist({ d }: { d: AgentDecision }) {
  const t = useT();
  const tk = useTk();
  const pb = pbOf(d.recommendation.playbook);
  const items = [
    ...pb.recommended.map((k) => ({ k, compulsory: false })),
    ...pb.compulsory.map((k) => ({ k, compulsory: true })),
  ];
  return (
    <W
      titleKey="rw.inspectionChecklist"
      evidence="CONFIRMED"
      cite="L1349-L1382 playbook actions; shown before validation per plan 1.5"
      summary={`${t('dash.playbookPreview')} · ${nInt(items.length)}`}
      right={<StageChip stage={d.stage} small />}
    >
      <p className="t-meta pb-1">{t('dash.playbookPreviewNote')}</p>
      <ul className="flex flex-col gap-1">
        {items.map((a) => (
          <li key={a.k} className="flex items-center gap-2">
            <input type="checkbox" checked={false} disabled readOnly title={t('dash.notYetEvent')} />
            <span className="t-body min-w-0 flex-1 truncate">{tk(a.k)}</span>
            {a.compulsory && (
              <span className="t-meta shrink-0 font-semibold text-[var(--color-sev-warn)]">{t('rw.compulsory')}</span>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-2 flex items-center gap-2">
        <AgentConsoleButton />
        <span className="t-meta">{t('dash.notYetEvent')}</span>
      </div>
    </W>
  );
}

function InspectionChecklist() {
  const t = useT();
  const tk = useTk();
  const role = useSettings((s) => s.role);
  const e = useFocusEvent();
  const d = useFocusDecision();
  const allowed = can(role, 'complete_action');
  if (!e) {
    if (d) return <ProposedChecklist d={d} />;
    return (
      <W titleKey="rw.inspectionChecklist" evidence="CONFIRMED" cite="L1346 compulsory actions">
        <Empty title={t('dash.e.pickTitle')} text={t('dash.e.checklistText')} />
      </W>
    );
  }
  const done = e.actions.filter((a) => a.done || a.overridden_by).length;
  return (
    <W
      titleKey="rw.inspectionChecklist"
      evidence="CONFIRMED"
      cite="L1346 compulsory actions gate closure"
      summary={`${done} / ${e.actions.length}`}
    >
      {e.actions.length === 0 ? (
        <Empty title={t('dash.e.actionsTitle')} text={t('dash.e.actionsText')} />
      ) : (
        <ul className="flex flex-col gap-1">
          {e.actions.map((a) => (
            <li key={a.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={a.done}
                /*
                 * `a.done` added to the disabled set. `completeAction()` sets done:true and
                 * appends an audit row EVERY time it is called, so clicking a ticked box -
                 * which a checkbox invites, it looks like "untick" - wrote a second
                 * "complete_action" line for work that was already complete. There is no
                 * un-complete operation in the store, so the control must not offer one.
                 * Same shape as the Emergency Handling screen (Alerts.tsx, `disabled={a.done}`).
                 */
                disabled={!allowed || a.done || Boolean(a.overridden_by)}
                onChange={() => {
                  // And re-read: the event can close between render and click.
                  const live = useEvents.getState().events.find((x) => x.event_id === e.event_id);
                  const act = live?.actions.find((x) => x.id === a.id);
                  if (!act || act.done || act.overridden_by) return;
                  useEvents.getState().completeAction(e.event_id, a.id, role);
                }}
                title={allowed ? undefined : t('rw.notPermitted', { perm: t('role.perm.complete_action') })}
              />
              <span className={`t-body min-w-0 flex-1 truncate ${a.done ? 'text-[var(--color-text3)] line-through' : ''}`}>
                {tk(a.label_key)}
              </span>
              {a.compulsory && (
                <span className="t-meta shrink-0 font-semibold text-[var(--color-sev-warn)]">{t('rw.compulsory')}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </W>
  );
}

/** The same generator as FieldInstructions, run off the queued decision instead of an
 *  event: location comes from the alert's own subject, the steps from the playbook. */
function ProposedInstructions({ d, alert }: { d: AgentDecision; alert?: Alert }) {
  const t = useT();
  const tk = useTk();
  const pb = pbOf(d.recommendation.playbook);
  const subject = alert?.vehicle_id ?? alert?.route_id ?? alert?.operator_id ?? d.recommendation.event_type;
  return (
    <W
      titleKey="rw.fieldInstructions"
      evidence="ASSUMPTION"
      cite="generated from the recommended playbook and the alert subject; no source text"
      summary={p(d.alertIds[0])}
      right={<StageChip stage={d.stage} small />}
    >
      <ol className="flex list-decimal flex-col gap-1 pl-4">
        <li className="t-body break-words text-[var(--color-text2)]">{t('rw.fi1', { loc: p(subject) })}</li>
        <li className="t-body break-words text-[var(--color-text2)]">
          {t('rw.fi2', { type: p(d.recommendation.event_type), level: p(d.recommendation.severity_level) })}
        </li>
        {pb.compulsory.slice(0, 3).map((k) => (
          <li key={k} className="t-body text-[var(--color-text2)]">{tk(k)}</li>
        ))}
        <li className="t-body break-words text-[var(--color-text2)]">{t('rw.fi3')}</li>
      </ol>
      <p className="t-meta mt-2">{t('dash.notYetEvent')}</p>
    </W>
  );
}

function FieldInstructions() {
  const t = useT();
  const tk = useTk();
  const e = useFocusEvent();
  const d = useFocusDecision();
  const alerts = useAlerts((s) => s.alerts);
  if (!e) {
    if (d) return <ProposedInstructions d={d} alert={alerts.find((a) => a.id === d.alertIds[0])} />;
    return (
      <W titleKey="rw.fieldInstructions" evidence="ASSUMPTION" cite="wording ours">
        <Empty title={t('dash.e.pickTitle')} text={t('dash.e.instrText')} />
      </W>
    );
  }
  const pending = e.actions.filter((a) => !a.done && !a.overridden_by);
  // ASSUMPTION: no source specifies field-instruction text. These lines are generated
  // from the event's own playbook and outstanding actions - nothing else is added.
  return (
    <W titleKey="rw.fieldInstructions" evidence="ASSUMPTION" cite="generated from the event playbook; no source text" summary={p(e.event_id)}>
      <ol className="flex list-decimal flex-col gap-1 pl-4">
        <li className="t-body break-words text-[var(--color-text2)]">{t('rw.fi1', { loc: p(e.location?.label) })}</li>
        <li className="t-body break-words text-[var(--color-text2)]">{t('rw.fi2', { type: p(e.event_type), level: p(e.severity_level) })}</li>
        {pending.slice(0, 4).map((a) => (
          <li key={a.id} className="t-body text-[var(--color-text2)]">{tk(a.label_key)}</li>
        ))}
        <li className="t-body break-words text-[var(--color-text2)]">{t('rw.fi3')}</li>
      </ol>
    </W>
  );
}

function EvidenceBundle() {
  const t = useT();
  const role = useSettings((s) => s.role);
  const e = useFocusEvent();
  if (!e) {
    return (
      <W titleKey="rw.evidenceBundle" evidence="CONFIRMED" cite="L1384-L1392 evidence bundle">
        <Empty title={t('dash.e.pickTitle')} text={t('dash.e.evidenceText')} />
      </W>
    );
  }
  return (
    <W
      titleKey="rw.evidenceBundle"
      evidence="CONFIRMED"
      cite="L1384-L1392 evidence bundle keyed by event id"
      summary={nInt(e.evidence.length)}
    >
      {e.evidence.length === 0 ? (
        <Empty title={t('dash.e.bundleTitle')} text={t('dash.e.bundleText')} />
      ) : (
        <ul className="divide-y divide-[var(--color-line-soft)]">
          {e.evidence.slice(0, ROW_CAP).map((ev, i) => (
            <li key={i} className="flex items-center justify-between gap-2 py-1">
              <span className="t-body min-w-0 truncate text-[var(--color-text2)]">{p(ev.kind)}</span>
              <span className="num t-meta max-w-[55%] shrink-0 truncate">{p(ev.ref)}</span>
            </li>
          ))}
          <MoreRows shown={ROW_CAP} total={e.evidence.length} />
        </ul>
      )}
      <div className="mt-2 rounded border border-dashed border-[var(--color-line)] bg-[var(--color-bg2)] p-2" data-evidence-upload-preview="">
        <div className="flex flex-wrap items-center gap-2">
          <span className="panel-title">{t('rw.uploadPreview')}</span>
          <EvidenceTag label="FUTURE" cite="no upload path exists in this demo" />
        </div>
        <p className="t-meta mt-1">{t('rw.uploadFuture')}</p>
        <p className="t-meta mt-1">{t('rw.uploadRequirements')}</p>
        {!can(role, 'upload_evidence') && <p className="t-meta mt-1 text-[var(--color-sev-warn)]">{t('rw.notPermittedShort')}</p>}
      </div>
    </W>
  );
}

// ---------------------------------------------------------------- bus operator OCC

function FleetDeployment() {
  const t = useT();
  const snap = useSim((s) => s.snap);
  if (!snap) return <AwaitingTick titleKey="rw.fleetDeployment" cite="R2907 execute fleet deployment" />;
  const acc: Record<OperatorId, { total: number; live: number }> = {
    A: { total: 0, live: 0 },
    B: { total: 0, live: 0 },
    C: { total: 0, live: 0 },
  };
  for (const v of snap.vehicles) {
    const op = world.routeById.get(v.route_id)?.operator_id ?? v.operator_id;
    // A vehicle whose operator is not one of the three known ones would have thrown on
    // `acc[op].total++`. It is counted nowhere rather than taking the panel down; the
    // three bars still add up to what they claim, because each states its own total.
    const bucket = acc[op as OperatorId];
    if (!bucket) continue;
    bucket.total++;
    if (v.status === 'in_service') bucket.live++;
  }
  const all = (['A', 'B', 'C'] as OperatorId[]).map((op) => ({ op, ...acc[op] }));
  const live = all.reduce((s, r) => s + r.live, 0);
  return (
    <W
      titleKey="rw.fleetDeployment"
      evidence="INFERRED"
      cite="R2907 execute fleet deployment; per-operator split is ours"
      summary={nInt(live)}
    >
      <ul className="flex flex-col gap-2">
        {all.map((r) => {
          // An operator with no vehicles in the snapshot: 0/0 is not 0 %, it is nothing
          // to report. The bar sits at zero and the figure reads as an em dash.
          const pct = ratioPct(r.live, r.total);
          return (
            <li key={r.op} className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="t-body text-[var(--color-text2)]">{t('rw.operator', { op: r.op })}</span>
                <span className="num t-meta">
                  {nInt(r.live)} / {nInt(r.total)} · {r.total > 0 ? nFixed(pct, 0, ' %') : DASH}
                </span>
              </div>
              <Bar pct={pct} color={pct >= 95 ? 'var(--color-sev-ok)' : pct >= 85 ? 'var(--color-sev-warn)' : 'var(--color-sev-crit)'} />
            </li>
          );
        })}
      </ul>
    </W>
  );
}

// ---------------------------------------------------------------- supervisor

function OverrideReview() {
  const t = useT();
  const tk = useTk();
  const events = useEvents((s) => s.events);
  const overridden = events.flatMap((e) =>
    e.actions.filter((a) => a.overridden_by).map((a) => ({ e, a })),
  );
  const blocked = events
    .filter((e) => e.stage !== 'closure')
    .reduce((n, e) => n + e.actions.filter((a) => a.compulsory && !a.done && !a.overridden_by).length, 0);
  return (
    <W
      titleKey="rw.overrideReview"
      evidence="CONFIRMED"
      cite="L1347 supervisor override + justification + audit"
      summary={nInt(overridden.length)}
    >
      <ul className="divide-y divide-[var(--color-line-soft)]">
        <Row label={t('rw.blockedCompulsory')} value={nInt(blocked)} tone={blocked === 0 ? 'ok' : 'warn'} />
      </ul>
      {overridden.length === 0 ? (
        <p className="t-meta mt-2">{t('rw.noOverrides')}</p>
      ) : (
        <ul className="mt-2 divide-y divide-[var(--color-line-soft)]">
          {overridden.slice(0, ROW_CAP).map(({ e, a }) => (
            <li key={`${e.event_id}/${a.id}`} className="py-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="t-body min-w-0 truncate">{tk(a.label_key)}</span>
                <span className="num t-meta shrink-0">{p(e.event_id)}</span>
              </div>
              {/* The justification is free text with a 10-character floor and no ceiling
                  (L1347). `truncate` on one line hid the reason the override was granted,
                  which is the whole point of the record - clamped to three lines instead. */}
              <p className="t-meta break-words" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {t('ev.overriddenBy', { by: p(a.overridden_by) })} — “{p(a.justification)}”
              </p>
            </li>
          ))}
          <MoreRows shown={ROW_CAP} total={overridden.length} href="#/alerts" />
        </ul>
      )}
    </W>
  );
}

function AuditLog() {
  const t = useT();
  const tk = useTk();
  const tx = useTx();
  const audit = useEvents((s) => s.audit);
  return (
    <W titleKey="rw.auditLog" evidence="CONFIRMED" cite="L1298-L1310 every stage logged" summary={nInt(audit.length)}>
      {audit.length === 0 ? (
        <Empty title={t('dash.e.auditTitle')} text={t('dash.e.auditText')} />
      ) : (
        <ul className="divide-y divide-[var(--color-line-soft)]">
          {audit.slice(0, 12).map((a, i) => (
            <li key={i} className="flex items-center gap-2 py-1">
              <span className="num t-meta w-10 shrink-0">{p(a.at?.slice(11, 16))}</span>
              <span className="t-body min-w-0 flex-1 truncate">{tx(p(a.action))}</span>
              <span className="num t-meta max-w-[35%] shrink-0 truncate">{tk(`role.${a.role}`)}</span>
            </li>
          ))}
          <MoreRows shown={12} total={audit.length} href="#/alerts" />
        </ul>
      )}
    </W>
  );
}

// ---------------------------------------------------------------- catalogue

/** `span` is columns of a 4-column grid at workstation width. */
export const WIDGETS: Record<WidgetId, { span: number; Comp: () => ReactNode }> = {
  networkHealth: { span: 1, Comp: NetworkHealth },
  opsKpi: { span: 1, Comp: OpsKpi },
  aiAlerts: { span: 2, Comp: AiAlerts },
  activeIncidents: { span: 2, Comp: ActiveIncidents },
  incidentQueue: { span: 2, Comp: IncidentQueue },
  incidentDetail: { span: 2, Comp: IncidentDetail },
  escalation: { span: 2, Comp: Escalation },
  pendingApprovals: { span: 2, Comp: PendingApprovals },
  commsLog: { span: 2, Comp: CommsLog },
  resourceStatus: { span: 1, Comp: ResourceStatus },
  dispatchRecs: { span: 3, Comp: DispatchRecs },
  assignedIncidents: { span: 2, Comp: AssignedIncidents },
  fieldMap: { span: 2, Comp: FieldMap },
  inspectionChecklist: { span: 2, Comp: InspectionChecklist },
  fieldInstructions: { span: 2, Comp: FieldInstructions },
  evidenceBundle: { span: 2, Comp: EvidenceBundle },
  fleetDeployment: { span: 2, Comp: FleetDeployment },
  auditLog: { span: 2, Comp: AuditLog },
  overrideReview: { span: 2, Comp: OverrideReview },
};
