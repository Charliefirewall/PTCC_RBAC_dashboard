/**
 * Deterministic pre-trip route forecast.
 *
 * The eight-week baseline in sim/baseline is synthetic because no historical AVL
 * extract is available.  This model keeps that norm visible and separately layers on
 * the current, simulated operating evidence that actually exists:
 *
 *  - the difference between the route's current mean deviation and its norm now; and
 *  - recent stop-to-stop observations on each road segment, shrunk when samples are few.
 *
 * It is deliberately not ML and it does not invent weather, traffic, incidents, or
 * policy. Given the same World and selection it is byte-for-byte deterministic and
 * does not mutate either input.
 */

import { baselineOf, bucketOf, bucketStartS, BUCKETS, liveSegExcess, SIM_DOW, type Baseline } from '../../sim/baseline';
import type { Evidence, Route, World } from '../../sim/types';

export type ForecastPerformanceState = 'within_norm' | 'delay' | 'significant' | 'recovery';

export interface RouteForecastSelection {
  routeId: string;
  direction: 0 | 1;
  /** 0 = Monday ... 6 = Sunday. */
  dow: number;
  /** 15-minute service bucket; 0 = 06:00. */
  startBucket: number;
  /** Minutes for current route drift to decay towards the selected historical norm. */
  tauMin?: number;
}
export interface RouteForecastEvidence {
  source: 'synthetic_8_week_baseline_plus_live_simulation';
  evidence: Evidence;
  baselineWeeks: number;
  routeVehicleCount: number;
  liveSegmentSampleCount: number;
  liveSegmentCoverage: number;
  /** Honest cap while both history and current telemetry are simulated. */
  confidenceCeiling: number;
  methodology: string;
  limitations: string[];
}

export interface RouteForecastStop {
  k: number;
  stopId: string;
  stopNameEn: string;
  stopNameMn: string;
  segmentKey: string | null;
  scheduledArrivalS: number;
  normArrivalS: number;
  forecastArrivalS: number;
  scheduledTravelTimeS: number;
  normTravelTimeS: number;
  forecastTravelTimeS: number;
  normDeviationS: number;
  forecastDeviationS: number;
  /** Schedule-relative deviation at this stop; explicit alias for table/chart consumers. */
  cumulativeForecastDeviationS: number;
  /** Deviation gained (positive) or recovered (negative) since the prior stop. */
  hopForecastAccumulationS: number;
  state: ForecastPerformanceState;
  /** 0..1; capped because the supporting history is synthetic. */
  confidence: number;
}

export interface RouteTripForecast {
  routeId: string;
  direction: 0 | 1;
  dow: number;
  startBucket: number;
  startTimeS: number;
  plannedDurationS: number;
  normDurationS: number;
  forecastDurationS: number;
  confidence: number;
  evidence: RouteForecastEvidence;
  stops: RouteForecastStop[];
}

const CONFIDENCE_CEILING = 0.6;
const DEFAULT_TAU_MIN = 30;
const SAMPLE_SHRINK_N = 4;

function finiteMean(values: readonly number[]): number | null {
  const xs = values.filter(Number.isFinite);
  return xs.length ? xs.reduce((sum, x) => sum + x, 0) / xs.length : null;
}

function routeVehicles(w: World, route: Route, direction: 0 | 1) {
  const inDirection = w.vehicles.filter((v) => v.route_id === route.route_id && v.direction === direction && v.status === 'in_service');
  return inDirection.length ? inDirection : w.vehicles.filter((v) => v.route_id === route.route_id && v.status === 'in_service');
}

function validateSelection(w: World, selection: RouteForecastSelection): Route {
  const route = w.routeById.get(selection.routeId);
  if (!route) throw new Error(`Unknown route: ${selection.routeId}`);
  if (selection.direction !== 0 && selection.direction !== 1) throw new Error('direction must be 0 or 1');
  if (!Number.isInteger(selection.dow) || selection.dow < 0 || selection.dow > 6) throw new Error('dow must be an integer from 0 to 6');
  if (!Number.isInteger(selection.startBucket) || selection.startBucket < 0 || selection.startBucket >= BUCKETS) {
    throw new Error(`startBucket must be an integer from 0 to ${BUCKETS - 1}`);
  }
  if (selection.tauMin !== undefined && (!Number.isFinite(selection.tauMin) || selection.tauMin <= 0)) {
    throw new Error('tauMin must be greater than zero');
  }
  return route;
}

function stateOf(
  forecast: number,
  normMean: number,
  normP90: number,
  hopChange: number,
  k: number,
): ForecastPerformanceState {
  // Recovery is a journey transition, so it cannot apply at the departure stop.
  if (k > 0 && hopChange < -5) return 'recovery';
  if (forecast > normP90) return 'significant';
  if (forecast > Math.max(0, normMean) + 1) return 'delay';
  return 'within_norm';
}

/**
 * Build a complete, first-to-last-stop pre-trip forecast for one route selection.
 * Pure for a given World snapshot: all maps/rings are read only and nothing is cached.
 */
export function buildPreTripRouteForecast(w: World, selection: RouteForecastSelection): RouteTripForecast {
  const route = validateSelection(w, selection);
  const base: Baseline = baselineOf(w);
  const hops = base.hops(route, selection.direction);
  const norm = base.profile(route, selection.direction, selection.dow, selection.startBucket);
  const startTimeS = bucketStartS(selection.startBucket);
  const tauMin = selection.tauMin ?? DEFAULT_TAU_MIN;

  const vehicles = routeVehicles(w, route, selection.direction);
  const observedRouteMean = finiteMean(vehicles.map((v) => v.schedule_deviation));
  const normNow = base.routeMeanDev(route, SIM_DOW, bucketOf(w.sim_time_s)).mean;
  const routeDriftS = observedRouteMean === null ? 0 : observedRouteMean - normNow;

  const uniqueSegments = new Set(hops.flatMap((h) => (h.seg_key ? [h.seg_key] : [])));
  const liveBySegment = new Map<string, { residualPerKm: number; n: number }>();
  let liveSegmentSampleCount = 0;
  let coveredSegments = 0;
  for (const key of uniqueSegments) {
    const live = liveSegExcess(w, key);
    liveSegmentSampleCount += live.n;
    if (!live.n) continue;
    coveredSegments++;
    const historicalNow = base.segExcess(key, SIM_DOW, bucketOf(w.sim_time_s));
    // Sparse observations are evidence, not truth. Shrink them towards zero residual.
    const weight = live.n / (live.n + SAMPLE_SHRINK_N);
    const boundedResidual = Math.max(-historicalNow.sd * 2, Math.min(historicalNow.sd * 2, live.mean - historicalNow.mean));
    liveBySegment.set(key, { residualPerKm: boundedResidual * weight, n: live.n });
  }

  const liveSegmentCoverage = uniqueSegments.size ? coveredSegments / uniqueSegments.size : 0;
  // Transparent observability heuristic, capped because every source is simulated.
  const confidence = Math.min(
    CONFIDENCE_CEILING,
    0.35 + (vehicles.length ? 0.1 : 0) + liveSegmentCoverage * 0.15,
  );

  let cumulativeSegmentResidualS = 0;
  let previousForecastDeviationS = 0;
  const stops: RouteForecastStop[] = hops.map((hop, i) => {
    if (hop.seg_key) {
      const observed = liveBySegment.get(hop.seg_key);
      if (observed) cumulativeSegmentResidualS += observed.residualPerKm * hop.hop_km;
    }
    const fade = Math.exp(-(hop.offset_s / 60) / tauMin);
    const normAtStop = norm[i]!;
    // Current route drift and recent segment residuals lose influence further into the
    // future; the selected day/time norm remains the long-run destination of the model.
    const forecastDeviationS = normAtStop.mean + (routeDriftS + cumulativeSegmentResidualS) * fade;
    const hopForecastAccumulationS = i === 0 ? 0 : forecastDeviationS - previousForecastDeviationS;
    previousForecastDeviationS = forecastDeviationS;
    const scheduledArrivalS = startTimeS + hop.offset_s;
    const normArrivalS = scheduledArrivalS + normAtStop.mean;
    const forecastArrivalS = scheduledArrivalS + forecastDeviationS;
    return {
      k: hop.k,
      stopId: hop.stop.stop_id,
      stopNameEn: hop.stop.name_en,
      stopNameMn: hop.stop.name_mn,
      segmentKey: hop.seg_key,
      scheduledArrivalS,
      normArrivalS,
      forecastArrivalS,
      scheduledTravelTimeS: hop.offset_s,
      normTravelTimeS: normArrivalS - startTimeS,
      forecastTravelTimeS: forecastArrivalS - startTimeS,
      normDeviationS: normAtStop.mean,
      forecastDeviationS,
      cumulativeForecastDeviationS: forecastDeviationS,
      hopForecastAccumulationS,
      state: stateOf(forecastDeviationS, normAtStop.mean, normAtStop.p90, hopForecastAccumulationS, i),
      confidence: Math.max(0, confidence - (hop.offset_s / Math.max(1, hops.at(-1)?.offset_s ?? 1)) * 0.03),
    };
  });

  const last = stops.at(-1);
  const first = stops[0];
  const plannedDurationS = hops.at(-1)?.offset_s ?? 0;
  const normDurationS = last && first ? last.normArrivalS - first.normArrivalS : 0;
  const forecastDurationS = last && first ? last.forecastArrivalS - first.forecastArrivalS : 0;
  return {
    routeId: route.route_id,
    direction: selection.direction,
    dow: selection.dow,
    startBucket: selection.startBucket,
    startTimeS,
    plannedDurationS,
    normDurationS,
    forecastDurationS,
    confidence,
    evidence: {
      source: 'synthetic_8_week_baseline_plus_live_simulation',
      evidence: 'ASSUMPTION',
      baselineWeeks: base.weeks,
      routeVehicleCount: vehicles.length,
      liveSegmentSampleCount,
      liveSegmentCoverage,
      confidenceCeiling: CONFIDENCE_CEILING,
      methodology: 'Selected day/time synthetic norm plus decaying current route drift and shrinkage-weighted recent segment residuals.',
      limitations: [
        'No production historical AVL extract is connected; the eight-week norm is deterministic simulated data.',
        'Current route and segment observations come from the live simulation, not field telemetry.',
        'No weather, roadworks, event calendar, or Traffic Department feed is available.',
      ],
    },
    stops,
  };
}
