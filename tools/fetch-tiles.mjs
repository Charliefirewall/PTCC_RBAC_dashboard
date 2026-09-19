/**
 * Bundle the offline street basemap (plan 11.3).
 *
 * Downloads OpenFreeMap's Liberty vector tiles, glyphs and sprite for the UB
 * bbox into public/, and writes a rewritten style with relative URLs.
 * Run from the project dir:  node tools/fetch-tiles.mjs
 *
 * TRAP: tiles must land on disk DECOMPRESSED. fetch() transparently gunzips the
 * response; a static file server will not re-add `Content-Encoding: gzip` to a
 * .pbf, so a still-gzipped file is unparseable by MapLibre. We write the bytes
 * of arrayBuffer(), which are already decompressed.
 */
import { mkdir, writeFile, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
const GLYPH_URL = 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf';
const SPRITE_URL = 'https://tiles.openfreemap.org/sprites/ofm_f384/ofm';
const BBOX = [106.55, 47.7, 107.4, 48.1]; // LiveMap maxBounds
const MAXZOOM = 14; // source maxzoom; z15 comes back empty, MapLibre overzooms
const FONTSTACKS = ['Noto Sans Regular', 'Noto Sans Bold', 'Noto Sans Italic'];
// 1024-1279 = Cyrillic (Mongolian street names), 6144-6399 = Mongolian script.
// MapLibre requests a range only when a rendered label needs those codepoints;
// these are the ranges Liberty actually asks for over this bbox.
const RANGES = ['0-255', '256-511', '1024-1279', '6144-6399', '8192-8447'];
const OUT = join(process.cwd(), 'public');
const CONCURRENCY = 8;

let bytes = 0;
let skipped = 0;

const lon2x = (lon, z) => Math.floor(((lon + 180) / 360) * 2 ** z);
const lat2y = (lat, z) => {
  const r = (lat * Math.PI) / 180;
  return Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z);
};

/** Download `url` to `file` unless it already exists. Returns bytes written. */
async function get(url, file) {
  try {
    const s = await stat(file);
    if (s.size > 0) {
      bytes += s.size;
      skipped++;
      return;
    }
  } catch {
    /* not there yet */
  }
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 404) return; // sparse tile pyramid: absent tile is normal
    throw new Error(`${res.status} ${res.statusText} for ${url}`);
  }
  const buf = Buffer.from(await res.arrayBuffer()); // already gunzipped by fetch
  if (buf.length === 0) return;
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, buf);
  bytes += buf.length;
}

/** Run `jobs` (thunks) with a fixed pool. */
async function pool(jobs) {
  let i = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (i < jobs.length) await jobs[i++]();
    }),
  );
}

const style = await (await fetch(STYLE_URL)).json();

// The vector source's `url` is a TileJSON endpoint, NOT a tile template.
// Resolve it: tiles[0] is the real …/planet/<date>/{z}/{x}/{y}.pbf, and the
// date changes, so this must never be hard-coded.
const srcName = Object.keys(style.sources).find((k) => style.sources[k].type === 'vector');
const tileJson = await (await fetch(style.sources[srcName].url)).json();
const template = tileJson.tiles[0];
console.log(`source "${srcName}" -> ${template}`);

for (let z = 0; z <= MAXZOOM; z++) {
  const [x0, x1] = [lon2x(BBOX[0], z), lon2x(BBOX[2], z)];
  const [y0, y1] = [lat2y(BBOX[3], z), lat2y(BBOX[1], z)];
  const jobs = [];
  for (let x = x0; x <= x1; x++)
    for (let y = y0; y <= y1; y++) {
      const url = template.replace('{z}', z).replace('{x}', x).replace('{y}', y);
      jobs.push(() => get(url, join(OUT, 'tiles', String(z), String(x), `${y}.pbf`)));
    }
  const before = bytes;
  await pool(jobs);
  console.log(`z${z}: ${jobs.length} tiles, ${((bytes - before) / 1048576).toFixed(2)} MB`);
}

await pool(
  FONTSTACKS.flatMap((f) =>
    RANGES.map(() => null).map((_, i) => () =>
      get(
        GLYPH_URL.replace('{fontstack}', encodeURIComponent(f)).replace('{range}', RANGES[i]),
        join(OUT, 'fonts', f, `${RANGES[i]}.pbf`),
      ),
    ),
  ),
);
console.log(`glyphs: ${FONTSTACKS.length * RANGES.length} ranges`);

await pool(
  ['.json', '.png', '@2x.png', '@2x.json'].map((ext) => () =>
    get(SPRITE_URL + ext, join(OUT, 'sprite', `ofm${ext}`)),
  ),
);
console.log('sprite: done');

// ---- the local style (plan 11.3 step 3)
style.sources[srcName] = { type: 'vector', tiles: ['./tiles/{z}/{x}/{y}.pbf'], minzoom: 0, maxzoom: MAXZOOM,
  attribution: tileJson.attribution ?? '<a href="https://openfreemap.org" target="_blank" rel="noreferrer">OpenFreeMap</a> &copy; <a href="https://www.openmaptiles.org/" target="_blank" rel="noreferrer">OpenMapTiles</a> Data from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>' };
// Liberty also carries a remote Natural Earth raster source used by one layer
// capped at z7. Our minZoom is 9.5 so it can never draw — but leaving it in the
// style is a request that could leave the origin. Drop both.
for (const k of Object.keys(style.sources)) if (k !== srcName) delete style.sources[k];
style.layers = style.layers.filter((l) => !l.source || l.source === srcName);
style.glyphs = './fonts/{fontstack}/{range}.pbf';
style.sprite = './sprite/ofm';
await mkdir(join(OUT, 'styles'), { recursive: true });
await writeFile(join(OUT, 'styles', 'ub-liberty.json'), JSON.stringify(style));

console.log(`\ntotal ${(bytes / 1048576).toFixed(2)} MB (${skipped} files already present)`);
