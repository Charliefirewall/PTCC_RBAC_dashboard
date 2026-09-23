import { describe, expect, it } from 'vitest';
import { eventWindow, impactInsights, isoToSimS } from './headwayImpact';

// 10 samples one minute apart from 08:00 (28800 s)
const ts = Array.from({ length: 10 }, (_, i) => 28800 + i * 60);

describe('impactInsights', () => {
  it('worked example: 10 before, 25 during, recovers 2 min after', () => {
    //            before      | during         | after
    const v = [10, 10, 10, 25, 30, 20, 22, 15, 12, 11];
    const r = impactInsights(v, ts, { start: 3, end: 6 }, 20);
    expect(r.before).toBe(10);
    expect(r.during).toBe(25);
    expect(r.after).toBe(15);
    expect(r.ratio).toBe(2.5);
    expect(r.peak).toEqual({ min: 30, t: 29040 });
    // after-phase 22, 15, 12, 11: under 20 from index 7 (08:07); window ended 08:05
    expect(r.recovered).toBe(true);
    expect(r.recoveryMin).toBe(2);
  });

  it('not recovered when the newest sample is still over the threshold', () => {
    const v = [10, 10, 10, 25, 30, 20, 22, 15, 12, 26];
    const r = impactInsights(v, ts, { start: 3, end: 6 }, 20);
    expect(r.recovered).toBe(false);
    expect(r.recoveryMin).toBeNull();
  });

  it('open event: no after-phase, no baseline gives no ratio', () => {
    const v = [null, 12, 12, 30];
    const r = impactInsights(v, ts.slice(0, 4), { start: 1, end: 4 }, 20);
    expect(r.before).toBeNull();
    expect(r.ratio).toBeNull();
    expect(r.after).toBeNull();
    expect(r.recovered).toBeNull();
  });
});

describe('eventWindow', () => {
  it('uses the real event times when a baseline exists', () => {
    expect(eventWindow(ts, 28800 + 150, 28800 + 330)).toEqual({ start: 3, end: 6, approx: false });
    expect(eventWindow(ts, 28800 + 150, NaN)).toEqual({ start: 3, end: 10, approx: false });
  });
  it('falls back to the middle third when the event predates the ring', () => {
    expect(eventWindow(ts, 28800, NaN)).toEqual({ start: 3, end: 6, approx: true });
  });
});

it('isoToSimS', () => {
  expect(isoToSimS('2026-09-21T07:55:05+08:00')).toBe(28505);
  expect(isoToSimS(undefined)).toBeNaN();
});
