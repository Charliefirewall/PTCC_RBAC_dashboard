/**
 * Zustand stores + the engine bridge.
 *
 * One `set` per store per tick. Vehicle positions deliberately do NOT live in React
 * state - the map reads them from the engine each frame (plan section 19.7).
 */

import { create } from 'zustand';
import { buildWorld } from '../data/build';
import { SimEngine, isoAt, parseHms } from '../sim/engine';
import type {
  Alert,
  AuditEntry,
  CoordinationMessage,
  EmergencyEvent,
  EventCategory,
  EventSeverity,
  Lang,
  PassengerMessage,
  RoleId,
  SimSnapshot,
  WorkflowStage,
} from '../sim/types';
import { WORKFLOW_STAGES } from '../sim/types';
import { deriveMetrics, evaluateRules, makeHysteresis, type DerivedMetrics } from '../rules/evaluate';
import {
  buildActions,
  categoryFor,
  emergencyLevelFor,
  gateStageFor,
  playbookFor,
  suggestSeverity,
} from '../rules/playbooks';
import { DEMO_DEFAULTS, type Thresholds } from '../rules/thresholds';
import { can } from '../modules/roles/roles';
import { runSop } from './sop';
import { SIM_DOW } from '../sim/baseline';

// Guarded: this module is imported by i18n and by the rules layer, and vitest runs with
// environment: 'node' where `location` does not exist - an unguarded read here made the
// whole store unimportable from a test, which is why no component-level test existed.
const params = new URLSearchParams(typeof location === 'undefined' ? '' : location.search);
export const SEED = Number(params.get('seed') ?? 20260921);
export const START_SIM = parseHms(params.get('t') ?? '07:40:00');

/** `?dow=` 0..6 (0 = Monday) or mon..sun. Baseline day for forecasts and analytics;
 *  the sim date itself (2026-09-21) is a Monday and does not change. */
const DOWS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
function readDow(): number {
  const v = (params.get('dow') ?? '').toLowerCase();
  const n = DOWS.indexOf(v.slice(0, 3));
  if (n >= 0) return n;
  const k = Number(v);
  return v !== '' && Number.isInteger(k) && k >= 0 && k <= 6 ? k : SIM_DOW;
}

export const world = buildWorld(SEED, START_SIM);
export const engine = new SimEngine(world);

// ---------------------------------------------------------------- sim store

interface SimState {
  snap: SimSnapshot | null;
  metrics: DerivedMetrics | null;
  running: boolean;
  speed: number;
  tick: number;
}

export const useSim = create<SimState>(() => ({
  snap: null,
  metrics: null,
  running: false,
  speed: 12,
  tick: 0,
}));

// ---------------------------------------------------------------- alerts

interface AlertState {
  alerts: Alert[];
  acknowledge: (id: string) => void;
}

export const useAlerts = create<AlertState>((set) => ({
  alerts: [],
  acknowledge: (id) =>
    set((s) => ({ alerts: s.alerts.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)) })),
}));

// ---------------------------------------------------------------- settings

export type Preset = 'wall' | 'ws' | 'laptop';
export type Theme = 'dark' | 'light';

/**
 * Theme persists across reloads and across in-app navigation. localStorage is wrapped
 * because a demo laptop on a locked-down corporate profile can throw on access, and a
 * storage exception must never be the thing that stops the demo booting.
 */
const THEME_KEY = 'ptcc.theme';
function readTheme(): Theme {
  const forced = params.get('theme');
  if (forced === 'light' || forced === 'dark') return forced;
  try {
    const v = localStorage.getItem(THEME_KEY);
    if (v === 'light' || v === 'dark') return v;
  } catch {
    /* private mode / blocked storage - fall through to the control-room default */
  }
  return 'dark';
}

/** Single place that mutates the document, so the map and charts can observe one signal. */
export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* ignore - theme still applies for this session */
  }
  window.dispatchEvent(new CustomEvent('ptcc:theme', { detail: theme }));
}

interface SettingsState {
  th: Thresholds;
  lang: Lang;
  preset: Preset;
  mode: 'wall' | 'operator';
  legend: 's7' | 's5';
  role: RoleId;
  theme: Theme;
  showEvidence: boolean;
  llmEnabled: boolean;
  /** PTCC L1 SOP: send the driver/operator notification without a click. The human
   *  gate on an automatic action is this switch plus Revoke on every sent message. */
  l1_auto_exec: boolean;
  /** baseline day of week, 0 = Monday */
  dow: number;
  setL1AutoExec(on: boolean): void;
  setDow(d: number): void;
  set<K extends keyof Thresholds>(k: K, v: Thresholds[K]): void;
  reset(): void;
  setLang(l: Lang): void;
  setMode(m: 'wall' | 'operator'): void;
  setPreset(p: Preset): void;
  setLegend(l: 's7' | 's5'): void;
  setRole(r: RoleId): void;
  setTheme(t: Theme): void;
  toggleTheme(): void;
  toggleEvidence(): void;
}

export const useSettings = create<SettingsState>((set) => ({
  th: { ...DEMO_DEFAULTS },
  lang: (params.get('lang') as Lang) ?? 'en',
  preset: (params.get('preset') as Preset) ?? (import.meta.env.VITE_PRESET as Preset) ?? 'laptop',
  mode: params.get('mode') === 'wall' ? 'wall' : 'operator',
  legend: 's7',
  role: 'operations_controller',
  theme: readTheme(),
  showEvidence: params.get('evidence') === '1',
  llmEnabled: import.meta.env.VITE_LLM_ENABLED === 'true',
  l1_auto_exec: params.get('l1auto') !== '0',
  dow: readDow(),
  setL1AutoExec: (l1_auto_exec) => set({ l1_auto_exec }),
  setDow: (dow) => set({ dow: Math.max(0, Math.min(6, Math.round(dow))) }),
  set: (k, v) => {
    set((s) => ({ th: { ...s.th, [k]: v } }));
    reevaluate();
  },
  reset: () => {
    set({ th: { ...DEMO_DEFAULTS } });
    reevaluate();
  },
  setLang: (lang) => set({ lang }),
  setMode: (mode) => set({ mode }),
  setPreset: (preset) => set({ preset }),
  setLegend: (legend) => set({ legend }),
  setRole: (role) => set({ role }),
  // Store first, THEN notify. applyTheme() dispatches 'ptcc:theme' synchronously, so
  // a listener that reads useSettings.getState().theme must find the new value already
  // committed - otherwise every subscriber has to know to read the DOM instead.
  setTheme: (theme) => {
    set({ theme });
    applyTheme(theme);
  },
  toggleTheme: () => {
    const theme: Theme = useSettings.getState().theme === 'dark' ? 'light' : 'dark';
    set({ theme });
    applyTheme(theme);
  },
  toggleEvidence: () => set((s) => ({ showEvidence: !s.showEvidence })),
}));

// ---------------------------------------------------------------- events

interface EventState {
  events: EmergencyEvent[];
  audit: AuditEntry[];
  validate(
    alert: Alert,
    input: { event_type: string; category: EventCategory; severity_level: EventSeverity; description: string; by: string },
  ): EmergencyEvent;
  createManual(input: {
    event_type: string;
    category: EventCategory;
    severity_level: EventSeverity;
    description: string;
    detection_source: string;
    route_number?: string;
    bus_number?: string;
    by: string;
  }): EmergencyEvent;
  advance(event_id: string, by: string): { ok: true } | { ok: false; blocked: string[]; debounced?: true };
  completeAction(event_id: string, action_id: string, by: string): void;
  override(event_id: string, action_id: string, by: string, justification: string): void;
}

let eventSeq = 0;

/**
 * Double-click protection for advance(). The Advance button is large, and the stage it
 * moves to is only visible on the next paint - so a double click used to advance two
 * stages and write two audit rows. A stage transition is idempotent per click: a repeat
 * on the same event inside this window is dropped. Keyed per event, so advancing two
 * different events in quick succession still works.
 */
const ADVANCE_DEBOUNCE_MS = 600;
const lastAdvanceAt = new Map<string, number>();

export const useEvents = create<EventState>((set, get) => ({
  events: [],
  audit: [],
  validate: (alert, input) => {
    const now = isoAt(world.sim_time_s);
    const pb = playbookFor(input.event_type, alert.level);
    const v = alert.vehicle_id ? world.vehicleById.get(alert.vehicle_id) : undefined;
    const ev: EmergencyEvent = {
      event_id: `EV-2026-0921-${String(++eventSeq).padStart(3, '0')}`,
      event_type: input.event_type,
      category: input.category,
      severity_level: input.severity_level,
      bus_number: alert.vehicle_id ?? null,
      route_number: alert.route_id ?? null,
      driver_id: v?.driver_id ?? null,
      location: {
        latitude: v?.latitude ?? 47.9188,
        longitude: v?.longitude ?? 106.9176,
        label: alert.route_id ? `Route ${alert.route_id.slice(1)}` : 'Network',
      },
      timestamp: now,
      detection_source: alert.tier === 3 ? 'ai_analytics' : alert.vehicle_id ? 'tbox' : 'ubcard',
      description: input.description,
      associated_alert_ids: [alert.id],
      stage: 'creation',
      history: [
        { stage: 'detection', at: alert.raised_at, by: 'system' },
        { stage: 'validation', at: now, by: input.by },
        { stage: 'creation', at: now, by: input.by },
      ],
      actions: buildActions(pb),
      playbook: pb,
      emergency_level: emergencyLevelFor(input.severity_level),
      evidence: [
        { kind: 'telemetry', ref: alert.vehicle_id ?? alert.route_id ?? '' },
        { kind: 'gps_history', ref: alert.vehicle_id ?? '' },
        { kind: 'alerts', ref: alert.id },
        { kind: 'cctv', ref: alert.vehicle_id ?? '' },
      ],
      created_by: input.by,
    };
    set((s) => ({
      events: [ev, ...s.events],
      audit: [
        { at: now, actor: input.by, role: useSettings.getState().role, action: 'validate_alert', target: ev.event_id },
        ...s.audit,
      ],
    }));
    useAlerts.setState((s) => ({
      alerts: s.alerts.map((a) => (a.id === alert.id ? { ...a, validated_event_id: ev.event_id } : a)),
    }));
    return ev;
  },

  createManual: (input) => {
    const now = isoAt(world.sim_time_s);
    const pb = playbookFor(input.event_type);
    const ev: EmergencyEvent = {
      event_id: `EV-2026-0921-${String(++eventSeq).padStart(3, '0')}`,
      event_type: input.event_type,
      category: input.category,
      severity_level: input.severity_level,
      bus_number: input.bus_number ?? null,
      route_number: input.route_number ?? null,
      driver_id: null,
      location: { latitude: 47.9188, longitude: 106.9176, label: input.route_number ?? 'Network' },
      timestamp: now,
      detection_source: input.detection_source,
      description: input.description,
      associated_alert_ids: [],
      stage: 'creation',
      history: [
        { stage: 'detection', at: now, by: input.by },
        { stage: 'validation', at: now, by: input.by },
        { stage: 'creation', at: now, by: input.by },
      ],
      actions: buildActions(pb),
      playbook: pb,
      emergency_level: emergencyLevelFor(input.severity_level),
      evidence: [{ kind: 'action_log', ref: input.by }],
      created_by: input.by,
    };
    // Every other write path appends to `audit`; this one did not, so a manually created
    // event was invisible to the audit tab AND to the activity feed (which reads audit).
    // An event that exists but was never recorded as having been created is exactly the
    // hole an audit log exists to close.
    set((s) => ({
      events: [ev, ...s.events],
      audit: [
        {
          at: now,
          actor: input.by,
          role: useSettings.getState().role,
          action: 'create_manual_event',
          target: ev.event_id,
          detail: input.event_type,
        },
        ...s.audit,
      ],
    }));
    return ev;
  },

  advance: (event_id, by) => {
    // Guard at the STORE, not the widget. `can()` was only consulted by four role
    // dashboard widgets that are already assigned to roles holding the permission,
    // so no check in the app could ever fire - while the identical actions were
    // ungated on the Emergency Handling screen. One early-return here is smaller
    // than 13 call sites and cannot be bypassed by a second caller.
    if (!can(useSettings.getState().role, 'advance_stage')) return { ok: false, blocked: [] };

    const ev = get().events.find((e) => e.event_id === event_id);
    if (!ev) return { ok: false, blocked: [] };
    const i = WORKFLOW_STAGES.indexOf(ev.stage);
    const next = WORKFLOW_STAGES[i + 1];
    if (!next) return { ok: false, blocked: [] };
    // L1346: compulsory actions gate stage progression and closure
    const blocked = ev.actions
      .filter((a) => a.compulsory && !a.done && !a.overridden_by)
      .filter((a) => {
        const gate = gateStageFor(a.label_key);
        return gate === next || (gate === 'closure' && next === 'closure') || (gate === 'resolution' && next === 'resolution');
      })
      .map((a) => a.label_key);
    if (blocked.length) return { ok: false, blocked };
    // Only a transition that would actually happen opens the debounce window - a blocked
    // click must stay answerable the moment its blocker clears.
    const at = Date.now();
    const prev = lastAdvanceAt.get(event_id);
    if (prev !== undefined && at - prev < ADVANCE_DEBOUNCE_MS) return { ok: false, blocked: [], debounced: true };
    lastAdvanceAt.set(event_id, at);
    const now = isoAt(world.sim_time_s);
    set((s) => ({
      events: s.events.map((e) =>
        e.event_id === event_id
          ? {
              ...e,
              stage: next,
              history: [...e.history, { stage: next, at: now, by }],
              closed_at: next === 'closure' ? now : e.closed_at,
            }
          : e,
      ),
      audit: [
        { at: now, actor: by, role: useSettings.getState().role, action: `advance:${next}`, target: event_id },
        ...s.audit,
      ],
    }));
    return { ok: true };
  },

  completeAction: (event_id, action_id, by) => {
    // Guard at the STORE, not the widget. `can()` was only consulted by four role
    // dashboard widgets that are already assigned to roles holding the permission,
    // so no check in the app could ever fire - while the identical actions were
    // ungated on the Emergency Handling screen. One early-return here is smaller
    // than 13 call sites and cannot be bypassed by a second caller.
    if (!can(useSettings.getState().role, 'complete_action')) return;

    const now = isoAt(world.sim_time_s);
    set((s) => ({
      events: s.events.map((e) =>
        e.event_id === event_id
          ? { ...e, actions: e.actions.map((a) => (a.id === action_id ? { ...a, done: true, done_at: now } : a)) }
          : e,
      ),
      audit: [{ at: now, actor: by, role: useSettings.getState().role, action: 'complete_action', target: `${event_id}/${action_id}` }, ...s.audit],
    }));
  },

  override: (event_id, action_id, by, justification) => {
    // L1347 is the one CONFIRMED exclusive permission in the model. Enforcing it only
    // via `disabled` on a button left the rule bypassable by any other caller, and the
    // audit row below hardcoded `role: 'supervisor'` regardless of who actually acted -
    // i.e. a non-supervisor override would have been RECORDED AS a supervisor's. An
    // audit log that can lie about the actor is worse than no audit log.
    const role = useSettings.getState().role;
    if (!can(role, 'override_compulsory')) return;
    if (justification.trim().length < 10) return;
    const now = isoAt(world.sim_time_s);
    set((s) => ({
      events: s.events.map((e) =>
        e.event_id === event_id
          ? {
              ...e,
              actions: e.actions.map((a) =>
                a.id === action_id ? { ...a, overridden_by: by, justification, done_at: now } : a,
              ),
            }
          : e,
      ),
      // L1347: overrides must be recorded with justification and audit logging
      audit: [
        { at: now, actor: by, role, action: 'OVERRIDE compulsory action', target: `${event_id}/${action_id}`, detail: justification },
        ...s.audit,
      ],
    }));
  },
}));

// ---------------------------------------------------------------- comms

interface CommsState {
  passenger: PassengerMessage[];
  coordination: CoordinationMessage[];
  draftPassenger(m: Omit<PassengerMessage, 'message_id' | 'created_at' | 'status'>): PassengerMessage;
  approve(message_id: string, by: string): void;
  sendCoordination(m: Omit<CoordinationMessage, 'communication_id' | 'sent_at'>): CoordinationMessage | undefined;
  /** L1 SOP: the system sends. No role check - the gates are the Settings switch and revoke(). */
  sendSystemCoordination(m: Omit<CoordinationMessage, 'communication_id' | 'sent_at' | 'auto' | 'status'>): CoordinationMessage;
  /** L3 SOP: the system prepares, a person sends. */
  draftCoordination(m: Omit<CoordinationMessage, 'communication_id' | 'sent_at' | 'status'>): CoordinationMessage;
  sendDraft(communication_id: string, by: string): boolean;
  revoke(communication_id: string, by: string): boolean;
}

function audit(action: string, target: string, actor: string, detail?: string): void {
  useEvents.setState((s) => ({
    audit: [
      { at: isoAt(world.sim_time_s), actor, role: useSettings.getState().role, action, target, detail },
      ...s.audit,
    ],
  }));
}

let msgSeq = 0;
export const useComms = create<CommsState>((set) => ({
  passenger: [],
  coordination: [],
  draftPassenger: (m) => {
    const msg: PassengerMessage = {
      ...m,
      message_id: `PM-${String(++msgSeq).padStart(4, '0')}`,
      created_at: isoAt(world.sim_time_s),
      status: 'pending_approval', // L1443: approval required before dispatch
    };
    set((s) => ({ passenger: [msg, ...s.passenger] }));
    return msg;
  },
  approve: (message_id, by) => {
    // Guard at the STORE, not the widget. `can()` was only consulted by four role
    // dashboard widgets that are already assigned to roles holding the permission,
    // so no check in the app could ever fire - while the identical actions were
    // ungated on the Emergency Handling screen. One early-return here is smaller
    // than 13 call sites and cannot be bypassed by a second caller.
    if (!can(useSettings.getState().role, 'approve_message')) return;

    set((s) => ({
      passenger: s.passenger.map((p) => (p.message_id === message_id ? { ...p, status: 'active' } : p)),
    }));
    useEvents.setState((s) => ({
      audit: [
        { at: isoAt(world.sim_time_s), actor: by, role: useSettings.getState().role, action: 'approve_message', target: message_id },
        ...s.audit,
      ],
    }));
  },
  sendCoordination: (m) => {
    // Guard at the STORE, not the widget. `can()` was only consulted by four role
    // dashboard widgets that are already assigned to roles holding the permission,
    // so no check in the app could ever fire - while the identical actions were
    // ungated on the Emergency Handling screen. One early-return here is smaller
    // than 13 call sites and cannot be bypassed by a second caller.
    if (!can(useSettings.getState().role, 'send_coordination')) return;

    const msg: CoordinationMessage = {
      ...m,
      communication_id: `CM-${String(++msgSeq).padStart(4, '0')}`,
      sent_at: isoAt(world.sim_time_s),
    };
    set((s) => ({ coordination: [msg, ...s.coordination] }));
    return msg;
  },
  sendSystemCoordination: (m) => {
    const msg: CoordinationMessage = {
      ...m,
      communication_id: `CM-${String(++msgSeq).padStart(4, '0')}`,
      sent_at: isoAt(world.sim_time_s),
      status: 'sent',
      auto: true,
    };
    set((s) => ({ coordination: [msg, ...s.coordination] }));
    audit('auto_exec_l1', m.alert_id ?? msg.communication_id, 'system', msg.communication_id);
    return msg;
  },
  draftCoordination: (m) => {
    const msg: CoordinationMessage = {
      ...m,
      communication_id: `CM-${String(++msgSeq).padStart(4, '0')}`,
      sent_at: isoAt(world.sim_time_s),
      status: 'draft',
    };
    set((s) => ({ coordination: [msg, ...s.coordination] }));
    audit('auto_draft_l3', m.alert_id ?? msg.communication_id, 'system', `${msg.communication_id} -> ${m.recipient}`);
    return msg;
  },
  sendDraft: (id, by) => {
    if (!can(useSettings.getState().role, 'send_coordination')) return false;
    const msg = useComms.getState().coordination.find((c) => c.communication_id === id);
    if (!msg || msg.status !== 'draft') return false;
    set((s) => ({
      coordination: s.coordination.map((c) =>
        c.communication_id === id ? { ...c, status: 'sent', sent_at: isoAt(world.sim_time_s), operator: by } : c,
      ),
    }));
    audit('send_draft', id, by, msg.recipient);
    return true;
  },
  revoke: (id, by) => {
    if (!can(useSettings.getState().role, 'revoke_auto_action')) return false;
    const msg = useComms.getState().coordination.find((c) => c.communication_id === id);
    if (!msg || !msg.auto || msg.status === 'revoked') return false;
    const at = isoAt(world.sim_time_s);
    set((s) => ({
      coordination: s.coordination.map((c) =>
        c.communication_id === id ? { ...c, status: 'revoked', revoked_at: at, revoked_by: by } : c,
      ),
    }));
    audit('revoke_auto_comms', id, by, msg.alert_id);
    return true;
  },
}));

// ---------------------------------------------------------------- selection

interface SelState {
  vehicle_id: string | null;
  route_id: string | null;
  alert_id: string | null;
  event_id: string | null;
  selectVehicle(id: string | null): void;
  selectRoute(id: string | null): void;
  selectAlert(id: string | null): void;
  selectEvent(id: string | null): void;
}

export const useSelection = create<SelState>((set) => ({
  vehicle_id: null,
  route_id: null,
  alert_id: null,
  event_id: null,
  selectVehicle: (vehicle_id) =>
    set({ vehicle_id, route_id: vehicle_id ? (world.vehicleById.get(vehicle_id)?.route_id ?? null) : null }),
  selectRoute: (route_id) => set({ route_id }),
  selectAlert: (alert_id) => set({ alert_id }),
  selectEvent: (event_id) => set({ event_id }),
}));

// ---------------------------------------------------------------- history rings

export { Ring } from '../sim/ring';
import { Ring } from '../sim/ring';

export const history = {
  kpi: {
    in_service: new Ring(360),
    alerts: new Ring(360),
    critical: new Ring(360),
    ridership: new Ring(360),
    health: new Ring(360),
  },
  headway: new Map<string, Ring>(),
  load: new Map<string, Ring>(),
  /** sim seconds at each sample, for chart x-axes */
  t: new Ring(360),
};

function ringFor(map: Map<string, Ring>, key: string): Ring {
  let r = map.get(key);
  if (!r) map.set(key, (r = new Ring(360)));
  return r;
}

// ---------------------------------------------------------------- bridge

const hy = makeHysteresis();

export function reevaluate(): void {
  const snap = useSim.getState().snap;
  if (!snap) return;
  const th = useSettings.getState().th;
  const metrics = deriveMetrics(snap, th);
  const { alerts: evaluated } = evaluateRules(snap, metrics, th, useAlerts.getState().alerts, hy);
  const alerts = runSop(evaluated, snap.sim_time_s);
  useSim.setState({ metrics });
  useAlerts.setState({ alerts });
}

export function startBridge(): () => void {
  return engine.on((snap) => {
    const th = useSettings.getState().th;
    const metrics = deriveMetrics(snap, th);
    const { alerts: evaluated } = evaluateRules(snap, metrics, th, useAlerts.getState().alerts, hy);
    const alerts = runSop(evaluated, snap.sim_time_s);

    history.t.push(snap.sim_time_s);
    history.kpi.in_service.push(metrics.in_service);
    history.kpi.alerts.push(alerts.length);
    history.kpi.critical.push(alerts.filter((a) => a.severity === 'critical').length);
    history.kpi.ridership.push(metrics.ridership_today);
    history.kpi.health.push(metrics.system_health_pct);
    for (const rm of metrics.per_route.values()) {
      ringFor(history.headway, rm.route_id).push(rm.max_gap_s);
      ringFor(history.load, rm.route_id).push(rm.load_pct);
    }

    useSim.setState((s) => ({ snap, metrics, tick: s.tick + 1, running: engine.isRunning(), speed: engine.speed }));
    useAlerts.setState({ alerts });
  });
}

/**
 * Expose the stores for the data-consistency overlay, the Playwright audit and the
 * presenter's pre-flight check (plan T12/T37). Read-only in practice: nothing in the
 * app reads from here, it exists so a check can compare what the tiles claim against
 * what the engine actually holds.
 */
declare global {
  interface Window {
    __ptcc?: Record<string, unknown>;
  }
}
if (typeof window !== 'undefined') {
  window.__ptcc = {
    useSim,
    useAlerts,
    useEvents,
    useComms,
    useSettings,
    useSelection,
    engine,
    world,
    history,
    reevaluate,
  };
}

/** Warm-up so the demo opens with a plausible state rather than an empty one. */
export function warmup(ticks: number): void {
  for (let i = 0; i < ticks; i++) engine.tick();
}
