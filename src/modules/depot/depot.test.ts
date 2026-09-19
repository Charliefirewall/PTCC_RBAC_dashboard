/**
 * Depot assignment and the consumables forecast.
 *
 * Determinism is the property under test. The demo is presented live; a bus that moves
 * depot between two clicks, or a shortfall that appears only on some renders, would be
 * caught by the client and not by us.
 *
 * Node environment: this file imports only pure modules - no React, no store.
 */

import { describe, expect, it } from 'vitest';
import { DEPOTS, DEPOT_BY_ID, depotIdOf } from '../../data/depots';
import { NODE_BY_ID } from '../../data/corridors';
import { CONSUMABLES, notionalStock, planDepots } from './model';
import { DEMO_DEFAULTS } from '../../rules/thresholds';
import type { OperatorId, Route, Vehicle } from '../../sim/types';

const OPERATORS: OperatorId[] = ['A', 'B', 'C'];

function fakeVehicle(i: number): Vehicle {
  const operator_id = OPERATORS[i % 3]!;
  return {
    vehicle_id: `bus-${i}`,
    route_id: `R${i % 20}`,
    operator_id,
    timestamp: '2026-09-18T07:40:00Z',
    latitude: 47.9,
    longitude: 106.9,
    speed: 20,
    heading: 0,
    trip_progress: 0.5,
    direction: 0,
    schedule_deviation: 0,
    pax_count: 20,
    capacity: 80,
    status: 'in_service',
    door_status: 'normal',
    driver_status: 'normal',
    driver_id: `drv-${i}`,
    next_stop_id: null,
    distance_to_next_stop_m: 100,
    km_today: 140,
    // Every ninth bus has a device down, so the live-signal branch is exercised.
    equipment: { afc: i % 9 === 0 ? 'offline' : 'ok', cctv: 'ok', tbox: 'ok' },
    flags: {},
    left_behind: 0,
    boardings_today: 0,
  } as Vehicle;
}

const VEHICLES = Array.from({ length: 120 }, (_, i) => fakeVehicle(i));
/* No routes: predictVehicle falls back to the network-mean centrality, which is the
   documented behaviour for a vehicle whose route is not in the snapshot. */
const ROUTES = new Map<string, Route>();

describe('depot entity', () => {
  it('sits every depot on a real corridor node', () => {
    for (const d of DEPOTS) expect(NODE_BY_ID.has(d.node_id)).toBe(true);
  });

  it('assigns a bus to the same depot every time it is asked', () => {
    for (const v of VEHICLES) {
      const first = depotIdOf(v.vehicle_id, v.operator_id);
      for (let n = 0; n < 5; n++) expect(depotIdOf(v.vehicle_id, v.operator_id)).toBe(first);
    }
  });

  it("assigns a bus only to its own operator's depot", () => {
    for (const v of VEHICLES) {
      expect(DEPOT_BY_ID.get(depotIdOf(v.vehicle_id, v.operator_id))!.operator_id).toBe(v.operator_id);
    }
  });

  it('spreads the fleet over more than one depot', () => {
    const used = new Set(VEHICLES.map((v) => depotIdOf(v.vehicle_id, v.operator_id)));
    expect(used.size).toBe(DEPOTS.length);
  });
});

describe('depot plan', () => {
  const plan = planDepots(VEHICLES, ROUTES, DEMO_DEFAULTS);

  it('is stable across runs', () => {
    expect(JSON.stringify(planDepots(VEHICLES, ROUTES, DEMO_DEFAULTS))).toBe(JSON.stringify(plan));
  });

  it('accounts for every bus exactly once', () => {
    expect(plan.reduce((a, p) => a + p.buses.length, 0)).toBe(VEHICLES.length);
  });

  it('projects the full horizon and never divides by a zero capacity', () => {
    for (const p of plan) {
      expect(p.weeks).toHaveLength(DEMO_DEFAULTS.depot_horizon_weeks);
      for (const w of p.weeks) expect(Number.isFinite(w.util_pct)).toBe(true);
    }
  });

  it('nets consumable demand against opening stock', () => {
    for (const p of plan) {
      for (const line of p.consumables) {
        expect(line.opening_stock).toBe(notionalStock(p.depot_id, line.consumable, p.buses.length));
        const used = line.weeks.reduce((a, w) => a + w.units, 0);
        expect(line.weeks.at(-1)!.balance).toBe(line.opening_stock - used);
        if (line.shortfall_week !== null) {
          expect(line.weeks[line.shortfall_week - 1]!.balance).toBeLessThan(0);
        }
      }
    }
  });

  it('forecasts all four consumables the client named', () => {
    for (const p of plan) expect(p.consumables.map((c) => c.consumable)).toEqual([...CONSUMABLES]);
  });
});

/*
 * Degenerate fleets. The depot page is presented live against whatever the simulation
 * happens to be holding, which includes the moment before the first tick and any depot
 * nobody's buses were seeded into. Neither may put "NaN" or "Infinity" on screen.
 */
describe('depot plan, degenerate data', () => {
  it('plans every depot for an empty fleet without dividing by it', () => {
    const plan = planDepots([], ROUTES, DEMO_DEFAULTS);
    expect(plan).toHaveLength(DEPOTS.length);
    for (const p of plan) {
      expect(p.buses).toHaveLength(0);
      expect(p.weeks).toHaveLength(DEMO_DEFAULTS.depot_horizon_weeks);
      for (const w of p.weeks) {
        expect(Number.isFinite(w.util_pct)).toBe(true);
        expect(Number.isFinite(w.total_h)).toBe(true);
        expect(w.state).toBe('ok');
      }
      expect(Number.isFinite(p.peak_util_pct)).toBe(true);
      expect(p.first_shortfall_week).toBeNull();
      for (const c of p.consumables) {
        expect(c.opening_stock).toBe(0);
        expect(c.shortfall_week).toBeNull();
        // Documented sentinel: nothing consumes the part, so the stock/rate quotient does
        // not exist. Depot.tsx must render this as words, never as "Infinity" or "∞".
        expect(c.cover_weeks).toBe(Infinity);
      }
    }
  });

  it('plans a single-bus fleet', () => {
    const plan = planDepots([VEHICLES[0]!], ROUTES, DEMO_DEFAULTS);
    expect(plan.reduce((a, p) => a + p.buses.length, 0)).toBe(1);
    for (const p of plan) for (const w of p.weeks) expect(Number.isFinite(w.util_pct)).toBe(true);
  });

  it('survives a horizon that is not a usable number', () => {
    for (const bad of [Number.NaN, 0, -5]) {
      const plan = planDepots(VEHICLES, ROUTES, { ...DEMO_DEFAULTS, depot_horizon_weeks: bad });
      // At least one week, or the heatmap renders `repeat(0, ...)` and collapses.
      for (const p of plan) expect(p.weeks.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('holds no notional stock for a degenerate bus count', () => {
    expect(notionalStock('d-nowhere', 'brakes', 0)).toBe(0);
    expect(notionalStock('d-nowhere', 'brakes', Number.NaN)).toBe(0);
    expect(notionalStock('d-nowhere', 'brakes', -4)).toBe(0);
  });

  /* The zero-capacity branch in model.ts (a depot with work and no workshop is `over`,
     not a comfortable 0 %) is not reachable from here: DEPOTS is a constant and every
     capacity in it is positive. What IS asserted is that no threshold setting can make
     the utilisation stop being a number. */
  it('keeps utilisation a real number across the whole threshold range', () => {
    for (const hours of [0, 1, 40, 1e6]) {
      const plan = planDepots(VEHICLES, ROUTES, { ...DEMO_DEFAULTS, depot_routine_hours_per_bus_week: hours });
      for (const p of plan) for (const w of p.weeks) expect(Number.isFinite(w.util_pct)).toBe(true);
    }
  });
});
