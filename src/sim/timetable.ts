/**
 * Synthetic timetable.
 *
 * NO PLANNED-SERVICE SOURCE EXISTS in any of the supplied material - not among the
 * nine data sources on Slide 2, not in the DOCX interface inventory (L332-L360).
 * Planned-vs-actual comparison is nevertheless required (S8, L1049). So the demo
 * synthesises a plan and says so on screen. Approved by the client 17 Sept 2026.
 */

import type { Route, Timetable } from './types';

export const TIMETABLE_PROVENANCE =
  'SYNTHETIC — no planned-service source exists in the deck or the design document. Client-approved for the demo.';

export const SERVICE_START_S = 6 * 3600;
export const SERVICE_END_S = 21 * 3600;

export type Daypart = 'amPeak' | 'offPeak' | 'pmPeak' | 'evening';

export function daypartOf(sim_time_s: number): Daypart {
  const h = (sim_time_s % 86400) / 3600;
  if (h >= 6.5 && h < 9.0) return 'amPeak';
  if (h >= 17.0 && h < 19.5) return 'pmPeak';
  if (h >= 19.5 || h < 6.5) return 'evening';
  return 'offPeak';
}

export function buildTimetable(routes: Route[]): Timetable {
  const byId = new Map(routes.map((r) => [r.route_id, r]));
  return {
    planned_headway_s(route_id, sim_time_s) {
      const r = byId.get(route_id);
      if (!r) return 900;
      return r.planned_headway_s[daypartOf(sim_time_s)];
    },
  };
}
