/**
 * Forecast store. Kept OUT of useAlerts on purpose: a forecast is not an alert, can never
 * be validated into an event, and never triggers the SOP runner (store/sop.ts).
 */

import { create } from 'zustand';
import { computeForecast, HORIZONS, type ForecastAlert, type Horizon } from '../rules/forecast';
import type { DerivedMetrics } from '../rules/evaluate';
import type { Thresholds } from '../rules/thresholds';
import type { World } from '../sim/types';

interface ForecastState {
  byHorizon: Record<Horizon, ForecastAlert[]>;
  computed_at_s: number;
}

const empty = Object.fromEntries(HORIZONS.map((h) => [h, []])) as unknown as Record<Horizon, ForecastAlert[]>;

export const useForecast = create<ForecastState>(() => ({ byHorizon: empty, computed_at_s: -Infinity }));

/** Recompute when `refresh_s` of sim time has passed (or `force`). Cheap: ~100 routes x 4 horizons. */
export function maybeForecast(w: World, m: DerivedMetrics, th: Thresholds, dow: number, force = false): void {
  const last = useForecast.getState().computed_at_s;
  if (!force && w.sim_time_s - last < th.forecast_refresh_s) return;
  useForecast.setState({ byHorizon: computeForecast(w, m, th, dow), computed_at_s: w.sim_time_s });
}
