/**
 * Forecast accuracy against the simulation itself (backtest).
 *
 * Runs PTCC's own scenario D10 on a real world, forecasts every active route at +15 / +30
 * / +45 min, then lets the engine actually run that long and compares. Measures:
 *   - disrupted routes (the 8 D10 routes): mean absolute error of the expected delay
 *   - quiet routes: false-alarm rate (forecast listed, route never reached L1)
 * The thresholds below are the acceptance bar for "the forecast works".
 */

import { describe, expect, it } from 'vitest';
import { buildWorld } from '../data/build';
import { SimEngine, TICK_DT_S } from '../sim/engine';
import { SCENARIOS } from '../sim/scenarios';
import { deriveMetrics } from './evaluate';
import { computeForecast, forecastRoute } from './forecast';
import { DEMO_DEFAULTS } from './thresholds';

const th = { ...DEMO_DEFAULTS };
const D10_ROUTES = ['R10', 'R5', 'R3', 'R4', 'R12', 'R21', 'R22', 'R7'];

export function backtest(slopeAware: boolean, scenario = true) {
  const w = buildWorld(20260921, 7 * 3600 + 40 * 60);
  const e = new SimEngine(w);
  // the recent history the model may use - recorded from BEFORE the disruption, exactly
  // as the live store does, so a sudden jump is in it
  const hist = new Map<string, { t: number; v: number }[]>();
  const record = () => {
    const m = deriveMetrics(e.snapshot(), th);
    for (const rm of m.per_route.values()) {
      if (!rm.vehicles) continue;
      const a = hist.get(rm.route_id) ?? [];
      a.push({ t: w.sim_time_s, v: rm.mean_dev_s });
      hist.set(rm.route_id, a);
    }
    return m;
  };
  let m = record();
  for (let i = 0; i < 120; i++) {
    e.tick();
    if (i % 6 === 0) m = record();
  }
  for (const st of scenario ? SCENARIOS.D10.steps : []) {
    e.inject((ww, t) => st.apply(ww, t));
    e.tick();
  }
  // let the disruption build for 5 minutes
  for (let i = 0; i < 60; i++) {
    e.tick();
    if (i % 6 === 0) m = record();
  }
  m = record();
  const t0 = w.sim_time_s;
  const H = [15, 30, 45] as const;
  const fc = new Map<string, number>(); // `${route}|${h}` -> mu_s
  for (const rm of m.per_route.values()) {
    if (!rm.vehicles || !w.routeById.get(rm.route_id)?.active) continue;
    for (const h of H) {
      const f = forecastRoute(w, rm.route_id, rm.mean_dev_s, h, 0, th.forecast_drift_tau_min, slopeAware ? hist.get(rm.route_id) : undefined);
      fc.set(`${rm.route_id}|${h}`, f.mu_s);
    }
  }
  const listed = computeForecast(w, m, th, 0, slopeAware ? hist : undefined);
  const actual = new Map<string, number>();
  const everL1 = new Set<string>();
  let elapsed = 0;
  for (const h of H) {
    while (elapsed < h * 60) {
      e.tick();
      elapsed += TICK_DT_S;
      if (elapsed % 60 === 0) {
        for (const rm of deriveMetrics(e.snapshot(), th).per_route.values()) if (rm.mean_dev_s >= 5 * 60) everL1.add(rm.route_id);
      }
    }
    for (const rm of deriveMetrics(e.snapshot(), th).per_route.values()) actual.set(`${rm.route_id}|${h}`, rm.mean_dev_s);
  }
  const mae = (h: number) => {
    const errs = D10_ROUTES.map((r) => Math.abs((fc.get(`${r}|${h}`) ?? 0) - (actual.get(`${r}|${h}`) ?? 0)) / 60);
    return errs.reduce((s, x) => s + x, 0) / errs.length;
  };
  const listedAll = new Set(listed[15].concat(listed[30]).map((a) => a.route_id).filter((r): r is string => !!r));
  const quiet = new Set(listed[30].map((a) => a.route_id).filter((r): r is string => !!r && !D10_ROUTES.includes(r)));
  const falseAlarms = [...quiet].filter((r) => !everL1.has(r)).length;
  void t0;
  // per-route forecast vs actual, for reading a failure
  const detail = D10_ROUTES.map((r) => `${r} now ${(m.per_route.get(r)!.mean_dev_s/60).toFixed(1)} | ` + H.map((h) => `${h}: f ${((fc.get(`${r}|${h}`) ?? 0) / 60).toFixed(1)} a ${((actual.get(`${r}|${h}`) ?? 0) / 60).toFixed(1)}`).join('  '));
  return { mae15: mae(15), mae30: mae(30), mae45: mae(45), falseAlarms, listedQuiet: quiet.size, listed: listedAll.size, detail };
}

describe('forecast accuracy on PTCC scenario D10 (backtest)', () => {
  const trend = backtest(true);
  const fadeOnly = backtest(false);
  console.log('backtest trend', JSON.stringify({ ...trend, detail: undefined }), 'fade-only', JSON.stringify({ ...fadeOnly, detail: undefined }));

  it('predicts disrupted routes within 1 / 1.5 / 2.5 min at +15 / +30 / +45', () => {
    expect(trend.mae15).toBeLessThan(1);
    expect(trend.mae30).toBeLessThan(1.5);
    expect(trend.mae45).toBeLessThan(2.5);
    expect(trend.falseAlarms).toBeLessThanOrEqual(1);
  });

  it('reading the trend at least halves the error of fading every delay to normal', () => {
    expect(trend.mae30).toBeLessThan(fadeOnly.mae30 / 2);
  });

  it('stays quiet on a quiet network: the trend does not invent alerts', () => {
    const quiet = backtest(true, false);
    expect(quiet.listed).toBeLessThanOrEqual(2);
  });
});
