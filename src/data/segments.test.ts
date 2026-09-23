import { describe, expect, it } from 'vitest';
import { buildRoutes } from './build';
import { ROAD_FALLBACK_PAIRS, ROAD_SEGMENTS } from './roads';
import { segmentAt, segmentForHop, segmentLine, segmentName } from './segments';

describe('road segments on routes', () => {
  const routes = buildRoutes(20260921);

  it('every route is covered end to end by contiguous corridor edges', () => {
    for (const r of routes) {
      const e = r.edges!;
      expect(e.length).toBeGreaterThan(0);
      expect(e[0]!.from_m).toBe(0);
      expect(e[e.length - 1]!.to_m).toBeCloseTo(r.length_m, 3);
      for (let i = 1; i < e.length; i++) expect(e[i]!.from_m).toBeCloseTo(e[i - 1]!.to_m, 6);
    }
  });

  it('every edge key is a routed street segment, a documented fallback, or a known straight hop', () => {
    const known = new Set([...Object.keys(ROAD_SEGMENTS), ...ROAD_FALLBACK_PAIRS]);
    const straight = new Set<string>();
    for (const r of routes) for (const e of r.edges!) if (!known.has(e.key)) straight.add(e.key);
    // Hero route R23 hand-traces Peace Ave East -> 5th khoroo, which is not a corridor
    // edge, so build.ts draws it straight. Pinned so a new unrouted pair is noticed.
    expect([...straight]).toEqual(['n-5khoroo|n-peace-e']);
    for (const k of straight) expect(segmentLine(k).length).toBe(2);
  });

  it('attributes a hop to the edge it mostly runs on', () => {
    const r = routes.find((x) => x.edges!.length >= 3)!;
    const mid = r.edges![1]!;
    const a = mid.from_m + (mid.to_m - mid.from_m) * 0.1;
    const b = mid.to_m + 1; // spills 1 m into the next edge
    expect(segmentForHop(r, a, b)).toBe(mid.key);
    expect(segmentAt(r, (mid.from_m + mid.to_m) / 2)!.key).toBe(mid.key);
  });

  it('has a drawable line and a readable name', () => {
    const k = routes[0]!.edges![0]!.key;
    expect(segmentLine(k).length).toBeGreaterThanOrEqual(2);
    expect(segmentName(k)).toContain('–');
  });
});
