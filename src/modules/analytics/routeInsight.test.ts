import { describe, expect, it } from 'vitest';
import { buildRoutes } from '../../data/build';
import { buildBaseline, HOT_SEGMENTS } from '../../sim/baseline';
import { routeInsight } from './routeInsight';

const SEED = 20260921;
const routes = buildRoutes(SEED).filter((r) => r.active);
const base = buildBaseline(SEED, routes);
const r7 = routes.find((r) => r.route_id === 'R7')!;
const hops = base.hops(r7, 0);
const MON = 0, FRI = 4, SUN = 6, B0800 = 8;

describe('route-profile insight strip', () => {
  const fri = base.profile(r7, 0, FRI, B0800);
  const sun = base.profile(r7, 0, SUN, B0800);
  const ins = routeInsight(hops, fri, sun);

  it('last-stop delay is profile()\'s last mean, band included', () => {
    expect(ins.end).toEqual(fri.at(-1));
    expect(ins.endCmp).toEqual(sun.at(-1));
  });

  it('Fri 08:00 (peak, x1.15) is worse on R7 than Sun 08:00 (weekend, x0.55)', () => {
    expect(ins.diff!).toBeGreaterThan(0);
    // and the reverse comparison flips the sign
    expect(routeInsight(hops, sun, fri).diff!).toBeCloseTo(-ins.diff!, 6);
  });

  it('per-hop delays add back up to the last-stop delay', () => {
    expect(ins.hop.reduce((a, b) => a + b, 0)).toBeCloseTo(ins.end.mean, 3);
    expect(ins.hop[0]).toBe(0);
  });

  it('the worst segment on R7 is one of the pinned chronic hot spots', () => {
    expect(HOT_SEGMENTS).toContain(ins.worstSeg!.key);
    expect(ins.worstSeg!.s).toBeGreaterThan(0);
  });

  it('fastest-growing stop is a real hop with a road segment behind it', () => {
    expect(ins.fastestK).toBeGreaterThan(0);
    expect(hops[ins.fastestK]!.seg_key).not.toBeNull();
  });

  it('planned duration is the last stop\'s planned offset; no compare -> no diff', () => {
    const mon = routeInsight(hops, base.profile(r7, 0, MON, B0800), null);
    expect(mon.plannedS).toBe(hops.at(-1)!.offset_s);
    expect(mon.diff).toBeNull();
    expect(mon.hopCmp).toBeNull();
    expect(mon.pct).toBeCloseTo(mon.end.mean / mon.plannedS, 9);
  });
});
