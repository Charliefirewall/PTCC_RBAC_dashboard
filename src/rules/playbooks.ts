/**
 * Tier 2 - rule-based response recommendation.
 *
 * The four playbooks are transcribed verbatim from L1349-L1382 ("Automated response
 * recommendations"). The generic compulsory items come from L1337-L1345.
 *
 * L1346: compulsory actions must be completed before an event can proceed to the
 * next stage or be closed.
 * L1347: only supervisors may override, and overrides must be recorded with
 * justification and audit logging.
 */

import type { ActionItem, EventCategory, EventSeverity, PlaybookId } from '../sim/types';

export interface Playbook {
  id: PlaybookId;
  recommended: string[]; // i18n keys
  compulsory: string[]; // i18n keys
  roles: string[];
  target_response_min: number; // L1322 names the parameter; the value is a demo default
}

export const PLAYBOOKS: Record<PlaybookId, Playbook> = {
  minor_equipment_failure: {
    id: 'minor_equipment_failure',
    recommended: ['pb.notify_maintenance', 'pb.schedule_depot_inspection'],
    compulsory: ['pb.record_system_failure', 'pb.assign_post_return_inspection'],
    roles: ['operations_controller'],
    target_response_min: 60,
  },
  vehicle_breakdown: {
    id: 'vehicle_breakdown',
    recommended: ['pb.dispatch_replacement', 'pb.notify_operator_dispatch'],
    compulsory: ['pb.record_breakdown', 'pb.request_towing', 'pb.track_recovery'],
    roles: ['operations_controller', 'bus_operator_occ'],
    target_response_min: 20,
  },
  traffic_accident: {
    id: 'traffic_accident',
    recommended: ['pb.review_cctv', 'pb.reroute_services'],
    compulsory: ['pb.notify_traffic_police', 'pb.preserve_cctv', 'pb.initiate_insurance'],
    roles: ['incident_manager', 'communication_controller'],
    target_response_min: 10,
  },
  security_incident: {
    id: 'security_incident',
    recommended: ['pb.review_cctv', 'pb.contact_operator'],
    compulsory: ['pb.record_incident', 'pb.preserve_evidence', 'pb.notify_authorities'],
    roles: ['incident_manager'],
    target_response_min: 10,
  },
  generic: {
    id: 'generic',
    recommended: ['pb.contact_driver', 'pb.inform_operator_dispatch', 'pb.broadcast_update'],
    compulsory: ['pb.create_record', 'pb.classify_event'],
    roles: ['operations_controller'],
    target_response_min: 30,
  },
};

/** Which stage each compulsory item gates. Closure is the default gate (L1346). */
const GATE_AT_RESOLUTION = new Set([
  'pb.preserve_cctv',
  'pb.preserve_evidence',
  'pb.notify_traffic_police',
  'pb.request_towing',
]);

export function playbookFor(event_type: string): PlaybookId {
  switch (event_type) {
    case 'vehicle_breakdown':
      return 'vehicle_breakdown';
    case 'accident':
    case 'traffic_accident':
      return 'traffic_accident';
    case 'passenger_conflict':
    case 'vandalism':
    case 'suspicious_activity':
    case 'driver_health_emergency':
      return 'security_incident';
    case 'panic':
      // Driver/passenger distress is a security event, not a breakdown. Without this it
      // fell to `generic` (or, via the type fallback, to the towing playbook) and lost
      // preserve_evidence - a resolution gate. suggestSeverity() already treats panic as
      // level 2, so the severity and the playbook now agree.
      return 'security_incident';
    case 'afc_failure':
    case 'cctv_failure':
    case 'tbox_failure':
    case 'comms_failure':
    case 'other_system_failure':
      return 'minor_equipment_failure';
    default:
      return 'generic';
  }
}

/**
 * Normalise an alert's rule_id into the event-type vocabulary playbookFor() keys off.
 *
 * Order matters and is load-bearing. A rule_id the playbook table already recognises
 * MUST win over the type fallback: `accident` carries type 'vehicle_safety', so a
 * type-first mapping silently downgraded it from the traffic_accident playbook to
 * vehicle_breakdown, dropping preserve_cctv and notify_traffic_police as compulsory
 * actions - both of which gate *resolution*, the earlier gate. Presentation work must
 * never weaken a gate, so this ordering is pinned by test.
 */
export function eventTypeForAlert(rule_id: string, type: string): string {
  if (playbookFor(rule_id) !== 'generic') return rule_id;
  if (rule_id.startsWith('equipment_')) return `${rule_id.slice('equipment_'.length)}_failure`;
  if (rule_id === 'repeated_failure') return 'other_system_failure';
  if (type === 'security') return 'suspicious_activity';
  if (type === 'vehicle_safety') return 'vehicle_breakdown';
  return rule_id;
}

export function buildActions(pb: PlaybookId): ActionItem[] {
  const p = PLAYBOOKS[pb];
  const out: ActionItem[] = [];
  let n = 0;
  for (const k of p.recommended) {
    out.push({ id: `a${++n}`, label_key: k, compulsory: false, done: false });
  }
  for (const k of p.compulsory) {
    out.push({ id: `a${++n}`, label_key: k, compulsory: true, done: false });
  }
  return out;
}

export function gateStageFor(label_key: string): 'resolution' | 'closure' {
  return GATE_AT_RESOLUTION.has(label_key) ? 'resolution' : 'closure';
}

/** R1441: the system may auto-suggest severity; operators may adjust during validation. */
export function suggestSeverity(severity: 'informational' | 'warning' | 'critical', type: string): EventSeverity {
  if (type === 'accident' || type === 'panic') return 2; // Critical
  if (severity === 'critical') return 2;
  if (severity === 'warning') return 3; // High
  return 4; // Medium
}

export function categoryFor(alertType: string): EventCategory {
  switch (alertType) {
    case 'equipment_failure':
      return 'equipment';
    case 'security':
      return 'security';
    case 'vehicle_safety':
      return 'safety';
    default:
      return 'operational';
  }
}

/** L2416-L2423 Table 35. Demo mapping from event severity - no official mapping exists. */
export function emergencyLevelFor(sev: EventSeverity): 0 | 1 | 2 | 3 {
  if (sev === 1) return 3; // Crisis
  if (sev === 2) return 2; // Critical
  if (sev === 3) return 1; // High
  return 0;
}

export const EVENT_SEVERITY_LABEL: Record<EventSeverity, string> = {
  1: 'sev.crisis',
  2: 'sev.critical',
  3: 'sev.high',
  4: 'sev.medium',
  5: 'sev.low',
};
