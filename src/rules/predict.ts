/**
 * Component-level remaining-useful-life (RUL) model — plan §9.2 class A
 * "Component-level RUL + zones", §17 items 5.1–5.3, backlog 18.
 *
 * WHAT THIS IS
 * ------------
 * A **deterministic duty-cycle model**. It is not machine learning, it contains no
 * trained parameters, and nothing here was fitted to data — because there is no data.
 * The client stated they do not hold maintenance cost or component-replacement
 * figures ("I don't have the answer"), so every life constant below is a DEMO DEFAULT
 * living in `thresholds.ts`, visible and editable in Settings and therefore listed in
 * the absence questionnaire (§15.1) with no source value against it.
 *
 * Consequently (plan §9.3, the honest warning):
 *   - every field this module produces is graded INFERRED or ASSUMPTION, never CONFIRMED;
 *   - every RUL is a RANGE (`rulLo` … `rulHi`, a p10–p90-style interval), never a point;
 *   - confidence is capped at CONFIDENCE_CEILING while no maintenance history exists.
 *
 * THE MODEL, IN ONE LINE
 * ----------------------
 *   effective_life = base_life / duty          duty = 1 + S · Σ wᵢ·xᵢ
 *   remaining      = effective_life · (1 − phase)
 *
 * `base_life` is a named threshold. `S` is `pred_duty_sensitivity`. `xᵢ` are normalised
 * duty signals read from data the simulation genuinely has (km today, route kind,
 * corridor centrality via `demand_weight`, load, boardings, device state). `phase` — how
 * far through its current life the part already is — has no source at all and is seeded
 * per vehicle × component; it is graded ASSUMPTION wherever it reaches the screen.
 *
 * DETERMINISM (plan §14.3)
 * ------------------------
 * The per-vehicle seeded terms come from `mulberry32(seedOf(vehicle_id))` — the same
 * FNV-1a seed `simulatedCostPerBus()` uses — drawn in a fixed order and cached, so a bus
 * never disagrees with itself between modules or renders. No `Math.random` anywhere.
 */

import { mulberry32 } from '../sim/rng';
import type { Evidence, Route, Vehicle } from '../sim/types';
import type { I18nKey } from '../i18n/dict';
import type { Thresholds } from './thresholds';

/** FNV-1a over the vehicle id. Shared with `simulatedCostPerBus()` so both agree. */
export function seedOf(vehicle_id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < vehicle_id.length; i++) {
    h ^= vehicle_id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// ---------------------------------------------------------------- shape

/** The eight components (§9.2 class A). Device health is ONE component, not three. */
export const COMPONENT_IDS = [
  'brakes',
  'tyres',
  'clutch',
  'battery',
  'doors',
  'hvac',
  'driveline',
  'devices',
] as const;
export type ComponentId = (typeof COMPONENT_IDS)[number];

/**
 * Our operational-state language (§13.2), reused verbatim. NOT the reference product's
 * Black/Orange/Yellow/Green — and deliberately NOT the 3-level alert scale or the
 * 5-level event scale, both of which stay untouched and unmerged (L1182, R1433).
 */
export type Zone = 'critical' | 'high' | 'elevated' | 'low';
export const ZONE_ORDER: Zone[] = ['critical', 'high', 'elevated', 'low'];

/** A named duty contributor, its measured value, and which way it pushes the life. */
export interface EvidenceFactor {
  labelKey: I18nKey;
  /** The measured / assumed value itself, so "why is this bus at risk" is answerable. */
  value: number;
  unit: string;
  /** `up` shortens the remaining life, `down` lengthens it. */
  dir: 'up' | 'down';
  /** Never CONFIRMED: a simulated observation is INFERRED, an invented term ASSUMPTION. */
  evidence: Evidence;
}

export interface ComponentPrediction {
  component: ComponentId;
  /** Median remaining life, days. Always presented with `rulLo`/`rulHi` beside it. */
  rulDays: number;
  /** The same median expressed in km at the vehicle's modelled daily duty. */
  rulKm: number;
  /** p10-style lower bound, days. Invariant: `rulLo <= rulDays <= rulHi`. */
  rulLo: number;
  /** p90-style upper bound, days. */
  rulHi: number;
  /** 0–1, capped at CONFIDENCE_CEILING. A pure function of input observability. */
  confidence: number;
  zone: Zone;
  /** i18n key; the wording is ours (§13.2), one line per zone. */
  recommendedAction: I18nKey;
  /** Book the work before the earliest plausible failure, i.e. inside p10. */
  window: { fromDays: number; toDays: number };
  /** 2–4 contributors, strongest first. */
  factors: EvidenceFactor[];
  /** Always INFERRED — the model, not the world, produced this row. */
  evidence: Evidence;
}

export interface VehiclePrediction {
  vehicle_id: string;
  route_id: string;
  /** Worst zone across the eight components. */
  zone: Zone;
  /** Days to the nearest component median RUL — the worklist's due date. */
  dueDays: number;
  /** Passengers riding this bus today. Our "value at risk": we are a transit authority. */
  exposure: number;
  components: ComponentPrediction[];
  /** Modelled daily km, the denominator behind every day figure. */
  dailyKm: number;
  /** Seeded age proxy in years. No fleet register exists — ASSUMPTION. */
  ageYears: number;
}

/**
 * No component prediction may claim more than 60 % confidence while the client holds no
 * maintenance history (§9.3). This is a stated honesty limit, not a tunable: raising it
 * would be a claim about data that does not exist.
 */
export const CONFIDENCE_CEILING = 0.6;

// ---------------------------------------------------------------- duty matrix

/**
 * Which normalised signal drives which component, and how hard.
 *
 * The SHAPE of this matrix is an engineering assumption (brakes wear on stop-start city
 * duty; doors wear on boardings; HVAC wears on load and age). Its STRENGTH is the single
 * named threshold `pred_duty_sensitivity`, so the whole matrix can be turned down to a
 * flat model from Settings. Weights sum to ~1 per component so `duty` stays in 1…1+S.
 *
 * ponytail: one shared matrix, not eight bespoke physics models — upgrade path is a per
 * component curve once PTPD supplies real replacement intervals (see the input list).
 */
type SignalId = 'city' | 'load' | 'central' | 'age' | 'boarding' | 'devicesOff';

const SIGNAL_LABEL: Record<SignalId, I18nKey> = {
  city: 'pred.sig.city',
  load: 'pred.sig.load',
  central: 'pred.sig.central',
  age: 'pred.sig.age',
  boarding: 'pred.sig.boarding',
  devicesOff: 'pred.sig.devicesOff',
};

const SIGNAL_UNIT: Record<SignalId, string> = {
  city: '',
  load: '%',
  central: '×',
  age: 'y',
  boarding: '/km',
  devicesOff: '',
};

/** `age` is invented; everything else is read off the simulated fleet. */
const SIGNAL_EVIDENCE: Record<SignalId, Evidence> = {
  city: 'INFERRED',
  load: 'INFERRED',
  central: 'INFERRED',
  age: 'ASSUMPTION',
  boarding: 'INFERRED',
  devicesOff: 'INFERRED',
};

interface Spec {
  /** Which threshold holds this component's base life. */
  life: keyof Thresholds;
  /** `km` lives are consumed by distance, `days` lives by calendar time. */
  basis: 'km' | 'days';
  weights: Partial<Record<SignalId, number>>;
}

const SPEC: Record<ComponentId, Spec> = {
  // The first four reuse the `interval_km_*` thresholds the depot/consumables layer
  // already declared. Two sets of brake-life constants in one Settings page would be a
  // bug the client finds before we do.
  brakes: { life: 'interval_km_brakes', basis: 'km', weights: { city: 0.45, load: 0.3, central: 0.25 } },
  tyres: { life: 'interval_km_tyres', basis: 'km', weights: { load: 0.4, central: 0.35, city: 0.25 } },
  clutch: { life: 'interval_km_clutch', basis: 'km', weights: { city: 0.55, central: 0.3, load: 0.15 } },
  battery: { life: 'interval_km_battery', basis: 'km', weights: { age: 0.5, devicesOff: 0.3, city: 0.2 } },
  doors: { life: 'pred_door_life_days', basis: 'days', weights: { boarding: 0.55, city: 0.25, central: 0.2 } },
  hvac: { life: 'pred_hvac_life_days', basis: 'days', weights: { load: 0.5, age: 0.5 } },
  driveline: { life: 'pred_driveline_life_km', basis: 'km', weights: { load: 0.4, age: 0.35, city: 0.25 } },
  devices: { life: 'pred_device_mtbf_days', basis: 'days', weights: { devicesOff: 0.7, age: 0.2, central: 0.1 } },
};

// ---------------------------------------------------------------- seeded, cached terms

interface SeededTerms {
  ageYears: number;
  /** How far through its current life each component already is, 0–1. No source. */
  phase: Record<ComponentId, number>;
}

const seedCache = new Map<string, SeededTerms>();

function seededTerms(vehicle_id: string): SeededTerms {
  const hit = seedCache.get(vehicle_id);
  if (hit) return hit;
  const r = mulberry32(seedOf(vehicle_id));
  // Draw order is fixed and must stay fixed: it IS the determinism contract.
  const ageYears = Math.round(r.range(1, 13) * 10) / 10;
  const phase = {} as Record<ComponentId, number>;
  for (const c of COMPONENT_IDS) phase[c] = r.range(0.05, 0.97);
  const terms: SeededTerms = { ageYears, phase };
  seedCache.set(vehicle_id, terms);
  return terms;
}

/** Test seam only — the cache is otherwise write-once per vehicle for the session. */
export function _resetPredictCache(): void {
  seedCache.clear();
}

// ---------------------------------------------------------------- the model

const clamp = (x: number, lo: number, hi: number) => (x < lo ? lo : x > hi ? hi : x);

export function zoneOf(rulDays: number, th: Thresholds): Zone {
  if (rulDays <= th.pred_zone_critical_days) return 'critical';
  if (rulDays <= th.pred_zone_high_days) return 'high';
  if (rulDays <= th.pred_zone_elevated_days) return 'elevated';
  return 'low';
}

const ZONE_ACTION: Record<Zone, I18nKey> = {
  critical: 'pred.act.critical',
  high: 'pred.act.high',
  elevated: 'pred.act.elevated',
  low: 'pred.act.low',
};

/**
 * Predict all eight components for one vehicle.
 *
 * `route` may be absent (a vehicle whose route is not in the snapshot); the corridor
 * centrality signal then falls back to the network mean, which is the honest default
 * rather than a guess in either direction.
 */
export function predictVehicle(v: Vehicle, route: Route | undefined, th: Thresholds): VehiclePrediction {
  const { ageYears, phase } = seededTerms(v.vehicle_id);

  /* Modelled daily duty. `km_today` is a real field but it accumulates through the
     simulated day, so at 06:00 it is near zero and would send every RUL to infinity.
     ponytail: clamp it into a band around the assumed daily figure — replace the clamp
     with the operator's own odometer series the moment PTPD supplies one (input 7). */
  const assumed = th.pred_assumed_daily_km;
  const dailyKm = clamp(v.km_today, assumed * 0.5, assumed * 1.8);

  const offline =
    (v.equipment.afc === 'offline' ? 1 : 0) +
    (v.equipment.cctv === 'offline' ? 1 : 0) +
    (v.equipment.tbox === 'offline' ? 1 : 0);

  const raw: Record<SignalId, number> = {
    city: route?.kind === 'city' ? 1 : 0,
    load: clamp(v.pax_count / Math.max(1, v.capacity), 0, 1),
    central: clamp(((route?.demand_weight ?? 1) - 0.6) / 1.4, 0, 1),
    age: clamp((ageYears - 1) / 12, 0, 1),
    boarding: clamp(v.boardings_today / Math.max(1, v.km_today) / 10, 0, 1),
    devicesOff: offline / 3,
  };

  /** The value a human would recognise, for the evidence row. */
  const shown: Record<SignalId, number> = {
    city: raw.city,
    load: Math.round((v.pax_count / Math.max(1, v.capacity)) * 100),
    central: Math.round((route?.demand_weight ?? 1) * 100) / 100,
    age: ageYears,
    boarding: Math.round((v.boardings_today / Math.max(1, v.km_today)) * 10) / 10,
    devicesOff: offline,
  };

  const components = COMPONENT_IDS.map((id) =>
    predictComponent(id, raw, shown, phase[id], dailyKm, th),
  );

  let worst: Zone = 'low';
  let dueDays = Number.POSITIVE_INFINITY;
  for (const c of components) {
    if (ZONE_ORDER.indexOf(c.zone) < ZONE_ORDER.indexOf(worst)) worst = c.zone;
    if (c.rulDays < dueDays) dueDays = c.rulDays;
  }

  return {
    vehicle_id: v.vehicle_id,
    route_id: v.route_id,
    zone: worst,
    dueDays,
    exposure: v.pax_count,
    components,
    dailyKm,
    ageYears,
  };
}

function predictComponent(
  id: ComponentId,
  raw: Record<SignalId, number>,
  shown: Record<SignalId, number>,
  phase: number,
  dailyKm: number,
  th: Thresholds,
): ComponentPrediction {
  const spec = SPEC[id];
  const entries = Object.entries(spec.weights) as [SignalId, number][];

  // duty = 1 + S · Σ w·x — never below 1, so a quiet bus gets the book life, not more.
  const dutyLoad = entries.reduce((a, [s, w]) => a + w * raw[s], 0);
  const duty = 1 + th.pred_duty_sensitivity * dutyLoad;

  const baseLife = th[spec.life] as number;
  const effLife = baseLife / duty;
  const remaining = effLife * (1 - phase);

  const rulDays = spec.basis === 'km' ? remaining / dailyKm : remaining;
  const rulKm = spec.basis === 'km' ? remaining : remaining * dailyKm;

  /* Confidence is a documented pure function of how much of the duty load rests on
     observed rather than invented signals — and it is capped, because no amount of
     telemetry substitutes for a replacement history we have never been shown. */
  const observed = entries.reduce((a, [s, w]) => a + (SIGNAL_EVIDENCE[s] === 'INFERRED' ? w : 0), 0);
  const total = entries.reduce((a, [, w]) => a + w, 0) || 1;
  const confidence = Math.round(CONFIDENCE_CEILING * (0.5 + 0.5 * (observed / total)) * 100) / 100;

  /* Interval half-width widens as confidence falls, so a weakly-evidenced figure LOOKS
     weak. `half` is non-negative by construction, which is what keeps lo ≤ med ≤ hi. */
  const half = Math.max(0, (th.pred_interval_spread_pct / 100) * (2 - confidence));
  const rulLo = Math.max(0, rulDays * (1 - Math.min(half, 1)));
  const rulHi = rulDays * (1 + half);

  const zone = zoneOf(rulDays, th);

  const factors: EvidenceFactor[] = entries
    .map(([s, w]) => ({ s, contrib: w * raw[s] }))
    .sort((a, b) => b.contrib - a.contrib)
    .slice(0, 3)
    .map(({ s, contrib }) => ({
      labelKey: SIGNAL_LABEL[s],
      value: shown[s],
      unit: SIGNAL_UNIT[s],
      dir: contrib > 0 ? ('up' as const) : ('down' as const),
      evidence: SIGNAL_EVIDENCE[s],
    }));
  // The part's position in its own life cycle is the single biggest term and has no
  // source whatever. It is listed last, but it is always listed.
  factors.push({
    labelKey: 'pred.sig.phase',
    value: Math.round(phase * 100),
    unit: '%',
    dir: 'up',
    evidence: 'ASSUMPTION',
  });

  return {
    component: id,
    rulDays,
    rulKm,
    rulLo,
    rulHi,
    confidence,
    zone,
    recommendedAction: ZONE_ACTION[zone],
    // Book the work before the earliest plausible failure: inside the p10 bound.
    window: { fromDays: Math.max(0, Math.floor(rulLo * 0.8)), toDays: Math.max(0, Math.ceil(rulLo)) },
    factors,
    evidence: 'INFERRED',
  };
}

// ---------------------------------------------------------------- worklist (item 49)

/**
 * The predictive worklist: zone → due date → passenger exposure.
 *
 * Exposure is third, not first, because a bus about to lose its brakes outranks a busy
 * bus with a tired HVAC. Within a zone and a due day, the busier bus goes first — we are
 * a transport authority, so passengers carried IS the value at risk (§9.1(a)).
 */
export function predictFleet(
  vehicles: readonly Vehicle[],
  routeById: ReadonlyMap<string, Route>,
  th: Thresholds,
): VehiclePrediction[] {
  return vehicles
    .map((v) => predictVehicle(v, routeById.get(v.route_id), th))
    .sort(
      (a, b) =>
        ZONE_ORDER.indexOf(a.zone) - ZONE_ORDER.indexOf(b.zone) ||
        a.dueDays - b.dueDays ||
        b.exposure - a.exposure ||
        a.vehicle_id.localeCompare(b.vehicle_id),
    );
}

// ---------------------------------------------------------------- export for Workstream Q

/** One component line of the fleet forecast. Counts are vehicles, not parts. */
export interface ComponentDemand {
  component: ComponentId;
  /** Vehicles whose MEDIAN RUL falls inside the horizon. */
  due: number;
  /** Same count taken at the p90 (optimistic) bound — the low end of the forecast. */
  dueLo: number;
  /** Same count taken at the p10 (pessimistic) bound — the high end. */
  dueHi: number;
  /** `due` scaled to 365 days. The intervention count an annual budget would carry. */
  annualised: number;
  /** Mean model confidence across the fleet for this component, 0–1. */
  meanConfidence: number;
}

/**
 * Fleet-level intervention forecast — the input Workstream Q's ROI engine consumes.
 *
 * This module owns the FAILURE side only. The COST side stays in
 * `simulatedCostPerBus()`; multiply one by the other and you have the ROI argument the
 * client asked for, with both halves still carrying their own evidence grade.
 *
 * Every number here is INFERRED. Use `dueLo`/`dueHi` — never `due` alone — anywhere the
 * result reaches a screen, or the interval this module exists to preserve is thrown away.
 */
export interface FleetForecast {
  vehicles: number;
  horizonDays: number;
  perComponent: ComponentDemand[];
  /** Fleet distribution across our four operational-state zones (§13.2). */
  zones: Record<Zone, number>;
  /** Passengers currently riding buses in the critical or high zones. */
  exposureAtRisk: number;
  evidence: Evidence;
}

export function fleetForecast(
  vehicles: readonly Vehicle[],
  routeById: ReadonlyMap<string, Route>,
  th: Thresholds,
  horizonDays = 90,
): FleetForecast {
  const preds = vehicles.map((v) => predictVehicle(v, routeById.get(v.route_id), th));
  const zones: Record<Zone, number> = { critical: 0, high: 0, elevated: 0, low: 0 };
  let exposureAtRisk = 0;
  for (const p of preds) {
    zones[p.zone]++;
    if (p.zone === 'critical' || p.zone === 'high') exposureAtRisk += p.exposure;
  }

  const perComponent = COMPONENT_IDS.map((component, i) => {
    let due = 0;
    let dueLo = 0;
    let dueHi = 0;
    let conf = 0;
    for (const p of preds) {
      const c = p.components[i]!;
      if (c.rulDays <= horizonDays) due++;
      if (c.rulHi <= horizonDays) dueLo++;
      if (c.rulLo <= horizonDays) dueHi++;
      conf += c.confidence;
    }
    return {
      component,
      due,
      dueLo,
      dueHi,
      annualised: Math.round((due * 365) / horizonDays),
      meanConfidence: preds.length ? Math.round((conf / preds.length) * 100) / 100 : 0,
    };
  });

  return { vehicles: preds.length, horizonDays, perComponent, zones, exposureAtRisk, evidence: 'INFERRED' };
}
