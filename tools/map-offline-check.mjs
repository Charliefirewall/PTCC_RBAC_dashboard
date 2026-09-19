/**
 * Proof for plan 11.3 step 7: the bundled basemap renders streets and Cyrillic
 * labels with NO request leaving our origin.
 *
 * Note on `context.setOffline(true)`: Chromium's offline emulation blocks
 * loopback too, so the page could not load at all. We therefore prove the same
 * property harder — every off-origin request is aborted by a route handler AND
 * logged, `navigator.onLine` is forced to false before any app code runs, and
 * setOffline(true) is switched on for the final interaction pass.
 */
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const BASE = process.env.BASE ?? 'http://127.0.0.1:4180';
const ORIGIN = new URL(BASE).origin;
const SHOT = 'H:/Mongolia Bus Transport/_compare/ours/map-bundled.png';

const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ viewport: { width: 1680, height: 950 } });

const offOrigin = [];
const ok = { tiles: 0, glyphs: new Set(), sprite: 0, failed: 0 };

await ctx.route('**', (route) => {
  const u = route.request().url();
  if (!u.startsWith(ORIGIN) && !u.startsWith('data:') && !u.startsWith('blob:')) {
    offOrigin.push(u);
    return route.abort('internetdisconnected'); // the venue has no network
  }
  return route.continue();
});

const p = await ctx.newPage();
// Before any app code: the browser believes it is offline.
await p.addInitScript(() => Object.defineProperty(navigator, 'onLine', { get: () => false }));

p.on('response', (r) => {
  const u = new URL(r.url()).pathname;
  if (!r.ok()) return;
  if (u.includes('/tiles/')) ok.tiles++;
  else if (u.includes('/fonts/')) ok.glyphs.add(decodeURIComponent(u.split('/fonts/')[1]));
  else if (u.includes('/sprite/')) ok.sprite++;
});
p.on('requestfailed', (r) => {
  if (r.url().startsWith(ORIGIN)) ok.failed++;
});

await p.goto(`${BASE}/?role=operations_controller#/map`, { waitUntil: 'load' });
await p.waitForTimeout(9000);

// From here on the context is genuinely offline as well.
await ctx.setOffline(true);
await p.waitForTimeout(1500);

const canvas = p.locator('canvas.maplibregl-canvas').first();
await mkdir('H:/Mongolia Bus Transport/_compare/ours', { recursive: true });
const shot = await canvas.screenshot();
await writeFile(SHOT, shot);

// Decode the shot in-page (no image dependency) and measure how much of the
// frame is actually drawn: a wireframe on black is a handful of colours.
const px = await p.evaluate(async (b64) => {
  const img = new Image();
  img.src = 'data:image/png;base64,' + b64;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height).data;
  const seen = new Set();
  for (let i = 0; i < d.length; i += 4) seen.add((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]);
  return { w: img.width, h: img.height, colors: seen.size };
}, shot.toString('base64'));

const attribution = await p.locator('.maplibregl-ctrl-attrib').first().innerHTML().catch(() => '');

const checks = [
  ['no off-origin request', offOrigin.length === 0, `${offOrigin.length} leaked: ${offOrigin.slice(0, 5)}`],
  ['vector tiles served', ok.tiles > 5, `${ok.tiles} tiles`],
  ['Cyrillic glyph range loaded', [...ok.glyphs].some((g) => g.includes('1024-1279')), [...ok.glyphs].join(', ')],
  ['sprite served', ok.sprite > 0, `${ok.sprite} files`],
  ['no failed same-origin request', ok.failed === 0, `${ok.failed} failed`],
  ['canvas is cartography, not a wireframe', px.colors > 2000, `${px.colors} distinct colours in ${px.w}x${px.h}`],
  ['OSM attribution visible', /openstreetmap/i.test(attribution), attribution.slice(0, 120)],
  ['OpenFreeMap attribution visible', /openfreemap/i.test(attribution), attribution.slice(0, 120)],
];

let bad = 0;
for (const [name, pass, detail] of checks) {
  if (!pass) bad++;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}  (${detail})`);
}
console.log(`\nglyph ranges: ${[...ok.glyphs].sort().join(' | ')}`);
console.log(`screenshot: ${SHOT}`);
await b.close();
process.exit(bad ? 1 : 0);
