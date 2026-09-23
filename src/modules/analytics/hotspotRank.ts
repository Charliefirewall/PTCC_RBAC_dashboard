/**
 * Top-5 delay hotspots (PTCC scenario 3b) - the pure half, store-free so it is testable
 * in node. Extension - outside R1096 scope.
 *
 * Ranking is arithmetic over the synthetic baseline (sim/baseline.ts), no model:
 *
 *   impact(seg) = Σ_{bucket ∈ window} max(0, segExcess.mean) × segment_km × routes_using_seg
 *
 * i.e. seconds of deviation gained by ONE pass of every route crossing the segment, once
 * per 15-min bucket. It is an index of where delay is made, not a count of real buses -
 * the UI labels the minutes figure as an estimate for that reason.
 * ponytail: no per-route frequency weighting (trips_in_window); add it when the timetable
 * carries real headways per daypart per segment.
 */

import type { Baseline } from '../../sim/baseline';
import { segmentCentrality } from '../../data/segments';
import type { Route } from '../../sim/types';
import type { I18nKey } from '../../i18n/dict';

export type HotspotWindow = 'am' | 'midday' | 'pm' | 'evening' | 'all';

/** [first, last) bucket; bucket 0 = 06:00, 15 min each. */
export const WINDOWS: Record<HotspotWindow, [number, number]> = {
  am: [4, 14], // 07:00-09:30
  midday: [16, 40], // 10:00-16:00
  pm: [42, 54], // 16:30-19:30
  evening: [54, 60], // 19:30-21:00
  all: [0, 60],
};
const PEAK = new Set<HotspotWindow>(['am', 'pm']);
const Z90 = 1.2816;

export interface Hotspot {
  key: string;
  /** mean excess over the window, s/km */
  mean: number;
  p10: number;
  p90: number;
  km: number;
  routes: string[];
  /** see header: seconds, index-like */
  impact_s: number;
}

export function rankHotspots(base: Baseline, routes: readonly Route[], dow: number, win: HotspotWindow, n = 5): Hotspot[] {
  const [b0, b1] = WINDOWS[win];
  const using = new Map<string, string[]>();
  const km = new Map<string, number>();
  for (const r of routes)
    for (const e of r.edges ?? []) {
      const list = using.get(e.key) ?? [];
      if (!list.includes(r.route_id)) list.push(r.route_id);
      using.set(e.key, list);
      if (!km.has(e.key)) km.set(e.key, (e.to_m - e.from_m) / 1000);
    }
  const out: Hotspot[] = [];
  for (const key of base.segKeys) {
    const rs = using.get(key);
    if (!rs) continue;
    const k = km.get(key)!;
    let pos = 0;
    let m = 0;
    let sd = 0;
    for (let b = b0; b < b1; b++) {
      const e = base.segExcess(key, dow, b);
      pos += Math.max(0, e.mean);
      m += e.mean;
      sd += e.sd;
    }
    const nb = b1 - b0;
    m /= nb;
    sd /= nb;
    out.push({ key, mean: m, p10: m - Z90 * sd, p90: m + Z90 * sd, km: k, routes: rs, impact_s: pos * k * rs.length });
  }
  // key as tie-break keeps the order deterministic
  return out.sort((a, b) => b.impact_s - a.impact_s || a.key.localeCompare(b.key)).slice(0, n);
}

/**
 * Proposed action, five rows, first match wins (plan §7.2).
 * `liveRatio` = live 30-min excess / norm excess now; null when there is no live data.
 */
/**
 * Live delay on a segment this far ABOVE its norm (s/km, last 30 min) means act now.
 * A margin, not a ratio: norms sit near zero and go negative on feeders, where "2x the
 * norm" is meaningless. ponytail: fixed margin; use the segment's own sd if PTPD wants it.
 */
export const LIVE_OVER_NORM_S_PER_KM = 15;

export function hotspotAction(key: string, win: HotspotWindow, liveOverNorm: number | null): I18nKey {
  if (liveOverNorm !== null && liveOverNorm > LIVE_OVER_NORM_S_PER_KM) return 'hs.act.tcc_notify';
  const c = segmentCentrality(key);
  if (c === 2) return PEAK.has(win) ? 'hs.act.signal_priority' : 'hs.act.stop_spacing';
  if (c === 1) return 'hs.act.bus_lane';
  return 'hs.act.schedule_pad';
}

const TO_TCC = new Set<I18nKey>(['hs.act.tcc_notify', 'hs.act.signal_priority', 'hs.act.bus_lane']);

/** E14: who a proposed action is drafted to. Signals and lanes are TCC's; timetable and stops are the operator's. */
export function draftFor(action: I18nKey): {
  recipient: 'tcc' | 'bus_operator';
  message_type: 'coordination_request' | 'operational_instruction';
} {
  return TO_TCC.has(action)
    ? { recipient: 'tcc', message_type: 'coordination_request' }
    : { recipient: 'bus_operator', message_type: 'operational_instruction' };
}
