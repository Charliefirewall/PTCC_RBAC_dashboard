import { describe, expect, it } from 'vitest';
import { buildWorld } from '../data/build';
import { SimEngine } from '../sim/engine';
import { deriveMetrics } from './evaluate';
import { chance, computeForecast, forecastRoute, forecastStops, HORIZONS, phi, phiInv } from './forecast';
import { CONFIDENCE_CEILING } from './predict';
import { DEMO_DEFAULTS } from './thresholds';

const th = { ...DEMO_DEFAULTS };

describe('forecast maths', () => {
  it('phi is a CDF and phiInv inverts it', () => {
    expect(phi(0)).toBeCloseTo(0.5, 6);
    expect(phi(1.2816)).toBeCloseTo(0.9, 3);
    expect(phi(-3)).toBeLessThan(0.002);
    for (const p of [0.05, 0.3, 0.7, 0.95]) expect(phi(phiInv(p))).toBeCloseTo(p, 5);
  });

  it('chance of breach is a probability that rises with the mean and falls with the threshold', () => {
    const c = (mu: number, thr: number) => chance({ mu_s: mu, sd_s: 120 }, thr);
    expect(c(0, 300)).toBeGreaterThanOrEqual(0);
    expect(c(900, 300)).toBeLessThanOrEqual(1);
    expect(c(400, 300)).toBeGreaterThan(c(200, 300));
    expect(c(300, 900)).toBeLessThan(c(300, 300));
  });
});

describe('forecast over the real world', () => {
  const w = buildWorld(20260921, 7 * 3600 + 40 * 60);
  const e = new SimEngine(w);
  for (let i = 0; i < 240; i++) e.tick();

  it('widens the spread and lowers confidence with horizon, never above the ceiling', () => {
    const f = HORIZONS.map((h) => forecastRoute(w, 'R7', 0, h, 0, th.forecast_drift_tau_min));
    for (let i = 1; i < f.length; i++) {
      expect(f[i]!.sd_s).toBeGreaterThan(f[i - 1]!.sd_s);
      expect(f[i]!.confidence).toBeLessThan(f[i - 1]!.confidence);
    }
    for (const x of f) expect(x.confidence).toBeLessThanOrEqual(CONFIDENCE_CEILING);
  });

  it('a late route now stays late in the forecast, fading with horizon', () => {
    const late = (h: number) => forecastRoute(w, 'R7', 20 * 60, h, 0, th.forecast_drift_tau_min).mu_s;
    const onTime = forecastRoute(w, 'R7', 0, 15, 0, th.forecast_drift_tau_min).mu_s;
    expect(late(15)).toBeGreaterThan(onTime + 600);
    expect(late(60)).toBeLessThan(late(15));
  });

  it('forecasts L-level rows for a congested network, with stable ids and bounded numbers', () => {
    const m = deriveMetrics(e.snapshot(), th);
    // push eight routes 18 min late: a network-wide delay the forecast must carry forward
    const ids = [...m.per_route.values()].filter((r) => r.vehicles > 0).slice(0, 8).map((r) => r.route_id);
    for (const id of ids) m.per_route.get(id)!.mean_dev_s = 18 * 60;
    const a = computeForecast(w, m, th, 0);
    const b = computeForecast(w, m, th, 0);
    expect(a[15].map((x) => x.id)).toEqual(b[15].map((x) => x.id));
    expect(a[15].length).toBeGreaterThanOrEqual(8);
    expect(a[15].some((x) => x.rule_id === 'delay_network')).toBe(true);
    for (const h of HORIZONS) {
      for (const x of a[h]) {
        expect(x.forecast).toBe(true);
        expect(x.horizon_min).toBe(h);
        expect(x.probability).toBeGreaterThanOrEqual(0);
        expect(x.probability).toBeLessThanOrEqual(1);
        expect(x.confidence).toBeLessThanOrEqual(CONFIDENCE_CEILING);
      }
    }
    // fewer rows (or lower levels) as the disturbance fades
    const score = (h: 15 | 60) => a[h].reduce((s, x) => s + x.level, 0);
    expect(score(60)).toBeLessThanOrEqual(score(15));
  });

  it('raising the minimum chance lists fewer rows', () => {
    const m = deriveMetrics(e.snapshot(), th);
    for (const r of [...m.per_route.values()].slice(0, 10)) r.mean_dev_s = 7 * 60;
    const loose = computeForecast(w, m, { ...th, forecast_min_probability_pct: 10 }, 0)[30].length;
    const strict = computeForecast(w, m, { ...th, forecast_min_probability_pct: 80 }, 0)[30].length;
    expect(strict).toBeLessThan(loose);
  });

  it('forecasts every remaining stop of a bus trip, after the one it is at', () => {
    const v = w.vehicles.find((x) => x.status === 'in_service' && x.route_id === 'R7')!;
    const { norm, ahead, k0 } = forecastStops(w, v, 0, th.forecast_drift_tau_min);
    const r = w.routeById.get('R7')!;
    expect(norm).toHaveLength(r.stops.length);
    expect(ahead).toHaveLength(r.stops.length - 1 - k0);
    for (const s of ahead) expect(s.p10 <= s.mean && s.mean <= s.p90).toBe(true);
    for (let i = 1; i < ahead.length; i++) expect(ahead[i]!.eta_s).toBeGreaterThan(ahead[i - 1]!.eta_s);
  });
});
