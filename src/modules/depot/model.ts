/**
 * Depot load and consumables forecast — the maths behind #/depot.
 *
 * ORIENTATION (plan §9.1(a)). PTPD is an oversight body: *"they are not the operators…
 * they manage the KPI"*. So this file computes ONE thing — is a depot heading over
 * capacity, and will a consumable run short. It does not assign a bay, book a slot,
 * roster a technician or raise a purchase order; those are §9.2 class D and belong to
 * the operators. There is no "schedule" function in this file and there must not be one.
 *
 * EVIDENCE. The business intent is CONFIRMED — the client named the consumables himself:
 * *"maintenance type A, type B, brakes, tyres, clutches"*. Everything numeric is not:
 *
 *   - interval km per consumable      → ASSUMPTION, thresholds.ts (no source)
 *   - workshop hours per intervention → ASSUMPTION, thresholds.ts (no source)
 *   - routine hours per bus per week  → ASSUMPTION, thresholds.ts (no source)
 *   - depot workshop capacity         → ASSUMPTION, data/depots.ts (no source)
 *   - stock on hand                   → ASSUMPTION, seeded below (PTPD holds no stock
 *                                       data; the operators do, and we have no feed)
 *
 * WHERE THE DEMAND COMES FROM. `rules/predict.ts` — Workstream P's component RUL model.
 * It landed while this was being built and it is the right input, so this file computes
 * no wear of its own: it reads `predictVehicle()`'s eight per-component remaining lives,
 * turns each into the week it falls due, and buckets those by depot. One wear model in
 * the build, not two silently disagreeing ones.
 *
 * That also means the interval RANGE survives: a due week is derived from `rulLo`/`rulHi`
 * as well as the median, so the page can say "week 4 at the earliest" rather than
 * printing a single confident week for a figure nobody has data for.
 */

import { mulberry32 } from '../../sim/rng';
import type { Route, Vehicle } from '../../sim/types';
import type { Thresholds } from '../../rules/thresholds';
import { type ComponentId, predictVehicle } from '../../rules/predict';
import { DEPOTS, depotIdOf, seedOfId } from '../../data/depots';

/**
 * The four consumable parts the client named. They are a SUBSET of predict.ts's eight
 * components: doors, HVAC, driveline and devices also consume workshop hours, but they
 * are not stocked consumables, so they load the depot without appearing in the parts
 * forecast. ("maintenance type A / type B" are labour packages, carried as routine hours.)
 */
export const CONSUMABLES = ['brakes', 'tyres', 'clutch', 'battery'] as const;
export type Consumable = (typeof CONSUMABLES)[number];

const IS_CONSUMABLE = new Set<string>(CONSUMABLES);

/** One predicted intervention: which bus, which week, which component, how certain. */
export interface Intervention {
  vehicle_id: string;
  depot_id: string;
  component: ComponentId;
  /** Week the MEDIAN remaining life expires. */
  week: number;
  /** Earliest plausible week (from `rulLo`) — the week PTPD should be ready by. */
  week_lo: number;
  consumable: Consumable | null;
  /** predict.ts confidence, 0-1, capped at 0.6 while no maintenance history exists. */
  confidence: number;
}

export interface DepotWeek {
  depot_id: string;
  week: number;
  routine_h: number;
  intervention_h: number;
  total_h: number;
  capacity_h: number;
  util_pct: number;
  interventions: number;
  state: 'ok' | 'warn' | 'over';
}

export interface ConsumableWeek {
  week: number;
  units: number;
  /** Stock remaining after this week. Negative = the shortfall PTPD needs to see. */
  balance: number;
}

export interface ConsumableLine {
  consumable: Consumable;
  opening_stock: number;
  weeks: ConsumableWeek[];
  /** First week the balance goes negative, or null. */
  shortfall_week: number | null;
  /** Weeks of cover at the mean forecast rate; Infinity when nothing is due. */
  cover_weeks: number;
}

export interface DepotPlan {
  depot_id: string;
  buses: string[];
  weeks: DepotWeek[];
  interventions: Intervention[];
  consumables: ConsumableLine[];
  peak_util_pct: number;
  over_weeks: number;
  first_shortfall_week: number | null;
}

/**
 * Notional stock on hand. ASSUMPTION, and the loudest one on the page: PTPD does not
 * hold operator stock levels, so this is a seeded placeholder scaled to depot size. It
 * exists so a shortfall can be *shown*; it is not a claim about any real store room.
 */
export function notionalStock(depot_id: string, c: Consumable, bus_count: number): number {
  const r = mulberry32(seedOfId(`${depot_id}|${c}|stock`));
  // A depot with no buses holds no notional stock — and never a NaN one.
  const n = Number.isFinite(bus_count) ? Math.max(0, bus_count) : 0;
  return Math.round(n * r.range(0.04, 0.22));
}

/**
 * Depot-by-week load and parts cover for the whole fleet.
 *
 * Pure: no React, no store, so it runs under the node test environment. `routeById` is
 * passed in because predict.ts uses the route to read corridor duty.
 */
export function planDepots(vehicles: readonly Vehicle[], routeById: ReadonlyMap<string, Route>, th: Thresholds): DepotPlan[] {
  // `|| 1` catches a NaN horizon: Math.max(1, NaN) is NaN, which would silently produce
  // a plan with zero weeks and a heatmap with zero columns.
  const horizon = Math.max(1, Math.round(th.depot_horizon_weeks) || 1);
  const byDepot = new Map<string, Vehicle[]>();
  for (const d of DEPOTS) byDepot.set(d.id, []);
  for (const v of vehicles) byDepot.get(depotIdOf(v.vehicle_id, v.operator_id))?.push(v);

  return DEPOTS.map((depot) => {
    const buses = byDepot.get(depot.id) ?? [];
    const interventions: Intervention[] = [];

    for (const v of buses) {
      for (const c of predictVehicle(v, routeById.get(v.route_id), th).components) {
        // Week 1 is "this week": a part already past its median life is work in hand,
        // not work in the past, so the week floor is 1 rather than 0 or negative.
        const week = Math.max(1, Math.ceil(c.rulDays / 7));
        if (week > horizon) continue;
        interventions.push({
          vehicle_id: v.vehicle_id,
          depot_id: depot.id,
          component: c.component,
          week,
          week_lo: Math.max(1, Math.ceil(c.rulLo / 7)),
          consumable: IS_CONSUMABLE.has(c.component) ? (c.component as Consumable) : null,
          confidence: c.confidence,
        });
      }
    }

    // Bucket once: the per-week and per-consumable counts below are read 5 x horizon
    // times each, and a filter per read is a scan of every intervention at the depot.
    const perWeek = new Map<number, Intervention[]>();
    for (const i of interventions) (perWeek.get(i.week) ?? perWeek.set(i.week, []).get(i.week)!).push(i);

    const weeks: DepotWeek[] = [];
    for (let w = 1; w <= horizon; w++) {
      const n = perWeek.get(w)?.length ?? 0;
      const routine_h = buses.length * th.depot_routine_hours_per_bus_week;
      const intervention_h = n * th.depot_hours_per_intervention;
      const total_h = routine_h + intervention_h;
      const capacity_h = Number.isFinite(depot.workshop_hours_per_week) ? Math.max(0, depot.workshop_hours_per_week) : 0;
      // Zero capacity has no percentage — x/0 is Infinity and Infinity must never reach
      // a screen. It is reported as 0 % and classified `over` below, because a depot
      // that has work and no workshop is over capacity, not comfortably idle.
      const util_pct = capacity_h > 0 ? (total_h / capacity_h) * 100 : 0;
      const noCapacity = capacity_h <= 0 && total_h > 0;
      weeks.push({
        depot_id: depot.id,
        week: w,
        routine_h,
        intervention_h,
        total_h,
        capacity_h,
        util_pct,
        interventions: n,
        state:
          noCapacity || util_pct >= th.depot_capacity_over_pct ? 'over'
          : util_pct >= th.depot_capacity_warn_pct ? 'warn'
          : 'ok',
      });
    }

    const consumables: ConsumableLine[] = CONSUMABLES.map((c) => {
      const opening_stock = notionalStock(depot.id, c, buses.length);
      let balance = opening_stock;
      let shortfall_week: number | null = null;
      let total = 0;
      const wk: ConsumableWeek[] = [];
      for (let w = 1; w <= horizon; w++) {
        const units = (perWeek.get(w) ?? []).filter((i) => i.consumable === c).length;
        total += units;
        balance -= units;
        if (balance < 0 && shortfall_week === null) shortfall_week = w;
        wk.push({ week: w, units, balance });
      }
      const rate = total / horizon;
      return {
        consumable: c,
        opening_stock,
        weeks: wk,
        shortfall_week,
        cover_weeks: rate > 0 ? opening_stock / rate : Infinity,
      };
    });

    return {
      depot_id: depot.id,
      buses: buses.map((v) => v.vehicle_id),
      weeks,
      interventions,
      consumables,
      peak_util_pct: weeks.reduce((a, w) => Math.max(a, w.util_pct), 0),
      over_weeks: weeks.filter((w) => w.state === 'over').length,
      first_shortfall_week: consumables.reduce<number | null>(
        (a, c) => (c.shortfall_week === null ? a : a === null ? c.shortfall_week : Math.min(a, c.shortfall_week)),
        null,
      ),
    };
  });
}
