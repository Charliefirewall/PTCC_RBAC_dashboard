import { expect, test, type Page } from '@playwright/test';

const PREVIEW_URL = '/?role=operations_controller#/analytics?tab=previews';

async function openPreviews(page: Page) {
  await page.goto(PREVIEW_URL);
  await expect(page.locator('[data-capability-previews]')).toBeVisible({ timeout: 30_000 });
}

async function selectPreview(page: Page, id: string) {
  const tab = page.locator(`[data-preview-tab="${id}"]`);
  await tab.click();
  await expect(tab).toHaveAttribute('aria-selected', 'true');
}

test('all production preview categories are explicit FUTURE shells with honest unavailable states', async ({ page }) => {
  await openPreviews(page);
  const root = page.locator('[data-capability-previews]');
  await expect(root.getByRole('img', { name: /Future/i }).first()).toBeVisible();
  await expect(root).toContainText(/preview only/i);
  await expect(root).toContainText(/no blank value.*live, calculated, delivered, or acknowledged/i);

  await selectPreview(page, 'history');
  await expect(root).toContainText(/persistent historical alert archive/i);
  await expect(root).toContainText(/session-only simulated memory/i);
  await expect(root).toContainText(/persistent event.*store|retention policy/i);

  await selectPreview(page, 'forecast');
  await expect(root).toContainText(/layout preview only/i);
  await expect(root).toContainText(/duration model required/i);
  await expect(root).toContainText(/independent vehicle model required/i);
  await expect(root).toContainText(/not connected.*traffic.*weather.*roadworks/i);
  await expect(root).toContainText(/times remain blank/i);

  await selectPreview(page, 'analytics');
  await expect(root).toContainText(/observed historical segment analytics/i);
  await expect(root).toContainText(/awaiting retained AVL observations/i);
  await expect(root).toContainText(/unique affected buses/i);
  await expect(root).toContainText(/unavailable.*retained AVL|required/i);

  await selectPreview(page, 'traffic');
  await expect(root).toContainText(/Traffic Department digital hand-off/i);
  await expect(root).toContainText(/does not claim API delivery/i);
  await expect(root).toContainText(/not connected/i);
  const receipt = page.getByText(/External delivery receipt/i).locator('xpath=ancestor::div[contains(@class,"rounded")][1]');
  await expect(receipt).toContainText(/Agency reference/i);
  await expect(receipt).toContainText(/Accepted by/i);
  await expect(receipt).toContainText(/Response \/ instruction/i);
  const receiptText = (await receipt.innerText()).replace(/\s/g, '');
  expect(receiptText.match(/—/g)?.length).toBe(3);
  expect(receiptText).not.toMatch(/\d/);

  await selectPreview(page, 'monitor');
  await expect(root).toContainText(/Intervention outcome monitoring/i);
  await expect(root).toContainText(/does not execute holding, dispatch, rerouting or signal actions/i);
  await expect(root).toContainText(/cannot claim a causal improvement/i);
  await expect(root).toContainText(/Unavailable.*no operational execution interface/i);
  await expect(root).toContainText(/Not measured by this demo/i);

  await selectPreview(page, 'sources');
  await expect(root).toContainText(/No production source is connected/i);
  const sourceRows = root.locator('tbody tr');
  await expect(sourceRows).toHaveCount(6);
  await expect(root).toContainText(/Awaiting interface/i);
  await expect(root).toContainText(/Manual telephone only/i);
});

test('every production preview link reaches an implemented workspace without a dead end', async ({ page }) => {
  const journeys = [
    { tab: 'history', link: /Open session history/i, url: /#\/alerts/, destination: /Historical alerts.*actual records/i },
    { tab: 'forecast', link: /Open demo forecast/i, url: /#\/forecast/, destination: /Potential service issues.*predictions/i },
    { tab: 'analytics', link: /Open synthetic hotspots/i, url: /tab=hotspots/, selector: '[data-hotspots-root]' },
    { tab: 'traffic', link: /Open manual hand-offs/i, url: /#\/comms/, destination: /No PTCC.*TCC interface|Coordination/i },
    { tab: 'monitor', link: /Open recommendation workflow/i, url: /#\/agentic/, destination: /Agent console|Awaiting your decision/i },
    { tab: 'sources', link: /Review architecture and data/i, url: /#\/platform/, destination: /Architecture|Data/i },
  ] as const;

  for (const journey of journeys) {
    await openPreviews(page);
    await selectPreview(page, journey.tab);
    const link = page.getByRole('link', { name: journey.link });
    await expect(link).toHaveAttribute('href', /^#\//);
    await link.click();
    await expect(page).toHaveURL(journey.url);
    if ('selector' in journey) await expect(page.locator(journey.selector)).toBeVisible({ timeout: 30_000 });
    else await expect(page.locator('main')).toContainText(journey.destination, { timeout: 30_000 });
  }
});

test('implemented modules directly disclose forecast, history and candidate-action limitations', async ({ page }) => {
  await page.goto('/?role=operations_controller#/forecast');
  await expect(page.locator('[data-forecast-module]')).toContainText(/SIMULATED FORECAST/i, { timeout: 30_000 });
  await page.locator('body').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('p');
  await page.keyboard.press('n');
  await page.keyboard.press('n');
  const forecast = page.locator('[data-forecast-row]').first();
  await expect(forecast).toBeVisible({ timeout: 30_000 });
  await expect(forecast).toContainText(/Current onboard exposure/i);
  await forecast.getByRole('button', { name: /drill|details|inspect/i }).click();
  await expect(page.locator('[data-forecast-module]')).toContainText(/Current vehicles on forecast route.*not individually predicted/i);

  await page.goto('/?role=operations_controller#/alerts');
  await expect(page.getByText(/SESSION-ONLY SIMULATED HISTORY.*not a production archive/i)).toBeVisible({ timeout: 30_000 });

  await page.goto('/?role=operations_controller#/analytics?tab=hotspots&route=R7&dow=4&start=44');
  const hotspots = page.locator('[data-hotspots-root]');
  await expect(hotspots).toBeVisible({ timeout: 30_000 });
  await expect(hotspots).toContainText(/SIMULATED CANDIDATE ACTION/i);
  await expect(hotspots).toContainText(/not an approved SOP/i);
  await expect(hotspots).toContainText(/review.*approved PTCC\/TCC policy and authority/i);
});
