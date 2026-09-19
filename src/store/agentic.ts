/**
 * The agent layer.
 *
 * THERE IS NO NEW INTELLIGENCE IN THIS FILE. An "agent" here is a PRESENTATION over
 * machinery that already exists and is already deterministic:
 *
 *   - Tier 1: the rule engine in `rules/evaluate.ts`. Every finding an agent reports
 *     is an `Alert` that `evaluateRules()` raised, carrying the observed value and
 *     the threshold it broke.
 *   - Tier 2: the four documented playbooks in `rules/playbooks.ts` (L1349-L1382).
 *     The "expected effect" of a recommendation is that playbook, not a forecast.
 *   - Tier 3: the repeated-failure pattern counter (L1124).
 *   - Tier 4: the conversational surface in `agent/index.ts`. ASSUMPTION, labelled.
 *
 * Grouping those rules under named agents with named remits is OUR framing
 * (ASSUMPTION) - no source names an agent. What each agent reports is not.
 *
 * TIER 5 IS OUT OF SCOPE AND NOT REPRESENTABLE HERE. The lifecycle is
 * DETECT -> REASON -> RECOMMEND -> HUMAN APPROVES -> COMPLETED. `approve()` records a
 * human decision and writes to the audit log; it does not touch the simulation, the
 * fleet, or any threshold. Completion is driven by the operator's own validation flow
 * (the alert gaining a `validated_event_id`) or by the condition clearing - never by
 * an agent deciding it is done. Operator validation is mandatory before an alert
 * becomes an event (L1235) and PTCC is not a command authority (L718).
 */

import { create } from 'zustand';
import type { Alert, EventSeverity, PlaybookId, RoleId } from '../sim/types';
import { PLAYBOOKS, eventTypeForAlert, playbookFor, suggestSeverity } from '../rules/playbooks';
import { THRESHOLD_META, type Thresholds } from '../rules/thresholds';
import { isoAt } from '../sim/engine';
import { useAlerts, useEvents, useSettings, useSim, world } from '../store';

// ---------------------------------------------------------------- agents

export type AgentId = 'regularity' | 'crowding' | 'safety' | 'equipment' | 'pattern' | 'response';

export interface AgentDef {
  id: AgentId;
  nameKey: string;
  remitKey: string;
  /** the tier of the machinery the agent is a face for - never the tier of the UI. */
  tier: 1 | 2 | 3;
  /** `rule_id` values produced by evaluateRules(). `response` owns none: it reads playbooks. */
  rules: readonly string[];
  cite: string;
}

export const AGENTS: Record<AgentId, AgentDef> = {
  regularity: {
    id: 'regularity',
    nameKey: 'ag.agent.regularity',
    remitKey: 'ag.remit.regularity',
    tier: 1,
    rules: ['service_gap', 'bunching', 'schedule_deviation'],
    cite: 'L1053-L1055 · Table 11',
  },
  crowding: {
    id: 'crowding',
    nameKey: 'ag.agent.crowding',
    remitKey: 'ag.remit.crowding',
    tier: 1,
    rules: ['overcrowding'],
    cite: 'L1021, L1042 · S8',
  },
  safety: {
    id: 'safety',
    nameKey: 'ag.agent.safety',
    remitKey: 'ag.remit.safety',
    tier: 1,
    rules: ['panic', 'accident', 'vehicle_breakdown', 'route_deviation', 'harsh_braking', 'overspeed'],
    cite: 'L1175 · Table 9',
  },
  equipment: {
    id: 'equipment',
    nameKey: 'ag.agent.equipment',
    remitKey: 'ag.remit.equipment',
    tier: 1,
    rules: ['equipment_afc', 'equipment_cctv', 'equipment_tbox'],
    cite: 'L1119-L1122 · Table 13',
  },
  pattern: {
    id: 'pattern',
    nameKey: 'ag.agent.pattern',
    remitKey: 'ag.remit.pattern',
    tier: 3,
    rules: ['repeated_failure'],
    cite: 'L1124',
  },
  response: {
    id: 'response',
    nameKey: 'ag.agent.response',
    remitKey: 'ag.remit.response',
    tier: 2,
    rules: [],
    cite: 'L1349-L1382',
  },
};

export const AGENT_ORDER: AgentId[] = ['regularity', 'crowding', 'safety', 'equipment', 'pattern', 'response'];

const RULE_TO_AGENT = new Map<string, AgentId>();
for (const a of Object.values(AGENTS)) for (const r of a.rules) RULE_TO_AGENT.set(r, a.id);

/** Unmapped rule ids fall to the Safety Agent only if they are vehicle-safety typed. */
export function agentForAlert(a: Alert): AgentDef {
  const id = RULE_TO_AGENT.get(a.rule_id) ?? (a.type === 'equipment_failure' ? 'equipment' : 'safety');
  return AGENTS[id];
}

/** Which agent's data answers a Copilot intent. `null` = the Tier 4 router itself. */
export function agentForIntent(intent: string): AgentDef | null {
  switch (intent) {
    case 'why_delayed':
      return AGENTS.regularity;
    case 'overcrowded':
      return AGENTS.crowding;
    case 'where_bus':
      return AGENTS.safety;
    case 'device_health':
      return AGENTS.equipment;
    case 'recommend_actions':
    case 'open_events':
      return AGENTS.response;
    default:
      return null;
  }
}

// ---------------------------------------------------------------- decision model

export type DecisionStage = 'detected' | 'reasoning' | 'recommended' | 'approved' | 'rejected' | 'completed';

/** An i18n key plus its params. Numbers can only reach the screen through `params`. */
export interface Phrase {
  key: string;
  params?: Record<string, string | number>;
}

export interface ReasoningStep {
  text: Phrase;
  /** the metric record the step actually read, copied off the Alert. Never synthesised. */
  metric?: Alert['metric'];
  /** where the rule behind this step comes from. */
  cite: string;
}

export interface AgentDecision {
  id: string;
  agentId: AgentId;
  stage: DecisionStage;
  /** 0-1. A function of the breach size - see confidenceOf(). ASSUMPTION. */
  confidence: number;
  reasoning: ReasoningStep[];
  recommendation: {
    label: Phrase;
    rationale: Phrase;
    expected_effect: Phrase;
    /** exactly what the operator's Validate dialog would be pre-filled with. */
    event_type: string;
    severity_level: EventSeverity;
    playbook: PlaybookId;
  };
  alertIds: string[];
  eventId?: string;
  detectedAt: string;
  /** sim seconds, so the stage clock runs on the simulation, not on wall time. */
  detectedAt_s: number;
  approvedBy?: RoleId;
  approvedAt?: string;
  completedAt?: string;
}

const HUMAN_STAGES = new Set<DecisionStage>(['approved', 'rejected', 'completed']);
export function isHumanStage(s: DecisionStage): boolean {
  return HUMAN_STAGES.has(s);
}

/**
 * ASSUMPTION: no source defines a confidence score, so this one is deliberately not a
 * model - it is a pure function of how far the observed value sits past its threshold.
 * It therefore cannot disagree with the data it is scoring. A boolean telemetry flag
 * (threshold 0) is OBSERVED, not estimated, so it scores 1.
 */
export function confidenceOf(m: Alert['metric']): number {
  if (m.threshold === 0) return 1;
  const over = Math.abs(m.value) / Math.abs(m.threshold);
  return Math.min(0.99, 0.6 + 0.39 * Math.min(1, Math.max(0, over - 1) / 0.5));
}

/** Sim seconds an agent spends visibly detecting, then reasoning. Demo pacing only. */
const REASON_AT_S = 10;
const RECOMMEND_AT_S = 25;

function autoStage(age_s: number): DecisionStage {
  return age_s < REASON_AT_S ? 'detected' : age_s < RECOMMEND_AT_S ? 'reasoning' : 'recommended';
}

function subjectOf(a: Alert): string {
  return a.vehicle_id ?? a.route_id ?? a.operator_id ?? 'network';
}

function metaFor(name: string): { table: string; unit: string } | undefined {
  const k = (
    name === 'headway_s' ? 'service_gap_max_s'
    : name === 'min_headway_s' ? 'bunching_min_headway_s'
    : name === 'load_pct' ? 'passenger_load_pct'
    : name === 'offline_s' ? 'failure_duration_s'
    : name === 'speed' ? 'overspeed_kmh'
    : name
  ) as keyof Thresholds;
  return THRESHOLD_META[k];
}

function buildDecision(a: Alert, all: readonly Alert[], now_s: number): AgentDecision {
  const agent = agentForAlert(a);
  const subject = subjectOf(a);
  const unit = a.metric.unit ? ` ${a.metric.unit}` : '';
  const flag = a.metric.threshold === 0;
  const others = all.filter((x) => x.id !== a.id && subjectOf(x) === subject).length;

  const steps: ReasoningStep[] = [
    {
      text: flag
        ? { key: 'ag.r.flag', params: { subject, name: a.metric.name } }
        : { key: 'ag.r.observed', params: { rule: a.rule_id, name: a.metric.name, value: a.metric.value, unit, subject } },
      metric: a.metric,
      cite: agent.cite,
    },
  ];
  if (!flag) {
    const meta = metaFor(a.metric.name);
    steps.push({
      text: {
        key: 'ag.r.threshold',
        params: {
          threshold: a.metric.threshold,
          unit,
          table: meta?.table ?? '—',
          over: (Math.abs(a.metric.value) / Math.abs(a.metric.threshold)).toFixed(2),
        },
      },
      metric: a.metric,
      cite: 'R1331',
    });
  }
  steps.push({
    // S3/S10 prioritise by severity AND impact; S8 says passenger impact raises it.
    text: { key: 'ag.r.impact', params: { pax: a.pax_affected, score: a.impact_score } },
    cite: 'S3 · S8 · S10',
  });
  steps.push({
    text: others
      ? { key: 'ag.r.corroborate', params: { n: others, subject } }
      : { key: 'ag.r.alone', params: { subject } },
    cite: 'L1175',
  });

  // Must go through the same normalisation the operator's Validate dialog uses, or the
  // playbook this card advertises is not the playbook the created event carries. Using
  // rule_id raw dropped panic, harsh_braking, overspeed, equipment_* and repeated_failure
  // to the `generic` playbook - panic thereby lost request_towing, a resolution-gated
  // compulsory action. Presentation must never weaken a gate (see rules.test.ts).
  const event_type = eventTypeForAlert(a.rule_id, a.type);
  const severity_level = suggestSeverity(a.severity, a.rule_id);
  const playbook = playbookFor(event_type);
  const pb = PLAYBOOKS[playbook];

  return {
    id: a.id,
    agentId: agent.id,
    stage: autoStage(0),
    confidence: confidenceOf(a.metric),
    reasoning: steps,
    recommendation: {
      label: { key: 'ag.rec.validate', params: { type: event_type, sev: severity_level, playbook } },
      rationale: flag
        ? { key: 'ag.rec.rationaleFlag', params: { rule: a.rule_id, subject } }
        : {
            key: 'ag.rec.rationale',
            params: { rule: a.rule_id, value: a.metric.value, unit, threshold: a.metric.threshold },
          },
      expected_effect: {
        key: 'ag.rec.effect',
        params: {
          playbook,
          n: pb.recommended.length,
          c: pb.compulsory.length,
          min: pb.target_response_min,
        },
      },
      event_type,
      severity_level,
      playbook,
    },
    alertIds: [a.id],
    detectedAt: isoAt(a.raised_at_s),
    detectedAt_s: a.raised_at_s,
  };
}

// ---------------------------------------------------------------- audit

/**
 * The audit log already exists on `useEvents` and every writer in the app appends to
 * it the same way (see `useComms.approve`). Reuse it - a second log would be a second
 * version of the truth (L1347).
 */
function audit(action: string, target: string, detail: string): string {
  const role = useSettings.getState().role;
  const at = isoAt(world.sim_time_s);
  useEvents.setState((s) => ({ audit: [{ at, actor: role, role, action, target, detail }, ...s.audit] }));
  return at;
}

// ---------------------------------------------------------------- store

interface AgenticState {
  decisions: Record<string, AgentDecision>;
  sync(alerts: readonly Alert[], now_s: number): void;
  approve(id: string): void;
  dismiss(id: string): void;
  /** Records that the human is writing their own version; the operator flow takes over. */
  modify(id: string): void;
}

export const useAgentic = create<AgenticState>((set, get) => ({
  decisions: {},

  sync: (alerts, now_s) =>
    set((st) => {
      const live = new Map(alerts.map((a) => [a.id, a]));
      const next: Record<string, AgentDecision> = {};

      // 1. decisions a human has already touched are kept, whatever the alert does -
      //    EXCEPT when the alert id has been recycled by a genuinely new breach.
      //    Alert ids are deterministic (`${rule_id}:${subject}`), so a condition that
      //    clears through hysteresis and then breaches again comes back on the SAME id
      //    with a NEW `raised_at_s`. Keeping the old human-staged decision would block
      //    loop 2 from ever rebuilding it (it skips human stages), and the Agent
      //    Console would show a stale "Rejected" card with the old detectedAt_s while
      //    the Alerts list shows the new breach - the two surfaces disagreeing for the
      //    rest of the demo. A different `raised_at_s` IS a different breach: drop the
      //    stale decision and let loop 2 build a fresh one. The human's action stays
      //    recorded where it belongs, in the audit log.
      for (const d of Object.values(st.decisions)) {
        if (!isHumanStage(d.stage)) continue;
        const a = live.get(d.alertIds[0]!);
        if (a && a.raised_at_s !== d.detectedAt_s) continue;
        if (d.stage === 'approved' && a?.validated_event_id) {
          // the operator validated it into an event: that, and only that, completes it.
          next[d.id] = { ...d, stage: 'completed', eventId: a.validated_event_id, completedAt: isoAt(now_s) };
        } else if (d.stage === 'approved' && !a) {
          next[d.id] = { ...d, stage: 'completed', completedAt: isoAt(now_s) };
        } else {
          next[d.id] = d;
        }
      }

      // 2. open alerts are rebuilt every tick, so the numbers shown are always the
      //    numbers the rule engine currently holds - never a stale copy.
      for (const a of alerts) {
        const prev = st.decisions[a.id];
        // A human-staged decision is kept by loop 1 unless the id was recycled by a new
        // breach, in which case `prev` is deliberately ignored and the new breach starts
        // its own clock. `evaluate.ts` keeps `raised_at_s` fixed for as long as an alert
        // stays open (it only spreads a fresh one on a re-raise), so the stage clock is
        // read straight off the alert - there is no second copy of the detection time.
        const recycled = !!prev && prev.detectedAt_s !== a.raised_at_s;
        if (prev && isHumanStage(prev.stage) && !recycled) continue;
        const d = buildDecision(a, alerts, now_s);
        next[a.id] = { ...d, stage: autoStage(now_s - d.detectedAt_s) };
      }

      // anything else: the condition cleared before a human saw it. Drop it silently -
      // an undecided recommendation for an alert that no longer exists is noise.
      return { decisions: next };
    }),

  approve: (id) => {
    const d = get().decisions[id];
    if (!d || d.stage !== 'recommended') return;
    const role = useSettings.getState().role;
    const at = audit('approve_ai_recommendation', d.alertIds[0]!, `${d.agentId} · ${Math.round(d.confidence * 100)} %`);
    set((s) => ({
      decisions: { ...s.decisions, [id]: { ...d, stage: 'approved', approvedBy: role, approvedAt: at } },
    }));
  },

  dismiss: (id) => {
    const d = get().decisions[id];
    if (!d || d.stage !== 'recommended') return;
    const role = useSettings.getState().role;
    const at = audit('dismiss_ai_recommendation', d.alertIds[0]!, d.agentId);
    set((s) => ({
      decisions: { ...s.decisions, [id]: { ...d, stage: 'rejected', approvedBy: role, approvedAt: at } },
    }));
  },

  modify: (id) => {
    const d = get().decisions[id];
    if (!d) return;
    audit('modify_ai_recommendation', d.alertIds[0]!, d.agentId);
  },
}));

/**
 * One subscription, at module load, so the feed is correct whichever view is mounted.
 * It reads the alert list the bridge already publishes; it never drives the engine.
 */
useAlerts.subscribe((s) => {
  useAgentic.getState().sync(s.alerts, useSim.getState().snap?.sim_time_s ?? world.sim_time_s);
});
