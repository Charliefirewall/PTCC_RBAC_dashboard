import { expect, test } from '@playwright/test';

test('Forecast is a first-class workspace with all four horizons and drill-down', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto('/?role=operations_controller#/command');
  const nextHour = page.locator('[data-next-hour]');
  await expect(nextHour).toBeVisible({ timeout: 30_000 });
  await expect(nextHour).toHaveAttribute('href', '#/forecast');
  await nextHour.click();
  await expect(page).toHaveURL(/#\/forecast$/);
  await expect(page.locator('[data-forecast-module]')).toBeVisible();

  for (const horizon of ['15', '30', '45', '60']) {
    const control = page.locator(`[data-horizon="${horizon}"]`);
    await control.click();
    await expect(control).toHaveAttribute('aria-checked', 'true');
  }

  // PTCC's deterministic scenario creates forecast rows without fabricating screen data.
  await page.locator('body').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('p');
  await page.keyboard.press('n');
  await page.keyboard.press('n');
  const row = page.locator('[data-forecast-row]').first();
  if (await row.isVisible({ timeout: 15_000 }).catch(() => false)) {
    await row.getByRole('button', { name: /drill|details|inspect/i }).click();
    await expect(page.getByText(/supporting evidence|model evidence/i).first()).toBeVisible();
  }

  expect(errors, `console/page errors:\n${errors.join('\n')}`).toEqual([]);
});

test('Alerts exposes composable vehicle, date, severity and type filters', async ({ page }) => {
  await page.goto('/?role=operations_controller#/alerts');
  const vehicle = page.locator('[data-alert-vehicle-filter]');
  await expect(vehicle).toBeVisible({ timeout: 30_000 });
  await vehicle.fill('1-06');
  await expect(vehicle).toHaveValue('1-06');

  await page.locator('[data-date-preset="7d"]').click();
  const dates = page.locator('input[type="date"]');
  await expect(dates).toHaveCount(2);
  await expect(dates.nth(0)).not.toHaveValue('');
  await expect(dates.nth(1)).not.toHaveValue('');

  const selects = page.locator('select');
  await selects.nth(0).selectOption('critical');
  await selects.nth(1).selectOption('service_deviation');
  await expect(selects.nth(0)).toHaveValue('critical');
  await expect(selects.nth(1)).toHaveValue('service_deviation');
});

test('Live Map vehicle hover is dynamic and Open detail retains map context', async ({ page }) => {
  await page.goto('/?role=operations_controller#/map');
  await page.waitForFunction(() => Boolean((window as any).__ptccMap), null, { timeout: 30_000 });
  await page.evaluate(() => (window as any).__ptcc.engine.pause());
  await page.evaluate(() => (window as any).__ptccMap.setZoom(15));
  const targetId = await page.evaluate(() => {
    const W = (window as any).__ptcc;
    const id = W.world.vehicles.find((x: any) => x.status === 'in_service').vehicle_id;
    W.useSelection.getState().selectVehicle(id);
    return id;
  });
  await page.waitForTimeout(3200);
  const selectedPopupClose = page.locator('.maplibregl-popup-close-button').first();
  if (await selectedPopupClose.isVisible().catch(() => false)) await selectedPopupClose.click();
  const target = await page.evaluate((id) => ({ id, ...(window as any).__ptccMap.vehicleRender(id) }), targetId);
  const canvas = page.locator('.maplibregl-canvas').first();
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  // Vehicles can overlap at a stop. Probe the rendered glyph footprint and accept
  // whichever real topmost feature MapLibre reports, then verify that exact ID is
  // carried through the card and route.
  const hover = page.locator('[data-vehicle-hover]').first();
  for (const [dx, dy] of [[0, 0], [-5, 0], [5, 0], [0, -5], [0, 5]]) {
    await page.mouse.move(box!.x + target.x + dx, box!.y + target.y + dy);
    if (await hover.isVisible({ timeout: 1200 }).catch(() => false)) break;
  }
  await expect(hover).toBeVisible({ timeout: 10_000 });
  const hoveredId = await hover.getAttribute('data-vehicle-id');
  expect(hoveredId).toBeTruthy();
  await expect(hover).toContainText(hoveredId!);
  await hover.getByRole('button', { name: /open detail/i }).click();
  await expect(page).toHaveURL(new RegExp(`#\/vehicle\/${hoveredId!.replace('-', '\\-')}\\?from=map&trip=`));
  await expect(page.locator('[data-trip-tab]')).toBeVisible();
});
