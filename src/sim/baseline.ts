/**
 * The "normal" trip: a deterministic, synthetic 8-week history of how much schedule
 * deviation buses gain on each road segment, by day of week and 15-minute time bucket.
 *
 * WHY SYNTHETIC. The sim covers one day (2026-09-21) and keeps ~30 minutes of history;
 * PTCC's "compare with the normal of the trip at similar time", the Mon-Sun route
 * profile and the top-5 segment ranking all need weeks. No AVL export exists yet, so the
 * norm is a FORMULA, generated from the seed at boot, and labelled as such on screen.
 * ponytail: dow/hour profile is a formula - swap for PTPD's 8-week AVL export when
 * supplied (plan §13 Q7); only buildBaseline() changes, every consumer reads the API.
 *
 * WHY PER SEGMENT. A route x stop x dow x bucket table is ~20 MB. The baseline lives on
 * the ~49 corridor edges (161 KB); a route's per-stop norm is the running sum over the
 * hops it drives. That makes the route profile (3a) and the hotspot ranking (3b) the
 * SAME numbers by construction - they cannot disagree.
 *
 * Units: segment values are deviation GAINED per km (s/km), the same unit the engine
 * logs live into world.segObs, so the forecast can subtract one from the other.
 */

import { segmentCentrality, segmentForHop } from '../data/segments';
import { centralityAt, DEFAULT_SPEEDS, PLAN_PAD, PLANNED_DWELL_S, speedFor } from './engine';
import { mulberry32 } from './rng';
import { SERVICE_START_S } from './timetable';
import type { Route, Stop, World } from './types';

export const BUCKET_MIN = 15;
export const BUCKETS = 60; // 06:00-21:00
export const WEEKS = 8;
/** 0 = Monday ... 6 = Sunday. The sim date 2026-09-21 is a Monday. */
export const SIM_DOW = 0;
export const DOW_FACTOR = [1.05, 1.0, 1.0, 1.0, 1.15, 0.7, 0.55] as const;
const Z90 = 1.2816;

export function bucketOf(sim_s: number): number {
  const b = Math.floor(((sim_s % 86400) - SERVICE_START_S) / (BUCKET_MIN * 60));
  return b < 0 ? 0 : b >= BUCKETS ? BUCKETS - 1 : b;
}

export function bucketStartS(b: number): number {
  return SERVICE_START_S + b * BUCKET_MIN * 60;
}

/** Hour-of-day shape. Weekdays: two commuter peaks. Weekends: one flat midday hump. */
function hourShape(b: number, dow: number): number {
  const h = (bucketStartS(b) + BUCKET_MIN * 30) / 3600;
  const bump = (c: number, w: number) => Math.exp(-(((h - c) / w) ** 2));
  if (dow >= 5) return 0.7 + 0.5 * bump(13, 2.5);
  return 0.6 + 1.3 * bump(8.2, 0.9) + 1.1 * bump(18, 1.0) + 0.3 * bump(13, 1.5);
}

/** One hop of a trip, in travel order. */
export interface Hop {
  k: number; // stop index in travel order
  stop: Stop;
  hop_km: number;
  seg_key: string | null;
  /** planned seconds from trip start to arrival at this stop */
  offset_s: number;
}

export interface StopNorm {
  mean: number;
  p10: number;
  p90: number;
}

export interface Baseline {
  seed: number;
  weeks: number;
  segKeys: string[];
  segExcess(key: string, dow: number, bucket: number): { mean: number; sd: number };
  hops(r: Route, dir: 0 | 1): Hop[];
  /** Norm deviation at every stop of a trip starting in `startBucket`. */
  profile(r: Route, dir: 0 | 1, dow: number, startBucket: number): StopNorm[];
  /** Mean deviation across buses on the route at `bucket` - comparable to RouteMetrics.mean_dev_s. */
  routeMeanDev(r: Route, dow: number, bucket: number): { mean: number; sd: number };
}

export function buildBaseline(seed: number, routes: readonly Route[]): Baseline {
  const keys = [...new Set(routes.flatMap((r) => (r.edges ?? []).map((e) => e.key)))].sort();
  const index = new Map(keys.map((k, i) => [k, i]));
  const rng = mulberry32((seed ^ 0xba5e) >>> 0);
  const N = keys.length * 7 * BUCKETS;
  const mean = new Float32Array(N);
  const sd = new Float32Array(N);

  // A handful of chronically slow central/arterial segments - the ones scenario 3b
  // should surface. Seeded, so the same edges are "hot" in every session.
  const candidates = keys.filter((k) => segmentCentrality(k) >= 1);
  const hot = new Set<string>();
  while (hot.size < Math.min(5, candidates.length)) hot.add(candidates[Math.floor(rng.next() * candidates.length)]!);

  keys.forEach((k, s) => {
    const c = segmentCentrality(k);
    // s/km gained. Central streets lose time, outer feeders recover it (negative).
    let base = c === 2 ? 6 + rng.next() * 4 : c === 1 ? 3 + rng.next() * 3 : -2 + rng.next() * 3;
    if (hot.has(k)) base = Math.abs(base) * 2.4 + 4;
    for (let d = 0; d < 7; d++) {
      for (let b = 0; b < BUCKETS; b++) {
        const i = (s * 7 + d) * BUCKETS + b;
        const shaped = base > 0 ? base * hourShape(b, d) * DOW_FACTOR[d]! : base;
        mean[i] = shaped * (1 + 0.15 * (rng.next() * 2 - 1));
        sd[i] = 0.5 * Math.abs(mean[i]!) + 22;
      }
    }
  });

  const segExcess = (key: string, dow: number, bucket: number) => {
    const s = index.get(key);
    if (s === undefined) return { mean: 0, sd: 22 };
    const i = (s * 7 + dow) * BUCKETS + Math.max(0, Math.min(BUCKETS - 1, bucket));
    return { mean: mean[i]!, sd: sd[i]! };
  };

  const hopCache = new Map<string, Hop[]>();
  const hops = (r: Route, dir: 0 | 1): Hop[] => {
    const ck = `${r.route_id}|${dir}`;
    const hit = hopCache.get(ck);
    if (hit) return hit;
    const ordered = dir === 0 ? r.stops : [...r.stops].reverse();
    const out: Hop[] = [];
    let offset = 0;
    ordered.forEach((stop, k) => {
      const prev = ordered[k - 1];
      const hop_m = prev ? Math.abs(stop.dist_m - prev.dist_m) : 0;
      if (prev) {
        // same planned pace the engine accrues deviation against (off-peak profile)
        const kmh = speedFor(r, centralityAt(stop.longitude, stop.latitude), false, DEFAULT_SPEEDS);
        offset += hop_m / ((kmh * PLAN_PAD) / 3.6) + PLANNED_DWELL_S;
      }
      out.push({
        k,
        stop,
        hop_km: hop_m / 1000,
        seg_key: prev ? segmentForHop(r, prev.dist_m, stop.dist_m) : null,
        offset_s: offset,
      });
    });
    hopCache.set(ck, out);
    return out;
  };

  const profile = (r: Route, dir: 0 | 1, dow: number, startBucket: number): StopNorm[] => {
    let m = 0;
    let v = 0;
    return hops(r, dir).map((h) => {
      if (h.seg_key) {
        const b = startBucket + Math.floor(h.offset_s / (BUCKET_MIN * 60));
        const e = segExcess(h.seg_key, dow, b);
        m += e.mean * h.hop_km;
        v += (e.sd * h.hop_km) ** 2;
      }
      const s = Math.sqrt(v);
      return { mean: m, p10: m - Z90 * s, p90: m + Z90 * s };
    });
  };

  const routeMeanDev = (r: Route, dow: number, bucket: number) => {
    // Buses on the road at `bucket` are at every point of their trip; the one at stop k
    // started roughly offset_k earlier. Average the norm at each stop over both directions.
    let sum = 0;
    let sumSd = 0;
    let n = 0;
    for (const dir of [0, 1] as const) {
      const hs = hops(r, dir);
      let m = 0;
      let v = 0;
      for (const h of hs) {
        if (h.seg_key) {
          const e = segExcess(h.seg_key, dow, bucket);
          m += e.mean * h.hop_km;
          v += (e.sd * h.hop_km) ** 2;
        }
        sum += m;
        sumSd += Math.sqrt(v);
        n++;
      }
    }
    return { mean: n ? sum / n : 0, sd: n ? sumSd / n : 30 };
  };

  return { seed, weeks: WEEKS, segKeys: keys, segExcess, hops, profile, routeMeanDev };
}

const cache = new WeakMap<World, Baseline>();
/** One baseline per world, built on first use (~10 ms). */
export function baselineOf(w: World): Baseline {
  let b = cache.get(w);
  if (!b) cache.set(w, (b = buildBaseline(w.seed, w.routes)));
  return b;
}

/** Deviation gained per km on a segment over the last `window_s`, from the live log. */
export function liveSegExcess(w: World, key: string, window_s = 1800): { mean: number; n: number } {
  const o = w.segObs.get(key);
  if (!o) return { mean: 0, n: 0 };
  const vs = o.v.toArray();
  const ts = o.t.toArray();
  let s = 0;
  let n = 0;
  for (let i = 0; i < vs.length; i++) {
    if (w.sim_time_s - ts[i]! <= window_s) {
      s += vs[i]!;
      n++;
    }
  }
  return { mean: n ? s / n : 0, n };
}
