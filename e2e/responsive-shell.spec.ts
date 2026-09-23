import { expect, test } from '@playwright/test';

test('narrow shell exposes grouped navigation through the shared drawer', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?role=operations_controller#/command');
  await expect(page.locator('[data-top-bar]')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('main')).toBeVisible();
  await expect(page.locator('[data-primary-navigation]:not([data-mobile-navigation])')).toBeHidden();

  await page.getByRole('button', { name: /open navigation|\u0446\u044d\u0441 \u043d\u044d\u044d\u0445/i }).click();
  const drawer = page.locator('[role=dialog]');
  await expect(drawer).toBeVisible();
  await expect(drawer.locator('[data-mobile-navigation]')).toBeVisible();
  await expect(drawer).toContainText(/Operations|\u04ae\u0439\u043b \u0430\u0436\u0438\u043b\u043b\u0430\u0433\u0430\u0430/i);
  await drawer.getByRole('link', { name: /Live Fleet|\u0428\u0443\u0443\u0434/i }).click();
  await expect(page).toHaveURL(/#\/map/);
  await expect(drawer).toBeHidden();
});

test('1024 command centre gives the map a usable full-width row and an operational brief', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 800 });
  await page.goto('/?role=operations_controller#/command');
  await expect(page.locator('[data-command-workspace]')).toBeVisible({ timeout: 30_000 });
  const map = page.locator('[data-command-map]');
  await expect(map).toBeVisible();
  const box = await map.boundingBox();
  expect(box?.width ?? 0).toBeGreaterThan(600);
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(330);
  await expect(page.locator('[data-operational-brief]')).toBeVisible();
  await expect(page.locator('[data-operational-brief] a')).toHaveCount(3);
});

test('role and agent layouts stack without horizontal page overflow', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto('/?role=operations_controller#/agentic');
  await expect(page.locator('[data-agent-console]')).toBeVisible({ timeout: 30_000 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(2);

  await page.goto('/?role=operations_controller#/dashboard');
  await expect(page.locator('[data-role-dashboard-grid]')).toBeVisible({ timeout: 30_000 });
  const columns = await page.locator('[data-role-dashboard-grid]').evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);
  expect(columns).toBe(2);
});
