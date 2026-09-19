import { test } from '@playwright/test';

const WAIT = 2600;

test('capture', async ({ page }) => {
  await page.setViewportSize({ width: 1680, height: 950 });
  await page.goto('/?role=operations_controller#/command');
  await page.waitForTimeout(6000);
  // Scenario keys are mutually exclusive - start() calls resetAll - so whichever
  // is pressed LAST is the state that gets captured. End on D2 so the hero shot
  // shows the overcrowding the deck is actually about.
  await page.keyboard.press('1');           // D1 service gap
  await page.waitForTimeout(3000);
  await page.keyboard.press('5');           // D5 panic
  await page.waitForTimeout(2500);
  await page.keyboard.press('2');           // D2 overcrowding
  await page.waitForTimeout(3500);
  await page.screenshot({ path: 'shots/01-command.png' });

  await page.goto('/?role=operations_controller#/map');   await page.waitForTimeout(WAIT);
  await page.screenshot({ path: 'shots/02-map.png' });

  await page.goto('/?role=operations_controller#/regularity'); await page.waitForTimeout(WAIT);
  await page.screenshot({ path: 'shots/03-regularity.png' });

  await page.goto('/?role=operations_controller#/alerts'); await page.waitForTimeout(WAIT);
  await page.screenshot({ path: 'shots/04-alerts.png' });

  await page.goto('/?role=operations_controller#/passenger'); await page.waitForTimeout(WAIT);
  await page.screenshot({ path: 'shots/05-passenger.png' });

  await page.goto('/?role=operations_controller#/copilot'); await page.waitForTimeout(1500);
  const chip = page.locator('button').filter({ hasText: /immediate attention/i }).first();
  if (await chip.count()) { await chip.click(); await page.waitForTimeout(1200); }
  await page.screenshot({ path: 'shots/06-copilot.png' });

  await page.goto('/?role=operations_controller#/health'); await page.waitForTimeout(WAIT);
  await page.screenshot({ path: 'shots/07-health.png' });

  await page.goto('/?role=operations_controller#/settings'); await page.waitForTimeout(1500);
  await page.screenshot({ path: 'shots/08-settings.png' });

  // video wall mode
  await page.goto('/?role=operations_controller#/command'); await page.waitForTimeout(1500);
  await page.keyboard.press('w'); await page.waitForTimeout(2500);
  await page.setViewportSize({ width: 1920, height: 600 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'shots/09-wall.png' });
});
