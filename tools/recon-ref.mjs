import { chromium } from '@playwright/test';
import fs from 'fs';

const OUT = 'H:/Mongolia Bus Transport/_compare';
const URL0 = 'https://designedge.bytedge.ai/daimler/#/network';

const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ viewport: { width: 1680, height: 950 }, deviceScaleFactor: 1 });
const p = await ctx.newPage();
const netlog = [];
p.on('response', r => netlog.push({ s: r.status(), u: r.url() }));
const conlog = [];
p.on('console', m => conlog.push(m.type() + ': ' + m.text().slice(0, 300)));

await p.goto(URL0, { waitUntil: 'networkidle', timeout: 90000 }).catch(e => console.log('NAV ERR', e.message));
await p.waitForTimeout(6000);
await p.screenshot({ path: OUT + '/ref/00-landing.png' });

const info = await p.evaluate(() => {
  const root = document.documentElement;
  const cs = getComputedStyle(root);
  // collect all CSS custom properties from stylesheets
  const vars = {};
  for (const sheet of document.styleSheets) {
    let rules; try { rules = sheet.cssRules; } catch { continue; }
    for (const r of rules || []) {
      if (r.style) {
        for (const prop of r.style) {
          if (prop.startsWith('--')) vars[(r.selectorText||'?') + ' | ' + prop] = r.style.getPropertyValue(prop).trim();
        }
      }
    }
  }
  const links = [...document.querySelectorAll('a')].map(a => ({ t: a.textContent.trim().slice(0,60), h: a.getAttribute('href') }));
  const buttons = [...document.querySelectorAll('button,[role=button],[role=tab]')].map(x => x.textContent.trim().slice(0,60)).filter(Boolean);
  const body = getComputedStyle(document.body);
  return {
    title: document.title,
    htmlClass: root.className,
    bodyClass: document.body.className,
    dataAttrs: Object.fromEntries([...root.attributes].map(a=>[a.name,a.value])),
    bodyBg: body.backgroundColor, bodyColor: body.color, bodyFont: body.fontFamily, bodyFs: body.fontSize,
    vars,
    links, buttons,
    scripts: [...document.querySelectorAll('script[src]')].map(s=>s.src),
    styles: [...document.querySelectorAll('link[rel=stylesheet]')].map(s=>s.href),
    canvasCount: document.querySelectorAll('canvas').length,
    svgCount: document.querySelectorAll('svg').length,
    tableCount: document.querySelectorAll('table').length,
  };
});
fs.writeFileSync(OUT + '/data/ref-landing.json', JSON.stringify(info, null, 2));
const text = await p.evaluate(() => document.body.innerText);
fs.writeFileSync(OUT + '/data/ref-landing.txt', text);
fs.writeFileSync(OUT + '/data/ref-net.json', JSON.stringify(netlog.slice(0,300), null, 2));
fs.writeFileSync(OUT + '/data/ref-console.txt', conlog.join('\n'));
console.log('TITLE', info.title);
console.log('LINKS', JSON.stringify(info.links.slice(0,60)));
console.log('BUTTONS', JSON.stringify([...new Set(info.buttons)].slice(0,80)));
console.log('SCRIPTS', JSON.stringify(info.scripts));
console.log('BODY', info.bodyBg, info.bodyColor, info.bodyFont, info.bodyFs);
console.log('VARCOUNT', Object.keys(info.vars).length);
console.log('CANVAS', info.canvasCount, 'SVG', info.svgCount, 'TABLE', info.tableCount);
await b.close();
