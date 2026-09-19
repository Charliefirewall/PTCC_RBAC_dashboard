// Sweeps every role x every nav path that role can see, and reports anything
// that would make the demo look unfinished: crashes, console errors, empty
// panels, empty-state copy still showing, and clipped text.
import { chromium } from '@playwright/test';
import { ROLE_SPECS } from '../src/modules/roles/roles.ts';

const BASE = 'http://127.0.0.1:4173';
const roles = Object.fromEntries(Object.entries(ROLE_SPECS).map(([k, v]) => [k, v.nav]));

const findings = [];
const add = (role, path, kind, msg) => findings.push({ role, path, kind, msg });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

for (const [role, nav] of Object.entries(roles)) {
  for (const path of nav) {
    errors.length = 0;
    await page.goto(`${BASE}/?role=${role}#/${path}`, { waitUntil: 'load' });
    await page.waitForTimeout(1600);
    const r = await page.evaluate(() => {
      const out = { crash: null, panels: 0, emptyPanels: [], emptyState: [], clipped: [], dashes: 0, cells: 0 };
      const boom = document.body.innerText.match(/Something went wrong|Unhandled|Error boundary/i);
      if (boom) out.crash = boom[0];
      const panels = [...document.querySelectorAll('.panel, section')];
      out.panels = panels.length;
      for (const p of panels) {
        const title = (p.querySelector('.panel-title, h2, h3, header')?.textContent || '').trim().slice(0, 40);
        const body = p.innerText.replace(/\s+/g, ' ').trim();
        if (body.length < 3) out.emptyPanels.push(title || '(untitled)');
        if (/as soon as|no data|nothing to show|none yet|awaiting/i.test(body)) {
          out.emptyState.push((title || '(untitled)') + ' :: ' + (body.match(/[^.]*?(as soon as|no data|nothing to show|none yet|awaiting)[^.]*\./i) || [body.slice(0, 90)])[0].trim().slice(0, 110));
        }
      }
      // numeric cells still showing a placeholder dash
      for (const el of document.querySelectorAll('.num, [data-kpi-value], td, dd')) {
        out.cells++;
        if (/^[—–-]$/.test(el.textContent.trim())) out.dashes++;
      }
      const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
      for (let el = walk.nextNode(); el; el = walk.nextNode()) {
        if (el.children.length) continue;
        const t = el.textContent?.trim();
        if (!t || t.length < 3) continue;
        const cs = getComputedStyle(el);
        if (cs.overflow === 'visible' && cs.textOverflow !== 'ellipsis') continue;
        // sr-only headings are clipped to 1px by design - not a finding.
        if (el.clientWidth <= 2 || el.closest('.sr-only')) continue;
        if (el.scrollWidth > el.clientWidth + 1) {
          out.clipped.push(`"${t.slice(0, 44)}" ${el.clientWidth}px<${el.scrollWidth}px`);
        }
      }
      return out;
    });
    if (r.crash) add(role, path, 'CRASH', r.crash);
    for (const e of errors.slice(0, 3)) add(role, path, 'CONSOLE', e.slice(0, 160));
    for (const p of r.emptyPanels) add(role, path, 'EMPTY-PANEL', p);
    for (const p of r.emptyState) add(role, path, 'EMPTY-STATE', p);
    for (const c of r.clipped) add(role, path, 'CLIPPED', c);
    if (r.cells > 6 && r.dashes / r.cells > 0.5) add(role, path, 'ALL-DASHES', `${r.dashes}/${r.cells} value cells are "—"`);
    if (r.panels === 0) add(role, path, 'NO-PANELS', 'page rendered no panel/section');
  }
}
await browser.close();

const byKind = {};
for (const f of findings) (byKind[f.kind] ??= []).push(f);
for (const k of Object.keys(byKind).sort()) {
  console.log(`\n### ${k} (${byKind[k].length})`);
  for (const f of byKind[k]) console.log(`  ${f.role}/${f.path}: ${f.msg}`);
}
console.log(`\nTOTAL ${findings.length} findings over ${Object.values(roles).flat().length} role-screens`);
