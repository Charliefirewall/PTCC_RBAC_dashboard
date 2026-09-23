import { beforeEach, describe, expect, it } from 'vitest';
import type { Alert } from '../sim/types';

// The store reads `location.search` at module load; vitest runs in `node`.
(globalThis as unknown as { location: { search: string; hash: string } }).location ??= { search: '', hash: '' };

const { useComms, useEvents, useSettings } = await import('./index');
const { runSop, resetSop, SOP_REPEAT_S, SOP_COUNTDOWN_S, useSop, cancelL1, tickComms, TCC_ACK_S } = await import('./sop');
const { simSecondsOf } = await import('../sim/engine');

const alert = (level: 1 | 2 | 3): Alert => ({
  id: 'delay_sop:R7', rule_id: 'delay_sop', type: 'service_deviation', severity: 'informational', route_id: 'R7',
  title_key: 'alert.delay', params: { route: 'R7', min: 6, bus: '1-207', n: 1 },
  raised_at: '', raised_at_s: 0, metric: { name: 'delay_min', value: 6, threshold: 5, unit: 'min' },
  pax_affected: 10, impact_score: 20, tier: 1, acknowledged: false, level,
});

/** Raise an L1 and let its countdown run out. */
function sendL1(t0: number) {
  runSop([alert(1)], t0);
  runSop([alert(1)], t0 + SOP_COUNTDOWN_S);
}

describe('SOP execution', () => {
  beforeEach(() => {
    resetSop();
    useComms.setState({ coordination: [] });
    useEvents.setState({ audit: [] });
    useSettings.setState({ l1_auto_exec: true, role: 'operations_controller' });
  });

  it('L1 waits a visible countdown before sending (E2)', () => {
    runSop([alert(1)], 1000);
    expect(useComms.getState().coordination).toHaveLength(0);
    expect(useSop.getState().pending['delay_sop:R7']).toBe(1000 + SOP_COUNTDOWN_S);
    runSop([alert(1)], 1000 + SOP_COUNTDOWN_S - 5);
    expect(useComms.getState().coordination).toHaveLength(0);
  });

  it('a controller can cancel inside the countdown; nothing is sent and it is audited (E2)', () => {
    runSop([alert(1)], 1000);
    useSettings.setState({ role: 'field_inspector' });
    expect(cancelL1('delay_sop:R7', 'fi')).toBe(false);
    useSettings.setState({ role: 'operations_controller' });
    expect(cancelL1('delay_sop:R7', 'oc')).toBe(true);
    runSop([alert(1)], 1000 + SOP_COUNTDOWN_S + 5);
    expect(useComms.getState().coordination).toHaveLength(0);
    expect(useSop.getState().pending['delay_sop:R7']).toBeUndefined();
    expect(useEvents.getState().audit[0]!.action).toBe('auto_exec_cancelled');
  });

  it('drops the countdown if the alert clears before it fires (E2)', () => {
    runSop([alert(1)], 1000);
    runSop([], 1010);
    runSop([alert(1)], 1000 + SOP_COUNTDOWN_S + 1);
    // re-raised: a fresh countdown, not an immediate send
    expect(useComms.getState().coordination).toHaveLength(0);
  });

  it('L1 sends exactly one automatic notification when the countdown ends, and audits it', () => {
    runSop([alert(1)], 1000);
    const out = runSop([alert(1)], 1000 + SOP_COUNTDOWN_S);
    const c = useComms.getState().coordination;
    expect(c).toHaveLength(1);
    expect(c[0]!.auto).toBe(true);
    expect(c[0]!.status).toBe('sent');
    expect(c[0]!.recipient).toBe('bus_operator');
    expect(out[0]!.auto_comm_id).toBe(c[0]!.communication_id);
    expect(useEvents.getState().audit[0]!.action).toBe('auto_exec_l1');
    expect(useEvents.getState().audit[0]!.actor).toBe('system');
  });

  it('does not repeat inside the window, and does nothing when switched off', () => {
    sendL1(1000);
    runSop([alert(1)], 1000 + SOP_REPEAT_S - 5);
    runSop([alert(1)], 1000 + SOP_REPEAT_S);
    expect(useComms.getState().coordination).toHaveLength(1);
    resetSop();
    useComms.setState({ coordination: [] });
    useSettings.setState({ l1_auto_exec: false });
    sendL1(1000);
    expect(useComms.getState().coordination).toHaveLength(0);
  });

  it('never auto-sends for L2', () => {
    runSop([alert(2)], 1000);
    expect(useComms.getState().coordination).toHaveLength(0);
  });

  it('L3 drafts one request to TCC and never sends it', () => {
    runSop([alert(3)], 1000);
    runSop([alert(3)], 1005);
    const c = useComms.getState().coordination;
    expect(c).toHaveLength(1);
    expect(c[0]!.recipient).toBe('tcc');
    expect(c[0]!.status).toBe('draft');
    expect(c[0]!.auto).toBeUndefined();
    expect(c[0]!.provenance).toBe('sop_l3');
    expect(c[0]!.intent).toBe('actual_l3_escalation');
    expect(c[0]!.channel).toBe('manual (telephone)');
    expect(useEvents.getState().audit[0]!.action).toBe('auto_draft_l3');
  });

  it('keeps analytics proposals distinct from L3 and carries their evidence into a human-gated draft', () => {
    const input = {
      recipient: 'tcc' as const,
      message_type: 'coordination_request' as const,
      channel: 'PTCC analytics',
      operator: 'operations_controller',
      content: 'Please review signal priority before the selected trip.',
      reason: 'Recurring weekday AM excess on Peace Ave.',
      evidence: ['12 of 20 historical trips affected', 'Forecast contribution +4.2 min'],
      recommended_action: 'Review signal priority during the predicted window.',
      context: { route_id: 'R7', segment_id: 'seg-peace', day: 'Monday', start_time: '08:00' },
    };

    useSettings.setState({ role: 'field_inspector' });
    expect(useComms.getState().draftProactiveCoordination(input)).toBeUndefined();
    expect(useComms.getState().coordination).toHaveLength(0);

    useSettings.setState({ role: 'operations_controller' });
    const msg = useComms.getState().draftProactiveCoordination(input);
    expect(msg?.status).toBe('draft');
    expect(msg?.provenance).toBe('analytics_proactive');
    expect(msg?.intent).toBe('proactive_proposal');
    expect(msg?.channel).toBe('manual (telephone)');
    expect(msg?.evidence).toEqual(input.evidence);
    expect(useEvents.getState().audit[0]!.action).toBe('proactive_coordination_proposed');
    expect(useEvents.getState().audit.some((x) => x.action === 'auto_draft_l3')).toBe(false);

    expect(useComms.getState().sendDraft(msg!.communication_id, 'operations_controller')).toBe(true);
    expect(useComms.getState().coordination[0]!.status).toBe('sent');
    expect(useEvents.getState().audit[0]!.action).toBe('send_draft');
  });

  it('lets only an escalation role request Analytics escalation without claiming a confirmed L3', () => {
    const request = {
      operator: 'incident_manager',
      content: 'Request senior review and manual Traffic Control Centre coordination.',
      reason: 'The selected segment is forecast to contribute 7.1 minutes to the trip.',
      evidence: ['18 of 24 comparable Monday trips delayed', 'Forecast confidence 84%'],
      recommended_action: 'Review signal-priority coordination before departure.',
      context: { route_id: 'R7', segment_id: 'seg-peace', day: 'Monday', start_time: '08:00' },
    };

    useSettings.setState({ role: 'operations_controller' });
    expect(useComms.getState().requestAnalyticsEscalation(request)).toBeUndefined();

    useSettings.setState({ role: 'incident_manager' });
    const msg = useComms.getState().requestAnalyticsEscalation(request);
    expect(msg).toMatchObject({
      status: 'draft',
      provenance: 'analytics_proactive',
      intent: 'escalation_request',
      recipient: 'tcc',
      channel: 'manual (telephone)',
    });
    expect(useEvents.getState().audit[0]!.action).toBe('analytics_escalation_requested');
    expect(useEvents.getState().audit.some((x) => x.action === 'auto_draft_l3')).toBe(false);
  });

  it('drafts once per incident: the network alert carries it, not each late route', () => {
    const net: Alert = { ...alert(3), id: 'delay_network:net', rule_id: 'delay_network', route_id: undefined, params: { n: 6, min: 31, routes: 'R7, R5' } };
    runSop([alert(3), net], 1000);
    const c = useComms.getState().coordination;
    expect(c).toHaveLength(1);
    expect(c[0]!.alert_id).toBe('delay_network:net');
  });

  it('revoke is permission-gated and audited', () => {
    sendL1(1000);
    const id = useComms.getState().coordination[0]!.communication_id;
    useSettings.setState({ role: 'field_inspector' });
    expect(useComms.getState().revoke(id, 'fi')).toBe(false);
    useSettings.setState({ role: 'operations_controller' });
    expect(useComms.getState().revoke(id, 'oc')).toBe(true);
    const m = useComms.getState().coordination[0]!;
    expect(m.status).toBe('revoked');
    expect(m.revoked_by).toBe('oc');
    expect(useEvents.getState().audit[0]!.action).toBe('revoke_auto_comms');
  });

  it('a person sends the L3 draft', () => {
    runSop([alert(3)], 1000);
    const id = useComms.getState().coordination[0]!.communication_id;
    useSettings.setState({ role: 'incident_manager' });
    expect(useComms.getState().sendDraft(id, 'im')).toBe(true);
    expect(useComms.getState().coordination[0]!.status).toBe('sent');
  });

  it('TCC acknowledges a sent request after a simulated delay, audited (E3)', () => {
    runSop([alert(3)], 1000);
    const id = useComms.getState().coordination[0]!.communication_id;
    useSettings.setState({ role: 'incident_manager' });
    useComms.getState().sendDraft(id, 'im');
    const sent = simSecondsOf(useComms.getState().coordination[0]!.sent_at);
    tickComms(sent + TCC_ACK_S - 1);
    expect(useComms.getState().coordination[0]!.acknowledged_at).toBeUndefined();
    tickComms(sent + TCC_ACK_S);
    const m = useComms.getState().coordination[0]!;
    expect(m.acknowledged_at).toBeTruthy();
    expect(m.ack_text).toMatch(/TCC/);
    expect(useEvents.getState().audit[0]!.action).toBe('tcc_ack');
    tickComms(sent + TCC_ACK_S + 100);
    expect(useEvents.getState().audit.filter((x) => x.action === 'tcc_ack')).toHaveLength(1);
  });

  it('an unsent draft is never acknowledged (E3)', () => {
    runSop([alert(3)], 1000);
    tickComms(99_999);
    expect(useComms.getState().coordination[0]!.acknowledged_at).toBeUndefined();
  });
});
