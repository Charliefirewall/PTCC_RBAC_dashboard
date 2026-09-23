/**
 * The role model: one table, read by the nav, the landing screen and every dashboard.
 *
 * EVIDENCE
 *   CONFIRMED  the seven role ids, and the one-line function of six of them - R2898-R2909
 *              Table 39 ("Command & Role Structure") names Role | Function verbatim.
 *              `fn` below is that column, not our paraphrase.
 *   INFERRED   which module a role lands on, which modules it sees, which widgets its
 *              dashboard composes, and which permissions it holds. These follow from the
 *              function column plus the client walkthrough (CV: the four screens named for
 *              Operations Control, Incident Manager, Dispatcher and Field Inspector).
 *   ASSUMPTION `supervisor` is NOT in Table 39. It exists only because L1347 grants exactly
 *              one authority the right to override a compulsory action, and that authority
 *              needs a holder. Its composition is ours.
 *
 * Nothing here invents a KPI, a threshold or a business rule. Every widget reads numbers
 * that already exist in the stores.
 */

import type { Evidence, RoleId } from '../../sim/types';
import type { I18nKey } from '../../i18n/dict';

/** Nav paths this workstream may route to. Kept as strings so App.tsx stays the owner. */
export type NavPath =
  | 'dashboard' | 'command' | 'map' | 'regularity' | 'passenger' | 'alerts' | 'comms'
  | 'health' | 'operators' | 'copilot' | 'agentic' | 'roi' | 'analytics' | 'forecast' | 'multimodal' | 'settings'
  | 'provenance' | 'depot' | 'platform';

/**
 * Permissions. INFERRED from the function column: a role that the source says "executes
 * instructions" may not approve them, a role that does "public messaging" is the one that
 * may release a passenger message.
 *
 * `override_compulsory` is the exception - it is CONFIRMED and exclusive (L1347), and the
 * Emergency Handling screen already enforces it directly (modules/alerts/Alerts.tsx).
 * `can()` states the same rule once so every other screen agrees with it.
 */
export const PERMISSIONS = [
  'acknowledge_alert',
  'create_event',
  'advance_stage',
  'complete_action',
  'escalate_event',
  'approve_message',
  'send_coordination',
  'assign_resource',
  'upload_evidence',
  'configure_thresholds',
  'override_compulsory',
  // PTCC SOP ladder (Sept 2026). INFERRED: who may undo the system's L1 auto-notification,
  // and who may raise an L3 escalation to the Traffic department.
  'revoke_auto_action',
  'escalate_l3',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export type WidgetId =
  | 'networkHealth' | 'opsKpi' | 'aiAlerts' | 'activeIncidents'
  | 'incidentQueue' | 'incidentDetail' | 'escalation'
  | 'pendingApprovals' | 'commsLog'
  | 'resourceStatus' | 'dispatchRecs'
  | 'assignedIncidents' | 'fieldMap' | 'inspectionChecklist' | 'fieldInstructions' | 'evidenceBundle'
  | 'fleetDeployment'
  | 'auditLog' | 'overrideReview';

export interface RoleSpec {
  id: RoleId;
  /** Table 39 "Function", verbatim where the table has the role. */
  fnKey: I18nKey;
  /** Grade of THIS role's composition, not of the role existing. */
  composition: Evidence;
  cite: string;
  /** Default landing screen after role selection. */
  home: NavPath;
  /** Nav subset, in nav order. Modules not listed are hidden for this role. */
  nav: NavPath[];
  widgets: WidgetId[];
  can: Permission[];
}

const ALL_NAV: NavPath[] = [
  'dashboard', 'command', 'map', 'regularity', 'passenger', 'alerts', 'forecast', 'comms',
  'health', 'operators', 'copilot', 'agentic', 'roi', 'analytics', 'multimodal', 'settings',
  'provenance', 'depot', 'platform',
];

export const ROLE_SPECS: Record<RoleId, RoleSpec> = {
  // "Operations Controller | Fleet and service management" (R2905). The walkthrough asks
  // for network health, active incidents, operational KPIs, AI alerts and a network-level
  // overview - which is the Command Centre, so that is where this role lands rather than a
  // second network screen repeating the same numbers.
  operations_controller: {
    id: 'operations_controller',
    fnKey: 'role.fn.operations_controller',
    composition: 'INFERRED',
    cite: 'R2905 · CV walkthrough',
    home: 'command',
    nav: ['dashboard', 'command', 'map', 'regularity', 'passenger', 'alerts', 'forecast', 'health', 'operators', 'copilot', 'agentic', 'analytics', 'roi', 'settings', 'provenance', 'depot', 'platform'],
    widgets: ['networkHealth', 'opsKpi', 'aiAlerts', 'activeIncidents'],
    can: ['acknowledge_alert', 'create_event', 'advance_stage', 'complete_action', 'send_coordination', 'configure_thresholds', 'revoke_auto_action'],
  },

  // "PTCC Incident Manager | Internal coordination lead" (R2902). R2919-R2925: assigns
  // verification, confirms severity, decides escalation, approves service adjustments.
  incident_manager: {
    id: 'incident_manager',
    fnKey: 'role.fn.incident_manager',
    composition: 'INFERRED',
    cite: 'R2902, R2919-R2925 · CV walkthrough',
    home: 'dashboard',
    nav: ['dashboard', 'alerts', 'forecast', 'map', 'command', 'comms', 'copilot', 'agentic', 'analytics'],
    widgets: ['incidentQueue', 'incidentDetail', 'escalation', 'activeIncidents'],
    can: ['acknowledge_alert', 'create_event', 'advance_stage', 'complete_action', 'escalate_event', 'send_coordination', 'escalate_l3'],
  },

  // "Communication Controller | All inter-agency + public messaging" (R2903). No
  // walkthrough screen was named for this role - the composition is ours, from that one
  // line plus L1443 (passenger messages need approval before dispatch).
  communication_controller: {
    id: 'communication_controller',
    fnKey: 'role.fn.communication_controller',
    composition: 'INFERRED',
    cite: 'R2903, L1443',
    home: 'dashboard',
    nav: ['dashboard', 'comms', 'alerts', 'forecast', 'map', 'analytics'],
    widgets: ['pendingApprovals', 'commsLog', 'activeIncidents'],
    can: ['acknowledge_alert', 'approve_message', 'send_coordination'],
  },

  // "Dispatchers | Execute instructions to drivers" (R2904); R2929 "Deploy standby buses
  // and additional fleet". Executes - does not approve.
  dispatcher: {
    id: 'dispatcher',
    fnKey: 'role.fn.dispatcher',
    composition: 'INFERRED',
    cite: 'R2904, R2929 · CV walkthrough',
    home: 'dashboard',
    nav: ['dashboard', 'map', 'alerts', 'forecast', 'regularity', 'health', 'comms'],
    widgets: ['resourceStatus', 'dispatchRecs', 'activeIncidents', 'fieldMap'],
    can: ['acknowledge_alert', 'complete_action', 'send_coordination', 'assign_resource'],
  },

  // "Field Inspectors | Ground verification" (R2906); R2917 "Deployed (if required) to
  // confirm incident severity".
  field_inspector: {
    id: 'field_inspector',
    fnKey: 'role.fn.field_inspector',
    composition: 'INFERRED',
    cite: 'R2906, R2917 · CV walkthrough',
    home: 'dashboard',
    nav: ['dashboard', 'map', 'alerts'],
    widgets: ['assignedIncidents', 'fieldMap', 'inspectionChecklist', 'fieldInstructions', 'evidenceBundle'],
    can: ['complete_action', 'upload_evidence'],
  },

  // "Bus Operators OCC | Execute fleet deployment" (R2907); R2928 "Communicate to drivers
  // on route diversions and service suspension". No walkthrough screen - ours.
  bus_operator_occ: {
    id: 'bus_operator_occ',
    fnKey: 'role.fn.bus_operator_occ',
    composition: 'INFERRED',
    cite: 'R2907, R2928',
    home: 'dashboard',
    nav: ['dashboard', 'health', 'operators', 'map', 'alerts', 'comms', 'depot'],
    widgets: ['fleetDeployment', 'resourceStatus', 'activeIncidents'],
    can: ['acknowledge_alert', 'complete_action'],
  },

  // Not in Table 39. Exists because L1347 needs a holder for the override authority.
  supervisor: {
    id: 'supervisor',
    fnKey: 'role.fn.supervisor',
    composition: 'ASSUMPTION',
    cite: 'L1347 (the override authority is confirmed; the role built around it is ours)',
    home: 'dashboard',
    nav: ALL_NAV,
    widgets: ['overrideReview', 'auditLog', 'networkHealth', 'incidentQueue'],
    can: [...PERMISSIONS],
  },
};

/** R2898-R2909 order, so the selection screen reads like the source table. */
export const ROLE_ORDER: RoleId[] = [
  'incident_manager',
  'communication_controller',
  'operations_controller',
  'dispatcher',
  'field_inspector',
  'bus_operator_occ',
  'supervisor',
];

export function specOf(role: RoleId): RoleSpec {
  return ROLE_SPECS[role];
}

/** L1347 for `override_compulsory`; INFERRED for the rest. One rule, one place. */
export function can(role: RoleId, p: Permission): boolean {
  return ROLE_SPECS[role].can.includes(p);
}

export function roleLabelKey(role: RoleId): I18nKey {
  return `role.${role}` as I18nKey;
}

export function permLabelKey(p: Permission): I18nKey {
  return `role.perm.${p}` as I18nKey;
}

export function isRoleId(x: string | null): x is RoleId {
  return x != null && x in ROLE_SPECS;
}
