/**
 * PTCC SOP ladder (PTCC "Suggested scenario" note, Sept 2026):
 * "Based on the number of routes affected (e.g. 1, 5) & delay threshold 5, 15 & 30 mins,
 *  propose an action based on SOP" - route level (1) executes automatically, medium (2)
 *  proposes an action, senior (3) escalates and communicates with the Traffic department.
 *
 * Realised matrix:          1 route    >= routes_affected_l2 routes
 *   delay >= l1 (5 min)       L1               L2
 *   delay >= l2 (15 min)      L2               L3
 *   delay >= l3 (30 min)      L3               L3
 *
 * Alert severity (3-level scale) follows the level. The 5-level EVENT scale stays
 * separate, as every earlier plan requires.
 */

import type { Severity } from '../sim/types';
import type { Thresholds } from './thresholds';

export type SopLevel = 0 | 1 | 2 | 3;

type DelayTh = Pick<Thresholds, 'delay_l1_min' | 'delay_l2_min' | 'delay_l3_min' | 'routes_affected_l2'>;

export function delayIdx(delay_min: number, th: DelayTh): SopLevel {
  if (delay_min >= th.delay_l3_min) return 3;
  if (delay_min >= th.delay_l2_min) return 2;
  if (delay_min >= th.delay_l1_min) return 1;
  return 0;
}

export function sopLevel(delay_min: number, routes_affected: number, th: DelayTh): SopLevel {
  const d = delayIdx(delay_min, th);
  if (d === 0) return 0;
  return Math.min(3, d + (routes_affected >= th.routes_affected_l2 ? 1 : 0)) as SopLevel;
}

export const LEVEL_SEVERITY: Record<1 | 2 | 3, Severity> = { 1: 'informational', 2: 'warning', 3: 'critical' };
