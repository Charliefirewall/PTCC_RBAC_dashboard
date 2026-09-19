// Finds containers that a parent flex column has SHRUNK below their content height
// while overflow stays visible - the cause of panels painting over each other.
import { chromium } from '@playwright/test';
const BASE = process.env.PTCC_BASE ?? 'http://127.0.0.1:4173';
const ROUTES = ['dashboard','command','map','regularity','passenger','alerts','comms','health','operators','copilot','agentic','roi','analytics','multimodal','settings','provenance','depot','platform'];
const SIZES = (process.argv[2] || '1366x768,1920x1080').split(',').map((s) => s.split('x').map(Number));
const browser = await chromium.launch();
let n = 0;
for (const [w, h] of SIZES) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  const JOBS = [...ROUTES.map((r) => ['supervisor', r]),
    ...['operations_controller','incident_manager','communication_controller','dispatcher','field_inspector','bus_operator_occ'].map((x) => [x, 'dashboard'])];
  for (const [role, r] of JOBS) {
    await page.goto(`${BASE}/?role=${role}#/${r}`, { waitUntil: 'load' });
    await page.waitForTimeout(1200);
    const hits = await page.evaluate(() => {
      const bad = [];
      for (const el of document.querySelectorAll('main *')) {
        const cs = getComputedStyle(el);
        if (cs.overflowY !== 'visible') continue;
        const p = el.parentElement;
        if (!p) continue;
        const pcs = getComputedStyle(p);
        if (pcs.display !== 'flex' || !pcs.flexDirection.startsWith('column')) continue;
        if (el.scrollHeight > el.clientHeight + 8) {
          bad.push(`${el.tagName}.${el.className.slice(0, 60)} h=${el.clientHeight} needs=${el.scrollHeight}`);
        }
      }
      return bad;
    });
    for (const x of hits) { console.log(`${w}px ${role}/${r}: ${x}`); n++; }
  }
  await page.close();
}
await browser.close();
console.log(`\nSHRUNK-CONTAINERS: ${n}`);
