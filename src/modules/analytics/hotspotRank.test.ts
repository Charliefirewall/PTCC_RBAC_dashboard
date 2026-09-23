import { describe, expect, it } from 'vitest';
import { buildRoutes } from '../../data/build';
import { segmentCentrality } from '../../data/segments';
import { buildBaseline } from '../../sim/baseline';
import { hotspotAction, LIVE_OVER_NORM_S_PER_KM, rankHotspots } from './hotspotRank';

const SEED = 20260921;
const routes = buildRoutes(SEED).filter((r) => r.active);
const base = buildBaseline(SEED, routes);
const total = (dow: number) => rankHotspots(base, routes, dow, 'am').reduce((s, h) => s + h.impact_s, 0);

describe('top-5 delay hotspots (3b)', () => {
  it('returns exactly 5 distinct segments, worst first', () => {
    const top = rankHotspots(base, routes, 0, 'am');
    expect(top).toHaveLength(5);
    expect(new Set(top.map((h) => h.key)).size).toBe(5);
    for (let i = 1; i < top.length; i++) expect(top[i - 1]!.impact_s).toBeGreaterThanOrEqual(top[i]!.impact_s);
    for (const h of top) expect(h.p10 <= h.mean && h.mean <= h.p90).toBe(true);
  });

  it('is deterministic', () => {
    expect(rankHotspots(buildBaseline(SEED, routes), routes, 0, 'pm')).toEqual(rankHotspots(base, routes, 0, 'pm'));
  });

  it('weekend AM peak loses less than weekday AM peak', () => {
    expect(total(5)).toBeLessThan(total(0));
    expect(total(6)).toBeLessThan(total(2));
  });

  it('live delay well above the norm means notify TCC now, whatever the segment', () => {
    for (const k of base.segKeys.slice(0, 5)) expect(hotspotAction(k, 'midday', LIVE_OVER_NORM_S_PER_KM + 1)).toBe('hs.act.tcc_notify');
    const central = base.segKeys.find((k) => segmentCentrality(k) === 2)!;
    expect(hotspotAction(central, 'am', LIVE_OVER_NORM_S_PER_KM - 1)).toBe('hs.act.signal_priority');
    expect(hotspotAction(central, 'midday', null)).toBe('hs.act.stop_spacing');
  });
});
