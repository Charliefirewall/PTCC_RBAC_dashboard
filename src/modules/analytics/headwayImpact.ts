/**
 * Pure helpers for Service reliability impact: the event window and the
 * before / during / after insight numbers.
 */

/** Seconds since midnight from an ISO stamp (`2026-09-21T07:55:05+08:00`); NaN if unparseable. */
export function isoToSimS(iso: string | undefined): number {
  const m = iso ? /T(\d\d):(\d\d):(\d\d)/.exec(iso) : null;
  return m ? +m[1]! * 3600 + +m[2]! * 60 + +m[3]! : NaN;
}

/**
 * Sample indices [start, end) of the event window. The real event times are used when
 * the ring holds at least one sample BEFORE the event (otherwise there is no baseline);
 * failing that, the middle third of the ring, flagged `approx` so the screen can say so.
 * An event with no `closed_at` runs to the last sample.
 */
export function eventWindow(
  ts: readonly number[],
  startS: number,
  endS: number,
): { start: number; end: number; approx: boolean } {
  const n = ts.length;
  const i0 = ts.findIndex((s) => s >= startS);
  if (Number.isFinite(startS) && i0 > 0) {
    const j = Number.isFinite(endS) ? ts.findIndex((s) => s > endS) : -1;
    return { start: i0, end: j < 0 ? n : Math.max(j, i0 + 1), approx: false };
  }
  const third = Math.max(1, Math.floor(n / 3));
  return { start: third, end: Math.min(n, third * 2), approx: true };
}

export interface ImpactInsights {
  /** Mean largest-gap per phase, minutes; null when the phase has no samples. */
  before: number | null;
  during: number | null;
  after: number | null;
  peak: { min: number; t: number } | null;
  /** during / before; null without a usable baseline. */
  ratio: number | null;
  /**
   * Minutes after the window's last sample until the gap dropped under the threshold
   * and STAYED there to the end of the ring. null = not recovered (or no after-phase).
   */
  recoveryMin: number | null;
  /** false = after-phase exists but the gap is still over the threshold at some later sample. */
  recovered: boolean | null;
}

const mean = (a: number[]) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null);

export function impactInsights(
  valuesMin: readonly (number | null)[],
  ts: readonly number[],
  win: { start: number; end: number },
  thresholdMin: number,
): ImpactInsights {
  const real = (a: readonly (number | null)[]) => a.filter((v): v is number => v !== null);
  const before = mean(real(valuesMin.slice(0, win.start)));
  const during = mean(real(valuesMin.slice(win.start, win.end)));
  const afterVals = valuesMin.slice(win.end);
  const after = mean(real(afterVals));

  let peak: ImpactInsights['peak'] = null;
  valuesMin.forEach((v, i) => {
    if (v !== null && (!peak || v > peak.min)) peak = { min: v, t: ts[i]! };
  });

  let recovered: boolean | null = null;
  let recoveryMin: number | null = null;
  if (real(afterVals).length) {
    // walk back from the newest sample while the gap is at or under the threshold
    let k = valuesMin.length;
    while (k > win.end && (valuesMin[k - 1] ?? Infinity) <= thresholdMin) k--;
    recovered = k < valuesMin.length;
    if (recovered) recoveryMin = Math.max(0, (ts[k]! - ts[win.end - 1]!) / 60);
  }

  return {
    before,
    during,
    after,
    peak,
    ratio: before && during !== null ? during / before : null,
    recoveryMin,
    recovered,
  };
}
