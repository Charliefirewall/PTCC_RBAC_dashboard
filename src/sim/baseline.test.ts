import { describe, expect, it } from 'vitest';
import { buildRoutes, buildWorld } from '../data/build';
import { deriveMetrics } from '../rules/evaluate';
import { DEMO_DEFAULTS } from '../rules/thresholds';
import { BUCKETS, bucketOf, buildBaseline } from './baseline';
import { SimEngine } from './engine';

const SEED = 20260921;
const b0800 = bucketOf(8 * 3600);

describe('synthetic Mon-Sun baseline', () => {
  const routes = buildRoutes(SEED);
  const base = buildBaseline(SEED, routes);

  it('is deterministic for a seed and differs across seeds', () => {
    const again = buildBaseline(SEED, routes);
    const other = buildBaseline(SEED + 1, routes);
    const k = base.segKeys[3]!;
    expect(again.segExcess(k, 2, 10)).toEqual(base.segExcess(k, 2, 10));
    const diff = base.segKeys.some((key) => base.segExcess(key, 0, 8).mean !== other.segExcess(key, 0, 8).mean);
    expect(diff).toBe(true);
  });

  it('covers every corridor edge used by a route, 7 days x 60 buckets', () => {
    const used = new Set(routes.flatMap((r) => r.edges!.map((e) => e.key)));
    expect(base.segKeys.length).toBe(used.size);
    expect(BUCKETS).toBe(60);
  });

  it('p10 <= mean <= p90 at every stop and the band widens along the trip', () => {
    const r = routes.find((x) => x.route_id === 'R7')!;
    const p = base.profile(r, 0, 0, b0800);
    expect(p).toHaveLength(r.stops.length);
    for (const s of p) expect(s.p10 <= s.mean && s.mean <= s.p90).toBe(true);
    expect(p[p.length - 1]!.p90 - p[p.length - 1]!.p10).toBeGreaterThan(p[1]!.p90 - p[1]!.p10);
  });

  it('a Monday morning peak is worse than a Sunday one and than Monday midday', () => {
    const r = routes.find((x) => x.route_id === 'R7')!;
    const end = (dow: number, b: number) => base.profile(r, 0, dow, b).at(-1)!.mean;
    expect(end(0, b0800)).toBeGreaterThan(end(6, b0800));
    expect(end(0, b0800)).toBeGreaterThan(end(0, bucketOf(11 * 3600)));
  });

  it('the norm is the same order of magnitude as the live sim (calibration)', () => {
    const w = buildWorld(SEED, 7 * 3600 + 40 * 60);
    const e = new SimEngine(w);
    for (let i = 0; i < 180; i++) e.tick();
    const m = deriveMetrics(e.snapshot(), DEMO_DEFAULTS);
    const gaps: number[] = [];
    for (const rm of m.per_route.values()) {
      if (!rm.vehicles) continue;
      const r = w.routeById.get(rm.route_id)!;
      gaps.push(Math.abs(base.routeMeanDev(r, 0, bucketOf(w.sim_time_s)).mean - rm.mean_dev_s));
    }
    gaps.sort((a, b) => a - b);
    // median route: norm within 4 minutes of live - close enough that "vs norm" reads as a
    // comparison, not a different scale
    expect(gaps[Math.floor(gaps.length / 2)]!).toBeLessThan(240);
  });
});
