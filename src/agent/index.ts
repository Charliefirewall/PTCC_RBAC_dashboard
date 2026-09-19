/**
 * Tier 4 - the conversational surface. THE INTERFACE IS AN ASSUMPTION.
 *
 * No source describes a conversational interface: the client's deck contains one AI
 * reference, a chip icon with no supporting text. So this module does the smallest
 * honest thing - a deterministic intent router over a pattern table, and resolvers
 * that are pure reads of the same stores the dashboard renders. Nothing here computes
 * a number the rule engine did not already compute (plan 22.4-22.5).
 *
 * TIER 5 IS NOT REPRESENTABLE. `ProposedAction` carries a label and an href and
 * nothing else: there is no `execute`, no callback, no store setter imported here.
 * Every proposal navigates to the operator flow that already exists, because the
 * source makes operator validation mandatory before an alert becomes an event
 * (L1235) and states that PTCC is not a command authority (L718).
 *
 * Every number that appears in an answer's prose also appears in `facts`. That is
 * enforced by a test, and it is possible because none of the `cop.a.*` templates
 * contains a digit - the digits can only arrive through a fact value.
 */

import type {
  Alert,
  DeviceState,
  EmergencyEvent,
  Lang,
  OperatorId,
  Route,
  SimSnapshot,
  Vehicle,
} from '../sim/types';
import { deriveMetrics, type DerivedMetrics } from '../rules/evaluate';
import { DEMO_DEFAULTS, THRESHOLD_META, bandOf, type Thresholds } from '../rules/thresholds';
import { PLAYBOOKS, gateStageFor } from '../rules/playbooks';
import { hhmm, isoAt, type SpeedProfile } from '../sim/engine';
import { daypartOf } from '../sim/timetable';
import { engine, useAlerts, useComms, useEvents, useSelection, useSettings, useSim, world } from '../store';
import { t } from '../i18n/t';
import type { I18nKey } from '../i18n/dict';

// ---------------------------------------------------------------- public types

export type IntentName =
  | 'look_first'
  | 'why_delayed'
  | 'where_bus'
  | 'overcrowded'
  | 'open_events'
  | 'device_health'
  | 'operator_compare'
  | 'recommend_actions'
  | 'shift_brief'
  | 'threshold_lookup'
  | 'unknown';

export interface Intent {
  name: IntentName;
  slots: { route_id?: string; vehicle_id?: string; operator_id?: string };
  via: 'pattern' | 'canned';
}

export interface Citation {
  kind: 'alert' | 'vehicle' | 'route' | 'event' | 'threshold';
  id: string;
  label: string;
  href?: string;
}

/** Navigation only. No `execute` - see the file header (L1235, L718). */
export interface ProposedAction {
  label: string;
  href: string;
}

export interface AgentReply {
  text: string;
  /** the tier that produced the DATA. The UI always shows Tier 4 for itself. */
  tier: 1 | 2 | 3 | 4;
  citations: Citation[];
  proposals: ProposedAction[];
  facts: { k: string; v: string | number }[];
  provenance: 'canned';
}

export const SUGGESTED: { key: string; intent: IntentName }[] = [
  { key: 'cop.q.lookFirst', intent: 'look_first' },
  { key: 'cop.q.why', intent: 'why_delayed' },
  { key: 'cop.q.overcrowded', intent: 'overcrowded' },
  { key: 'cop.q.actions', intent: 'recommend_actions' },
  { key: 'cop.q.health', intent: 'device_health' },
  { key: 'cop.q.brief', intent: 'shift_brief' },
];

// ---------------------------------------------------------------- intent router

/*
 * Slot extraction.
 *
 * A leading word-boundary is ASCII-only: with no `u` flag there is no boundary before
 * a Cyrillic letter, so the Mongolian alternatives never matched and EVERY Mongolian
 * naming a route or bus fell through to the resolver's fallback - which then answered
 * about a different subject, confidently and with citations. Anchor on
 * start-or-whitespace instead, and terminate with a negative lookahead.
 */
const ROUTE_RE = /(?:^|[\s(])(?:route\s*|чиглэл\s*|r)(\d{1,3})(?!\d)/iu;
const BUS_RE = /(?:^|[\s(])(?:bus|автобус)\s*#?\s*(\d+(?:-\d+)?)(?![\d-])/iu;
const OP_RE = /(?:^|[\s(])(?:operator|оператор)\s*([abc])(?![a-z\d])/iu;

/**
 * English first, then the Mongolian phrasings the deck itself uses (dict `q.*`
 * and `cop.q.*`). Order matters: the more specific question wins.
 */
const PATTERNS: [IntentName, RegExp[]][] = [
  ['why_delayed', [/why.*(?:late|delay|slow|behind)/i, /яагаад/i, /хоцор/i, /саат/i]],
  ['recommend_actions', [/what should i do|recommend|next step|response|playbook|actions?\b/i, /арга хэмжээ/i, /заавар/i]],
  ['shift_brief', [/handover|shift|brief|summar(?:y|ise)|snapshot/i, /ээлж/i, /хүлээлц/i]],
  ['look_first', [/immediate attention|look first|(?:what|which).*(?:first|now|priorit)|priorit/i, /яарал/i, /анхаар/i]],
  ['overcrowded', [/overcrowd|crowded|\bload\b|full/i, /ачаалал/i]],
  ['device_health', [/offline|afc|t-?box|cctv|equipment|device|system health/i, /төхөөрөмж/i, /тоног/i]],
  ['operator_compare', [/compare operators?|operator\s*[abc]\b|on-?time|service km/i, /оператор/i, /цагтаа/i]],
  ['open_events', [/open events|active events|incidents?\b|events?\b/i, /үйл явдал/i]],
  ['threshold_lookup', [/threshold|setting/i, /босго/i]],
  ['where_bus', [/where is bus|status of bus|\bbus\b\s*#?\s*\d/i, /хаана/i]],
];

export function routeIntent(text: string): Intent {
  const s = text.trim();
  const route = ROUTE_RE.exec(s);
  const bus = BUS_RE.exec(s);
  const op = OP_RE.exec(s);
  const slots: Intent['slots'] = {};
  if (route?.[1]) slots.route_id = `R${route[1]}`;
  if (bus?.[1]) slots.vehicle_id = bus[1];
  if (op?.[1]) slots.operator_id = op[1].toUpperCase();

  for (const [name, res] of PATTERNS) {
    if (res.some((re) => re.test(s))) return { name, slots, via: 'pattern' };
  }
  // A bare id is still a question: "3-015" means "where is it".
  if (slots.vehicle_id) return { name: 'where_bus', slots, via: 'pattern' };
  if (slots.route_id) return { name: 'why_delayed', slots, via: 'pattern' };
  return { name: 'unknown', slots, via: 'canned' };
}

// ---------------------------------------------------------------- snapshot

export interface AgentSnapshot {
  lang: Lang;
  th: Thresholds;
  speeds: SpeedProfile;
  snap: SimSnapshot;
  metrics: DerivedMetrics;
  alerts: readonly Alert[];
  events: readonly EmergencyEvent[];
  pendingMessages: number;
  sel: { route_id: string | null; vehicle_id: string | null; event_id: string | null; alert_id: string | null };
}

/**
 * One frozen read of every store the resolvers need. Before the first engine tick
 * `useSim.snap` is null, so fall back to the world the store already built and
 * derive the metrics on demand - an answer must never throw, whatever the state.
 */
export function snapshot(): AgentSnapshot {
  const sim = useSim.getState();
  const th = useSettings.getState().th;
  const snap: SimSnapshot = sim.snap ?? {
    sim_time_s: world.sim_time_s,
    iso: isoAt(world.sim_time_s),
    vehicles: world.vehicles,
    routes: world.routes,
    feed_stale: world.feed_stale,
  };
  const sel = useSelection.getState();
  return {
    lang: useSettings.getState().lang,
    th,
    speeds: engine.speeds,
    snap,
    metrics: sim.metrics ?? deriveMetrics(snap, th),
    alerts: useAlerts.getState().alerts,
    events: useEvents.getState().events,
    pendingMessages: useComms.getState().passenger.filter((p) => p.status === 'pending_approval').length,
    sel: { route_id: sel.route_id, vehicle_id: sel.vehicle_id, event_id: sel.event_id, alert_id: sel.alert_id },
  };
}

// ---------------------------------------------------------------- small helpers

type Fact = { k: string; v: string | number };

const HREF = {
  alerts: '#/alerts',
  regularity: '#/regularity',
  passenger: '#/passenger',
  health: '#/health',
  operators: '#/operators',
  settings: '#/settings',
  analytics: '#/analytics',
  comms: '#/comms',
  vehicle: (id: string) => `#/vehicle/${id}`,
};

function build(
  s: AgentSnapshot,
  key: I18nKey,
  facts: Fact[],
  rest: { tier: 1 | 2 | 3 | 4; citations?: Citation[]; proposals?: ProposedAction[]; suffix?: I18nKey },
): AgentReply {
  const params: Record<string, string | number> = {};
  for (const f of facts) params[f.k] = f.v;
  const text = t(key, s.lang, params) + (rest.suffix ? ` ${t(rest.suffix, s.lang)}` : '');
  return {
    text,
    tier: rest.tier,
    citations: rest.citations ?? [],
    proposals: rest.proposals ?? [],
    facts,
    provenance: 'canned',
  };
}

function mins(seconds: number): string {
  const m = seconds / 60;
  return `${m >= 0 ? '+' : ''}${m.toFixed(1)}`;
}
function n1(x: number): string {
  return x.toFixed(1);
}
function int(x: number): number {
  return Math.round(x);
}
function alertLabel(s: AgentSnapshot, a: Alert): string {
  return t(a.title_key as I18nKey, s.lang, a.params);
}
function alertCite(s: AgentSnapshot, a: Alert): Citation {
  return { kind: 'alert', id: a.id, label: alertLabel(s, a), href: HREF.alerts };
}
function prop(s: AgentSnapshot, key: I18nKey, href: string): ProposedAction {
  return { label: t(key, s.lang), href };
}
/**
 * The canonical "still open" definition: an alert that has been validated into an event
 * is no longer the operator's queue. Exported because the Command Centre tiles and the
 * nav badge counted the raw list while the copilot and agent console filtered it - so
 * after validating 3 of 12 the same labels read "12 active / 4 critical" in one place
 * and "9 / 3" in another, on the same tick.
 */
export function openAlerts(a: readonly Alert[]): Alert[] {
  return a.filter((x) => !x.validated_event_id);
}
function openEvents(e: readonly EmergencyEvent[]): EmergencyEvent[] {
  return e.filter((x) => x.stage !== 'closure');
}
function vehiclesOn(s: AgentSnapshot, route_id: string): Vehicle[] {
  return s.snap.vehicles.filter((v) => v.route_id === route_id && v.status === 'in_service');
}
function offlineCount(v: Vehicle): number {
  const dead: DeviceState[] = [v.equipment.afc, v.equipment.cctv, v.equipment.tbox];
  return dead.filter((d) => d === 'offline').length;
}
function statusLabel(s: AgentSnapshot, v: Vehicle): string {
  const k: I18nKey =
    v.status === 'in_service' ? 'veh.inService' : v.status === 'breakdown' ? 'veh.breakdown' : 'veh.outOfService';
  return t(k, s.lang);
}

/**
 * Reference free-running speed for the route's class and daypart, read from the
 * SAME profile the simulation drives vehicles with (plan 10.3). The central-peak
 * 8 km/h row is client-directed; treating it as a mean is our inference, and it is
 * never applied to suburban or off-peak links - hence the four-way pick below.
 */
function plannedSpeed(r: Route | undefined, s: AgentSnapshot): number {
  const dp = daypartOf(s.snap.sim_time_s);
  const peak = dp === 'amPeak' || dp === 'pmPeak';
  if (r?.kind === 'suburban') return peak ? s.speeds.suburbanPeak : s.speeds.suburbanOff;
  return peak ? s.speeds.arterialPeak : s.speeds.arterialOff;
}

// ---------------------------------------------------------------- resolvers

function lookFirst(s: AgentSnapshot): AgentReply {
  const open = openAlerts(s.alerts);
  const critical = open.filter((a) => a.severity === 'critical');
  const warning = open.filter((a) => a.severity === 'warning');
  const info = open.filter((a) => a.severity === 'informational');
  if (open.length === 0) {
    return build(s, 'cop.a.lookFirstNone', [{ k: 'inservice', v: int(s.metrics.in_service) }], {
      tier: 1,
      proposals: [prop(s, 'cop.p.openAlerts', HREF.alerts)],
    });
  }
  // already sorted by impact_score in evaluateRules; take the head (S3/S10 "what first")
  const top = [...open].sort((a, b) => b.impact_score - a.impact_score).slice(0, 5);
  const list = top.map((a) => `${alertLabel(s, a)} [${a.id}]`).join(' · ');
  const facts: Fact[] = [
    { k: 'critical', v: critical.length },
    { k: 'warning', v: warning.length },
    { k: 'info', v: info.length },
    { k: 'list', v: list },
  ];
  const first = top[0]!;
  const proposals = [prop(s, 'cop.p.openAlerts', HREF.alerts)];
  if (first.vehicle_id) proposals.push(prop(s, 'cop.p.openBus', HREF.vehicle(first.vehicle_id)));
  return build(s, 'cop.a.lookFirst', facts, {
    tier: 1,
    citations: top.map((a) => alertCite(s, a)),
    proposals,
  });
}

function whyDelayed(s: AgentSnapshot, slots: Intent['slots']): AgentReply {
  const route_id =
    slots.route_id ??
    s.sel.route_id ??
    openAlerts(s.alerts).find((a) => a.route_id)?.route_id ??
    s.snap.routes[0]?.route_id;
  const rm = route_id ? s.metrics.per_route.get(route_id) : undefined;
  if (!route_id || !rm) {
    return build(s, 'cop.a.whyNoRoute', [{ k: 'route', v: s.snap.routes[0]?.route_id ?? '—' }], {
      tier: 1,
      proposals: [prop(s, 'cop.p.openRoute', HREF.regularity)],
    });
  }
  const r = s.snap.routes.find((x) => x.route_id === route_id);
  const on = vehiclesOn(s, route_id);
  const worst = on.reduce<Vehicle | null>(
    (w, v) => (!w || Math.abs(v.schedule_deviation) > Math.abs(w.schedule_deviation) ? v : w),
    null,
  );
  const meanSpeed = on.length ? on.reduce((a, v) => a + v.speed, 0) / on.length : 0;
  const planned = plannedSpeed(r, s);
  const devicesDown = on.reduce((a, v) => a + offlineCount(v), 0);
  const ev = openEvents(s.events).find((e) => e.route_number === route_id);

  const citations: Citation[] = [{ kind: 'route', id: route_id, label: route_id, href: HREF.regularity }];
  let cause: string;
  if (ev) {
    // an operator-validated event on the route is the known cause; nothing to infer
    cause = t('cop.cause.event', s.lang, { id: ev.event_id, type: ev.event_type });
    citations.push({ kind: 'event', id: ev.event_id, label: ev.event_type, href: HREF.alerts });
  } else if (meanSpeed < planned * 0.6) {
    cause = t('cop.cause.congestion', s.lang, { speed: n1(meanSpeed), planned: int(planned) });
  } else if (devicesDown > 0) {
    cause = t('cop.cause.device', s.lang, { n: devicesDown });
  } else {
    cause = t('cop.cause.dwell', s.lang, { mean: mins(rm.mean_dev_s) });
  }

  if (worst) citations.push({ kind: 'vehicle', id: worst.vehicle_id, label: worst.vehicle_id, href: HREF.vehicle(worst.vehicle_id) });

  const facts: Fact[] = [
    { k: 'route', v: route_id },
    { k: 'vehicles', v: on.length },
    { k: 'mean', v: mins(rm.mean_dev_s) },
    { k: 'bus', v: worst?.vehicle_id ?? '—' },
    { k: 'dev', v: worst ? mins(worst.schedule_deviation) : '—' },
    { k: 'speed', v: worst ? n1(worst.speed) : '—' },
    { k: 'cause', v: cause },
  ];
  const proposals = [prop(s, 'cop.p.openRoute', HREF.regularity)];
  if (worst) proposals.push(prop(s, 'cop.p.openBus', HREF.vehicle(worst.vehicle_id)));
  // R1036: `speed` is an instantaneous ICD field. Saying so is the whole point.
  return build(s, 'cop.a.why', facts, { tier: 1, citations, proposals, suffix: 'cop.a.speedNote' });
}

function whereBus(s: AgentSnapshot, slots: Intent['slots']): AgentReply {
  const id = slots.vehicle_id ?? s.sel.vehicle_id ?? '';
  const v = s.snap.vehicles.find((x) => x.vehicle_id === id || x.vehicle_id.endsWith(`-${id}`));
  if (!v) {
    return build(s, 'cop.a.busUnknown', [], { tier: 1, proposals: [prop(s, 'cop.p.openAlerts', HREF.alerts)] });
  }
  const r = s.snap.routes.find((x) => x.route_id === v.route_id);
  const stop = r?.stops.find((st) => st.stop_id === v.next_stop_id);
  const down = (['afc', 'cctv', 'tbox'] as const).filter((k) => v.equipment[k] === 'offline');
  const facts: Fact[] = [
    { k: 'bus', v: v.vehicle_id },
    { k: 'operator', v: v.operator_id },
    { k: 'route', v: v.route_id },
    { k: 'status', v: statusLabel(s, v) },
    { k: 'speed', v: n1(v.speed) },
    { k: 'dev', v: mins(v.schedule_deviation) },
    { k: 'load', v: int((v.pax_count / v.capacity) * 100) },
    { k: 'pax', v: v.pax_count },
    { k: 'cap', v: v.capacity },
    { k: 'stop', v: stop ? (s.lang === 'mn' ? stop.name_mn : stop.name_en) : '—' },
    { k: 'dist', v: int(v.distance_to_next_stop_m) },
    { k: 'devices', v: down.length ? down.map((d) => d.toUpperCase()).join(', ') : t('cop.a.none', s.lang) },
  ];
  const cites: Citation[] = [
    { kind: 'vehicle', id: v.vehicle_id, label: v.vehicle_id, href: HREF.vehicle(v.vehicle_id) },
    { kind: 'route', id: v.route_id, label: v.route_id, href: HREF.regularity },
  ];
  for (const a of s.alerts.filter((x) => x.vehicle_id === v.vehicle_id)) cites.push(alertCite(s, a));
  return build(s, 'cop.a.whereBus', facts, {
    tier: 1,
    citations: cites,
    proposals: [prop(s, 'cop.p.openBus', HREF.vehicle(v.vehicle_id)), prop(s, 'cop.p.openAlerts', HREF.alerts)],
    suffix: 'cop.a.speedNote',
  });
}

function overcrowded(s: AgentSnapshot): AgentReply {
  const all = [...s.metrics.per_route.values()].filter((r) => r.vehicles > 0).sort((a, b) => b.load_pct - a.load_pct);
  const over = all.filter((r) => r.load_pct >= s.th.passenger_load_pct);
  if (over.length === 0) {
    const top = all[0];
    return build(
      s,
      'cop.a.overcrowdedNone',
      [
        { k: 'th', v: s.th.passenger_load_pct },
        { k: 'route', v: top?.route_id ?? '—' },
        { k: 'pct', v: top ? int(top.load_pct) : 0 },
      ],
      { tier: 1, proposals: [prop(s, 'cop.p.openPassenger', HREF.passenger)] },
    );
  }
  // S8 heat-map bands are the ONLY threshold set that exists in any source.
  const list = over
    .slice(0, 8)
    .map((r) => `${r.route_id} ${int(r.load_pct)} % (${t(bandOf(r.load_pct).key as I18nKey, s.lang)})`)
    .join(' · ');
  return build(
    s,
    'cop.a.overcrowded',
    [
      { k: 'n', v: over.length },
      { k: 'th', v: s.th.passenger_load_pct },
      { k: 'list', v: list },
    ],
    {
      tier: 1,
      citations: over.slice(0, 8).map((r) => ({ kind: 'route' as const, id: r.route_id, label: r.route_id, href: HREF.passenger })),
      proposals: [prop(s, 'cop.p.openPassenger', HREF.passenger)],
    },
  );
}

function deviceHealth(s: AgentSnapshot): AgentReply {
  const o = s.metrics.offline;
  const byOp = s.metrics.offline_by_operator;
  const worstOp = (Object.keys(byOp) as OperatorId[]).reduce((a, b) => (byOp[b] > byOp[a] ? b : a), 'A');
  // L1124: repeated failures per operator are a Tier 3 pattern, not a threshold breach.
  const hasPattern = byOp[worstOp] >= 3;
  const pattern = hasPattern
    ? t('cop.a.devicePattern', s.lang, { op: worstOp, n: byOp[worstOp] })
    : t('cop.a.deviceNoPattern', s.lang);
  const facts: Fact[] = [
    { k: 'afc', v: o.afc },
    { k: 'cctv', v: o.cctv },
    { k: 'tbox', v: o.tbox },
    { k: 'health', v: int(s.metrics.system_health_pct) },
    { k: 'pattern', v: pattern },
  ];
  const cites = s.alerts
    .filter((a) => a.type === 'equipment_failure')
    .slice(0, 6)
    .map((a) => alertCite(s, a));
  return build(s, 'cop.a.device', facts, {
    tier: hasPattern ? 3 : 1,
    citations: cites,
    proposals: [prop(s, 'cop.p.openHealth', HREF.health)],
  });
}

function operatorCompare(s: AgentSnapshot): AgentReply {
  const ops: OperatorId[] = ['A', 'B', 'C'];
  const km: string[] = [];
  const ot: string[] = [];
  for (const op of ops) {
    const vs = s.snap.vehicles.filter((v) => v.operator_id === op);
    const inSvc = vs.filter((v) => v.status === 'in_service');
    const total = vs.reduce((a, v) => a + v.km_today, 0);
    const onTime = inSvc.filter((v) => Math.abs(v.schedule_deviation) <= s.th.schedule_deviation_s).length;
    km.push(`${op} ${int(total).toLocaleString('en-US')}`);
    ot.push(`${op} ${inSvc.length ? int((onTime / inSvc.length) * 100) : 0} %`);
  }
  return build(
    s,
    'cop.a.operators',
    [
      { k: 'km', v: km.join(' · ') },
      { k: 'ot', v: ot.join(' · ') },
    ],
    { tier: 1, proposals: [prop(s, 'cop.p.openOperators', HREF.operators)] },
  );
}

function recommendActions(s: AgentSnapshot): AgentReply {
  // Tier 2: a lookup in the four documented playbooks (L1349-L1382). No inference.
  const open = openEvents(s.events);
  const ev =
    s.events.find((e) => e.event_id === s.sel.event_id) ??
    [...open].sort((a, b) => a.severity_level - b.severity_level)[0];
  if (!ev) {
    return build(s, 'cop.a.noEvent', [], { tier: 2, proposals: [prop(s, 'cop.p.openAlerts', HREF.alerts)] });
  }
  const pb = PLAYBOOKS[ev.playbook];
  const rec = ev.actions
    .filter((a) => !a.compulsory)
    .map((a) => `${a.done ? '☑' : '☐'} ${t(a.label_key as I18nKey, s.lang)}`)
    .join(' · ');
  // L1346: compulsory items gate stage progression and closure - name the gate.
  const comp = ev.actions
    .filter((a) => a.compulsory)
    .map(
      (a) =>
        `${a.done ? '☑' : '☐'} ${t(a.label_key as I18nKey, s.lang)} → ${t(`ev.stage.${gateStageFor(a.label_key)}` as I18nKey, s.lang)}`,
    )
    .join(' · ');
  const facts: Fact[] = [
    { k: 'id', v: ev.event_id },
    { k: 'type', v: ev.event_type },
    { k: 'playbook', v: pb.id },
    { k: 'stage', v: t(`ev.stage.${ev.stage}` as I18nKey, s.lang) },
    { k: 'rec', v: rec || t('cop.a.none', s.lang) },
    { k: 'comp', v: comp || t('cop.a.none', s.lang) },
  ];
  return build(s, 'cop.a.recommend', facts, {
    tier: 2,
    citations: [{ kind: 'event', id: ev.event_id, label: ev.event_type, href: HREF.alerts }],
    proposals: [prop(s, 'cop.p.openAlerts', HREF.alerts), prop(s, 'cop.p.openComms', HREF.comms)],
  });
}

function openEventsReply(s: AgentSnapshot): AgentReply {
  const open = openEvents(s.events);
  if (!open.length) return build(s, 'cop.a.openEventsNone', [], { tier: 1, proposals: [prop(s, 'cop.p.openAlerts', HREF.alerts)] });
  const list = open
    .map((e) => `${e.event_id} ${e.event_type} — ${t(`ev.stage.${e.stage}` as I18nKey, s.lang)}`)
    .join(' · ');
  return build(
    s,
    'cop.a.openEvents',
    [
      { k: 'n', v: open.length },
      { k: 'list', v: list },
    ],
    {
      tier: 1,
      citations: open.map((e) => ({ kind: 'event' as const, id: e.event_id, label: e.event_type, href: HREF.alerts })),
      proposals: [prop(s, 'cop.p.openAlerts', HREF.alerts)],
    },
  );
}

/** The four handover items the source requires (L2548-L2558). */
function shiftBrief(s: AgentSnapshot): AgentReply {
  const open = openEvents(s.events);
  const byStage = new Map<string, number>();
  for (const e of open) byStage.set(e.stage, (byStage.get(e.stage) ?? 0) + 1);
  const stages = [...byStage.entries()]
    .map(([st, n]) => `${n} ${t(`ev.stage.${st}` as I18nKey, s.lang)}`)
    .join(', ');
  const changed = (Object.keys(DEMO_DEFAULTS) as (keyof Thresholds)[])
    .filter((k) => typeof DEMO_DEFAULTS[k] === 'number' && s.th[k] !== DEMO_DEFAULTS[k])
    .map((k) => `${t(THRESHOLD_META[k].labelKey as I18nKey, s.lang)} ${DEMO_DEFAULTS[k]}→${s.th[k]}`)
    .join(' · ');
  const facts: Fact[] = [
    { k: 'time', v: hhmm(s.snap.sim_time_s) },
    { k: 'events', v: open.length },
    { k: 'stages', v: stages || t('cop.a.none', s.lang) },
    { k: 'critical', v: openAlerts(s.alerts).filter((a) => a.severity === 'critical').length },
    { k: 'feed', v: t(s.snap.feed_stale ? 'cop.a.feedStale' : 'cop.a.feedOk', s.lang) },
    { k: 'changed', v: changed || t('cop.a.none', s.lang) },
    { k: 'pending', v: s.pendingMessages },
  ];
  return build(s, 'cop.a.brief', facts, {
    tier: 1,
    citations: open.map((e) => ({ kind: 'event' as const, id: e.event_id, label: e.event_type, href: HREF.alerts })),
    proposals: [prop(s, 'cop.p.openAnalytics', HREF.analytics), prop(s, 'cop.p.openSettings', HREF.settings)],
  });
}

const HEADLINE_THRESHOLDS: (keyof Thresholds)[] = [
  'schedule_deviation_s',
  'service_gap_max_s',
  'bunching_min_headway_s',
  'passenger_load_pct',
  'passenger_load_critical_pct',
];

function thresholdLookup(s: AgentSnapshot): AgentReply {
  const list = HEADLINE_THRESHOLDS.map((k) => {
    const m = THRESHOLD_META[k];
    return `${t(m.labelKey as I18nKey, s.lang)} ${s.th[k]} ${m.unit} (${m.table})`;
  }).join(' · ');
  return build(s, 'cop.a.threshold', [{ k: 'list', v: list }], {
    tier: 1,
    citations: HEADLINE_THRESHOLDS.map((k) => ({
      kind: 'threshold' as const,
      id: String(k),
      label: t(THRESHOLD_META[k].labelKey as I18nKey, s.lang),
      href: HREF.settings,
    })),
    proposals: [prop(s, 'cop.p.openSettings', HREF.settings)],
  });
}

function unknown(s: AgentSnapshot): AgentReply {
  const route = s.snap.routes[0]?.route_id ?? 'R1';
  const list = SUGGESTED.map((q) => t(q.key as I18nKey, s.lang, { route })).join(' · ');
  return {
    text: `${t('cop.unknown', s.lang)} ${list}`,
    tier: 1,
    citations: [],
    proposals: [],
    facts: [
      { k: 'route', v: route },
      { k: 'list', v: list },
    ],
    provenance: 'canned',
  };
}

// ---------------------------------------------------------------- entry point

export function answerWith(intent: Intent, s: AgentSnapshot): AgentReply {
  switch (intent.name) {
    case 'look_first': return lookFirst(s);
    case 'why_delayed': return whyDelayed(s, intent.slots);
    case 'where_bus': return whereBus(s, intent.slots);
    case 'overcrowded': return overcrowded(s);
    case 'open_events': return openEventsReply(s);
    case 'device_health': return deviceHealth(s);
    case 'operator_compare': return operatorCompare(s);
    case 'recommend_actions': return recommendActions(s);
    case 'shift_brief': return shiftBrief(s);
    case 'threshold_lookup': return thresholdLookup(s);
    case 'unknown': return unknown(s);
  }
}

export function answer(intent: Intent): AgentReply {
  const s = snapshot();
  try {
    return answerWith(intent, s);
  } catch {
    // An answer must never be the thing that breaks the demo. Degrade, don't throw.
    return { text: t('cop.a.empty', s.lang), tier: 1, citations: [], proposals: [], facts: [], provenance: 'canned' };
  }
}

/** Convenience for the UI: one call from raw text to a reply. */
export function ask(text: string): { intent: Intent; reply: AgentReply } {
  const intent = routeIntent(text);
  return { intent, reply: answer(intent) };
}
