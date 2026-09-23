/**
 * Deterministic world builder: 121 routes, ~1,100 vehicles, from the corridor graph.
 *
 * Scale is CONFIRMED from the sources:
 *   121 routes = 104 city + 17 suburban  (L465)
 *   ~1,100 buses, 1,086 in service        (L195, S7)
 *   97 routes operating                   (S7)
 * Geometry, stop spacing and operator shares are demo-grade assumptions.
 */

import { ADJ, NODE_BY_ID, NODES, OUTER, type Node } from './corridors';
import { ROAD_ANCHORS, ROAD_GRAPH_STATS, ROAD_SEGMENTS } from './roads';
import { cumulative, haversine } from '../sim/geo';
import { mulberry32, type Rng } from '../sim/rng';
import type { OperatorId, Route, Stop, Vehicle, World } from '../sim/types';
import { buildTimetable } from '../sim/timetable';

export const FLEET_TOTAL = 1100;
export const FLEET_IN_SERVICE = 1086;
export const ROUTES_TOTAL = 121;
export const ROUTES_CITY = 104;
export const ROUTES_ACTIVE = 97;

/** Routes the deck names by number - these get hand-anchored corridors (S5,S7,S8,S9). */
const HERO: Record<string, string[]> = {
  R3: ['n-tolgoit', 'n-tsaiz', 'n-dragon', 'n-bayangol', 'n-3r4r', 'n-ard', 'n-peace-w', 'n-sukhbaatar'],
  R4: ['n-bkh-2', 'n-bkh-1', 'n-dragon', 'n-bayangol', 'n-3r4r', 'n-toiruu-sw', 'n-officers'],
  R5: ['n-yarmag', 'n-khanuul', 'n-officers', 'n-sukhbaatar', 'n-peace-e', 'n-13r', 'n-sansar'],
  R7: ['n-dragon', 'n-bayangol', 'n-3r4r', 'n-ard', 'n-peace-w', 'n-sukhbaatar', 'n-peace-e', 'n-13r'],
  R10: ['n-songino', 'n-tolgoit', 'n-tsaiz', 'n-dragon', 'n-bayangol', 'n-3r4r'],
  R12: ['n-bkh-3', 'n-bkh-2', 'n-bkh-1', 'n-dragon', 'n-bayangol', 'n-3r4r', 'n-ard', 'n-peace-w', 'n-sukhbaatar'],
  R15: ['n-chingeltei', 'n-5khoroo', 'n-peace-w', 'n-sukhbaatar', 'n-officers', 'n-khanuul'],
  R18: ['n-amgalan', 'n-bayanzurkh', 'n-sansar', 'n-13r', 'n-peace-e', 'n-sukhbaatar'],
  R21: ['n-dambadarjaa', 'n-selbe', 'n-sukhbaatar', 'n-officers', 'n-toiruu-sw', 'n-3r4r'],
  R22: ['n-zaisan', 'n-khanuul', 'n-officers', 'n-sukhbaatar', 'n-peace-w', 'n-ard'],
  R23: ['n-nisekh', 'n-yarmag', 'n-khanuul', 'n-officers', 'n-sukhbaatar', 'n-peace-e', 'n-5khoroo'],
  R24: ['n-emeelt', 'n-songino', 'n-tolgoit', 'n-tsaiz', 'n-dragon', 'n-bayangol'],
};

function randomPath(rng: Rng, minLen: number, maxLen: number, mustTouchOuter: boolean): string[] {
  for (let attempt = 0; attempt < 200; attempt++) {
    const start = rng.pick(NODES).id;
    const path = [start];
    const seen = new Set([start]);
    const target = Math.round(rng.range(minLen, maxLen));
    while (path.length < target) {
      const opts = ADJ.get(path[path.length - 1]!)!.filter((n) => !seen.has(n));
      if (opts.length === 0) break;
      // bias toward central nodes so routes look like a real radial network
      const weighted: string[] = [];
      for (const o of opts) {
        const c = NODE_BY_ID.get(o)!.centrality;
        for (let i = 0; i <= c; i++) weighted.push(o);
      }
      const nxt = rng.pick(weighted);
      path.push(nxt);
      seen.add(nxt);
    }
    if (path.length < minLen) continue;
    const touchesOuter = path.some((p) => OUTER.has(p));
    const touchesCentre = path.some((p) => NODE_BY_ID.get(p)!.centrality === 2);
    if (mustTouchOuter && !touchesOuter) continue;
    if (!mustTouchOuter && !touchesCentre) continue;
    return path;
  }
  // fallback: straight spine
  return ['n-dragon', 'n-bayangol', 'n-3r4r', 'n-ard', 'n-peace-w', 'n-sukhbaatar'];
}

/** Where a corridor node sits on the real road network (falls back to its declared point). */
function anchor(id: string): [number, number] {
  const a = ROAD_ANCHORS[id];
  if (a) return a;
  const n = NODE_BY_ID.get(id)!;
  return [n.lon, n.lat];
}

/**
 * The routed polyline for one corridor edge, as extracted from the bundled vector tiles
 * by tools/build-roads.mjs. Segments are stored undirected; reverse for the other way.
 */
function roadSegment(a: string, b: string): [number, number][] | null {
  const fwd = ROAD_SEGMENTS[`${a}|${b}`];
  if (fwd) return fwd;
  const rev = ROAD_SEGMENTS[`${b}|${a}`];
  if (rev) return [...rev].reverse();
  return null;
}

/**
 * Documented fallback for the few corridor pairs the road graph cannot connect
 * (ROAD_FALLBACK_PAIRS - currently 3 of 48, all on the far outskirts). A straight line
 * between the two road anchors: honest, and it joins the routed segments either side
 * without a jump because both ends are the same on-road points.
 */
function straightSegment(a: string, b: string): [number, number][] {
  const p = anchor(a);
  const q = anchor(b);
  // same 250 m max hop as the routed segments, so movement stays smooth either side
  const steps = Math.max(8, Math.ceil(haversine(p, q) / 250));
  const out: [number, number][] = [];
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
  }
  return out;
}

/**
 * Turn a corridor node path into a polyline that LIES ON REAL STREETS.
 *
 * Geometry is baked, not computed: tools/build-roads.mjs decodes the bundled
 * OpenMapTiles vector tiles once at build time and shortest-paths every corridor edge
 * along the road graph, so page load is fast and every machine gets byte-identical
 * shapes. Nothing here draws from the rng - the shape of a route is data, not chance.
 */
function toShape(path: string[], marks: { key: string; ptIdx: number }[] = []): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < path.length - 1; i++) {
    const seg = roadSegment(path[i]!, path[i + 1]!) ?? straightSegment(path[i]!, path[i + 1]!);
    // Remember where each corridor edge starts on the shape, so delay can later be
    // attributed to a named road segment. The key is canonical (a < b), as in roads.ts.
    const [a, b] = [path[i]!, path[i + 1]!];
    marks.push({ key: a < b ? `${a}|${b}` : `${b}|${a}`, ptIdx: Math.max(0, pts.length - 1) });
    for (const p of seg) {
      const last = pts[pts.length - 1];
      if (last && last[0] === p[0] && last[1] === p[1]) continue;
      pts.push([p[0], p[1]]);
    }
  }
  if (pts.length < 2) {
    const a = anchor(path[0]!);
    return [a, [a[0] + 1e-4, a[1]]];
  }
  return pts;
}

function makeStops(
  route_id: string,
  shape: [number, number][],
  cum: Float64Array,
  path: string[],
  kind: 'city' | 'suburban',
  rng: Rng,
): Stop[] {
  const total = cum[cum.length - 1]!;
  const spacing = kind === 'city' ? rng.range(400, 520) : rng.range(800, 1100);
  const n = Math.max(6, Math.min(40, Math.floor(total / spacing)));
  const stops: Stop[] = [];
  for (let i = 0; i < n; i++) {
    const d = (total * i) / (n - 1 || 1);
    // find the shape index nearest d
    let idx = 0;
    while (idx < cum.length - 1 && cum[idx + 1]! < d) idx++;
    const p = shape[idx]!;
    // name from the nearest graph node
    const node = nearestNode(p);
    stops.push({
      stop_id: `${route_id}-S${i}`,
      name_en: `${node.name_en} ${i + 1}`,
      name_mn: `${node.name_mn} ${i + 1}`,
      latitude: p[1],
      longitude: p[0],
      dist_m: d,
    });
  }
  return stops;
}

function nearestNode(p: [number, number]): Node {
  let best = NODES[0]!;
  let bd = Infinity;
  for (const n of NODES) {
    const d = (n.lon - p[0]) ** 2 + (n.lat - p[1]) ** 2;
    if (d < bd) {
      bd = d;
      best = n;
    }
  }
  return best;
}

/**
 * Heavy-tailed demand weight, mean ~1.
 *
 * The routes the deck names as busiest (S8 Chart C: R5 96%, R18 91%, R22 87%, R10 78%,
 * R3 72%) are pinned high so those figures are reachable at peak without a scenario
 * hard-setting them. Everything else is lognormal, which is what a real network looks
 * like: a few trunk corridors, a long tail of quiet feeders.
 */
const TRUNK: Record<string, number> = {
  R5: 4.2, R18: 3.9, R22: 3.6, R7: 3.4, R12: 3.2, R10: 3.0, R3: 2.8, R23: 2.4, R21: 2.0, R24: 1.6,
};

function demandWeight(route_id: string, kind: 'city' | 'suburban', rng: Rng): number {
  const pinned = TRUNK[route_id];
  if (pinned !== undefined) return pinned;
  // lognormal, clipped; suburban routes carry materially less
  const w = Math.exp(rng.normal(-0.35, 0.75));
  return Math.min(3.2, Math.max(0.15, w)) * (kind === 'suburban' ? 0.45 : 1);
}

const OPERATOR_OF = (i: number): OperatorId => (i % 20 < 9 ? 'A' : i % 20 < 16 ? 'B' : 'C');

export function buildRoutes(seed: number): Route[] {
  const rng = mulberry32(seed ^ 0x5eed);
  const routes: Route[] = [];
  for (let i = 1; i <= ROUTES_TOTAL; i++) {
    const route_id = `R${i}`;
    const kind: 'city' | 'suburban' = i <= ROUTES_CITY ? 'city' : 'suburban';
    const path = HERO[route_id] ?? randomPath(rng, kind === 'city' ? 5 : 4, kind === 'city' ? 9 : 7, kind === 'suburban');
    const marks: { key: string; ptIdx: number }[] = [];
    const shape = toShape(path, marks);
    const cum = cumulative(shape);
    const length_m = cum[cum.length - 1]!;
    const edges = marks.map((mk, j) => ({
      key: mk.key,
      from_m: cum[Math.min(mk.ptIdx, cum.length - 1)]!,
      to_m: j + 1 < marks.length ? cum[Math.min(marks[j + 1]!.ptIdx, cum.length - 1)]! : length_m,
    }));
    const stops = makeStops(route_id, shape, cum, path, kind, rng);
    const base = kind === 'city' ? 1 : 1.9;
    routes.push({
      route_id,
      name_en: `${NODE_BY_ID.get(path[0]!)!.name_en} – ${NODE_BY_ID.get(path[path.length - 1]!)!.name_en}`,
      name_mn: `${NODE_BY_ID.get(path[0]!)!.name_mn} – ${NODE_BY_ID.get(path[path.length - 1]!)!.name_mn}`,
      operator_id: OPERATOR_OF(i),
      kind,
      active: true, // adjusted below
      shape,
      length_m,
      stops,
      edges,
      demand_weight: demandWeight(route_id, kind, rng),
      planned_headway_s:
        route_id === 'R7'
          ? // S8 chart B: R7 planned headway is ~10 min all day
            { amPeak: 600, offPeak: 600, pmPeak: 600, evening: 900 }
          : {
              amPeak: Math.round(base * rng.range(420, 600)),
              offPeak: Math.round(base * rng.range(660, 900)),
              pmPeak: Math.round(base * rng.range(420, 600)),
              evening: Math.round(base * rng.range(1000, 1500)),
            },
    });
  }
  // 97 of 121 operating today (S7). Deactivate 24, never a hero route.
  const heroIds = new Set(Object.keys(HERO));
  let toDeactivate = ROUTES_TOTAL - ROUTES_ACTIVE;
  for (let i = routes.length - 1; i >= 0 && toDeactivate > 0; i--) {
    if (heroIds.has(routes[i]!.route_id)) continue;
    routes[i]!.active = false;
    toDeactivate--;
  }
  return routes;
}

export function buildWorld(seed: number, startSimTimeS: number): World {
  const routes = buildRoutes(seed);
  const active = routes.filter((r) => r.active);
  const rngv = mulberry32(seed ^ 0xf1ee7);

  // allocate vehicles across active routes proportional to length / headway
  const weights = active.map((r) => r.length_m / Math.max(r.planned_headway_s.amPeak, 120));
  const wsum = weights.reduce((a, b) => a + b, 0);
  const alloc = weights.map((w) => Math.max(2, Math.round((w / wsum) * FLEET_IN_SERVICE)));
  let allocSum = alloc.reduce((a, b) => a + b, 0);
  // trim/pad to exactly FLEET_IN_SERVICE
  let idx = 0;
  while (allocSum > FLEET_IN_SERVICE) {
    if (alloc[idx % alloc.length]! > 2) {
      alloc[idx % alloc.length]!--;
      allocSum--;
    }
    idx++;
  }
  while (allocSum < FLEET_IN_SERVICE) {
    alloc[idx % alloc.length]!++;
    allocSum++;
    idx++;
  }

  const vehicles: Vehicle[] = [];
  const counters: Record<OperatorId, number> = { A: 0, B: 0, C: 0 };
  const opNum: Record<OperatorId, number> = { A: 1, B: 2, C: 3 };

  // Vehicles the deck names by number (S5, S7). Reserved up front so the ordinary
  // counter can never mint a colliding id.
  const named = new Set(['3-015', '3-305', '2-418', '1-042', '2-118', '3-022', '1-207']);
  const namedQueue = [...named];
  const used = new Set<string>(named);

  const nextId = (op: OperatorId): string => {
    let id: string;
    do {
      counters[op]++;
      id = `${opNum[op]}-${String(counters[op]).padStart(3, '0')}`;
    } while (used.has(id));
    used.add(id);
    return id;
  };

  for (let ri = 0; ri < active.length; ri++) {
    const r = active[ri]!;
    const cum = cumulative(r.shape);
    const n = alloc[ri]!;
    for (let k = 0; k < n; k++) {
      const op = r.operator_id;
      let vehicle_id = nextId(op);
      // guarantee the deck's named vehicles exist, on their deck routes
      if (r.route_id === 'R12' && namedQueue.includes('3-015') && k === 0) {
        vehicle_id = '3-015';
        namedQueue.splice(namedQueue.indexOf('3-015'), 1);
      } else if (r.route_id === 'R12' && namedQueue.includes('3-305') && k === 1) {
        vehicle_id = '3-305';
        namedQueue.splice(namedQueue.indexOf('3-305'), 1);
      } else if (r.route_id === 'R12' && namedQueue.includes('3-022') && k === 2) {
        vehicle_id = '3-022';
        namedQueue.splice(namedQueue.indexOf('3-022'), 1);
      } else if (r.route_id === 'R18' && namedQueue.includes('2-418') && k === 0) {
        vehicle_id = '2-418';
        namedQueue.splice(namedQueue.indexOf('2-418'), 1);
      } else if (r.route_id === 'R23' && namedQueue.includes('1-042') && k === 0) {
        vehicle_id = '1-042';
        namedQueue.splice(namedQueue.indexOf('1-042'), 1);
      } else if (r.route_id === 'R5' && namedQueue.includes('2-118') && k === 0) {
        vehicle_id = '2-118';
        namedQueue.splice(namedQueue.indexOf('2-118'), 1);
      } else if (r.route_id === 'R7' && namedQueue.includes('1-207') && k === 0) {
        vehicle_id = '1-207';
        namedQueue.splice(namedQueue.indexOf('1-207'), 1);
      }

      const progress = (k + rngv.range(0, 0.4)) / n;
      const articulated = rngv.next() < 0.1;
      const p = r.shape[Math.min(r.shape.length - 1, Math.floor(progress * (r.shape.length - 1)))]!;
      vehicles.push({
        vehicle_id,
        route_id: r.route_id,
        operator_id: op,
        timestamp: new Date(Date.UTC(2026, 8, 21, 0, 0, 0)).toISOString(),
        latitude: p[1],
        longitude: p[0],
        speed: 0,
        heading: 0,
        trip_progress: progress % 1,
        direction: k % 2 === 0 ? 0 : 1,
        schedule_deviation: Math.round(rngv.normal(0, 90)),
        pax_count: 0,
        capacity: articulated ? 120 : 80,
        status: 'in_service',
        door_status: 'normal',
        driver_status: 'normal',
        driver_id: `D-${String(1000 + vehicles.length).slice(-4)}`,
        next_stop_id: r.stops[0]?.stop_id ?? null,
        distance_to_next_stop_m: 0,
        equipment: { afc: 'ok', cctv: 'ok', tbox: 'ok' },
        flags: {},
        left_behind: 0,
        boardings_today: 0,
        km_today: 0,
      });
      void cum;
    }
  }

  // 14 vehicles at depot (1,100 total - 1,086 in service)
  for (let i = 0; i < FLEET_TOTAL - FLEET_IN_SERVICE; i++) {
    const op: OperatorId = i % 3 === 0 ? 'A' : i % 3 === 1 ? 'B' : 'C';
    vehicles.push({
      vehicle_id: nextId(op),
      route_id: active[i % active.length]!.route_id,
      operator_id: op,
      timestamp: new Date(Date.UTC(2026, 8, 21, 0, 0, 0)).toISOString(),
      latitude: 47.9188,
      longitude: 106.9176,
      speed: 0,
      heading: 0,
      trip_progress: 0,
      direction: 0,
      schedule_deviation: 0,
      pax_count: 0,
      capacity: 80,
      status: 'out_of_service',
      door_status: 'normal',
      driver_status: 'normal',
      driver_id: `D-${String(9000 + i).slice(-4)}`,
      next_stop_id: null,
      distance_to_next_stop_m: 0,
      equipment: { afc: 'ok', cctv: 'ok', tbox: 'ok' },
      flags: {},
      left_behind: 0,
      boardings_today: 0,
      km_today: 0,
    });
  }

  seedDeviceBaseline(vehicles);

  const routeById = new Map(routes.map((r) => [r.route_id, r]));
  return {
    routes,
    routeById,
    vehicles,
    vehicleById: new Map(vehicles.map((v) => [v.vehicle_id, v])),
    timetable: buildTimetable(routes),
    sim_time_s: startSimTimeS,
    seed,
    lastDeparture: new Map(),
    congestion: new Map(),
    demandBoost: new Map(),
    suspended: new Set(),
    flagUntil: new Map(),
    feed_stale: false,
    tripLog: new Map(),
    speedLog: new Map(),
    segObs: new Map(),
  };
}

/**
 * The deck's opening device-failure counts: AFC 7, CCTV 3, T-Box 2 (S7, S9).
 *
 * Exported because scenario resets must RESTORE this baseline, not clear it. Wiping
 * every device to 'ok' on reset would silently delete the numbers the client's own
 * slides open with, and the demo would show a perfect fleet the moment the presenter
 * pressed a scenario key.
 */
export function seedDeviceBaseline(vehicles: Vehicle[]): void {
  for (const v of vehicles) v.equipment = { afc: 'ok', cctv: 'ok', tbox: 'ok' };
  const inSvc = vehicles.filter((v) => v.status === 'in_service');
  const opB = inSvc.filter((v) => v.operator_id === 'B');
  const others = inSvc.filter((v) => v.operator_id !== 'B');
  // 5 of the 7 AFC failures sit on Operator B so the repeated-failure pattern (L1124) is real
  for (let i = 0; i < 5; i++) opB[(i * 37) % opB.length]!.equipment.afc = 'offline';
  for (let i = 0; i < 2; i++) others[(i * 53) % others.length]!.equipment.afc = 'offline';
  for (let i = 0; i < 3; i++) others[(100 + i * 29) % others.length]!.equipment.cctv = 'offline';
  for (let i = 0; i < 2; i++) others[(300 + i * 31) % others.length]!.equipment.tbox = 'offline';
}

/**
 * Cached cumulative-distance arrays.
 * Keyed on the Route OBJECT, not route_id: two worlds built with different seeds have
 * different geometry for the same route_id, and a shared id-keyed cache hands the
 * wrong-length array to pointAlong.
 */
const cumCache = new WeakMap<Route, Float64Array>();
export function routeCum(r: Route): Float64Array {
  let c = cumCache.get(r);
  if (!c) {
    c = cumulative(r.shape);
    cumCache.set(r, c);
  }
  return c;
}

export { haversine };
export { ROAD_GRAPH_STATS };
