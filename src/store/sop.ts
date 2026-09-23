/**
 * PTCC SOP execution (PTCC note, Sept 2026), run once per tick from the bridge.
 *
 *   L1 route level  -> "execute automatically": the system sends the driver / operator
 *                      notification itself. Notification, NOT control - no bus is moved,
 *                      no service changed (the no-autonomous-action rule, L718/L1235,
 *                      still holds). Human gates: the Settings switch and Revoke.
 *   L2 medium       -> nothing here: the existing propose -> validate -> approve path.
 *   L3 senior       -> the system DRAFTS the coordination request to the Traffic
 *                      department (TCC); a person with send_coordination sends it.
 *
 * Playbooks attach to EVENTS after validation; L1 must act at ALERT time, which is why
 * this is a bridge hook rather than a playbook item.
 */

import { t } from '../i18n/t';
import type { Alert } from '../sim/types';
import { useComms, useSettings } from './index';

/** Do not repeat the same automatic action for the same alert inside this window. */
export const SOP_REPEAT_S = 1800;

const lastDone = new Map<string, number>();

/** Test hook. */
export function resetSop(): void {
  lastDone.clear();
}

function due(key: string, now_s: number): boolean {
  const at = lastDone.get(key);
  return at === undefined || now_s - at >= SOP_REPEAT_S;
}

/** Returns the alert list with `auto_comm_id` stamped on alerts that were auto-notified. */
export function runSop(alerts: Alert[], now_s: number): Alert[] {
  const comms = useComms.getState();
  const { l1_auto_exec: auto, lang } = useSettings.getState();
  let out = alerts;
  // One Traffic-department draft per incident: when several routes are late together the
  // network alert carries it, and the per-route L3s do not each draft their own.
  const networkL3 = alerts.some((a) => !a.forecast && a.rule_id === 'delay_network' && a.level === 3);

  for (const a of alerts) {
    if (a.forecast || !a.level) continue;

    if (a.level === 1 && a.rule_id === 'delay_sop' && auto && !a.auto_comm_id && due(`l1:${a.id}`, now_s)) {
      lastDone.set(`l1:${a.id}`, now_s);
      const msg = comms.sendSystemCoordination({
        alert_id: a.id,
        recipient: 'bus_operator',
        message_type: 'operational_instruction',
        channel: 'OCC dispatch',
        operator: 'system (SOP L1)',
        content: t('sop.l1.msg', lang, { route: a.route_id ?? '', min: a.params.min ?? '', bus: a.params.bus ?? '' }),
      });
      out = out.map((x) => (x.id === a.id ? { ...x, auto_comm_id: msg.communication_id } : x));
    }

    if (a.level === 3 && !(networkL3 && a.rule_id === 'delay_sop') && due(`l3:${a.id}`, now_s)) {
      lastDone.set(`l3:${a.id}`, now_s);
      comms.draftCoordination({
        alert_id: a.id,
        recipient: 'tcc',
        message_type: 'coordination_request',
        channel: 'PTCC–TCC',
        operator: 'system (SOP L3)',
        content:
          a.rule_id === 'delay_network'
            ? t('sop.l3.draftNet', lang, { n: a.params.n ?? '', min: a.params.min ?? '', routes: a.params.routes ?? '' })
            : t('sop.l3.draft', lang, { route: a.route_id ?? '', min: a.params.min ?? '' }),
      });
    }
  }
  return out;
}
