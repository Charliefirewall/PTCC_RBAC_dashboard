/**
 * Road segments = the corridor edges routes are built from (corridors.ts EDGES, routed
 * onto streets in roads.ts). This is the unit PTCC scenario 3b ranks: "top 5 road
 * segments causing most buses to get delayed".
 */

import { NODE_BY_ID } from './corridors';
import { ROAD_ANCHORS, ROAD_SEGMENTS } from './roads';
import type { Route, RouteEdge } from '../sim/types';

/** The edge covering `dist_m` along the route shape (binary search on from_m). */
export function segmentAt(r: Route, dist_m: number): RouteEdge | null {
  const e = r.edges;
  if (!e || !e.length) return null;
  let lo = 0;
  let hi = e.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (e[mid]!.from_m <= dist_m) lo = mid;
    else hi = mid - 1;
  }
  return e[lo]!;
}

/**
 * The edge a stop-to-stop hop mostly runs on.
 * ponytail: single winner by overlap; split proportionally if PTPD wants exact attribution.
 */
export function segmentForHop(r: Route, a_m: number, b_m: number): string | null {
  const lo = Math.min(a_m, b_m);
  const hi = Math.max(a_m, b_m);
  let best: string | null = null;
  let bestLen = -1;
  for (const e of r.edges ?? []) {
    const ov = Math.min(hi, e.to_m) - Math.max(lo, e.from_m);
    if (ov > bestLen) {
      bestLen = ov;
      best = e.key;
    }
  }
  return best;
}

/** Street polyline for a segment key, straight between anchors for the 3 fallback pairs. */
export function segmentLine(key: string): [number, number][] {
  const seg = ROAD_SEGMENTS[key];
  if (seg) return seg;
  const [a, b] = key.split('|') as [string, string];
  const pa = ROAD_ANCHORS[a] ?? nodePt(a);
  const pb = ROAD_ANCHORS[b] ?? nodePt(b);
  return [pa, pb];
}

function nodePt(id: string): [number, number] {
  const n = NODE_BY_ID.get(id);
  return n ? [n.lon, n.lat] : [106.9176, 47.9188];
}

/** Human name "Bayangol – 3rd & 4th Khoroolol". */
export function segmentName(key: string, lang: 'en' | 'mn' = 'en'): string {
  const [a, b] = key.split('|') as [string, string];
  const na = NODE_BY_ID.get(a);
  const nb = NODE_BY_ID.get(b);
  const nm = (n: typeof na, id: string) => (n ? (lang === 'mn' ? n.name_mn : n.name_en) : id);
  return `${nm(na, a)} – ${nm(nb, b)}`;
}

/** 0 feeder, 1 arterial, 2 central: the higher centrality of the two end nodes. */
export function segmentCentrality(key: string): 0 | 1 | 2 {
  const [a, b] = key.split('|') as [string, string];
  return Math.max(NODE_BY_ID.get(a)?.centrality ?? 0, NODE_BY_ID.get(b)?.centrality ?? 0) as 0 | 1 | 2;
}
