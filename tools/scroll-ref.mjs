import { chromium } from '@playwright/test';
import fs from 'fs';
const OUT = 'H:/Mongolia Bus Transport/_compare';
const B = 'https://designedge.bytedge.ai/daimler/#';
const ROUTES = process.argv.slice(2);
const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ viewport: { width: 1680, height: 950 } });
const p = await ctx.newPage();
await p.goto(B + '/command', { waitUntil: 'networkidle', timeout: 90000 });
await p.waitForTimeout(2500);
const role = p.locator('button').filter({ hasText: /Head of Services/ }).first();
if (await role.count()) { await role.click(); await p.waitForTimeout(2000); }

for (const r of ROUTES) {
  await p.goto(B + '/' + r, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(4500);
  // find the scrolling element inside the page
  const sel = await p.evaluate(() => {
    let best = null, bh = 0;
    for (const el of document.querySelectorAll('*')) {
      if (el.scrollHeight > el.clientHeight + 40 && el.clientHeight > 300) {
        if (el.scrollHeight > bh) { bh = el.scrollHeight; best = el; }
      }
    }
    if (!best) return null;
    best.setAttribute('data-scrollme','1');
    return { h: best.scrollHeight, c: best.clientHeight, cls: best.className };
  });
  console.log(r, JSON.stringify(sel));
  if (!sel) { await p.screenshot({ path: `${OUT}/ref/${r}-s0.png` }); continue; }
  const steps = Math.min(5, Math.ceil(sel.h / sel.c));
  for (let i = 0; i < steps; i++) {
    await p.evaluate(i => { document.querySelector('[data-scrollme]').scrollTop = i * (document.querySelector('[data-scrollme]').clientHeight - 60); }, i);
    await p.waitForTimeout(1600);
    await p.screenshot({ path: `${OUT}/ref/${r}-s${i}.png` });
  }
}
await b.close();
