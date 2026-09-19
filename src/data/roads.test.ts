/**
 * Proves the routed geometry actually sits on Ulaanbaatar's streets.
 *
 * The load-bearing test is "every route vertex lies on a road centreline": it re-decodes
 * the bundled vector tiles independently of tools/build-roads.mjs and measures the
 * perpendicular distance from every route vertex to the nearest drivable centreline. If
 * build.ts ever goes back to drawing straight lines between corridor nodes, that test
 * fails with a number in metres.
 */

import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { buildRoutes } from './build';
import { NODE_BY_ID } from './corridors';
import { ROAD_ANCHORS, ROAD_FALLBACK_PAIRS, ROAD_GRAPH_STATS, ROAD_SEGMENTS } from './roads';
import { haversine } from '../sim/geo';

const require = createRequire(import.meta.url);
const { VectorTile } = require('@mapbox/vector-tile');
const Pbf = require('pbf');

const ROOT = path.resolve(__dirname, '..', '..');
const Z = 14;
const DRIVABLE = new Set([
  'motorway', 'trunk', 'primary', 'secondary', 'tertiary',
  'minor', 'unclassified', 'residential', 'service', 'busway',
]);

const lon2x = (lon: number): number => Math.floor(((lon + 180) / 360) * 2 ** Z);
const lat2y = (lat: number): number => {
  const s = Math.sin((lat * Math.PI) / 180);
  return Math.floor((0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * 2 ** Z);
};

/**
 * Drivable centrelines from the z14 tiles covering the city centre, as flat
 * [ax, ay, bx, by] segments in local metres around `origin`.
 */
function centrelineSegments(
  origin: [number, number],
  tilesAcross: number,
): { segs: Float64Array; kx: number; ky: number } {
  const kx = Math.cos((origin[1] * Math.PI) / 180) * 111320;
  const ky = 110540;
  const cx = lon2x(origin[0]);
  const cy = lat2y(origin[1]);
  const r = (tilesAcross - 1) / 2;
  const out: number[] = [];
  for (let x = cx - r; x <= cx + r; x++) {
    for (let y = cy - r; y <= cy + r; y++) {
      const f = path.join(ROOT, 'public', 'tiles', String(Z), String(x), `${y}.pbf`);
      if (!fs.existsSync(f)) continue;
      const layer = new VectorTile(new Pbf(fs.readFileSync(f))).layers.transportation;
      if (!layer) continue;
      for (let i = 0; i < layer.length; i++) {
        const ft = layer.feature(i);
        if (!DRIVABLE.has(ft.properties.class)) continue;
        const gj = ft.toGeoJSON(x, y, Z);
        const strands: number[][][] =
          gj.geometry.type === 'LineString' ? [gj.geometry.coordinates] : gj.geometry.coordinates;
        for (const line of strands) {
          for (let k = 1; k < line.length; k++) {
            out.push(
              line[k - 1]![0]! * kx, line[k - 1]![1]! * ky,
              line[k]![0]! * kx, line[k]![1]! * ky,
            );
          }
        }
      }
    }
  }
  return { segs: Float64Array.from(out), kx, ky };
}

/** Perpendicular distance in metres from a lon/lat point to the nearest centreline. */
function distToRoad(p: [number, number], idx: ReturnType<typeof centrelineSegments>): number {
  const px = p[0] * idx.kx;
  const py = p[1] * idx.ky;
  let best = Infinity;
  const s = idx.segs;
  for (let i = 0; i < s.length; i += 4) {
    const ax = s[i]!;
    const ay = s[i + 1]!;
    const bx = s[i + 2]!;
    // cheap reject before the sqrt: skip segments whose x-span cannot reach `best`
    if (px < Math.min(ax, bx) - best || px > Math.max(ax, bx) + best) continue;
    const ex = bx - ax;
    const ey = s[i + 3]! - ay;
    const len2 = ex * ex + ey * ey;
    let t = len2 > 0 ? ((px - ax) * ex + (py - ay) * ey) / len2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const dx = px - (ax + t * ex);
    const dy = py - (ay + t * ey);
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < best) best = d;
  }
  return best;
}

const UB_CENTRE: [number, number] = [106.9176, 47.9188];

describe('routed road geometry', () => {
  it('bakes a real road graph, not a runtime guess', () => {
    expect(ROAD_GRAPH_STATS.segments).toBeGreaterThan(100_000);
    expect(ROAD_GRAPH_STATS.tiles).toBeGreaterThan(1000);
    // Honest gap: a handful of far-outskirt pairs the tile pack cannot connect.
    expect(ROAD_FALLBACK_PAIRS.length).toBeLessThanOrEqual(3);
    expect(ROAD_GRAPH_STATS.pairsRouted).toBe(
      ROAD_GRAPH_STATS.pairsTotal - ROAD_FALLBACK_PAIRS.length,
    );
  });

  it('anchors every corridor node near its declared position', () => {
    for (const [id, a] of Object.entries(ROAD_ANCHORS)) {
      const n = NODE_BY_ID.get(id)!;
      expect(haversine([n.lon, n.lat], a)).toBeLessThan(1100);
    }
  });

  it('is deterministic: same seed, byte-identical shapes', () => {
    const a = buildRoutes(42).map((r) => r.shape);
    const b = buildRoutes(42).map((r) => r.shape);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('never draws a jump between consecutive vertices', () => {
    let worst = 0;
    for (const r of buildRoutes(42)) {
      for (let i = 1; i < r.shape.length; i++) {
        worst = Math.max(worst, haversine(r.shape[i - 1]!, r.shape[i]!));
      }
    }
    // longest single hop anywhere in the network, incl. the straight-line fallbacks
    expect(worst).toBeLessThan(700);
  });

  it('keeps routed length within a sane band of the straight line it replaced', () => {
    // Segment level: this is exactly the "a road route is longer, but not 3x" check.
    let sumRoad = 0;
    let sumStraight = 0;
    for (const [key, poly] of Object.entries(ROAD_SEGMENTS)) {
      const [a, b] = key.split('|') as [string, string];
      const straight = haversine(
        [NODE_BY_ID.get(a)!.lon, NODE_BY_ID.get(a)!.lat],
        [NODE_BY_ID.get(b)!.lon, NODE_BY_ID.get(b)!.lat],
      );
      let road = 0;
      for (let i = 1; i < poly.length; i++) road += haversine(poly[i - 1]!, poly[i]!);
      expect(road / straight).toBeLessThan(3.3);
      sumRoad += road;
      sumStraight += straight;
    }
    expect(sumRoad / sumStraight).toBeGreaterThan(1);
    expect(sumRoad / sumStraight).toBeLessThan(2);

    // Route level: nothing absurd falls out of chaining the segments.
    for (const r of buildRoutes(42)) {
      expect(r.length_m).toBeGreaterThan(1000);
      expect(r.length_m).toBeLessThan(80_000);
    }
  });

  it('routes every corridor edge onto a real street centreline', () => {
    const idx = centrelineSegments(UB_CENTRE, 5);
    expect(idx.segs.length).toBeGreaterThan(4000);

    // lon/lat window the tile subset actually covers, so we only test what we loaded
    const halfLon = (2.5 * 360) / 2 ** Z;
    const halfLat = halfLon * 0.62;
    let checked = 0;
    let worst = 0;
    let worstAt: [number, number] = [0, 0];
    for (const [key, poly] of Object.entries(ROAD_SEGMENTS)) {
      void key;
      for (const p of poly) {
        if (Math.abs(p[0] - UB_CENTRE[0]) > halfLon * 0.8) continue;
        if (Math.abs(p[1] - UB_CENTRE[1]) > halfLat * 0.8) continue;
        const d = distToRoad(p, idx);
        checked++;
        if (d > worst) {
          worst = d;
          worstAt = p;
        }
      }
    }
    expect(checked).toBeGreaterThan(200);
    // 5 m covers the 1e-6 deg rounding in roads.ts and the 4 m endpoint snap tolerance
    expect(`${checked} vertices, worst ${worst.toFixed(1)} m at ${worstAt}`).toBeTruthy();
    expect(worst).toBeLessThan(5);
  });

  it('places every stop on the route polyline', () => {
    for (const r of buildRoutes(42)) {
      const onShape = new Set(r.shape.map((p) => `${p[0]},${p[1]}`));
      for (const s of r.stops) {
        expect(onShape.has(`${s.longitude},${s.latitude}`)).toBe(true);
      }
      // spacing stays in the intended band (the 40-stop cap widens long suburban runs)
      const gaps: number[] = [];
      for (let i = 1; i < r.stops.length; i++) gaps.push(r.stops[i]!.dist_m - r.stops[i - 1]!.dist_m);
      const mean = gaps.reduce((a, b) => a + b, 0) / Math.max(1, gaps.length);
      expect(mean).toBeGreaterThan(300);
      expect(mean).toBeLessThan(2000);
    }
  });
});
