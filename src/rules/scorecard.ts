/**
 * E7 - forecast vs what actually happened.
 *
 * Every forecast row is remembered with the moment it falls due (made_at + horizon). When
 * that moment arrives, it is checked against the LIVE delay level of the same route:
 *   hit   - the route reached at least the forecast level
 *   lower - the route was late, but at a lower level
 *   miss  - no delay alert on the route at all
 * Both sides come from the running simulation, so this measures the model against the
 * sim - it is SIMULATED, and labelled so. What it demonstrates is that the capability
 * can be checked, which is what a sceptical operator will ask for.
 *
 * Pure and immutable: the store (store/forecast.ts) owns the state and calls these.
 */

export interface ForecastLike {
  route_id?: string;
  horizon_min: number;
  level: 1 | 2 | 3;
  probability: number;
}

export interface PendingForecast {
  route_id: string;
  h: number;
  level: 1 | 2 | 3;
  probability: number;
  made_at_s: number;
  due_s: number;
}

export type Outcome = 'hit' | 'lower' | 'miss';

export interface ResolvedForecast extends PendingForecast {
  outcome: Outcome;
  actual_level: number;
}

export interface Scorecard {
  pending: PendingForecast[];
  /** newest first, bounded */
  resolved: ResolvedForecast[];
  /** per horizon, since the session started */
  stats: Record<number, { n: number; hits: number }>;
}

const MAX_RESOLVED = 100;

export function emptyScorecard(): Scorecard {
  return { pending: [], resolved: [], stats: {} };
}

/** Remember route-level forecasts. One open forecast per route and horizon: the first one stands. */
export function recordForecasts(s: Scorecard, rows: readonly ForecastLike[], now_s: number): Scorecard {
  const open = new Set(s.pending.map((p) => `${p.route_id}|${p.h}`));
  const add: PendingForecast[] = [];
  for (const r of rows) {
    if (!r.route_id) continue; // the network row is a summary, not a checkable claim about one route
    const k = `${r.route_id}|${r.horizon_min}`;
    if (open.has(k)) continue;
    open.add(k);
    add.push({ route_id: r.route_id, h: r.horizon_min, level: r.level, probability: r.probability, made_at_s: now_s, due_s: now_s + r.horizon_min * 60 });
  }
  return add.length ? { ...s, pending: [...s.pending, ...add] } : s;
}

/** Resolve every forecast that has fallen due, against the live level per route (absent = no alert). */
export function scoreDue(s: Scorecard, now_s: number, liveLevel: ReadonlyMap<string, number>): Scorecard {
  const due = s.pending.filter((p) => p.due_s <= now_s);
  if (!due.length) return s;
  const stats = { ...s.stats };
  const done: ResolvedForecast[] = due.map((p) => {
    const actual = liveLevel.get(p.route_id) ?? 0;
    const outcome: Outcome = actual >= p.level ? 'hit' : actual > 0 ? 'lower' : 'miss';
    const st = stats[p.h] ?? { n: 0, hits: 0 };
    stats[p.h] = { n: st.n + 1, hits: st.hits + (outcome === 'hit' ? 1 : 0) };
    return { ...p, outcome, actual_level: actual };
  });
  return {
    pending: s.pending.filter((p) => p.due_s > now_s),
    resolved: [...done.reverse(), ...s.resolved].slice(0, MAX_RESOLVED),
    stats,
  };
}
