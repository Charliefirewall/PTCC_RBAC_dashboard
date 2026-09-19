/**
 * The agent layer's contract, tested.
 *
 * The point of this file is the autonomy boundary. An agent DETECTS, REASONS and
 * RECOMMENDS; a human approves. The assertions that matter are therefore the ones
 * that would fail if that boundary ever quietly moved:
 *
 *   - the stage clock stops at `recommended` and never walks past it on its own;
 *   - `approve()` records a human decision and mutates nothing else;
 *   - `completed` is reachable only through the operator's own validation flow;
 *   - no decision object carries a callable anywhere - Tier 5 is not representable.
 *
 * Operator validation is mandatory before an alert becomes an event (L1235) and PTCC
 * is not a command authority (L718).
 *
 * The cases run in order and share one warmed-up simulation: the lifecycle is
 * sequential, so testing it out of order would test something else.
 */

import { describe, expect, it, beforeAll } from 'vitest';

// The store reads `location.search` at module load (seed / start-time overrides).
// Vitest runs in the `node` environment here, so stub it before importing.
(globalThis as unknown as { location: { search: string; hash: string } }).location ??= {
  search: '',
  hash: '',
};

const { engine, useSim, useAlerts, useEvents, reevaluate } = await import('./index');
const { useAgentic, confidenceOf, AGENTS, agentForAlert } = await import('./agentic');

/** the decision under test, and the sim second its alert was raised at */
let id = '';
let t0 = 0;

describe('agent decisions over a warmed-up simulation', () => {
  beforeAll(() => {
    for (let i = 0; i < 120; i++) engine.tick();
    useSim.setState({ snap: engine.snapshot(), tick: 1 });
    reevaluate();
    const alerts = useAlerts.getState().alerts;
    useAgentic.getState().sync(alerts, useSim.getState().snap!.sim_time_s);
    const first = Object.values(useAgentic.getState().decisions)[0]!;
    id = first.id;
    t0 = first.detectedAt_s;
  });

  it('raises one decision per open alert, owned by the agent that owns the rule', () => {
    const alerts = useAlerts.getState().alerts;
    expect(alerts.length).toBeGreaterThan(0);
    const ds = Object.values(useAgentic.getState().decisions);
    expect(ds.length).toBe(alerts.length);
    for (const d of ds) {
      const a = alerts.find((x) => x.id === d.alertIds[0])!;
      expect(d.agentId).toBe(agentForAlert(a).id);
      expect(AGENTS[d.agentId].tier).toBeLessThanOrEqual(3); // no Tier 5 agent exists
    }
  });

  it('cites the alert\'s own metric record in its reasoning - nothing is synthesised', () => {
    const alerts = useAlerts.getState().alerts;
    for (const d of Object.values(useAgentic.getState().decisions)) {
      const a = alerts.find((x) => x.id === d.alertIds[0])!;
      expect(d.reasoning.length).toBeGreaterThanOrEqual(2);
      for (const step of d.reasoning) {
        if (step.metric) expect(step.metric).toEqual(a.metric);
        expect(step.cite.length).toBeGreaterThan(0);
      }
    }
  });

  it('scores confidence off the breach size, never off a model', () => {
    // a boolean telemetry flag is OBSERVED, not estimated
    expect(confidenceOf({ name: 'panic', value: 1, threshold: 0, unit: '' })).toBe(1);
    // exactly at the threshold is the weakest possible reading
    expect(confidenceOf({ name: 'load_pct', value: 90, threshold: 90, unit: '%' })).toBeCloseTo(0.6, 5);
    // far past it saturates, and never reaches certainty
    expect(confidenceOf({ name: 'headway_s', value: 200, threshold: 100, unit: 's' })).toBe(0.99);
    for (const d of Object.values(useAgentic.getState().decisions)) {
      expect(d.confidence).toBeGreaterThan(0);
      expect(d.confidence).toBeLessThanOrEqual(1);
    }
  });

  it('stops the stage clock at `recommended` - an agent never self-advances past the human gate', () => {
    const alerts = useAlerts.getState().alerts;
    const sync = useAgentic.getState().sync;

    sync(alerts, t0 + 1);
    expect(useAgentic.getState().decisions[id]!.stage).toBe('detected');
    sync(alerts, t0 + 15);
    expect(useAgentic.getState().decisions[id]!.stage).toBe('reasoning');
    sync(alerts, t0 + 60);
    expect(useAgentic.getState().decisions[id]!.stage).toBe('recommended');

    // however long it is left alone, it goes no further on its own
    sync(alerts, t0 + 86_400);
    const d = useAgentic.getState().decisions[id]!;
    expect(d.stage).toBe('recommended');
    expect(d.approvedBy).toBeUndefined();
    expect(d.approvedAt).toBeUndefined();
    expect(d.completedAt).toBeUndefined();
    expect(d.eventId).toBeUndefined();
  });

  it('records a human decision on approve, and mutates nothing else', () => {
    const auditBefore = useEvents.getState().audit.length;
    const alertsBefore = JSON.stringify(useAlerts.getState().alerts);
    const thBefore = JSON.stringify(useSim.getState().snap);

    useAgentic.getState().approve(id);

    const d = useAgentic.getState().decisions[id]!;
    expect(d.stage).toBe('approved');
    expect(d.approvedBy).toBeTruthy(); // the role that was current at the moment of approval
    expect(d.approvedAt).toBeTruthy();

    // exactly one entry, in the audit log that already exists - not a second log
    const audit = useEvents.getState().audit;
    expect(audit.length).toBe(auditBefore + 1);
    expect(audit[0]!.action).toBe('approve_ai_recommendation');
    expect(audit[0]!.target).toBe(id);
    expect(audit[0]!.role).toBe(d.approvedBy);

    // the simulation and the alerts are untouched: approval is a RECORD, not an action
    expect(JSON.stringify(useAlerts.getState().alerts)).toBe(alertsBefore);
    expect(JSON.stringify(useSim.getState().snap)).toBe(thBefore);
    expect(useEvents.getState().events.length).toBe(0); // approving does NOT create an event
  });

  it('reaches `completed` only through the operator validation flow', () => {
    // still approved, not completed, however far the clock is wound on
    useAgentic.getState().sync(useAlerts.getState().alerts, t0 + 172_800);
    expect(useAgentic.getState().decisions[id]!.stage).toBe('approved');

    // the operator validates the alert into an event (L1235) - that, and only that,
    // is what completes the decision
    useAlerts.setState((s) => ({
      alerts: s.alerts.map((a) => (a.id === id ? { ...a, validated_event_id: 'EV-TEST' } : a)),
    }));
    useAgentic.getState().sync(useAlerts.getState().alerts, t0 + 172_900);

    const d = useAgentic.getState().decisions[id]!;
    expect(d.stage).toBe('completed');
    expect(d.eventId).toBe('EV-TEST');
    expect(d.completedAt).toBeTruthy();
  });

  it('ignores approve/dismiss on a decision that is not awaiting a decision', () => {
    const auditBefore = useEvents.getState().audit.length;
    useAgentic.getState().approve(id);
    useAgentic.getState().dismiss(id);
    expect(useAgentic.getState().decisions[id]!.stage).toBe('completed');
    expect(useEvents.getState().audit.length).toBe(auditBefore);
  });

  /**
   * Defect M1. Alert ids are deterministic (`${rule_id}:${subject}`), so a condition
   * that clears through hysteresis and breaches again reuses the id. If the dismissed
   * decision were retained for ever, that id could never produce a recommendation
   * again: the Alerts list would show the new breach while the Agent Console showed a
   * stale "Rejected" card with the OLD detection time.
   */
  it('recommends again when a dismissed alert id is recycled by a new breach', () => {
    const alerts = useAlerts.getState().alerts;
    const other = alerts.find((a) => a.id !== id);
    expect(other).toBeTruthy(); // the fixture needs a second open alert
    const sync = useAgentic.getState().sync;

    sync(alerts, other!.raised_at_s + 60);
    expect(useAgentic.getState().decisions[other!.id]!.stage).toBe('recommended');
    useAgentic.getState().dismiss(other!.id);
    expect(useAgentic.getState().decisions[other!.id]!.stage).toBe('rejected');

    // a dismissal is NOT forgotten while the same breach is still open
    sync(useAlerts.getState().alerts, other!.raised_at_s + 600);
    expect(useAgentic.getState().decisions[other!.id]!.stage).toBe('rejected');

    // ... but the condition clears and the same subject breaches again 35 min later:
    // same id, new raised_at_s.
    const reraised_at_s = other!.raised_at_s + 2100;
    useAlerts.setState((s) => ({
      alerts: s.alerts.map((a) => (a.id === other!.id ? { ...a, raised_at_s: reraised_at_s } : a)),
    }));
    sync(useAlerts.getState().alerts, reraised_at_s + 1);

    const d = useAgentic.getState().decisions[other!.id]!;
    expect(d.stage).toBe('detected'); // a fresh lifecycle, not the stale rejection
    expect(d.detectedAt_s).toBe(reraised_at_s);
    expect(d.approvedBy).toBeUndefined();
    expect(d.approvedAt).toBeUndefined();

    // and it walks to `recommended` on its own again - and no further
    sync(useAlerts.getState().alerts, reraised_at_s + 60);
    expect(useAgentic.getState().decisions[other!.id]!.stage).toBe('recommended');
  });

  it('carries no function-valued field anywhere - Tier 5 is not representable', () => {
    const seen = new Set<unknown>();
    const walk = (v: unknown, path: string): void => {
      if (typeof v === 'function') throw new Error(`callable at ${path}`);
      if (v && typeof v === 'object') {
        if (seen.has(v)) return;
        seen.add(v);
        for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`);
      }
    };
    for (const d of Object.values(useAgentic.getState().decisions)) walk(d, d.id);
    expect(seen.size).toBeGreaterThan(0);
  });
});
