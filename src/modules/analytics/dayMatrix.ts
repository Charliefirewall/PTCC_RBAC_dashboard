/**
 * E13 day heatmap, the pure half: norm mean deviation (min, 1 dp) at every stop for a
 * trip starting in each 15-min bucket. Rows = start buckets 06:00-20:45, cols = stops
 * in travel order. Store-free, so it is testable in node.
 */
import { BUCKETS, type Baseline } from '../../sim/baseline';
import type { Route } from '../../sim/types';

export function dayMatrix(base: Baseline, route: Route, dir: 0 | 1, dow: number): number[][] {
  return Array.from({ length: BUCKETS }, (_, b) => base.profile(route, dir, dow, b).map((n) => +(n.mean / 60).toFixed(1)));
}
