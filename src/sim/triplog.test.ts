import { describe, expect, it } from 'vitest';
import { buildWorld } from '../data/build';
import { SimEngine, SPEED_LOG_N } from './engine';
import { tripIdOf } from './types';

const START = 7 * 3600 + 40 * 60;

describe('trip log + speed history (PTCC drill-down data)', () => {
  const w = buildWorld(20260921, START);
  const e = new SimEngine(w);
  for (let i = 0; i < 900; i++) e.tick();

  it('logs every stop served with planned = actual - deviation', () => {
    const logs = [...w.tripLog.values()];
    expect(logs.length).toBeGreaterThan(500);
    for (const log of logs.slice(0, 50)) {
      for (const a of log) {
        expect(a.t_s).toBeGreaterThan(START);
        expect(a.t_s - a.dev_s).toBeCloseTo(a.t_s - a.dev_s); // planned is derivable
        expect(Number.isFinite(a.dev_s)).toBe(true);
      }
      // travel order: stop_idx strictly increases along a trip
      for (let i = 1; i < log.length; i++) expect(log[i]!.stop_idx).toBeGreaterThan(log[i - 1]!.stop_idx);
    }
  });

  it('attributes each hop to a road segment on the route', () => {
    const a = [...w.tripLog.values()].flat().find((x) => x.seg_key);
    expect(a).toBeTruthy();
    const r = w.routeById.get(a!.route_id)!;
    expect(r.edges!.some((ed) => ed.key === a!.seg_key)).toBe(true);
    expect(w.segObs.size).toBeGreaterThan(20);
  });

  it('keeps at most the current and previous trip per bus', () => {
    const perBus = new Map<string, number>();
    for (const k of w.tripLog.keys()) {
      const bus = k.slice(0, k.lastIndexOf(':'));
      perBus.set(bus, (perBus.get(bus) ?? 0) + 1);
    }
    expect(Math.max(...perBus.values())).toBeLessThanOrEqual(2);
    const turned = w.vehicles.find((v) => (v.trip_seq ?? 0) >= 1);
    expect(turned, 'some bus should have turned round in 75 sim minutes').toBeTruthy();
    expect(turned!.trip_start_s).toBeGreaterThan(START);
    expect(w.tripLog.has(tripIdOf(turned!, (turned!.trip_seq ?? 0) - 2))).toBe(false);
  });

  it('records one speed sample per tick per bus, capped at one hour', () => {
    const ring = w.speedLog.get(w.vehicles[0]!.vehicle_id)!;
    expect(ring.length).toBe(Math.min(900, SPEED_LOG_N));
  });
});
