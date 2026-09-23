import { beforeEach, describe, expect, it } from 'vitest';
import type { Alert } from '../sim/types';

// The store reads `location.search` at module load; vitest runs in `node`.
(globalThis as unknown as { location: { search: string; hash: string } }).location ??= { search: '', hash: '' };

const { useComms, useEvents, useSettings } = await import('./index');
const { runSop, resetSop, SOP_REPEAT_S } = await import('./sop');

const alert = (level: 1 | 2 | 3): Alert => ({
  id: 'delay_sop:R7', rule_id: 'delay_sop', type: 'service_deviation', severity: 'informational', route_id: 'R7',
  title_key: 'alert.delay', params: { route: 'R7', min: 6, bus: '1-207', n: 1 },
  raised_at: '', raised_at_s: 0, metric: { name: 'delay_min', value: 6, threshold: 5, unit: 'min' },
  pax_affected: 10, impact_score: 20, tier: 1, acknowledged: false, level,
});

describe('SOP execution', () => {
  beforeEach(() => {
    resetSop();
    useComms.setState({ coordination: [] });
    useEvents.setState({ audit: [] });
    useSettings.setState({ l1_auto_exec: true, role: 'operations_controller' });
  });

  it('L1 sends exactly one automatic notification and audits it', () => {
    const out = runSop([alert(1)], 1000);
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
    runSop([alert(1)], 1000);
    runSop([alert(1)], 1000 + SOP_REPEAT_S - 5);
    expect(useComms.getState().coordination).toHaveLength(1);
    resetSop();
    useComms.setState({ coordination: [] });
    useSettings.setState({ l1_auto_exec: false });
    runSop([alert(1)], 1000);
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
  });

  it('drafts once per incident: the network alert carries it, not each late route', () => {
    const net: Alert = { ...alert(3), id: 'delay_network:net', rule_id: 'delay_network', route_id: undefined, params: { n: 6, min: 31, routes: 'R7, R5' } };
    runSop([alert(3), net], 1000);
    const c = useComms.getState().coordination;
    expect(c).toHaveLength(1);
    expect(c[0]!.alert_id).toBe('delay_network:net');
  });

  it('revoke is permission-gated and audited', () => {
    runSop([alert(1)], 1000);
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
});
