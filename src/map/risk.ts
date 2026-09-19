/**
 * Per-vehicle exception-funnel classification, for the map's cluster aggregates.
 *
 * This MIRRORS the S3 funnel block in `src/rules/evaluate.ts` (search for
 * "S3 exception funnel") deliberately and exactly, including the
 * `out_of_service` skip that makes the funnel total `in_service` rather than
 * 1,086. `evaluate.ts` computes the funnel from a SNAPSHOT once per sim tick and
 * publishes only the three totals; the map needs the same verdict for a single
 * live `Vehicle` at ~18 Hz, which is why the predicate is restated here rather
 * than the counts reused.
 *
 * The invariant that matters: summing `critical` / `attention` / `normal` over
 * every cluster must reproduce `useSim.getState().metrics.funnel`. If the funnel
 * rules in evaluate.ts change, change them here too — the Playwright check in
 * the F-workstream report asserts the two agree, and that assertion is the only
 * thing keeping this honest.
 */
import type { Thresholds } from '../rules/thresholds';
import type { Vehicle } from '../sim/types';

/** `off` = not counted by the funnel at all (out of service). */
export type Risk = 'critical' | 'attention' | 'normal' | 'off';

/**
 * The three-state schedule-deviation ladder, in ONE place (plan 11.5 step 7).
 *
 * `0` on time, `1` past the threshold, `2` past 3x it. The same ladder was
 * written out by hand in `riskOf` below, in the rAF loop's `c` index, in the
 * vehicle popup's colour, and — outside this workstream's files — in
 * `modules/regularity/Regularity.tsx`, `modules/vehicle/VehicleDetail.tsx`
 * (a private `devColor` each) and inline in `modules/command/CommandCentre.tsx`.
 * Those three can now import this instead; see the K-workstream report.
 */
export type DevTier = 0 | 1 | 2;

export function devTier(deviation_s: number, threshold_s: number): DevTier {
  const a = Math.abs(deviation_s);
  return a > threshold_s * 3 ? 2 : a > threshold_s ? 1 : 0;
}

export function riskOf(v: Vehicle, th: Thresholds): Risk {
  if (v.status === 'out_of_service') return 'off';
  const load = (v.pax_count / v.capacity) * 100;
  const dev = Math.abs(v.schedule_deviation);
  const deviceDown =
    v.equipment.afc === 'offline' || v.equipment.cctv === 'offline' || v.equipment.tbox === 'offline';
  if (
    v.status === 'breakdown' ||
    !!v.flags.panic ||
    !!v.flags.accident ||
    load >= th.passenger_load_critical_pct ||
    devTier(dev, th.schedule_deviation_s) === 2
  )
    return 'critical';
  if (
    devTier(dev, th.schedule_deviation_s) >= 1 ||
    load >= th.passenger_load_pct ||
    deviceDown ||
    !!v.flags.route_deviation ||
    !!v.flags.overspeed
  )
    return 'attention';
  return 'normal';
}
