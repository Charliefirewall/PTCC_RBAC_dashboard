import { describe, expect, it } from 'vitest';
import { buildWorld } from '../../data/build';
import { BUCKETS, baselineOf } from '../../sim/baseline';
import { Ring } from '../../sim/ring';
import { buildPreTripRouteForecast } from './routeForecast';

const makeWorld = () => buildWorld(42, 8 * 3600);

describe('buildPreTripRouteForecast', () => {
  it('returns a complete, internally consistent first-to-last-stop forecast', () => {
    const w = makeWorld();
    const result = buildPreTripRouteForecast(w, { routeId: 'R7', direction: 0, dow: 2, startBucket: 12 });
    const route = w.routeById.get('R7')!;

    expect(result.stops).toHaveLength(route.stops.length);
    expect(result.stops[0]!.stopId).toBe(route.stops[0]!.stop_id);
    expect(result.stops.at(-1)!.stopId).toBe(route.stops.at(-1)!.stop_id);
    expect(result.stops.every((s) => s.normArrivalS === s.scheduledArrivalS + s.normDeviationS)).toBe(true);
    expect(result.stops.every((s) => s.forecastArrivalS === s.scheduledArrivalS + s.forecastDeviationS)).toBe(true);
    expect(result.stops.every((s) => s.cumulativeForecastDeviationS === s.forecastDeviationS)).toBe(true);
    expect(result.normDurationS).toBe(result.stops.at(-1)!.normArrivalS - result.stops[0]!.normArrivalS);
    expect(result.forecastDurationS).toBe(result.stops.at(-1)!.forecastArrivalS - result.stops[0]!.forecastArrivalS);
    expect(result.evidence.baselineWeeks).toBe(8);
    expect(result.confidence).toBeLessThanOrEqual(result.evidence.confidenceCeiling);
  });

  it('is an independent forecast distinct from the norm when current route conditions differ', () => {
    const w = makeWorld();
    for (const v of w.vehicles) if (v.route_id === 'R7' && v.direction === 0 && v.status === 'in_service') v.schedule_deviation = 12 * 60;
    const result = buildPreTripRouteForecast(w, { routeId: 'R7', direction: 0, dow: 0, startBucket: 8 });

    expect(result.evidence.routeVehicleCount).toBeGreaterThan(0);
    expect(result.stops.some((s) => Math.abs(s.forecastDeviationS - s.normDeviationS) > 1)).toBe(true);
    expect(result.stops[0]!.forecastArrivalS).toBeGreaterThan(result.stops[0]!.normArrivalS);
    expect(result.stops.some((s) => s.state === 'significant')).toBe(true);
    expect(result.stops.slice(1).some((s) => s.state === 'recovery')).toBe(true);
  });

  it('uses the selected day and start time in the full-trip profile', () => {
    const w = makeWorld();
    const mondayMorning = buildPreTripRouteForecast(w, { routeId: 'R7', direction: 0, dow: 0, startBucket: 8 });
    const sundayEvening = buildPreTripRouteForecast(w, { routeId: 'R7', direction: 0, dow: 6, startBucket: 52 });

    expect(mondayMorning.startTimeS).not.toBe(sundayEvening.startTimeS);
    expect(mondayMorning.stops.map((s) => s.normDeviationS)).not.toEqual(sundayEvening.stops.map((s) => s.normDeviationS));
    expect(mondayMorning.stops.map((s) => s.forecastDeviationS)).not.toEqual(sundayEvening.stops.map((s) => s.forecastDeviationS));
  });

  it('incorporates recent segment evidence with shrinkage and reports coverage', () => {
    const w = makeWorld();
    const route = w.routeById.get('R7')!;
    const key = baselineOf(w).hops(route, 0).find((h) => h.seg_key)?.seg_key!;
    const values = new Ring(20);
    const times = new Ring(20);
    for (let i = 0; i < 8; i++) {
      values.push(80);
      times.push(w.sim_time_s - i * 10);
    }
    w.segObs.set(key, { v: values, t: times });

    const result = buildPreTripRouteForecast(w, { routeId: 'R7', direction: 0, dow: 4, startBucket: 48 });
    expect(result.evidence.liveSegmentSampleCount).toBe(8);
    expect(result.evidence.liveSegmentCoverage).toBeGreaterThan(0);
    expect(result.evidence.liveSegmentCoverage).toBeLessThanOrEqual(1);
  });

  it('is deterministic, does not mutate the world, and supports reverse direction', () => {
    const w = makeWorld();
    const before = JSON.stringify(w.vehicles.filter((v) => v.route_id === 'R12'));
    const selection = { routeId: 'R12', direction: 1 as const, dow: 6, startBucket: BUCKETS - 1 };
    const a = buildPreTripRouteForecast(w, selection);
    const b = buildPreTripRouteForecast(w, selection);
    const route = w.routeById.get('R12')!;

    expect(a).toEqual(b);
    expect(a.stops[0]!.stopId).toBe(route.stops.at(-1)!.stop_id);
    expect(a.stops.at(-1)!.stopId).toBe(route.stops[0]!.stop_id);
    expect(JSON.stringify(w.vehicles.filter((v) => v.route_id === 'R12'))).toBe(before);
  });

  it('rejects invalid route/day/bucket selections', () => {
    const w = makeWorld();
    expect(() => buildPreTripRouteForecast(w, { routeId: 'missing', direction: 0, dow: 0, startBucket: 0 })).toThrow('Unknown route');
    expect(() => buildPreTripRouteForecast(w, { routeId: 'R7', direction: 0, dow: 7, startBucket: 0 })).toThrow('dow');
    expect(() => buildPreTripRouteForecast(w, { routeId: 'R7', direction: 0, dow: 0, startBucket: BUCKETS })).toThrow('startBucket');
  });
});
