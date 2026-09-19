import { describe, expect, it } from 'vitest';
import { buildWorld, FLEET_IN_SERVICE, FLEET_TOTAL, ROUTES_ACTIVE, ROUTES_TOTAL, buildRoutes, routeCum } from '../data/build';
import { SimEngine, TICK_DT_S, isoAt, simSecondsOf } from './engine';
import { haversine, pointAlong } from './geo';
import { deriveMetrics, evaluateRules, makeHysteresis } from '../rules/evaluate';
import { DEMO_DEFAULTS } from '../rules/thresholds';
import { UB_BBOX } from '../data/corridors';
import { SCENARIOS, resetAll } from './scenarios';

const START = 7 * 3600 + 40 * 60;

describe('world build', () => {
  it('produces the source-confirmed scale', () => {
    const routes = buildRoutes(1);
    expect(routes).toHaveLength(ROUTES_TOTAL);
    expect(routes.filter((r) => r.active)).toHaveLength(ROUTES_ACTIVE);
    expect(routes.filter((r) => r.kind === 'city')).toHaveLength(104);
    expect(routes.filter((r) => r.kind === 'suburban')).toHaveLength(17);
  });

  it('builds 1,100 vehicles with 1,086 in service', () => {
    const w = buildWorld(20260921, START);
    expect(w.vehicles).toHaveLength(FLEET_TOTAL);
    expect(w.vehicles.filter((v) => v.status === 'in_service')).toHaveLength(FLEET_IN_SERVICE);
    expect(new Set(w.vehicles.map((v) => v.vehicle_id)).size).toBe(FLEET_TOTAL);
  });

  it('includes the vehicles the deck names', () => {
    const w = buildWorld(20260921, START);
    for (const id of ['3-015', '3-305', '2-418']) {
      expect(w.vehicleById.get(id), `missing ${id}`).toBeTruthy();
    }
  });

  it('every route has a usable shape and stops', () => {
    for (const r of buildRoutes(7)) {
      expect(r.shape.length).toBeGreaterThanOrEqual(2);
      expect(r.length_m).toBeGreaterThan(1000);
      expect(r.stops.length).toBeGreaterThanOrEqual(6);
    }
  });
});

describe('simulation tick', () => {
  it('is deterministic for a fixed seed', () => {
    const hash = (seed: number) => {
      const e = new SimEngine(buildWorld(seed, START));
      for (let i = 0; i < 200; i++) e.tick();
      return e.world.vehicles
        .map((v) => `${v.vehicle_id}:${v.trip_progress.toFixed(6)}:${v.pax_count}:${Math.round(v.schedule_deviation)}`)
        .join('|');
    };
    expect(hash(20260921)).toBe(hash(20260921));
    expect(hash(20260921)).not.toBe(hash(20260922));
  });

  it('keeps vehicles in the Ulaanbaatar bbox and progress in range', () => {
    const e = new SimEngine(buildWorld(20260921, START));
    for (let i = 0; i < 500; i++) e.tick();
    for (const v of e.world.vehicles) {
      expect(v.trip_progress).toBeGreaterThanOrEqual(0);
      expect(v.trip_progress).toBeLessThanOrEqual(1);
      expect(v.longitude).toBeGreaterThan(UB_BBOX[0] - 0.05);
      expect(v.longitude).toBeLessThan(UB_BBOX[2] + 0.05);
      expect(v.latitude).toBeGreaterThan(UB_BBOX[1] - 0.05);
      expect(v.latitude).toBeLessThan(UB_BBOX[3] + 0.05);
    }
  });

  it('holds the in-service count steady with no scenarios', () => {
    const e = new SimEngine(buildWorld(20260921, START));
    for (let i = 0; i < 300; i++) e.tick();
    expect(e.world.vehicles.filter((v) => v.status === 'in_service')).toHaveLength(FLEET_IN_SERVICE);
  });

  it('never exceeds capacity by more than the standing allowance', () => {
    const e = new SimEngine(buildWorld(20260921, START));
    for (let i = 0; i < 400; i++) e.tick();
    for (const v of e.world.vehicles) {
      expect(v.pax_count).toBeLessThanOrEqual(Math.round(v.capacity * 1.05) + 1);
      expect(v.pax_count).toBeGreaterThanOrEqual(0);
    }
  });

  it('emits ISO 8601 timestamps that advance', () => {
    const e = new SimEngine(buildWorld(20260921, START));
    const a = e.tick().iso;
    for (let i = 0; i < 10; i++) e.tick();
    const b = e.tick().iso;
    expect(Date.parse(a)).toBeGreaterThan(0);
    expect(Date.parse(b)).toBeGreaterThan(Date.parse(a));
    expect(a).toMatch(/^2026-09-21T\d\d:\d\d:\d\d\+08:00$/);
  });

  it('applies an injected mutation on the next tick', () => {
    const e = new SimEngine(buildWorld(20260921, START));
    e.tick();
    e.inject((w) => {
      w.vehicleById.get('3-015')!.status = 'breakdown';
    });
    e.tick();
    const v = e.world.vehicleById.get('3-015')!;
    expect(v.status).toBe('breakdown');
    expect(v.speed).toBe(0);
  });

  it('accumulates ridership toward a plausible daily total', () => {
    const e = new SimEngine(buildWorld(20260921, 6 * 3600));
    // 6 sim-hours at 5 s per tick
    for (let i = 0; i < (6 * 3600) / 5; i++) e.tick();
    const total = e.world.vehicles.reduce((s, v) => s + v.boardings_today, 0);
    // source envelope is 0.5-0.6 M/day; six morning hours should be a large fraction of it
    expect(total).toBeGreaterThan(50_000);
    expect(total).toBeLessThan(600_000);
  });
});

describe('scenarios', () => {
  it('every scenario has at least one step and a source citation', () => {
    for (const s of Object.values(SCENARIOS)) {
      expect(s.steps.length).toBeGreaterThan(0);
      expect(s.source.length).toBeGreaterThan(10);
    }
  });

  it('D1 opens a service gap on R7 and D3 stops a bus', () => {
    const e = new SimEngine(buildWorld(20260921, 13 * 3600 + 50 * 60));
    for (let i = 0; i < 60; i++) e.tick();
    e.inject((w, t) => SCENARIOS.D1.steps[0]!.apply(w, t));
    for (let i = 0; i < 30; i++) e.tick();
    expect(e.world.congestion.has('R7')).toBe(true);

    e.inject((w, t) => SCENARIOS.D3.steps[0]!.apply(w, t));
    e.tick();
    expect(e.world.vehicleById.get('3-015')!.status).toBe('breakdown');

    resetAll(e.world);
    expect(e.world.vehicleById.get('3-015')!.status).toBe('in_service');
  });

  it('keeps a scenario-injected telematics flag alive long enough to be alerted on', () => {
    // Regression: transient flags used to be cleared at the top of every tick, so a
    // flag set by a scenario BETWEEN ticks was wiped before the rule engine saw it -
    // D4 step 1 produced no observable change at all.
    const e = new SimEngine(buildWorld(20260921, START));
    for (let i = 0; i < 12; i++) e.tick();
    e.inject((w, t) => SCENARIOS.D4.steps[0]!.apply(w, t));
    e.tick();
    expect(e.world.vehicles.some((v) => v.flags.harsh_braking)).toBe(true);
    for (let i = 0; i < 6; i++) e.tick(); // 30 s later it must still be up
    expect(e.world.vehicles.some((v) => v.flags.harsh_braking)).toBe(true);
  });

  it('D4 diverts buses off the R23 corridor and the rule engine alerts on it', () => {
    const e = new SimEngine(buildWorld(20260921, START));
    for (let i = 0; i < 12; i++) e.tick();
    for (const s of SCENARIOS.D4.steps) e.inject((w, t) => s.apply(w, t));
    e.tick();

    const dev = e.world.vehicles.filter((v) => v.flags.route_deviation);
    expect(dev.length).toBeGreaterThan(0);

    // visibly off the corridor on the map: the marker sits well clear of the shape
    const v = dev[0]!;
    const r = e.world.routeById.get(v.route_id)!;
    const p = v.direction === 0 ? v.trip_progress : 1 - v.trip_progress;
    const [lon, lat] = pointAlong(r.shape, routeCum(r), p);
    expect(haversine([lon, lat], [v.longitude, v.latitude])).toBeGreaterThan(30);

    // and the warning the flag is supposed to produce
    const snap = e.snapshot();
    const m = deriveMetrics(snap, DEMO_DEFAULTS);
    const { alerts } = evaluateRules(snap, m, DEMO_DEFAULTS, [], makeHysteresis());
    expect(alerts.some((a) => a.rule_id === 'route_deviation' && a.vehicle_id === v.vehicle_id)).toBe(true);

    resetAll(e.world);
    expect(e.world.vehicles.some((x) => x.flags.route_deviation)).toBe(false);
  });

  it('resetAll pulls schedule deviation back into the normal band', () => {
    // Regression: reset left ~23 vehicles critical because deviation was never reset
    // and the engine needs ~20 sim-minutes to mean-revert 1,080 s.
    const e = new SimEngine(buildWorld(20260921, START));
    for (let i = 0; i < 12; i++) e.tick();
    e.inject((w, t) => SCENARIOS.D7.steps[0]!.apply(w, t));
    e.inject((w, t) => SCENARIOS.D7.steps[1]!.apply(w, t));
    e.tick();
    expect(Math.max(...e.world.vehicles.map((v) => v.schedule_deviation))).toBeGreaterThan(600);
    resetAll(e.world);
    expect(Math.max(...e.world.vehicles.map((v) => Math.abs(v.schedule_deviation)))).toBeLessThanOrEqual(240);
    expect(e.world.flagUntil.size).toBe(0);
  });
});

describe('isoAt', () => {
  it('wraps the clock at midnight', () => {
    expect(isoAt(0)).toBe('2026-09-21T00:00:00+08:00');
    expect(isoAt(3661)).toBe('2026-09-21T01:01:01+08:00');
  });
});

describe('simSecondsOf', () => {
  it('reads the sim clock out of the stamp, independent of the machine time zone', () => {
    // isoAt emits a fixed +08:00 offset. new Date(...).getHours() reinterprets that in
    // local time and was silently shifting every rendered timestamp.
    expect(simSecondsOf('2026-09-21T07:45:00+08:00')).toBe(7 * 3600 + 45 * 60);
    expect(simSecondsOf('2026-09-21T00:00:00+08:00')).toBe(0);
    expect(simSecondsOf('2026-09-21T23:59:59+08:00')).toBe(23 * 3600 + 59 * 60 + 59);
  });

  it('round-trips isoAt for a full day', () => {
    for (let s = 0; s < 86400; s += 997) expect(simSecondsOf(isoAt(s))).toBe(s);
  });
});

describe('vehicle motion', () => {
  /** Snapshot of the fields the motion invariants are written against. */
  const snap = (e: SimEngine) =>
    e.world.vehicles.map((v) => ({
      lon: v.longitude,
      lat: v.latitude,
      sp: v.speed,
      dir: v.direction,
      p: v.trip_progress,
      held: (v.hold_until_s ?? 0) > e.world.sim_time_s,
    }));

  it('never moves a vehicle further in one tick than its speed allows', () => {
    // ANTI-TELEPORTATION. Displacement over a tick is bounded by the faster of the two
    // end-of-tick speeds (the bus travels the mean of the two), so a direction flip, a
    // dwell release or the end of a trip can never jump the marker across the map.
    // Assertions are collected and checked once - 800 ticks x 1,100 buses is 880k
    // comparisons and an `expect` per comparison costs a minute.
    const e = new SimEngine(buildWorld(20260921, START));
    e.tick();
    let prev = snap(e);
    let flips = 0;
    let worst = '';
    let worstRatio = 0;
    let badFlip = '';
    for (let i = 0; i < 800; i++) {
      e.tick();
      const now = snap(e);
      for (let j = 0; j < now.length; j++) {
        const a = prev[j]!;
        const b = now[j]!;
        const moved = haversine([a.lon, a.lat], [b.lon, b.lat]);
        const bound = (Math.max(a.sp, b.sp) / 3.6) * TICK_DT_S * 1.05 + 1;
        if (moved / bound > worstRatio) {
          worstRatio = moved / bound;
          worst = `${e.world.vehicles[j]!.vehicle_id} moved ${moved.toFixed(1)} m, bound ${bound.toFixed(1)} m`;
        }
        if (a.dir !== b.dir) {
          flips++;
          // a terminus turnaround happens IN PLACE after a layover: the trip counter
          // restarts at 0 but the bus still stands where it finished the last trip.
          if (!badFlip && (a.p !== 1 || b.p > 0.02)) badFlip = `${e.world.vehicles[j]!.vehicle_id} ${a.p} -> ${b.p}`;
        }
      }
      prev = now;
    }
    expect(worst && worstRatio <= 1 ? '' : worst).toBe('');
    expect(badFlip).toBe('');
    expect(flips, 'no bus reached a terminus in 800 ticks').toBeGreaterThan(0);
  });

  it('accelerates and brakes inside a bus-like envelope', () => {
    // 1.1 m/s2 away from rest, 1.3 m/s2 braking, times the per-driver aggressiveness
    // (<=1.14). The tick a bus arrives at a stop is exempt: it ends at rest there.
    const e = new SimEngine(buildWorld(20260921, START));
    e.tick();
    let prev = snap(e);
    let maxA = 0;
    let maxB = 0;
    for (let i = 0; i < 200; i++) {
      e.tick();
      const now = snap(e);
      for (let j = 0; j < now.length; j++) {
        if (e.world.vehicles[j]!.status !== 'in_service') continue;
        const dv = (now[j]!.sp - prev[j]!.sp) / 3.6;
        if (dv > maxA) maxA = dv;
        if (now[j]!.sp > 0 && -dv > maxB) maxB = -dv;
      }
      prev = now;
    }
    expect(maxA).toBeGreaterThan(0.5); // buses really do pull away
    expect(maxA).toBeLessThanOrEqual(1.1 * 1.14 * TICK_DT_S + 1e-6);
    expect(maxB).toBeLessThanOrEqual(1.3 * TICK_DT_S + 1e-6);
  });

  it('dwells at stops and stands still while it does', () => {
    const e = new SimEngine(buildWorld(20260921, START));
    for (let i = 0; i < 60; i++) e.tick();
    const holding = e.world.vehicles.filter(
      (v) => v.status === 'in_service' && (v.hold_until_s ?? 0) > e.world.sim_time_s,
    );
    expect(holding.length, 'no bus was ever at a stop').toBeGreaterThan(0);
    const before = holding.map((v) => [v.longitude, v.latitude, v.speed] as const);
    e.tick();
    holding.forEach((v, i) => {
      const [lon, lat, sp] = before[i]!;
      expect(sp).toBe(0);
      if ((v.hold_until_s ?? 0) > e.world.sim_time_s) {
        expect(v.longitude).toBe(lon);
        expect(v.latitude).toBe(lat);
        expect(v.speed).toBe(0);
      }
    });
  });

  it('desynchronises buses that share a corridor', () => {
    // Per-vehicle character (driver aggressiveness, dwell tendency) is seeded from the
    // vehicle id, so two buses on one route must not move as a cohort.
    const e = new SimEngine(buildWorld(20260921, START));
    for (let i = 0; i < 300; i++) e.tick();
    const on = e.world.vehicles.filter((v) => v.route_id === 'R12' && v.status === 'in_service');
    expect(on.length).toBeGreaterThan(2);
    const km = on.map((v) => v.km_today);
    const spread = (Math.max(...km) - Math.min(...km)) / Math.max(...km);
    expect(spread).toBeGreaterThan(0.05);
    expect(new Set(on.map((v) => v.speed.toFixed(3))).size).toBeGreaterThan(1);
  });

  it('produces an ETA that counts down toward the next stop', () => {
    const e = new SimEngine(buildWorld(20260921, START));
    for (let i = 0; i < 20; i++) e.tick();
    const v = e.world.vehicles.find(
      (x) => x.status === 'in_service' && x.speed > 5 && x.distance_to_next_stop_m > 400,
    )!;
    expect(v).toBeTruthy();
    const stop = v.next_stop_id;
    const etas = [v.eta_next_stop_s!];
    for (let i = 0; i < 4 && v.next_stop_id === stop; i++) {
      e.tick();
      if (v.next_stop_id === stop) etas.push(v.eta_next_stop_s!);
    }
    expect(etas.length).toBeGreaterThan(2);
    expect(etas[0]).toBeGreaterThan(0);
    // It counts down and moves smoothly. Not strictly monotonic on purpose: entering a
    // slower corridor or braking genuinely pushes an arrival time out, as a real ETA
    // does - what it must not do is jump.
    expect(etas[etas.length - 1]!).toBeLessThan(etas[0]!);
    for (let i = 1; i < etas.length; i++) {
      expect(Math.abs(etas[i]! - etas[i - 1]!)).toBeLessThan(0.3 * etas[i - 1]!);
    }
  });

  it('does not let a follower drive through the bus ahead', () => {
    const e = new SimEngine(buildWorld(20260921, START));
    e.tick();
    const r = e.world.routeById.get('R7')!;
    const on = e.world.vehicles.filter((v) => v.route_id === 'R7' && v.status === 'in_service');
    const [lead, follow] = [on[0]!, on[1]!];
    lead.direction = follow.direction = 0;
    lead.trip_progress = 0.5;
    follow.trip_progress = 0.5 - 15 / r.length_m; // 15 m behind, closed right up
    for (let i = 0; i < 60; i++) {
      e.tick();
      // the follower queues behind; it never ends a tick in front of its leader
      expect(follow.trip_progress).toBeLessThanOrEqual(lead.trip_progress);
    }
  });

  it('lets congestion, accident and breakdown change how a bus moves', () => {
    const e = new SimEngine(buildWorld(20260921, START));
    for (let i = 0; i < 40; i++) e.tick();
    const mean = (rid: string) => {
      const on = e.world.vehicles.filter((v) => v.route_id === rid && v.status === 'in_service');
      return on.reduce((s, v) => s + v.speed, 0) / on.length;
    };
    const before = mean('R7');
    e.inject((w, t) => w.congestion.set('R7', { factor: 0.25, until_s: t + 1800 }));
    for (let i = 0; i < 20; i++) e.tick();
    expect(mean('R7')).toBeLessThan(before);

    // a broken-down bus does not move at all
    const bd = e.world.vehicleById.get('3-015')!;
    e.inject((w) => {
      w.vehicleById.get('3-015')!.status = 'breakdown';
    });
    e.tick();
    const at = [bd.longitude, bd.latitude] as [number, number];
    for (let i = 0; i < 20; i++) e.tick();
    expect(bd.speed).toBe(0);
    expect(haversine(at, [bd.longitude, bd.latitude])).toBe(0);

    // a panic activation pulls the bus over and keeps it there
    const pan = e.world.vehicleById.get('3-305')!;
    e.inject((w) => SCENARIOS.D5.steps[0]!.apply(w, w.sim_time_s));
    for (let i = 0; i < 10; i++) e.tick();
    expect(pan.flags.panic).toBe(true);
    expect(pan.speed).toBe(0);

    // an accident crawls
    const acc = e.world.vehicles.find((v) => v.route_id === 'R23' && v.status === 'in_service')!;
    for (let i = 0; i < 10; i++) e.tick();
    e.inject((w) => {
      w.vehicleById.get(acc.vehicle_id)!.flags.accident = true;
    });
    for (let i = 0; i < 20; i++) e.tick();
    expect(acc.speed).toBeLessThan(4);
  });
});
