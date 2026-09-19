import { expect, test, type Page } from '@playwright/test';

/**
 * End-to-end audit. Not a pass/fail gate - it walks the whole demo the way a
 * presenter would and reports anything that looks wrong, so flaws surface before
 * the room does.
 */

const FINDINGS: string[] = [];
const note = (s: string) => {
  FINDINGS.push(s);
  console.log('FINDING: ' + s);
};

async function errs(page: Page) {
  const bag: string[] = [];
  page.on('pageerror', (e) => bag.push(`pageerror: ${e}`));
  page.on('console', (m) => {
    if (m.type() === 'error') bag.push(`console.error: ${m.text()}`);
    if (m.type() === 'warning' && /maplibre|react|key/i.test(m.text())) bag.push(`console.warn: ${m.text()}`);
  });
  return bag;
}

/** Read the live store out of the page. */
async function state(page: Page) {
  return page.evaluate(() => {
    const w = window as any;
    const sim = w.__ptcc?.useSim?.getState?.();
    const al = w.__ptcc?.useAlerts?.getState?.();
    const ev = w.__ptcc?.useEvents?.getState?.();
    if (!sim) return null;
    const m = sim.metrics;
    return {
      tick: sim.tick,
      simTime: sim.snap?.sim_time_s,
      inService: m?.in_service,
      routesOperating: m?.routes_operating,
      funnel: m?.funnel,
      offline: m?.offline,
      ridership: Math.round(m?.ridership_today ?? 0),
      alerts: al?.alerts?.length ?? 0,
      critical: al?.alerts?.filter((a: any) => a.severity === 'critical').length ?? 0,
      alertIds: (al?.alerts ?? []).slice(0, 6).map((a: any) => a.id),
      events: ev?.events?.length ?? 0,
      feedStale: !!sim.snap?.feed_stale,
      topLoad: Math.round(Math.max(0, ...[...(m?.per_route?.values?.() ?? [])].map((r: any) => r.load_pct))),
    };
  });
}

test('full audit', async ({ page }) => {
  const bag = await errs(page);
  test.setTimeout(300_000);

  await page.goto('/?role=operations_controller#/command');
  await page.waitForTimeout(6000);

  // ---------------------------------------------------------------- 1. store reachable?
  const s0 = await state(page);
  if (!s0) {
    note('window.__ptcc is not exposed in the production build - the plan calls for it (T12) so Playwright and the consistency overlay can read state. Falling back to DOM-only checks.');
  } else {
    console.log('STATE0: ' + JSON.stringify(s0));
    if (s0.inService !== 1086) note(`in_service is ${s0.inService}, expected 1086 (S7 / L195)`);
    if (s0.routesOperating !== 97) note(`routes_operating is ${s0.routesOperating}, expected 97 (S7)`);
    const f = s0.funnel;
    if (f && f.normal + f.attention + f.critical !== f.total) {
      note(`funnel does not sum: ${f.normal}+${f.attention}+${f.critical} != ${f.total}`);
    }
    if (s0.offline && (s0.offline.afc !== 7 || s0.offline.cctv !== 3 || s0.offline.tbox !== 2)) {
      note(`opening device counts are ${JSON.stringify(s0.offline)}, the deck opens at AFC 7 / CCTV 3 / T-Box 2 (S7,S9)`);
    }
  }

  // ---------------------------------------------------------------- 2. cross-panel consistency
  const kpiText = await page.locator('main').innerText();
  const kpiInService = kpiText.match(/BUSES IN SERVICE[\s\S]{0,80}?([\d,]{3,6})/i)?.[1]?.replace(/,/g, '');
  if (s0 && kpiInService && Number(kpiInService) !== s0.inService) {
    note(`KPI tile shows ${kpiInService} buses in service but the store says ${s0.inService}`);
  }
  const kpiAlerts = kpiText.match(/ACTIVE ALERTS[\s\S]{0,80}?(\d{1,4})/i)?.[1];
  if (s0 && kpiAlerts && Number(kpiAlerts) !== s0.alerts) {
    note(`KPI "active alerts" tile shows ${kpiAlerts} but the store holds ${s0.alerts}`);
  }

  // ---------------------------------------------------------------- 3. every scenario
  for (const key of ['1', '2', '3', '4', '5', '6', '7', '8', '9']) {
    await page.keyboard.press('0');
    await page.waitForTimeout(700);
    const before = await state(page);
    await page.keyboard.press(key);
    await page.waitForTimeout(2600);
    const after = await state(page);
    const bar = await page.locator('footer').last().innerText().catch(() => '');
    if (!/D\d/.test(bar)) note(`D${key}: scenario bar did not appear`);
    if (before && after) {
      const changed =
        after.alerts !== before.alerts ||
        after.critical !== before.critical ||
        JSON.stringify(after.funnel) !== JSON.stringify(before.funnel) ||
        JSON.stringify(after.offline) !== JSON.stringify(before.offline) ||
        after.feedStale !== before.feedStale ||
        Math.abs(after.topLoad - before.topLoad) > 3;
      if (!changed) note(`D${key} produced no observable change in alerts, funnel or device counts after 2.6 s`);
      console.log(`D${key}: alerts ${before.alerts}->${after.alerts} crit ${before.critical}->${after.critical} topLoad ${before.topLoad}->${after.topLoad} stale=${after.feedStale} funnel ${JSON.stringify(after.funnel)}`);
    }
    // multi-step scenarios: walk them
    if (key === '4' || key === '7' || key === '9') {
      for (let i = 0; i < 12; i++) {
        await page.keyboard.press('n');
        await page.waitForTimeout(500);
      }
      const barEnd = await page.locator('footer').last().innerText().catch(() => '');
      console.log(`D${key} end: ${barEnd.replace(/\s+/g, ' ').slice(0, 160)}`);
    }
  }
  await page.keyboard.press('0');
  await page.waitForTimeout(800);

  // ---------------------------------------------------------------- 4. governance path
  await page.keyboard.press('4');            // accident
  await page.waitForTimeout(1200);
  await page.keyboard.press('n');            // confirm accident
  await page.waitForTimeout(2500);
  await page.goto('/?role=operations_controller#/alerts');
  await page.waitForTimeout(1800);

  const validateBtn = page.getByRole('button', { name: /validate/i }).first();
  if (!(await validateBtn.count())) {
    note('Alerts: no "Validate → Event" button found after D4 - the validation path is unreachable');
  } else {
    await validateBtn.click();
    await page.waitForTimeout(900);
    const confirm = page.getByRole('button', { name: /^(validate|create|confirm)/i }).last();
    if (await confirm.count()) {
      await confirm.click();
      await page.waitForTimeout(1200);
    } else {
      note('Validate dialog opened but no confirm button was found');
    }
    const st = await state(page);
    if (st && st.events === 0) note('validating an alert did not create an event');

    // go to the events tab and try to advance to closure
    const evTab = page.locator('[role=tab], button').filter({ hasText: /events \(5 levels\)/i }).first();
    if (await evTab.count()) {
      await evTab.click();
      await page.waitForTimeout(900);
    }
    const evRow = page.locator('text=/EV-2026/').first();
    if (await evRow.count()) {
      await evRow.click();
      await page.waitForTimeout(800);
    }
    let blocked = false;
    for (let i = 0; i < 8; i++) {
      const adv = page.getByRole('button', { name: /advance/i }).first();
      if (!(await adv.count())) break;
      if (await adv.isDisabled().catch(() => false)) break;
      await adv.click();
      await page.waitForTimeout(700);
      const body = await page.locator('main').innerText();
      if (/blocked|compulsory/i.test(body) && /outstanding|blocked/i.test(body)) {
        blocked = true;
        break;
      }
    }
    if (!blocked) {
      note('advancing a traffic-accident event never hit the compulsory-action gate - L1346 is the most important governance moment in the demo');
    }
  }

  // ---------------------------------------------------------------- 5. every module has content
  const routes = ['command','map','regularity','passenger','alerts','comms','health','operators','copilot','roi','analytics','multimodal','settings'];
  for (const r of routes) {
    await page.goto(`/?role=operations_controller#/${r}`);
    await page.waitForTimeout(1500);
    const txt = (await page.locator('main').innerText()).replace(/\s+/g, ' ').trim();
    if (txt.length < 120) note(`module "${r}" renders almost nothing (${txt.length} chars): "${txt.slice(0, 90)}"`);
    if (/NaN|undefined|Infinity|\[object Object\]/.test(txt)) {
      const m = txt.match(/.{0,50}(NaN|undefined|Infinity|\[object Object\]).{0,50}/);
      note(`module "${r}" renders a bad value: …${m?.[0]}…`);
    }
    // horizontal overflow of the main content area
    const over = await page.evaluate(() => {
      const el = document.querySelector('main') as HTMLElement | null;
      if (!el) return 0;
      return el.scrollWidth - el.clientWidth;
    });
    if (over > 8) note(`module "${r}" overflows horizontally by ${over}px`);
  }

  // ---------------------------------------------------------------- 6. vehicle detail deep link
  await page.goto('/?role=operations_controller#/vehicle/3-015');
  await page.waitForTimeout(1500);
  const vt = (await page.locator('main').innerText()).replace(/\s+/g, ' ');
  if (/not found|unknown/i.test(vt)) note('vehicle detail for 3-015 (the vehicle Slide 5 names) reports unknown');
  for (const tab of [/cctv/i, /incident/i]) {
    const b = page.getByRole('tab', { name: tab }).first();
    if (await b.count()) {
      await b.click();
      await page.waitForTimeout(600);
    } else note(`vehicle detail: tab ${tab} not found`);
  }

  // ---------------------------------------------------------------- 7. settings threshold is live
  await page.goto('/?role=operations_controller#/settings');
  await page.waitForTimeout(1500);
  const beforeTh = await state(page);
  const slider = page.locator('input[type=range]').first();
  if (!(await slider.count())) {
    note('Settings has no range input - "thresholds are configurable" (S7) is the one explicit configurability statement in the deck');
  } else {
    // drive the passenger-load threshold down hard and expect more alerts
    const n = await page.locator('input[type=number]').count();
    if (n > 0) {
      // Drag the passenger-load threshold below the busiest route so new alerts must
      // appear. This is a scripted demo beat (plan section 25.3) and it must work.
      await page.evaluate(() => (window as any).__ptcc.useSettings.getState().set('passenger_load_pct', 55));
      await page.waitForTimeout(1600);
    }
    const afterTh = await state(page);
    if (beforeTh && afterTh && afterTh.alerts === beforeTh.alerts) {
      note('changing a threshold in Settings did not change the alert count - the live re-evaluation beat is broken');
    } else if (beforeTh && afterTh) {
      console.log(`threshold change: alerts ${beforeTh.alerts} -> ${afterTh.alerts}`);
    }
  }

  // ---------------------------------------------------------------- 7b. reset returns to baseline
  await page.evaluate(() => (window as any).__ptcc.useSettings.getState().reset());
  await page.goto('/?role=operations_controller#/command');
  await page.waitForTimeout(1000);
  await page.keyboard.press('2');
  await page.waitForTimeout(2500);
  const hot = await state(page);
  await page.keyboard.press('0');
  await page.waitForTimeout(3000);
  const cold = await state(page);
  if (hot && cold) {
    console.log(`reset: crit ${hot.funnel?.critical}->${cold.funnel?.critical}, topLoad ${hot.topLoad}->${cold.topLoad}`);
    if ((cold.funnel?.critical ?? 0) > 6) {
      note(`after pressing 0 the board still shows ${cold.funnel?.critical} critical vehicles - reset should give the presenter a clean slate`);
    }
  }

  // ---------------------------------------------------------------- 8. copilot answers
  await page.goto('/?role=operations_controller#/copilot');
  await page.waitForTimeout(1200);
  const chips = page.locator('button').filter({ hasText: /\?$/ });
  const nChips = await chips.count();
  if (nChips < 4) note(`copilot shows ${nChips} suggested questions, expected at least 4 (the S5 key questions)`);
  for (let i = 0; i < Math.min(nChips, 6); i++) {
    await chips.nth(i).click();
    await page.waitForTimeout(700);
  }
  const cop = (await page.locator('main').innerText()).replace(/\s+/g, ' ');
  if (/NaN|undefined/.test(cop)) note('copilot answer contains NaN/undefined');
  if (!/tier/i.test(cop)) note('copilot answers do not show a tier badge');

  // ---------------------------------------------------------------- 9. language + wall
  await page.goto('/?role=operations_controller#/command');
  await page.waitForTimeout(1200);
  await page.keyboard.press('l');
  await page.waitForTimeout(900);
  const mn = await page.locator('main').innerText();
  const cyr = (mn.match(/[Ѐ-ӿ]/g) ?? []).length;
  if (cyr < 20) note(`Mongolian mode shows only ${cyr} Cyrillic characters on the Command Centre - the deck is bilingual throughout`);
  const latinLeft = /Buses in service|Routes operating|Active alerts/i.test(mn);
  if (latinLeft) note('Mongolian mode still shows English KPI labels');
  await page.keyboard.press('l');

  // ---------------------------------------------------------------- 10. long-run stability
  await page.goto('/?role=operations_controller#/command');
  const heapBefore = await page.evaluate(() => (performance as any).memory?.usedJSHeapSize ?? 0);
  const before = await state(page);
  await page.waitForTimeout(25_000);
  const after = await state(page);
  const heapAfter = await page.evaluate(() => (performance as any).memory?.usedJSHeapSize ?? 0);
  if (before && after) {
    if (after.tick <= before.tick) note('simulation tick did not advance over 25 s - the demo is frozen');
    if (after.inService !== before.inService) note(`in_service drifted from ${before.inService} to ${after.inService} with no scenario running`);
    if (after.funnel && after.funnel.attention + after.funnel.critical > after.inService * 0.08) {
      note(`exception set grew to ${after.funnel.attention + after.funnel.critical} of ${after.inService} - the "focus on 15, not 1,100" claim degrades over time`);
    }
    console.log(`25 s run: tick ${before.tick}->${after.tick}, alerts ${before.alerts}->${after.alerts}, funnel ${JSON.stringify(after.funnel)}`);
  }
  if (heapBefore && heapAfter) {
    const growthMb = (heapAfter - heapBefore) / 1048576;
    console.log(`heap growth over 25 s: ${growthMb.toFixed(1)} MB`);
    if (growthMb > 40) note(`heap grew ${growthMb.toFixed(1)} MB in 25 s - likely a leak over a 90-minute session`);
  }

  // ---------------------------------------------------------------- report
  console.log('\n=== CONSOLE/PAGE ERRORS (' + bag.length + ') ===');
  for (const e of [...new Set(bag)].slice(0, 25)) console.log('  ' + e);
  console.log('\n=== FINDINGS (' + FINDINGS.length + ') ===');
  FINDINGS.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
  expect(true).toBe(true);
});
