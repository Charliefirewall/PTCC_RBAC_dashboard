/**
 * Route-profile summary strip: what the trip chart says, as numbers. Pure - reads the
 * baseline's hops and profile() output, invents nothing.
 */
import type { Hop, StopNorm } from '../../sim/baseline';

export interface RouteInsight {
  /** seconds of delay each hop adds (profile mean at k minus k-1); 0 at the first stop */
  hop: number[];
  /** the compare day's `hop`, when there is one */
  hopCmp: number[] | null;
  /** expected deviation at the last stop, s (p10 / p90 = the band there) */
  end: StopNorm;
  endCmp: StopNorm | null;
  /** end.mean - endCmp.mean, s; > 0 = primary day is worse */
  diff: number | null;
  /** hop index where delay grows fastest */
  fastestK: number;
  /** road segment adding the most delay (summed over its hops) */
  worstSeg: { key: string; s: number } | null;
  plannedS: number;
  /** end.mean / plannedS */
  pct: number;
}

export function routeInsight(hops: Hop[], prim: StopNorm[], cmp: StopNorm[] | null): RouteInsight {
  const inc = (p: StopNorm[]) => p.map((n, i) => (i === 0 ? 0 : n.mean - p[i - 1]!.mean));
  const hop = inc(prim);
  let fastestK = 0;
  hop.forEach((v, i) => {
    if (v > hop[fastestK]!) fastestK = i;
  });
  const bySeg = new Map<string, number>();
  hops.forEach((h, i) => h.seg_key && bySeg.set(h.seg_key, (bySeg.get(h.seg_key) ?? 0) + hop[i]!));
  let worstSeg: RouteInsight['worstSeg'] = null;
  for (const [key, s] of bySeg) if (s > 0 && (!worstSeg || s > worstSeg.s)) worstSeg = { key, s };
  const end = prim.at(-1)!;
  const endCmp = cmp?.at(-1) ?? null;
  const plannedS = hops.at(-1)!.offset_s;
  return {
    hop,
    hopCmp: cmp ? inc(cmp) : null,
    end,
    endCmp,
    diff: endCmp ? end.mean - endCmp.mean : null,
    fastestK,
    worstSeg,
    plannedS,
    pct: plannedS > 0 ? end.mean / plannedS : 0,
  };
}
