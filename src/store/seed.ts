/**
 * Shift-handover state.
 *
 * L1235 is absolute: an alert becomes an event only when an operator validates it, and
 * nothing in this app converts one on its own. But a demo that opens at 07:55 with an
 * empty event list puts four of the seven roles - Incident Manager, Field Inspector,
 * Communication Controller, Bus Operator OCC - in front of a queue with nothing in it,
 * which reads as a broken screen rather than a quiet network.
 *
 * So the shift starts the way a real one does: with what the PREVIOUS shift already
 * validated. The audit row names that operator, the event history carries their name at
 * the validation stage, and the runtime rule is untouched - no alert is ever
 * auto-validated while the demo is running.
 */

import type { Alert, Severity } from '../sim/types';
import { categoryFor, eventTypeForAlert, suggestSeverity } from '../rules/playbooks';
import { t, type I18nKey } from '../i18n/t';
import { useAlerts, useComms, useEvents } from './index';

/** Named so every seeded row is attributable to a person, not to "system". */
const HANDOVER_BY = 'B. Otgonbayar';

/** How many alerts the previous shift had already turned into events. */
const SEED_EVENTS = 2;

let seeded = false;

export function seedShift(): void {
  if (seeded) return;
  const events = useEvents.getState();
  const alerts = useAlerts.getState().alerts;
  if (events.events.length > 0 || alerts.length === 0) return;
  seeded = true;

  // L1182: the 3-level alert scale, in its own order. Never merged with the 5-level
  // event scale - suggestSeverity() is what maps across, and it is untouched here.
  const rank: Record<Severity, number> = { critical: 0, warning: 1, informational: 2 };
  const seen = new Set<string>();
  const picks: Alert[] = alerts
    .filter((a) => a.vehicle_id)
    // One per rule: two rows of the same breach would demonstrate one playbook twice.
    .filter((a) => (seen.has(a.rule_id) ? false : (seen.add(a.rule_id), true)))
    .sort((a, b) => rank[a.severity] - rank[b.severity])
    .slice(0, SEED_EVENTS);

  const made = picks.map((a) =>
    events.validate(a, {
      event_type: eventTypeForAlert(a.rule_id, a.type),
      category: categoryFor(a.type),
      severity_level: suggestSeverity(a.severity, a.rule_id),
      description: t(a.title_key as I18nKey, 'en', a.params),
      by: HANDOVER_BY,
    }),
  );

  // The second event is carried further: the previous shift had already assigned the
  // response and was monitoring it. Without this the Field Inspector's queue is empty
  // (it shows only response_assignment / response_monitoring, L1298-L1310) and the
  // compulsory-action gate - the strongest governance control in the product, and the
  // only place L1347's override lives - is unreachable on landing.
  const carried = made[1];
  if (carried) {
    const at = carried.timestamp;
    useEvents.setState((st) => ({
      events: st.events.map((e) =>
        e.event_id === carried.event_id
          ? {
              ...e,
              stage: 'response_monitoring',
              history: [
                ...e.history,
                { stage: 'response_assignment', at, by: HANDOVER_BY },
                { stage: 'response_monitoring', at, by: HANDOVER_BY },
              ],
            }
          : e,
      ),
      audit: [
        { at, actor: HANDOVER_BY, role: 'incident_manager', action: 'advance:response_monitoring', target: carried.event_id },
        { at, actor: HANDOVER_BY, role: 'incident_manager', action: 'advance:response_assignment', target: carried.event_id },
        ...st.audit,
      ],
    }));
  }

  // L1443: drafted, never dispatched. The Communication Controller lands on the one
  // decision the role exists to make, instead of on an empty approval queue.
  const first = made[0];
  if (first) {
    useComms.getState().draftPassenger({
      content_en: t('comms.seedMsg', 'en', { route: first.route_number ?? '—' }),
      content_mn: t('comms.seedMsg', 'mn', { route: first.route_number ?? '—' }),
      category: 'disruption',
      originating_operator: HANDOVER_BY,
      channels: ['app', 'pis'],
      event_id: first.event_id,
    });
  }
}
