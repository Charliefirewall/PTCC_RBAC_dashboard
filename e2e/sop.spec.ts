import { expect, test } from '@playwright/test';

/**
 * PTCC precision enhancements, end to end (PTCC note, Sept 2026):
 *   scenario 1 - SOP ladder L1 / L2 / L3, drill-down to the trip
 *   scenario 2 - forecast tab with chance and confidence, drill-down
 * D10 (hotkey P) is PTCC's own scenario; N advances one SOP level.
 */

test('PTCC SOP ladder: L1 auto-sent, L3 escalates with a Traffic draft, alerts drill to the trip', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto('/?role=operations_controller#/alerts');
  await expect(page.locator('[data-alert-row]').first()).toBeVisible({ timeout: 30_000 });

  // L1: one route ~7 min late -> the notification goes without a click
  await page.locator('body').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('p');
  await expect(page.locator('[data-sop-level="1"]').first()).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('[data-auto-sent]').first()).toBeVisible({ timeout: 15_000 });

  // L2 then L3: five more routes late -> every late route goes up a level, TCC draft
  await page.keyboard.press('n');
  await expect(page.locator('[data-sop-level="2"]').first()).toBeVisible({ timeout: 30_000 });
  await page.keyboard.press('n');
  await expect(page.locator('[data-sop-level="3"]').first()).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('[data-traffic-draft]').first()).toBeVisible();

  // drill-down: a delay row opens its worst bus on the Trip tab
  // a route-level delay row (the network row drills to Regularity by design)
  const drill = page.locator('[data-alert-row]:has([data-sop-level]) [data-drill][href*="#/vehicle/"]').first();
  await drill.click();
  await expect(page).toHaveURL(/#\/vehicle\/.+\?alert=/);
  await expect(page.locator('[data-trip-tab]')).toBeVisible();
  await expect(page.locator('[data-minimap]')).toBeVisible();
  await expect(page.locator('[data-trip-stops] [data-stop-row]').first()).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('[data-trip-stops]')).toContainText(/[+−]\d+\.\d min/);

  // the L3 draft is waiting in Comms for a person to send
  await page.goto('/?role=incident_manager#/comms');
  expect(errors).toEqual([]);
});

test('forecast tab lists possible alerts with chance and confidence, in the forecast colour', async ({ page }) => {
  await page.goto('/?role=operations_controller#/alerts');
  await expect(page.locator('[data-alert-row]').first()).toBeVisible({ timeout: 30_000 });
  await page.locator('body').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('p');
  await page.keyboard.press('n');
  await page.keyboard.press('n');

  await page.locator('[data-tab="forecast"]').click();
  await expect(page.locator('[data-forecast-tab]')).toBeVisible();
  const row = page.locator('[data-forecast-list] [data-alert-row][data-forecast]').first();
  await expect(row).toBeVisible({ timeout: 30_000 });
  await expect(row.locator('[data-forecast-prob]')).toContainText(/\d+%/);
  for (const h of ['30', '45', '60', '15']) await page.locator(`[data-horizon="${h}"]`).click();

  // a forecast row cannot be validated - it only drills down
  await expect(row.getByRole('button', { name: /validate/i })).toHaveCount(0);
  await row.locator('[data-drill]').click();
  await expect(page.locator('[data-trip-tab]')).toBeVisible();
  await expect(page.locator('[data-stop-row][data-forecast]').first()).toBeVisible({ timeout: 20_000 });
});

test('enhancements: L1 countdown can be cancelled, TCC acknowledges, trip shows the SOP timeline', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/?role=operations_controller#/alerts');
  await expect(page.locator('[data-alert-row]').first()).toBeVisible({ timeout: 30_000 });
  await page.locator('body').click({ position: { x: 5, y: 5 } });

  // E2: the L1 notification waits a visible countdown; pause the sim and cancel it
  await page.keyboard.press('p');
  await expect(page.locator('[data-countdown]').first()).toBeVisible({ timeout: 30_000 });
  await page.evaluate(() => (window as any).__ptcc.engine.pause());
  await page.locator('[data-cancel-l1]').first().click();
  await expect(page.locator('[data-countdown]')).toHaveCount(0);
  await expect(page.locator('[data-auto-sent]')).toHaveCount(0);
  await page.evaluate(() => (window as any).__ptcc.engine.start());

  // E1 + E3: step to L3, send the Traffic draft, and TCC (simulated) acknowledges
  await page.locator('body').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('n');
  await page.keyboard.press('n');
  await expect(page.locator('[data-sop-level="3"]').first()).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('[data-alert-row]', { hasText: /routes delayed.*–/ }).first()).toBeVisible();
  await page.evaluate(() => { location.hash = '#/comms'; });
  await page.locator('[data-send-draft]').first().click();
  await expect(page.locator('[data-ack]').first()).toBeVisible({ timeout: 30_000 });

  // E4 + E17: drill from a delay alert, see what was done and a masked driver name
  await page.evaluate(() => { location.hash = '#/alerts'; });
  await page.locator('[data-alert-row]:has([data-sop-level]) [data-drill][href*="#/vehicle/"]').first().click();
  await expect(page.locator('[data-sop-timeline]')).toBeVisible();
  await expect(page.locator('[data-driver-name]')).toContainText('*');
  await expect(page.locator('[data-load-profile]')).toBeVisible();
  expect(errors).toEqual([]);
});

test('enhancements: forecast explains itself, has a scorecard, watch list, matrix and a Next-hour panel', async ({ page }) => {
  await page.goto('/?role=operations_controller#/command');
  // E10 on the first screen the audience sees
  await expect(page.locator('[data-next-hour]')).toBeVisible({ timeout: 30_000 });

  await page.evaluate(() => { location.hash = '#/alerts'; });
  await page.locator('[data-tab="forecast"]').click();
  // E8: a quiet network still shows the watch list; E7 scorecard is always there
  await expect(page.locator('[data-watch-row]').first()).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('[data-scorecard]')).toBeVisible();

  await page.locator('body').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('p');
  await page.keyboard.press('n');
  await page.keyboard.press('n');
  const row = page.locator('[data-forecast-list] [data-alert-row][data-forecast]').first();
  await expect(row).toBeVisible({ timeout: 30_000 });
  await expect(row.locator('[data-forecast-prob]')).toContainText(/\d+% chance/);

  // E6
  await row.locator('[data-how]').click();
  await expect(page.locator('[data-how-it-works]')).toContainText(/expected/);
  await page.keyboard.press('Escape');

  // E9
  await page.locator('[data-matrix-toggle]').click();
  await expect(page.locator('[data-horizon-matrix] tbody tr').first()).toBeVisible();
});
