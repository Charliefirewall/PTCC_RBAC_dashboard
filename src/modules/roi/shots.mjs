/**
 * Workstream Q screenshot capture. Lives in the module folder because that is the only
 * place this workstream owns; run it against a dev server on 5187.
 *   node src/modules/roi/shots.mjs
 */
import { chromium } from '@playwright/test';

const OUT = 'H:/Mongolia Bus Transport/_compare/ours';
const B = 'http://127.0.0.1:5187/?role=operations_controller&evidence=1#/roi';
const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ viewport: { width: 1680, height: 950 } });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push('PAGEERR ' + e.message));
p.on('console', (m) => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text().slice(0, 200)); });

const shot = async (name) => { await p.screenshot({ path: `${OUT}/q-${name}.png` }); console.log('shot', name); };
const grab = async () =>
  p.evaluate(() => [...document.querySelectorAll('.panel')]
    .filter((e) => e.tagName === 'BUTTON')
    .map((e) => e.innerText.replace(/\n/g, ' | ')).join('\n'));

await p.goto(B, { waitUntil: 'networkidle', timeout: 60000 });
await p.waitForTimeout(6000);
await shot('01-authority');
const before = await grab();
console.log('--- BEFORE ---\n' + before);

// Move ONE input (maintenance per bus) and prove every output moves with it.
const box = p.locator('input[type=number]').nth(3); // maintenance per bus per year
await box.fill('20000000');
await box.dispatchEvent('change');
await p.waitForTimeout(800);
await shot('02-input-moved');
console.log('--- AFTER maintenance=20,000,000 ---\n' + await grab());

// Scenario presets.
await p.selectOption('select', 'optimistic').catch(() => {});
await p.waitForTimeout(600);
await shot('03-optimistic');

const tabs = ['Per operator', 'Per bus'];
for (const [i, name] of tabs.entries()) {
  await p.getByRole('button', { name, exact: true }).first().click();
  await p.waitForTimeout(900);
  await shot(`0${4 + i}-${name.toLowerCase().replace(/ /g, '-')}`);
}

// Dark + wall.
await p.goto('http://127.0.0.1:5187/?role=operations_controller&evidence=1&theme=light#/roi', { waitUntil: 'networkidle' });
await p.waitForTimeout(5000);
await shot('06-light');
// NOTE: `mode=wall` routes the shell to the video-wall dashboard, so /roi is not
// reachable there at all. KpiTile still gets `wall` so the tiles stack if it ever is.
await p.getByRole('button', { name: /Fleet sizing/ }).first().click();
await p.waitForTimeout(900);
await shot('07-fleet-sizing');

console.log('ERRORS', errs.length, errs.slice(0, 8).join('\n'));
await b.close();
