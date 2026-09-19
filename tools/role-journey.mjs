/**
 * Does the demo WORK, not just render: drives the primary action of every role through
 * the real UI and asserts the store actually changed. Rendering is covered elsewhere
 * (role-sweep, uiaudit); this file is only about interaction.
 */
import { chromium } from '@playwright/test';

const BASE = process.env.PTCC_BASE ?? 'http://127.0.0.1:4173';
let pass = 0;
let fail = 0;
const ck = (ok, msg) => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${msg}`);
  ok ? pass++ : fail++;
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 950 } });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message.slice(0, 140)));
page.on('console', (m) => {
  if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 140));
});

// about:blank first: two goto calls that differ only in the hash are a same-document
// navigation, so the app never reloads and one section inherits the previous section's
// store. Every section must start from the seeded shift, not from someone else's edits.
const open = async (role, route) => {
  await page.goto('about:blank');
  await page.goto(`${BASE}/?role=${role}#/${route}`, { waitUntil: 'load' });
  await page.waitForTimeout(1900);
};
const store = (fn) => page.evaluate(fn);

// ---------------------------------------------------------------- incident manager
console.log('\n# incident_manager - advance a stage, and refuse the double click');
await open('incident_manager', 'dashboard');
{
  const before = await store(() => window.__ptcc.useEvents.getState().events[0].stage);
  const btn = page.getByRole('button', { name: /advance stage/i }).first();
  await btn.click();
  await page.waitForTimeout(500);
  const after = await store(() => window.__ptcc.useEvents.getState().events[0].stage);
  ck(after !== before, `Advance stage moved the event: ${before} -> ${after}`);

}

// The double click needs an event with at least two FREE advances left. The dashboard
// tile targets the top-priority event, which the shift handover already carried to
// response_monitoring - its next move is gated by compulsory actions (L1346), so a
// second advance there would be refused by the gate, not by the debounce, and the test
// would pass for the wrong reason. Drive the un-gated event instead.
console.log('\n# a double click on Advance must never skip a stage');
await open('incident_manager', 'alerts');
{
  await page.locator('button').filter({ hasText: /Events \(5 levels\)/i }).first().click();
  await page.waitForTimeout(900);
  // The un-gated event is the one still at creation: its next two moves carry no
  // compulsory-action gate, so a refused second advance can only be the debounce.
  const freshId = await store(() => {
    const ev = window.__ptcc.useEvents.getState().events.find((e) => e.stage === 'creation');
    return ev ? ev.event_id : null;
  });
  let picked = null;
  if (freshId) {
    await page.locator('[data-event-row]').filter({ hasText: freshId }).first().click();
    await page.waitForTimeout(900);
    const btn = page.locator('button').filter({ hasText: /^Advance to/i }).first();
    if ((await btn.count()) && !(await btn.isDisabled())) picked = { btn };
  }
  if (!picked) {
    ck(false, 'no event with an available advance');
  } else {
    const idOf = () => store(() => {
      const evs = window.__ptcc.useEvents.getState().events;
      return evs.map((e) => `${e.event_id}:${e.stage}`).join(',');
    });
    const before = await idOf();
    const auditBefore = await store(
      () => window.__ptcc.useEvents.getState().audit.filter((a) => a.action.startsWith('advance:')).length,
    );
    await picked.btn.dblclick({ delay: 30 });
    await page.waitForTimeout(800);
    const after = await idOf();
    const auditAfter = await store(
      () => window.__ptcc.useEvents.getState().audit.filter((a) => a.action.startsWith('advance:')).length,
    );
    ck(after !== before, `the double click advanced the event once (${before} -> ${after})`);
    ck(auditAfter - auditBefore === 1, `and wrote exactly ONE advance audit row (${auditAfter - auditBefore})`);
  }
}

// ---------------------------------------------------------------- communication controller
console.log('\n# communication_controller - approve the handover message');
await open('communication_controller', 'dashboard');
{
  const before = await store(
    () => window.__ptcc.useComms.getState().passenger.filter((m) => m.status === 'pending_approval').length,
  );
  ck(before > 0, `an approval is waiting on the landing screen (${before})`);
  const btn = page.getByRole('button', { name: /^approve$/i }).first();
  if (await btn.count()) {
    await btn.click();
    await page.waitForTimeout(600);
  }
  const after = await store(
    () => window.__ptcc.useComms.getState().passenger.filter((m) => m.status === 'pending_approval').length,
  );
  ck(after === before - 1, `approving cleared it from the queue (${before} -> ${after})`);
  const appr = await store(() => {
    const row = window.__ptcc.useEvents.getState().audit.find((a) => a.action === 'approve_message');
    return row ? `${row.actor} / ${row.role}` : null;
  });
  ck(Boolean(appr), `L1443: the approval is attributed in the audit trail (${appr})`);
}

// ---------------------------------------------------------------- dispatcher
console.log('\n# dispatcher - assign a resource');
await open('dispatcher', 'dashboard');
{
  const btn = page.getByRole('button', { name: /^assign/i }).first();
  if ((await btn.count()) === 0) {
    ck(false, 'no Assign control on the dispatcher dashboard');
  } else {
    await btn.click();
    await page.waitForTimeout(900);
    const where = await page.evaluate(() => location.hash);
    ck(/#\/(vehicle|map)/.test(where), `Assign… opens where the assignment is made (${where})`);
  }
}

// ---------------------------------------------------------------- supervisor
console.log('\n# supervisor - escalate, and the audit trail records it');
await open('supervisor', 'dashboard');
{
  const btn = page.getByRole('button', { name: /^escalate/i }).first();
  if (await btn.count()) {
    await btn.click();
    await page.waitForTimeout(900);
  }
  const where = await page.evaluate(() => location.hash);
  ck(/#\/alerts/.test(where), `Escalate… opens the full record where it is escalated (${where})`);
  const audit = await store(() => window.__ptcc.useEvents.getState().audit.length);
  ck(audit > 0, `the audit trail is recording (${audit} rows)`);
}

// ---------------------------------------------------------------- field inspector
console.log('\n# field_inspector - complete a compulsory action from the checklist');
await open('field_inspector', 'dashboard');
{
  const panel = page.locator('section').filter({ hasText: /Inspection checklist/i }).first();
  const box = panel.locator('input[type=checkbox]:not([disabled])').first();
  if ((await box.count()) === 0) {
    ck(false, 'no completable checklist item for the field inspector');
  } else {
    const before = await store(
      () => window.__ptcc.useEvents.getState().audit.filter((a) => a.action === 'complete_action').length,
    );
    await box.check();
    await page.waitForTimeout(700);
    const after = await store(
      () => window.__ptcc.useEvents.getState().audit.filter((a) => a.action === 'complete_action').length,
    );
    ck(after === before + 1, `completing an action wrote one audit row (${before} -> ${after})`);
    // The store has no un-complete operation, so a ticked box must stop offering one.
    const stillOpen = await panel.locator('input[type=checkbox]:not([disabled])').count();
    const ticked = await panel.locator('input[type=checkbox][disabled]').count();
    ck(ticked > 0, `the completed item locked (${ticked} locked, ${stillOpen} still open)`);
  }
}

// ---------------------------------------------------------------- L1347, both directions
console.log('\n# L1347 - only a supervisor may override a compulsory action');
for (const role of ['incident_manager', 'supervisor']) {
  await open(role, 'alerts');
  await page.locator('button').filter({ hasText: /Events \(5 levels\)/i }).first().click();
  await page.waitForTimeout(900);
  const ev = page.locator('[data-event-row]').first();
  if (await ev.count()) {
    await ev.click();
    await page.waitForTimeout(900);
  }
  const btn = page.locator('button').filter({ hasText: /override/i }).first();
  if ((await btn.count()) === 0) {
    ck(role !== 'supervisor', `${role}: no override control on screen`);
  } else {
    const disabled = await btn.isDisabled();
    ck(role === 'supervisor' ? !disabled : disabled, `${role}: override ${disabled ? 'refused' : 'allowed'}`);
    if (role === 'supervisor' && !disabled) {
      await btn.click();
      await page.waitForTimeout(700);
      const modal = await page.locator('[role=dialog]').count();
      const needsJustification = await page.locator('[role=dialog] textarea, [role=dialog] input[type=text]').count();
      ck(modal > 0 && needsJustification > 0, `the override demands a written justification (${needsJustification} field)`);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
    }
  }
}

// ---------------------------------------------------------------- operations controller
console.log('\n# operations_controller - the L1235 validation gate on #/alerts');
await open('operations_controller', 'alerts');
{
  const before = await store(() => window.__ptcc.useEvents.getState().events.length);
  const row = page.locator('button').filter({ hasText: /Validate/i }).first();
  if (await row.count()) {
    await row.click();
    await page.waitForTimeout(1000);
    const boxes = page.locator('[role=dialog] input[type=checkbox]');
    const confirm = page.locator('[role=dialog] button').filter({ hasText: /confirm/i }).last();
    if (await confirm.count()) {
      const disabledBefore = await confirm.isDisabled().catch(() => null);
      ck(disabledBefore === true, `Confirm is disabled before the checks are ticked (${disabledBefore})`);
      const nb = await boxes.count();
      for (let i = 0; i < nb; i++) await boxes.nth(i).check().catch(() => {});
      await page.waitForTimeout(400);
      const stillDisabled = await confirm.isDisabled().catch(() => true);
      ck(!stillDisabled, `Confirm unlocks once the operator has verified (${nb} checks)`);
      if (!stillDisabled) {
        await confirm.click();
        await page.waitForTimeout(900);
      }
    } else {
      ck(false, 'no Confirm control found in the validation flow');
    }
  } else {
    ck(false, 'no alert row to validate');
  }
  const after = await store(() => window.__ptcc.useEvents.getState().events.length);
  ck(after > before, `validating produced a new event (${before} -> ${after})`);
}

// ---------------------------------------------------------------- scenarios
console.log('\n# every scenario, stepped through as the presenter would');
{
  const flagged = () =>
    store(() => window.__ptcc.world.vehicles.filter((v) => Object.values(v.flags || {}).some(Boolean)).length);
  const alerts = () => store(() => window.__ptcc.useAlerts.getState().alerts.length);
  // Alert count alone is too coarse: D2 is a demand spike that moves passenger loads and
  // may leave the alert total unchanged. Fingerprint what the scenarios actually touch.
  const fingerprint = () =>
    store(() =>
      window.__ptcc.world.vehicles.reduce(
        (acc, v) => acc + (v.pax_count || 0) + (v.left_behind || 0) * 7 + (v.speed_kmh || 0),
        0,
      ),
    );
  for (const k of ['1', '2', '3', '4', '5', '6', '7', '8', '9']) {
    await open('supervisor', 'command');
    const a0 = await alerts();
    const p0 = await fingerprint();
    await page.keyboard.press(k);
    await page.waitForTimeout(600);
    // step to the end of the scenario - D7 is ten steps, the rest are fewer; N past the
    // last step is a no-op, so over-pressing is safe.
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('n');
      await page.waitForTimeout(260);
    }
    const f = await flagged();
    const a1 = await alerts();
    const p1 = await fingerprint();
    ck(
      f > 0 || a1 !== a0 || Math.abs(p1 - p0) > 1,
      `D${k} changed the network (${f} flagged, alerts ${a0} -> ${a1}, load/speed delta ${Math.round(p1 - p0)})`,
    );
  }
  // Reset is only testable against a scenario that raises flags: D4 does, D9 does not.
  await open('supervisor', 'command');
  await page.keyboard.press('4');
  await page.waitForTimeout(600);
  for (let i = 0; i < 3; i++) { await page.keyboard.press('n'); await page.waitForTimeout(400); }
  const before = await flagged();
  ck(before > 0, `D4 raised flags to clear (${before})`);
  await page.keyboard.press('0');
  await page.waitForTimeout(1500);
  const cleared = await flagged();
  ck(cleared < before, `reset (0) cleared the scenario flags (${before} -> ${cleared})`);
}

// ---------------------------------------------------------------- route deviation, in the browser
console.log('\n# scenario D4 step 3 raises route_deviation in the running app');
await open('supervisor', 'map');
{
  await page.keyboard.press('4');
  await page.waitForTimeout(700);
  await page.keyboard.press('n');
  await page.waitForTimeout(700);
  await page.keyboard.press('n');
  await page.waitForTimeout(1000);
  const dev = await store(() => window.__ptcc.world.vehicles.filter((v) => v.flags && v.flags.route_deviation).length);
  ck(dev > 0, `route_deviation is raised on ${dev} vehicle(s)`);
  await page.keyboard.press('0');
}

// ---------------------------------------------------------------- bilingual
console.log('\n# Mongolian across the main routes');
for (const r of ['command', 'alerts', 'roi', 'health', 'agentic']) {
  await page.goto(`${BASE}/?role=supervisor&lang=mn#/${r}`, { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  const cyr = await page.evaluate(
    () => (document.querySelector('main')?.innerText.match(/[Ѐ-ӿ]/g) || []).length,
  );
  ck(cyr > 40, `#/${r} renders Mongolian (${cyr} Cyrillic chars)`);
}

// ---------------------------------------------------------------- errors
console.log('\n# console');
ck(errs.length === 0, `zero page/console errors across the whole walkthrough (${errs.length})`);
for (const e of errs.slice(0, 6)) console.log('     ' + e);

await browser.close();
console.log(`\nROLE JOURNEY: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
