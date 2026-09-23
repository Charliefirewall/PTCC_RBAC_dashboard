import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * Acceptance coverage for the forward-looking Analytics workflow requested by PTCC:
 *
 *   route + day + start -> complete-trip forecast -> risky segments -> evidence-based
 *   action -> human-gated Traffic Department communication.
 *
 * These checks deliberately use the UI and the public read-only Playwright bridge.
 * They do not reproduce forecasting/ranking formulas in the test: the browser must
 * expose the calculated result and carry its context into the communication record.
 */

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const SIGNED_MINUTES = /^[+−-]?\d+(?:\.\d+)?\s*(?:min|minutes?)$/i;
const PERCENT = /^\d+(?:\.\d+)?\s*%$/;

async function selectAndExpect(control: Locator, value: string) {
  await expect(control).toBeVisible();
  await control.selectOption(value);
  await expect(control).toHaveValue(value);
}

async function openRouteForecast(page: Page) {
  await page.goto('/?role=operations_controller#/analytics?tab=route&route=R7');
  await expect(page.locator('[data-route-profile]')).toBeVisible({ timeout: 30_000 });
  // Freeze telemetry so changing the analytical dimensions cannot race a simulation tick.
  await page.evaluate(() => (window as any).__ptcc.engine.pause());
}

test('route/day/start produces a complete, independent stop-by-stop journey forecast', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  await openRouteForecast(page);
  const route = page.locator('[data-route-select] select');
  const day = page.locator('[data-route-day] select');
  const start = page.locator('[data-route-start] select');

  expect(await route.locator('option').count()).toBeGreaterThan(1);
  await expect(day.locator('option')).toHaveCount(7);
  expect(await start.locator('option').count()).toBeGreaterThanOrEqual(60);

  await selectAndExpect(route, 'R7');
  await selectAndExpect(day, '4'); // Friday: verifies a day-specific, non-live pre-trip forecast.
  await selectAndExpect(start, '44'); // 17:00 in the app's 15-minute service buckets.

  const table = page.locator('[data-route-stop-table]');
  await expect(table).toBeVisible();
  await expect(table).toContainText(/scheduled arrival/i);
  await expect(table).toContainText(/norm(?:ative)? arrival|historical.*arrival/i);
  await expect(table).toContainText(/forecast arrival/i);
  await expect(table).toContainText(/forecast (?:deviation|vs schedule)/i);
  await expect(table).toContainText(/cumulative/i);

  const expectedStops = await page.evaluate(() => {
    const W = (window as any).__ptcc;
    const route = W.world.routeById.get('R7');
    // Route fixtures have used both names over the life of the demo; this merely
    // verifies first-to-last completeness against the app's own selected route.
    return (route.stop_ids?.[0] ?? route.stop_sequence?.[0] ?? route.stops ?? []).length;
  });
  expect(expectedStops).toBeGreaterThan(2);

  const rows = table.locator('[data-route-stop-row]');
  await expect(rows).toHaveCount(expectedStops);
  await expect(rows.first()).toHaveAttribute('data-stop-index', '0');
  await expect(rows.last()).toHaveAttribute('data-stop-index', String(expectedStops - 1));

  for (const row of await rows.all()) {
    await expect(row.locator('[data-scheduled-arrival]')).toHaveText(TIME);
    await expect(row.locator('[data-norm-arrival]')).toHaveText(TIME);
    await expect(row.locator('[data-forecast-arrival]')).toHaveText(TIME);
    await expect(row.locator('[data-forecast-deviation]')).toHaveText(SIGNED_MINUTES);
    await expect(row.locator('[data-cumulative-deviation]')).toHaveText(SIGNED_MINUTES);
    await expect(row).toHaveAttribute('data-deviation-state', /^(within_norm|delay|significant|recovery)$/);
  }

  // A pre-trip forecast must be a separately calculated series, not the old fallback
  // that copied the selected day's historical norm into every forecast cell.
  const distinctForecasts = await rows.evaluateAll((rs) => rs.filter((r) => {
    const norm = r.querySelector('[data-norm-arrival]')?.textContent?.trim();
    const forecast = r.querySelector('[data-forecast-arrival]')?.textContent?.trim();
    return Boolean(norm && forecast && norm !== forecast);
  }).length);
  expect(distinctForecasts).toBeGreaterThan(0);

  await expect(page.locator('[data-route-profile-chart]')).toBeVisible();
  await rows.nth(Math.min(2, expectedStops - 1)).click();
  const detail = page.locator('[data-route-stop-detail]');
  await expect(detail).toBeVisible();
  await expect(detail).toContainText(/scheduled|norm|forecast/i);
  await expect(detail).toContainText(/segment|stop/i);
  await expect(detail).toContainText(/confidence|evidence|historical/i);

  expect(errors, `console/page errors:\n${errors.join('\n')}`).toEqual([]);
});

test('top five links route/day/start context to quantified risk, rationale and proposed action', async ({ page }) => {
  await openRouteForecast(page);
  await selectAndExpect(page.locator('[data-route-select] select'), 'R7');
  await selectAndExpect(page.locator('[data-route-day] select'), '4');
  await selectAndExpect(page.locator('[data-route-start] select'), '44');

  await page.locator('[data-route-operational-action]').getByRole('button', { name: /hotspot/i }).click();
  await expect(page).toHaveURL(/tab=hotspots/);
  const root = page.locator('[data-hotspots-root]');
  await expect(root).toBeVisible();

  // The risk calculation must use the same analytical scenario, not reset to a broad
  // standalone AM/PM ranking when the operator moves from forecast to hotspots.
  await expect(root.locator('[data-hotspot-route] select')).toHaveValue('R7');
  await expect(root.locator('[data-hotspot-day] select')).toHaveValue('4');
  await expect(root.locator('[data-hotspot-start] select')).toHaveValue('44');
  await expect(root).toContainText(/R7/);
  await expect(root).toContainText(/Friday/i);
  await expect(root).toContainText(/17:00/);

  const rows = root.locator('[data-hotspots-table] tbody tr');
  await expect(rows).toHaveCount(5);
  for (let i = 0; i < 5; i += 1) {
    const row = rows.nth(i);
    await expect(row.locator('td').nth(0)).toHaveText(String(i + 1));
    await expect(row.locator('[data-hotspot-row]')).not.toBeEmpty();
    await expect(row.locator('[data-hotspot-mean]')).toHaveText(/^-?\d+(?:\.\d+)?$/);
    await expect(row.locator('[data-hotspot-affected]')).toHaveText(/^\d+\s*\/\s*\d+(?:\.\d+)?%$/);
    await expect(row.locator('[data-hotspot-frequency]')).toHaveText(PERCENT);
    await expect(row.locator('[data-hotspot-recurrence]')).toHaveText(PERCENT);
    await expect(row.locator('[data-hotspot-contribution]')).toHaveText(PERCENT);
    await expect(row.locator('td').nth(8)).toContainText(/low|medium|high/i);
    await expect(row.locator('td').nth(9)).not.toBeEmpty();
    await row.click();
    const rationale = root.locator('[data-hotspot-rationale]');
    await expect(rationale).toContainText(/historical|forecast|frequency|recurr|affected|contribution/i);
    await expect(rationale).toContainText(/\d/);
    const detail = root.getByRole('region', { name: /segment risk/i });
    await expect(detail).toContainText(/Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday/i);
    await expect(detail).toContainText(/AM peak|midday|PM peak|evening/i);
    await expect(root.locator('[data-hotspot-action]')).not.toBeEmpty();
  }

  // Changing the exact departure must recalculate the upcoming-risk evidence and keep
  // route/day intact. A text/value change is the observable contract, not a formula copy.
  const before = await rows.first().locator('td').nth(8).textContent();
  await selectAndExpect(root.locator('[data-hotspot-start] select'), '52'); // 19:00
  await expect(root.locator('[data-hotspot-route] select')).toHaveValue('R7');
  await expect(root.locator('[data-hotspot-day] select')).toHaveValue('4');
  await expect(rows.first().locator('td').nth(8)).not.toHaveText(before?.trim() ?? '');
});

test('proactive proposal and senior escalation retain evidence through the Traffic Department handoff', async ({ page }) => {
  await page.goto('/?role=incident_manager#/analytics?tab=hotspots&route=R7&dow=4&start=44');
  const root = page.locator('[data-hotspots-root]');
  await expect(root).toBeVisible({ timeout: 30_000 });
  await page.evaluate(() => (window as any).__ptcc.engine.pause());

  const source = root.locator('[data-hotspots-table] tbody tr:has([data-hotspot-row][data-recipient="tcc"])').first();
  await expect(source).toBeVisible();
  await source.click();
  const segment = (await source.locator('[data-hotspot-row]').innerText()).trim();
  const action = (await root.locator('[data-hotspot-action]').innerText()).replace(/^.*?:\s*/, '').trim();
  const rationale = (await root.locator('[data-hotspot-rationale]').innerText()).trim();
  expect(segment.length).toBeGreaterThan(2);
  expect(action.length).toBeGreaterThan(5);
  expect(rationale).toMatch(/\d/);

  await source.locator('[data-hotspot-draft] button').click();
  await expect(source.locator('[data-hotspot-draft] button')).toBeDisabled();

  const proposal = await page.evaluate(() => {
    const msgs = (window as any).__ptcc.useComms.getState().coordination;
    return msgs.find((m: any) => m.provenance === 'analytics_proactive' && m.intent === 'proactive_proposal');
  });
  expect(proposal).toMatchObject({
    recipient: 'tcc',
    message_type: 'coordination_request',
    status: 'draft',
    provenance: 'analytics_proactive',
    intent: 'proactive_proposal',
  });
  expect(proposal.content).toContain(segment);
  expect(proposal.content).toContain('R7');
  expect(proposal.content).toMatch(/Friday/i);
  expect(proposal.content).toMatch(/19:00|17:00/);
  expect(proposal.content).toContain(action);
  expect(proposal.content).toMatch(/because|evidence|historical|forecast|frequency|affected/i);

  // Escalation is a distinct, explicit human request for senior/TCC review. A forecast
  // must never be relabelled as an actual L3 incident before the condition occurs.
  const highRisk = root.locator('[data-hotspots-table] tbody tr', { hasText: /high/i }).first();
  await expect(highRisk).toBeVisible();
  await highRisk.click();
  const escalationSegment = (await highRisk.locator('[data-hotspot-row]').innerText()).trim();
  const escalate = root.locator('[data-hotspot-escalate] button');
  await expect(escalate).toBeEnabled();
  await escalate.click();
  const escalation = await page.evaluate(() => {
    const msgs = (window as any).__ptcc.useComms.getState().coordination;
    return msgs.find((m: any) => m.provenance === 'analytics_proactive' && m.intent === 'escalation_request');
  });
  expect(escalation).toMatchObject({
    recipient: 'tcc',
    message_type: 'coordination_request',
    status: 'draft',
    provenance: 'analytics_proactive',
    intent: 'escalation_request',
  });
  expect(escalation.reason).toMatch(/risk|impact|delay|threshold/i);
  expect(escalation.content).toContain(escalationSegment);
  expect(escalation.content).toMatch(/R7/);

  await page.goto('/?role=incident_manager#/comms');
  const proposalRow = page.locator('[data-provenance="analytics_proactive"][data-intent="proactive_proposal"]').first();
  const escalationRow = page.locator('[data-provenance="analytics_proactive"][data-intent="escalation_request"]').first();
  await expect(proposalRow).toHaveAttribute('data-coord', 'draft');
  await expect(escalationRow).toHaveAttribute('data-coord', 'draft');
  await expect(proposalRow).toBeVisible();
  await expect(escalationRow).toBeVisible();
  await expect(proposalRow).toContainText(segment);
  await expect(proposalRow.locator('[data-coord-evidence]')).toContainText(/historical|forecast|frequency|affected/i);
  await expect(escalationRow.locator('[data-coord-reason]')).toContainText(/risk|impact|delay|threshold/i);

  await escalationRow.locator('[data-send-draft]').click();
  await expect(escalationRow).toHaveAttribute('data-coord', 'sent');
  const sent = await page.evaluate((id: string) => {
    return (window as any).__ptcc.useComms.getState().coordination.find((m: any) => m.communication_id === id);
  }, escalation.communication_id);
  expect(sent.status).toBe('sent');
  expect(sent.recipient).toBe('tcc');
  expect(sent.sent_at).toBeTruthy();
});
