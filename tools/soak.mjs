/**
 * Soak: a demo runs for half an hour, not for the 3 seconds a check takes. Leaves the
 * app open on the two screens a presenter actually dwells on and samples heap, tick
 * rate, alert count and errors, so drift or a leak shows up before the client sees it.
 */
import { chromium } from '@playwright/test';

const MINUTES = Number(process.argv[2] || 12);
const BASE = process.env.PTCC_BASE ?? 'http://127.0.0.1:4173';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 950 } });
const errs = [];
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message.slice(0, 120)));
page.on('console', (m) => {
  if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 120));
});

await page.goto(`${BASE}/?role=supervisor#/command`, { waitUntil: 'load' });
await page.waitForTimeout(6000);

const sample = () =>
  page.evaluate(() => ({
    heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : -1,
    tick: window.__ptcc.useSim.getState().tick,
    alerts: window.__ptcc.useAlerts.getState().alerts.length,
    simTime: window.__ptcc.useSim.getState().snap?.sim_time_s ?? -1,
    nodes: document.querySelectorAll('*').length,
  }));

const first = await sample();
console.log(`t=0m  ${JSON.stringify(first)}`);
const rows = [first];

for (let m = 1; m <= MINUTES; m++) {
  // Alternate between the two screens the presenter lives on, so neither is exercised
  // in isolation and the map gets torn down and rebuilt the way a real session does.
  await page.evaluate((r) => { location.hash = r; }, m % 2 ? '#/map' : '#/command');
  await page.waitForTimeout(60_000);
  const s = await sample();
  rows.push(s);
  console.log(`t=${m}m  ${JSON.stringify(s)}  errors=${errs.length}`);
}

const last = rows[rows.length - 1];
const heapGrowth = last.heapMB - first.heapMB;
const nodeGrowth = last.nodes - first.nodes;
const ticksPerMin = (last.tick - first.tick) / MINUTES;

console.log('\n--- soak summary ---');
console.log(`minutes         ${MINUTES}`);
console.log(`heap            ${first.heapMB} -> ${last.heapMB} MB (${heapGrowth >= 0 ? '+' : ''}${heapGrowth})`);
console.log(`DOM nodes       ${first.nodes} -> ${last.nodes} (${nodeGrowth >= 0 ? '+' : ''}${nodeGrowth})`);
console.log(`ticks/min       ${Math.round(ticksPerMin)}`);
console.log(`sim advanced    ${Math.round((last.simTime - first.simTime) / 60)} sim-minutes`);
console.log(`errors          ${errs.length}`);
for (const e of errs.slice(0, 8)) console.log('   ' + e);

const leaking = heapGrowth > 150 || nodeGrowth > 4000;
const stalled = last.tick === first.tick || last.simTime <= first.simTime;
console.log(`\nSOAK: ${errs.length === 0 && !leaking && !stalled ? 'PASS' : 'FAIL'}`);
await browser.close();
process.exit(errs.length === 0 && !leaking && !stalled ? 0 : 1);
