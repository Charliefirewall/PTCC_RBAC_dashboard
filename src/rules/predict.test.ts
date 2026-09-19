import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  COMPONENT_IDS,
  CONFIDENCE_CEILING,
  ZONE_ORDER,
  _resetPredictCache,
  fleetForecast,
  predictFleet,
  predictVehicle,
  seedOf,
  zoneOf,
} from './predict';
import { DEMO_DEFAULTS } from './thresholds';
import type { Route, Vehicle } from '../sim/types';

const th = { ...DEMO_DEFAULTS };

function route(id: string, kind: Route['kind'] = 'city', demand_weight = 1): Route {
  return {
    route_id: id, name_en: id, name_mn: id, operator_id: 'A', kind, active: true,
    shape: [[106.9, 47.91], [107.0, 47.91]], length_m: 10_000, stops: [], demand_weight,
    planned_headway_s: { amPeak: 600, offPeak: 600, pmPeak: 600, evening: 900 },
  };
}

function vehicle(id: string, over: Partial<Vehicle> = {}): Vehicle {
  return {
    vehicle_id: id, route_id: 'R1', operator_id: 'A', timestamp: '2026-09-21T08:00:00+08:00',
    latitude: 47.91, longitude: 106.95, speed: 20, heading: 90, trip_progress: 0.4,
    direction: 0, schedule_deviation: 0, pax_count: 40, capacity: 80, status: 'in_service',
    door_status: 'normal', driver_status: 'normal', driver_id: 'D-0001', next_stop_id: null,
    distance_to_next_stop_m: 0, equipment: { afc: 'ok', cctv: 'ok', tbox: 'ok' }, flags: {},
    left_behind: 0, boardings_today: 900, km_today: 150, ...over,
  };
}

const R = route('R1');
const fleet = Array.from({ length: 40 }, (_, i) =>
  vehicle(`UB-${1000 + i}`, {
    pax_count: (i * 7) % 81,
    km_today: 40 + ((i * 13) % 200),
    boardings_today: 200 + i * 37,
    equipment: i % 9 === 0 ? { afc: 'offline', cctv: 'ok', tbox: 'offline' } : { afc: 'ok', cctv: 'ok', tbox: 'ok' },
  }),
);
const routeById = new Map([['R1', R]]);

describe('component RUL model', () => {
  it('is deterministic: same vehicle, same numbers, across calls and across a cold cache', () => {
    const a = predictVehicle(vehicle('UB-4242'), R, th);
    const b = predictVehicle(vehicle('UB-4242'), R, th);
    _resetPredictCache();
    const c = predictVehicle(vehicle('UB-4242'), R, th);
    expect(b).toEqual(a);
    expect(c).toEqual(a);
    // ...and two different buses genuinely differ, or the seed is doing nothing.
    expect(predictVehicle(vehicle('UB-4243'), R, th).components[0]!.rulDays).not.toBe(
      a.components[0]!.rulDays,
    );
  });

  it('uses the same FNV-1a seed helper the cost model uses', () => {
    expect(seedOf('UB-1001')).toBe(seedOf('UB-1001'));
    expect(seedOf('UB-1001')).not.toBe(seedOf('UB-1002'));
  });

  it('contains no Math.random - the whole demo is reproducible (plan §14.3)', () => {
    // Comments stripped first: the module header *talks about* Math.random on purpose.
    const src = readFileSync(new URL('./predict.ts', import.meta.url), 'utf8').replace(
      /\/\*[\s\S]*?\*\/|\/\/.*/g,
      '',
    );
    expect(src).not.toMatch(/Math\s*\.\s*random/);
  });

  it('predicts all eight components for every vehicle', () => {
    for (const v of fleet) {
      const p = predictVehicle(v, R, th);
      expect(p.components.map((c) => c.component)).toEqual([...COMPONENT_IDS]);
    }
  });

  it('always returns an interval, never a bare point estimate', () => {
    for (const v of fleet) {
      for (const c of predictVehicle(v, R, th).components) {
        expect(c.rulLo).toBeLessThanOrEqual(c.rulDays);
        expect(c.rulDays).toBeLessThanOrEqual(c.rulHi);
        expect(c.rulLo).toBeGreaterThanOrEqual(0);
        // A range that is not a range would be a point estimate wearing a label.
        expect(c.rulHi).toBeGreaterThan(c.rulLo);
        expect(Number.isFinite(c.rulKm)).toBe(true);
      }
    }
  });

  it('never claims more confidence than the no-service-history ceiling allows', () => {
    for (const v of fleet) {
      for (const c of predictVehicle(v, R, th).components) {
        expect(c.confidence).toBeGreaterThan(0);
        expect(c.confidence).toBeLessThanOrEqual(CONFIDENCE_CEILING);
      }
    }
  });

  it('grades every produced figure INFERRED or ASSUMPTION, never CONFIRMED', () => {
    for (const v of fleet) {
      for (const c of predictVehicle(v, R, th).components) {
        expect(c.evidence).toBe('INFERRED');
        expect(c.factors.length).toBeGreaterThanOrEqual(2);
        expect(c.factors.length).toBeLessThanOrEqual(4);
        for (const f of c.factors) expect(['INFERRED', 'ASSUMPTION']).toContain(f.evidence);
        // The one term with no source at all is always on the list.
        expect(c.factors.some((f) => f.labelKey === 'pred.sig.phase')).toBe(true);
      }
    }
  });

  it('books the service window before the earliest plausible failure', () => {
    for (const v of fleet) {
      for (const c of predictVehicle(v, R, th).components) {
        expect(c.window.fromDays).toBeLessThanOrEqual(c.window.toDays);
        expect(c.window.toDays).toBeLessThanOrEqual(Math.ceil(c.rulLo));
      }
    }
  });
});

describe('zones', () => {
  it('maps the boundaries inclusively, in our operational-state language', () => {
    expect(zoneOf(0, th)).toBe('critical');
    expect(zoneOf(th.pred_zone_critical_days, th)).toBe('critical');
    expect(zoneOf(th.pred_zone_critical_days + 0.001, th)).toBe('high');
    expect(zoneOf(th.pred_zone_high_days, th)).toBe('high');
    expect(zoneOf(th.pred_zone_high_days + 0.001, th)).toBe('elevated');
    expect(zoneOf(th.pred_zone_elevated_days, th)).toBe('elevated');
    expect(zoneOf(th.pred_zone_elevated_days + 0.001, th)).toBe('low');
    expect(zoneOf(Number.POSITIVE_INFINITY, th)).toBe('low');
  });

  it('gives a vehicle the worst zone of its eight components', () => {
    for (const v of fleet) {
      const p = predictVehicle(v, R, th);
      const worst = Math.min(...p.components.map((c) => ZONE_ORDER.indexOf(c.zone)));
      expect(ZONE_ORDER.indexOf(p.zone)).toBe(worst);
      expect(p.dueDays).toBe(Math.min(...p.components.map((c) => c.rulDays)));
    }
  });
});

describe('worklist ordering (backlog 49)', () => {
  it('ranks by zone, then due date, then passenger exposure', () => {
    const list = predictFleet(fleet, routeById, th);
    expect(list).toHaveLength(fleet.length);
    for (let i = 1; i < list.length; i++) {
      const a = list[i - 1]!;
      const b = list[i]!;
      const za = ZONE_ORDER.indexOf(a.zone);
      const zb = ZONE_ORDER.indexOf(b.zone);
      expect(za).toBeLessThanOrEqual(zb);
      if (za === zb) {
        if (a.dueDays === b.dueDays) expect(a.exposure).toBeGreaterThanOrEqual(b.exposure);
        else expect(a.dueDays).toBeLessThan(b.dueDays);
      }
    }
  });
});

describe('fleet forecast (the Workstream Q input)', () => {
  const f = fleetForecast(fleet, routeById, th, 90);

  it('counts every vehicle exactly once across the four zones', () => {
    expect(f.vehicles).toBe(fleet.length);
    expect(Object.values(f.zones).reduce((a, b) => a + b, 0)).toBe(fleet.length);
  });

  it('carries the interval through to the aggregate instead of collapsing it', () => {
    expect(f.perComponent).toHaveLength(COMPONENT_IDS.length);
    for (const c of f.perComponent) {
      expect(c.dueLo).toBeLessThanOrEqual(c.due);
      expect(c.due).toBeLessThanOrEqual(c.dueHi);
      expect(c.dueHi).toBeLessThanOrEqual(fleet.length);
      expect(c.annualised).toBe(Math.round((c.due * 365) / 90));
      expect(c.meanConfidence).toBeLessThanOrEqual(CONFIDENCE_CEILING);
    }
    expect(f.evidence).toBe('INFERRED');
  });

  it('is deterministic for a fixed fleet', () => {
    expect(fleetForecast(fleet, routeById, th, 90)).toEqual(f);
  });

  it('shortens lives when the duty sensitivity is raised', () => {
    const flat = fleetForecast(fleet, routeById, { ...th, pred_duty_sensitivity: 0 }, 90);
    const hard = fleetForecast(fleet, routeById, { ...th, pred_duty_sensitivity: 2 }, 90);
    const sum = (x: typeof flat) => x.perComponent.reduce((a, c) => a + c.due, 0);
    expect(sum(hard)).toBeGreaterThan(sum(flat));
  });
});
