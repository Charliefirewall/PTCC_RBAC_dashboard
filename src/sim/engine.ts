/**
 * Simulation engine.
 *
 * Tick cadence is 5 s, taken from the source: "polling every 5-10 seconds for
 * GPS/AVL" (R1024, L490). Emergency events bypass the tick as event-driven pushes,
 * also per R1024.
 *
 * Bunching is EMERGENT, not scripted: a late bus finds more passengers waiting,
 * dwells longer, and falls further behind; the follower finds empty stops and
 * catches up. That reproduces the deck's R7 story (S8) without staging it.
 */

import { routeCum } from '../data/build';
import { segmentForHop } from '../data/segments';
import { Ring } from './ring';
import { pointAlong } from './geo';
import { makeStreams, mulberry32, type Streams } from './rng';
import { daypartOf } from './timetable';
import { tripIdOf, type Route, type SimSnapshot, type Stop, type Vehicle, type World } from './types';

export const TICK_DT_S = 5;

/** Per-link speed profile, km/h. Section 10.3 of the plan.
 *  The central peak figure of 8 km/h is CLIENT-DIRECTED (CD, 17 Sept 2026) and
 *  matches the single instantaneous reading on Slide 5. Using it as a peak MEAN
 *  is our inference - it must never be applied to suburban or off-peak links. */
export interface SpeedProfile {
  centralPeak: number;
  centralOff: number;
  arterialPeak: number;
  arterialOff: number;
  feederPeak: number;
  feederOff: number;
  suburbanPeak: number;
  suburbanOff: number;
  freeFlow: number;
}

/**
 * How long a discrete telematics event stays raised, in sim seconds. A harsh-braking
 * alert that survived one 5 s tick was invisible to an operator; 90 s is long enough
 * to be seen and acknowledged. ASSUMPTION - no source states a dwell time.
 */
const TRANSIENT_FLAG_S = 90;
const TRANSIENT_FLAGS = ['harsh_braking', 'overspeed'] as const;

export const DEFAULT_SPEEDS: SpeedProfile = {
  centralPeak: 8, // CD + S5
  centralOff: 14,
  arterialPeak: 12,
  arterialOff: 20,
  feederPeak: 16,
  feederOff: 22,
  suburbanPeak: 24,
  suburbanOff: 32,
  freeFlow: 35,
};

/** Hourly demand weights. Calibrated so a full day lands inside the source's
 *  0.5-0.6 M bus passengers/day envelope (L507-L512) and passes ~462k by
 *  mid-afternoon, matching the S7 tile. */
const HOUR_W: Record<number, number> = {
  6: 0.03, 7: 0.1, 8: 0.13, 9: 0.08, 10: 0.05, 11: 0.05, 12: 0.06, 13: 0.05,
  14: 0.05, 15: 0.06, 16: 0.07, 17: 0.11, 18: 0.09, 19: 0.04, 20: 0.02, 21: 0.01,
};
const DAILY_PAX = 550_000;

export type Listener = (s: SimSnapshot) => void;
export type Mutation = (w: World, t: number) => void;

// ---------------------------------------------------------------- vehicle physics
/**
 * A city bus is comfortable at roughly 1.0-1.2 m/s2 pulling away and 1.2-1.5 m/s2
 * braking in normal service. Speed is now STATE: it is integrated towards a target
 * under these limits instead of being resampled every tick, so a bus decelerates
 * into a stop and pulls away from it.
 *
 * CALIBRATION NOTE: the tick is 5 s. At the central peak profile (8 km/h = 2.2 m/s)
 * the whole accel ramp lasts ~2 s, so the limits only visibly bite on the faster
 * suburban and off-peak links - that is the physics, not a shortcut.
 */
const A_ACCEL = 1.1; // m/s2
const A_BRAKE = 1.3; // m/s2

/** Bus-ahead standoff: 20 m plus ~2.5 s of headway. Below it, target speed is scaled
 *  down proportionally - a follower closes up and queues instead of driving through
 *  the leader. Deliberately soft so the dwell-driven bunching still emerges. */
const HEADWAY_STANDOFF_M = 20;
const HEADWAY_S = 2.5;

/** Terminus layover, seconds: recovery time before the return trip. ASSUMPTION -
 *  no source states turnaround times; 2-5 min is ordinary urban practice. */
const LAYOVER_BASE_S = 120;

/** Dwell the synthetic plan allows at each stop, and the running-time allowance the
 *  plan carries for queueing and braking (real timetables pad running time; here the
 *  pad absorbs the time lost approaching stops and following other buses).
 *  CALIBRATION KNOBS: raise either and the fleet runs early, lower it and every bus
 *  drifts late, because dwell and queueing are now real standing time. Set so mean
 *  schedule deviation stays centred near zero across a 6-hour run. */
export const PLANNED_DWELL_S = 20;
export const PLAN_PAD = 0.93;

/** One sim hour of speed samples per bus (720 x 5 s). */
export const SPEED_LOG_N = 720;
/** Live observations kept per road segment. */
export const SEG_OBS_N = 64;

/** Mean reversion per tick on schedule deviation. Deviation is a random walk fed by
 *  dwell, congestion and queueing; without a pull towards zero every bus reaches one
 *  of the clamps within an hour and the board stops discriminating. ~2,500 s time
 *  constant - slow enough that a congestion scenario still shows for its full life. */
const REVERSION = 0.9965;

/** Persistent per-vehicle character. Deterministic from the vehicle id via the same
 *  FNV-1a + mulberry32 pattern `simulatedCostPerBus()` and `rules/predict` use, so a
 *  bus behaves like itself in every session and never needs world state. */
interface Character {
  /** driver aggressiveness: target-speed and acceleration multiplier */
  aggr: number;
  /** dwell tendency: how long this driver takes over the doors */
  dwellK: number;
  /** layover discipline at the terminus */
  layoverK: number;
}

/** FNV-1a over the vehicle id - copied (six lines) rather than imported from
 *  `rules/predict`, which the sim layer must not depend on. */
function seedOf(vehicle_id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < vehicle_id.length; i++) {
    h ^= vehicle_id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function characterOf(vehicle_id: string): Character {
  const r = mulberry32(seedOf(vehicle_id));
  return { aggr: 0.86 + r.next() * 0.28, dwellK: 0.75 + r.next() * 0.6, layoverK: 0.7 + r.next() * 1.1 };
}

/** Fastest speed a bus may hold at the END of a tick and still pull up in `d` metres
 *  under comfort braking (the Krauss safe velocity). */
function safeV(d: number, dt: number): number {
  const bt = A_BRAKE * dt;
  return -bt + Math.sqrt(bt * bt + 2 * A_BRAKE * Math.max(0, d));
}

/** The next stop in the direction of travel, or null past the last one.
 *  `sNow` is metres along the SHAPE; the 0.5 m epsilon stops a bus that has just
 *  served a stop from immediately targeting it again. */
function nextStopAlong(r: Route, sNow: number, fwd: boolean): Stop | null {
  const stops = r.stops;
  if (fwd) {
    for (let i = 0; i < stops.length; i++) if (stops[i]!.dist_m > sNow + 0.5) return stops[i]!;
  } else {
    for (let i = stops.length - 1; i >= 0; i--) if (stops[i]!.dist_m < sNow - 0.5) return stops[i]!;
  }
  return null;
}

export function speedFor(r: Route, centrality: number, peak: boolean, sp: SpeedProfile): number {
  if (r.kind === 'suburban') return peak ? sp.suburbanPeak : sp.suburbanOff;
  if (centrality >= 2) return peak ? sp.centralPeak : sp.centralOff;
  if (centrality === 1) return peak ? sp.arterialPeak : sp.arterialOff;
  return peak ? sp.feederPeak : sp.feederOff;
}

/** Rough centrality of a vehicle's current position: distance from city centre. */
export function centralityAt(lon: number, lat: number): number {
  const d = Math.hypot((lon - 106.9176) * 74, (lat - 47.9188) * 111); // km-ish
  if (d < 3.5) return 2;
  if (d < 8) return 1;
  return 0;
}

export class SimEngine {
  readonly world: World;
  private rng: Streams;
  private listeners = new Set<Listener>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private pending: Mutation[] = [];
  /** vehicle_id -> metres to the bus ahead on the same route AND direction. Rebuilt
   *  once per tick; the arrays are reused so the tick stays allocation-light. */
  private gapAhead = new Map<string, number>();
  private byLeg = new Map<string, Vehicle[]>();
  private chars = new Map<string, Character>();
  speeds: SpeedProfile = { ...DEFAULT_SPEEDS };
  speed = 12; // compression factor
  readonly dt = TICK_DT_S;

  constructor(world: World) {
    this.world = world;
    this.rng = makeStreams(world.seed);
  }

  on(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), (this.dt * 1000) / this.speed);
  }

  pause(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  isRunning(): boolean {
    return this.timer !== null;
  }

  setSpeed(x: number): void {
    this.speed = x;
    if (this.timer) {
      this.pause();
      this.start();
    }
  }

  inject(m: Mutation): void {
    this.pending.push(m);
  }

  snapshot(): SimSnapshot {
    const w = this.world;
    return {
      sim_time_s: w.sim_time_s,
      iso: isoAt(w.sim_time_s),
      vehicles: w.vehicles,
      routes: w.routes,
      feed_stale: w.feed_stale,
    };
  }

  tick(): SimSnapshot {
    const w = this.world;
    w.sim_time_s += this.dt;
    const t = w.sim_time_s;

    // scenario mutations first
    if (this.pending.length) {
      const q = this.pending;
      this.pending = [];
      for (const m of q) m(w, t);
    }
    // expire timed effects
    for (const [k, v] of w.congestion) if (v.until_s <= t) w.congestion.delete(k);
    for (const [k, v] of w.demandBoost) if (v.until_s <= t) w.demandBoost.delete(k);

    const dp = daypartOf(t);
    const peak = dp === 'amPeak' || dp === 'pmPeak';
    const iso = isoAt(t);
    this.computeGaps();

    for (const v of w.vehicles) {
      if (v.status !== 'in_service') {
        v.speed = 0;
        v.timestamp = iso;
        continue;
      }
      const r = w.routeById.get(v.route_id)!;
      if (w.suspended.has(r.route_id)) {
        v.speed = 0;
        v.timestamp = iso;
        continue;
      }
      this.step(v, r, t, peak, iso);
    }
    // per-bus speed history for the drill-down ("historical data of bus speed in this trip")
    for (const v of w.vehicles) {
      if (v.status !== 'in_service') continue;
      let ring = w.speedLog.get(v.vehicle_id);
      if (!ring) w.speedLog.set(v.vehicle_id, (ring = new Ring(SPEED_LOG_N)));
      ring.push(v.speed);
    }
    // background telematics noise (T-Box events, L496-L500)
    this.telematics(t);
    this.devices(t);

    const snap = this.snapshot();
    for (const fn of this.listeners) fn(snap);
    return snap;
  }

  /** Metres to the bus ahead, per vehicle, same route and same direction of travel. */
  private computeGaps(): void {
    const legs = this.byLeg;
    for (const arr of legs.values()) arr.length = 0;
    for (const v of this.world.vehicles) {
      if (v.status !== 'in_service') continue;
      const k = `${v.route_id}|${v.direction}`;
      let a = legs.get(k);
      if (!a) legs.set(k, (a = []));
      a.push(v);
    }
    this.gapAhead.clear();
    for (const [k, arr] of legs) {
      if (arr.length < 2) continue;
      arr.sort(byProgress);
      const total = this.world.routeById.get(k.slice(0, -2))?.length_m ?? 1;
      // the last bus on the leg has nobody ahead of it on this trip - no entry
      for (let i = 0; i < arr.length - 1; i++) {
        this.gapAhead.set(arr[i]!.vehicle_id, (arr[i + 1]!.trip_progress - arr[i]!.trip_progress) * total);
      }
    }
  }

  private characterOf(id: string): Character {
    let c = this.chars.get(id);
    if (!c) this.chars.set(id, (c = characterOf(id)));
    return c;
  }

  private step(v: Vehicle, r: Route, t: number, peak: boolean, iso: string): void {
    const w = this.world;
    const total = Math.max(r.length_m, 1);
    const ch = this.characterOf(v.vehicle_id);
    v.timestamp = iso;
    // Buses that were already mid-trip when the sim booted: the trip "starts" when we
    // first see it. Their log therefore begins mid-route, which the UI shows as is.
    if (v.trip_start_s === undefined) v.trip_start_s = t;

    // ---- release a finished dwell or terminus layover -----------------------
    const holdUntil = v.hold_until_s ?? 0;
    const holding = holdUntil > t;
    if (!holding && holdUntil > 0) {
      v.hold_until_s = 0;
      if (v.trip_progress >= 1) {
        // layover over: turn round IN PLACE. trip_progress restarts at 0 but the
        // shape fraction is mirrored, so the bus does not jump back to the depot end.
        v.direction = v.direction === 0 ? 1 : 0;
        v.trip_progress = 0;
        // New trip. Keep this trip's log and the previous one (the drill-down compares
        // against it); anything older is dropped so memory stays flat all session.
        const seq = (v.trip_seq ?? 0) + 1;
        w.tripLog.delete(tripIdOf(v, seq - 2));
        v.trip_seq = seq;
        v.trip_start_s = t;
      }
    }

    const fwd = v.direction === 0;
    let p = v.trip_progress;
    const sNow = fwd ? p * total : (1 - p) * total;

    const next = nextStopAlong(r, sNow, fwd);
    const dTerm = (1 - p) * total;
    const dNext = next ? Math.abs(next.dist_m - sNow) : dTerm;
    v.next_stop_id = next?.stop_id ?? null;
    v.distance_to_next_stop_m = dNext;

    if (holding) {
      v.speed = 0;
      // ETA counts the remaining dwell first, then the run at a nominal pull-away pace.
      v.eta_next_stop_s = Math.round(holdUntil - t + dNext / 3);
      // A dwell at a stop is time the schedule has to absorb; a terminus layover is
      // planned recovery time and costs the schedule nothing.
      if (p < 1) v.schedule_deviation = clamp((v.schedule_deviation + this.dt) * REVERSION, -900, 3600);
      return;
    }

    // ---- target speed -------------------------------------------------------
    const rng = this.rng.movement;
    const centrality = centralityAt(v.longitude, v.latitude);
    const plannedKmh = speedFor(r, centrality, peak, this.speeds);
    const cong = w.congestion.get(r.route_id);
    let targetKmh = plannedKmh * (cong ? cong.factor : 1) * ch.aggr * (0.92 + rng.next() * 0.16);
    if (v.flags.accident) targetKmh *= 0.15; // stopped in the running lane
    if (v.flags.route_deviation) targetKmh *= 0.7; // off the corridor, slower going
    // A panic activation pulls the bus over. D5 sets speed to 0 by hand; without this
    // the next tick simply drove it away again and the scenario lost its point.
    if (v.flags.panic) targetKmh = 0;

    // ease off when closing on the bus ahead (the hard no-overtake bound is below)
    const gap = this.gapAhead.get(v.vehicle_id);
    if (gap !== undefined) {
      const safe = HEADWAY_STANDOFF_M + HEADWAY_S * (v.speed / 3.6);
      if (gap < safe) targetKmh *= Math.max(0, gap / safe);
    }

    // ---- integrate speed under the acceleration limits ----------------------
    const v0 = Math.max(0, v.speed) / 3.6;
    const dTarget = Math.max(0, Math.min(dNext, dTerm));
    // Approach envelope (Krauss safe velocity): the fastest this bus may be going at
    // the END of the tick and still pull up in `d` metres under comfort braking. It is
    // what makes a bus shed speed over the last two or three ticks into a stop rather
    // than arriving at line speed, and - applied to the gap to the bus ahead - what
    // stops a follower driving through its leader.
    let v1 = Math.min(Math.max(0, targetKmh) / 3.6, safeV(dTarget, this.dt));
    if (gap !== undefined) v1 = Math.min(v1, safeV(gap, this.dt));
    v1 = clamp(v1, v0 - A_BRAKE * this.dt, v0 + A_ACCEL * ch.aggr * this.dt);
    if (v1 < 0) v1 = 0;

    let ds = ((v0 + v1) / 2) * this.dt;
    // hard guarantee: a follower never ends the tick in front of its leader
    if (gap !== undefined && ds > gap - 1) ds = Math.max(0, gap - 1);
    let arrived = false;
    if (ds >= dTarget) {
      ds = dTarget;
      v1 = 0;
      arrived = true;
    }

    p += ds / total;
    if (p > 1) p = 1;
    v.trip_progress = p;
    v.speed = v1 * 3.6;
    v.km_today += ds / 1000;

    const [lon, lat, hdg] = pointAlong(r.shape, routeCum(r), fwd ? p : 1 - p);
    v.longitude = lon;
    v.latitude = lat;
    v.heading = fwd ? hdg : (hdg + 180) % 360;
    if (v.flags.route_deviation) {
      // visibly off the corridor: a fixed ~60 m offset to the right of the heading
      const a = ((v.heading + 90) * Math.PI) / 180;
      v.longitude += (Math.sin(a) * 0.0008) / Math.max(0.2, Math.cos((lat * Math.PI) / 180));
      v.latitude += Math.cos(a) * 0.00054;
    }
    v.distance_to_next_stop_m = Math.max(0, dNext - ds);
    // ETA from remaining distance over a speed estimate that is floored at half the
    // route's planned pace. Dividing by the raw instantaneous speed makes the number
    // jump about (and diverge as the bus brakes); the floor keeps it counting down.
    const vEst = Math.max((v0 + v1) / 2, (plannedKmh * ch.aggr) / 7.2, 1);
    v.eta_next_stop_s = Math.round(v.distance_to_next_stop_m / vEst);

    if (arrived) {
      if (dTerm <= dNext || !next) {
        v.trip_progress = 1;
        v.hold_until_s = t + LAYOVER_BASE_S * ch.layoverK;
        v.eta_next_stop_s = Math.round(v.hold_until_s - t);
      } else {
        const dwell = this.serveStop(v, r, next.stop_id, t, ch);
        v.hold_until_s = t + dwell;
        v.eta_next_stop_s = 0;
      }
    }

    // Schedule deviation = elapsed time minus the time the PLAN allows for the ground
    // covered. The plan assumes the daypart speed profile WITHOUT scenario congestion
    // and without per-vehicle character, plus PLANNED_DWELL_S at each stop (credited in
    // serveStop). Deviation therefore arises from congestion, long dwells, queueing
    // behind a leader and driver character - not from a systematically optimistic
    // timetable. Mild mean-reversion stops an unbounded random walk over a session.
    // The reference includes this driver's habitual pace (ch.aggr): a consistently
    // brisk driver is not "early" all day, they simply hold a slightly different
    // running time. Without that the aggressiveness term is a constant bias and every
    // bus walks to one of the two clamps within an hour.
    const refMs = Math.max((plannedKmh * ch.aggr * PLAN_PAD) / 3.6, 0.3);
    const lossS = this.dt - Math.min(2 * this.dt, ds / refMs);
    v.schedule_deviation = clamp((v.schedule_deviation + lossS) * REVERSION, -900, 3600);
  }

  /** Board and alight at `stop_id`; returns the dwell in seconds, which the bus
   *  actually spends standing still. */
  private serveStop(v: Vehicle, r: Route, stop_id: string, t: number, ch: Character): number {
    const w = this.world;
    const rng = this.rng.demand;
    const key = `${r.route_id}:${stop_id}`;
    const last = w.lastDeparture.get(key);
    const since = last === undefined ? this.world.timetable.planned_headway_s(r.route_id, t) : t - last;
    w.lastDeparture.set(key, t);

    const stop = r.stops.find((s) => s.stop_id === stop_id);
    const centrality = stop ? centralityAt(stop.longitude, stop.latitude) : 1;
    const hour = Math.floor((t % 86400) / 3600);
    const hw = HOUR_W[hour] ?? 0.01;
    const boost = w.demandBoost.get(r.route_id)?.factor ?? 1;

    // Arrivals accumulate with the ACTUAL headway - this is what makes bunching emerge.
    // Demand is concentrated two ways, which is what puts the deck's 70-96% loads on the
    // trunk routes while the network average stays true to 0.55M pax/day (L507-L512):
    //   - per-route demand_weight (heavy-tailed, see build.ts)
    //   - per-stop centrality (a central stop attracts far more than an outer one)
    const attractor = (1 + centrality * 1.6) * r.demand_weight * (r.kind === 'city' ? 1 : 0.5);
    const perSecond = (DAILY_PAX * hw) / 3600 / 8000; // spread across the network
    const waiting = rng.poisson(Math.max(0, perSecond * attractor * boost * Math.min(since, 3600)));

    const alightP = 0.06 + rng.next() * 0.18;
    const alighted = Math.min(v.pax_count, Math.round(v.pax_count * alightP));
    const room = Math.max(0, Math.round(v.capacity * 1.05) - (v.pax_count - alighted));
    const boarded = Math.min(waiting, room);
    v.left_behind = waiting - boarded;
    v.pax_count = Math.max(0, v.pax_count - alighted + boarded);
    v.boardings_today += boarded;

    // Dwell costs real time now - the bus stands still for it. Only the overrun ABOVE
    // the planned dwell counts against the schedule; that residual is the feedback loop
    // that makes bunching emerge (a late bus boards more, dwells longer, falls further
    // behind). The per-driver dwellK is what stops two buses on one corridor behaving
    // identically at the same stop.
    const dwell = (8 + 1.1 * (boarded + alighted)) * ch.dwellK;
    this.logArrival(v, r, stop_id, t, dwell, boarded);
    v.schedule_deviation = clamp(v.schedule_deviation - PLANNED_DWELL_S, -900, 3600);
    return dwell;
  }

  /**
   * Append one stop to the trip log and attribute the deviation gained since the
   * previous stop to the road segment the hop ran on. Called BEFORE the planned-dwell
   * credit, so dev_s is the deviation on arrival and planned arrival = t - dev_s.
   */
  private logArrival(v: Vehicle, r: Route, stop_id: string, t: number, dwell: number, boarded: number): void {
    const w = this.world;
    const idx = r.stops.findIndex((s) => s.stop_id === stop_id);
    if (idx < 0) return;
    const fwd = v.direction === 0;
    const trip_id = tripIdOf(v);
    let log = w.tripLog.get(trip_id);
    if (!log) w.tripLog.set(trip_id, (log = []));
    const prev = log[log.length - 1];
    const prevIdx = fwd ? idx - 1 : idx + 1;
    const prevStop = r.stops[prevIdx];
    const here = r.stops[idx]!;
    const seg_key = prevStop ? segmentForHop(r, prevStop.dist_m, here.dist_m) : null;
    const hop_excess_s = prev ? v.schedule_deviation - prev.dev_s : 0;
    log.push({
      trip_id,
      vehicle_id: v.vehicle_id,
      route_id: r.route_id,
      stop_idx: fwd ? idx : r.stops.length - 1 - idx,
      stop_id,
      t_s: t,
      dev_s: v.schedule_deviation,
      dwell_s: dwell,
      pax: v.pax_count,
      boarded,
      seg_key,
      hop_excess_s,
    });
    if (prev && seg_key && prevStop) {
      const km = Math.max(0.05, Math.abs(here.dist_m - prevStop.dist_m) / 1000);
      let o = w.segObs.get(seg_key);
      if (!o) w.segObs.set(seg_key, (o = { v: new Ring(SEG_OBS_N), t: new Ring(SEG_OBS_N) }));
      o.v.push(hop_excess_s / km);
      o.t.push(t);
    }
  }

  private telematics(t: number): void {
    const rng = this.rng.incidents;
    const w = this.world;
    // Age out transient flags instead of clearing them after a single tick.
    // A flag with no expiry was injected by a scenario between ticks: give it the
    // standard lifetime now rather than deleting it unseen (that bug made D4 a no-op).
    for (const v of w.vehicles) {
      for (const f of TRANSIENT_FLAGS) {
        if (!v.flags[f]) continue;
        const k = `${v.vehicle_id}:${f}`;
        const until = w.flagUntil.get(k);
        if (until === undefined) w.flagUntil.set(k, t + TRANSIENT_FLAG_S);
        else if (t >= until) {
          delete v.flags[f];
          w.flagUntil.delete(k);
        }
      }
    }
    const inSvc = w.vehicles.filter((v) => v.status === 'in_service');
    if (!inSvc.length) return;
    // ~0.3 harsh braking + 0.1 overspeed per minute fleet-wide (ASSUMPTION rates)
    const perTick = (0.3 / 60) * this.dt;
    const raise = (v: (typeof inSvc)[number], f: (typeof TRANSIENT_FLAGS)[number]) => {
      v.flags[f] = true;
      w.flagUntil.set(`${v.vehicle_id}:${f}`, t + TRANSIENT_FLAG_S);
    };
    for (let i = 0; i < rng.poisson(perTick); i++) raise(inSvc[rng.int(inSvc.length)]!, 'harsh_braking');
    for (let i = 0; i < rng.poisson(perTick / 3); i++) raise(inSvc[rng.int(inSvc.length)]!, 'overspeed');
  }

  private devices(t: number): void {
    const rng = this.rng.devices;
    const w = this.world;
    // rare spontaneous recovery so counts do not creep upward all session
    if (rng.next() < 0.004) {
      const broken = w.vehicles.filter(
        (v) => v.equipment.afc === 'offline' || v.equipment.cctv === 'offline' || v.equipment.tbox === 'offline',
      );
      if (broken.length > 6) {
        const v = broken[rng.int(broken.length)]!;
        v.equipment.afc = 'ok';
        v.equipment.cctv = 'ok';
        v.equipment.tbox = 'ok';
      }
    }
    void t;
  }
}

function clamp(x: number, lo: number, hi: number): number {
  return x < lo ? lo : x > hi ? hi : x;
}

function byProgress(a: Vehicle, b: Vehicle): number {
  return a.trip_progress - b.trip_progress;
}

/** Sim seconds since midnight -> ISO 8601 on the demo date, UB offset +08:00. */
export function isoAt(sim_time_s: number): string {
  const s = Math.floor(sim_time_s % 86400);
  const hh = String(Math.floor(s / 3600)).padStart(2, '0');
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `2026-09-21T${hh}:${mm}:${ss}+08:00`;
}

export function hhmm(sim_time_s: number): string {
  const s = Math.floor(sim_time_s % 86400);
  return `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}`;
}

export function hhmmss(sim_time_s: number): string {
  const s = Math.floor(sim_time_s % 86400);
  return `${hhmm(sim_time_s)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * Sim-seconds from an ISO stamp produced by `isoAt`.
 *
 * `isoAt` emits a FIXED +08:00 offset (Ulaanbaatar). Parsing it with `new Date(iso)`
 * and reading `getHours()` reinterprets it in the machine's local zone, so every
 * rendered time was wrong by the difference - 2h30m on a UTC+5:30 machine, silently.
 * Four modules had their own copy of that bug, which is why the activity feed mixed
 * correct rows (raw sim seconds) with shifted ones (parsed stamps) in one list.
 *
 * Read the wall-clock fields out of the string instead: no zone, no drift.
 */
export function simSecondsOf(iso: string): number {
  return (
    Number(iso.slice(11, 13)) * 3600 + Number(iso.slice(14, 16)) * 60 + Number(iso.slice(17, 19))
  );
}

export function parseHms(v: string): number {
  const [h, m, s] = v.split(':').map(Number);
  return (h ?? 0) * 3600 + (m ?? 0) * 60 + (s ?? 0);
}
