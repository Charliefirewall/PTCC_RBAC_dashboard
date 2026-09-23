import { describe, expect, it } from 'vitest';
import { buildRoutes } from '../../data/build';
import { segmentCentrality } from '../../data/segments';
import { buildBaseline } from '../../sim/baseline';
import { analyzeHotspots, draftFor, hotspotAction, hotspotActionDecision, LIVE_OVER_NORM_S_PER_KM, rankHotspots } from './hotspotRank';

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

  it('exposes transparent synthetic historical metrics and contribution across all eligible segments', () => {
    const analysis = analyzeHotspots(base, routes, { dow: 0, window: 'am' });
    expect(analysis.hotspots).toHaveLength(5);
    expect(analysis.assumptions.join(' ')).toMatch(/synthetic|estimate/i);
    for (const h of analysis.hotspots) {
      expect(h.evidence).toBe('synthetic_demo');
      expect(h.baseline_weeks).toBe(8);
      expect(h.delay_frequency_pct).toBeGreaterThanOrEqual(0);
      expect(h.delay_frequency_pct).toBeLessThanOrEqual(100);
      expect(h.affected_buses_est).toBeGreaterThanOrEqual(0);
      expect(h.affected_buses_pct).toBeCloseTo(h.delay_frequency_pct);
      expect(h.recurrence_pct).toBeGreaterThanOrEqual(0);
      expect(h.recurrence_pct).toBeLessThanOrEqual(100);
      expect(h.most_affected_days).toHaveLength(2);
      expect(h.most_affected_windows).toHaveLength(2);
      expect(h.historical_trend).toBe('not_available_stationary_demo');
      expect(h.contribution_pct).toBeGreaterThan(0);
      expect(h.recommendation_evidence.contribution_pct).toBe(h.contribution_pct);
    }
    // Denominator includes non-top-five segments, so displayed shares need not sum to 100.
    expect(analysis.hotspots.reduce((s, h) => s + h.contribution_pct, 0)).toBeLessThanOrEqual(100);
  });

  it('supports route, day and exact-start context with an upcoming-trip risk', () => {
    const route = routes.find((r) => (r.edges?.length ?? 0) >= 5)!;
    const a = analyzeHotspots(base, routes, { dow: 4, window: 'pm', startBucket: 47, routeId: route.route_id });
    expect(a.context).toEqual({ dow: 4, window: 'pm', startBucket: 47, routeId: route.route_id });
    expect(a.hotspots.length).toBeGreaterThan(0);
    for (const h of a.hotspots) {
      expect(h.routes).toEqual([route.route_id]);
      expect(h.upcoming_risk.route_id).toBe(route.route_id);
      expect(h.upcoming_risk.start_bucket).toBe(47);
      expect(h.upcoming_risk.score).toBeGreaterThanOrEqual(0);
      expect(h.upcoming_risk.score).toBeLessThanOrEqual(100);
      expect(h.recommendation_evidence.selected_start_bucket).toBe(47);
      expect(h.recommendation_evidence.selected_route_id).toBe(route.route_id);
    }
    expect(analyzeHotspots(base, routes, { dow: 4, window: 'pm', startBucket: 47, routeId: route.route_id })).toEqual(a);
  });

  it('returns no candidates for an unknown route instead of silently claiming network evidence', () => {
    const a = analyzeHotspots(base, routes, { dow: 0, window: 'all', startBucket: 8, routeId: 'UNKNOWN' });
    expect(a.hotspots).toEqual([]);
    expect(a.context.routeId).toBeNull();
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

  it('makes the fixed live-margin trigger and rationale machine-readable', () => {
    const key = base.segKeys[0]!;
    const atThreshold = hotspotActionDecision(key, 'am', LIVE_OVER_NORM_S_PER_KM);
    expect(atThreshold.trigger).not.toBe('live_margin_exceeded');
    const exceeded = hotspotActionDecision(key, 'am', LIVE_OVER_NORM_S_PER_KM + 0.1);
    expect(exceeded).toMatchObject({
      action: 'hs.act.tcc_notify',
      trigger: 'live_margin_exceeded',
      threshold_s_per_km: LIVE_OVER_NORM_S_PER_KM,
    });
    expect(exceeded.rationale).toContainEqual({ key: 'trigger_margin_s_per_km', value: LIVE_OVER_NORM_S_PER_KM });
  });
});

describe('hotspot action -> coordination draft (E14)', () => {
  it('signal, bus-lane and notify go to TCC; timetable and stop work go to the operator', () => {
    for (const a of ['hs.act.tcc_notify', 'hs.act.signal_priority', 'hs.act.bus_lane'] as const)
      expect(draftFor(a)).toEqual({ recipient: 'tcc', message_type: 'coordination_request' });
    for (const a of ['hs.act.schedule_pad', 'hs.act.stop_spacing'] as const)
      expect(draftFor(a)).toEqual({ recipient: 'bus_operator', message_type: 'operational_instruction' });
  });
});
