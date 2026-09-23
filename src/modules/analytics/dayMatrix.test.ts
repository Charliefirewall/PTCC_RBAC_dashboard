import { describe, expect, it } from 'vitest';
import { buildRoutes } from '../../data/build';
import { buildBaseline, BUCKETS } from '../../sim/baseline';
import { dayMatrix } from './dayMatrix';

const SEED = 20260921;
const routes = buildRoutes(SEED).filter((r) => r.active);
const base = buildBaseline(SEED, routes);
const r7 = routes.find((r) => r.route_id === 'R7')!;

describe('route-profile day heatmap (E13)', () => {
  it('is 60 start-time rows x stops columns', () => {
    const m = dayMatrix(base, r7, 0, 0);
    expect(m).toHaveLength(BUCKETS);
    for (const row of m) expect(row).toHaveLength(base.hops(r7, 0).length);
  });

  it('Monday 08:00 start ends later than a Monday 11:00 start', () => {
    const m = dayMatrix(base, r7, 0, 0);
    expect(m[8]!.at(-1)!).toBeGreaterThan(m[20]!.at(-1)!); // bucket 8 = 08:00, 20 = 11:00
  });

  it('is minutes at 1 decimal, matching profile() means', () => {
    const m = dayMatrix(base, r7, 1, 4);
    const p = base.profile(r7, 1, 4, 30);
    p.forEach((n, i) => expect(m[30]![i]).toBe(+(n.mean / 60).toFixed(1)));
  });

  it('is deterministic', () => {
    expect(dayMatrix(buildBaseline(SEED, routes), r7, 0, 0)).toEqual(dayMatrix(base, r7, 0, 0));
  });
});
