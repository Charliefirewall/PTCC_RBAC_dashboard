/**
 * The screenshots embedded in README.md / docs. Regenerate with:  node tools/docshots.mjs
 * Kept in the repo (docs/images) so the README renders without a build; `shots/` is the
 * throwaway audit output and stays ignored.
 */
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const BASE = 'http://127.0.0.1:4173';
const SHOTS = [
  { file: 'command-centre', url: '?role=operations_controller#/command', wait: 6000 },
  { file: 'live-fleet-map', url: '?role=supervisor#/map', wait: 8000 },
  { file: 'role-select', url: '', wait: 3000 },
  { file: 'alerts-governance', url: '?role=supervisor#/alerts', wait: 4000 },
  { file: 'cost-roi', url: '?role=supervisor#/roi', wait: 4000 },
  { file: 'agent-console', url: '?role=supervisor#/agentic', wait: 4000 },
];

await mkdir('docs/images', { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });

for (const s of SHOTS) {
  await page.goto('about:blank');
  await page.goto(`${BASE}/${s.url}`, { waitUntil: 'load' });
  await page.waitForTimeout(s.wait);
  await page.screenshot({ path: `docs/images/${s.file}.png` });
  console.log(`docs/images/${s.file}.png`);
}

await browser.close();
