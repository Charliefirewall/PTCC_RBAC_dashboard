/**
 * Configurable thresholds.
 *
 * EVERY parameter name below is taken from the design document's Tables 9-14
 * (L1003-L1163). EVERY value is a DEMO DEFAULT: the source states no numeric
 * threshold anywhere - all six configurable-parameter tables are value-free
 * (verified against the corrected dump, R1331 "PTCC administrators shall
 * configure"). The Settings panel says so on every field.
 *
 * The only band set that IS in the source is the passenger-load heat map on
 * Slide 8: >90 / 70-90 / 50-70 / 30-50 / <30 %.
 */

import type { AlertType } from '../sim/types';
import type { RegularityThresholds } from './regularity';

export interface Thresholds extends RegularityThresholds {
  // Table 10 - passenger demand
  passenger_load_pct: number;
  passenger_load_critical_pct: number;
  demand_anomaly_pct: number;
  demand_aggregation_min: number;
  baseline_period_min: number;
  // Table 11 - service regularity
  top_route_ranking_n: number;
  bunching_ranking_n: number;
  monitoring_interval_s: number;
  // Table 12 - revenue
  revenue_anomaly_pct: number;
  revenue_aggregation_min: number;
  // Table 13 - system health
  failure_duration_s: number;
  health_polling_s: number;
  // Table 14 - operator performance
  distance_aggregation_min: number;
  // Table 9 - live video
  video_trigger_events: AlertType[];
  max_concurrent_streams: number;
  // safety (demo values; the source names the events, not the limits)
  overspeed_kmh: number;
  /*
   * Depot capacity + consumables (plan §9.1(a), §9.2 class B, backlog 47/48).
   *
   * These are in a different class from everything above. Tables 9-14 at least NAME the
   * parameters above; the source names none of these, because the source has no depot
   * entity at all. Every value here is ours. They live in this file - rather than as
   * literals in the depot module - so each one appears in Settings AND becomes a row on
   * the #/provenance questionnaire: ten new questions for PTPD, which is the honest
   * outcome when a client gives you no data.
   */
  depot_horizon_weeks: number;
  depot_capacity_warn_pct: number;
  depot_capacity_over_pct: number;
  depot_hours_per_intervention: number;
  depot_routine_hours_per_bus_week: number;
  consumable_cover_weeks: number;
  interval_km_brakes: number;
  interval_km_tyres: number;
  interval_km_clutch: number;
  interval_km_battery: number;
  /*
   * Component RUL model (predict.ts, plan §9.2 class A "Component-level RUL + zones",
   * §17 items 5.1-5.3, backlog 18).
   *
   * Same class as the depot block above: named by nobody, invented by us. The four
   * km-based lives the model needs for brakes, tyres, clutch and battery are ALREADY
   * here as `interval_km_*` - the model reuses those rather than declaring a second,
   * silently disagreeing set. Only what has no home yet is added below.
   *
   * Everything here is a coefficient that changes a number on screen, which is exactly
   * why it is a threshold and not a constant: it lands in Settings, and from there on
   * the #/provenance questionnaire with no source value against it (§9.3, §15.1).
   */
  pred_driveline_life_km: number;
  pred_door_life_days: number;
  pred_hvac_life_days: number;
  pred_device_mtbf_days: number;
  /** Strength of the whole duty matrix. 0 = every bus gets the book life, unadjusted. */
  pred_duty_sensitivity: number;
  /** Daily km assumed when no odometer series is available - it never is (input 7). */
  pred_assumed_daily_km: number;
  pred_zone_critical_days: number;
  pred_zone_high_days: number;
  pred_zone_elevated_days: number;
  /** Half-width of the p10-p90 interval at full confidence, per cent of the median. */
  pred_interval_spread_pct: number;
}

/** Slide 8 heat-map bands - the ONLY threshold set that exists in any source. */
export const LOAD_BANDS = [
  { min: 90, key: 'band.over90', token: '--color-load-90', color: 'var(--color-load-90)' },
  { min: 70, key: 'band.70to90', token: '--color-load-70', color: 'var(--color-load-70)' },
  { min: 50, key: 'band.50to70', token: '--color-load-50', color: 'var(--color-load-50)' },
  { min: 30, key: 'band.30to50', token: '--color-load-30', color: 'var(--color-load-30)' },
  { min: 0, key: 'band.under30', token: '--color-load-0', color: 'var(--color-load-0)' },
] as const;

/**
 * Resolve a band to a literal colour.
 *
 * Needed wherever the colour is handed to a canvas - MapLibre paint properties and
 * ECharts itemStyle - because neither can resolve `var()`. DOM inline styles should use
 * `band.color` directly so they keep following the theme without a re-render.
 */
export function bandColor(b: { token: string }, fallback = '#888888'): string {
  if (typeof document === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(b.token).trim() || fallback;
}

export function bandOf(pct: number) {
  return LOAD_BANDS.find((b) => pct >= b.min) ?? LOAD_BANDS[LOAD_BANDS.length - 1]!;
}

export const DEMO_DEFAULTS: Thresholds = {
  // regularity
  schedule_deviation_s: 300, // S8 colouring: +5..+9 amber, +12/+18 red
  bunching_min_headway_s: 120,
  service_gap_max_s: 1200, // R7 plan 600 s -> the 28-min gap (1680 s) is Critical
  // passenger
  passenger_load_pct: 90, // top S8 band
  passenger_load_critical_pct: 95, // R5 at 96 % -> Critical (S8)
  demand_anomaly_pct: 30,
  demand_aggregation_min: 15,
  baseline_period_min: 60,
  // rankings
  top_route_ranking_n: 10, // L1053
  bunching_ranking_n: 3, // L1054
  monitoring_interval_s: 300,
  // revenue
  revenue_anomaly_pct: 15,
  revenue_aggregation_min: 60,
  // health
  failure_duration_s: 600,
  health_polling_s: 30,
  // operator
  distance_aggregation_min: 60,
  // video
  video_trigger_events: ['vehicle_safety', 'security'],
  max_concurrent_streams: 8, // L540-L549 states 8-24; lower bound taken
  overspeed_kmh: 60,
  // depot + consumables - ALL invented, see the interface comment
  depot_horizon_weeks: 12,
  depot_capacity_warn_pct: 85,
  depot_capacity_over_pct: 100,
  depot_hours_per_intervention: 6,
  depot_routine_hours_per_bus_week: 0.6,
  consumable_cover_weeks: 3,
  interval_km_brakes: 40_000,
  interval_km_tyres: 80_000,
  interval_km_clutch: 120_000,
  interval_km_battery: 150_000,
  // component RUL model - ALL invented, see the interface comment
  pred_driveline_life_km: 400_000,
  pred_door_life_days: 540,
  pred_hvac_life_days: 1_100,
  pred_device_mtbf_days: 400,
  pred_duty_sensitivity: 0.8,
  pred_assumed_daily_km: 180,
  pred_zone_critical_days: 14,
  pred_zone_high_days: 45,
  pred_zone_elevated_days: 120,
  pred_interval_spread_pct: 25,
};

/**
 * Per-field provenance shown in Settings and on the Evidence & Open Questions page.
 *
 * `sourceValue` is the value the CLIENT'S OWN material supplies, where it supplies one.
 * Most parameters are named by Tables 9-14 with no value - that absence is the whole
 * point of the provenance page. But four are NOT absent, and the inline citations below
 * have always said so. Printing "none" over them was a false claim about the client's
 * document, checkable against it in minutes. Leave `sourceValue` undefined only when the
 * source genuinely gives nothing.
 */
export const THRESHOLD_META: Record<
  keyof Thresholds,
  { table: string; unit: string; min: number; max: number; step: number; labelKey: string; sourceValue?: string }
> = {
  schedule_deviation_s: { table: 'Table 11', unit: 's', min: 60, max: 1800, step: 30, labelKey: 'th.schedule_deviation_s' },
  bunching_min_headway_s: { table: 'Table 11', unit: 's', min: 30, max: 600, step: 10, labelKey: 'th.bunching_min_headway_s' },
  service_gap_max_s: { table: 'Table 11', unit: 's', min: 300, max: 3600, step: 60, labelKey: 'th.service_gap_max_s' },
  passenger_load_pct: { table: 'Table 10', unit: '%', min: 40, max: 100, step: 1, labelKey: 'th.passenger_load_pct', sourceValue: '90 (Slide 8, top load band)' },
  passenger_load_critical_pct: { table: 'Table 10', unit: '%', min: 50, max: 110, step: 1, labelKey: 'th.passenger_load_critical_pct' },
  demand_anomaly_pct: { table: 'Table 10', unit: '%', min: 5, max: 100, step: 5, labelKey: 'th.demand_anomaly_pct' },
  demand_aggregation_min: { table: 'Table 10', unit: 'min', min: 5, max: 60, step: 5, labelKey: 'th.demand_aggregation_min' },
  baseline_period_min: { table: 'Table 10', unit: 'min', min: 15, max: 240, step: 15, labelKey: 'th.baseline_period_min' },
  top_route_ranking_n: { table: 'Table 11', unit: '', min: 3, max: 20, step: 1, labelKey: 'th.top_route_ranking_n', sourceValue: '10 (L1053: "Top 10 with maximum deviation")' },
  bunching_ranking_n: { table: 'Table 11', unit: '', min: 1, max: 10, step: 1, labelKey: 'th.bunching_ranking_n', sourceValue: '3 (L1054: "Top 3 routes with bus bunching")' },
  monitoring_interval_s: { table: 'Table 11', unit: 's', min: 60, max: 1800, step: 60, labelKey: 'th.monitoring_interval_s' },
  revenue_anomaly_pct: { table: 'Table 12', unit: '%', min: 5, max: 50, step: 1, labelKey: 'th.revenue_anomaly_pct' },
  revenue_aggregation_min: { table: 'Table 12', unit: 'min', min: 15, max: 240, step: 15, labelKey: 'th.revenue_aggregation_min' },
  failure_duration_s: { table: 'Table 13', unit: 's', min: 60, max: 3600, step: 60, labelKey: 'th.failure_duration_s' },
  health_polling_s: { table: 'Table 13', unit: 's', min: 5, max: 300, step: 5, labelKey: 'th.health_polling_s' },
  distance_aggregation_min: { table: 'Table 14', unit: 'min', min: 15, max: 1440, step: 15, labelKey: 'th.distance_aggregation_min' },
  video_trigger_events: { table: 'Table 9', unit: '', min: 0, max: 0, step: 0, labelKey: 'th.video_trigger_events' },
  max_concurrent_streams: { table: 'Table 9', unit: '', min: 1, max: 24, step: 1, labelKey: 'th.max_concurrent_streams', sourceValue: '8-24 (L545); lower bound taken' },
  overspeed_kmh: { table: '—', unit: 'km/h', min: 30, max: 120, step: 5, labelKey: 'th.overspeed_kmh' },
  // Table '—' deliberately: these belong to no source table, and the em-dash group is
  // how Settings already renders "named by nobody".
  depot_horizon_weeks: { table: '—', unit: 'wk', min: 4, max: 26, step: 1, labelKey: 'th.depot_horizon_weeks' },
  depot_capacity_warn_pct: { table: '—', unit: '%', min: 50, max: 100, step: 5, labelKey: 'th.depot_capacity_warn_pct' },
  depot_capacity_over_pct: { table: '—', unit: '%', min: 80, max: 130, step: 5, labelKey: 'th.depot_capacity_over_pct' },
  depot_hours_per_intervention: { table: '—', unit: 'h', min: 1, max: 24, step: 0.5, labelKey: 'th.depot_hours_per_intervention' },
  depot_routine_hours_per_bus_week: { table: '—', unit: 'h', min: 0, max: 5, step: 0.1, labelKey: 'th.depot_routine_hours_per_bus_week' },
  consumable_cover_weeks: { table: '—', unit: 'wk', min: 1, max: 12, step: 1, labelKey: 'th.consumable_cover_weeks' },
  interval_km_brakes: { table: '—', unit: 'km', min: 10_000, max: 120_000, step: 5_000, labelKey: 'th.interval_km_brakes' },
  interval_km_tyres: { table: '—', unit: 'km', min: 20_000, max: 200_000, step: 5_000, labelKey: 'th.interval_km_tyres' },
  interval_km_clutch: { table: '—', unit: 'km', min: 30_000, max: 300_000, step: 10_000, labelKey: 'th.interval_km_clutch' },
  interval_km_battery: { table: '—', unit: 'km', min: 30_000, max: 300_000, step: 10_000, labelKey: 'th.interval_km_battery' },
  // Component RUL model. Same em-dash group: no source table names any of them.
  pred_driveline_life_km: { table: '—', unit: 'km', min: 100_000, max: 900_000, step: 25_000, labelKey: 'th.pred_driveline_life_km' },
  pred_door_life_days: { table: '—', unit: 'd', min: 90, max: 1_800, step: 30, labelKey: 'th.pred_door_life_days' },
  pred_hvac_life_days: { table: '—', unit: 'd', min: 180, max: 3_000, step: 30, labelKey: 'th.pred_hvac_life_days' },
  pred_device_mtbf_days: { table: '—', unit: 'd', min: 60, max: 1_500, step: 30, labelKey: 'th.pred_device_mtbf_days' },
  pred_duty_sensitivity: { table: '—', unit: '×', min: 0, max: 2, step: 0.1, labelKey: 'th.pred_duty_sensitivity' },
  pred_assumed_daily_km: { table: '—', unit: 'km', min: 60, max: 400, step: 10, labelKey: 'th.pred_assumed_daily_km' },
  pred_zone_critical_days: { table: '—', unit: 'd', min: 1, max: 60, step: 1, labelKey: 'th.pred_zone_critical_days' },
  pred_zone_high_days: { table: '—', unit: 'd', min: 7, max: 120, step: 1, labelKey: 'th.pred_zone_high_days' },
  pred_zone_elevated_days: { table: '—', unit: 'd', min: 30, max: 365, step: 5, labelKey: 'th.pred_zone_elevated_days' },
  pred_interval_spread_pct: { table: '—', unit: '%', min: 5, max: 60, step: 5, labelKey: 'th.pred_interval_spread_pct' },
};
