/**
 * Short-term forecast of delay alerts at +15 / +30 / +45 / +60 min (PTCC scenario 2).
 * Extension - outside R1096 scope, like every predictive number in this demo.
 *
 * NO ML. A transparent statistical model, every term printable:
 *
 *   base   = norm route deviation at the horizon's time bucket     (sim/baseline.ts)
 *   drift  = live route mean deviation - norm now                  (how far off normal it is)
 *   seg    = live excess on the route's segments over the norm     (congestion still building)
 *   mu_h   = base.mean + (drift + seg) * exp(-h / tau)             (disturbances fade)
 *   sd_h   = sqrt(base.sd^2 + (0.5 |drift| (1 - exp(-h/tau)))^2 + (4 h)^2)
 *
 * The level is read off the delay value the route reaches with probability
 * `forecast_min_probability_pct` (x = the upper quantile), then bumped for the number of
 * routes forecast to be affected - the same PTCC matrix the live rule uses.
 * `probability` is PTCC's "chance of happening": P(deviation >= that level's threshold).
 * `confidence` is how far the model trusts itself: capped like every predictive number
 * here (CONFIDENCE_CEILING), lower at longer horizons and with fewer live observations.
 */

import { baselineOf, bucketOf, liveSegExcess, type StopNorm } from '../sim/baseline';
import { isoAt } from '../sim/engine';
import type { Alert, Vehicle, World } from '../sim/types';
import type { DerivedMetrics } from './evaluate';
import { CONFIDENCE_CEILING } from './predict';
import { delayIdx, LEVEL_SEVERITY, sopLevel } from './severity';
import type { Thresholds } from './thresholds';

export const HORIZONS = [15, 30, 45, 60] as const;
export type Horizon = (typeof HORIZONS)[number];
/** extra spread per minute of horizon, seconds - the future is less certain than now */
const SD_PER_MIN_S = 4;

export type ForecastAlert = Alert & {
  forecast: true;
  horizon_min: number;
  probability: number;
  confidence: number;
  level: 1 | 2 | 3;
  /** E6: route rows carry the model's terms so the UI can explain the number */
  terms?: RouteForecast['terms'];
};

/** Standard normal CDF (Abramowitz-Stegun 7.1.26, |err| < 1.5e-7). */
export function phi(z: number): number {
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return z >= 0 ? 0.5 * (1 + y) : 0.5 * (1 - y);
}

/** z such that phi(z) = p, by bisection (40 steps, far below display precision). */
export function phiInv(p: number): number {
  let lo = -8;
  let hi = 8;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (phi(mid) < p) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export interface RouteForecast {
  route_id: string;
  h: number;
  mu_s: number;
  sd_s: number;
  confidence: number;
  /** E6: the printable terms, for the "How the forecast works" panel. */
  terms: { norm_now_s: number; norm_h_s: number; drift_s: number; seg_s: number; fade: number; tau_min: number };
}

/** The distribution of route mean deviation h minutes from now. Pure. */
export function forecastRoute(w: World, route_id: string, live_mean_dev_s: number, h: number, dow: number, tau_min: number): RouteForecast {
  const r = w.routeById.get(route_id)!;
  const base = baselineOf(w);
  const now = w.sim_time_s;
  const normNow = base.routeMeanDev(r, dow, bucketOf(now));
  const normH = base.routeMeanDev(r, dow, bucketOf(now + h * 60));
  const drift = live_mean_dev_s - normNow.mean;

  let seg = 0;
  let observed = 0;
  const edges = r.edges ?? [];
  for (const e of edges) {
    const live = liveSegExcess(w, e.key);
    if (!live.n) continue;
    observed++;
    const km = (e.to_m - e.from_m) / 1000;
    // half the route lies ahead of the average bus
    seg += Math.max(0, live.mean - base.segExcess(e.key, dow, bucketOf(now)).mean) * km * 0.5;
  }
  const fade = Math.exp(-h / tau_min);
  const mu_s = normH.mean + (drift + seg) * fade;
  const sd_s = Math.sqrt(normH.sd ** 2 + (0.5 * Math.abs(drift) * (1 - fade)) ** 2 + (SD_PER_MIN_S * h) ** 2);
  const obsFrac = edges.length ? observed / edges.length : 0;
  const confidence = Math.min(CONFIDENCE_CEILING, CONFIDENCE_CEILING * (1 - h / 150) * (0.5 + 0.5 * obsFrac));
  return {
    route_id, h, mu_s, sd_s, confidence,
    terms: { norm_now_s: normNow.mean, norm_h_s: normH.mean, drift_s: drift, seg_s: seg, fade, tau_min },
  };
}

/** P(deviation >= threshold_s). */
export function chance(f: Pick<RouteForecast, 'mu_s' | 'sd_s'>, threshold_s: number): number {
  return 1 - phi((threshold_s - f.mu_s) / Math.max(1, f.sd_s));
}

/** Forecast alerts for every horizon. Ids are stable across recomputes. */
export function computeForecast(
  w: World,
  m: DerivedMetrics,
  th: Thresholds,
  dow: number,
): Record<Horizon, ForecastAlert[]> {
  const pMin = th.forecast_min_probability_pct / 100;
  const zq = phiInv(1 - pMin);
  const iso = isoAt(w.sim_time_s);
  const worst = new Map<string, Vehicle>();
  for (const v of w.vehicles) {
    if (v.status !== 'in_service') continue;
    const x = worst.get(v.route_id);
    if (!x || v.schedule_deviation > x.schedule_deviation) worst.set(v.route_id, v);
  }
  const thMin = [0, th.delay_l1_min, th.delay_l2_min, th.delay_l3_min];

  const out = {} as Record<Horizon, ForecastAlert[]>;
  for (const h of HORIZONS) {
    const fs: { f: RouteForecast; xMin: number; pax: number }[] = [];
    for (const rm of m.per_route.values()) {
      if (!rm.vehicles || !w.routeById.get(rm.route_id)?.active) continue;
      const f = forecastRoute(w, rm.route_id, rm.mean_dev_s, h, dow, th.forecast_drift_tau_min);
      fs.push({ f, xMin: (f.mu_s + zq * f.sd_s) / 60, pax: rm.pax });
    }
    const hit = fs.filter((x) => delayIdx(x.xMin, th) > 0);
    const n = hit.length;
    const rows: ForecastAlert[] = [];
    for (const { f, xMin, pax } of hit) {
      const level = sopLevel(xMin, n, th) as 1 | 2 | 3;
      const d = delayIdx(xMin, th);
      const thr = thMin[d]!;
      rows.push(row(`fc:delay_sop:${f.route_id}:${h}`, 'delay_sop', {
        route_id: f.route_id,
        level,
        n,
        h,
        thr,
        probability: chance(f, thr * 60),
        confidence: f.confidence,
        mu_min: f.mu_s / 60,
        pax,
        bus: worst.get(f.route_id)?.vehicle_id ?? '',
        iso,
        now: w.sim_time_s,
        terms: f.terms,
      }));
    }
    if (n >= th.routes_affected_l2) {
      const top = [...hit].sort((a, b) => b.xMin - a.xMin);
      const d = delayIdx(top[0]!.xMin, th);
      const level = sopLevel(top[0]!.xMin, n, th) as 1 | 2 | 3;
      rows.push(row(`fc:delay_network:net:${h}`, 'delay_network', {
        level,
        n,
        h,
        thr: thMin[d]!,
        probability: Math.min(...top.map((x) => chance(x.f, th.delay_l1_min * 60))),
        confidence: Math.min(...top.map((x) => x.f.confidence)),
        mu_min: top[0]!.f.mu_s / 60,
        pax: top.reduce((s, x) => s + x.pax, 0),
        routes: top.slice(0, 5).map((x) => x.f.route_id).join(', '),
        iso,
        now: w.sim_time_s,
      }));
    }
    rows.sort((a, b) => b.level - a.level || b.probability - a.probability);
    out[h] = rows;
  }
  return out;
}

function row(
  id: string,
  rule_id: string,
  x: {
    route_id?: string; level: 1 | 2 | 3; n: number; h: number; thr: number; probability: number;
    confidence: number; mu_min: number; pax: number; bus?: string; routes?: string; iso: string; now: number;
    terms?: RouteForecast['terms'];
  },
): ForecastAlert {
  const severity = LEVEL_SEVERITY[x.level];
  return {
    id,
    rule_id,
    type: 'service_deviation',
    severity,
    route_id: x.route_id,
    title_key: rule_id === 'delay_network' ? 'fc.titleNet' : 'fc.title',
    params: { route: x.route_id ?? '', min: x.thr, h: x.h, n: x.n, level: x.level, bus: x.bus ?? '', routes: x.routes ?? '' },
    raised_at: x.iso,
    raised_at_s: x.now,
    metric: { name: 'delay_min', value: Math.round(x.mu_min * 10) / 10, threshold: x.thr, unit: 'min' },
    pax_affected: x.pax,
    impact_score: Math.round(x.probability * 100),
    tier: 3,
    acknowledged: false,
    level: x.level,
    routes_affected: x.n,
    forecast: true,
    horizon_min: x.h,
    probability: x.probability,
    confidence: x.confidence,
    terms: x.terms,
  };
}

export interface WatchItem {
  route_id: string;
  h: number;
  /** chance of reaching L1 at the horizon - below the listing chance by definition */
  probability: number;
  mu_min: number;
}

/**
 * E8: the routes closest to being listed, so the Forecast tab is never an empty page in a
 * quiet network. A route is listed exactly when its L1 chance reaches the listing chance
 * (the quantile rule in computeForecast), so "below" here is the complement.
 */
export function watchList(w: World, m: DerivedMetrics, th: Thresholds, dow: number, h: number, n = 5): WatchItem[] {
  const pMin = th.forecast_min_probability_pct / 100;
  const out: WatchItem[] = [];
  for (const rm of m.per_route.values()) {
    if (!rm.vehicles || !w.routeById.get(rm.route_id)?.active) continue;
    const f = forecastRoute(w, rm.route_id, rm.mean_dev_s, h, dow, th.forecast_drift_tau_min);
    const p = chance(f, th.delay_l1_min * 60);
    if (p < pMin) out.push({ route_id: rm.route_id, h, probability: p, mu_min: f.mu_s / 60 });
  }
  return out.sort((a, b) => b.probability - a.probability || (a.route_id < b.route_id ? -1 : 1)).slice(0, n);
}

/** Per-stop forecast for the rest of a bus's current trip (drill-down + route profile). */
export interface StopForecast {
  k: number;
  stop_id: string;
  mean: number;
  p10: number;
  p90: number;
  /** forecast arrival, sim seconds */
  eta_s: number;
}

export function forecastStops(w: World, v: Vehicle, dow: number, tau_min: number): { norm: StopNorm[]; ahead: StopForecast[]; k0: number } {
  const r = w.routeById.get(v.route_id)!;
  const base = baselineOf(w);
  const dir = v.direction;
  const hops = base.hops(r, dir);
  const norm = base.profile(r, dir, dow, bucketOf(v.trip_start_s ?? w.sim_time_s));
  // where the bus is now, in travel order
  const total = Math.max(1, r.length_m);
  const s = (dir === 0 ? v.trip_progress : 1 - v.trip_progress) * total;
  let k0 = 0;
  for (const hp of hops) if (dir === 0 ? hp.stop.dist_m <= s + 1 : hp.stop.dist_m >= s - 1) k0 = hp.k;
  const gap = v.schedule_deviation - norm[k0]!.mean;
  const ahead: StopForecast[] = [];
  for (const hp of hops) {
    if (hp.k <= k0) continue;
    const dt = hp.offset_s - hops[k0]!.offset_s;
    const fade = Math.exp(-dt / 60 / tau_min);
    const n = norm[hp.k]!;
    const mean = n.mean + gap * fade;
    const extra = SD_PER_MIN_S * (dt / 60);
    const half = n.p90 - n.mean;
    ahead.push({
      k: hp.k,
      stop_id: hp.stop.stop_id,
      mean,
      p10: mean - Math.sqrt(half ** 2 + extra ** 2),
      p90: mean + Math.sqrt(half ** 2 + extra ** 2),
      eta_s: w.sim_time_s + dt + (mean - v.schedule_deviation),
    });
  }
  return { norm, ahead, k0 };
}
