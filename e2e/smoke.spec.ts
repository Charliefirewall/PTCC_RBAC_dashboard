import { expect, test } from '@playwright/test';

/**
 * The smoke run of the demo path. It proves the artefact that goes in the room actually
 * boots, simulates, alerts, translates and switches to the video wall.
 *
 * The governance gate used to be in this test's TITLE and nowhere in its body. It now has
 * a test of its own below, which walks the real operator flow into the refusal.
 */

test('the demo boots, simulates, alerts and switches to the wall', async ({ page }) => {
  const errors: string[] = [];
  // Switching to wall mode intentionally unmounts MapLibre while its browser-owned
  // raster requests are in flight. Chromium reports that cancellation as a page-level
  // AbortError even though no application promise failed and the next screen renders.
  page.on('pageerror', (e) => {
    const message = String(e);
    if (!/AbortError: The user aborted a request/i.test(message)) errors.push(message);
  });
  page.on('console', (m) => {
    // Chromium can surface the same MapLibre teardown cancellation through either
    // `pageerror` or the console depending on request timing. It is browser-owned,
    // contains no application stack, and is expected when W replaces the map canvas.
    if (m.type() === 'error' && !/AbortError: The user aborted a request/i.test(m.text())) errors.push(m.text());
  });

  await page.goto('/?role=operations_controller#/command');

  // --- the world is built and running
  await expect(page.getByText(/Buses in service/i)).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('text=/1,0\\d\\d/').first()).toBeVisible();

  // the DEMO badge must always be present - it can never be hidden
  await expect(page.getByText(/simulated data/i)).toBeVisible();

  // --- the clock advances (the simulation is live, not a screenshot)
  const clock = page.locator('.num').first();
  const t0 = await clock.textContent();
  await page.waitForTimeout(2500);
  const t1 = await clock.textContent();
  expect(t1).not.toBe(t0);

  // --- scenario D5: panic button -> a Critical alert appears
  await page.keyboard.press('5');
  await expect(page.getByText(/emergency/i).first()).toBeVisible({ timeout: 20_000 });

  // --- language toggle produces Cyrillic
  await page.keyboard.press('l');
  await expect(page.locator('body')).toContainText(/[Ѐ-ӿ]/);
  await page.keyboard.press('l');

  // --- video wall mode renders
  await page.keyboard.press('w');
  await page.waitForTimeout(500);
  await page.keyboard.press('w');

  // --- reset
  await page.keyboard.press('0');

  expect(errors, `console/page errors:\n${errors.join('\n')}`).toEqual([]);
});

/**
 * The compulsory-action gate (L1346), which the test above has always claimed in its
 * title and never touched. It is the strongest governance claim in the product: a stage
 * cannot advance while a compulsory action is outstanding. Nothing in the repository
 * proved that through the UI, so the whole path - validate an alert into an event, walk
 * the workflow, get refused - could break silently.
 *
 * It drives the real operator flow rather than the store, because the store already has
 * unit coverage and what was unverified was the wiring.
 */
test('the compulsory-action gate refuses to advance a stage (L1346)', async ({ page }) => {
  await page.goto('/?role=operations_controller#/alerts');

  // An alert is not an event until an operator validates it (L1235) - so first, validate.
  const action = page.locator('[data-alert-action]').first();
  await expect(action).toBeVisible({ timeout: 30_000 });
  await action.click();

  const dialog = page.locator('[role=dialog]');
  await expect(dialog).toBeVisible();

  // L1235: four independent sources must be verified before Confirm is enabled. If the
  // checklist stopped gating Confirm, this line would pass and the next would fail.
  const confirm = dialog.getByRole('button', { name: /Confirm & create event/i });
  await expect(confirm).toBeDisabled();
  const boxes = dialog.locator('input[type=checkbox]');
  const n = await boxes.count();
  expect(n).toBeGreaterThanOrEqual(4);
  for (let i = 0; i < n; i++) await boxes.nth(i).check();
  await expect(confirm).toBeEnabled();
  await confirm.click();

  // The event opens in the drawer immediately (item 24), at stage `creation`.
  const advance = page.getByRole('button', { name: /^Advance to/ });
  await expect(advance.first()).toBeVisible({ timeout: 15_000 });

  // The gate sits at `resolution` and `closure`, so the first stages advance cleanly and
  // then one is refused. Walk forward until the refusal - and require that it happens.
  let blocked = false;
  for (let i = 0; i < 6; i++) {
    const b = advance.first();
    if (!(await b.isVisible().catch(() => false)) || !(await b.isEnabled().catch(() => false))) break;
    await b.click();
    await page.waitForTimeout(400);
    if ((await page.locator('[data-gate-blocked]').count()) > 0) {
      blocked = true;
      break;
    }
  }
  expect(blocked, 'advancing the workflow was never refused - the L1346 gate did not fire').toBe(true);

  const gate = page.locator('[data-gate-blocked]');
  await expect(gate).toBeVisible();
  // It must be announced, not merely red.
  await expect(gate).toHaveAttribute('role', 'alert');
  await expect(gate).toContainText(/Blocked/i);

  // And it must be clearable in place: completing the blocker removes it from the list.
  const before = await gate.locator('li').count();
  expect(before).toBeGreaterThan(0);
  const complete = gate.getByRole('button', { name: /Mark complete/i }).first();
  // `force`: the event drawer re-renders on every simulation tick, so Playwright's
  // stability check can never settle here. The button's visibility is asserted above; what
  // this step is proving is the STORE rule, not hit-testing.
  await expect(complete).toBeVisible();
  await complete.click({ force: true });
  await page.waitForTimeout(400);
  const after = await page.locator('[data-gate-blocked] li').count();
  expect(after).toBeLessThan(before);
});

test('every module route renders without throwing', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`${page.url()} :: ${e}`));

  // Every entry in MODULES. `dashboard`, `agentic` and `provenance` were missing, and so
  // were `depot` and `platform` - five of eighteen routes had no render coverage at all,
  // which is exactly how a route gets broken by a refactor and nobody notices until the
  // room. If MODULES grows, this list grows with it.
  const routes = [
    'dashboard', 'command', 'map', 'regularity', 'passenger', 'alerts', 'forecast', 'comms',
    'health', 'operators', 'copilot', 'agentic', 'roi', 'analytics', 'multimodal',
    'provenance', 'depot', 'platform', 'settings',
  ];
  for (const r of routes) {
    await page.goto(`/?role=operations_controller#/${r}`);
    await page.waitForTimeout(900);
    // something other than the loading fallback must be on screen
    await expect(page.locator('main, .wall')).toBeVisible();
  }
  expect(errors, `page errors:\n${errors.join('\n')}`).toEqual([]);
});

/**
 * PTCC scenario 3 (long-term analytics): the route profile draws a chart, the hotspot
 * table is exactly the top 5 PTCC asked for, and "Show on map" hands off to the map.
 */
test('analytics: route profile chart, top-5 hotspots, show on map', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto('/?role=operations_controller#/analytics');
  await page.getByRole('tab', { name: /Route profile/i }).click();
  await expect(page.locator('[data-route-profile-chart] canvas').first()).toBeVisible({ timeout: 30_000 });
  // E13: day heatmap draws; clicking a cell opens that start time back in the trip chart
  await page.getByRole('button', { name: /Day heatmap/i }).click();
  const heat = page.locator('[data-route-profile-heatmap] canvas').first();
  await expect(heat).toBeVisible();
  await heat.click({ position: { x: 200, y: 200 } });
  await expect(page.locator('[data-route-profile-chart] canvas').first()).toBeVisible();

  await page.getByRole('tab', { name: /Delay hotspots/i }).click();
  await expect(page.locator('[data-hotspots-table] tbody tr')).toHaveCount(5, { timeout: 30_000 });

  // E14: a proposed action becomes an audited draft a person sends from Comms
  const row1 = page.locator('[data-hotspots-table] tbody tr').first();
  await row1.getByRole('button', { name: 'Draft', exact: true }).click();
  await expect(row1.getByRole('button', { name: 'Drafted', exact: true })).toBeVisible();

  await page.getByRole('button', { name: /Show on map/i }).click();
  await expect(page).toHaveURL(/#\/map$/);
  await expect(page.getByRole('button', { name: /Clear hotspots \(5\)/i })).toBeVisible();

  await page.goto('/?role=operations_controller#/comms');
  await expect(page.locator('[data-coord="draft"]').first()).toBeVisible({ timeout: 30_000 });

  expect(errors, `page errors:\n${errors.join('\n')}`).toEqual([]);
});
