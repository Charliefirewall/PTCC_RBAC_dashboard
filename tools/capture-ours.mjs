import { chromium } from '@playwright/test';
import fs from 'fs';
const OUT = 'H:/Mongolia Bus Transport/_compare';
const B = 'http://127.0.0.1:4173/?role=operations_controller#';
const ROUTES = ['command','map','regularity','passenger','alerts','comms','health','operators','copilot','agentic','roi','analytics','multimodal','settings','dashboard'];
const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ viewport: { width: 1680, height: 950 } });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
p.on('console', m => { if (m.type()==='error') errs.push('CONSOLE ' + m.text().slice(0,200)); });
await p.goto(B + '/command', { waitUntil: 'networkidle', timeout: 60000 });
await p.waitForTimeout(7000);
const dump = {};
for (const r of ROUTES) {
  await p.goto('about:blank'); await p.goto(B + '/' + r, { waitUntil: 'networkidle' });
  await p.waitForTimeout(5000);
  await p.screenshot({ path: `${OUT}/ours/${r}.png` });
  const d = await p.evaluate(() => ({
    text: document.body.innerText,
    canvas: document.querySelectorAll('canvas').length,
    svg: document.querySelectorAll('svg').length,
    table: document.querySelectorAll('table').length,
    panels: document.querySelectorAll('.panel').length,
    btn: [...new Set([...document.querySelectorAll('button')].map(x=>x.textContent.trim().slice(0,60)).filter(Boolean))].length,
    // scrollable inner containers -> hidden content?
    scrollers: [...document.querySelectorAll('*')].filter(e=>e.scrollHeight>e.clientHeight+20&&e.clientHeight>100).map(e=>({c:e.className.toString().slice(0,60),h:e.scrollHeight,ch:e.clientHeight})).slice(0,12),
  }));
  dump[r] = d;
  fs.writeFileSync(`${OUT}/data/ours-text-${r}.txt`, d.text||'');
  console.log(`${r}: panels=${d.panels} canvas=${d.canvas} svg=${d.svg} table=${d.table} btns=${d.btn} scrollers=${d.scrollers.length}`);
}
fs.writeFileSync(OUT + '/data/ours-routes.json', JSON.stringify(dump, null, 2));
fs.writeFileSync(OUT + '/data/ours-errors.txt', errs.join('\n'));
console.log('ERRORS', errs.length);
await b.close();
