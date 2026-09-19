/**
 * The demo video: narration + what is on screen while it plays.
 *
 * One file drives everything. `tts.mjs` reads `say` to synthesise the voice-over and
 * measures how long each line actually takes; `record.mjs` reads `act` and holds each
 * scene for exactly that measured duration, so picture and voice cannot drift apart.
 *
 * EVERY NUMBER SPOKEN HERE WAS READ OFF THE RUNNING APPLICATION, at the deterministic
 * point the recording pauses at. The tone is confident because the product earns it —
 * but an audience that later finds one figure was invented stops believing all of them,
 * so nothing here is rounded up, and "on these assumptions" stays in the ROI line
 * because that is what the screen itself says.
 */

export const VOICE = 'Microsoft David Desktop';
export const RATE = -1; // slightly under default: measured, not hurried

/** Pause the simulation so the figures the narration quotes are the figures on screen. */
const freeze = (p) => p.evaluate(() => window.__ptcc.engine.pause());
const run = (p) => p.evaluate(() => window.__ptcc.engine.start());
const wait = (p, ms) => p.waitForTimeout(ms);

/**
 * Navigation without reloading. The whole video is ONE page load: a reload would replay
 * the warm-up and flash "Building network..." at every scene cut. Role and language are
 * store writes, the route is a hash change, and both are live in under a frame.
 */
const hash = (p, r) => p.evaluate((x) => { location.hash = x; }, r);
const role = (p, r) => p.evaluate((x) => window.__ptcc.useSettings.setState({ role: x }), r);
const lang = (p, l) => p.evaluate((x) => window.__ptcc.useSettings.setState({ lang: x }), l);

/** Queue a camera move and return immediately - see the note in the map scene. */
const zoomSoon = (p, z) =>
  p.evaluate((x) => { requestAnimationFrame(() => window.__ptccMap?.setZoom(x)); }, z);

export const SCENES = [
  {
    id: '01-open',
    async go() {},
    say: `Ulaanbaatar moves eleven hundred buses a day. This is P T C C Smart Operation Management: a single control centre that turns that fleet into something one team can see, understand, and direct. Seven operator roles. One platform.`,
    async act(p) {
      await wait(p, 1500);
      // Drift down the role list so the seven roles register as real, distinct jobs.
      await p.mouse.move(960, 400);
      await wait(p, 1200);
      await p.mouse.wheel(0, 240);
    },
  },

  {
    id: '02-command',
    // Entered by clicking the role card, not by URL - the audience sees the real door.
    async go(p) {
      await p.locator('button').filter({ hasText: /Operations Controller/i }).first().click();
      await wait(p, 1200);
    },
    say: `The morning starts here. Of one thousand and eighty-six buses in service, twelve need attention. That sentence is the whole product. Normal operation stays quiet in the background, and the exceptions come forward. Your controller opens this screen and already knows where to look. No scrolling. No hunting. No spreadsheet.`,
    async act(p) {
      await wait(p, 2500);
      await freeze(p); // the quoted figures are now the figures on screen
      await wait(p, 2000);
      await p.mouse.move(700, 250);
      await wait(p, 2000);
      await p.mouse.move(700, 430);
    },
  },

  {
    id: '03-priority',
    // Same screen as the scene before: no navigation, the narration just moves the eye.
    async go() {},
    say: `Alerts are ranked by impact: severity multiplied by the passengers actually affected. A twenty minute gap on a busy corridor outranks a minor fault on a quiet one. The most valuable action of the shift is always the first row on the list.`,
    async act(p) {
      await freeze(p);
      await wait(p, 1500);
      await p.mouse.move(1500, 400);
      await wait(p, 1500);
      await p.mouse.move(1500, 460);
      await wait(p, 1500);
      await p.mouse.move(1500, 520);
    },
  },

  {
    id: '04-map',
    async go(p) { await role(p, 'supervisor'); await hash(p, '#/map'); await wait(p, 2500); },
    say: `Every bus is on the map, on the real street network, facing the direction it is travelling. Colour tells the story at a glance: on time, slower than usual, disrupted. Zoom in and the clusters open into individual vehicles. Click any one of them, and the whole platform follows that bus.`,
    async act(p) {
      await run(p); // the fleet must be moving for this one
      await wait(p, 5000);
      // Fire-and-forget. `setZoom` is synchronous in the page and re-tiles 1,100 markers;
      // awaiting the evaluate made Playwright wait out the whole repaint, which under the
      // recorder took 7-10s per call and pushed this scene 123s past its narration.
      await zoomSoon(p, 12.4);
      await wait(p, 5000);
      await zoomSoon(p, 13.6);
      await wait(p, 4000);
      await p.evaluate(() => {
        const v = window.__ptcc.world.vehicles.find((x) => x.status === 'in_service');
        if (v) window.__ptcc.useSelection.getState().selectVehicle(v.vehicle_id);
      });
    },
  },

  {
    id: '05-governance',
    async go(p) { await hash(p, '#/alerts'); await wait(p, 1500); },
    say: `When something needs a decision, the platform proposes and a person decides. An alert becomes a live incident only when an operator confirms it against a verification checklist. Compulsory actions block the workflow until they are complete. Only a supervisor can override, and only with a written justification, recorded in the audit trail. Control stays exactly where your policy puts it.`,
    async act(p) {
      await freeze(p);
      await wait(p, 3000);
      const validate = p.locator('button').filter({ hasText: /Validate/i }).first();
      if (await validate.count()) {
        await validate.click().catch(() => {});
        await wait(p, 4000);
        // Tick the checklist slowly, so the audience watches Confirm unlock one step at a
        // time. The dialog is left OPEN: closing it here put an ordinary alert list under
        // the most governance-heavy twenty seconds of the whole narration. Scene 6 closes it.
        const boxes = p.locator('[role=dialog] input[type=checkbox]');
        const n = await boxes.count();
        for (let i = 0; i < n; i++) {
          await boxes.nth(i).check().catch(() => {});
          await wait(p, 2200);
        }
      }
    },
  },

  {
    id: '06-agents',
    async go(p) {
      await p.keyboard.press('Escape').catch(() => {}); // close scene 5's dialog
      await wait(p, 600);
      await hash(p, '#/agentic');
      await wait(p, 1500);
    },
    say: `Six specialist agents watch the network continuously: regularity, equipment, safety, patterns, demand and response. Each one detects a condition, reasons about it, shows its evidence, and recommends an action. Then it stops. The agents do the analysis. Your people keep the authority. That boundary is built into the software, not a setting someone can switch off.`,
    async act(p) {
      await freeze(p);
      await wait(p, 3000);
      await p.mouse.move(400, 420);
      await wait(p, 3000);
      const row = p.locator('main button').filter({ hasText: /Agent|gap|Rule/i }).nth(2);
      if (await row.count()) await row.click().catch(() => {});
      await wait(p, 3000);
      await p.mouse.wheel(0, 220);
    },
  },

  {
    id: '07-health',
    async go(p) { await hash(p, '#/health'); await wait(p, 1500); },
    say: `Fleet health turns telemetry into a maintenance plan: which components are wearing, which buses to inspect next, and how many passengers are riding on at risk vehicles today. Problems get found in the depot, instead of on the road.`,
    async act(p) {
      await freeze(p);
      await wait(p, 3000);
      await p.mouse.wheel(0, 280);
      await wait(p, 3000);
      await p.mouse.wheel(0, 320);
    },
  },

  {
    id: '08-roi',
    async go(p) { await hash(p, '#/roi'); await wait(p, 1500); },
    say: `And this is what it is worth. Avoided breakdowns, condition based servicing, energy and accident costs, all converted into tögrög. On the assumptions shown, and every one of them is editable, live, in front of you, the model returns a net annual benefit of four point three five billion, against a platform cost of five hundred and twenty eight million. Payback in one point three months.`,
    async act(p) {
      await freeze(p);
      await wait(p, 4000);
      await p.mouse.move(1100, 220);
      await wait(p, 4000);
      await p.mouse.move(1250, 330);
      await wait(p, 4000);
      await p.mouse.wheel(0, 260);
    },
  },

  {
    id: '09-reach',
    async go(p) { await hash(p, '#/command'); await wait(p, 1200); await lang(p, 'mn'); },
    // Wall mode is set through the store, not by pressing W. The hotkey is deliberately
    // inert while an overlay is open (a presenter must not flip the wall from behind a
    // dialog), and an earlier take left a drawer open - so the keypress did nothing and
    // the narration claimed a video wall the viewer never saw.

    say: `It runs in English and in Mongolian, across every screen. It runs on the video wall, readable from across the room. And it runs with the network unplugged: the map, the fonts, every asset is on board. A control room should never go dark because a connection did.`,
    async act(p) {
      await freeze(p);
      await wait(p, 8000);
      // BOTH settings. `preset` drives the 2.2x type scale; `mode` swaps in the wall
      // LAYOUT. Setting preset alone moved the CSS variable and changed nothing a viewer
      // could see - the narration promised a video wall over an ordinary desktop screen.
      await p.evaluate(() => window.__ptcc.useSettings.setState({ mode: 'wall', preset: 'wall' }));
      await wait(p, 6000);
    },
  },

  {
    id: '10-close',
    async go(p) {
      await p.evaluate(() =>
        window.__ptcc.useSettings.setState({ mode: 'operator', preset: 'laptop', lang: 'en' }),
      );
      await wait(p, 1200);
      await hash(p, '#/command');
    },
    say: `Seven roles. Eighteen screens. A governance model that keeps your people in charge, and a number at the end that pays for itself. P T C C Smart Operation Management. Ready to demonstrate today.`,
    async act(p) {
      await run(p);
      await wait(p, 4000);
      await p.evaluate(() => { location.hash = '#/map'; });
      await wait(p, 4000);
    },
  },
];
