/**
 * Domain types for the PTCC demo.
 *
 * Field names marked (ICD) are taken verbatim from Table 8 of the detailed design
 * document, "ICD Baseline Data Dictionary" (redump.txt R1031-R1043).
 *
 * Coordinates are EPSG:4326 decimal degrees. The source writes "EPSG:4326/3857",
 * which is a specification error (R1035): 3857 is metres, not decimal degrees.
 */

import type { Ring } from './ring';

export type Lang = 'en' | 'mn';
export type OperatorId = 'A' | 'B' | 'C';
export type VehicleStatus = 'in_service' | 'out_of_service' | 'breakdown';

/** Evidence grading used across the UI. */
export type Evidence = 'CONFIRMED' | 'INFERRED' | 'ASSUMPTION' | 'FUTURE';

export interface Stop {
  stop_id: string;
  name_en: string;
  name_mn: string;
  latitude: number; // ICD, EPSG:4326
  longitude: number; // ICD, EPSG:4326
  dist_m: number; // distance from route start along the shape
}

export interface Route {
  route_id: string; // ICD
  name_en: string;
  name_mn: string;
  operator_id: OperatorId;
  kind: 'city' | 'suburban'; // 104 city + 17 suburban = 121 (L465)
  active: boolean; // 97 of 121 operating (S7)
  shape: [number, number][]; // [lon, lat]
  length_m: number;
  stops: Stop[];
  /**
   * Relative passenger demand for this route, mean ~1 across the network.
   *
   * Real bus networks are heavy-tailed: a handful of trunk corridors carry a large
   * share of all boardings. Spreading demand evenly gives every route the network
   * AVERAGE load (~12% for 0.55M pax/day over 1,100 buses), so no route ever looks
   * busy and the deck's R5 96% / R18 91% / R22 87% become unreachable.
   */
  demand_weight: number;
  /** Planned headway in seconds, by daypart. Synthetic - no timetable source exists. */
  planned_headway_s: { amPeak: number; offPeak: number; pmPeak: number; evening: number };
  /**
   * The corridor edges this route's shape is made of, in shape order. Kept so delay can
   * be attributed to a named road segment (PTCC scenario 3b). Optional so hand-written
   * Route literals in tests still compile.
   */
  edges?: RouteEdge[];
}

/** One corridor edge along a route: canonical key "a|b" (a < b) and its span on the shape. */
export interface RouteEdge {
  key: string;
  from_m: number;
  to_m: number;
}

/**
 * One stop served on one trip - the per-stop log PTCC's drill-down asks for.
 * The engine keeps `schedule_deviation` as actual - plan at every instant, so the
 * planned arrival needs no second timetable: planned = t_s - dev_s.
 */
export interface StopArrival {
  trip_id: string;
  vehicle_id: string;
  route_id: string;
  /** index in TRAVEL order (0 = first stop of this trip) */
  stop_idx: number;
  stop_id: string;
  t_s: number;
  dev_s: number;
  dwell_s: number;
  pax: number;
  boarded: number;
  /** corridor edge traversed to reach this stop */
  seg_key: string | null;
  /** deviation gained since the previous stop, attributed to seg_key */
  hop_excess_s: number;
}

export interface Vehicle {
  vehicle_id: string; // ICD
  route_id: string; // ICD
  operator_id: OperatorId;
  timestamp: string; // ICD, ISO 8601
  latitude: number; // ICD
  longitude: number; // ICD
  speed: number; // ICD, km/h, INSTANTANEOUS (R1036)
  heading: number;
  /**
   * 0..1 along the CURRENT TRIP. The fraction along the shape is `trip_progress`
   * outbound (direction 0) and `1 - trip_progress` inbound (direction 1), so a bus
   * that turns round at the terminus resumes from where it stood instead of
   * teleporting back to the start of the polyline.
   */
  trip_progress: number;
  direction: 0 | 1;
  schedule_deviation: number; // ICD, seconds, + = late
  pax_count: number; // ICD
  capacity: number;
  status: VehicleStatus;
  door_status: 'normal' | 'fault'; // S5
  driver_status: 'normal' | 'alert'; // S5
  driver_id: string;
  next_stop_id: string | null;
  distance_to_next_stop_m: number;
  /**
   * Sim seconds until which the bus is stationary: a stop dwell or a terminus
   * layover. Optional so the many `Vehicle` literals in other suites still compile.
   */
  hold_until_s?: number;
  /** Seconds to the next stop: remaining dwell + distance / current speed. */
  eta_next_stop_s?: number;
  equipment: { afc: DeviceState; cctv: DeviceState; tbox: DeviceState };
  flags: {
    panic?: boolean;
    harsh_braking?: boolean;
    overspeed?: boolean;
    route_deviation?: boolean;
    accident?: boolean;
  };
  /** Passengers left behind at the last stop (feeds pax_affected on overcrowding). */
  left_behind: number;
  /** Cumulative boardings today - drives ridership + revenue. */
  boardings_today: number;
  km_today: number;
  /** increments at every turn-round; trip_id = `${vehicle_id}:${trip_seq}` */
  trip_seq?: number;
  /** sim seconds the current trip began */
  trip_start_s?: number;
}

export function tripIdOf(v: Pick<Vehicle, 'vehicle_id' | 'trip_seq'>, seq = v.trip_seq ?? 0): string {
  return `${v.vehicle_id}:${seq}`;
}

export type DeviceState = 'ok' | 'offline';

export interface Timetable {
  planned_headway_s(route_id: string, sim_time_s: number): number;
}

export interface World {
  routes: Route[];
  routeById: Map<string, Route>;
  vehicles: Vehicle[];
  vehicleById: Map<string, Vehicle>;
  timetable: Timetable;
  sim_time_s: number;
  seed: number;
  /** route_id:stop_id -> sim seconds of last departure, for headway maths. */
  lastDeparture: Map<string, number>;
  /** link congestion multipliers applied by scenarios, route_id -> factor. */
  congestion: Map<string, { factor: number; until_s: number }>;
  /** demand multipliers applied by scenarios, route_id -> factor. */
  demandBoost: Map<string, { factor: number; until_s: number }>;
  suspended: Set<string>;
  /**
   * Expiry time (sim seconds) for transient telematics flags, keyed
   * `${vehicle_id}:${flag}`. Without this, a harsh-braking flag lived exactly one
   * tick, so a flag injected by a scenario BETWEEN ticks was wiped by the next
   * tick before the rule engine ever saw it - scenario D4 raised no alert at all.
   */
  flagUntil: Map<string, number>;
  feed_stale: boolean;
  /** trip_id -> stops served, in travel order. Current + previous trip per bus. */
  tripLog: Map<string, StopArrival[]>;
  /** vehicle_id -> instantaneous speed, one sample per tick (720 = 1 sim hour). */
  speedLog: Map<string, Ring>;
  /** segment key -> live deviation gained per km on recent hops, with sim-second stamps. */
  segObs: Map<string, { v: Ring; t: Ring }>;
}

export interface SimSnapshot {
  sim_time_s: number;
  iso: string;
  vehicles: readonly Vehicle[];
  routes: readonly Route[];
  feed_stale: boolean;
}

// ---------------------------------------------------------------- alerts (3 levels)

/** L1182-L1185: exactly three alert severities. NEVER merge with EventSeverity. */
export type Severity = 'informational' | 'warning' | 'critical';

/** L1176-L1181: five alert types. */
export type AlertType =
  | 'service_deviation'
  | 'overcrowding'
  | 'vehicle_safety'
  | 'equipment_failure'
  | 'security';

export interface Alert {
  id: string; // deterministic: `${rule_id}:${subject}`
  rule_id: string;
  type: AlertType;
  severity: Severity;
  route_id?: string;
  vehicle_id?: string;
  operator_id?: OperatorId;
  title_key: string;
  params: Record<string, string | number>;
  raised_at: string;
  raised_at_s: number;
  /** observed value vs the threshold it broke - this IS the explanation (Tier 1). */
  metric: { name: string; value: number; threshold: number; unit: string };
  pax_affected: number;
  impact_score: number; // severity x passenger impact (S8) - demo formula
  tier: 1 | 3;
  acknowledged: boolean;
  validated_event_id?: string;
  /** PTCC SOP level (delay rules only): 1 route-level, 2 medium, 3 senior. */
  level?: 1 | 2 | 3;
  routes_affected?: number;
  /** Forecast rows only - never present on a live alert. */
  forecast?: true;
  horizon_min?: number;
  /** chance the level is reached at the horizon, 0..1 */
  probability?: number;
  /** model trust, 0..CONFIDENCE_CEILING */
  confidence?: number;
  /** L1 auto-notification sent for this alert */
  auto_comm_id?: string;
}

// ---------------------------------------------------------------- events (5 levels)

/** R1433-R1440 Table 16, five levels. R1041: severity_level integer 1..5. */
export type EventSeverity = 1 | 2 | 3 | 4 | 5; // 1 Crisis .. 5 Low
export type EventCategory = 'operational' | 'safety' | 'security' | 'equipment';

/** L1298-L1310: seven workflow stages, each logged. */
export type WorkflowStage =
  | 'detection'
  | 'validation'
  | 'creation'
  | 'response_assignment'
  | 'response_monitoring'
  | 'resolution'
  | 'closure';

export const WORKFLOW_STAGES: WorkflowStage[] = [
  'detection',
  'validation',
  'creation',
  'response_assignment',
  'response_monitoring',
  'resolution',
  'closure',
];

export type PlaybookId =
  | 'minor_equipment_failure'
  | 'vehicle_breakdown'
  | 'traffic_accident'
  | 'security_incident'
  | 'delay_l1'
  | 'delay_l2'
  | 'delay_l3'
  | 'generic';

export interface ActionItem {
  id: string;
  label_key: string;
  /** L1346: compulsory actions gate stage progression and closure. */
  compulsory: boolean;
  done: boolean;
  done_at?: string;
  /** L1347: supervisor override requires justification + audit. */
  overridden_by?: string;
  justification?: string;
}

/** L1246-L1258: the twelve-field emergency event record, plus workflow state. */
export interface EmergencyEvent {
  event_id: string; // 1
  event_type: string; // 2
  category: EventCategory; // 3
  severity_level: EventSeverity; // 4
  bus_number: string | null; // 5
  route_number: string | null; // 6
  driver_id: string | null; // 7
  location: { latitude: number; longitude: number; label: string }; // 8
  timestamp: string; // 9
  detection_source: string; // 10
  description: string; // 11
  associated_alert_ids: string[]; // 12
  // workflow
  stage: WorkflowStage;
  history: { stage: WorkflowStage; at: string; by: string }[];
  actions: ActionItem[];
  playbook: PlaybookId;
  /** L2416-L2423 Table 35. Distinct from severity_level. */
  emergency_level: 0 | 1 | 2 | 3;
  /** L1384-L1392: evidence bundle keyed by event id. */
  evidence: { kind: 'telemetry' | 'gps_history' | 'alerts' | 'cctv' | 'action_log'; ref: string }[];
  created_by: string;
  closed_at?: string;
}

// ---------------------------------------------------------------- communications

/** L1464-L1471: seven fields. */
export interface PassengerMessage {
  message_id: string;
  content_en: string;
  content_mn: string;
  category:
    | 'delay'
    | 'disruption'
    | 'diversion'
    | 'suspension'
    | 'emergency'
    | 'special_event'
    | 'weather';
  originating_operator: string;
  created_at: string;
  channels: ('app' | 'social' | 'web' | 'sms' | 'pis')[];
  /** L1443: approval required before dispatch. */
  status: 'draft' | 'pending_approval' | 'active' | 'expired';
  event_id?: string;
}

/** L1533-L1541: eight fields. */
export interface CoordinationMessage {
  communication_id: string;
  event_id?: string;
  message_type:
    | 'incident_notification'
    | 'operational_instruction'
    | 'coordination_request'
    | 'service_status_update';
  content: string;
  recipient:
    | 'bus_operator'
    | 'traffic_police'
    | 'tcc'
    | 'ptpd'
    | 'emergency_services'
    | 'municipal';
  channel: string;
  sent_at: string;
  operator: string;
  /** absent = sent by a person (every message before the SOP work) */
  status?: 'draft' | 'sent' | 'revoked';
  /** sent by the system under the L1 SOP, not by a person */
  auto?: true;
  alert_id?: string;
  revoked_at?: string;
  revoked_by?: string;
}

// ---------------------------------------------------------------- roles

/** R2898-R2909: the seven operational roles. */
export type RoleId =
  | 'operations_controller'
  | 'incident_manager'
  | 'communication_controller'
  | 'dispatcher'
  | 'field_inspector'
  | 'bus_operator_occ'
  | 'supervisor';

export interface AuditEntry {
  at: string;
  actor: string;
  role: RoleId;
  action: string;
  target: string;
  detail?: string;
}
