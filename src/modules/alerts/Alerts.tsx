/**
 * Module 6 - Alerts & Events.
 *
 * The governance module. Two tabs, deliberately different visual families:
 *
 *  - Alerts carry the THREE-level scale (L1182-L1185) and a round SeverityChip.
 *  - Events carry the FIVE-level integer scale (R1433-R1440) and a hexagon badge.
 *
 * The scales are never merged. An automated alert is NOT an event: an operator must
 * validate it against telemetry, route status, CCTV and driver comms first (L1235).
 *
 * L1346: compulsory actions gate stage progression and closure.
 * L1347: only a supervisor may override, and the override records a justification
 *        and writes to the audit log.
 * L718:  PTCC is not a command authority - it validates, requests, informs,
 *        coordinates and records. The action vocabulary here reflects that.
 */

import { useMemo, useState, type ReactNode } from 'react';
import { useAlerts, useComms, useEvents, useSelection, useSettings, useSim } from '../../store';
import { useForecast } from '../../store/forecast';
import { HORIZONS, type Horizon } from '../../rules/forecast';
import { can } from '../roles/roles';
import { drillHref, LevelBadge } from './sop';
import { HorizonMatrix, openHowItWorks, ScorecardPanel, WatchList } from './ForecastParts';
import { cancelL1, useSop } from '../../store/sop';
import type { ForecastAlert } from '../../rules/forecast';
import type {
  ActionItem,
  Alert,
  AlertType,
  EmergencyEvent,
  EventCategory,
  EventSeverity,
  PlaybookId,
  Severity,
  WorkflowStage,
} from '../../sim/types';
import { WORKFLOW_STAGES } from '../../sim/types';
import {
  PLAYBOOKS,
  categoryFor,
  eventTypeForAlert,
  gateStageFor,
  playbookFor,
  suggestSeverity,
} from '../../rules/playbooks';
import { hhmm, hhmmss, simSecondsOf } from '../../sim/engine';
import type { I18nKey } from '../../i18n/dict';
import { t as tr, useT } from '../../i18n/t';
import {
  Empty,
  EventSeverityBadge,
  EvidenceTag,
  Panel,
  SeverityChip,
  StatusPill,
  Stepper,
  type Step,
  fmtInt,
} from '../../components/primitives';
import { Icon } from '../../components/Icon';
import AgentConsole, { AlertDecisionBadge } from '../agentic/AgentConsole';
import { overlay } from '../../store/overlay';

const ALERT_TYPES: AlertType[] = [
  'service_deviation',
  'overcrowding',
  'vehicle_safety',
  'equipment_failure',
  'security',
];
const SEVERITIES: Severity[] = ['informational', 'warning', 'critical'];
const CATEGORIES: EventCategory[] = ['operational', 'safety', 'security', 'equipment'];
const EVENT_SEVERITIES: EventSeverity[] = [1, 2, 3, 4, 5];
/** L1235: manual detection sources - not everything arrives as telemetry. */
const MANUAL_SOURCES = ['call_centre', 'driver', 'traffic_police', 'tcc'] as const;

/*
 * The local <Modal> that used to live here was one half of defect D-2: a second
 * `position: fixed` node at var(--z-modal), sibling to the presenter-help panel, with
 * its own scrim and no Escape handler. Every dialog below now renders its BODY only,
 * through the single modal slot in app/OverlayHost.tsx. Governance logic is untouched.
 */

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="panel-title">{label}</span>
      {children}
    </label>
  );
}

const INPUT =
  'w-full rounded border border-[var(--color-line)] bg-[var(--color-bg2)] px-2 py-1 text-[12px] text-[var(--color-text1)] outline-none focus:border-[var(--color-accent)]';

const BTN =
  'rounded border border-[var(--color-line)] px-2 py-1 text-[11px] font-medium text-[var(--color-text2)] hover:border-[var(--color-accent)] hover:text-[var(--color-text1)] disabled:cursor-not-allowed disabled:opacity-40';

// ---------------------------------------------------------------- degenerate data

/**
 * Nothing non-finite reaches the screen, and nothing nullish reaches `t()`.
 *
 * `fmtInt` in components/primitives returns the STRING "NaN" for a NaN or Infinity
 * input, and `t(key, params)` interpolates a nullish param as the literal "undefined" -
 * both render perfectly and say nothing true. That primitive is not owned by this
 * change, so the guard sits at every call site below instead.
 */
const DASH = '—';
const num = (n: number | undefined | null, fmt: (x: number) => string = fmtInt): string =>
  typeof n === 'number' && Number.isFinite(n) ? fmt(n) : DASH;
const str = (s: string | undefined | null): string => (s && s.trim() ? s : DASH);

/**
 * Identifiers are feed data, so their length is not ours to assume. A CSS `line-clamp`
 * does not save us here: these spans are flex items, and a flex item's `-webkit-box`
 * display is blockified, which silently disables the clamp. Cutting the STRING is the
 * fix that actually holds - an over-long id made one worklist row taller than the
 * viewport and pushed every other alert off the screen.
 */
const ID_MAX = 48;
const id = (s: string | undefined | null): string => {
  const v = str(s);
  return v.length > ID_MAX ? `${v.slice(0, ID_MAX)}…` : v;
};

/**
 * A worklist is a thing an operator works through, not a thing a browser renders ten
 * thousand of. The count in the panel header stays truthful (it counts the whole list),
 * and the note below the cap says what is being held back and how to reach it.
 */
const MAX_WORKLIST_GROUPS = 100;
/** Same reasoning for the audit log: it only grows, and the panel is 200 px tall. */
const MAX_AUDIT_ROWS = 200;

// ---------------------------------------------------------------- module

export default function Alerts() {
  const t = useT();
  const [tab, setTab] = useState<'alerts' | 'forecast' | 'events' | 'agents'>('alerts');

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex shrink-0 items-center gap-2">
        {/* Plain tabs: the two scales must LOOK different, so each tab carries its own
            severity family rather than a shared neutral chrome. */}
        <button
          type="button"
          onClick={() => setTab('alerts')}
          className={`flex items-center gap-2 rounded-t border-b-2 px-3 py-1.5 text-[12px] font-semibold ${
            tab === 'alerts'
              ? 'border-[var(--color-sev-warn)] text-[var(--color-text1)]'
              : 'border-transparent text-[var(--color-text3)] hover:text-[var(--color-text2)]'
          }`}
        >
          <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[var(--color-sev-warn)]" aria-hidden />
          {t('alerts.tabAlerts')}
        </button>
        {/* PTCC scenario 2: same table, forecast rows, different colour. */}
        <button
          type="button"
          data-tab="forecast"
          onClick={() => setTab('forecast')}
          className={`flex items-center gap-2 rounded-t border-b-2 px-3 py-1.5 text-[12px] font-semibold ${
            tab === 'forecast'
              ? 'border-[var(--color-forecast)] text-[var(--color-text1)]'
              : 'border-transparent text-[var(--color-text3)] hover:text-[var(--color-text2)]'
          }`}
        >
          <span className="inline-flex h-2.5 w-2.5 rounded-full border-2 border-dashed border-[var(--color-forecast)]" aria-hidden />
          {t('fc.tab')}
        </button>
        <button
          type="button"
          onClick={() => setTab('events')}
          className={`flex items-center gap-2 rounded-t border-b-2 px-3 py-1.5 text-[12px] font-semibold ${
            tab === 'events'
              ? 'border-[var(--color-ev-high)] text-[var(--color-text1)]'
              : 'border-transparent text-[var(--color-text3)] hover:text-[var(--color-text2)]'
          }`}
        >
          <span
            className="inline-flex h-3 w-3 bg-[var(--color-ev-high)]"
            style={{ clipPath: 'polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%)' }}
            aria-hidden
          />
          {t('alerts.tabEvents')}
        </button>
        {/* Third family: the AI layer. Violet, used nowhere else, so "an agent did
            this" is never confused with either severity scale. */}
        <button
          type="button"
          onClick={() => setTab('agents')}
          className={`flex items-center gap-2 rounded-t border-b-2 px-3 py-1.5 text-[12px] font-semibold ${
            tab === 'agents'
              ? 'border-[var(--color-agent)] text-[var(--color-text1)]'
              : 'border-transparent text-[var(--color-text3)] hover:text-[var(--color-text2)]'
          }`}
        >
          <span
            className="inline-flex h-2.5 w-2.5 bg-[var(--color-agent)]"
            style={{ clipPath: 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)' }}
            aria-hidden
          />
          {t('ag.tab')}
        </button>
        <span className="ml-auto text-[10px] text-[var(--color-text3)]">{t('alerts.scalesNote')}</span>
      </div>

      {tab === 'alerts' ? <AlertsTab /> : tab === 'forecast' ? <ForecastTab /> : tab === 'events' ? <EventsTab /> : <AgentsTab />}
    </div>
  );
}

// ---------------------------------------------------------------- tab C: agents

/**
 * The agent lifecycle, over the same live alerts the first tab lists.
 *
 * "Modify" deliberately hands over to the EXISTING validation dialog: the operator
 * writes their own event type, severity and description there. The agent's proposal
 * is a starting point, never a commitment (L1235).
 */
function AgentsTab() {
  const t = useT();
  return (
    <AgentConsole
      onModify={(id) => openValidate(t('ev.validateTitle'), id)}
    />
  );
}

// ---------------------------------------------------------------- tab A: alerts

function AlertsTab() {
  const t = useT();
  const alerts = useAlerts((s) => s.alerts);
  const now_s = useSim((s) => s.snap?.sim_time_s ?? 0);
  const [sev, setSev] = useState<Severity | 'all'>('all');
  const [type, setType] = useState<AlertType | 'all'>('all');

  // already sorted by impact_score upstream - filtering preserves that order
  const rows = useMemo(
    () => alerts.filter((a) => (sev === 'all' || a.severity === sev) && (type === 'all' || a.type === type)),
    [alerts, sev, type],
  );
  const groups = useMemo(() => buildWorklist(rows), [rows]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="panel flex shrink-0 flex-wrap items-center gap-3 px-3 py-2">
        <span className="panel-title">{t('alerts.filters')}</span>
        <select
          aria-label={t('alerts.filterSeverity')}
          className={`${INPUT} w-auto`}
          value={sev}
          onChange={(e) => setSev(e.target.value as Severity | 'all')}
        >
          <option value="all">{t('alerts.all')}</option>
          {SEVERITIES.map((s) => (
            <option key={s} value={s}>
              {t(`sev.${s}` as I18nKey)}
            </option>
          ))}
        </select>
        <select
          aria-label={t('alerts.filterType')}
          className={`${INPUT} w-auto`}
          value={type}
          onChange={(e) => setType(e.target.value as AlertType | 'all')}
        >
          <option value="all">{t('alerts.all')}</option>
          {ALERT_TYPES.map((x) => (
            <option key={x} value={x}>
              {t(`alerts.type.${x}` as I18nKey)}
            </option>
          ))}
        </select>
        <span className="num text-[11px] text-[var(--color-text2)]">{t('alerts.count', { n: num(rows.length) })}</span>
        <span className="ml-auto flex items-center gap-2">
          <EvidenceTag label="CONFIRMED" cite="L1175" />
          <span className="text-[10px] text-[var(--color-text3)]">{t('alerts.ruleDerived')}</span>
        </span>
      </div>

      <Panel
        titleKey="alerts.priority"
        className="min-h-0 flex-1"
        right={<span className="t-meta">{t('wl.rowsNote', { rows: num(groups.length), alerts: num(rows.length) })}</span>}
      >
        {groups.length === 0 ? (
          <Empty tone="ok" title={t('alerts.none')} text={t('alerts.noneHint')} />
        ) : (
          <ul data-worklist="">
            {groups.slice(0, MAX_WORKLIST_GROUPS).map((g) => (
              <WorklistGroup key={g.key} g={g} now_s={now_s} />
            ))}
            {groups.length > MAX_WORKLIST_GROUPS ? (
              <li className="t-meta border-t border-[var(--color-line)] px-3 py-2 text-center">
                {t('wl.showingTop', { n: num(MAX_WORKLIST_GROUPS), total: num(groups.length) })}
              </li>
            ) : null}
          </ul>
        )}
      </Panel>
    </div>
  );
}

// ---------------------------------------------------------------- tab B: forecast

/**
 * PTCC scenario 2: "the table of alert can be the same except that it provides forecast
 * of possible alert for 15 / 30 / 45 min and 1 hr, all given a confidence level".
 *
 * Same worklist and row as the live tab, fed from useForecast - never from useAlerts. A
 * forecast row cannot be validated into an event or trigger an SOP action: it has a
 * Drill button and nothing else.
 */
function ForecastTab() {
  const t = useT();
  const [h, setH] = useState<Horizon>(15);
  const [view, setView] = useState<'list' | 'matrix'>('list');
  const rows = useForecast((s) => s.byHorizon[h]);
  const now_s = useSim((s) => s.snap?.sim_time_s ?? 0);
  const pMin = useSettings((s) => s.th.forecast_min_probability_pct);
  const dow = useSettings((s) => s.dow);
  const groups = useMemo(() => buildWorklist(rows), [rows]);
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2" data-forecast-tab="">
      <div className="panel flex shrink-0 flex-wrap items-center gap-3 border-l-4 border-l-[var(--color-forecast)] px-3 py-2">
        <span className="panel-title">{t('fc.horizon')}</span>
        <div role="radiogroup" aria-label={t('fc.horizon')} className="flex overflow-hidden rounded border border-[var(--color-line)]">
          {HORIZONS.map((x) => (
            <button
              key={x}
              type="button"
              role="radio"
              aria-checked={h === x}
              data-horizon={x}
              onClick={() => setH(x)}
              className={`num px-2.5 py-1 text-[11px] font-semibold ${
                h === x ? 'bg-[var(--color-forecast)] text-[var(--color-on-accent)]' : 'text-[var(--color-text2)] hover:bg-[var(--color-bg2)]'
              }`}
            >
              +{x === 60 ? '1h' : `${x}m`}
            </button>
          ))}
        </div>
        <button
          type="button"
          data-matrix-toggle=""
          className={BTN}
          onClick={() => setView((v) => (v === 'list' ? 'matrix' : 'list'))}
        >
          {view === 'list' ? t('fc.view.matrix') : t('fc.view.list')}
        </button>
        <span className="num text-[11px] text-[var(--color-text2)]">{t('alerts.count', { n: num(rows.length) })}</span>
        <span className="text-[10px] text-[var(--color-text3)]">{t('fc.minChance', { p: pMin, dow: t(`dow.${dow}` as I18nKey) })}</span>
        <span className="ml-auto flex items-center gap-2">
          <EvidenceTag label="INFERRED" cite="R1096" />
          <span className="text-[10px] text-[var(--color-text3)]">{t('fc.note')}</span>
        </span>
      </div>
      <Panel titleKey="fc.title.panel" className="min-h-0 flex-1">
        {view === 'matrix' ? (
          <HorizonMatrix />
        ) : groups.length === 0 ? (
          <>
            <Empty tone="ok" title={t('fc.none', { h })} text={t('fc.noneHint')} />
            <WatchList h={h} />
          </>
        ) : (
          <ul data-worklist="" data-forecast-list="">
            {groups.slice(0, MAX_WORKLIST_GROUPS).map((g) => (
              <WorklistGroup key={g.key} g={g} now_s={now_s} />
            ))}
          </ul>
        )}
      </Panel>
      <ScorecardPanel />
    </div>
  );
}

// ------------------------------------------------------- ranking, grouping, playbook

/**
 * Defect A-3: ten consecutive rows reading the same rule is not a worklist.
 *
 * The ORDER is not invented here - alerts arrive sorted by `impact_score` from
 * rules/evaluate.ts (severity weight + passenger exposure + load). Rank is simply the
 * position in that already-authoritative list. All this does is fold repeats of the
 * same rule into one head row with an expandable tail.
 *
 * A critical alert is NEVER folded into a tail: it always gets its own row.
 */
interface Ranked {
  a: Alert;
  rank: number;
}
interface Group {
  key: string;
  head: Ranked;
  tail: Ranked[];
}

const foldKey = (a: Alert) => (a.level ? `${a.rule_id}:L${a.level}` : a.rule_id);

function buildWorklist(rows: Alert[]): Group[] {
  const rank = new Map(rows.map((a, i) => [a.id, i + 1]));
  const byRule = new Map<string, Ranked[]>();
  const out: Group[] = [];
  for (const a of rows) {
    const r: Ranked = { a, rank: rank.get(a.id)! };
    if (a.severity === 'critical') {
      out.push({ key: a.id, head: r, tail: [] });
      continue;
    }
    // Fold per rule AND SOP level: an L2 delay must never hide inside an L1's tail.
    const fold = foldKey(a);
    const members = byRule.get(fold);
    if (members) {
      members.push(r);
      continue;
    }
    byRule.set(fold, [r]);
    out.push({ key: `g:${fold}`, head: r, tail: [] });
  }
  for (const g of out) {
    const members = byRule.get(foldKey(g.head.a));
    if (members && members.length > 1 && g.key.startsWith('g:')) g.tail = members.slice(1);
  }
  return out;
}

/**
 * L3: ONE rendering of a breached threshold, for every screen that shows one.
 *
 * Alerts used to pass raw seconds into `alerts.threshold` while the Command Centre
 * converted to minutes - the same `service_gap` alert therefore read "28 min vs
 * threshold 20 min" on one screen and "1680 s vs threshold 1200 s" on the other, and
 * the non-seconds path disagreed on spacing (`62km/h` vs `62 km/h`). Seconds are shown
 * in minutes because that is how the deck states them (S8 "Service gap (28 min)"), and
 * the spacing is the Command Centre's (`92%`, `62km/h`, `28 min`) so the two screens
 * agree TODAY, before that file's duplicate is deleted. Change it here, once, if the
 * spaced `62 km/h` form is preferred.
 */
export function ruleLine(a: Alert, t: (k: I18nKey, p?: Record<string, string | number>) => string): string {
  const sec = a.metric.unit === 's';
  // Every parameter is stringified before it goes into t(): a missing rule_id would
  // otherwise print "undefined" and a non-finite metric "NaN", in both languages.
  return t('alerts.threshold', {
    rule: str(a.rule_id),
    value: num(a.metric.value, (x) => String(sec ? Math.round(x / 60) : x)),
    threshold: num(a.metric.threshold, (x) => String(sec ? Math.round(x / 60) : x)),
    unit: sec ? ' min' : (a.metric.unit ?? ''),
  });
}

/** Delegates to the rules layer so the mapping is testable and cannot silently regress. */
function eventTypeFor(a: Alert): string {
  return eventTypeForAlert(a.rule_id, a.type);
}

/** The playbook's first recommended action - the headline the row offers as a button. */
function headlineAction(a: Alert): { pb: PlaybookId; key: I18nKey } {
  const pb = playbookFor(eventTypeFor(a), a.level);
  return { pb, key: PLAYBOOKS[pb].recommended[0] as I18nKey };
}

/** E2: the L1 notification is about to go - show when, and let a controller stop it. */
function Countdown({ alertId, now_s }: { alertId: string; now_s: number }) {
  const t = useT();
  const role = useSettings((s) => s.role);
  const due = useSop((s) => s.pending[alertId]);
  if (due === undefined) return null;
  return (
    <>
      <StatusPill tone="warn">
        <span data-countdown="">{t('sop.sendingIn', { s: Math.max(0, Math.round(due - now_s)) })}</span>
      </StatusPill>
      <button
        type="button"
        data-cancel-l1=""
        className={BTN}
        disabled={!can(role, 'revoke_auto_action')}
        onClick={() => {
          if (cancelL1(alertId, role)) overlay.toast(t('sop.cancelled'));
        }}
      >
        {t('sop.cancel')}
      </button>
    </>
  );
}

/** L1: what the system already did, and the controller's way to undo it. */
function AutoSent({ commId }: { commId: string }) {
  const t = useT();
  const role = useSettings((s) => s.role);
  const msg = useComms((s) => s.coordination.find((c) => c.communication_id === commId));
  if (!msg) return null;
  if (msg.status === 'revoked') return <StatusPill tone="neutral">{t('sop.revoked')} · {commId}</StatusPill>;
  return (
    <>
      <StatusPill tone="ok">
        <span data-auto-sent="">{t('sop.autoSent')} · {commId}</span>
      </StatusPill>
      <button
        type="button"
        className={BTN}
        disabled={!can(role, 'revoke_auto_action')}
        title={t('sop.policy')}
        onClick={() => {
          if (useComms.getState().revoke(commId, role)) overlay.toast(t('sop.revoked'));
        }}
      >
        {t('sop.revoke')}
      </button>
    </>
  );
}

function RankChip({ n, hot }: { n: number; hot: boolean }) {
  return (
    <span
      className={`num inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold ${
        hot ? 'text-[var(--color-on-accent)]' : 'border border-[var(--color-line)] text-[var(--color-text3)]'
      }`}
      style={hot ? { background: 'var(--color-sev-crit)' } : undefined}
      title={`#${n}`}
    >
      {n}
    </span>
  );
}

function WorklistGroup({ g, now_s }: { g: Group; now_s: number }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <>
      <AlertRow r={g.head} now_s={now_s} count={g.tail.length + 1} />
      {g.tail.length > 0 && (
        <li className="border-b border-[var(--color-line)] bg-[var(--color-bg1)] px-3 py-1">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            data-worklist-tail=""
            className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--color-text3)] hover:text-[var(--color-text1)]"
          >
            <Icon name={open ? 'chevron-up' : 'chevron-down'} size={12} />
            {open ? t('wl.collapse') : t('wl.similar', { n: g.tail.length })}
          </button>
        </li>
      )}
      {open && g.tail.map((r) => <AlertRow key={r.a.id} r={r} now_s={now_s} inTail />)}
    </>
  );
}

function AlertRow({ r, now_s, count, inTail }: { r: Ranked; now_s: number; count?: number; inTail?: boolean }) {
  const t = useT();
  const a = r.a;
  const acknowledge = useAlerts((s) => s.acknowledge);
  // An alert with no vehicle, route or operator used to render a floating "· ·".
  const subject = id(a.vehicle_id ?? a.route_id ?? a.operator_id);
  const age_min = num(Math.max(0, Math.round((now_s - a.raised_at_s) / 60)));
  const action = headlineAction(a);
  const role = useSettings((s) => s.role);
  const autoOn = useSettings((s) => s.l1_auto_exec);
  const drill = drillHref(a);

  return (
    <li
      data-alert-row=""
      data-forecast={a.forecast ? '' : undefined}
      className={`flex items-start gap-2.5 border-b border-[var(--color-line)] px-3 py-2 last:border-0 ${
        inTail ? 'bg-[var(--color-bg1)] pl-8' : ''
      } ${a.forecast ? 'border-l-4 border-l-[var(--color-forecast)]' : ''}`}
    >
      <RankChip n={r.rank} hot={a.severity === 'critical'} />
      {a.level ? <LevelBadge level={a.level} forecast={a.forecast} /> : null}
      <SeverityChip severity={a.severity} size="sm" />
      <div className="min-w-0 flex-1">
        {/* line 1 - identity */}
        <div className="flex items-baseline gap-2">
          <span className="truncate text-[12px] font-medium">{t(a.title_key as I18nKey, a.params)}</span>
          {count && count > 1 ? (
            <StatusPill tone="warn">{t('wl.groupCount', { n: count })}</StatusPill>
          ) : null}
        </div>
        {/* line 2 - metadata: type, subject, age, and the threshold that broke */}
        <div className="num mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[var(--color-text2)]">
          <span className="break-words text-[var(--color-text3)]">
            {t(('alerts.type.' + a.type) as I18nKey)} · {subject} · {t('alerts.age')} {age_min}m · {t('alerts.impact')}{' '}
            {num(a.impact_score)}
          </span>
          {a.forecast ? (
            <span
              className="font-semibold text-[var(--color-forecast)]"
              data-forecast-prob=""
              title={t('fc.confTip', { c: (a.confidence ?? 0).toFixed(2) })}
            >
              {t('fc.chance', { p: Math.round((a.probability ?? 0) * 100), h: a.horizon_min ?? 0 })}
            </span>
          ) : (
            <span className="break-words">{ruleLine(a, t)}</span>
          )}
          {a.routes_affected ? <span>{t('sop.routesAffected', { n: a.routes_affected })}</span> : null}
          {/* which agent owns this rule, and where its recommendation has got to */}
          {a.forecast ? null : <AlertDecisionBadge alertId={a.id} />}
        </div>
        {a.level && !a.forecast ? (
          <div className="mt-0.5 text-[10px] text-[var(--color-text3)]">{t(`sop.level.${a.level}` as I18nKey)}</div>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
        {a.forecast ? (
          // A forecast is not an alert (L1235): nothing to validate, acknowledge or send.
          <>
            <StatusPill tone="neutral">{t('fc.tag')}</StatusPill>
            <button type="button" className={BTN} data-how="" onClick={() => openHowItWorks(a as ForecastAlert, t('fc.how.title'))}>
              {t('fc.how.button')}
            </button>
          </>
        ) : a.validated_event_id ? (
          <>
            <StatusPill tone="info">{t('alerts.validated', { id: a.validated_event_id })}</StatusPill>
            {/* item 24: no round trip - the event opens beside the list, not instead of it */}
            <button
              type="button"
              className={`${BTN} border-[var(--color-accent)] text-[var(--color-accent)]`}
              onClick={() => openEvent(a.validated_event_id!)}
            >
              {t('wl.openEvent')}
            </button>
          </>
        ) : (
          <>
            {/* PTCC SOP. L1: the notification already went, automatically - show it and
                offer Revoke. L3: escalate (validate pre-filled with the L3 playbook) and
                the Traffic-department draft waiting in Comms. */}
            {a.level === 1 && a.auto_comm_id ? <AutoSent commId={a.auto_comm_id} /> : null}
            {a.level === 1 && !a.auto_comm_id ? <Countdown alertId={a.id} now_s={now_s} /> : null}
            {a.level === 1 && !a.auto_comm_id && !autoOn ? <StatusPill tone="neutral">{t('sop.autoOff')}</StatusPill> : null}
            {a.level === 3 ? (
              <>
                <button
                  type="button"
                  data-sop-escalate=""
                  className={`${BTN} border-[var(--color-sev-crit)] text-[var(--color-sev-crit)]`}
                  disabled={!can(role, 'escalate_l3')}
                  onClick={() => openValidate(t('sop.escalate'), a.id)}
                >
                  {t('sop.escalate')} ↑
                </button>
                <a className={BTN} href="#/comms" data-traffic-draft="">
                  {t('sop.trafficDraft')} ↗
                </a>
              </>
            ) : null}
            {/* The recommended action, as a button. It opens the validation flow, because
                an alert is not an event until an operator validates it (L1235) and PTCC
                is not a command authority (L718). Nothing else here fires automatically;
                the one exception is the L1 notification above - a message, not control. */}
            <button
              type="button"
              data-alert-action=""
              className={`${BTN} border-[var(--color-accent)] text-[var(--color-accent)]`}
              title={t('wl.actionHint')}
              onClick={() => openValidate(t('ev.validateTitle'), a.id)}
            >
              {t(action.key)} →
            </button>
            <button
              type="button"
              className={BTN}
              onClick={() => {
                acknowledge(a.id);
                overlay.toast(t('ov.toast.ack', { id: a.id }));
              }}
              disabled={a.acknowledged}
            >
              {a.acknowledged ? t('alerts.acknowledged') : t('alerts.acknowledge')}
            </button>
            <button type="button" className={BTN} onClick={() => openValidate(t('ev.validateTitle'), a.id)}>
              {t('alerts.validate')}
            </button>
          </>
        )}
        {drill ? (
          <a className={BTN} href={drill} title={t('alerts.openSubject')} data-drill="">
            {a.vehicle_id ?? (a.params.bus ? `${a.params.bus}` : t('fc.drill'))} ↗
          </a>
        ) : null}
      </div>
    </li>
  );
}

// ---------------------------------------------------------------- validate dialog

const VERIFY_KEYS: I18nKey[] = ['ev.vTelemetry', 'ev.vRoute', 'ev.vCctv', 'ev.vDriver'];

/**
 * Single entry point for the validation dialog - two call sites, one slot.
 *
 * L1: an alert ID, never the Alert object. `evaluateRules` rebuilds every alert each
 * tick with a fresh object identity, so a frozen object stopped tracking severity,
 * metric and impact while the dialog was open - and stale values were written into the
 * event record. Worse, if the condition cleared meanwhile, validate() still created the
 * event but no alert matched its id, so `validated_event_id` was never set and the
 * agent decision never completed. Same subscribed-wrapper shape as EventDrawerBody.
 */
function openValidate(title: string, alert_id: string) {
  overlay.openModal({ id: 'alerts.validate', title, body: <ValidateBody alert_id={alert_id} /> });
}

function ValidateBody({ alert_id }: { alert_id: string }) {
  const t = useT();
  const alert = useAlerts((s) => s.alerts.find((a) => a.id === alert_id));
  // Hooks below need a stable shape, so the live alert is captured once for the form's
  // initial values and the render guards afterwards.
  const [seed] = useState(alert);
  // Opened from a row that had already cleared (a stale agent console, a double click on
  // a row the tick removed): say so, rather than showing a form that cannot be confirmed.
  if (!seed) return <Empty title={t('ev.alertClearedTitle')} text={t('ev.alertCleared')} />;
  return <ValidateForm live={alert} seed={seed} />;
}

/**
 * `seed` is the alert as it stood when the dialog opened - the only honest source for
 * the form's INITIAL values, which the operator then owns. `live` is the same alert as
 * the engine currently sees it: undefined once the condition clears.
 */
function ValidateForm({ live, seed }: { live: Alert | undefined; seed: Alert }) {
  const t = useT();
  const alert = live ?? seed;
  const onClose = () => overlay.closeModal();
  const role = useSettings((s) => s.role);
  const selectEvent = useSelection((s) => s.selectEvent);
  // The proposed event type, in the vocabulary playbookFor() keys off - so the playbook
  // the row offered is the playbook the created event carries. Still only a PROPOSAL:
  // the operator edits the field below, and the preview follows what they type.
  const [event_type, setEventType] = useState(eventTypeFor(seed));
  const [category, setCategory] = useState<EventCategory>(categoryFor(seed.type));
  // R1441: the system suggests; the operator may change it before creating the event.
  const [severity, setSeverity] = useState<EventSeverity>(suggestSeverity(seed.severity, seed.rule_id));
  const [description, setDescription] = useState(t(seed.title_key as I18nKey, seed.params));
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  // A double click used to create TWO events and TWO audit rows: the second click lands
  // before React has unmounted the dialog. `validate()` is not idempotent, so the guard
  // has to be here - one latch, checked and set inside the same handler.
  const [submitting, setSubmitting] = useState(false);

  return (
    <>
      <div className="flex flex-col gap-3">
        <p className="rounded border border-[var(--color-sev-warn)] px-2 py-1.5 text-[11px] text-[var(--color-sev-warn)]">
          {t('ev.validateNote')}
        </p>

        <div className="flex flex-wrap items-center gap-2 text-[12px]">
          <SeverityChip severity={alert.severity} size="sm" />
          <span className="min-w-0 break-words">{t(alert.title_key as I18nKey, alert.params)}</span>
          <span className="num ml-auto text-[10px] text-[var(--color-text3)]">{alert.id}</span>
        </div>
        {/* Live metric, rendered by the one shared helper so this dialog and every list
            print the same number for the same breached threshold. */}
        <div className="num text-[11px] text-[var(--color-text2)]" data-validate-metric="">
          {ruleLine(alert, t)}
        </div>
        {!live ? (
          <p className="text-[11px] text-[var(--color-sev-warn)]" role="status" data-alert-cleared="">
            {t('ev.alertCleared')}
          </p>
        ) : null}

        {/* Consequence preview: what this event record will carry the moment it exists.
            Derived live from the event type the operator has typed, so editing the type
            changes the preview. It changes nothing about what is permitted. */}
        <div className="rounded border border-[var(--color-line)] bg-[var(--color-bg1)] px-2 py-1.5">
          <span className="panel-title">{t('wl.consequence')}</span>
          <ul className="mt-1 flex flex-col gap-0.5 text-[11px] text-[var(--color-text2)]">
            {PLAYBOOKS[playbookFor(event_type, seed.level)].recommended.map((k) => (
              <li key={k}>· {t(k as I18nKey)}</li>
            ))}
            {PLAYBOOKS[playbookFor(event_type, seed.level)].compulsory.map((k) => (
              <li key={k} className="text-[var(--color-sev-warn)]">
                ! {t(k as I18nKey)}
              </li>
            ))}
          </ul>
        </div>

        {/* The operator verifies against four independent sources before the alert
            is allowed to become a formal event record (L1235). */}
        <fieldset className="rounded border border-[var(--color-line)] p-2">
          <legend className="panel-title px-1">{t('ev.verifyChecklist')}</legend>
          <div className="grid grid-cols-2 gap-1">
            {VERIFY_KEYS.map((k) => (
              <label key={k} className="flex items-center gap-2 text-[11px]">
                <input
                  type="checkbox"
                  checked={!!checked[k]}
                  onChange={(e) => setChecked((c) => ({ ...c, [k]: e.target.checked }))}
                />
                {t(k)}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-2">
          <Field label={t('ev.f.event_type')}>
            <input className={INPUT} value={event_type} onChange={(e) => setEventType(e.target.value)} />
          </Field>
          <Field label={t('ev.f.category')}>
            <select className={INPUT} value={category} onChange={(e) => setCategory(e.target.value as EventCategory)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {t(`ev.category.${c}` as I18nKey)}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label={t('ev.f.severity_level')}>
          <div className="flex flex-wrap items-center gap-1">
            {EVENT_SEVERITIES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSeverity(s)}
                className={`rounded border px-1.5 py-1 ${
                  severity === s ? 'border-[var(--color-accent)] bg-[var(--color-bg2)]' : 'border-[var(--color-line)]'
                }`}
              >
                <EventSeverityBadge level={s} size="sm" />
              </button>
            ))}
          </div>
          <span className="text-[10px] text-[var(--color-text3)]">{t('ev.severitySuggested')}</span>
        </Field>

        <Field label={t('ev.f.description')}>
          <textarea className={INPUT} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>

        <div className="flex items-center justify-end gap-2">
          <button type="button" className={BTN} onClick={onClose}>
            {t('ev.cancel')}
          </button>
          {/* L1235: the operator verifies against four independent sources BEFORE an alert
              is allowed to become a formal event record. The checklist existed and was
              never read - Confirm had no `disabled`, so the governance-critical path
              validated less than the manual-create path right beside it. */}
          <button
            type="button"
            disabled={!live || submitting || VERIFY_KEYS.some((k) => !checked[k]) || description.trim().length === 0}
            title={VERIFY_KEYS.some((k) => !checked[k]) ? t('ev.validateNote') : undefined}
            className={`${BTN} border-[var(--color-accent)] text-[var(--color-accent)] disabled:opacity-40`}
            onClick={() => {
              if (!live || submitting) return;
              setSubmitting(true);
              const ev = useEvents
                .getState()
                .validate(live, { event_type, category, severity_level: severity, description, by: role });
              selectEvent(ev.event_id);
              onClose();
              overlay.toast(t('ov.toast.event', { id: ev.event_id }), { tone: 'ok' });
              // item 24: the new event opens in the drawer immediately - no going to
              // #/alerts and finding the row again.
              openEvent(ev.event_id);
            }}
          >
            {t('ev.confirm')}
          </button>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------- tab B: events

function EventsTab() {
  const t = useT();
  const events = useEvents((s) => s.events);
  const selected_id = useSelection((s) => s.event_id);
  const selectEvent = useSelection((s) => s.selectEvent);

  const selected = events.find((e) => e.event_id === selected_id) ?? events[0];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex min-h-0 flex-1 flex-col gap-2">
        <div className="panel flex shrink-0 flex-row items-center gap-3 px-3 py-2">
          <span className="text-[10px] text-[var(--color-text3)]">{t('ev.notAnEvent')}</span>
          <button
            type="button"
            className={BTN}
            onClick={() => overlay.openModal({ id: 'alerts.manual', title: t('ev.manual'), body: <ManualBody /> })}
          >
            + {t('ev.manual')}
          </button>
        </div>
        <Panel titleKey="alerts.tabEvents" className="min-h-0 flex-1">
          {events.length === 0 ? (
            <Empty title={t('ev.none')} text={t('ev.noneHint')} />
          ) : (
            <ul>
              {events.map((e) => (
                <li key={e.event_id}>
                  <button
                    type="button"
                    data-event-row=""
                    onClick={() => {
                      selectEvent(e.event_id);
                      openEvent(e.event_id);
                    }}
                    className={`flex w-full items-center gap-3 border-b border-[var(--color-line)] px-3 py-2 text-left ${
                      selected?.event_id === e.event_id ? 'bg-[var(--color-bg2)]' : ''
                    }`}
                  >
                    <EventSeverityBadge level={e.severity_level} size="sm" />
                    <span className="min-w-0 flex-1">
                      {/* event_type is free text an operator typed: it can be a paragraph. */}
                      <span className="block truncate text-[12px]" title={e.event_type}>{str(e.event_type)}</span>
                      <span className="flex flex-wrap items-center gap-1 text-[10px] text-[var(--color-text3)]">
                        <span>{t(`ev.category.${e.category}` as I18nKey)}</span>
                        <span>·</span>
                        <span>
                          {t('ev.emergencyLevel')} {num(e.emergency_level)}
                        </span>
                        <span>·</span>
                        <span>{t(`ev.stage.${e.stage}` as I18nKey)}</span>
                      </span>
                    </span>
                    <span className="num shrink-0 text-[10px] text-[var(--color-text3)]">{e.event_id}</span>
                    <Icon name="chevron-right" size={12} className="shrink-0 text-[var(--color-text3)]" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <AuditPanel />
    </div>
  );
}

// ---------------------------------------------------------------- event drawer

/**
 * Item 24: the event record used to be an in-flow column, which is why --z-drawer was
 * defined and never used. It is now the application's one drawer slot, so the list stays
 * on screen while an event is inspected, and Escape closes it (OverlayHost rule 2).
 *
 * Governance content is unchanged - stepper, compulsory gate, override, evidence.
 */
export function openEvent(event_id: string) {
  const ev = useEvents.getState().events.find((e) => e.event_id === event_id);
  if (!ev) return;
  const lang = useSettings.getState().lang;
  overlay.openDrawer({
    id: 'alerts.event',
    // L6: the title used to interpolate the raw `event_type` ("afc_failure") as
    // user-facing text. event_type is free text the operator types, so it cannot be a
    // dictionary key - it stays a labelled data field in the record grid below, and the
    // title carries the translated category instead.
    title: tr('ev.drawerTitle', lang, { id: ev.event_id }),
    sub: `${tr(`ev.category.${ev.category}` as I18nKey, lang)} · ${ev.description}`,
    wide: true,
    body: <EventDrawerBody event_id={event_id} />,
  });
}

/** Subscribed wrapper: the drawer body must re-render as the workflow moves. */
function EventDrawerBody({ event_id }: { event_id: string }) {
  const t = useT();
  const ev = useEvents((s) => s.events.find((e) => e.event_id === event_id));
  // The drawer outlives its subject: an event can be removed while it is open. Saying
  // "select an event" in a drawer that has no list in it was not an instruction.
  if (!ev) return <Empty title={t('ev.eventGoneTitle')} text={t('ev.eventGoneHint')} />;
  return <EventDrawer ev={ev} />;
}

/**
 * L1346, derived: the compulsory actions that would refuse the NEXT advance.
 *
 * This is the same predicate `useEvents.advance` applies before it moves a stage - kept
 * here only because the drawer has no store selector to ask. The gate panel used to
 * live in local state seeded by advance()'s reply, and the drawer slot has two owners
 * (this module and the copilot ask bar, reachable from every screen): typing in the ask
 * bar replaced the drawer, and reopening the event brought back `blocked: []` and NO
 * gate panel even though the advance was still refused. Deriving it cannot go stale.
 */
function blockersFor(ev: EmergencyEvent): ActionItem[] {
  const next = WORKFLOW_STAGES[WORKFLOW_STAGES.indexOf(ev.stage) + 1];
  if (!next) return [];
  return ev.actions.filter(
    (a) => a.compulsory && !a.done && !a.overridden_by && gateStageFor(a.label_key) === next,
  );
}

/**
 * Completing an action twice writes the audit log twice.
 *
 * `useEvents.completeAction` appends an audit row unconditionally - it does not check
 * whether the action was already done (see the defect note in the report). Three call
 * sites in this drawer can fire it, and a double click on any of them lands before the
 * checkbox has re-rendered as disabled. Reading LIVE store state inside the handler is
 * the only guard that does not depend on render timing.
 */
function completeOnce(event_id: string, action_id: string, role: string, label: string): void {
  const live = useEvents
    .getState()
    .events.find((e) => e.event_id === event_id)
    ?.actions.find((a) => a.id === action_id);
  if (!live || live.done || live.overridden_by) return;
  useEvents.getState().completeAction(event_id, action_id, role);
  overlay.toast(label, { tone: 'ok' });
}

function EventDrawer({ ev }: { ev: EmergencyEvent }) {
  const t = useT();
  const role = useSettings((s) => s.role);

  const i = WORKFLOW_STAGES.indexOf(ev.stage);
  const next: WorkflowStage | undefined = WORKFLOW_STAGES[i + 1];
  const recommended = ev.actions.filter((a) => !a.compulsory);
  const compulsory = ev.actions.filter((a) => a.compulsory);
  const blockedItems = blockersFor(ev);

  const fields: [I18nKey, string][] = [
    ['ev.f.event_id', str(ev.event_id)],
    // event_type and description are free text the operator typed: they can be empty,
    // and they can be very long. The <dd> below is `break-words`, so they wrap.
    ['ev.f.event_type', str(ev.event_type)],
    ['ev.f.category', t(`ev.category.${ev.category}` as I18nKey)],
    ['ev.f.severity_level', num(ev.severity_level)],
    ['ev.f.bus_number', str(ev.bus_number)],
    ['ev.f.route_number', str(ev.route_number)],
    ['ev.f.driver_id', str(ev.driver_id)],
    [
      'ev.f.location',
      `${str(ev.location?.label)} (${num(ev.location?.latitude, (x) => x.toFixed(4))}, ${num(ev.location?.longitude, (x) => x.toFixed(4))})`,
    ],
    ['ev.f.timestamp', str(ev.timestamp)],
    ['ev.f.detection_source', str(ev.detection_source)],
    ['ev.f.description', str(ev.description)],
    ['ev.f.associated_alerts', str(ev.associated_alert_ids.join(', '))],
  ];

  return (
    <div className="flex flex-col gap-2">
      <Panel
        titleKey="ev.record12"
        right={
          <span className="flex items-center gap-2">
            <EventSeverityBadge level={ev.severity_level} />
            <StatusPill tone={ev.emergency_level >= 2 ? 'crit' : ev.emergency_level === 1 ? 'warn' : 'neutral'}>
              {t('ev.emergencyLevel')} {num(ev.emergency_level)}/3
            </StatusPill>
          </span>
        }
      >
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 p-3">
          {fields.map(([k, v]) => (
            <div key={k} className="flex flex-col border-b border-[var(--color-line)] pb-1">
              <dt className="panel-title">{t(k)}</dt>
              <dd className="num break-words text-[12px] text-[var(--color-text1)]">{v}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      {/* ---- workflow stepper: 7 stages, each with its logged timestamp + actor */}
      <Panel titleKey="ev.workflow">
        {/* The shared Stepper carries done/active/pending; the label holds the logged
            timestamp + actor for that stage, which is the only extra this track needs. */}
        <Stepper
          className="p-3"
          steps={WORKFLOW_STAGES.map((s, idx): Step => {
            const log = ev.history.find((h) => h.stage === s);
            return {
              label: (
                <span className="flex min-w-0 flex-col">
                  <span>{t(`ev.stage.${s}` as I18nKey)}</span>
                  {/* simSecondsOf() on a stamp that is not isoAt's shape returns NaN,
                      which hhmmss renders as "NaN:NaN:NaN". */}
                  <span className="num truncate text-[10px] text-[var(--color-text3)]">
                    {log ? `${num(simSecondsOf(log.at), hhmmss)} · ${str(log.by)}` : DASH}
                  </span>
                </span>
              ),
              state: idx === i ? 'active' : idx < i ? 'done' : 'pending',
            };
          })}
        />
        <div className="flex flex-wrap items-center gap-2 border-t border-[var(--color-line)] px-3 py-2">
          <button
            type="button"
            className={`${BTN} border-[var(--color-accent)] text-[var(--color-accent)]`}
            disabled={!next}
            onClick={() => {
              if (!next) return;
              const r = useEvents.getState().advance(ev.event_id, role);
              // A dropped double click is not a refusal: saying "blocked by 0 actions"
              // would be both loud and untrue. The first click already reported itself.
              if (!r.ok && r.debounced) return;
              // L1346: a refused advance is the point of the whole module - say it loudly.
              // The gate panel itself is derived from `ev`, so it is already on screen.
              overlay.toast(
                r.ok
                  ? t('ov.toast.stage', { id: ev.event_id, stage: t(`ev.stage.${next}` as I18nKey) })
                  : t('ov.toast.stageBlocked', { id: ev.event_id, n: r.blocked.length }),
                { tone: r.ok ? 'ok' : 'crit' },
              );
            }}
          >
            {next ? t('ev.advance', { stage: t(`ev.stage.${next}` as I18nKey) }) : t('ev.closedAt', { t: str(ev.closed_at) })}
          </button>
          <span className="text-[10px] text-[var(--color-text3)]">{t('ev.gateNote')}</span>
        </div>
        {/* Item 43 / opportunity 12: the gate is the strongest thing in the product and
            used to render as a red text block. Still loud, still role="alert" - but each
            blocker is now clearable in place, and a supervisor can override from here.
            The RULE is untouched: advance() still refuses until every blocker clears. */}
        {blockedItems.length > 0 && (
          <div
            className="m-3 mt-0 rounded border-2 border-[var(--color-sev-crit)] bg-[color-mix(in_srgb,var(--color-sev-crit)_12%,transparent)] p-3"
            role="alert"
            data-gate-blocked=""
          >
            <div className="flex items-center gap-2">
              <Icon name="danger" size={15} className="shrink-0 text-[var(--color-sev-crit)]" />
              <span className="text-[13px] font-bold uppercase tracking-wide text-[var(--color-sev-crit)]">
                {t('ev.blocked', { n: blockedItems.length })}
              </span>
              <EvidenceTag label="CONFIRMED" cite="L1346" className="ml-auto" />
            </div>
            <p className="mt-1 text-[11px] text-[var(--color-text2)]">{t('wl.gate.hint')}</p>
            <ul className="mt-2 flex flex-col gap-1">
              {blockedItems.map((a) => (
                <li
                  key={a.id}
                  className="flex flex-wrap items-center gap-2 rounded border border-[var(--color-line)] bg-[var(--color-bg1)] px-2 py-1.5 text-[12px]"
                >
                  <span className="min-w-0 flex-1 break-words font-medium text-[var(--color-text1)]">
                    {t(a.label_key as I18nKey)}
                  </span>
                  <button
                    type="button"
                    className={`${BTN} border-[var(--color-sev-ok)] text-[var(--color-sev-ok)]`}
                    onClick={() =>
                      completeOnce(ev.event_id, a.id, role, t('ov.toast.action', { label: t(a.label_key as I18nKey) }))
                    }
                  >
                    {t('wl.gate.complete')}
                  </button>
                  {/* L1347: supervisor only, and still ≥10 characters of justification. */}
                  <button
                    type="button"
                    className={`${BTN} border-[var(--color-sev-warn)] text-[var(--color-sev-warn)]`}
                    disabled={role !== 'supervisor'}
                    title={role !== 'supervisor' ? t('ev.overrideRole') : undefined}
                    onClick={() =>
                      overlay.openModal({
                        id: 'alerts.override',
                        title: t('ev.override'),
                        body: <OverrideBody event_id={ev.event_id} action_id={a.id} />,
                      })
                    }
                  >
                    {t('ev.override')}
                  </button>
                </li>
              ))}
            </ul>
            {role !== 'supervisor' ? (
              <p className="mt-2 text-[11px] text-[var(--color-sev-warn)]">{t('ev.overrideRole')}</p>
            ) : null}
          </div>
        )}
      </Panel>

      <div className="flex flex-col gap-2">
        <Panel titleKey="ev.recommended">
          {recommended.length === 0 ? (
            <Empty title={t('ev.emptyRecommended')} text={t('ev.emptyRecommendedHint')} />
          ) : (
            <ul className="p-2">
              {recommended.map((a) => (
                <li key={a.id} className="flex items-center gap-2 px-1 py-1 text-[12px]">
                  <input
                    type="checkbox"
                    checked={a.done}
                    disabled={a.done}
                    onChange={() =>
                      completeOnce(ev.event_id, a.id, role, t('ov.toast.action', { label: t(a.label_key as I18nKey) }))
                    }
                  />
                  <span className={`min-w-0 break-words ${a.done ? 'line-through opacity-60' : ''}`}>
                    {t(a.label_key as I18nKey)}
                  </span>
                  {a.done_at ? (
                    <span className="num ml-auto shrink-0 text-[10px] text-[var(--color-text3)]">
                      {num(simSecondsOf(a.done_at), hhmm)}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* Compulsory items are a different visual family: locked, amber-bordered. */}
        <Panel
          titleKey="ev.compulsory"
          className="border-[var(--color-sev-warn)]"
          right={<EvidenceTag label="CONFIRMED" cite="L1346" />}
        >
          {compulsory.length === 0 ? (
            // Good news, and it needs saying: this playbook has no gate to satisfy.
            <Empty tone="ok" title={t('ev.emptyCompulsory')} text={t('ev.emptyCompulsoryHint')} />
          ) : (
          <ul className="p-2">
            {compulsory.map((a) => (
              <li
                key={a.id}
                className="mb-1 flex flex-col gap-0.5 rounded border border-[color-mix(in_srgb,var(--color-sev-warn)_50%,transparent)] px-2 py-1"
                style={{ borderColor: 'color-mix(in srgb, var(--color-sev-warn) 45%, transparent)' }}
              >
                <div className="flex items-center gap-2 text-[12px]">
                  <input
                    type="checkbox"
                    checked={a.done}
                    disabled={a.done || !!a.overridden_by}
                    onChange={() =>
                      completeOnce(ev.event_id, a.id, role, t('ov.toast.action', { label: t(a.label_key as I18nKey) }))
                    }
                  />
                  <span className={`min-w-0 break-words ${a.done || a.overridden_by ? 'line-through opacity-60' : 'font-medium'}`}>
                    {t(a.label_key as I18nKey)}
                  </span>
                  <span className="ml-auto flex shrink-0 items-center gap-1">
                    {a.done_at ? <span className="num text-[10px] text-[var(--color-text3)]">{num(simSecondsOf(a.done_at), hhmm)}</span> : null}
                    {!a.done && !a.overridden_by ? (
                      <button
                        type="button"
                        className={BTN}
                        // L1347: only a supervisor may override a compulsory action.
                        disabled={role !== 'supervisor'}
                        title={role !== 'supervisor' ? t('ev.overrideRole') : undefined}
                        onClick={() =>
                          overlay.openModal({
                            id: 'alerts.override',
                            title: t('ev.override'),
                            body: <OverrideBody event_id={ev.event_id} action_id={a.id} />,
                          })
                        }
                      >
                        {t('ev.override')}
                      </button>
                    ) : null}
                  </span>
                </div>
                {a.overridden_by ? (
                  // A justification is free text with a 10-character floor and no
                  // ceiling: it wraps rather than widening the drawer.
                  <div className="break-words text-[10px] text-[var(--color-sev-warn)]">
                    {t('ev.overriddenBy', { by: str(a.overridden_by) })} — “{str(a.justification)}”
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
          )}
        </Panel>
      </div>

      <Panel titleKey="ev.evidence" right={<EvidenceTag label="CONFIRMED" cite="L1384" />}>
        {ev.evidence.length === 0 ? (
          <Empty title={t('ev.emptyEvidence')} text={t('ev.emptyEvidenceHint')} />
        ) : (
          <ul className="p-2">
            {ev.evidence.map((e, n) => (
              <li key={n} className="num flex items-center gap-2 px-1 py-0.5 text-[11px]">
                <StatusPill tone="info">{e.kind}</StatusPill>
                <span className="min-w-0 break-words text-[var(--color-text2)]">{str(e.ref)}</span>
                <span className="ml-auto shrink-0 text-[var(--color-text3)]">{str(ev.event_id)}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

// ---------------------------------------------------------------- override dialog

/**
 * Same shape as ValidateBody, for the same reason (L1): an ID and a subscription, never
 * a frozen object.
 *
 * This dialog used to be handed the whole `ActionItem`. The drawer behind it stays
 * interactive, so the action could be completed - or overridden by a second route into
 * this same slot - while the supervisor was typing their justification, and Confirm
 * would then write a SECOND audit row overriding something that was no longer
 * outstanding. An audit log that records an override that never had anything to override
 * is exactly the kind of lie L1347 exists to prevent.
 *
 * The RULE is untouched: supervisor only, ≥10 characters, always audited.
 */
function OverrideBody({ event_id, action_id }: { event_id: string; action_id: string }) {
  const t = useT();
  const action = useEvents((s) =>
    s.events.find((e) => e.event_id === event_id)?.actions.find((a) => a.id === action_id),
  );
  const outstanding: ActionItem | undefined = action && !action.done && !action.overridden_by ? action : undefined;
  const role = useSettings((s) => s.role);
  const onClose = () => overlay.closeModal();
  const [why, setWhy] = useState('');
  // L1347 gate, unchanged: at least 10 characters of justification.
  const ok = why.trim().length >= 10;

  if (!action) return <Empty title={t('ev.eventGoneTitle')} text={t('ev.eventGoneHint')} />;
  return (
    <>
      <div className="flex flex-col gap-3">
        <p className="break-words text-[12px] text-[var(--color-text2)]">{t(action.label_key as I18nKey)}</p>
        <p className="text-[11px] text-[var(--color-sev-warn)]">{t('ev.gateNote')}</p>
        {!outstanding ? (
          <p className="text-[11px] text-[var(--color-sev-warn)]" role="status" data-action-gone="">
            {t('ev.actionGoneHint')}
          </p>
        ) : null}
        <Field label={t('ev.justification')}>
          <textarea className={INPUT} rows={3} value={why} onChange={(e) => setWhy(e.target.value)} />
        </Field>
        {!ok ? <span className="text-[10px] text-[var(--color-sev-crit)]">{t('ev.overrideMin')}</span> : null}
        <div className="flex justify-end gap-2">
          <button type="button" className={BTN} onClick={onClose}>
            {t('ev.cancel')}
          </button>
          <button
            type="button"
            className={`${BTN} border-[var(--color-sev-warn)] text-[var(--color-sev-warn)]`}
            disabled={!ok || !outstanding}
            title={!outstanding ? t('ev.actionGoneTitle') : undefined}
            onClick={() => {
              // Re-read at click time: the subscription above cannot rule out a second
              // click landing before this component has re-rendered.
              const live = useEvents
                .getState()
                .events.find((e) => e.event_id === event_id)
                ?.actions.find((a) => a.id === action_id);
              if (!live || live.done || live.overridden_by) return;
              useEvents.getState().override(event_id, action_id, role, why.trim());
              onClose();
              overlay.toast(t('ov.toast.override'), { tone: 'warn' });
            }}
          >
            {t('ev.override')}
          </button>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------- manual creation

function ManualBody() {
  const t = useT();
  const role = useSettings((s) => s.role);
  const onClose = () => overlay.closeModal();
  const selectEvent = useSelection((s) => s.selectEvent);
  const [event_type, setEventType] = useState('traffic_accident');
  const [category, setCategory] = useState<EventCategory>('safety');
  const [severity, setSeverity] = useState<EventSeverity>(3);
  const [detection_source, setSource] = useState<string>('call_centre');
  const [route_number, setRoute] = useState('');
  const [bus_number, setBus] = useState('');
  const [description, setDescription] = useState('');
  // Same latch as the validate dialog: a double click created two event records and two
  // audit rows, because `createManual` is not idempotent and the second click lands
  // before the dialog unmounts.
  const [submitting, setSubmitting] = useState(false);

  return (
    <>
      <div className="flex flex-col gap-3">
        <p className="text-[11px] text-[var(--color-text3)]">{t('ev.manualNote')}</p>
        <div className="grid grid-cols-2 gap-2">
          <Field label={t('ev.f.event_type')}>
            <input className={INPUT} value={event_type} onChange={(e) => setEventType(e.target.value)} />
          </Field>
          <Field label={t('ev.f.category')}>
            <select className={INPUT} value={category} onChange={(e) => setCategory(e.target.value as EventCategory)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {t(`ev.category.${c}` as I18nKey)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('ev.f.detection_source')}>
            <select className={INPUT} value={detection_source} onChange={(e) => setSource(e.target.value)}>
              {MANUAL_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {t(`ev.src.${s}` as I18nKey)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('ev.f.severity_level')}>
            <select
              className={INPUT}
              value={severity}
              onChange={(e) => setSeverity(Number(e.target.value) as EventSeverity)}
            >
              {EVENT_SEVERITIES.map((s) => (
                <option key={s} value={s}>
                  {s} — {t(`sev.${s === 1 ? 'crisis' : s === 2 ? 'critical' : s === 3 ? 'high' : s === 4 ? 'medium' : 'low'}` as I18nKey)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('ev.f.route_number')}>
            <input className={INPUT} value={route_number} onChange={(e) => setRoute(e.target.value)} />
          </Field>
          <Field label={t('ev.f.bus_number')}>
            <input className={INPUT} value={bus_number} onChange={(e) => setBus(e.target.value)} />
          </Field>
        </div>
        <Field label={t('ev.f.description')}>
          <textarea className={INPUT} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <button type="button" className={BTN} onClick={onClose}>
            {t('ev.cancel')}
          </button>
          <button
            type="button"
            className={`${BTN} border-[var(--color-accent)] text-[var(--color-accent)]`}
            disabled={submitting || description.trim().length === 0}
            onClick={() => {
              if (submitting) return;
              setSubmitting(true);
              const ev = useEvents.getState().createManual({
                event_type,
                category,
                severity_level: severity,
                description: description.trim(),
                detection_source,
                route_number: route_number || undefined,
                bus_number: bus_number || undefined,
                by: role,
              });
              selectEvent(ev.event_id);
              onClose();
              overlay.toast(t('ov.toast.event', { id: ev.event_id }), { tone: 'ok' });
            }}
          >
            {t('ev.confirm')}
          </button>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------- audit

function AuditPanel() {
  const t = useT();
  const audit = useEvents((s) => s.audit);
  return (
    <Panel titleKey="ev.audit" right={<EvidenceTag label="CONFIRMED" cite="L1347" />} className="shrink-0">
      {audit.length === 0 ? (
        <Empty title={t('ev.emptyAudit')} text={t('ev.emptyAuditHint')} />
      ) : (
        <ul className="max-h-[200px] overflow-auto p-2">
          {/* The audit log only ever grows. The newest rows are the ones an operator is
              reading; the rest stay in the store and in the record. */}
          {audit.slice(0, MAX_AUDIT_ROWS).map((a, n) => (
            <li key={n} className="num flex flex-wrap items-baseline gap-2 border-b border-[var(--color-line)] py-1 text-[11px] last:border-0">
              <span className="text-[var(--color-text3)]">{num(simSecondsOf(a.at), hhmmss)}</span>
              <span className="text-[var(--color-text2)]">{str(a.actor)}</span>
              <span className="text-[10px] text-[var(--color-text3)]">({str(a.role)})</span>
              <span className={a.action?.startsWith('OVERRIDE') ? 'font-bold text-[var(--color-sev-warn)]' : ''}>{str(a.action)}</span>
              <span className="text-[var(--color-text2)]">{str(a.target)}</span>
              {a.detail ? <span className="min-w-0 break-words text-[var(--color-text3)]">— “{a.detail}”</span> : null}
            </li>
          ))}
          {audit.length > MAX_AUDIT_ROWS ? (
            <li className="t-meta py-1 text-center">
              {t('ev.auditShowing', { n: num(MAX_AUDIT_ROWS), total: num(audit.length) })}
            </li>
          ) : null}
        </ul>
      )}
    </Panel>
  );
}
