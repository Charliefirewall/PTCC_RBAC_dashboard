/**
 * Service-regularity maths: headway, service gap, bunching, schedule deviation.
 *
 * Sources: L1052-L1057 (Top 10 by deviation, Top 3 bunching, gaps, excessive delays),
 * L1074-L1081 Table 11 (the parameter NAMES; the source gives no values),
 * S8 Chart B (R7 planned ~10 min, a 28-minute gap around 14:00-15:00).
 */

import type { Route, Vehicle } from '../sim/types';

export interface RegularityThresholds {
  schedule_deviation_s: number;
  bunching_min_headway_s: number;
  service_gap_max_s: number;
}

export interface HeadwayResult {
  headways: number[];
  gaps: number[];
  bunches: number[];
  max_gap_s: number;
  min_headway_s: number;
  bunching_count: number;
}

/**
 * Headways in seconds between consecutive vehicles on a route, in progress order.
 * Converted from spacing via the route's mean realised speed - with a floor so a
 * stationary route does not produce Infinity.
 */
export function headwaysAlongRoute(route: Route, vehicles: readonly Vehicle[]): number[] {
  const on = vehicles.filter(
    (v) => v.route_id === route.route_id && v.status === 'in_service',
  );
  if (on.length < 2) return [];
  const sorted = [...on].sort((a, b) => a.trip_progress - b.trip_progress);
  const meanKmh = Math.max(4, sorted.reduce((s, v) => s + v.speed, 0) / sorted.length);
  const mps = meanKmh / 3.6;
  const out: number[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const a = sorted[i]!;
    const b = sorted[(i + 1) % sorted.length]!;
    let d = (b.trip_progress - a.trip_progress) * route.length_m;
    if (d < 0) d += route.length_m; // wrap
    out.push(d / mps);
  }
  return out;
}

export function classifyHeadways(
  headways: number[],
  planned_s: number,
  th: RegularityThresholds,
): HeadwayResult {
  if (headways.length === 0) {
    return {
      headways,
      gaps: [],
      bunches: [],
      max_gap_s: planned_s,
      min_headway_s: planned_s,
      bunching_count: 0,
    };
  }
  const gaps = headways.filter((h) => h > th.service_gap_max_s);
  const bunches = headways.filter((h) => h < th.bunching_min_headway_s);
  return {
    headways,
    gaps,
    bunches,
    max_gap_s: Math.max(...headways),
    min_headway_s: Math.min(...headways),
    bunching_count: bunches.length,
  };
}

export interface DeviationStats {
  mean_s: number;
  max_s: number;
  on_time_pct: number;
  count: number;
}

export function routeDeviationStats(
  route: Route,
  vehicles: readonly Vehicle[],
  th: RegularityThresholds,
): DeviationStats {
  const on = vehicles.filter(
    (v) => v.route_id === route.route_id && v.status === 'in_service',
  );
  if (on.length === 0) return { mean_s: 0, max_s: 0, on_time_pct: 100, count: 0 };
  let sum = 0;
  let max = 0;
  let onTime = 0;
  for (const v of on) {
    const d = v.schedule_deviation;
    sum += d;
    if (Math.abs(d) > Math.abs(max)) max = d;
    if (Math.abs(d) <= th.schedule_deviation_s) onTime++;
  }
  return {
    mean_s: sum / on.length,
    max_s: max,
    on_time_pct: (onTime / on.length) * 100,
    count: on.length,
  };
}

/** Top-N helper. L1053 fixes Top 10 for deviation, L1054 fixes Top 3 for bunching. */
export function rankBy<T>(items: readonly T[], key: (t: T) => number, n: number): T[] {
  return [...items]
    .map((t, i) => ({ t, k: key(t), i }))
    .sort((a, b) => b.k - a.k || a.i - b.i)
    .slice(0, n)
    .map((x) => x.t);
}
