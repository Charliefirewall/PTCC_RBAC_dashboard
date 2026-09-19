/**
 * The activity stream (plan §10.2 opportunity 2, backlog 13).
 *
 * THERE IS NO NEW INTELLIGENCE OR NEW DATA IN THIS FILE, and it writes to nothing.
 * Every event the feed shows is already generated somewhere else and then thrown away
 * because nobody collects it. This slice is the collector: four module-level
 * `subscribe()` calls, the same wiring `store/agentic.ts` already uses to drive
 * `useAgentic.sync`, diffing what changed and appending a row.
 *
 *   1. useAlerts   - a rule fired (a new `Alert` id appeared in the list)
 *   2. useAgentic  - a decision changed stage (detected -> reasoning -> recommended,
 *                    and the human stages approved / rejected / completed)
 *   3. useEvents   - the audit log the operator's own flow already writes to
 *   4. useComms    - passenger drafts, approvals and coordination sends
 *
 * It is READ-ONLY over all four. Nothing here mutates an alert, a decision, an event
 * or the simulation, and the stream is not an input to anything: dropping this file
 * would change what is displayed and nothing else.
 *
 * Timestamps are SIM seconds (seconds past midnight, the same clock `isoAt()` and
 * `hhmmss()` use), never wall clock. ISO strings coming back out of a store are read
 * with `simSecondsOf()` from sim/engine.ts - never with `new Date()`, which would
 * re-interpret the fixed +08:00 stamp in the machine's own time zone.
 *
 * Prose rule, as everywhere else: an entry stores an i18n key plus params. No number
 * is ever interpolated into a string here.
 */

import { create } from 'zustand';
import type { IconName } from '../components/Icon';
import type { Alert, AuditEntry, CoordinationMessage, PassengerMessage } from '../sim/types';
import { AGENTS, agentForAlert, isHumanStage, useAgentic, type AgentDecision, type AgentId, type DecisionStage, type Phrase } from './agentic';
import { useAlerts, useComms, useEvents, useSim, world } from './index';
// `isoAt()` writes a fixed +08:00 offset, so parsing those strings with `new Date()`
// shifted every row by the MACHINE's UTC offset - and the feed mixed shifted rows with
// raw sim seconds, putting 07:45 approvals above 07:45 alerts as "05:15". `simSecondsOf`
// reads the offset-bearing string literally, which is the only correct way here.
import { simSecondsOf } from '../sim/engine';

export type ActivityTone = 'agent' | 'human' | 'alert' | 'info';

export interface ActivityEntry {
  /** stable and unique, so a re-render never duplicates or re-animates a row. */
  id: string;
  /** SIM seconds past midnight. */
  at_s: number;
  /** the agent the row is attributed to; `null` = the operator, not an agent. */
  agentId: AgentId | null;
  icon: IconName;
  tone: ActivityTone;
  headline: Phrase;
  detail: Phrase;
}

/** plan §13.1 R-10: the stream is capped, so a long demo cannot grow it without bound. */
export const ACTIVITY_CAP = 300;

export const AGENT_ICON: Record<AgentId, IconName> = {
  regularity: 'clock',
  crowding: 'passengers',
  safety: 'shield',
  equipment: 'health',
  pattern: 'analytics',
  response: 'comms',
};

interface ActivityState {
  /** reverse-chronological: newest first. */
  entries: ActivityEntry[];
  push(batch: ActivityEntry[]): void;
}

export const useActivity = create<ActivityState>((set) => ({
  entries: [],
  push: (batch) => {
    if (!batch.length) return;
    const fresh = [...batch].sort((a, b) => b.at_s - a.at_s);
    set((s) => ({ entries: [...fresh, ...s.entries].slice(0, ACTIVITY_CAP) }));
  },
}));

// ---------------------------------------------------------------- helpers

function now_s(): number {
  return useSim.getState().snap?.sim_time_s ?? world.sim_time_s;
}

/** `subjectOf` in agentic.ts is private; this is the same one-liner, not a second rule. */
function subjectOf(a: Alert): string {
  return a.vehicle_id ?? a.route_id ?? a.operator_id ?? 'network';
}

// ---------------------------------------------------------------- 1. rule firings

const seenAlerts = new Set<string>();

function fromAlerts(alerts: readonly Alert[]): ActivityEntry[] {
  const out: ActivityEntry[] = [];
  const live = new Set<string>();
  for (const a of alerts) {
    live.add(a.id);
    if (seenAlerts.has(a.id)) continue;
    seenAlerts.add(a.id);
    const agent = agentForAlert(a);
    out.push({
      id: `raise:${a.id}:${a.raised_at_s}`,
      at_s: a.raised_at_s,
      agentId: agent.id,
      icon: AGENT_ICON[agent.id],
      tone: 'alert',
      headline: { key: 'ag.act.raised', params: { rule: a.rule_id, subject: subjectOf(a) } },
      detail:
        a.metric.threshold === 0
          ? { key: 'ag.act.raisedFlag', params: { name: a.metric.name, pax: a.pax_affected } }
          : {
              key: 'ag.act.raisedDetail',
              params: {
                name: a.metric.name,
                value: a.metric.value,
                threshold: a.metric.threshold,
                unit: a.metric.unit ? ` ${a.metric.unit}` : '',
                pax: a.pax_affected,
              },
            },
    });
  }
  // an alert that cleared is forgotten, so a genuine re-raise is reported again.
  for (const id of seenAlerts) if (!live.has(id)) seenAlerts.delete(id);
  return out;
}

// ---------------------------------------------------------------- 2. stage transitions

const seenStage = new Map<string, DecisionStage>();

/** `detected` is not reported: the rule firing above is the same moment, better named. */
const STAGE_TONE: Partial<Record<DecisionStage, ActivityTone>> = {
  reasoning: 'agent',
  recommended: 'agent',
  approved: 'human',
  rejected: 'human',
  completed: 'info',
};

function fromDecisions(decisions: Record<string, AgentDecision>): ActivityEntry[] {
  const out: ActivityEntry[] = [];
  for (const d of Object.values(decisions)) {
    const prev = seenStage.get(d.id);
    if (prev === d.stage) continue;
    seenStage.set(d.id, d.stage);
    const tone = STAGE_TONE[d.stage];
    if (!tone) continue;
    const human = isHumanStage(d.stage);
    const at = human ? (d.completedAt ?? d.approvedAt) : undefined;
    out.push({
      id: `stage:${d.id}:${d.stage}`,
      at_s: at ? simSecondsOf(at) : now_s(),
      agentId: d.agentId,
      icon: human ? 'user' : AGENT_ICON[d.agentId],
      tone,
      headline: { key: `ag.act.${d.stage}`, params: { rule: d.recommendation.event_type } },
      detail: human
        ? { key: 'ag.act.byRole', params: { role: d.approvedBy ?? '—', id: d.eventId ?? d.alertIds[0]! } }
        : { key: 'ag.act.conf', params: { pct: Math.round(d.confidence * 100), id: d.alertIds[0]! } },
    });
  }
  for (const id of seenStage.keys()) if (!decisions[id]) seenStage.delete(id);
  return out;
}

// ---------------------------------------------------------------- 3. operator audit log

/**
 * The audit log is prepend-only, so the new entries are exactly the ones in front of
 * the last length we saw. The two AI actions are skipped: the stage transition above
 * already reports them, and with the agent's attribution rather than the bare action.
 */
let auditSeen = 0;
const AI_ACTIONS = new Set(['approve_ai_recommendation', 'dismiss_ai_recommendation']);

function fromAudit(audit: readonly AuditEntry[]): ActivityEntry[] {
  const fresh = audit.slice(0, Math.max(0, audit.length - auditSeen));
  auditSeen = audit.length;
  const out: ActivityEntry[] = [];
  fresh.forEach((e, i) => {
    if (AI_ACTIONS.has(e.action)) return;
    out.push({
      id: `audit:${audit.length - i}:${e.action}:${e.target}`,
      at_s: simSecondsOf(e.at),
      agentId: null,
      icon: 'user',
      tone: 'human',
      headline: { key: 'ag.act.audit', params: { action: e.action } },
      detail: { key: 'ag.act.auditDetail', params: { actor: e.actor, target: e.target, detail: e.detail ?? '' } },
    });
  });
  return out;
}

// ---------------------------------------------------------------- 4. comms

const seenMsg = new Set<string>();

function fromComms(passenger: readonly PassengerMessage[], coordination: readonly CoordinationMessage[]): ActivityEntry[] {
  const out: ActivityEntry[] = [];
  for (const m of passenger) {
    // keyed on the status too, so the draft and its approval are two rows.
    const key = `pm:${m.message_id}:${m.status}`;
    if (seenMsg.has(key)) continue;
    seenMsg.add(key);
    out.push({
      id: key,
      at_s: simSecondsOf(m.created_at),
      agentId: null,
      icon: 'comms',
      tone: m.status === 'active' ? 'human' : 'info',
      headline: { key: m.status === 'active' ? 'ag.act.commsSent' : 'ag.act.commsDraft', params: { id: m.message_id } },
      detail: { key: 'ag.act.commsDetail', params: { category: m.category, channels: m.channels.join(', ') } },
    });
  }
  for (const c of coordination) {
    const key = `cm:${c.communication_id}`;
    if (seenMsg.has(key)) continue;
    seenMsg.add(key);
    out.push({
      id: key,
      at_s: simSecondsOf(c.sent_at),
      agentId: null,
      icon: 'comms',
      tone: 'human',
      headline: { key: 'ag.act.commsCoord', params: { id: c.communication_id } },
      detail: { key: 'ag.act.commsCoordDetail', params: { type: c.message_type, to: c.recipient } },
    });
  }
  return out;
}

// ---------------------------------------------------------------- wiring

/**
 * Four subscriptions at module load, matching `store/agentic.ts:391`. The first call of
 * each runs against whatever state already exists, so a feed mounted mid-demo opens
 * populated rather than empty.
 */
const push = (batch: ActivityEntry[]) => useActivity.getState().push(batch);

push(fromAlerts(useAlerts.getState().alerts));
push(fromDecisions(useAgentic.getState().decisions));
push(fromAudit(useEvents.getState().audit));
push(fromComms(useComms.getState().passenger, useComms.getState().coordination));

useAlerts.subscribe((s) => push(fromAlerts(s.alerts)));
useAgentic.subscribe((s) => push(fromDecisions(s.decisions)));
useEvents.subscribe((s) => push(fromAudit(s.audit)));
useComms.subscribe((s) => push(fromComms(s.passenger, s.coordination)));

/** Names the pipeline the feed footer describes. Six, and the count is not hard-coded. */
export const AGENT_COUNT = Object.keys(AGENTS).length;
