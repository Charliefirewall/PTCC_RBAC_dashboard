import { chromium } from '@playwright/test';
import fs from 'fs';
const OUT = 'H:/Mongolia Bus Transport/_compare';
const B = 'https://designedge.bytedge.ai/daimler/#';
const ROUTES = ['command','fleet','calendar','network','parts','outreach','components','customers','models','roi','copilot','agents','families','platform','admin'];

const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ viewport: { width: 1680, height: 950 } });
const p = await ctx.newPage();
await p.goto(B + '/command', { waitUntil: 'networkidle', timeout: 90000 });
await p.waitForTimeout(3000);
// dismiss role chooser by picking the first role
const role = p.locator('button').filter({ hasText: /Head of Services/ }).first();
if (await role.count()) { await role.click(); await p.waitForTimeout(2500); }
await p.screenshot({ path: OUT + '/ref/after-role.png' });

const dump = {};
for (const r of ROUTES) {
  await p.goto(B + '/' + r, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(4200);
  await p.screenshot({ path: `${OUT}/ref/${r}.png` });
  await p.screenshot({ path: `${OUT}/ref/${r}-full.png`, fullPage: true });
  const d = await p.evaluate(() => ({
    text: document.body.innerText,
    h: document.body.scrollHeight,
    svg: document.querySelectorAll('svg').length,
    canvas: document.querySelectorAll('canvas').length,
    table: document.querySelectorAll('table').length,
    cards: document.querySelectorAll('.card,[class*=card]').length,
    buttons: [...new Set([...document.querySelectorAll('button')].map(x=>x.textContent.trim().slice(0,70)).filter(Boolean))],
    classes: [...new Set([...document.querySelectorAll('main *')].flatMap(x=>[...x.classList]))].slice(0,400),
  }));
  dump[r] = d;
  console.log(`${r}: h=${d.h} svg=${d.svg} canvas=${d.canvas} table=${d.table} btns=${d.buttons.length}`);
}
fs.writeFileSync(OUT + '/data/ref-routes.json', JSON.stringify(dump, null, 2));
for (const r of ROUTES) fs.writeFileSync(`${OUT}/data/ref-text-${r}.txt`, dump[r].text || '');
await b.close();
