import { test } from '@playwright/test';

test('diagnose', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('/#/command');
  await page.waitForTimeout(5000);

  // --- A. does setting a threshold directly change the alert count?
  const a = await page.evaluate(async () => {
    const w = window as any;
    const S = w.__ptcc.useSettings, A = w.__ptcc.useAlerts;
    const before = { th: S.getState().th.passenger_load_pct, alerts: A.getState().alerts.length };
    S.getState().set('passenger_load_pct', 40);
    await new Promise(r => setTimeout(r, 50));
    const immediately = A.getState().alerts.length;
    return { before, thAfter: S.getState().th.passenger_load_pct, immediately };
  });
  await page.waitForTimeout(1500);
  const a2 = await page.evaluate(() => (window as any).__ptcc.useAlerts.getState().alerts.length);
  console.log('A_THRESHOLD: ' + JSON.stringify({ ...a, afterTick: a2 }));

  await page.evaluate(() => (window as any).__ptcc.useSettings.getState().reset());
  await page.waitForTimeout(1200);

  // --- B. does the Settings UI actually commit a change?
  await page.goto('/#/settings');
  await page.waitForTimeout(1500);
  const inputs = await page.evaluate(() => {
    const out: any[] = [];
    document.querySelectorAll('input').forEach((el, i) => {
      const lbl = el.closest('label,div,li')?.textContent?.replace(/\s+/g,' ').slice(0, 55) ?? '';
      out.push({ i, type: el.type, value: (el as HTMLInputElement).value, label: lbl });
    });
    return out.slice(0, 14);
  });
  console.log('B_INPUTS: ' + JSON.stringify(inputs, null, 0));

  // --- C. D9 feed_stale
  await page.goto('/#/command');
  await page.waitForTimeout(1200);
  await page.keyboard.press('9');
  await page.waitForTimeout(2000);
  const c = await page.evaluate(() => {
    const w = window as any;
    return { feed_stale: w.__ptcc.useSim.getState().snap?.feed_stale, worldStale: w.__ptcc.world.feed_stale };
  });
  const topbar = await page.locator('header').first().innerText();
  console.log('C_D9: ' + JSON.stringify(c) + ' | topbar=' + topbar.replace(/\s+/g,' ').slice(0,120));

  // --- D. D8 peak demand: watch loads over time
  await page.keyboard.press('0'); await page.waitForTimeout(800);
  const load0 = await page.evaluate(() => {
    const m = (window as any).__ptcc.useSim.getState().metrics;
    return ['R3','R5','R7','R12','R18','R22'].map(r => Math.round(m.per_route.get(r)?.load_pct ?? -1));
  });
  await page.keyboard.press('8');
  for (const wait of [3000, 6000, 10000]) {
    await page.waitForTimeout(wait);
    const l = await page.evaluate(() => {
      const m = (window as any).__ptcc.useSim.getState().metrics;
      return ['R3','R5','R7','R12','R18','R22'].map(r => Math.round(m.per_route.get(r)?.load_pct ?? -1));
    });
    console.log(`D_D8 +${wait}ms: ${JSON.stringify(l)} (start ${JSON.stringify(load0)})`);
  }

  // --- E. does reset actually clear criticals?
  await page.keyboard.press('2'); await page.waitForTimeout(2500);
  const beforeReset = await page.evaluate(() => (window as any).__ptcc.useSim.getState().metrics.funnel);
  await page.keyboard.press('0');
  await page.waitForTimeout(4000);
  const afterReset = await page.evaluate(() => (window as any).__ptcc.useSim.getState().metrics.funnel);
  console.log('E_RESET: before=' + JSON.stringify(beforeReset) + ' after=' + JSON.stringify(afterReset));
});
