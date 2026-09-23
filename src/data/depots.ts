/**
 * Depots.
 *
 * ⚠ NOTHING IN THIS FILE IS CONFIRMED. No client source names a depot, gives a depot
 * location, a workshop capacity, or an operator-to-depot mapping. The ICD has no depot
 * entity at all. Every row below is an ASSUMPTION we invented so that §9.1(a) — *"yes to
 * the view that tells PTPD a depot is over capacity"* — can be shown at all.
 *
 * What IS grounded:
 *   - the five sites are existing nodes of the corridor graph (data/corridors.ts), so a
 *     depot sits somewhere a bus can actually reach;
 *   - operators A/B/C already exist in the simulation (sim/types.ts).
 *
 * What is invented: which nodes are depots, how many workshop hours each has per week,
 * which operator runs which site, and the bus→depot assignment.
 *
 * The assignment is seeded off the vehicle id with FNV-1a + mulberry32 — the same pattern
 * `simulatedCostPerBus()` uses in modules/health — so a bus is at the same depot in every
 * module and on every render. A demo that contradicts itself mid-presentation is worse
 * than one that admits it is simulated.
 */

import { mulberry32 } from '../sim/rng';
import type { OperatorId } from '../sim/types';
import { NODE_BY_ID } from './corridors';

export interface Depot {
  id: string;
  name_en: string;
  name_mn: string;
  /** A node of the corridor graph — depots are not floating points. */
  node_id: string;
  district: string;
  operator_id: OperatorId;
  /**
   * Workshop hours available per week. ASSUMPTION: no source states a depot capacity,
   * a bay count, a shift pattern or a technician headcount. The figure is a placeholder
   * whose only job is to give the utilisation heatmap a denominator.
   */
  workshop_hours_per_week: number;
}

export const DEPOTS: Depot[] = [
  { id: 'd-tolgoit', name_en: 'Tolgoit Depot', name_mn: 'Толгойт бааз', node_id: 'n-tolgoit', district: 'Songino Khairkhan', operator_id: 'A', workshop_hours_per_week: 320 },
  { id: 'd-dragon', name_en: 'Dragon Depot', name_mn: 'Драгон бааз', node_id: 'n-dragon', district: 'Songino Khairkhan', operator_id: 'A', workshop_hours_per_week: 330 },
  { id: 'd-amgalan', name_en: 'Amgalan Depot', name_mn: 'Амгалан бааз', node_id: 'n-amgalan', district: 'Bayanzurkh', operator_id: 'B', workshop_hours_per_week: 300 },
  { id: 'd-uliastai', name_en: 'Uliastai Depot', name_mn: 'Улиастай бааз', node_id: 'n-tolgoit-e', district: 'Bayanzurkh', operator_id: 'B', workshop_hours_per_week: 250 },
  { id: 'd-yarmag', name_en: 'Yarmag Depot', name_mn: 'Ярмаг бааз', node_id: 'n-yarmag', district: 'Khan-Uul', operator_id: 'C', workshop_hours_per_week: 310 },
];

export const DEPOT_BY_ID = new Map(DEPOTS.map((d) => [d.id, d]));

/** Depot position, read from the corridor graph rather than duplicated here. */
export function depotLonLat(d: Depot): [number, number] {
  const n = NODE_BY_ID.get(d.node_id);
  return n ? [n.lon, n.lat] : [0, 0];
}

/** FNV-1a over the id. Same function as modules/health uses; six lines, not a dependency. */
export function seedOfId(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const assignment = new Map<string, string>();

/**
 * Which depot a bus is based at. ASSUMPTION — there is no source for this.
 *
 * A bus is assigned within its OWN operator's depots: operators run their own workshops,
 * so an operator-A bus serviced at an operator-C site would be a claim we cannot make.
 * Within that pool the pick is seeded off the vehicle id, so it never changes.
 */
export function depotIdOf(vehicle_id: string, operator_id: OperatorId): string {
  const key = `${operator_id}:${vehicle_id}`;
  const hit = assignment.get(key);
  if (hit) return hit;
  const pool = DEPOTS.filter((d) => d.operator_id === operator_id);
  // No depot for this operator would be a data error, not a runtime condition; fall back
  // to the whole list rather than throwing in the middle of a demo.
  const from = pool.length ? pool : DEPOTS;
  const id = mulberry32(seedOfId(vehicle_id) ^ 0xd3907).pick(from).id;
  assignment.set(key, id);
  return id;
}
