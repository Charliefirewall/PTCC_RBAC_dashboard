/**
 * Live Fleet Map — MapLibre GL, offline-first (plan sections 20.1-20.8).
 *
 * OFFLINE IS A HARD REQUIREMENT, not a fallback: the venue run has no network
 * (plan 20.7 "offline last resort"). The DEFAULT basemap is now "Streets" — a
 * vector tile pack BUNDLED INTO THE BUILD (plan 1.1 / 11.3): ~17 MB of
 * OpenFreeMap-derived `.pbf` tiles, Noto Sans glyphs (including Cyrillic, for
 * Mongolian street names) and a sprite, all served from our own origin under
 * `public/`. It is street-level cartography that works with networking off, and
 * because it ships glyphs and a sprite it also unblocks `symbol` layers.
 * `tools/fetch-tiles.mjs` regenerates the pack; it is gitignored.
 *
 * Basemaps are applied ADDITIVELY, never via setStyle: the operational layers
 * (routes, stops, vehicles, incidents) are built once in the init effect and must
 * survive a basemap switch, so a switch is an addSource/addLayer pair and turning
 * it off is a removeLayer/removeSource.
 *
 * The two fallbacks: "Network" is the old inline `background`-only style (the
 * vector route network drawn from memory, no external asset of any kind), and
 * "Online" is the OpenStreetMap raster layer. Any tile error, an `offline` window
 * event, `navigator.onLine === false` or a 6 s no-tile watchdog drops straight
 * back to Network with a non-blocking banner — those three detection paths now
 * guard against a missing or corrupt LOCAL pack as well as a dead network.
 * Failing tiles can therefore never block the demo: the vector network is already
 * drawn underneath.
 *
 * The 1,100 vehicles NEVER enter React state (plan 19.7). A rAF loop reads
 * `world.vehicles` directly and pushes one GeoJSON FeatureCollection into the
 * `vehicles` source at ~18 Hz. 1,100 React markers cannot hold 60 fps; one
 * `setData` of 1,100 points is a single GPU buffer upload.
 *
 * Route lines are static geometry uploaded once; their S7 colour state is
 * applied with `setFeatureState` (121 calls per sim tick, negligible) rather
 * than by re-serialising ~40k coordinates every tick.
 *
 * THEME: GL paint properties are literal colours, so the map cannot inherit a
 * CSS variable change. `applyTheme()` dispatches `ptcc:theme` on window; we
 * re-read the tokens and re-apply every colour-bearing paint property.
 */

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import type { ExpressionSpecification, GeoJSONSource, StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { UB_BBOX } from '../../data/corridors';
import { segmentLine } from '../../data/segments';
import { tripIdOf, type Vehicle } from '../../sim/types';
import { useAlerts, useSelection, useSettings, useSim, world } from '../../store';
import { LOAD_BANDS, bandColor, bandOf } from '../../rules/thresholds';
import { useT, useLang } from '../../i18n/t';
import type { I18nKey } from '../../i18n/dict';
import { Button, Chevron, EvidenceTag, StatusPill } from '../../components/primitives';
import { attachClusters, reducedMotion, type ClusterController } from '../../map/clusters';
import { routePopup, stopPopup, vehiclePopup, type LivePopup, type PopupCtx } from '../../map/popups';
import { devTier, riskOf } from '../../map/risk';
import { busImageId, installBusImages } from '../../map/markers';
// After maplibre-gl.css above, so our token-based rules win the specificity tie.
import '../../map/chrome.css';

// ---------------------------------------------------------------- colours

/**
 * MapLibre paint properties need literal colours; CSS variables are not
 * resolved inside the GL style. Read the tokens from :root so the map and
 * the rest of the UI cannot drift apart, with the tokens.css values as a
 * fallback if the stylesheet has not applied yet. Re-read on every theme swap.
 */
function cssVar(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

interface MapColors {
  normal: string;
  slower: string;
  disrupted: string;
  noservice: string;
  info: string;
  warn: string;
  crit: string;
  bg: string;
  line: string;
  text3: string;
  text1: string;
  accent: string;
}

function readColors(): MapColors {
  return {
    normal: cssVar('--color-map-normal', '#3da9fc'),
    slower: cssVar('--color-map-slower', '#f59e0b'),
    disrupted: cssVar('--color-map-disrupted', '#ef4444'),
    noservice: cssVar('--color-map-noservice', '#64748b'),
    info: cssVar('--color-sev-info', '#3b82f6'),
    warn: cssVar('--color-sev-warn', '#f59e0b'),
    crit: cssVar('--color-sev-crit', '#ef4444'),
    bg: cssVar('--color-bg0', '#0b0f14'),
    line: cssVar('--color-line', '#26323f'),
    text3: cssVar('--color-text3', '#6e7e8f'),
    text1: cssVar('--color-text1', '#e7edf5'),
    accent: cssVar('--color-accent', '#3da9fc'),
  };
}

export type VehicleColorMode = 'delay' | 'load';

/** Vehicle palettes. The rAF loop writes an INDEX into the active palette as
 *  the `c` property, so switching modes is one setPaintProperty, not a reshape
 *  of the per-frame feature payload. */
function paletteFor(mode: VehicleColorMode, c: MapColors): string[] {
  // S7 three-state + S5 "No service" grey for dark/out-of-service telemetry.
  if (mode === 'delay') return [c.normal, c.slower, c.disrupted, c.noservice];
  // Literal values: these become MapLibre paint properties on a WebGL canvas,
  // which cannot resolve var(). Re-read on theme change with everything else.
  return LOAD_BANDS.map((b) => bandColor(b)); // S8 bands - the only threshold set in any source
}

const expr = (e: unknown[]) => e as unknown as ExpressionSpecification;

// Every colour-bearing expression lives in one place so `restyle()` and the
// initial `addLayer` cannot drift apart on a theme change.
const routeColorExpr = (C: MapColors) =>
  expr([
    'match', ['to-string', ['feature-state', 'state']],
    'slower', C.slower,
    'disrupted', C.disrupted,
    'noservice', C.noservice,
    C.normal,
  ]);
const sevColorExpr = (C: MapColors) =>
  expr(['match', ['get', 'sev'], 'critical', C.crit, 'warning', C.warn, C.info]);
/**
 * U3 — the trail fades from nothing at its oldest end to the selection accent at
 * the bus. `line-gradient` is the only paint property allowed to read
 * `line-progress`, and it needs `lineMetrics: true` on the source.
 */
const trailGradientExpr = (C: MapColors) =>
  expr(['interpolate', ['linear'], ['line-progress'], 0, 'rgba(0,0,0,0)', 1, C.accent]);

/**
 * U1 — which bus glyph to draw. `c` is the palette index the rAF loop already
 * wrote; `a` is "this bus is itself in a critical condition" and swaps in the
 * ringed twin. Both variants exist for every palette index because
 * `installBusImages` draws them in pairs, so this can never miss an image.
 *
 * The glyph carries the operational read on its own (U4): fill = the devTier
 * ladder / no-service grey / load band, ring = incident. The popup confirms it.
 */
const busIconExpr = expr([
  'concat',
  ['case', ['==', ['get', 'a'], 1], 'busA-', 'bus-'],
  ['to-string', ['get', 'c']],
]);

/**
 * U2 zoom ladder. The glyph is 24 CSS px at `icon-size: 1`, so:
 *   z10   -> ~5 px  a dot, the same floor the circle layer used — at network
 *                   zoom 1,086 bigger marks swamp the 97 route lines.
 *   z13.5 -> ~13 px shape and direction readable.
 *   z15.5 -> 24 px  a bus, with its id underneath.
 * x1.4 on the wall, as everything else here is.
 */
const iconSizeExpr = (rScale: number) =>
  expr([
    'interpolate', ['linear'], ['zoom'],
    10, 0.2 * rScale,
    12, 0.28 * rScale,
    13.5, 0.55 * rScale,
    15.5, 1 * rScale,
  ]);

/** Ids start one zoom step above `clusterMaxZoom` (13): below that most buses are
 *  inside a cluster, so 1,086 `text-field`s would be laid out only to be hidden. */
const VEHICLE_LABEL_MINZOOM = 14.5;

// ---------------------------------------------------------------- basemaps

export type Basemap = 'bundled' | 'network' | 'streets';

/** The bundled pack's style (plan 11.3 step 3). Relative because `vite.config.ts`
 *  sets `base: './'`; MapLibre resolves the style's own `./tiles`, `./fonts` and
 *  `./sprite` URLs against the same document base, so the whole pack moves with
 *  the deployment. Generated by `tools/fetch-tiles.mjs`. */
const BUNDLED_STYLE = './styles/ub-liberty.json';
/** The vector source id inside that style, and the scrim we lay over it. */
const BUNDLED_SOURCE = 'openmaptiles';
/**
 * The pack's glyph URL, hoisted out of the style JSON because the OPERATIONAL
 * layers need it too: vehicle id labels (U2) are a `symbol` layer, and a symbol
 * layer with no glyphs set is a style error that MapLibre swallows into the map's
 * `error` handler — the layer just is not there. Setting it on the inline style
 * means labels work on every basemap, including the `network` fallback, and it
 * costs nothing until text is actually laid out (glyph ranges are fetched lazily,
 * from our own origin).
 */
const GLYPHS = './fonts/{fontstack}/{range}.pbf';
/** The one stack the bundled pack ships in all three weights. */
const LABEL_FONT = ['Noto Sans Regular'];
const SCRIM_LAYER = 'basemap-scrim';

/**
 * Resolve the style's relative asset URLs against the document, where `public/`
 * is rooted.
 *
 * This is not cosmetic. Tile requests are issued from MapLibre's WEB WORKER, so a
 * relative `./tiles/...` resolves against the worker script's URL, not the
 * document's — the request is simply never made and the map stays blank while the
 * sprite (fetched on the main thread) loads fine.
 *
 * String concatenation rather than `new URL(u, base)`, which percent-encodes the
 * `{z}/{x}/{y}` placeholders into `%7Bz%7D` and gives a 404 on every tile.
 */
const absolutise = (u: string) =>
  u.startsWith('.') ? new URL('.', document.baseURI).href + u.replace(/^\.\//, '') : u;

/**
 * Standard OSM raster tiles: no API key, no token, no account (ASSUMPTION —
 * nothing in the client material specifies a basemap). Attribution is mandatory
 * under the OSM tile usage policy, so the AttributionControl is added with the
 * layer and removed with it.
 */
const OSM_TILES = ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'];
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors';

/** The DOM attribute, not the store: `applyTheme()` sets `data-theme` and then
 *  dispatches `ptcc:theme` BEFORE the store's own `set({ theme })` lands, so the
 *  store still reports the previous theme while we are restyling. */
const isLightTheme = () => document.documentElement.getAttribute('data-theme') === 'light';

/** OSM tiles are bright and busy; tone them down per theme so the operational
 *  overlay (routes, buses, incidents) stays the thing you read first. */
function rasterPaint(light: boolean): Record<string, number> {
  return light
    ? { 'raster-opacity': 0.85, 'raster-saturation': -0.35, 'raster-contrast': -0.05 }
    : { 'raster-opacity': 0.5, 'raster-saturation': -0.7, 'raster-brightness-max': 0.7 };
}

/**
 * Liberty is a daylight street map: on a control-room wall in dark theme it
 * glares, and in either theme it competes with the operational overlay. GL cannot
 * read `var()`, so instead of re-tinting 100+ basemap layers we lay ONE extra
 * `background` layer in the page's own background colour over the basemap and
 * under `route-lines`. One paint property to re-apply on a theme swap.
 */
function scrimPaint(light: boolean): Record<string, number | string> {
  const C = readColors();
  return { 'background-color': C.bg, 'background-opacity': light ? 0.22 : 0.62 };
}

type FallbackReason = 'offline' | 'tiles';

// ---------------------------------------------------------------- layer control

/** The four operational layer groups the panel toggles (backlog item 38). */
interface LayerFlags {
  buses: boolean;
  stops: boolean;
  routes: boolean;
  incidents: boolean;
}

const DEFAULT_LAYERS: LayerFlags = { buses: true, stops: true, routes: true, incidents: true };

/** One group is several GL layers, because dash patterns and glows needed their
 *  own. Order matters nowhere here — visibility is per-layer. */
const LAYER_GL: Record<keyof LayerFlags, string[]> = {
  buses: [
    'vehicles',
    'vehicle-labels',
    'selection-halo',
    'sel-trail',
    'sel-route-ahead',
    'sel-route-behind',
    'sel-deviation',
  ],
  stops: ['stops'],
  routes: ['route-lines', 'route-lines-noservice'],
  incidents: ['alert-glow', 'alert-pins'],
};

const LAYER_LABEL: Record<keyof LayerFlags, I18nKey> = {
  buses: 'map.layerBuses',
  stops: 'map.layerStops',
  routes: 'map.layerRoutes',
  incidents: 'map.layerIncidents',
};

// ---------------------------------------------------------------- static geometry

/** Hotspot segments picked in Analytics (PTCC 3b), as street polylines. */
function hotspotsFC(): FC {
  return {
    type: 'FeatureCollection',
    features: useSelection.getState().segment_keys.map((key) => ({
      type: 'Feature',
      properties: { key },
      geometry: { type: 'LineString', coordinates: segmentLine(key) },
    })),
  };
}

type FC = GeoJSON.FeatureCollection<GeoJSON.Geometry, Record<string, unknown>>;

function routesFC(): FC {
  return {
    type: 'FeatureCollection',
    features: world.routes.map((r) => ({
      type: 'Feature',
      properties: { route_id: r.route_id },
      geometry: { type: 'LineString', coordinates: r.shape },
    })),
  };
}

function stopsFC(): FC {
  const features: FC['features'] = [];
  for (const r of world.routes) {
    for (const s of r.stops) {
      features.push({
        type: 'Feature',
        properties: { stop_id: s.stop_id, route_id: r.route_id },
        geometry: { type: 'Point', coordinates: [s.longitude, s.latitude] },
      });
    }
  }
  return { type: 'FeatureCollection', features };
}

const EMPTY: FC = { type: 'FeatureCollection', features: [] };

// ---------------------------------------------------------------- the GL canvas

/** The GL instance and its in-map overlays. Page chrome (header, switchers) is
 *  the wrapper's job — see MapCanvas. */
function MapGL({
  colorMode,
  basemap,
  onFallback,
  notice,
  setColorMode,
  setBasemap,
}: {
  colorMode: VehicleColorMode;
  basemap: Basemap;
  onFallback: (reason: FallbackReason) => void;
  notice: FallbackReason | null;
  /** Absent in wall mode, where there is no chrome to change them from. */
  setColorMode?: (v: VehicleColorMode) => void;
  setBasemap?: (v: Basemap) => void;
}) {
  const host = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const clusterRef = useRef<ClusterController | null>(null);
  const mode = useSettings((s) => s.mode);
  const [ready, setReady] = useState(0);
  const [layers, setLayers] = useState<LayerFlags>(DEFAULT_LAYERS);
  // The same map is embedded at ~640x330 in the Command Centre and full-page in
  // its own module; a legend sized for the second one covers half of the first.
  const [compact, setCompact] = useState(false);
  const colorModeRef = useRef<VehicleColorMode>(colorMode);
  colorModeRef.current = colorMode;
  const servedRef = useRef(false);
  const basemapRef = useRef<Basemap>(basemap);
  basemapRef.current = basemap;
  const fallbackRef = useRef(onFallback);
  fallbackRef.current = onFallback;
  const t = useT();
  // The init effect runs once per mode, but popups and cluster labels are built
  // long after it and must speak the CURRENT language. A ref, not a dependency:
  // re-creating the GL instance on a language switch would be absurd.
  const lang = useLang();
  const ctxRef = useRef<PopupCtx>({ t, lang });
  ctxRef.current = { t, lang };

  const wall = mode === 'wall';

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const C = readColors();

    // Offline style: background only. Everything else is added from memory below.
    const style: StyleSpecification = {
      version: 8,
      sources: {},
      // Same-origin, bundled: see GLYPHS. Needed by the vehicle-id label layer
      // regardless of which basemap is active.
      glyphs: absolutise(GLYPHS),
      layers: [{ id: 'bg', type: 'background', paint: { 'background-color': C.bg } }],
    };

    const map = new maplibregl.Map({
      container: el,
      style,
      center: [(UB_BBOX[0] + UB_BBOX[2]) / 2, (UB_BBOX[1] + UB_BBOX[3]) / 2],
      zoom: wall ? 11.4 : 12.2,
      minZoom: 9.5,
      maxZoom: 17,
      maxBounds: [
        [106.55, 47.7],
        [107.4, 48.1],
      ],
      // Wall mode is a display surface, not a workstation: no hover, no pan (plan 6.1).
      interactive: !wall,
      attributionControl: false,
      fadeDuration: 0,
      pitchWithRotate: false,
      dragRotate: false,
    });
    mapRef.current = map;

    // A map with no `error` listener only logs to the console; it never throws.
    // With one we can act on it: a failed OSM tile request means the room's wifi
    // is gone, so drop back to the vector network. Registered before load so no
    // early failure is missed.
    map.on('error', (e) => {
      // A style/paint validation failure fires here and NOWHERE else: MapLibre
      // returns from `addLayer` without adding, and because this listener exists it
      // does not even reach the console. That is how the `vehicles` layer came to be
      // silently missing (see vehStrokeWidthExpr).
      //
      // NOT gated on `import.meta.env.DEV`: the demo is served from `dist` via
      // `vite preview`, where that branch is stripped — i.e. exactly the build that
      // was blind for a whole session. Surfacing this is the listener's entire
      // justification, so it surfaces everywhere.
      const err = (e as unknown as { error?: Error }).error;
      // MapLibre aborts every in-flight tile request when the map is removed, so an
      // AbortError during teardown is expected, not a fault. Reporting it made the
      // smoke test fail whenever W toggled wall mode - a real signal drowned by a
      // benign one. Everything else still surfaces, which is the point of this handler.
      if (err?.name === 'AbortError' || /aborted/i.test(err?.message ?? '')) return;
      console.warn('[map]', err?.message);
      const src = (e as unknown as { sourceId?: string }).sourceId;
      if (src === 'osm' && basemapRef.current === 'streets') fallbackRef.current('tiles');
      // Same path for the bundled pack — a missing or corrupt local tile. Guarded
      // by `served`: the pyramid is sparse at the bbox fringe, and one 404 there
      // must not tear down a basemap that is already drawing.
      if (src === BUNDLED_SOURCE && basemapRef.current === 'bundled' && !servedRef.current)
        fallbackRef.current('tiles');
    });

    // Canvas/SVG map marks do not inherit the shell's --wall-scale. Give them their own
    // viewing-distance scale so the spatial view does not become the one tiny element
    // on an otherwise 2.2x wall canvas.
    const rScale = wall ? 1.8 : 1;
    let raf = 0;
    const unsubs: (() => void)[] = [];

    map.on('load', () => {
      // ---- 1. route lines (static geometry, dynamic colour via feature-state)
      map.addSource('routes', { type: 'geojson', data: routesFC(), promoteId: 'route_id' });
      map.addLayer({
        id: 'route-lines',
        type: 'line',
        source: 'routes',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': routeColorExpr(C),
          'line-width': ['interpolate', ['linear'], ['zoom'], 10, wall ? 1.4 : 0.9, 15, wall ? 4.5 : 3],
          'line-opacity': 0.55,
        },
      });
      // `line-dasharray` is not data-driven in MapLibre, so "no service" gets its
      // own dashed layer whose opacity is feature-state driven (S7 legend + S5 grey).
      map.addLayer({
        id: 'route-lines-noservice',
        type: 'line',
        source: 'routes',
        layout: { 'line-cap': 'butt', 'line-join': 'round' },
        paint: {
          'line-color': C.noservice,
          'line-dasharray': [2, 2],
          'line-width': ['interpolate', ['linear'], ['zoom'], 10, wall ? 1.4 : 0.9, 15, wall ? 4.5 : 3],
          'line-opacity': expr([
            'case',
            ['==', ['to-string', ['feature-state', 'state']], 'noservice'],
            0.9,
            0,
          ]),
        },
      });

      // ---- 2. stops
      map.addSource('stops', { type: 'geojson', data: stopsFC() });
      map.addLayer({
        id: 'stops',
        type: 'circle',
        source: 'stops',
        minzoom: 12,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 1.5, 16, 4],
          'circle-color': C.text3,
          'circle-opacity': 0.7,
        },
      });

      // ---- 2b. selected-vehicle context (U3): trail, route ahead/behind, deviation.
      //
      // FOR THE SELECTED BUS ONLY. The brief asks for subtle and professional, and
      // 1,100 trails is neither — it is also the difference between one 40-point
      // LineString per frame and a second full-fleet payload. Both sources hold at
      // most three features, so the rAF loop writing them costs nothing measurable.
      //
      // `lineMetrics` is what makes `line-gradient` legal: the trail fades to
      // nothing at its tail instead of ending in a hard stub.
      map.addSource('sel-trail', { type: 'geojson', data: EMPTY, lineMetrics: true });
      map.addSource('sel-route', { type: 'geojson', data: EMPTY });
      // Behind: where the route has already been served. Dashed and dim — context,
      // not information.
      map.addLayer({
        id: 'sel-route-behind',
        type: 'line',
        source: 'sel-route',
        filter: expr(['==', ['get', 'part'], 'behind']),
        layout: { 'line-cap': 'butt' },
        paint: {
          'line-color': C.text3,
          'line-dasharray': [1.5, 2.5],
          'line-width': 1.6 * rScale,
          'line-opacity': 0.55,
        },
      });
      // Ahead: what this bus still has to do. The only one of the three drawn solid.
      map.addLayer({
        id: 'sel-route-ahead',
        type: 'line',
        source: 'sel-route',
        filter: expr(['==', ['get', 'part'], 'ahead']),
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': C.accent, 'line-width': 2.2 * rScale, 'line-opacity': 0.7 },
      });
      // Deviation: bus -> its nearest point on the booked shape. Only drawn when the
      // sim actually raises `route_deviation`, which is the whole point — this is
      // one of the few marks on the map allowed to attract the eye.
      map.addLayer({
        id: 'sel-deviation',
        type: 'line',
        source: 'sel-route',
        filter: expr(['==', ['get', 'part'], 'dev']),
        layout: { 'line-cap': 'round' },
        paint: {
          'line-color': C.warn,
          'line-dasharray': [1, 1.5],
          'line-width': 2 * rScale,
          'line-opacity': 0.9,
        },
      });
      // Recent movement, newest end opaque. A gradient, not an animation.
      map.addLayer({
        id: 'sel-trail',
        type: 'line',
        source: 'sel-trail',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-width': 3 * rScale,
          'line-opacity': 0.6, // subtle: a trail on a normal bus must not pull the eye
          'line-gradient': trailGradientExpr(C),
        },
      });

      // ---- 2c. delay hotspots (PTCC 3b, Analytics > Hotspots > "Show on map").
      // Fed from useSelection.segment_keys; below the buses so it never hides one.
      // Forecast colour: the ranking is read off the synthetic norm, not live data.
      map.addSource('hotspots', { type: 'geojson', data: hotspotsFC() });
      map.addLayer({
        id: 'hotspots',
        type: 'line',
        source: 'hotspots',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': cssVar('--color-forecast', '#b48cf2'), 'line-width': 6 * rScale, 'line-opacity': 0.75 },
      });
      unsubs.push(
        useSelection.subscribe((s, prev) => {
          if (s.segment_keys !== prev.segment_keys)
            (map.getSource('hotspots') as GeoJSONSource | undefined)?.setData(hotspotsFC());
        }),
      );

      // ---- 3. vehicles (per-frame setData)
      //
      // NATIVE MapLibre clustering (plan 11.5 step 1) — no supercluster dependency.
      // `clusterProperties` sums the per-vehicle exception-funnel verdict the rAF
      // loop writes as `cr`/`at`/`nm`, so a cluster knows its own worst state and
      // the three sums reproduce `metrics.funnel` exactly (see map/risk.ts).
      //
      // The index is rebuilt inside MapLibre's worker on every `setData`, i.e. at
      // ~18 Hz for 1,086 points. That is a couple of ms of worker time per frame
      // and it keeps the architecture the plan calls out as better than the
      // reference product's: positions still never enter React state.
      //
      // NOT clustered on the wall: the video wall is a non-interactive display
      // surface (plan 6.1), so it has no way to expand a cluster, and its job is
      // precisely to show the whole 1,086-bus fleet at once.
      map.addSource('vehicles', {
        type: 'geojson',
        data: EMPTY,
        cluster: !wall,
        // The plan writes `clusterRadius: 40`; measured, that gives 45 markers at
        // z11 against the plan's own "≤ 40 markers" target, because our fleet is
        // denser on the trunk corridors than the estimate assumed. 50 measures at
        // 30 markers at z11 and 32 at the module's default z11.27. The target is
        // the outcome the plan actually wants; 40 was its guess at the input.
        clusterRadius: 50,
        clusterMaxZoom: 13,
        // Only the two at-risk sums are read (clusters.ts derives `normal` as
        // `point_count - critical - attention` when it needs it, which it does not).
        clusterProperties: {
          critical: ['+', ['get', 'cr']],
          attention: ['+', ['get', 'at']],
        },
      });
      // The glyphs themselves. Drawn to a canvas from the live tokens, so they
      // follow the theme and the colour mode; see map/markers.ts.
      installBusImages(map, paletteFor(colorModeRef.current, C), C.bg, C.crit);
      map.addLayer({
        id: 'vehicles',
        type: 'symbol',
        source: 'vehicles',
        // Clustered points are drawn by the HTML markers instead.
        filter: expr(['!', ['has', 'point_count']]),
        layout: {
          'icon-image': busIconExpr,
          'icon-size': iconSizeExpr(rScale),
          // U1, the headline: `heading` is a compass bearing clockwise from north
          // and the glyph points north at 0, which is exactly MapLibre's own
          // convention — so the rotation is one `get`, evaluated on the GPU.
          // `map` alignment, not `viewport`: a bus points along the STREET.
          'icon-rotate': expr(['get', 'heading']),
          'icon-rotation-alignment': 'map',
          // Non-negotiable at this density: with collision on, a few hundred of
          // 1,086 buses would simply not be drawn, and an operator counting buses
          // on a corridor would be counting the ones that won a collision test.
          // It also means MapLibre skips collision for this layer entirely, which
          // is what keeps an 18 Hz symbol layer affordable.
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
          // Alerted buses (sort key 1) are placed last, i.e. on top of the pack.
          'symbol-sort-key': expr(['get', 'a']),
        },
      });
      // U2: the id, one zoom step above the clustering ceiling. Its own layer
      // rather than a `text-field` on the layer above, because `minzoom` is
      // per-layer: this way no glyph is laid out at all below z14.5.
      // Collision stays ON here (the default) — labels thin themselves out, which
      // is the behaviour you want, and at this zoom only a handful are on screen.
      map.addLayer({
        id: 'vehicle-labels',
        type: 'symbol',
        source: 'vehicles',
        minzoom: VEHICLE_LABEL_MINZOOM,
        filter: expr(['!', ['has', 'point_count']]),
        layout: {
          'text-field': expr(['get', 'id']),
          'text-font': LABEL_FONT,
          'text-size': 10 * rScale,
          'text-offset': [0, 1.1],
          'text-anchor': 'top',
          'text-padding': 3,
        },
        paint: {
          'text-color': C.text1,
          'text-halo-color': C.bg,
          'text-halo-width': 1.2,
        },
      });

      // ---- 4. selection halo
      //
      // ITS OWN, UNCLUSTERED, SINGLE-FEATURE SOURCE — this is not a style choice.
      // The halo used to be a layer on the clustered `vehicles` source, filtered
      // `['==', ['get','id'], id]`. Supercluster emits NO member points at or below
      // `clusterMaxZoom` (13) — only cluster features, which have no `id` — and the
      // map opens at ~z11.3 from `fitBounds(UB_BBOX)`. So for the ~1,050 of 1,100
      // buses that sit inside a cluster the filter matched nothing and selecting a
      // bus from the Priority Alerts worklist rendered NOTHING on the map at all.
      //
      // One point, fed from the same rAF loop as the dots, so positions still never
      // enter React state and the loop still runs at ~18 Hz.
      map.addSource('selection', { type: 'geojson', data: EMPTY });
      map.addLayer({
        id: 'selection-halo',
        type: 'circle',
        source: 'selection',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 8 * rScale, 14, 16 * rScale],
          'circle-color': 'rgba(0,0,0,0)',
          'circle-stroke-width': 2,
          'circle-stroke-color': C.accent,
        },
      });

      // ---- 5. incident pins (circles, not symbols - no sprite offline).
      // Two layers: a soft glow that survives a busy street basemap, and a solid
      // severity core outlined in the page background so an incident can never be
      // mistaken for a bus dot.
      map.addSource('alert-pins', { type: 'geojson', data: EMPTY });
      map.addLayer({
        id: 'alert-glow',
        type: 'circle',
        source: 'alert-pins',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 9 * rScale, 14, 20 * rScale],
          'circle-color': sevColorExpr(C),
          'circle-opacity': 0.16,
          'circle-blur': 0.6,
        },
      });
      map.addLayer({
        id: 'alert-pins',
        type: 'circle',
        source: 'alert-pins',
        layout: {
          // critical draws last, so it is never hidden under an info pin
          'circle-sort-key': expr(['match', ['get', 'sev'], 'critical', 3, 'warning', 2, 1]),
        },
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 4.5 * rScale, 14, 8.5 * rScale],
          'circle-color': sevColorExpr(C),
          'circle-opacity': 0.9,
          'circle-stroke-width': 2 * rScale,
          'circle-stroke-color': C.bg,
        },
      });

      map.fitBounds(UB_BBOX, { padding: wall ? 8 : 24, duration: 0 });

      // ---------------- drill-down: popup first, navigation second (item 11)
      //
      // Setting `location.hash` on click used to tear the GL context down and lose
      // the camera before the operator had decided anything. The popup keeps the
      // map alive and offers the three exits explicitly.
      //
      // Declared HERE, above the rAF loop, because the loop drives the open popup's
      // `ptccTick` (K4) and the selection subscription below opens one (K2). Stays
      // null in wall mode, which registers no interaction at all.
      let popup: LivePopup | null = null;
      let hoverPopup: LivePopup | null = null;
      let hoverId = '';
      let hoverCloseTimer: ReturnType<typeof setTimeout> | null = null;
      const show = (p: LivePopup | null) => {
        popup?.remove();
        popup = p;
        // Closed from its own X, or by a map click: drop the reference, or the rAF
        // loop keeps ticking a detached popup and a re-click cannot reopen it.
        p?.once('close', () => {
          if (popup === p) popup = null;
        });
      };
      const cancelHoverClose = () => {
        if (hoverCloseTimer !== null) clearTimeout(hoverCloseTimer);
        hoverCloseTimer = null;
      };
      const closeHover = () => {
        cancelHoverClose();
        hoverPopup?.remove();
        hoverPopup = null;
        hoverId = '';
      };
      const scheduleHoverClose = () => {
        cancelHoverClose();
        // Allows the pointer to cross the small MapLibre tip gap and enter the
        // card, where Open detail remains a real, reachable action.
        hoverCloseTimer = setTimeout(closeHover, 140);
      };
      const showHover = (id: string) => {
        if (!id || id === hoverId) return;
        closeHover();
        // One information surface at a time: a nearby hover card must not stack
        // over a click-selected popup and obscure either card's actions.
        if (popup) show(null);
        hoverId = id;
        const p = vehiclePopup(map, id, ctxRef.current, {
          hover: true,
          onPointerEnter: cancelHoverClose,
          onPointerLeave: scheduleHoverClose,
        });
        hoverPopup = p;
        p?.once('close', () => {
          if (hoverPopup === p) {
            hoverPopup = null;
            hoverId = '';
          }
        });
      };

      // ---------------- per-frame vehicle upload, throttled to ~18 Hz
      const vSrc = map.getSource('vehicles') as GeoJSONSource | undefined;
      const selSrc = map.getSource('selection') as GeoJSONSource | undefined;
      const trailSrc = map.getSource('sel-trail') as GeoJSONSource | undefined;
      const routeSrc = map.getSource('sel-route') as GeoJSONSource | undefined;
      /** The selected vehicle id, as a plain local rather than React state: the
       *  loop below must not re-render anything to draw the halo. */
      let selId = '';
      let haloDrawn = false;
      /** U3 state, all for ONE bus. Plain locals, like `selId`: the trail must not
       *  re-render React 18 times a second. */
      let trail: [number, number][] = [];
      let trailFor = '';
      /** Cache key for the route-context write. The split point moves a vertex at a
       *  time, so without this a ~400-point shape would be re-serialised at 18 Hz
       *  to produce a byte-identical payload. */
      let ctxSig = '';
      /** Last split the context layers were built from — read by the verification
       *  hook, because "ahead is missing" and "the bus is at a terminus" look the
       *  same from outside. */
      let selDbg: Record<string, unknown> | null = null;
      const clearSelContext = () => {
        selDbg = null;
        trail = [];
        trailFor = '';
        ctxSig = '';
        trailSrc?.setData(EMPTY);
        routeSrc?.setData(EMPTY);
      };

      /**
       * U3 — recent-movement trail, route ahead/behind, and the deviation
       * connector, for the SELECTED bus only. Both sources hold at most three
       * features, so this is nothing next to the 1,086-point write above.
       */
      const drawSelContext = (v: Vehicle) => {
        if (trailFor !== v.vehicle_id) {
          trailFor = v.vehicle_id;
          trail = [];
          ctxSig = '';
          trailSrc?.setData(EMPTY); // the previous bus's trail must not linger
        }
        const tail = trail[trail.length - 1];
        // ~10 m of travel, not every frame: 18 Hz of near-identical points is a
        // 1,000-vertex line describing 50 m of road.
        if (!tail || Math.abs(tail[0] - v.longitude) + Math.abs(tail[1] - v.latitude) > 1.2e-4) {
          trail.push([v.longitude, v.latitude]);
          if (trail.length > 40) trail.shift();
          if (trail.length > 1)
            trailSrc?.setData({
              type: 'FeatureCollection',
              features: [
                { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: trail } },
              ],
            });
        }

        const r = world.routeById.get(v.route_id);
        if (!r || r.shape.length < 2) return;
        // Nearest shape vertex. Linear, because it is ONE bus once a frame — a few
        // hundred squared distances, i.e. less work than one of the 1,086 feature
        // literals built above.
        let idx = 0;
        let best = Infinity;
        for (let i = 0; i < r.shape.length; i++) {
          const dx = r.shape[i]![0] - v.longitude;
          const dy = r.shape[i]![1] - v.latitude;
          const d = dx * dx + dy * dy;
          if (d < best) {
            best = d;
            idx = i;
          }
        }
        const dev = !!v.flags.route_deviation;
        const sig = `${v.vehicle_id}:${idx}:${dev ? 1 : 0}`;
        if (sig === ctxSig) return;
        ctxSig = sig;

        // Which way along the shape is "ahead"? Taken from the bus's OWN heading
        // rather than from `v.direction`, so a change in how the sim labels
        // directions cannot silently reverse the two halves.
        const nxt = r.shape[Math.min(idx + 1, r.shape.length - 1)]!;
        const h = (v.heading * Math.PI) / 180;
        const fwd =
          (nxt[0] - r.shape[idx]![0]) * Math.sin(h) + (nxt[1] - r.shape[idx]![1]) * Math.cos(h) >= 0;
        const here: [number, number] = [v.longitude, v.latitude];
        const ahead = fwd ? [here, ...r.shape.slice(idx + 1)] : [here, ...r.shape.slice(0, idx).reverse()];
        const behind = fwd ? r.shape.slice(0, idx + 1) : r.shape.slice(idx);

        const parts: FC['features'] = [];
        const push = (part: string, coordinates: [number, number][]) => {
          if (coordinates.length > 1)
            parts.push({ type: 'Feature', properties: { part }, geometry: { type: 'LineString', coordinates } });
        };
        selDbg = { idx, shape: r.shape.length, fwd, dev, ahead: ahead.length, behind: behind.length };
        push('behind', behind);
        push('ahead', ahead);
        // Only when the sim actually raises the flag: bus -> booked shape, so the
        // size of the departure is the length of the line.
        if (dev) push('dev', [here, r.shape[idx]!]);
        routeSrc?.setData({ type: 'FeatureCollection', features: parts });
      };
      let last = 0;
      /*
       * Sub-tick interpolation.
       *
       * The engine advances every ~417 ms of wall time (5 sim-seconds at the default
       * x12 compression). Reading `v.longitude/latitude` straight into the 18 Hz frame
       * therefore redraws the SAME coordinates about seven times, then jumps - buses
       * visibly step rather than move, however good the physics underneath is.
       *
       * So hold the previous tick's position per bus and ease toward the current one
       * across the real interval between ticks. This is presentation only: the
       * authoritative position is still the engine's, positions still never enter React
       * state, and nothing here feeds back into the simulation.
       */
      /** The exact features handed to MapLibre this frame - the rendered truth,
       *  as opposed to the engine's tick-quantised truth. Read by the motion check. */
      let lastWritten: FC['features'] = [];
      const prevPos = new Map<string, [number, number]>();
      /** Eased position for this frame. Falls back to truth on the first tick, on a
       *  teleport-sized jump (a scenario reset), and whenever k has reached 1. */
      const lerpPos = (v: (typeof world.vehicles)[number], k: number): [number, number] => {
        const p = prevPos.get(v.vehicle_id);
        if (!p || k >= 1) return [v.longitude, v.latitude];
        const dx = v.longitude - p[0];
        const dy = v.latitude - p[1];
        // ~500 m at this latitude: larger than any one tick of bus travel, so a reset
        // or a terminus flip snaps instead of sliding across the city.
        if (Math.abs(dx) > 0.0067 || Math.abs(dy) > 0.0045) return [v.longitude, v.latitude];
        return [p[0] + dx * k, p[1] + dy * k];
      };
      let tickAt = performance.now();
      let tickGap = 417;
      const onTick = () => {
        const t = performance.now();
        // Clamped: a paused or backgrounded tab must not produce a multi-second ease.
        tickGap = Math.min(1200, Math.max(80, t - tickAt));
        tickAt = t;
        // Snapshot what was last DRAWN, not the world - `useSim.subscribe` fires after
        // the engine has already mutated `world.vehicles`, so reading it here captures
        // the new position and the ease becomes a no-op (prev === current). Easing from
        // the last drawn frame is also the right behaviour: it cannot snap backwards.
        for (const f of lastWritten) {
          const g = f.geometry as unknown as { coordinates: [number, number] };
          prevPos.set(String(f.properties?.id), [g.coordinates[0], g.coordinates[1]]);
        }
        if (lastWritten.length === 0) {
          for (const v of world.vehicles) prevPos.set(v.vehicle_id, [v.longitude, v.latitude]);
        }
      };
      unsubs.push(useSim.subscribe(onTick));

      const frame = (now: number) => {
        raf = requestAnimationFrame(frame);
        if (now - last < 55) return; // ~18 Hz (plan 20.8 "15 Hz markers")
        last = now;
        if (!vSrc) return;
        // 0..1 through the current tick. Never extrapolates past the engine's truth.
        const k = Math.min(1, (now - tickAt) / tickGap);
        const th = useSettings.getState().th;
        const devTh = th.schedule_deviation_s;
        const cm = colorModeRef.current;
        const features: FC['features'] = [];
        for (const v of world.vehicles) {
          // One funnel verdict per bus per frame, carried as three 0/1 properties
          // so MapLibre's cluster accumulators can sum them (there is no "count
          // where" aggregate; a sum of indicators is the idiomatic form).
          const risk = riskOf(v, th);
          let c: number;
          if (cm === 'load') {
            c = LOAD_BANDS.indexOf(bandOf((v.pax_count / v.capacity) * 100));
          } else if (v.status !== 'in_service') {
            c = 3; // no service / telemetry-dark (S5 grey)
          } else {
            c = devTier(v.schedule_deviation, devTh); // one ladder, map/risk.ts
          }
          features.push({
            type: 'Feature',
            properties: {
              id: v.vehicle_id,
              c,
              // U1. Rounded: a whole degree is 1/360 of a turn, far below what the
              // glyph can express, and it keeps the per-frame payload small.
              heading: Math.round(v.heading),
              // red ring = this bus is itself in a critical condition (S3 funnel logic)
              a: v.status === 'breakdown' || v.flags.panic || v.flags.accident ? 1 : 0,
              cr: risk === 'critical' ? 1 : 0,
              at: risk === 'attention' ? 1 : 0,
            },
            geometry: { type: 'Point', coordinates: lerpPos(v, k) },
          });
        }
        lastWritten = features;
        vSrc.setData({ type: 'FeatureCollection', features });

        // Halo: one point, same frame, no cluster involved (K1). Skipped entirely
        // while nothing is selected — after one empty write to clear the last one.
        const sel = selId ? world.vehicleById.get(selId) : undefined;
        if (sel) {
          selSrc?.setData({
            type: 'FeatureCollection',
            features: [
              { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [sel.longitude, sel.latitude] } },
            ],
          });
          haloDrawn = true;
          drawSelContext(sel);
        } else if (haloDrawn) {
          selSrc?.setData(EMPTY);
          clearSelContext();
          haloDrawn = false;
        }

        // The bus keeps moving while its popup is open (K4).
        popup?.ptccTick?.();
        hoverPopup?.ptccTick?.();
      };
      raf = requestAnimationFrame(frame);

      // ---------------- route state + alert pins, once per sim tick
      const applyTick = () => {
        const metrics = useSim.getState().metrics;
        if (metrics) {
          for (const rm of metrics.per_route.values()) {
            map.setFeatureState({ source: 'routes', id: rm.route_id }, { state: rm.state });
          }
        }
        const pins: FC['features'] = [];
        for (const a of useAlerts.getState().alerts) {
          let lon: number | undefined;
          let lat: number | undefined;
          if (a.vehicle_id) {
            const v = world.vehicleById.get(a.vehicle_id);
            if (v) (lon = v.longitude), (lat = v.latitude);
          } else if (a.route_id) {
            const r = world.routeById.get(a.route_id);
            const p = r?.shape[Math.floor(r.shape.length / 2)];
            if (p) (lon = p[0]), (lat = p[1]);
          }
          if (lon === undefined || lat === undefined) continue;
          pins.push({
            type: 'Feature',
            properties: { id: a.id, sev: a.severity, vehicle_id: a.vehicle_id ?? '', route_id: a.route_id ?? '' },
            geometry: { type: 'Point', coordinates: [lon, lat] },
          });
        }
        (map.getSource('alert-pins') as GeoJSONSource | undefined)?.setData({
          type: 'FeatureCollection',
          features: pins,
        });
      };
      applyTick();
      unsubs.push(useSim.subscribe(applyTick));

      // ---------------- selection: halo, camera, popup
      //
      // K2: a selection made OUTSIDE the map (the Priority Alerts worklist is the
      // main one) used to have the halo as its only feedback — and a halo on a bus
      // that is off-screen is no feedback at all. Ease to it and open its popup, so
      // worklist -> map -> detail is a chain the operator can actually follow.
      const applySel = () => {
        const id = useSelection.getState().vehicle_id ?? '';
        // Re-picking the SAME bus in the worklist after dismissing its popup has to
        // bring it back, so "unchanged" only counts while the popup is still up.
        if (id === selId && (!id || popup)) return;
        selId = id; // the rAF loop draws the halo from this
        if (wall) return; // no camera moves and no popups on the display surface
        const v = id ? world.vehicleById.get(id) : undefined;
        if (!v) return show(null);
        // Don't yank the camera for a bus the operator can already see — clicking a
        // dot would otherwise recentre the map under the cursor on every click.
        const pt = map.project([v.longitude, v.latitude]);
        const { width, height } = map.getContainer().getBoundingClientRect();
        const m = 0.18; // keep it out of the layer panel / legend / attribution gutters
        const visible =
          pt.x > width * m && pt.x < width * (1 - m) && pt.y > height * m && pt.y < height * (1 - m);
        if (!visible)
          map.easeTo({ center: [v.longitude, v.latitude], duration: reducedMotion() ? 0 : 600 });
        show(vehiclePopup(map, id, ctxRef.current));
      };
      applySel();
      unsubs.push(useSelection.subscribe(applySel));

      setReady((n) => n + 1); // the basemap effect waits for this

      if (wall) return; // wall mode: no interaction at all, and no chrome (plan 6.1)

      // Zoom only: rotation and pitch are disabled on the map itself, so a compass
      // would be a control that cannot do anything (plan 11.5 step 6).
      const nav = new maplibregl.NavigationControl({ showCompass: false, showZoom: true });
      map.addControl(nav, 'top-right');
      // MapLibre hard-codes English tooltips on those two buttons.
      for (const [sel, key] of [
        ['.maplibregl-ctrl-zoom-in', 'map.zoomIn'],
        ['.maplibregl-ctrl-zoom-out', 'map.zoomOut'],
      ] as const) {
        const b = (
          nav as unknown as { _container: HTMLElement }
        )._container.querySelector<HTMLButtonElement>(sel);
        if (!b) continue;
        b.title = ctxRef.current.t(key);
        b.setAttribute('aria-label', ctxRef.current.t(key));
      }

      // ---------------- clusters (plan 11.5 step 1)
      clusterRef.current = attachClusters(map, 'vehicles', {
        aria: (c) =>
          ctxRef.current.t('map.clusterAria', {
            total: c.total,
            critical: c.critical,
            attention: c.attention,
          }),
      });

      // Layer handlers all fire for one physical click, so the topmost thing under
      // the cursor claims the event and the rest stand down. Same event object.
      type Claimable = { _ptccClaimed?: boolean };
      const claim = (e: Claimable) => (e._ptccClaimed ? false : (e._ptccClaimed = true));

      // Selecting is all a click does: `applySel` above owns the halo, the camera
      // and the popup, so a click and a worklist pick land in exactly one place.
      map.on('click', 'vehicles', (e) => {
        const id = e.features?.[0]?.properties?.['id'];
        if (typeof id !== 'string' || !claim(e as unknown as Claimable)) return;
        closeHover();
        useSelection.getState().selectVehicle(id);
        // Re-clicking the already-selected bus is not a store change, so nothing
        // would fire; re-open the popup the operator just dismissed.
        if (!popup) show(vehiclePopup(map, id, ctxRef.current));
      });
      map.on('click', 'alert-pins', (e) => {
        closeHover();
        const p = e.features?.[0]?.properties;
        if (!claim(e as unknown as Claimable)) return;
        const vid = typeof p?.['vehicle_id'] === 'string' ? p['vehicle_id'] : '';
        const rid = typeof p?.['route_id'] === 'string' ? p['route_id'] : '';
        if (vid) {
          useSelection.getState().selectVehicle(vid); // applySel opens the popup
          if (!popup) show(vehiclePopup(map, vid, ctxRef.current));
        } else if (rid) {
          useSelection.getState().selectRoute(rid);
          show(routePopup(map, e.lngLat, rid, ctxRef.current));
        }
      });
      map.on('click', 'stops', (e) => {
        closeHover();
        const p = e.features?.[0]?.properties;
        const sid = typeof p?.['stop_id'] === 'string' ? p['stop_id'] : '';
        const rid = typeof p?.['route_id'] === 'string' ? p['route_id'] : '';
        if (!sid || !claim(e as unknown as Claimable)) return;
        show(stopPopup(map, e.lngLat, sid, rid, ctxRef.current));
      });
      map.on('click', 'route-lines', (e) => {
        closeHover();
        const id = e.features?.[0]?.properties?.['route_id'];
        if (typeof id !== 'string' || !claim(e as unknown as Claimable)) return;
        useSelection.getState().selectRoute(id);
        show(routePopup(map, e.lngLat, id, ctxRef.current));
      });
      // GPU markers have no DOM of their own, so hover is driven from the rendered
      // feature under the pointer. `mousemove` (not only `mouseenter`) also handles
      // moving directly from one overlapping bus to another.
      map.on('mousemove', 'vehicles', (e) => {
        const id = e.features?.[0]?.properties?.['id'];
        if (typeof id === 'string') showHover(id);
      });
      map.on('mouseleave', 'vehicles', scheduleHoverClose);
      for (const layer of ['vehicles', 'alert-pins', 'stops', 'route-lines']) {
        map.on('mouseenter', layer, () => (map.getCanvas().style.cursor = 'pointer'));
        map.on('mouseleave', layer, () => (map.getCanvas().style.cursor = ''));
      }
      unsubs.push(() => {
        closeHover();
        show(null);
      });

      // Verification hook. NOT gated on `import.meta.env.DEV`, on purpose: the
      // checks that use it (the cluster-vs-funnel invariant, the offline basemap
      // proof, the K1/K2 selection proof) run against the PRODUCTION build served by
      // `vite preview`, which is the artefact that actually goes on stage — gating
      // this would mean the only build nobody can verify is the one being shown.
      // It is read-only apart from `setZoom`, adds nothing to the bundle but one
      // object literal, and sits alongside `window.__ptcc` from the store, which is
      // ungated for the same reason.
      (window as unknown as Record<string, unknown>)['__ptccMap'] = {
        refresh: () => clusterRef.current?.refresh(),
        clusterTotals: () => clusterRef.current?.totals() ?? null,
        funnel: () => useSim.getState().metrics?.funnel ?? null,
        fleet: () => world.vehicles.length,
        hoveredVehicle: () => hoverId || null,
        zoom: () => map.getZoom(),
        setZoom: (z: number) => map.setZoom(z),
        center: () => {
          const c = map.getCenter();
          return { lng: c.lng, lat: c.lat };
        },
        /** U1 proof: what the layer actually binds rotation to. A screenshot can
         *  show a rotated bus; this shows it is `heading` doing the rotating. */
        rotationBinding: () => ({
          rotate: map.getLayoutProperty('vehicles', 'icon-rotate'),
          alignment: map.getLayoutProperty('vehicles', 'icon-rotation-alignment'),
          image: map.getLayoutProperty('vehicles', 'icon-image'),
          type: map.getLayer('vehicles')?.type,
        }),
        /** The heading GL is rotating one bus by right now, and where it is drawn. */
        vehicleRender: (id: string) => {
          const v = world.vehicleById.get(id);
          if (!v) return null;
          const pt = map.project([v.longitude, v.latitude]);
          return { heading: Math.round(v.heading), lon: v.longitude, lat: v.latitude, x: pt.x, y: pt.y };
        },
        /** U3: what the selected-vehicle context sources currently hold. */
        selContext: () => ({
          trail: map.querySourceFeatures('sel-trail').length,
          parts: [
            ...new Set(map.querySourceFeatures('sel-route').map((f) => String(f.properties?.['part']))),
          ],
          split: selDbg,
        }),
        /**
         * Features in the halo's own source — 1 iff a selection is being drawn.
         *
         * Reads what was WRITTEN to the source, not `querySourceFeatures`, which only
         * returns features from tiles the map has actually rendered: on an idle map it
         * answers 0 for a halo that is plainly on screen, so the journey check failed
         * against a correctly drawn selection. Verified by freezing the engine and
         * diffing the canvas across a selection - the pixels change, the query does not.
         */
        halo: () => {
          const src = map.getSource('selection') as { _data?: FC } | undefined;
          const d = src?._data;
          return d?.features ? d.features.length : map.querySourceFeatures('selection').length;
        },
        /** What the OLD halo filter would have matched on the clustered `vehicles`
         *  source. 0 for any bus inside a cluster: that is the K1 regression, and
         *  the check asserts it is 0 while `halo()` is 1. */
        memberCount: (id: string) =>
          map.querySourceFeatures('vehicles', { filter: ['==', ['get', 'id'], id] }).length,
        /** Vehicle ids MapLibre is drawing as loose dots at the current zoom, i.e.
         *  everything NOT swallowed by a cluster. */
        unclustered: () => {
          const ids = new Set<string>();
          for (const f of map.querySourceFeatures('vehicles', { filter: ['!', ['has', 'point_count']] })) {
            const id = f.properties?.['id'];
            if (typeof id === 'string') ids.add(id);
          }
          return [...ids];
        },
        /** Screen point of the bus nearest the middle of the map, so the check can
         *  click a vehicle rather than hunting for one pixel by pixel. Nearest the
         *  middle specifically: the edges carry the layer panel, the zoom buttons,
         *  the legend and the attribution, any of which would eat the click. */
        /** Rendered (interpolated) coordinate for one bus, or null. */
        renderedPos: (id: string) => {
          const f = lastWritten.find((x) => x.properties?.id === id);
          return f ? (f.geometry as unknown as { coordinates: [number, number] }).coordinates : null;
        },
        busPoint: () => {
          const c = map.getContainer().getBoundingClientRect();
          let best: { id: string; x: number; y: number } | null = null;
          let bestD = Infinity;
          for (const v of world.vehicles) {
            const pt = map.project([v.longitude, v.latitude]);
            const d = (pt.x - c.width / 2) ** 2 + (pt.y - c.height / 2) ** 2;
            if (d < bestD) {
              bestD = d;
              best = { id: v.vehicle_id, x: c.left + pt.x, y: c.top + pt.y };
            }
          }
          return best;
        },
      };
    });

    // ---------------- theme swap: re-read the tokens, re-apply every colour
    const restyle = () => {
      if (!map.getLayer('route-lines')) return; // still loading; init will use fresh tokens anyway
      const N = readColors();
      map.setPaintProperty('bg', 'background-color', N.bg);
      map.setPaintProperty('route-lines', 'line-color', routeColorExpr(N));
      map.setPaintProperty('route-lines-noservice', 'line-color', N.noservice);
      map.setPaintProperty('stops', 'circle-color', N.text3);
      // The bus glyphs are bitmaps we drew from the tokens, so a theme swap redraws
      // them in place (same image ids, same texture slots) — the layer's
      // `icon-image` expression never has to change.
      installBusImages(map, paletteFor(colorModeRef.current, N), N.bg, N.crit);
      map.setPaintProperty('vehicle-labels', 'text-color', N.text1);
      map.setPaintProperty('vehicle-labels', 'text-halo-color', N.bg);
      map.setPaintProperty('sel-route-behind', 'line-color', N.text3);
      map.setPaintProperty('sel-route-ahead', 'line-color', N.accent);
      map.setPaintProperty('sel-deviation', 'line-color', N.warn);
      map.setPaintProperty('sel-trail', 'line-gradient', trailGradientExpr(N));
      map.setPaintProperty('hotspots', 'line-color', cssVar('--color-forecast', '#b48cf2'));
      map.setPaintProperty('selection-halo', 'circle-stroke-color', N.accent);
      map.setPaintProperty('alert-glow', 'circle-color', sevColorExpr(N));
      map.setPaintProperty('alert-pins', 'circle-color', sevColorExpr(N));
      map.setPaintProperty('alert-pins', 'circle-stroke-color', N.bg);
      if (map.getLayer('osm')) {
        const p = rasterPaint(isLightTheme());
        for (const [k, v] of Object.entries(p)) map.setPaintProperty('osm', k, v);
      }
      if (map.getLayer(SCRIM_LAYER)) {
        const p = scrimPaint(isLightTheme());
        for (const [k, v] of Object.entries(p)) map.setPaintProperty(SCRIM_LAYER, k, v);
      }
    };
    window.addEventListener('ptcc:theme', restyle);

    return () => {
      window.removeEventListener('ptcc:theme', restyle);
      cancelAnimationFrame(raf);
      for (const u of unsubs) u();
      clusterRef.current?.destroy();
      clusterRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, [mode]);

  // Drop the legend's dot block on a small embed. Fires only when the flag
  // actually flips, and never touches the GL instance.
  useEffect(() => {
    const el = host.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => {
      const r = e?.contentRect;
      if (r) setCompact(r.height < 420 || r.width < 560);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Mode switch is a single paint-property write - no source rebuild.
  // `ready` is in the deps, not just `colorMode`: the effect bails out when the
  // `vehicles` layer is not there yet (a switch made while the map is still
  // loading, or right after a basemap change), and without `ready` it would never
  // be re-run — the operator's choice was simply lost.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer('vehicles')) return;
    const C = readColors();
    installBusImages(map, paletteFor(colorMode, C), C.bg, C.crit);
  }, [colorMode, ready]);

  // Layer visibility (item 38). `visibility: none` rather than removing the layer:
  // the rAF loop keeps writing to the source either way, so re-showing is instant
  // and nothing has to be rebuilt.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    for (const key of Object.keys(LAYER_GL) as (keyof LayerFlags)[]) {
      const vis = layers[key] ? 'visible' : 'none';
      for (const id of LAYER_GL[key]) if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', vis);
    }
    clusterRef.current?.setVisible(layers.buses);
  }, [layers, ready]);

  // ---------------- the basemap under the operational overlay
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || basemap === 'network') return;

    // Detection path 1 of 3, unchanged: offline is known up front on every browser
    // that implements it, so for the REMOTE basemap do not even issue the requests.
    // It deliberately does not gate the bundled pack — that one is served from our
    // own origin and is expected to work with networking off; a broken local pack
    // is caught by the `error` handler and the watchdog below instead.
    if (basemap === 'streets' && typeof navigator !== 'undefined' && navigator.onLine === false) {
      fallbackRef.current('offline');
      return;
    }

    const bundled = basemap === 'bundled';
    // OpenStreetMap (ODbL) attribution is mandatory, and so is OpenFreeMap's. For
    // the bundled pack both strings ride on the source itself (see the style JSON),
    // which AttributionControl picks up automatically.
    const attribution = new maplibregl.AttributionControl(
      bundled ? { compact: true } : { compact: true, customAttribution: OSM_ATTRIBUTION },
    );
    map.addControl(attribution, 'bottom-right');
    map.setPaintProperty('route-lines', 'line-opacity', 0.85); // thin lines lose the fight with tiles

    let cancelled = false;
    const addedLayers: string[] = [];
    const addedSources: string[] = [];

    if (bundled) {
      void (async () => {
        try {
          const res = await fetch(BUNDLED_STYLE);
          if (!res.ok) throw new Error(String(res.status));
          const st = (await res.json()) as StyleSpecification;
          // The init effect's cleanup may already have run, or the operator may
          // have switched away while the JSON was in flight.
          if (cancelled || !map.getLayer('route-lines')) return;
          // Style-level, so they need their own setters rather than addLayer.
          // These are what make `symbol` layers - and therefore Cyrillic street
          // labels - possible at all.
          map.setGlyphs(st.glyphs ? absolutise(st.glyphs) : null);
          map.setSprite(typeof st.sprite === 'string' ? absolutise(st.sprite) : null);
          for (const [id, src] of Object.entries(st.sources)) {
            map.addSource(id, 'tiles' in src && src.tiles ? { ...src, tiles: src.tiles.map(absolutise) } : src);
            addedSources.push(id);
          }
          for (const l of st.layers) {
            map.addLayer(l, 'route-lines');
            addedLayers.push(l.id);
          }
          map.addLayer(
            { id: SCRIM_LAYER, type: 'background', paint: scrimPaint(isLightTheme()) },
            'route-lines',
          );
          addedLayers.push(SCRIM_LAYER);
        } catch (err) {
          // No pack on disk, or it does not parse: that is exactly the case the
          // fallback exists for — but "the bundled basemap is silently not the
          // bundled basemap" is the kind of thing that gets noticed on stage.
          console.warn('[map] bundled basemap unavailable, falling back', err);
          if (!cancelled) fallbackRef.current('tiles');
        }
      })();
    } else {
      map.addSource('osm', {
        type: 'raster',
        tiles: OSM_TILES,
        tileSize: 256,
        maxzoom: 19,
        attribution: OSM_ATTRIBUTION,
      });
      addedSources.push('osm');
      map.addLayer(
        { id: 'osm', type: 'raster', source: 'osm', paint: rasterPaint(isLightTheme()) },
        'route-lines', // under everything operational
      );
      addedLayers.push('osm');
    }

    // Detection path 2 of 3, unchanged: watchdog for the wifi that associates but
    // never routes - a request that simply hangs fires no error. For the bundled
    // pack the same timer catches a pack that is present but serves nothing.
    let served = false;
    const onData = (e: maplibregl.MapSourceDataEvent) => {
      if (e.tile && (e.sourceId === 'osm' || e.sourceId === BUNDLED_SOURCE)) {
        served = true;
        servedRef.current = true;
      }
    };
    // Detection path 3 of 3, unchanged.
    const onOffline = () => fallbackRef.current('offline');
    const watchdog = window.setTimeout(() => {
      if (!served) fallbackRef.current('tiles');
    }, 6000);
    map.on('sourcedata', onData);
    if (!bundled) window.addEventListener('offline', onOffline);

    return () => {
      cancelled = true;
      servedRef.current = false;
      window.clearTimeout(watchdog);
      window.removeEventListener('offline', onOffline);
      // The GL instance may already be gone (collapse/unmount runs the init
      // effect's cleanup first), so every teardown call here is best-effort.
      //
      // ONE TRY PER STEP, deliberately: these five are independent, and with a
      // single shared `try` a throw in `removeControl` skipped the layer and source
      // removal entirely — orphaning the bundled pack's ~110 layers on every
      // basemap switch, which then collide with the next pack's ids.
      const step = (what: string, fn: () => void) => {
        try {
          fn();
        } catch (err) {
          console.warn('[map] basemap teardown step failed:', what, err);
        }
      };
      step('sourcedata listener', () => map.off('sourcedata', onData));
      step('attribution control', () => map.removeControl(attribution));
      step('route opacity', () => map.setPaintProperty('route-lines', 'line-opacity', 0.55));
      step('layers', () => {
        for (const id of addedLayers) if (map.getLayer(id)) map.removeLayer(id);
      });
      step('sources', () => {
        for (const id of addedSources) if (map.getSource(id)) map.removeSource(id);
      });
      if (bundled)
        step('glyphs/sprite', () => {
          // Back to the inline style's glyph URL, NOT null: the vehicle-id label
          // layer is ours and outlives every basemap switch. Same bundled files.
          map.setGlyphs(absolutise(GLYPHS));
          map.setSprite(null);
        });
    };
  }, [basemap, ready]);

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden">
      {/*
        Size the host explicitly instead of `absolute inset-0`.
        MapLibre's own stylesheet sets `.maplibregl-map { position: relative }`, and the
        map CSS chunk is loaded lazily AFTER the Tailwind bundle - so it wins the cascade,
        the element stops being absolutely positioned, `inset-0` no longer applies and the
        container collapses to zero height. h-full/w-full does not depend on positioning.
      */}
      <div ref={host} className="h-full w-full" />
      {/* Wall mode renders NO chrome (plan 6.1): no layer panel, no zoom buttons,
          no popups — the whole interaction layer is gated on this one flag. */}
      {!wall && (
        <LayerPanel
          layers={layers}
          setLayers={setLayers}
          basemap={basemap}
          setBasemap={setBasemap}
          colorMode={colorMode}
          setColorMode={setColorMode}
        />
      )}
      {!wall ? <SelectedVehicleInsight /> : null}
      <MapLegend colorMode={colorMode} compact={compact} />
      {notice && (
        <div
          role="status"
          className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 rounded border border-[var(--color-sev-warn)] bg-[var(--color-bg1)] px-2.5 py-1 text-[11px] text-[var(--color-text2)] shadow-[var(--shadow-panel)]"
          style={{ zIndex: 'var(--z-sticky)' }}
        >
          {t(notice === 'offline' ? 'map.offlineNotice' : 'map.tilesNotice')}
        </div>
      )}
    </div>
  );
}

function SelectedVehicleInsight() {
  const t = useT();
  const lang = useLang();
  const selected = useSelection((s) => s.vehicle_id);
  useSim((s) => s.tick);
  if (!selected) return null;
  const v = world.vehicleById.get(selected);
  if (!v) return null;
  const route = world.routeById.get(v.route_id);
  const stop = route?.stops.find((s) => s.stop_id === v.next_stop_id);
  const alert = useAlerts.getState().alerts.find((a) => a.vehicle_id === v.vehicle_id || (a.route_id === v.route_id && a.severity === 'critical'));
  const load = Math.round((v.pax_count / Math.max(1, v.capacity)) * 100);
  const deviation = v.schedule_deviation / 60;
  const open = () => {
    location.hash = `#/vehicle/${v.vehicle_id}?from=map&trip=${encodeURIComponent(tripIdOf(v))}`;
  };
  return (
    <aside
      data-map-insight
      className="absolute right-2 top-12 w-[min(17rem,calc(100%-1rem))] rounded-md border border-[var(--color-line)] bg-[color-mix(in_srgb,var(--color-bg1)_94%,transparent)] p-2 shadow-[var(--shadow-2)] sm:top-2"
      style={{ zIndex: 'var(--z-raised)' }}
      aria-label={t('map.insight.title')}
    >
      <div className="flex items-center gap-2">
        <strong className="num t-card min-w-0 flex-1 truncate">{v.vehicle_id} · {v.route_id}</strong>
        <StatusPill tone={alert?.severity === 'critical' ? 'crit' : alert ? 'warn' : 'ok'}>
          {alert ? t('map.insight.alert') : t('map.insight.clear')}
        </StatusPill>
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
        <div><dt className="t-label">{t('map.insight.deviation')}</dt><dd className="num">{deviation >= 0 ? '+' : ''}{deviation.toFixed(1)} {t('unit.min')}</dd></div>
        <div><dt className="t-label">{t('map.insight.load')}</dt><dd className="num">{load}% · {v.pax_count}/{v.capacity}</dd></div>
        <div className="col-span-2"><dt className="t-label">{t('map.insight.nextStop')}</dt><dd className="truncate">{stop ? (lang === 'mn' ? stop.name_mn : stop.name_en) : t('map.popNone')} · {Math.round(v.distance_to_next_stop_m)} m</dd></div>
      </dl>
      <div className="mt-2 flex items-center justify-end gap-1">
        <Button size="sm" onClick={() => useSelection.getState().selectVehicle(null)}>{t('map.insight.clearSelection')}</Button>
        <Button size="sm" variant="primary" onClick={open}>{t('map.actOpenDetail')}</Button>
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------- chrome

function Seg<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { v: T; label: string; title?: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded border border-[var(--color-line)] bg-[var(--color-bg2)] p-0.5 text-[10px]">
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          title={o.title}
          aria-pressed={value === o.v}
          onClick={() => onChange(o.v)}
          className={`rounded px-2 py-1 ${
            value === o.v
              ? 'bg-[var(--color-bg3)] text-[var(--color-text1)]'
              : 'text-[var(--color-text3)] hover:text-[var(--color-text1)]'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Collapsible layer panel (plan 11.5 step 6, backlog item 38).
 *
 * Collapsed to a compact chip by default — the Command Centre embeds this map at
 * ~640x330 and a permanent panel would eat it — and it expands on hover OR on
 * keyboard focus anywhere inside (`group-focus-within`), so tabbing to the chip
 * reveals the controls without a click. Clicking the chip PINS it open, which is
 * what you want while flicking several toggles.
 *
 * It absorbs the two bare `Seg` controls that used to sit in the panel header, so
 * the basemap choice and the vehicle colour mode are now in the same place as the
 * layer toggles rather than in a different component.
 */
function LayerPanel({
  layers,
  setLayers,
  basemap,
  setBasemap,
  colorMode,
  setColorMode,
}: {
  layers: LayerFlags;
  setLayers: (fn: (s: LayerFlags) => LayerFlags) => void;
  basemap: Basemap;
  setBasemap?: (v: Basemap) => void;
  colorMode: VehicleColorMode;
  setColorMode?: (v: VehicleColorMode) => void;
}) {
  const t = useT();
  const [pinned, setPinned] = useState(false);
  const hotspots = useSelection((s) => s.segment_keys.length);
  return (
    <div
      className="group absolute left-2 top-2 flex flex-col items-start gap-1"
      style={{ zIndex: 'var(--z-raised)' }}
    >
      <button
        type="button"
        aria-expanded={pinned}
        onClick={() => setPinned((p) => !p)}
        className="flex items-center gap-1 rounded border border-[var(--color-line)] bg-[color-mix(in_srgb,var(--color-bg1)_90%,transparent)] px-2 py-1 text-[10px] text-[var(--color-text2)] hover:text-[var(--color-text1)]"
      >
        <Chevron open={pinned} />
        {t('map.layers')}
      </button>
      {hotspots > 0 && (
        <button
          type="button"
          onClick={() => useSelection.getState().setSegments([])}
          className="rounded border border-[var(--color-forecast)] bg-[color-mix(in_srgb,var(--color-bg1)_90%,transparent)] px-2 py-1 text-[10px] text-[var(--color-text2)] hover:text-[var(--color-text1)]"
        >
          {t('hs.clear')} ({hotspots})
        </button>
      )}
      <div
        className={`${
          pinned ? 'flex' : 'hidden group-hover:flex group-focus-within:flex'
        } w-[min(13rem,calc(100vw-2rem))] flex-col gap-2 rounded border border-[var(--color-line)] bg-[color-mix(in_srgb,var(--color-bg1)_94%,transparent)] p-2 shadow-[var(--shadow-2)]`}
      >
        <ul className="flex flex-col gap-1">
          {(Object.keys(LAYER_GL) as (keyof LayerFlags)[]).map((k) => (
            <li key={k}>
              <label className="flex items-center gap-1.5 text-[10px] text-[var(--color-text2)]">
                <input
                  type="checkbox"
                  checked={layers[k]}
                  onChange={(e) => setLayers((s) => ({ ...s, [k]: e.target.checked }))}
                  className="h-3 w-3 accent-[var(--color-accent)]"
                />
                {t(LAYER_LABEL[k])}
              </label>
            </li>
          ))}
        </ul>
        {setBasemap && (
          <div className="flex flex-col gap-1">
            <div className="panel-title">{t('map.layerBasemap')}</div>
            <Seg<Basemap>
              value={basemap}
              onChange={setBasemap}
              options={[
                { v: 'bundled', label: t('map.basemapBundled'), title: t('map.basemapBundledHint') },
                { v: 'network', label: t('map.basemapNetwork'), title: t('map.basemapNetworkHint') },
                { v: 'streets', label: t('map.basemapStreets'), title: t('map.basemapStreetsHint') },
              ]}
            />
          </div>
        )}
        {setColorMode && (
          <div className="flex flex-col gap-1">
            <div className="panel-title">{t('map.layerColour')}</div>
            <Seg<VehicleColorMode>
              value={colorMode}
              onChange={setColorMode}
              options={[
                { v: 'delay', label: t('map.byDelay') },
                { v: 'load', label: t('map.byLoad') },
              ]}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * The map on its own, no page chrome — the Command Centre embeds this directly
 * so the wall and the `/map` module render the same GL instance code path.
 *
 * Operator mode wraps it in a collapsible panel: the client asked that the
 * network map not dominate the workflow, so it folds to a one-line header and
 * releases the GL context (the host unmounts, which tears the map down) until
 * the network view is needed again. Wall mode is a display surface: no chrome,
 * no collapsing, no switchers (plan 6.1).
 */
export function MapCanvas({ className = '' }: { className?: string }) {
  const wall = useSettings((s) => s.mode) === 'wall';
  const showEvidence = useSettings((s) => s.showEvidence);
  const [open, setOpen] = useState(true);
  const [colorMode, setColorMode] = useState<VehicleColorMode>('delay');
  // The bundled pack is offline too (plan 1.1) - it is the default precisely
  // because it costs nothing in offline guarantees and buys street-level context.
  const [basemap, setBasemap] = useState<Basemap>('bundled');
  const [notice, setNotice] = useState<FallbackReason | null>(null);
  const t = useT();

  // Every failure path lands here: back to the vector network, say why, and let
  // the message fade. None of it blocks rendering.
  const onFallback = (reason: FallbackReason) => {
    setBasemap('network');
    setNotice(reason);
  };

  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(null), 8000);
    return () => window.clearTimeout(id);
  }, [notice]);

  if (wall) {
    return (
      <div className={`relative min-h-0 overflow-hidden rounded-[6px] ${className}`}>
        <MapGL colorMode="delay" basemap="bundled" onFallback={onFallback} notice={null} />
      </div>
    );
  }

  return (
    <section
      className={`panel flex min-h-0 flex-col overflow-hidden ${className}`}
      // Collapsed: hand the height back to the incident panels the map shares a
      // flex column with. Inline style beats the caller's `flex-1` class.
      style={open ? undefined : { flex: '0 0 auto' }}
    >
      <header
        className={`flex shrink-0 items-center justify-between gap-2 px-2 py-1 ${
          open ? 'border-b border-[var(--color-line)]' : ''
        }`}
      >
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-2 text-left hover:text-[var(--color-text2)]"
        >
          <h2 className="panel-title flex min-w-0 items-center gap-1.5">
            <Chevron open={open} />
            <span className="truncate">{t('map.panelTitle')}</span>
          </h2>
          {!open && <span className="t-meta truncate">{t('map.collapsedSummary')}</span>}
        </button>
        {open && showEvidence && (
          <div className="flex shrink-0 items-center gap-1.5">
            <EvidenceTag label="INFERRED" cite="plan 1.1 bundled basemap" />
          </div>
        )}
      </header>
      {open && (
        <div className="min-h-0 flex-1">
          {/* The basemap and colour-mode switchers moved INTO the map, in the
              collapsible layer panel (item 38) — one place for every view control. */}
          <MapGL
            colorMode={colorMode}
            basemap={basemap}
            onFallback={onFallback}
            notice={notice}
            setColorMode={setColorMode}
            setBasemap={(v) => {
              setNotice(null);
              setBasemap(v);
            }}
          />
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- legend

/**
 * S7 three-state legend, which is the client-confirmed choice (plan 20.6).
 * Settings can switch to the Slide-5 four-state wording, which the deck also
 * contains; the two are unreconciled in the source, so the demo shows one and
 * says which. The dot block below it explains the two marks the line legend does
 * not cover — buses (whose scale changes with the colour mode) and incidents.
 */
export function MapLegend({
  colorMode = 'delay',
  compact = false,
}: {
  colorMode?: VehicleColorMode;
  /** Small embed: line states only, or the legend eats the map. */
  compact?: boolean;
}) {
  const t = useT();
  const legend = useSettings((s) => s.legend);
  const wall = useSettings((s) => s.mode) === 'wall';
  const showEvidence = useSettings((s) => s.showEvidence);
  // Collapsible (item 38) but open by default — the S7 colours are unreadable
  // without it. The wall has no chrome at all, so it is permanently open there.
  const [open, setOpen] = useState(true);
  const shown = wall || open;
  // U3's three marks only exist while a bus is selected, so neither does their
  // legend. Subscribing to one id is not a per-frame cost: the rAF loop writes the
  // trail itself and never touches React.
  const selected = useSelection((s) => s.vehicle_id);

  const rows: { key: I18nKey; color: string; dashed?: boolean }[] =
    legend === 's5'
      ? [
          // S5 wording: these are VEHICLE schedule-deviation states, which the
          // map's "by delay" vehicle mode expresses with the same three colours.
          { key: 'legend.onTime', color: 'var(--color-map-normal)' },
          { key: 'legend.slightDelay', color: 'var(--color-map-slower)' },
          { key: 'legend.majorDelay', color: 'var(--color-map-disrupted)' },
          { key: 'legend.noservice', color: 'var(--color-map-noservice)', dashed: true },
        ]
      : [
          { key: 'legend.normal', color: 'var(--color-map-normal)' },
          { key: 'legend.slower', color: 'var(--color-map-slower)' },
          { key: 'legend.disrupted', color: 'var(--color-map-disrupted)' },
          { key: 'legend.noservice', color: 'var(--color-map-noservice)', dashed: true },
        ];

  const dots: { key: I18nKey; color: string }[] =
    colorMode === 'load'
      ? LOAD_BANDS.map((b) => ({ key: b.key as I18nKey, color: b.color }))
      : rows.slice(0, 3).map((r) => ({ key: r.key, color: r.color }));

  return (
    <div
      className="pointer-events-none absolute bottom-2 left-2 rounded border border-[var(--color-line)] bg-[color-mix(in_srgb,var(--color-bg1)_90%,transparent)] px-2 py-1.5"
      style={{ fontSize: wall ? '0.8em' : 11, zIndex: 'var(--z-raised)' }}
    >
      {wall ? (
        <div className="panel-title mb-1">{t('legend.title')}</div>
      ) : (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          title={t(open ? 'map.legendHide' : 'map.legendShow')}
          // The container is pointer-events-none so the map underneath stays
          // draggable; the one interactive thing in it opts back in.
          className="pointer-events-auto mb-1 flex items-center gap-1 text-[var(--color-text3)] hover:text-[var(--color-text1)]"
        >
          <Chevron open={open} />
          <span className="panel-title">{t('legend.title')}</span>
        </button>
      )}
      {shown && (
      <ul className="flex flex-col gap-1">
        {rows.map((r) => (
          <li key={r.key} className="flex items-center gap-2 text-[var(--color-text2)]">
            <span
              aria-hidden
              style={{
                width: 16,
                height: 0,
                borderTop: `3px ${r.dashed ? 'dashed' : 'solid'} ${r.color}`,
              }}
            />
            {t(r.key)}
          </li>
        ))}
      </ul>
      )}

      {shown && !compact && (
        <>
          <div className="panel-title mb-1 mt-2">
            {t(colorMode === 'load' ? 'map.legendLoadTitle' : 'map.legendBusTitle')}
          </div>
          <ul className="flex flex-col gap-1">
            {dots.map((d) => (
              <li key={d.key} className="flex items-center gap-2 text-[var(--color-text2)]">
                <span
                  aria-hidden
                  style={{ width: 8, height: 8, borderRadius: 999, background: d.color, flex: '0 0 auto' }}
                />
                {t(d.key)}
              </li>
            ))}
            <li className="flex items-center gap-2 text-[var(--color-text2)]">
              <span
                aria-hidden
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  background: 'var(--color-sev-crit)',
                  border: '2px solid var(--color-bg0)',
                  flex: '0 0 auto',
                }}
              />
              {t('map.legendIncident')}
            </li>
          </ul>
        </>
      )}

      {shown && !compact && selected && (
        <>
          <div className="panel-title mb-1 mt-2">{t('map.legendSelTitle')}</div>
          <ul className="flex flex-col gap-1">
            {(
              [
                ['map.legendAhead', 'var(--color-accent)', 'solid'],
                ['map.legendBehind', 'var(--color-text3)', 'dashed'],
                ['map.legendDeviation', 'var(--color-sev-warn)', 'dashed'],
              ] as [I18nKey, string, string][]
            ).map(([key, color, style]) => (
              <li key={key} className="flex items-center gap-2 text-[var(--color-text2)]">
                <span
                  aria-hidden
                  style={{ width: 16, height: 0, borderTop: `2px ${style} ${color}`, flex: '0 0 auto' }}
                />
                {t(key)}
              </li>
            ))}
            <li className="flex items-center gap-2 text-[var(--color-text2)]">
              <span
                aria-hidden
                style={{
                  width: 16,
                  height: 3,
                  borderRadius: 999,
                  // the trail's own fade, in one element
                  background:
                    'linear-gradient(to right, transparent, color-mix(in srgb, var(--color-accent) 60%, transparent))',
                  flex: '0 0 auto',
                }}
              />
              {t('map.legendTrail')}
            </li>
          </ul>
        </>
      )}

      {shown && !wall && !compact && (
        <div className="mt-1.5 flex max-w-[15rem] items-start gap-1 text-[9px] leading-tight text-[var(--color-text3)]">
          {showEvidence ? <EvidenceTag label="CONFIRMED" cite="S7" /> : null}
          <span>{t(legend === 's5' ? 'legend.noteS5' : 'legend.note')}</span>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- page

export default function LiveMap() {
  // flex-1 rather than h-full: collapsing the panel has to be able to give the
  // height back (an inline flex-basis can override `flex-1`, never `h-full`).
  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <MapCanvas className="min-h-0 w-full flex-1" />
    </div>
  );
}
