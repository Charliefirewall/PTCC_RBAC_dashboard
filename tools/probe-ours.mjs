import { chromium } from '@playwright/test';
import fs from 'fs';
const OUT = 'H:/Mongolia Bus Transport/_compare';
const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ viewport: { width: 1680, height: 950 } });
const p = await ctx.newPage();
const log = [];

// --- light theme ---
await p.goto('http://127.0.0.1:4173/?role=operations_controller&theme=light#/command', { waitUntil:'networkidle' });
await p.waitForTimeout(6000);
await p.screenshot({ path: OUT + '/ours/light-command.png' });

// --- dialog collision test on alerts ---
await p.goto('about:blank');
await p.goto('http://127.0.0.1:4173/?role=operations_controller#/alerts', { waitUntil:'networkidle' });
await p.waitForTimeout(5000);
await p.screenshot({ path: OUT + '/ours/alerts.png' });
const val = p.locator('button').filter({ hasText: /Validate/i }).first();
if (await val.count()) { await val.click(); await p.waitForTimeout(1200); }
await p.screenshot({ path: OUT + '/ours/alerts-modal.png' });
// now press H (hotkey help) while modal open -> collision?
await p.keyboard.press('h'); await p.waitForTimeout(900);
await p.screenshot({ path: OUT + '/ours/alerts-modal-plus-help.png' });
const stack = await p.evaluate(() => [...document.querySelectorAll('body *')]
  .map(e=>({z:getComputedStyle(e).zIndex, pos:getComputedStyle(e).position, cls:e.className.toString().slice(0,50), role:e.getAttribute('role')}))
  .filter(x=>x.z!=='auto' && x.pos!=='static'));
log.push('STACK WITH MODAL+HELP: ' + JSON.stringify(stack, null, 1));
// escape behaviour
await p.keyboard.press('Escape'); await p.waitForTimeout(600);
const afterEsc = await p.evaluate(()=>({dialogs: document.querySelectorAll('[role=dialog]').length, help: document.body.innerText.includes('Presenter keys')}));
log.push('AFTER ESC: ' + JSON.stringify(afterEsc));

// --- responsive sweep ---
for (const [w,h] of [[1280,800],[1024,768],[1440,900]]) {
  await p.setViewportSize({width:w,height:h});
  for (const r of ['command','health','settings','alerts']) {
    await p.goto('about:blank');
    await p.goto(`http://127.0.0.1:4173/?role=operations_controller#/${r}`, {waitUntil:'networkidle'});
    await p.waitForTimeout(3500);
    const ov = await p.evaluate(() => {
      const bad = [];
      for (const e of document.querySelectorAll('*')) {
        const r = e.getBoundingClientRect();
        if (r.width>0 && (r.right > innerWidth + 2 || r.left < -2)) bad.push({cls:e.className.toString().slice(0,50), right:Math.round(r.right), left:Math.round(r.left)});
        if (e.scrollWidth > e.clientWidth + 4 && e.clientWidth>50 && getComputedStyle(e).overflowX==='hidden') bad.push({clipX:e.className.toString().slice(0,50), sw:e.scrollWidth, cw:e.clientWidth});
      }
      return bad.slice(0,8);
    });
    log.push(`RESPONSIVE ${w}x${h} ${r}: ${ov.length} issues ${JSON.stringify(ov)}`);
    if (w===1280 && r==='command') await p.screenshot({path: OUT+'/ours/command-1280.png'});
  }
}
fs.writeFileSync(OUT+'/data/probe-ours.txt', log.join('\n\n'));
console.log(log.join('\n\n').slice(0,6000));
await b.close();
