import { PLAYBOOKS, playbookFor, eventTypeForAlert } from './playbooks';
import { describe, expect, it } from 'vitest';
import { buildWorld } from '../data/build';
import { SimEngine } from '../sim/engine';
import { classifyHeadways, rankBy, routeDeviationStats } from './regularity';
import { deriveMetrics, evaluateRules, impactScore, makeHysteresis } from './evaluate';
import { DEMO_DEFAULTS, bandOf } from './thresholds';
import type { Route, SimSnapshot, Vehicle } from '../sim/types';

const START = 7 * 3600 + 40 * 60;
const th = { ...DEMO_DEFAULTS };

function fakeRoute(id: string): Route {
  return {
    route_id: id,
    name_en: id,
    name_mn: id,
    operator_id: 'A',
    kind: 'city',
    active: true,
    shape: [[106.9, 47.91], [107.0, 47.91]],
    length_m: 10000,
    stops: [],
    demand_weight: 1,
    planned_headway_s: { amPeak: 600, offPeak: 600, pmPeak: 600, evening: 900 },
  };
}

function fakeVehicle(id: string, route_id: string, progress: number, speedKmh = 20): Vehicle {
  return {
    vehicle_id: id, route_id, operator_id: 'A', timestamp: '2026-09-21T08:00:00+08:00',
    latitude: 47.91, longitude: 106.95, speed: speedKmh, heading: 90, trip_progress: progress,
    direction: 0, schedule_deviation: 0, pax_count: 0, capacity: 80, status: 'in_service',
    door_status: 'normal', driver_status: 'normal', driver_id: 'D-0001', next_stop_id: null,
    distance_to_next_stop_m: 0, equipment: { afc: 'ok', cctv: 'ok', tbox: 'ok' }, flags: {},
    left_behind: 0, boardings_today: 0, km_today: 0,
  };
}

function snapOf(routes: Route[], vehicles: Vehicle[]): SimSnapshot {
  return { sim_time_s: START, iso: '2026-09-21T07:40:00+08:00', vehicles, routes, feed_stale: false };
}

describe('regularity maths', () => {
  it('flags exactly the large wrap gap', () => {
    // four vehicles: three tightly spaced, one far ahead -> one big gap on the wrap
    const hw = [300, 300, 300, 2400];
    const r = classifyHeadways(hw, 600, th);
    expect(r.gaps).toEqual([2400]);
    expect(r.max_gap_s).toBe(2400);
  });

  it('flags bunching below the minimum headway', () => {
    const r = classifyHeadways([50, 900, 900], 600, th);
    expect(r.bunching_count).toBe(1);
    expect(r.min_headway_s).toBe(50);
  });

  it('returns finite numbers with fewer than two vehicles', () => {
    const r = classifyHeadways([], 600, th);
    expect(Number.isFinite(r.max_gap_s)).toBe(true);
    expect(r.max_gap_s).toBe(600);
    expect(r.bunching_count).toBe(0);
  });

  it('computes on-time percentage against the deviation threshold', () => {
    const route = fakeRoute('R1');
    const vs = [fakeVehicle('a', 'R1', 0.1), fakeVehicle('b', 'R1', 0.5), fakeVehicle('c', 'R1', 0.9)];
    vs[0]!.schedule_deviation = 60;
    vs[1]!.schedule_deviation = 900; // late beyond 300 s
    vs[2]!.schedule_deviation = -30;
    const d = routeDeviationStats(route, vs, th);
    expect(d.count).toBe(3);
    expect(Math.round(d.on_time_pct)).toBe(67);
    expect(d.max_s).toBe(900);
  });

  it('ranks top-N descending and stably', () => {
    const items = [{ k: 1 }, { k: 9 }, { k: 5 }, { k: 9 }];
    expect(rankBy(items, (x) => x.k, 3).map((x) => x.k)).toEqual([9, 9, 5]);
  });
});

describe('load bands (Slide 8 - the only threshold set in any source)', () => {
  it('maps percentages to the deck bands', () => {
    expect(bandOf(96).key).toBe('band.over90');
    expect(bandOf(91).key).toBe('band.over90');
    expect(bandOf(87).key).toBe('band.70to90');
    expect(bandOf(65).key).toBe('band.50to70');
    expect(bandOf(40).key).toBe('band.30to50');
    expect(bandOf(10).key).toBe('band.under30');
  });
});

describe('rule engine', () => {
  const routes = [fakeRoute('R5')];

  function run(vehicles: Vehicle[], thr = th, prev: any[] = [], hy = makeHysteresis()) {
    const snap = snapOf(routes, vehicles);
    const m = deriveMetrics(snap, thr);
    return { ...evaluateRules(snap, m, thr, prev, hy), m };
  }

  it('raises Critical overcrowding at 96 % and Warning at 91 %', () => {
    const at = (pct: number) => {
      const vs = [fakeVehicle('a', 'R5', 0.2), fakeVehicle('b', 'R5', 0.7)];
      for (const v of vs) v.pax_count = Math.round(v.capacity * (pct / 100));
      return run(vs).alerts.find((a) => a.rule_id === 'overcrowding');
    };
    expect(at(96)?.severity).toBe('critical');
    expect(at(91)?.severity).toBe('warning');
    expect(at(60)).toBeUndefined();
  });

  it('attaches the route id and the breached threshold to the alert', () => {
    const vs = [fakeVehicle('a', 'R5', 0.2), fakeVehicle('b', 'R5', 0.7)];
    for (const v of vs) v.pax_count = 77; // 96 %
    const a = run(vs).alerts.find((x) => x.rule_id === 'overcrowding')!;
    expect(a.route_id).toBe('R5');
    expect(a.metric.threshold).toBe(th.passenger_load_pct);
    expect(a.metric.value).toBeGreaterThanOrEqual(90);
  });

  it('raises a Critical vehicle_safety alert on panic', () => {
    const vs = [fakeVehicle('a', 'R5', 0.2), fakeVehicle('b', 'R5', 0.7)];
    vs[0]!.flags.panic = true;
    const a = run(vs).alerts.find((x) => x.rule_id === 'panic')!;
    expect(a.severity).toBe('critical');
    expect(a.type).toBe('vehicle_safety');
    expect(a.vehicle_id).toBe('a');
  });

  it('is idempotent: re-evaluating identical state keeps one alert with the same id', () => {
    const vs = [fakeVehicle('a', 'R5', 0.2), fakeVehicle('b', 'R5', 0.7)];
    for (const v of vs) v.pax_count = 77;
    const hy = makeHysteresis();
    const first = run(vs, th, [], hy).alerts;
    const second = run(vs, th, first, hy).alerts;
    expect(second.filter((a) => a.rule_id === 'overcrowding')).toHaveLength(1);
    expect(second.find((a) => a.rule_id === 'overcrowding')!.id).toBe(
      first.find((a) => a.rule_id === 'overcrowding')!.id,
    );
    expect(second.find((a) => a.rule_id === 'overcrowding')!.raised_at).toBe(
      first.find((a) => a.rule_id === 'overcrowding')!.raised_at,
    );
  });

  it('clears only after two consecutive misses (hysteresis)', () => {
    const hot = [fakeVehicle('a', 'R5', 0.2), fakeVehicle('b', 'R5', 0.7)];
    for (const v of hot) v.pax_count = 77;
    const cold = [fakeVehicle('a', 'R5', 0.2), fakeVehicle('b', 'R5', 0.7)];
    for (const v of cold) v.pax_count = 20;

    const hy = makeHysteresis();
    const a1 = run(hot, th, [], hy).alerts;
    expect(a1.some((a) => a.rule_id === 'overcrowding')).toBe(true);
    const a2 = run(cold, th, a1, hy).alerts;
    expect(a2.some((a) => a.rule_id === 'overcrowding')).toBe(true); // still open
    const a3 = run(cold, th, a2, hy).alerts;
    expect(a3.some((a) => a.rule_id === 'overcrowding')).toBe(false); // now cleared
  });

  it('is genuinely configurable: lowering the load threshold surfaces a quieter route', () => {
    const vs = [fakeVehicle('a', 'R5', 0.2), fakeVehicle('b', 'R5', 0.7)];
    for (const v of vs) v.pax_count = Math.round(v.capacity * 0.78);
    expect(run(vs, th).alerts.some((a) => a.rule_id === 'overcrowding')).toBe(false);
    expect(run(vs, { ...th, passenger_load_pct: 70 }).alerts.some((a) => a.rule_id === 'overcrowding')).toBe(true);
  });

  it('ranks a warning on a busy route above one on an empty route (S8 impact rule)', () => {
    const busy = impactScore('warning', 300, 92);
    const empty = impactScore('warning', 5, 20);
    expect(busy).toBeGreaterThan(empty);
    // ...but a Critical always outranks a Warning
    expect(impactScore('critical', 5, 20)).toBeGreaterThan(busy);
  });

  it('keeps the alert and event severity scales separate', () => {
    const vs = [fakeVehicle('a', 'R5', 0.2), fakeVehicle('b', 'R5', 0.7)];
    vs[0]!.flags.panic = true;
    for (const a of run(vs).alerts) {
      expect(['informational', 'warning', 'critical']).toContain(a.severity);
    }
  });
});

describe('metrics over the real world', () => {
  it("puts the deck's named routes at the top of the load ranking (S8 Chart C)", () => {
    const e = new SimEngine(buildWorld(20260921, START));
    for (let i = 0; i < 240; i++) e.tick();
    const m = deriveMetrics(e.snapshot(), th);
    const ranked = [...m.per_route.values()]
      .filter((r) => r.vehicles > 0)
      .sort((a, b) => b.load_pct - a.load_pct);
    const top6 = ranked.slice(0, 6).map((r) => r.route_id);
    // S8 Chart C names R5, R18, R22, R10, R3 as the busiest; R7 and R12 are the deck's
    // other trunk routes. At least three of them must surface unaided.
    const deckRoutes = ['R5', 'R7', 'R12', 'R18', 'R22', 'R10', 'R3'];
    const hits = top6.filter((r) => deckRoutes.includes(r));
    expect(hits.length, `top6 was ${top6.join(',')}`).toBeGreaterThanOrEqual(3);
    // and the distribution must be heavy-tailed, not flat
    const median = ranked[Math.floor(ranked.length / 2)]!.load_pct;
    expect(ranked[0]!.load_pct).toBeGreaterThan(median * 2.5);
  });

  it('produces a plausible steady state and a funnel that sums to the fleet', () => {
    const e = new SimEngine(buildWorld(20260921, START));
    for (let i = 0; i < 240; i++) e.tick();
    const snap = e.snapshot();
    const m = deriveMetrics(snap, th);
    const { alerts } = evaluateRules(snap, m, th, [], makeHysteresis());

    expect(m.in_service).toBe(1086);
    expect(m.routes_operating).toBeGreaterThan(80);
    expect(m.funnel.normal + m.funnel.attention + m.funnel.critical).toBe(m.in_service);
    // The deck's central claim: "Operator focuses on 15 - not 1,100" (S3), with a
    // steady state of roughly 1,085 Normal / 10 Attention / 5 Critical.
    //
    // The exception set must stay tiny or the demo's whole thesis is broken. A handful
    // of criticals at rest is CORRECT, not drift: with a heavy-tailed demand
    // distribution an individual bus on a trunk route runs full even when its route
    // averages far less. That is what the deck shows too.
    expect(m.funnel.attention + m.funnel.critical).toBeLessThan(m.in_service * 0.05);
    expect(m.funnel.critical).toBeLessThan(m.in_service * 0.01);
    expect(alerts.length).toBeGreaterThan(0);
    for (const a of alerts) expect(a.impact_score).toBeGreaterThan(0);
  });
});

/*
 * Alert -> event-type -> playbook mapping.
 *
 * These pin a governance invariant that regressed once already: a presentation change
 * remapped `accident` by alert type instead of rule_id, downgrading its playbook and
 * dropping two compulsory actions that gate resolution. The rule is simple and absolute -
 * re-presenting an alert may never hand it a weaker playbook.
 */
describe('alert -> playbook mapping', () => {
  const GATE_RESOLUTION = new Set([
    'pb.preserve_cctv', 'pb.preserve_evidence', 'pb.notify_traffic_police', 'pb.request_towing',
  ]);
  const strength = (id: ReturnType<typeof playbookFor>) => {
    const c = PLAYBOOKS[id].compulsory as readonly string[];
    return { count: c.length, atResolution: c.filter((k) => GATE_RESOLUTION.has(k)).length };
  };

  it('keeps an accident on the traffic_accident playbook', () => {
    // type is 'vehicle_safety', which must NOT capture it
    expect(eventTypeForAlert('accident', 'vehicle_safety')).toBe('accident');
    expect(playbookFor(eventTypeForAlert('accident', 'vehicle_safety'))).toBe('traffic_accident');
  });

  it('keeps preserve_cctv and notify_traffic_police compulsory for an accident', () => {
    const c = PLAYBOOKS[playbookFor(eventTypeForAlert('accident', 'vehicle_safety'))].compulsory as readonly string[];
    expect(c).toContain('pb.preserve_cctv');
    expect(c).toContain('pb.notify_traffic_police');
  });

  it('routes a breakdown to the breakdown playbook', () => {
    expect(playbookFor(eventTypeForAlert('vehicle_breakdown', 'vehicle_safety'))).toBe('vehicle_breakdown');
  });

  it('normalises equipment rule ids the playbook table does not know verbatim', () => {
    expect(eventTypeForAlert('equipment_afc', 'equipment_failure')).toBe('afc_failure');
    expect(playbookFor(eventTypeForAlert('equipment_afc', 'equipment_failure'))).toBe('minor_equipment_failure');
    expect(playbookFor(eventTypeForAlert('equipment_cctv', 'equipment_failure'))).toBe('minor_equipment_failure');
    expect(playbookFor(eventTypeForAlert('repeated_failure', 'equipment_failure'))).toBe('minor_equipment_failure');
  });

  /*
   * A per-rule EXPECTED table, not a "no weaker than generic" floor.
   *
   * The floor version of this test was useless: `generic` was both the baseline and the
   * thing a downgrade falls to, so every real regression passed by definition. It missed
   * panic routing to the towing playbook and equipment_tbox falling through entirely.
   * Assert the playbook each rule must get, and the test fails when one moves.
   */
  it('routes every raised alert to its expected playbook', () => {
    const expected: Record<string, ReturnType<typeof playbookFor>> = {
      service_gap: 'generic', bunching: 'generic', schedule_deviation: 'generic',
      overcrowding: 'generic', route_deviation: 'generic',
      vehicle_breakdown: 'vehicle_breakdown',
      harsh_braking: 'vehicle_breakdown', overspeed: 'vehicle_breakdown',
      accident: 'traffic_accident',
      panic: 'security_incident',
      equipment_afc: 'minor_equipment_failure', equipment_cctv: 'minor_equipment_failure',
      equipment_tbox: 'minor_equipment_failure', repeated_failure: 'minor_equipment_failure',
    };
    const typeOf: Record<string, string> = {
      vehicle_breakdown: 'vehicle_safety', harsh_braking: 'vehicle_safety',
      overspeed: 'vehicle_safety', accident: 'vehicle_safety', panic: 'vehicle_safety',
      equipment_afc: 'equipment_failure', equipment_cctv: 'equipment_failure',
      equipment_tbox: 'equipment_failure', repeated_failure: 'equipment_failure',
      overcrowding: 'overcrowding',
    };
    for (const [rule, want] of Object.entries(expected)) {
      const got = playbookFor(eventTypeForAlert(rule, typeOf[rule] ?? 'service_deviation'));
      expect(got, `${rule} routed to ${got}, expected ${want}`).toBe(want);
    }
  });

  it('gives every safety-critical rule at least one resolution-gated compulsory action', () => {
    // A resolution gate is the early gate - evidence and notification duties that must
    // be discharged before an event may be resolved, not merely before it is closed.
    for (const [rule, type] of [['accident', 'vehicle_safety'], ['panic', 'vehicle_safety'],
                                ['vehicle_breakdown', 'vehicle_safety']] as const) {
      const s = strength(playbookFor(eventTypeForAlert(rule, type)));
      expect(s.atResolution, `${rule} has no resolution-gated compulsory action`).toBeGreaterThan(0);
    }
  });
});
