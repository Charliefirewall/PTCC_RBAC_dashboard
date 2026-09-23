/**
 * Tier 1 - deterministic rule engine.
 *
 * "All Operational Data -> Rules & Thresholds -> Exceptions Become Alerts" (S10).
 * "The dashboard shall continuously analyze operational indicators and generate
 *  alerts when abnormal conditions are detected" (L1175).
 *
 * Each alert stores the observed value AND the threshold it broke, so "why did this
 * fire?" is answered by the evaluation record itself - not by an AI.
 *
 * Severity is the THREE-level alert scale (L1182-L1185). It is deliberately kept
 * separate from the FIVE-level event scale (R1433-R1440).
 */

import { isoAt } from '../sim/engine';
import type { Alert, AlertType, OperatorId, Route, Severity, SimSnapshot, Vehicle } from '../sim/types';
import { classifyHeadways, headwaysAlongRoute, routeDeviationStats } from './regularity';
import type { Thresholds } from './thresholds';
import { LEVEL_SEVERITY, sopLevel } from './severity';
import { segmentName } from '../data/segments';

export interface RouteMetrics {
  route_id: string;
  max_gap_s: number;
  min_headway_s: number;
  bunching_count: number;
  mean_dev_s: number;
  max_dev_s: number;
  on_time_pct: number;
  load_pct: number;
  pax: number;
  vehicles: number;
  planned_headway_s: number;
  state: 'normal' | 'slower' | 'disrupted' | 'noservice';
}

export interface DerivedMetrics {
  per_route: Map<string, RouteMetrics>;
  offline: { afc: number; cctv: number; tbox: number };
  offline_by_operator: Record<OperatorId, number>;
  in_service: number;
  routes_operating: number;
  ridership_today: number;
  network_uptime_pct: number;
  system_health_pct: number;
  /** S3 exception funnel. */
  funnel: { total: number; normal: number; attention: number; critical: number };
}

export function deriveMetrics(snap: SimSnapshot, th: Thresholds): DerivedMetrics {
  const per_route = new Map<string, RouteMetrics>();
  const vehicles = snap.vehicles;
  const byRoute = new Map<string, Vehicle[]>();
  for (const v of vehicles) {
    let a = byRoute.get(v.route_id);
    if (!a) byRoute.set(v.route_id, (a = []));
    a.push(v);
  }

  let in_service = 0;
  let ridership = 0;
  const offline = { afc: 0, cctv: 0, tbox: 0 };
  const offline_by_operator: Record<OperatorId, number> = { A: 0, B: 0, C: 0 };
  for (const v of vehicles) {
    if (v.status === 'in_service') in_service++;
    ridership += v.boardings_today;
    let bad = 0;
    if (v.equipment.afc === 'offline') (offline.afc++, bad++);
    if (v.equipment.cctv === 'offline') (offline.cctv++, bad++);
    if (v.equipment.tbox === 'offline') (offline.tbox++, bad++);
    if (bad) offline_by_operator[v.operator_id] += bad;
  }

  let routes_operating = 0;
  for (const r of snap.routes) {
    const on = (byRoute.get(r.route_id) ?? []).filter((v) => v.status === 'in_service');
    if (!r.active || on.length === 0) {
      per_route.set(r.route_id, emptyMetrics(r, th, on.length));
      continue;
    }
    routes_operating++;
    const planned = plannedHeadway(r, snap.sim_time_s);
    const hw = classifyHeadways(headwaysAlongRoute(r, on), planned, th);
    const dev = routeDeviationStats(r, on, th);
    const pax = on.reduce((s, v) => s + v.pax_count, 0);
    const cap = on.reduce((s, v) => s + v.capacity, 0);
    const load_pct = cap > 0 ? (pax / cap) * 100 : 0;
    per_route.set(r.route_id, {
      route_id: r.route_id,
      max_gap_s: hw.max_gap_s,
      min_headway_s: hw.min_headway_s,
      bunching_count: hw.bunching_count,
      mean_dev_s: dev.mean_s,
      max_dev_s: dev.max_s,
      on_time_pct: dev.on_time_pct,
      load_pct,
      pax,
      vehicles: on.length,
      planned_headway_s: planned,
      state: 'normal',
    });
  }

  const totalDevices = Math.max(1, in_service * 3);
  const badDevices = offline.afc + offline.cctv + offline.tbox;
  const system_health_pct = Math.max(0, 100 - (badDevices / totalDevices) * 100);

  return {
    per_route,
    offline,
    offline_by_operator,
    in_service,
    routes_operating,
    ridership_today: ridership,
    network_uptime_pct: 98, // S9 figure, held steady unless an outage scenario runs
    system_health_pct,
    funnel: { total: 0, normal: 0, attention: 0, critical: 0 }, // filled after rules run
  };
}

function emptyMetrics(r: Route, th: Thresholds, count: number): RouteMetrics {
  return {
    route_id: r.route_id,
    max_gap_s: 0,
    min_headway_s: 0,
    bunching_count: 0,
    mean_dev_s: 0,
    max_dev_s: 0,
    on_time_pct: 100,
    load_pct: 0,
    pax: 0,
    vehicles: count,
    planned_headway_s: r.planned_headway_s.offPeak,
    state: 'noservice',
  };
}

function plannedHeadway(r: Route, t: number): number {
  const h = (t % 86400) / 3600;
  if (h >= 6.5 && h < 9) return r.planned_headway_s.amPeak;
  if (h >= 17 && h < 19.5) return r.planned_headway_s.pmPeak;
  if (h >= 19.5 || h < 6.5) return r.planned_headway_s.evening;
  return r.planned_headway_s.offPeak;
}

// ---------------------------------------------------------------- impact score

const SEV_WEIGHT: Record<Severity, number> = { informational: 20, warning: 50, critical: 80 };

/**
 * "Prioritise by severity AND impact" (S3, S10); "a service deviation becomes more
 * important when the passenger impact is high" (S8). The formula itself is a demo
 * decision - the source states the principle, not the arithmetic.
 */
export function impactScore(severity: Severity, pax_affected: number, load_pct: number): number {
  return Math.round(
    SEV_WEIGHT[severity] + Math.min(20, Math.log10(pax_affected + 1) * 7 + (load_pct / 100) * 8),
  );
}

// ---------------------------------------------------------------- rules

interface Raw {
  rule_id: string;
  type: AlertType;
  severity: Severity;
  route_id?: string;
  vehicle_id?: string;
  operator_id?: OperatorId;
  title_key: string;
  params: Record<string, string | number>;
  metric: Alert['metric'];
  pax_affected: number;
  load_pct: number;
  tier: 1 | 3;
  level?: 1 | 2 | 3;
  routes_affected?: number;
}

export interface EvaluateResult {
  alerts: Alert[];
  raised: Alert[];
  cleared: string[];
}

interface HysteresisState {
  belowCount: Map<string, number>;
}

export function makeHysteresis(): HysteresisState {
  return { belowCount: new Map() };
}

export function evaluateRules(
  snap: SimSnapshot,
  m: DerivedMetrics,
  th: Thresholds,
  prev: readonly Alert[],
  hy: HysteresisState,
): EvaluateResult {
  const raws: Raw[] = [];
  const byId = new Map(snap.routes.map((r) => [r.route_id, r]));

  // ---- PTCC SOP ladder: how many routes are late by >= delay_l1_min right now.
  // Route MEAN lateness, the same signal the retired schedule_deviation rule used
  // (plan §13 Q1: switch to max if PTPD defines "affected" per bus).
  const worstBus = new Map<string, Vehicle>();
  for (const v of snap.vehicles) {
    if (v.status !== 'in_service') continue;
    const w = worstBus.get(v.route_id);
    if (!w || v.schedule_deviation > w.schedule_deviation) worstBus.set(v.route_id, v);
  }
  const late = [...m.per_route.values()]
    .filter((rm) => rm.vehicles > 0 && byId.get(rm.route_id)?.active && rm.mean_dev_s / 60 >= th.delay_l1_min)
    .sort((a, b) => b.mean_dev_s - a.mean_dev_s);
  const nAffected = late.length;

  // ---- route-level rules
  for (const rm of m.per_route.values()) {
    const r = byId.get(rm.route_id)!;
    if (!r.active || rm.vehicles === 0) continue;
    const planned = rm.planned_headway_s;

    // service gap (L1055; S8 "Service gap (28 min)"; S10 "Growing gap" = Warning)
    if (rm.max_gap_s > th.service_gap_max_s) {
      const critical = rm.max_gap_s > th.service_gap_max_s * 1.5 || rm.max_gap_s > planned * 2.5;
      raws.push({
        rule_id: 'service_gap',
        type: 'service_deviation',
        severity: critical ? 'critical' : 'warning',
        route_id: rm.route_id,
        title_key: 'alert.service_gap',
        params: { route: rm.route_id, min: Math.round(rm.max_gap_s / 60) },
        metric: { name: 'headway_s', value: Math.round(rm.max_gap_s), threshold: th.service_gap_max_s, unit: 's' },
        pax_affected: Math.round(rm.pax * 0.6),
        load_pct: rm.load_pct,
        tier: 1,
      });
    }

    // bunching (L1054, Top 3)
    if (rm.bunching_count > 0 && rm.min_headway_s < th.bunching_min_headway_s) {
      raws.push({
        rule_id: 'bunching',
        type: 'service_deviation',
        severity: 'warning',
        route_id: rm.route_id,
        title_key: 'alert.bunching',
        params: { route: rm.route_id, n: rm.bunching_count },
        metric: { name: 'min_headway_s', value: Math.round(rm.min_headway_s), threshold: th.bunching_min_headway_s, unit: 's' },
        pax_affected: Math.round(rm.pax * 0.3),
        load_pct: rm.load_pct,
        tier: 1,
      });
    }

    // delay SOP (PTCC note: 5 / 15 / 30 min x 1 / 5 routes). Replaces the single-threshold
    // schedule_deviation rule - same signal, and keeping both would double every delay row.
    if (rm.mean_dev_s / 60 >= th.delay_l1_min) {
      const min = rm.mean_dev_s / 60;
      const level = sopLevel(min, nAffected, th) as 1 | 2 | 3;
      const bus = worstBus.get(rm.route_id);
      raws.push({
        rule_id: 'delay_sop',
        type: 'service_deviation',
        severity: LEVEL_SEVERITY[level],
        route_id: rm.route_id,
        title_key: 'alert.delay',
        params: { route: rm.route_id, min: Math.round(min), level, n: nAffected, bus: bus?.vehicle_id ?? '' },
        metric: { name: 'delay_min', value: Math.round(min * 10) / 10, threshold: th.delay_l1_min, unit: 'min' },
        pax_affected: rm.pax,
        load_pct: rm.load_pct,
        tier: 1,
        level,
        routes_affected: nAffected,
      });
    }

    // overcrowding (L1021, L1042; S8 "R5 - Load 96 % - Overcrowded")
    if (rm.load_pct >= th.passenger_load_pct) {
      const critical = rm.load_pct >= th.passenger_load_critical_pct;
      raws.push({
        rule_id: 'overcrowding',
        type: 'overcrowding',
        severity: critical ? 'critical' : 'warning',
        route_id: rm.route_id,
        title_key: 'alert.overcrowding',
        params: { route: rm.route_id, pct: Math.round(rm.load_pct) },
        metric: { name: 'load_pct', value: Math.round(rm.load_pct), threshold: th.passenger_load_pct, unit: '%' },
        pax_affected: rm.pax,
        load_pct: rm.load_pct,
        tier: 1,
      });
    }
  }

  // ---- network delay: several routes late at once. The single carrier of the L3
  // "communicate with Traffic department" draft - one draft for the incident, not one per route.
  if (nAffected >= th.routes_affected_l2) {
    const maxMin = late[0]!.mean_dev_s / 60;
    const level = sopLevel(maxMin, nAffected, th) as 1 | 2 | 3;
    // E1: say WHERE - the road segment shared by the most late routes ("Peace Ave jam").
    // ponytail: English place names in params; the rules layer does not know the UI language.
    const shared = new Map<string, number>();
    for (const rm of late) for (const e of byId.get(rm.route_id)?.edges ?? []) shared.set(e.key, (shared.get(e.key) ?? 0) + 1);
    const corridor_key = [...shared].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0]?.[0] ?? '';
    raws.push({
      rule_id: 'delay_network',
      type: 'service_deviation',
      severity: LEVEL_SEVERITY[level],
      title_key: 'alert.delay_network',
      params: {
        n: nAffected,
        min: Math.round(maxMin),
        level,
        routes: late.slice(0, 5).map((r) => r.route_id).join(', '),
        corridor_key,
        corridor: corridor_key ? segmentName(corridor_key) : '—',
      },
      metric: { name: 'routes_affected', value: nAffected, threshold: th.routes_affected_l2, unit: '' },
      pax_affected: late.reduce((s2, r) => s2 + r.pax, 0),
      load_pct: 0,
      tier: 1,
      level,
      routes_affected: nAffected,
    });
  }

  // ---- vehicle-level rules
  for (const v of snap.vehicles) {
    if (v.status === 'breakdown') {
      raws.push(vehicleRaw(v, m, 'vehicle_breakdown', 'vehicle_safety', 'critical', 'alert.breakdown', {
        name: 'status', value: 1, threshold: 0, unit: '',
      }));
    }
    if (v.flags.panic) {
      raws.push(vehicleRaw(v, m, 'panic', 'vehicle_safety', 'critical', 'alert.panic', {
        name: 'panic', value: 1, threshold: 0, unit: '',
      }));
    }
    if (v.flags.accident) {
      raws.push(vehicleRaw(v, m, 'accident', 'vehicle_safety', 'critical', 'alert.accident', {
        name: 'accident', value: 1, threshold: 0, unit: '',
      }));
    }
    if (v.flags.route_deviation) {
      raws.push(vehicleRaw(v, m, 'route_deviation', 'service_deviation', 'warning', 'alert.route_deviation', {
        name: 'route_deviation', value: 1, threshold: 0, unit: '',
      }));
    }
    if (v.flags.harsh_braking) {
      raws.push(vehicleRaw(v, m, 'harsh_braking', 'vehicle_safety', 'warning', 'alert.harsh_braking', {
        name: 'harsh_braking', value: 1, threshold: 0, unit: '',
      }));
    }
    if (v.flags.overspeed) {
      raws.push(vehicleRaw(v, m, 'overspeed', 'vehicle_safety', 'warning', 'alert.overspeed', {
        name: 'speed', value: Math.round(v.speed), threshold: th.overspeed_kmh, unit: 'km/h',
      }));
    }
    // equipment failure (L1119-L1122)
    const dead = (['afc', 'cctv', 'tbox'] as const).filter((k) => v.equipment[k] === 'offline');
    if (dead.length && v.status === 'in_service') {
      raws.push({
        rule_id: `equipment_${dead[0]}`,
        type: 'equipment_failure',
        severity: 'warning',
        vehicle_id: v.vehicle_id,
        route_id: v.route_id,
        operator_id: v.operator_id,
        title_key: 'alert.equipment',
        params: { bus: v.vehicle_id, device: dead[0]!.toUpperCase() },
        metric: { name: 'offline_s', value: th.failure_duration_s + 1, threshold: th.failure_duration_s, unit: 's' },
        pax_affected: v.pax_count,
        load_pct: (v.pax_count / v.capacity) * 100,
        tier: 1,
      });
    }
  }

  // ---- Tier 3: repeated-failure pattern across an operator (L1124)
  for (const op of ['A', 'B', 'C'] as OperatorId[]) {
    const n = m.offline_by_operator[op];
    if (n >= 3) {
      raws.push({
        rule_id: 'repeated_failure',
        type: 'equipment_failure',
        severity: 'informational',
        operator_id: op,
        title_key: 'alert.repeated_failure',
        params: { operator: op, n },
        metric: { name: 'devices_offline', value: n, threshold: 3, unit: '' },
        pax_affected: 0,
        load_pct: 0,
        tier: 3,
      });
    }
  }

  // ---- reconcile against previous alerts: stable ids, hysteresis, no duplicates
  const now = isoAt(snap.sim_time_s);
  const prevById = new Map(prev.map((a) => [a.id, a]));
  const seen = new Set<string>();
  const alerts: Alert[] = [];
  const raised: Alert[] = [];

  for (const raw of raws) {
    const subject = raw.vehicle_id ?? raw.route_id ?? raw.operator_id ?? 'net';
    const id = `${raw.rule_id}:${subject}`;
    if (seen.has(id)) continue;
    seen.add(id);
    hy.belowCount.delete(id);
    const existing = prevById.get(id);
    const impact_score = impactScore(raw.severity, raw.pax_affected, raw.load_pct);
    if (existing) {
      const updated: Alert = {
        ...existing,
        severity: raw.severity,
        metric: raw.metric,
        params: raw.params,
        pax_affected: raw.pax_affected,
        impact_score,
        level: raw.level,
        routes_affected: raw.routes_affected,
      };
      alerts.push(updated);
    } else {
      const a: Alert = {
        id,
        rule_id: raw.rule_id,
        type: raw.type,
        severity: raw.severity,
        route_id: raw.route_id,
        vehicle_id: raw.vehicle_id,
        operator_id: raw.operator_id,
        title_key: raw.title_key,
        params: raw.params,
        raised_at: now,
        raised_at_s: snap.sim_time_s,
        metric: raw.metric,
        pax_affected: raw.pax_affected,
        impact_score,
        tier: raw.tier,
        acknowledged: false,
        level: raw.level,
        routes_affected: raw.routes_affected,
      };
      alerts.push(a);
      raised.push(a);
    }
  }

  // anything previously open but not re-raised: clear only after 2 consecutive misses
  const cleared: string[] = [];
  for (const a of prev) {
    if (seen.has(a.id)) continue;
    const n = (hy.belowCount.get(a.id) ?? 0) + 1;
    if (n >= 2) {
      hy.belowCount.delete(a.id);
      cleared.push(a.id);
    } else {
      hy.belowCount.set(a.id, n);
      alerts.push(a); // keep it open one more tick
    }
  }

  alerts.sort((x, y) => y.impact_score - x.impact_score || x.raised_at_s - y.raised_at_s);

  // S3 exception funnel: 1,100 -> 1,085 Normal / 10 Require Attention / 5 Critical.
  //
  // Counted from each vehicle's OWN condition, not by tarring every bus on a route
  // that has an alert. A route-level gap does not make all nine of its buses
  // abnormal - it makes the ones around the gap abnormal. Getting this wrong
  // destroys the deck's central claim that the operator looks at ~15, not 1,100.
  const criticalSet = new Set<string>();
  const attentionSet = new Set<string>();
  for (const v of snap.vehicles) {
    if (v.status === 'out_of_service') continue;
    const load = (v.pax_count / v.capacity) * 100;
    const dev = Math.abs(v.schedule_deviation);
    const deviceDown =
      v.equipment.afc === 'offline' || v.equipment.cctv === 'offline' || v.equipment.tbox === 'offline';
    const isCritical =
      v.status === 'breakdown' ||
      !!v.flags.panic ||
      !!v.flags.accident ||
      load >= th.passenger_load_critical_pct ||
      dev > th.schedule_deviation_s * 3;
    const needsAttention =
      dev > th.schedule_deviation_s ||
      load >= th.passenger_load_pct ||
      deviceDown ||
      !!v.flags.route_deviation ||
      !!v.flags.overspeed;
    if (isCritical) criticalSet.add(v.vehicle_id);
    else if (needsAttention) attentionSet.add(v.vehicle_id);
  }
  m.funnel = {
    total: m.in_service,
    normal: Math.max(0, m.in_service - attentionSet.size - criticalSet.size),
    attention: attentionSet.size,
    critical: criticalSet.size,
  };

  // route display state (S7 three-state legend, client-confirmed)
  for (const a of alerts) {
    if (!a.route_id) continue;
    const rm = m.per_route.get(a.route_id);
    if (!rm || rm.state === 'noservice') continue;
    if (a.severity === 'critical') rm.state = 'disrupted';
    else if (rm.state !== 'disrupted' && a.severity === 'warning') rm.state = 'slower';
  }

  return { alerts, raised, cleared };
}

function vehicleRaw(
  v: Vehicle,
  m: DerivedMetrics,
  rule_id: string,
  type: AlertType,
  severity: Severity,
  title_key: string,
  metric: Alert['metric'],
): Raw {
  const rm = m.per_route.get(v.route_id);
  return {
    rule_id,
    type,
    severity,
    vehicle_id: v.vehicle_id,
    route_id: v.route_id,
    operator_id: v.operator_id,
    title_key,
    params: { bus: v.vehicle_id, route: v.route_id },
    metric,
    pax_affected: v.pax_count,
    load_pct: rm?.load_pct ?? (v.pax_count / v.capacity) * 100,
    tier: 1,
  };
}
