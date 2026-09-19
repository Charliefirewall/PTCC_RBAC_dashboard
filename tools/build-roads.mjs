/**
 * Offline road-graph extractor. Run once at build time:
 *
 *   npx tsx tools/build-roads.mjs
 *
 * Reads the bundled OpenMapTiles vector tiles in public/tiles/14, pulls drivable
 * LineStrings out of the `transportation` layer, stitches them into a connected
 * graph, then shortest-paths every corridor edge onto real streets and writes the
 * result to src/data/roads.ts as committed data.
 *
 * No network, no new npm dependency: @mapbox/vector-tile + pbf are already in
 * node_modules (transitively, via maplibre-gl / vt-pbf), so no hand-rolled MVT
 * decoder was needed.
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EDGES, NODES } from '../src/data/corridors.ts';

const require = createRequire(import.meta.url);
const { VectorTile } = require('@mapbox/vector-tile');
const Pbf = require('pbf');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const Z = 14;

/** Cost multiplier per OpenMapTiles road class: lower = a bus prefers it. */
const CLASS_COST = {
  motorway: 1.0,
  trunk: 1.0,
  busway: 1.0,
  primary: 1.05,
  secondary: 1.15,
  tertiary: 1.35,
  minor: 1.9,
  unclassified: 1.9,
  residential: 1.9,
  service: 3.0,
};

// ---------------------------------------------------------------- geometry
const R = 6371000;
const rad = (d) => (d * Math.PI) / 180;
function haversine(a, b) {
  const dLat = rad(b[1] - a[1]);
  const dLon = rad(b[0] - a[0]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// ---------------------------------------------------------------- graph
/** Spatial hash so endpoints that differ by < SNAP_M across a tile seam become one node. */
const SNAP_M = 4;
const CELL = 0.0005; // ~37 m, so a 3x3 cell probe always covers SNAP_M
const cells = new Map();
const nodeLon = [];
const nodeLat = [];
/** Best (lowest) road-class cost touching each vertex - used to snap corridor nodes to arterials. */
const nodeClass = [];
/** adjacency: nodeIdx -> Map(neighbourIdx -> weighted cost) */
const adj = [];

function nodeAt(lon, lat) {
  const cx = Math.floor(lon / CELL);
  const cy = Math.floor(lat / CELL);
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const bucket = cells.get(`${cx + dx}:${cy + dy}`);
      if (!bucket) continue;
      for (const i of bucket) {
        if (haversine([lon, lat], [nodeLon[i], nodeLat[i]]) <= SNAP_M) return i;
      }
    }
  }
  const i = nodeLon.length;
  nodeLon.push(lon);
  nodeLat.push(lat);
  nodeClass.push(Infinity);
  adj.push(new Map());
  const key = `${cx}:${cy}`;
  const bucket = cells.get(key);
  if (bucket) bucket.push(i);
  else cells.set(key, [i]);
  return i;
}

function link(a, b, cost) {
  if (a === b) return;
  const existing = adj[a].get(b);
  if (existing === undefined || cost < existing) {
    adj[a].set(b, cost);
    adj[b].set(a, cost);
  }
}

// ---------------------------------------------------------------- decode
let tilesRead = 0;
let linesUsed = 0;
const classSeen = new Map();

const zdir = path.join(ROOT, 'public', 'tiles', String(Z));
// deterministic traversal order
const xs = fs.readdirSync(zdir).sort((a, b) => Number(a) - Number(b));
for (const x of xs) {
  const ys = fs
    .readdirSync(path.join(zdir, x))
    .sort((a, b) => Number(a.split('.')[0]) - Number(b.split('.')[0]));
  for (const yf of ys) {
    const buf = fs.readFileSync(path.join(zdir, x, yf));
    const tile = new VectorTile(new Pbf(buf));
    tilesRead++;
    const layer = tile.layers.transportation;
    if (!layer) continue;
    for (let i = 0; i < layer.length; i++) {
      const ft = layer.feature(i);
      const cls = ft.properties.class;
      const cost = CLASS_COST[cls];
      if (cost === undefined) continue;
      classSeen.set(cls, (classSeen.get(cls) || 0) + 1);
      const gj = ft.toGeoJSON(Number(x), Number(yf.split('.')[0]), Z);
      if (gj.geometry.type !== 'LineString' && gj.geometry.type !== 'MultiLineString') continue;
      const strands =
        gj.geometry.type === 'LineString' ? [gj.geometry.coordinates] : gj.geometry.coordinates;
      for (const line of strands) {
        if (line.length < 2) continue;
        linesUsed++;
        let prev = nodeAt(line[0][0], line[0][1]);
        nodeClass[prev] = Math.min(nodeClass[prev], cost);
        for (let k = 1; k < line.length; k++) {
          const cur = nodeAt(line[k][0], line[k][1]);
          nodeClass[cur] = Math.min(nodeClass[cur], cost);
          const d = haversine([nodeLon[prev], nodeLat[prev]], [nodeLon[cur], nodeLat[cur]]);
          if (d > 0) link(prev, cur, d * cost);
          prev = cur;
        }
      }
    }
  }
}

// ---------------------------------------------------------------- stitch tile seams
/**
 * OpenMapTiles clips every road at the tile buffer (64 units ~ 38 m past the edge), so a
 * road crossing a tile boundary ends in a dangling stub that OVERLAPS - but shares no
 * vertex with - the same road in the neighbouring tile. Without this pass the graph
 * breaks at every tile seam (7,220 components) and Dijkstra detours around half the city.
 *
 * Fix: project each dangling endpoint onto the nearest nearby segment and splice it in.
 */
const STITCH_M = 70;
const SCELL = 0.0022; // ~165 m, so a 3x3 probe always covers STITCH_M
{
  const segCells = new Map();
  const segs = [];
  for (let u = 0; u < adj.length; u++) {
    for (const [v, cost] of adj[u]) {
      if (v <= u) continue;
      const si = segs.length;
      segs.push([u, v, cost]);
      const seen = new Set();
      for (const [lon, lat] of [
        [nodeLon[u], nodeLat[u]],
        [nodeLon[v], nodeLat[v]],
        [(nodeLon[u] + nodeLon[v]) / 2, (nodeLat[u] + nodeLat[v]) / 2],
      ]) {
        const k = `${Math.floor(lon / SCELL)}:${Math.floor(lat / SCELL)}`;
        if (seen.has(k)) continue;
        seen.add(k);
        const b = segCells.get(k);
        if (b) b.push(si);
        else segCells.set(k, [si]);
      }
    }
  }

  const dangling = [];
  for (let i = 0; i < adj.length; i++) if (adj[i].size <= 1) dangling.push(i);

  let stitched = 0;
  for (const d of dangling) {
    const lon = nodeLon[d];
    const lat = nodeLat[d];
    const kx = Math.cos(rad(lat)) * 111320;
    const ky = 110540;
    const px = lon * kx;
    const py = lat * ky;
    const cx = Math.floor(lon / SCELL);
    const cy = Math.floor(lat / SCELL);
    let best = null;
    let bd = STITCH_M;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const bucket = segCells.get(`${cx + dx}:${cy + dy}`);
        if (!bucket) continue;
        for (const si of bucket) {
          const [u, v] = segs[si];
          if (u === d || v === d || adj[d].has(u) || adj[d].has(v)) continue;
          const ax = nodeLon[u] * kx;
          const ay = nodeLat[u] * ky;
          const ex = nodeLon[v] * kx - ax;
          const ey = nodeLat[v] * ky - ay;
          const len2 = ex * ex + ey * ey;
          if (len2 === 0) continue;
          let t = ((px - ax) * ex + (py - ay) * ey) / len2;
          t = Math.max(0, Math.min(1, t));
          const dist = Math.hypot(px - (ax + t * ex), py - (ay + t * ey));
          if (dist < bd) {
            bd = dist;
            best = [si, t];
          }
        }
      }
    }
    if (!best) continue;
    const [si, t] = best;
    const [u, v, cost] = segs[si];
    const plon = nodeLon[u] + (nodeLon[v] - nodeLon[u]) * t;
    const plat = nodeLat[u] + (nodeLat[v] - nodeLat[u]) * t;
    const p = nodeAt(plon, plat);
    if (p === d) continue;
    if (p !== u && p !== v) {
      // splice the projection point into the segment, splitting its cost by length
      const segLen = haversine([nodeLon[u], nodeLat[u]], [nodeLon[v], nodeLat[v]]) || 1;
      const perM = cost / segLen;
      link(u, p, perM * haversine([nodeLon[u], nodeLat[u]], [nodeLon[p], nodeLat[p]]));
      link(p, v, perM * haversine([nodeLon[p], nodeLat[p]], [nodeLon[v], nodeLat[v]]));
    }
    // connector: priced as ordinary arterial so it is never a shortcut worth abusing
    link(d, p, Math.max(bd, 0.5));
    stitched++;
  }
  console.log(`seam stitch      : ${stitched} of ${dangling.length} dangling endpoints spliced`);
}

let edgeCount = 0;
for (const m of adj) edgeCount += m.size;
edgeCount /= 2;

// ---------------------------------------------------------------- components
const comp = new Int32Array(adj.length).fill(-1);
let nComp = 0;
let bestComp = -1;
let bestSize = 0;
for (let s = 0; s < adj.length; s++) {
  if (comp[s] !== -1) continue;
  const id = nComp++;
  let size = 0;
  const stack = [s];
  comp[s] = id;
  while (stack.length) {
    const v = stack.pop();
    size++;
    for (const w of adj[v].keys()) {
      if (comp[w] === -1) {
        comp[w] = id;
        stack.push(w);
      }
    }
  }
  if (size > bestSize) {
    bestSize = size;
    bestComp = id;
  }
}

// ---------------------------------------------------------------- routing
/** Nearest graph vertex in the main component to a corridor node. */
function snap(lon, lat) {
  // Prefer an arterial within 350 m: a corridor node dropped onto a random service stub
  // sends Dijkstra on a tour of the back streets before it reaches the road it wants.
  let best = -1;
  let bd = Infinity;
  let bestArterial = -1;
  let bdArterial = Infinity;
  for (let i = 0; i < nodeLon.length; i++) {
    if (comp[i] !== bestComp) continue;
    const d = (nodeLon[i] - lon) ** 2 + (nodeLat[i] - lat) ** 2;
    if (d < bd) {
      bd = d;
      best = i;
    }
    if (nodeClass[i] <= 1.35 && d < bdArterial) {
      bdArterial = d;
      bestArterial = i;
    }
  }
  if (bestArterial !== -1 && haversine([lon, lat], [nodeLon[bestArterial], nodeLat[bestArterial]]) <= 350) {
    best = bestArterial;
  }
  return { idx: best, dist_m: haversine([lon, lat], [nodeLon[best], nodeLat[best]]) };
}

/** Binary min-heap of [cost, node]. */
function heapPush(h, item) {
  h.push(item);
  let i = h.length - 1;
  while (i > 0) {
    const p = (i - 1) >> 1;
    if (h[p][0] <= h[i][0]) break;
    const t = h[p];
    h[p] = h[i];
    h[i] = t;
    i = p;
  }
}
function heapPop(h) {
  const top = h[0];
  const last = h.pop();
  if (h.length) {
    h[0] = last;
    let i = 0;
    for (;;) {
      const l = 2 * i + 1;
      const r = l + 1;
      let s = i;
      if (l < h.length && h[l][0] < h[s][0]) s = l;
      if (r < h.length && h[r][0] < h[s][0]) s = r;
      if (s === i) break;
      const t = h[s];
      h[s] = h[i];
      h[i] = t;
      i = s;
    }
  }
  return top;
}

function dijkstra(from, to) {
  const dist = new Float64Array(adj.length).fill(Infinity);
  const prev = new Int32Array(adj.length).fill(-1);
  const done = new Uint8Array(adj.length);
  dist[from] = 0;
  const h = [[0, from]];
  while (h.length) {
    const [d, v] = heapPop(h);
    if (done[v]) continue;
    done[v] = 1;
    if (v === to) break;
    for (const [w, c] of adj[v]) {
      const nd = d + c;
      if (nd < dist[w]) {
        dist[w] = nd;
        prev[w] = v;
        heapPush(h, [nd, w]);
      }
    }
  }
  if (!done[to]) return null;
  const out = [];
  for (let v = to; v !== -1; v = prev[v]) out.push(v);
  return out.reverse();
}

/** Douglas-Peucker. Keeps a subset of the ORIGINAL vertices, so output stays on the centreline. */
function simplify(pts, tolM) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = 1;
  keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    if (b - a < 2) continue;
    const kx = Math.cos(rad(pts[a][1])) * 111320;
    const ky = 110540;
    const ax = pts[a][0] * kx;
    const ay = pts[a][1] * ky;
    const dx = pts[b][0] * kx - ax;
    const dy = pts[b][1] * ky - ay;
    const len2 = dx * dx + dy * dy;
    let bi = -1;
    let bd = tolM;
    for (let i = a + 1; i < b; i++) {
      const px = pts[i][0] * kx;
      const py = pts[i][1] * ky;
      let t = len2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
      t = Math.max(0, Math.min(1, t));
      const d = Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
      if (d > bd) {
        bd = d;
        bi = i;
      }
    }
    if (bi !== -1) {
      keep[bi] = 1;
      stack.push([a, bi], [bi, b]);
    }
  }
  return pts.filter((_, i) => keep[i]);
}

const round6 = (v) => Math.round(v * 1e6) / 1e6;

/**
 * Split any hop longer than MAX_HOP_M. Douglas-Peucker leaves a single 1.2 km chord on a
 * dead-straight arterial, and the simulator interpolates linearly between vertices - a
 * long chord is where a bus would visibly cut a corner. Inserted points sit on the chord,
 * which is within the 3 m simplify tolerance of the real centreline.
 */
const MAX_HOP_M = 250;
function densify(pts) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const d = haversine(pts[i - 1], pts[i]);
    const n = Math.ceil(d / MAX_HOP_M);
    for (let k = 1; k < n; k++) {
      const t = k / n;
      out.push([
        pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t,
        pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t,
      ]);
    }
    out.push(pts[i]);
  }
  return out;
}

const nodeById = new Map(NODES.map((n) => [n.id, n]));
const snapped = new Map();
for (const n of NODES) snapped.set(n.id, snap(n.lon, n.lat));

const pairs = new Set(EDGES.map(([a, b]) => (a < b ? `${a}|${b}` : `${b}|${a}`)));

const segments = {};
let routed = 0;
const failed = [];
let straightSum = 0;
let roadSum = 0;
for (const key of [...pairs].sort()) {
  const [a, b] = key.split('|');
  const A = nodeById.get(a);
  const B = nodeById.get(b);
  const p = dijkstra(snapped.get(a).idx, snapped.get(b).idx);
  const straight = haversine([A.lon, A.lat], [B.lon, B.lat]);
  if (!p || p.length < 2) {
    failed.push(key);
    continue;
  }
  const pts = densify(
    simplify(
      p.map((i) => [nodeLon[i], nodeLat[i]]),
      3,
    ),
  ).map(([x, y]) => [round6(x), round6(y)]);
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += haversine(pts[i - 1], pts[i]);
  // Reject grotesque detours: a road route far longer than the crow-flight means the
  // graph is not really connected there, and the straight-line fallback is more honest.
  if (len > straight * 3.2 + 500) {
    failed.push(key);
    console.log(
      `  detour ${key}: straight ${straight.toFixed(0)}m road ${len.toFixed(0)}m ` +
        `snap ${snapped.get(a).dist_m.toFixed(0)}/${snapped.get(b).dist_m.toFixed(0)}m`,
    );
    continue;
  }
  straightSum += straight;
  roadSum += len;
  segments[key] = pts;
  routed++;
}

// ---------------------------------------------------------------- emit
const L = [];
L.push('/**');
L.push(' * GENERATED by tools/build-roads.mjs - do not edit by hand.');
L.push(' *');
L.push(' * Bus corridors routed onto real Ulaanbaatar street centrelines, extracted offline');
L.push(' * from the bundled OpenMapTiles vector tiles in public/tiles (z14, `transportation`');
L.push(' * layer, drivable classes only, weighted to prefer arterials over back alleys).');
L.push(' *');
L.push(' * Keys are undirected corridor edges "nodeA|nodeB" with nodeA < nodeB lexicographically;');
L.push(' * reverse the polyline for the other direction.');
L.push(' *');
L.push(` * road graph: ${nodeLon.length} vertices / ${edgeCount} segments from ${tilesRead} tiles`);
L.push(` * corridor pairs routed: ${routed}/${pairs.size}`);
L.push(` * road length vs straight line: ${(roadSum / straightSum).toFixed(2)}x`);
L.push(' */');
L.push('');
L.push('/** Corridor pairs the road graph could not connect; build.ts falls back to a straight line. */');
L.push(`export const ROAD_FALLBACK_PAIRS: readonly string[] = ${JSON.stringify(failed)};`);
L.push('');
L.push('export const ROAD_GRAPH_STATS = {');
L.push(`  vertices: ${nodeLon.length},`);
L.push(`  segments: ${edgeCount},`);
L.push(`  tiles: ${tilesRead},`);
L.push(`  pairsRouted: ${routed},`);
L.push(`  pairsTotal: ${pairs.size},`);
L.push('} as const;');
L.push('');
L.push('/**');
L.push(' * Where each corridor node actually sits on the road network. Routed segments start and');
L.push(' * end here, so consecutive segments join seamlessly and the straight-line fallback in');
L.push(' * build.ts joins the same points instead of jumping to the hand-placed node coordinate.');
L.push(' */');
L.push('export const ROAD_ANCHORS: Record<string, [number, number]> = {');
for (const n of NODES) {
  const s = snapped.get(n.id);
  L.push(`  '${n.id}': [${round6(nodeLon[s.idx])}, ${round6(nodeLat[s.idx])}],`);
}
L.push('};');
L.push('');
L.push('export const ROAD_SEGMENTS: Record<string, [number, number][]> = {');
for (const key of Object.keys(segments).sort()) {
  L.push(`  '${key}': ${JSON.stringify(segments[key])},`);
}
L.push('};');
L.push('');

const outPath = path.join(ROOT, 'src', 'data', 'roads.ts');
fs.writeFileSync(outPath, L.join('\n'), 'utf8');

const maxSnap = Math.max(...[...snapped.values()].map((s) => s.dist_m));
const classes = [...classSeen.entries()]
  .sort((a, b) => b[1] - a[1])
  .map(([k, v]) => `${k}=${v}`)
  .join(' ');
console.log(`tiles read       : ${tilesRead}`);
console.log(`classes used     : ${classes}`);
console.log(`lines used       : ${linesUsed}`);
console.log(`graph            : ${nodeLon.length} vertices, ${edgeCount} segments, ${nComp} components, largest ${bestSize}`);
console.log(`corridor snap max: ${maxSnap.toFixed(0)} m`);
console.log(`pairs routed     : ${routed}/${pairs.size}${failed.length ? `  FALLBACK: ${failed.join(', ')}` : ''}`);
console.log(`length ratio     : ${(roadSum / straightSum).toFixed(2)}x straight line`);
console.log(`wrote            : ${outPath} (${(fs.statSync(outPath).size / 1024).toFixed(0)} KB)`);
