import { chromium } from '@playwright/test';
const [w, h] = (process.argv[2] || '1366x768').split('x').map(Number);
const targets = (process.argv[3] || 'roi,health').split(',');
const role = process.argv[4] || 'supervisor';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: w, height: h } });
for (const t of targets) {
  await page.goto(`http://127.0.0.1:4173/?role=${role}#/${t}`, { waitUntil: 'load' });
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `shots/role-${role}-${t}-${w}.png` });
}
await browser.close();
console.log('ok');
