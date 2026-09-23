/**
 * Forecast store. Kept OUT of useAlerts on purpose: a forecast is not an alert, can never
 * be validated into an event, and never triggers the SOP runner (store/sop.ts).
 *
 * Also holds the watch list (E8) and the forecast-vs-actual scorecard (E7).
 */

import { create } from 'zustand';
import { computeForecast, HORIZONS, watchList, type DevSample, type ForecastAlert, type Horizon, type WatchItem } from '../rules/forecast';
import type { DerivedMetrics } from '../rules/evaluate';
import { emptyScorecard, recordForecasts, scoreDue, type Scorecard } from '../rules/scorecard';
import type { Thresholds } from '../rules/thresholds';
import type { Alert, World } from '../sim/types';

interface ForecastState {
  byHorizon: Record<Horizon, ForecastAlert[]>;
  watch: Record<Horizon, WatchItem[]>;
  score: Scorecard;
  computed_at_s: number;
}

const empty = <T,>() => Object.fromEntries(HORIZONS.map((h) => [h, []])) as unknown as Record<Horizon, T[]>;

export const useForecast = create<ForecastState>(() => ({
  byHorizon: empty<ForecastAlert>(),
  watch: empty<WatchItem>(),
  score: emptyScorecard(),
  computed_at_s: -Infinity,
}));

/**
 * Recent mean deviation per route - the forecast reads its TREND (rules/forecast.ts). One
 * sample every HIST_EVERY_S of sim time, kept for HIST_KEEP_S.
 */
const HIST_EVERY_S = 30;
const HIST_KEEP_S = 900;
export const devHistory = new Map<string, DevSample[]>();
let lastSample_s = -Infinity;

function sampleHistory(now_s: number, m: DerivedMetrics): void {
  if (now_s - lastSample_s < HIST_EVERY_S) return;
  lastSample_s = now_s;
  for (const rm of m.per_route.values()) {
    if (!rm.vehicles) continue;
    const a = devHistory.get(rm.route_id) ?? [];
    a.push({ t: now_s, v: rm.mean_dev_s });
    while (a.length && now_s - a[0]!.t > HIST_KEEP_S) a.shift();
    devHistory.set(rm.route_id, a);
  }
}

/** Recompute when `refresh_s` of sim time has passed (or `force`). Cheap: ~100 routes x 4 horizons. */
export function maybeForecast(
  w: World,
  m: DerivedMetrics,
  th: Thresholds,
  dow: number,
  alerts: readonly Alert[],
  force = false,
): void {
  sampleHistory(w.sim_time_s, m);
  const s = useForecast.getState();
  if (!force && w.sim_time_s - s.computed_at_s < th.forecast_refresh_s) return;
  const byHorizon = computeForecast(w, m, th, dow, devHistory);
  const watch = Object.fromEntries(HORIZONS.map((h) => [h, watchList(w, m, th, dow, h, 5, devHistory)])) as unknown as Record<Horizon, WatchItem[]>;
  // live delay level per route, the "what actually happened" side of the scorecard
  const live = new Map<string, number>();
  for (const a of alerts) if (a.rule_id === 'delay_sop' && a.route_id && a.level) live.set(a.route_id, a.level);
  let score = scoreDue(s.score, w.sim_time_s, live);
  if (!force) score = recordForecasts(score, HORIZONS.flatMap((h) => byHorizon[h]), w.sim_time_s);
  useForecast.setState({ byHorizon, watch, score, computed_at_s: w.sim_time_s });
}
