import { describe, expect, it } from 'vitest';
import { deriveMetrics, evaluateRules, makeHysteresis } from './evaluate';
import { PLAYBOOKS, gateStageFor, playbookFor } from './playbooks';
import { DEMO_DEFAULTS } from './thresholds';
import type { Route, SimSnapshot, Vehicle } from '../sim/types';

const th = { ...DEMO_DEFAULTS };

const route = (id: string): Route => ({
  route_id: id, name_en: id, name_mn: id, operator_id: 'A', kind: 'city', active: true,
  shape: [[106.9, 47.91], [107.0, 47.91]], length_m: 10000, stops: [], demand_weight: 1,
  planned_headway_s: { amPeak: 600, offPeak: 600, pmPeak: 600, evening: 900 },
});

const bus = (id: string, route_id: string, progress: number, dev_s: number): Vehicle => ({
  vehicle_id: id, route_id, operator_id: 'A', timestamp: '2026-09-21T08:00:00+08:00',
  latitude: 47.91, longitude: 106.95, speed: 20, heading: 90, trip_progress: progress,
  direction: 0, schedule_deviation: dev_s, pax_count: 20, capacity: 80, status: 'in_service',
  door_status: 'normal', driver_status: 'normal', driver_id: 'D-0001', next_stop_id: null,
  distance_to_next_stop_m: 0, equipment: { afc: 'ok', cctv: 'ok', tbox: 'ok' }, flags: {},
  left_behind: 0, boardings_today: 0, km_today: 0,
});

/** n routes, each with two buses late by about `min` minutes (the first one worse). */
function run(n: number, min: number) {
  const routes = Array.from({ length: n }, (_, i) => route(`R${i + 1}`));
  const vs = routes.flatMap((r, i) => [
    bus(`${i}-a`, r.route_id, 0.2, min * 60 + 30),
    bus(`${i}-b`, r.route_id, 0.7, min * 60 - 30),
  ]);
  const snap: SimSnapshot = { sim_time_s: 28800, iso: '', vehicles: vs, routes, feed_stale: false };
  return evaluateRules(snap, deriveMetrics(snap, th), th, [], makeHysteresis()).alerts;
}

describe('delay SOP rule (PTCC 5/15/30 min x 1/5 routes)', () => {
  it('replaces the single-threshold schedule_deviation rule', () => {
    const a = run(1, 20);
    expect(a.some((x) => x.rule_id === 'schedule_deviation')).toBe(false);
    expect(a.filter((x) => x.rule_id === 'delay_sop')).toHaveLength(1);
  });

  it('grades one route by delay alone: 6 -> L1, 16 -> L2, 31 -> L3', () => {
    const lvl = (m: number) => run(1, m).find((x) => x.rule_id === 'delay_sop')?.level;
    expect(lvl(4)).toBeUndefined();
    expect(lvl(6)).toBe(1);
    expect(lvl(16)).toBe(2);
    expect(lvl(31)).toBe(3);
  });

  it('bumps the level and raises one network alert when >= 5 routes are late', () => {
    const four = run(4, 6);
    expect(four.find((x) => x.rule_id === 'delay_sop')!.level).toBe(1);
    expect(four.some((x) => x.rule_id === 'delay_network')).toBe(false);
    const five = run(5, 6);
    expect(five.filter((x) => x.rule_id === 'delay_sop').every((x) => x.level === 2 && x.routes_affected === 5)).toBe(true);
    const net = five.filter((x) => x.rule_id === 'delay_network');
    expect(net).toHaveLength(1);
    expect(net[0]!.level).toBe(2);
    expect(run(5, 16).find((x) => x.rule_id === 'delay_network')!.level).toBe(3);
  });

  it('names the worst bus so the alert can drill down to it', () => {
    const a = run(1, 10).find((x) => x.rule_id === 'delay_sop')!;
    expect(a.params.bus).toBe('0-a');
  });

  it('ranks an L3 above an L1 regardless of passengers', () => {
    const l3 = run(1, 31).find((x) => x.level === 3)!;
    const l1 = run(1, 6).find((x) => x.level === 1)!;
    expect(l3.impact_score).toBeGreaterThan(l1.impact_score);
  });
});

describe('delay playbooks', () => {
  it('maps the SOP level to its playbook', () => {
    expect(playbookFor('delay_sop', 1)).toBe('delay_l1');
    expect(playbookFor('delay_sop', 2)).toBe('delay_l2');
    expect(playbookFor('delay_sop', 3)).toBe('delay_l3');
    expect(playbookFor('delay_network', 2)).toBe('delay_l2');
    expect(playbookFor('delay_network', 3)).toBe('delay_l3');
  });

  it('makes L3 communicate with the Traffic department, gated at resolution', () => {
    expect(PLAYBOOKS.delay_l3.compulsory).toContain('pb.notify_traffic_department');
    expect(gateStageFor('pb.notify_traffic_department')).toBe('resolution');
  });

  it('gives every delay playbook a headline recommended action', () => {
    for (const id of ['delay_l1', 'delay_l2', 'delay_l3'] as const) {
      expect(PLAYBOOKS[id].recommended.length).toBeGreaterThan(0);
    }
  });
});
