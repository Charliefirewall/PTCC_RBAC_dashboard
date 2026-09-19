/**
 * Screen capture. One page load, ten scenes, each held for exactly as long as its
 * narration takes — the durations measured by tts.mjs, not guessed here.
 *
 * `go()` moves to the scene, `act()` performs the on-screen business, and whatever time
 * is left over is spent holding still. If an `act()` ever overruns its narration the
 * script says so rather than silently letting the voice fall behind the picture.
 */
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync, mkdirSync, renameSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { SCENES } from './scenes.mjs';

const BASE = process.env.PTCC_BASE ?? 'http://127.0.0.1:8080';
const OUT = 'build/video';
const RAW = join(OUT, 'raw');

const { timings } = JSON.parse(readFileSync(join(OUT, 'timings.json'), 'utf8'));
const holdOf = (id) => timings.find((t) => t.id === id).hold * 1000;

rmSync(RAW, { recursive: true, force: true });
mkdirSync(RAW, { recursive: true });

const browser = await chromium.launch({
  args: ['--hide-scrollbars', '--force-device-scale-factor=1', '--disable-gpu-vsync'],
});
// 1920x960, not 1080. The remaining 120px of the 1080p frame becomes a dedicated
// caption band in build.mjs, so burned-in subtitles never sit on top of the interface.
// Recording at the real height keeps the UI pixel-perfect - nothing is scaled later.
const ctx = await browser.newContext({
  viewport: { width: 1920, height: 960 },
  recordVideo: { dir: RAW, size: { width: 1920, height: 960 } },
  reducedMotion: 'no-preference',
});
const page = await ctx.newPage();
// Recording starts the moment the page exists. Everything before the first scene -
// navigation, waiting for the app, the settle - is head padding whose real length
// varies run to run. MEASURE it: assuming a constant put the captions ~3s ahead of the
// picture, which at a scene boundary means narrating the next screen over this one.
const videoT0 = Date.now();

const errs = [];
page.on('pageerror', (e) => errs.push(e.message.slice(0, 120)));

// The only load in the whole video. Everything after this is a store write or a hash.
await page.goto(`${BASE}/`, { waitUntil: 'load' });
await page.waitForFunction(() => Boolean(window.__ptcc), null, { timeout: 60_000 });
await page.waitForTimeout(3000); // warm-up settles; must match HEAD in build.mjs

// Freeze immediately, before a single scene plays. The narration quotes figures off the
// Command Centre, and those figures climb as the simulation runs: leaving it live through
// the 20s opening scene meant the voice said "twelve need attention" over a screen reading
// nineteen. Frozen here, the state at scene 2 is the post-warm-up state every single run,
// and the map scene is the one that starts the clock again.
await page.evaluate(() => window.__ptcc.engine.pause());
await page.waitForTimeout(500);

const head = (Date.now() - videoT0) / 1000;
writeFileSync(join(OUT, 'head.json'), JSON.stringify({ head: +head.toFixed(3) }));
console.log(`measured head offset: ${head.toFixed(2)}s`);

for (const scene of SCENES) {
  const hold = holdOf(scene.id);
  const t0 = Date.now();

  await scene.go(page);

  // Hard budget. A scene that blocks - MapLibre re-tiling under the recorder is the one
  // that did - must not push every later scene out of sync with its narration. Capped at
  // its own hold time; whatever it had left to do is abandoned, and the log says so.
  await Promise.race([
    scene.act(page),
    new Promise((r) => setTimeout(r, hold)),
  ]);

  const spent = Date.now() - t0;
  const left = hold - spent;
  if (left < 0) {
    console.warn(`  ! ${scene.id} overran its narration by ${(-left / 1000).toFixed(1)}s`);
  } else {
    await page.waitForTimeout(left);
  }
  console.log(`${scene.id.padEnd(14)} acted ${(spent / 1000).toFixed(1)}s, held ${(hold / 1000).toFixed(1)}s`);
}

// A moment on the closing frame so the video does not end on a hard cut.
await page.waitForTimeout(1200);

const videoPath = await page.video().path();
await ctx.close(); // flushes the file
await browser.close();

const finalRaw = join(OUT, 'screen.webm');
if (existsSync(finalRaw)) rmSync(finalRaw);
renameSync(videoPath, finalRaw);

console.log(`\nrecorded -> ${finalRaw}`);
if (errs.length) {
  console.log(`page errors during recording: ${errs.length}`);
  for (const e of errs.slice(0, 5)) console.log('  ' + e);
} else {
  console.log('page errors during recording: 0');
}
