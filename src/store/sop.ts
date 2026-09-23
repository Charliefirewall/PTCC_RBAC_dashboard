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

import { create } from 'zustand';
import { t } from '../i18n/t';
import { can } from '../modules/roles/roles';
import type { Alert } from '../sim/types';
import { audit, useComms, useSettings, world } from './index';
import { isoAt, simSecondsOf } from '../sim/engine';

/** Do not repeat the same automatic action for the same alert inside this window. */
export const SOP_REPEAT_S = 1800;
/**
 * E2: an L1 notification waits this long, visibly ("Sending in 30 s — Cancel"), before
 * it goes. Still notification-only; the countdown makes the human window SEEN.
 */
export const SOP_COUNTDOWN_S = 30;

/**
 * E3: a request sent to TCC is acknowledged this long after sending. SIMULATED - there is
 * no PTCC-TCC interface (R967-969); this shows the loop closing, labelled as simulated.
 */
export const TCC_ACK_S = 75;

/** Called every tick: simulated partner replies to what PTCC has sent. */
export function tickComms(now_s: number): void {
  const { coordination, lang } = { ...useComms.getState(), ...useSettings.getState() };
  const due = coordination.filter(
    (c) => c.recipient === 'tcc' && c.status === 'sent' && !c.acknowledged_at && now_s - simSecondsOf(c.sent_at) >= TCC_ACK_S,
  );
  if (!due.length) return;
  const at = isoAt(now_s);
  const ids = new Set(due.map((c) => c.communication_id));
  const ack_text = t('sop.tccAck', lang);
  useComms.setState({
    coordination: coordination.map((c) => (ids.has(c.communication_id) ? { ...c, acknowledged_at: at, ack_text } : c)),
  });
  for (const c of due) audit('tcc_ack', c.alert_id ?? c.communication_id, 'TCC (simulated)', c.communication_id);
}

/** alert id -> sim second its L1 notification is due. */
export const useSop = create<{ pending: Record<string, number> }>(() => ({ pending: {} }));

/** Stop a pending L1 notification. Same permission as revoking a sent one. */
export function cancelL1(alert_id: string, by: string): boolean {
  if (!can(useSettings.getState().role, 'revoke_auto_action')) return false;
  const { pending } = useSop.getState();
  if (pending[alert_id] === undefined) return false;
  const { [alert_id]: _, ...rest } = pending;
  useSop.setState({ pending: rest });
  lastDone.set(`l1:${alert_id}`, world.sim_time_s); // cancelled counts as handled for the window
  audit('auto_exec_cancelled', alert_id, by);
  return true;
}

const lastDone = new Map<string, number>();

/** Test hook. */
export function resetSop(): void {
  lastDone.clear();
  useSop.setState({ pending: {} });
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
  // a countdown whose alert has cleared (or left L1) is dropped, silently - nothing was sent
  const live = new Set(alerts.filter((a) => a.level === 1).map((a) => a.id));
  const pending = Object.fromEntries(Object.entries(useSop.getState().pending).filter(([id]) => live.has(id)));

  for (const a of alerts) {
    if (a.forecast || !a.level) continue;

    if (a.level === 1 && a.rule_id === 'delay_sop' && auto && !a.auto_comm_id && due(`l1:${a.id}`, now_s)) {
      if (pending[a.id] === undefined) {
        pending[a.id] = now_s + SOP_COUNTDOWN_S;
        continue;
      }
      if (now_s < pending[a.id]!) continue;
      delete pending[a.id];
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
            ? t('sop.l3.draftNet', lang, { n: a.params.n ?? '', min: a.params.min ?? '', routes: a.params.routes ?? '', corridor: a.params.corridor ?? '—' })
            : t('sop.l3.draft', lang, { route: a.route_id ?? '', min: a.params.min ?? '' }),
      });
    }
  }
  useSop.setState({ pending });
  return out;
}
