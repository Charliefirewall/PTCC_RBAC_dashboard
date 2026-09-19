/**
 * Automated UI audit.
 *
 * The client's brief asks for things that are usually checked by eye and therefore
 * checked inconsistently: "components never overlap unintentionally", "sufficient
 * contrast", "consistent across light and dark". Eyeballing 14 screens x 7 roles x 2
 * themes is not a review, it is a guess. These are the machine-checkable parts.
 *
 * Deliberately NOT asserted here (a human still has to look): visual hierarchy, whether
 * a layout is attractive, whether a collapsed default is the RIGHT default.
 *
 * WIDENED (backlog item 54, plan §12.3 rule 10, §19.1). Before, this file ran at ONE
 * viewport (1600x950), never in wall mode, and never opened an overlay - so the rule it
 * is named in ("the widened uiaudit asserts <=1 [role=dialog] and <=1 scrim") was
 * enforced nowhere in the repository, and D-3's clipped strings were invisible to it.
 * It now sweeps the four widths §19.1 names, plus wall mode, and drives every overlay
 * type through open / stack / replace / Escape / focus-return.
 *
 * Run:  npx playwright test --config=playwright.shots.config.ts tools/uiaudit.spec.ts
 */
import { expect, test, type Page } from '@playwright/test';

/** §19.1's required widths. Colour does not change with width, so the contrast and
 *  z-index sweeps stay at one width; layout checks run at all four. */
const WIDTHS = [1024, 1280, 1440, 1680];
const HEIGHT = 800;

const ROLES_TO_AUDIT = [
  'operations_controller', 'incident_manager', 'dispatcher', 'field_inspector',
  'communication_controller', 'bus_operator_occ', 'supervisor',
];

const ROUTES = [
  'command', 'map', 'regularity', 'passenger', 'alerts', 'comms',
  'health', 'operators', 'copilot', 'agentic', 'roi', 'analytics', 'multimodal', 'settings',
  'dashboard',
];

/*
 * TWO registers, and the difference is the whole point of §11.
 *
 * `note()` is ADVISORY. A clipped hint, a 4.4:1 label, a panel that shares an edge with
 * its neighbour - these want a human to look, and failing the build on them trains people
 * to ignore the build.
 *
 * `fail()` is a CONTRACT BREACH. Three things in this app are architectural promises with
 * a single owner and no call-site discretion:
 *   - the overlay contract (§12.3: one modal slot, one drawer slot, one scrim, one
 *     Escape handler, focus trapped and returned, aria-modal on the topmost only);
 *   - wall mode fitting its viewport, because the wall never scrolls, so anything past
 *     the edge is simply not on the wall;
 *   - dead tab stops, because a focusable control that does nothing is a keyboard
 *     operator walking into a wall.
 * Those cannot regress quietly, so they are assertions, not console output.
 */
const findings: string[] = [];
const breaches: string[] = [];
const note = (s: string) => {
  if (!findings.includes(s)) findings.push(s);
};
const fail = (s: string) => {
  if (!breaches.includes(s)) breaches.push(s);
  note(s);
};

/**
 * One boot per (width, theme, role, mode); every route change after that is a hash
 * change, which is what the app's own nav does.
 *
 * The sweep used to `page.goto()` 90+ times, and each goto rebuilds the 1,100-vehicle
 * world from scratch - that boot, not the checks, was most of the 4-45 minute runtime and
 * both timeouts. Booting once per context makes the run bounded and roughly linear in the
 * number of ROUTES rather than in route x width x theme.
 */
let ctxKey = '';
async function visit(
  page: Page,
  o: { width: number; height: number; theme: 'dark' | 'light'; route: string; role?: string; mode?: string },
) {
  const role = o.role ?? 'operations_controller';
  const key = `${o.width}x${o.height}/${o.theme}/${role}/${o.mode ?? ''}`;
  const q = `?theme=${o.theme}&role=${role}${o.mode ? `&mode=${o.mode}` : ''}`;
  if (key !== ctxKey) {
    await page.setViewportSize({ width: o.width, height: o.height });
    await page.goto(`/${q}#/${o.route}`);
    ctxKey = key;
  } else {
    // A hash change is what the app's own nav does, and it skips the 1,100-vehicle world
    // rebuild. It can still throw "execution context destroyed" if the dev server chose
    // that moment to reload the page, so fall back to the full load rather than aborting
    // the whole sweep on an event that is not a finding.
    try {
      await page.evaluate((r) => { location.hash = `#/${r}`; }, o.route);
    } catch {
      await page.goto(`/${q}#/${o.route}`);
    }
  }
  // The world is warmed on boot; before that every module renders its empty state and
  // the sweep would measure a blank screen.
  await page
    .waitForFunction(() => !/Building network/.test(document.body.textContent ?? ''), null, { timeout: 30_000 })
    .catch(() => note(`[boot] ${o.route}: never finished building the network`));
  await page.waitForFunction(
    () => (document.querySelector('main, .wall')?.textContent ?? '').trim().length > 40,
    null,
    { timeout: 20_000 },
  ).catch(() => note(`[boot] ${o.route}: rendered no content`));
  // Wall mode has no <main>, so "some content rendered" above can be satisfied by a
  // half-mounted tree. Wait for the subtree the wall checks actually measure.
  if (o.mode === 'wall') await page.locator('.wall').waitFor({ timeout: 20_000 });
  // MapLibre needs a paint; everything else is settled by the waits above.
  await page.waitForTimeout(o.route === 'map' ? 1400 : 350);
}

/**
 * page.evaluate that survives a page reload.
 *
 * The dev server reloads on every save, and a reload mid-evaluate throws "execution
 * context was destroyed" - which aborted the whole sweep and, worse, looked like a
 * failing check. It is not a finding about the UI, so it is retried once and then given
 * up on rather than reported.
 */
async function evalSafe<T>(page: Page, fn: () => T, fallback: T): Promise<T> {
  for (let i = 0; i < 2; i++) {
    try {
      return await page.evaluate(fn);
    } catch (e) {
      if (!/context was destroyed|Execution context|Target closed/i.test(String(e))) throw e;
      await page.waitForTimeout(1500);
    }
  }
  return fallback;
}

/* ------------------------------------------------------------------ overlap
 * Only FLOATING things can overlap "unintentionally" - normal flow elements sharing
 * edges is just layout. So: take every fixed/absolute/sticky element plus anything
 * with a dialog/menu/tooltip role, and test it against text-bearing elements that are
 * neither its ancestor nor its descendant. Anything else drowns the signal in
 * false positives from parents containing their own children.
 */
async function overlapCheck(page: Page, where: string) {
  const hits = await evalSafe(page, () => {
    const out: string[] = [];
    const all = Array.from(document.querySelectorAll<HTMLElement>('body *'));

    const visible = (el: HTMLElement) => {
      const s = getComputedStyle(el);
      if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) < 0.05) return false;
      const r = el.getBoundingClientRect();
      return r.width > 2 && r.height > 2;
    };

    const floating = all.filter((el) => {
      if (!visible(el)) return false;
      const s = getComputedStyle(el);
      const role = el.getAttribute('role') ?? '';
      return (
        ['fixed', 'absolute', 'sticky'].includes(s.position) ||
        ['dialog', 'menu', 'tooltip', 'listbox'].includes(role)
      );
    });

    // Text-bearing leaves: elements whose own direct text is non-trivial.
    const leaves = all.filter((el) => {
      if (!visible(el)) return false;
      const own = Array.from(el.childNodes)
        .filter((n) => n.nodeType === Node.TEXT_NODE)
        .map((n) => n.textContent ?? '')
        .join('')
        .trim();
      return own.length > 2;
    });

    const related = (a: Node, b: Node) => a.contains(b) || b.contains(a);
    const area = (r: DOMRect) => r.width * r.height;

    // Effective stacking level: a text leaf is almost always z-index:auto, and what
    // actually decides paint order is its nearest positioned ancestor. Comparing raw
    // leaf values made the map canvas appear to cover the legend drawn on top of it.
    const effZ = (el: HTMLElement): number => {
      let p: HTMLElement | null = el;
      while (p && p !== document.body) {
        const zs = getComputedStyle(p).zIndex;
        if (zs !== 'auto') {
          const n = Number(zs);
          if (Number.isFinite(n)) return n;
        }
        p = p.parentElement;
      }
      return 0;
    };

    for (const f of floating) {
      if (f.tagName === 'CANVAS') continue;
      const fr = f.getBoundingClientRect();
      // Pointer-transparent overlays (the DEMO badge, decorative gradients) cannot
      // obstruct anything the operator is trying to click or read.
      if (getComputedStyle(f).pointerEvents === 'none') continue;
      // The scrim and the dialog covering the page are not overlap bugs, they are the
      // whole point of a modal layer. Without these two skips the overlay checks report
      // ~50 findings for the overlay system working exactly as §12.3 specifies.
      if (f.hasAttribute('data-overlay-scrim')) continue;
      if (f.closest('[role=dialog]') || f.querySelector('[role=dialog]')) continue;
      for (const l of leaves) {
        if (related(f, l)) continue;
        const lr = l.getBoundingClientRect();
        const ix = Math.max(0, Math.min(fr.right, lr.right) - Math.max(fr.left, lr.left));
        const iy = Math.max(0, Math.min(fr.bottom, lr.bottom) - Math.max(fr.top, lr.top));
        const overlap = ix * iy;
        if (overlap <= 0) continue;
        // Must cover a meaningful share of the text element to count as obscuring it.
        if (overlap / Math.max(1, area(lr)) < 0.35) continue;
        // If the floating element sits BEHIND, it is a backdrop, not an obstruction.
        if (effZ(f) < effZ(l)) continue;
        const label = (l.textContent ?? '').trim().slice(0, 40);
        const fid = f.className?.toString().slice(0, 40) || f.tagName;
        out.push(`"${label}" covered by <${f.tagName.toLowerCase()} class="${fid}">`);
      }
    }
    return [...new Set(out)].slice(0, 6);
  }, [] as string[]);
  for (const h of hits) note(`[overlap] ${where}: ${h}`);
}

/* ------------------------------------------------------------------ overflow */
async function overflowCheck(page: Page, where: string): Promise<string[]> {
  const hits = await evalSafe(page, () => {
    const out: string[] = [];
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('body *'))) {
      const s = getComputedStyle(el);
      if (s.display === 'none' || s.visibility === 'hidden') continue;
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) continue;
      if (r.right > vw + 2 || r.bottom > vh + 2 || r.left < -2) {
        // Scroll containers are allowed to have content outside the viewport.
        let p: HTMLElement | null = el.parentElement;
        let scrollable = false;
        while (p) {
          const ps = getComputedStyle(p);
          if (['auto', 'scroll'].includes(ps.overflowY) || ['auto', 'scroll'].includes(ps.overflowX)) {
            scrollable = true;
            break;
          }
          p = p.parentElement;
        }
        if (scrollable) continue;
        out.push(`<${el.tagName.toLowerCase()} class="${el.className?.toString().slice(0, 36)}"> extends to ${Math.round(r.right)}x${Math.round(r.bottom)} (viewport ${vw}x${vh})`);
      }
    }
    return [...new Set(out)].slice(0, 5);
  }, [] as string[]);
  for (const h of hits) note(`[overflow] ${where}: ${h}`);
  return hits;
}

/* ------------------------------------------------------------------ clipped text
 * Defect D-3, as a machine check. `truncate` (overflow hidden + ellipsis) is a legitimate
 * tool for a name, and a lie for a number: "gap 28 min > 20 min" ellipsised to "gap 28
 * min >" removes the threshold the operator is being asked to judge. This counts every
 * element whose own text does not fit its own box, which is the measurable half.
 */
async function clippedTextCheck(page: Page, where: string) {
  const hits = await evalSafe(page, () => {
    const out: string[] = [];
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('body *'))) {
      const s = getComputedStyle(el);
      if (s.display === 'none' || s.visibility === 'hidden') continue;
      const own = Array.from(el.childNodes)
        .filter((n) => n.nodeType === Node.TEXT_NODE)
        .map((n) => n.textContent ?? '')
        .join('')
        .trim();
      if (own.length < 2) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) continue;
      if (el.scrollWidth > el.clientWidth + 1 && ['hidden', 'clip'].includes(s.overflowX)) {
        out.push(`"${own.slice(0, 32)}" needs ${el.scrollWidth}px, has ${el.clientWidth}px`);
      }
    }
    return [...new Set(out)];
  }, [] as string[]);
  for (const h of hits) note(`[clipped] ${where}: ${h}`);
  return hits.length;
}

/* ------------------------------------------------------------------ scroll affordance
 * The other half of D-3: content that does not fit AND cannot be scrolled to is simply
 * gone. `main` was `overflow-hidden`, so 31px of the bottom panel row vanished at 1024
 * with nothing on screen to suggest it existed.
 */
async function scrollAffordanceCheck(page: Page, where: string) {
  const hit = await page.evaluate(() => {
    const m = document.querySelector<HTMLElement>('main');
    if (!m) return null;
    const s = getComputedStyle(m);
    const over = m.scrollHeight - m.clientHeight;
    if (over > 2 && ['hidden', 'clip'].includes(s.overflowY)) return `main clips ${over}px with overflow-y:${s.overflowY}`;
    return null;
  }, [] as string[]);
  if (hit) note(`[clipped-layout] ${where}: ${hit}`);
}

/* ------------------------------------------------------------------ contrast
 * WCAG AA is 4.5:1 for body text, 3:1 for large text. We resolve the effective
 * background by walking ancestors until something is not transparent, which is what
 * the eye does too.
 */
async function contrastCheck(page: Page, where: string) {
  const hits = await evalSafe(page, () => {
    const parse = (c: string): [number, number, number, number] | null => {
      const m = c.match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const p = m[1]!.split(',').map((x) => parseFloat(x));
      return [p[0]!, p[1]!, p[2]!, p[3] ?? 1];
    };
    const lum = (r: number, g: number, b: number) => {
      const f = (v: number) => {
        const x = v / 255;
        return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const bgOf = (el: HTMLElement): [number, number, number] => {
      let p: HTMLElement | null = el;
      while (p) {
        const c = parse(getComputedStyle(p).backgroundColor);
        if (c && c[3] > 0.5) return [c[0], c[1], c[2]];
        p = p.parentElement;
      }
      return [0, 0, 0];
    };
    const out: string[] = [];
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('body *'))) {
      const own = Array.from(el.childNodes)
        .filter((n) => n.nodeType === Node.TEXT_NODE)
        .map((n) => n.textContent ?? '')
        .join('')
        .trim();
      if (own.length < 3) continue;
      const s = getComputedStyle(el);
      if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) < 0.5) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) continue;
      const fg = parse(s.color);
      if (!fg || fg[3] < 0.5) continue;
      const bg = bgOf(el);
      const L1 = lum(fg[0], fg[1], fg[2]);
      const L2 = lum(bg[0], bg[1], bg[2]);
      const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
      const px = parseFloat(s.fontSize);
      const bold = Number(s.fontWeight) >= 700;
      const large = px >= 24 || (px >= 18.66 && bold);
      const need = large ? 3 : 4.5;
      if (ratio < need) {
        out.push(`"${own.slice(0, 28)}" ${ratio.toFixed(2)}:1 (needs ${need}) ${s.color} on rgb(${bg.join(',')})`);
      }
    }
    return [...new Set(out)].slice(0, 8);
  }, [] as string[]);
  for (const h of hits) note(`[contrast] ${where}: ${h}`);
}

/* ------------------------------------------------------------------ z-index discipline */
async function zIndexCheck(page: Page, where: string) {
  const hits = await evalSafe(page, () => {
    // The token scale in tokens.css. Anything floating outside this set was set by
    // hand and is exactly how overlap bugs get reintroduced.
    // The --z-* token scale in tokens.css, PLUS 199.
    //
    // 199 is `calc(var(--z-drawer) - 1)`, the shared scrim in OverlayHost. It is off the
    // token set by design: the scrim must sit exactly one step under the lowest floating
    // layer, and inventing a --z-scrim token for it would let a future call site pick a
    // scrim depth independent of the drawer it belongs to. Without this entry the audit
    // false-positives on the architecture's own rule every time an overlay is open, which
    // is why the overlay checks below could not have been added around it.
    const allowed = new Set([0, 10, 20, 100, 199, 200, 300, 400, 500]);
    const out: string[] = [];
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('body *'))) {
      const s = getComputedStyle(el);
      if (s.zIndex === 'auto') continue;
      const z = Number(s.zIndex);
      if (!Number.isFinite(z) || allowed.has(z)) continue;
      // Third-party stylesheet we do not control (MapLibre's own controls).
      if (el.className?.toString().includes('maplibregl-')) continue;
      out.push(`z-index:${z} on <${el.tagName.toLowerCase()} class="${el.className?.toString().slice(0, 36)}">`);
    }
    return [...new Set(out)].slice(0, 6);
  });
  for (const h of hits) note(`[z-index] ${where}: ${h}`);
}

/* ------------------------------------------------------------------ overlays
 * Plan 12.3 rule 10, and the reason this file exists at all: the architecture's whole
 * claim is ONE modal slot, ONE drawer slot, ONE scrim, ONE Escape handler. Until now
 * nothing in the repository checked it - the wave's overlay verification lived in
 * throwaway scripts outside the repo, so the next refactor could reintroduce defect D-2
 * (two composited scrims, Escape closing neither) with a green test suite.
 *
 * These drive real UI, not the store, so they cover the wiring too.
 */

/**
 * Wait (bounded) for the visible dialog count to reach `want`, then report what it
 * actually is. A fixed `waitForTimeout` after an Escape raced the React commit on a loaded
 * machine and reported "the first Escape left 0 dialogs" for a drawer that was simply not
 * repainted yet - a flake dressed up as a contract breach, which is the fastest way to
 * teach a team to ignore a red build.
 */
async function settledDialogs(page: Page, want: number, ms = 3_000): Promise<number> {
  await page
    .waitForFunction(
      (n) => document.querySelectorAll('[role=dialog]').length === n,
      want,
      { timeout: ms },
    )
    .catch(() => {});
  return page.locator('[role=dialog]').count();
}

/** The invariant, asserted after every open. */
async function overlayInvariants(page: Page, where: string) {
  const r = await page.evaluate(() => {
    const dialogs = Array.from(document.querySelectorAll<HTMLElement>('[role=dialog]'));
    const visible = dialogs.filter((d) => d.getClientRects().length > 0);
    return {
      dialogs: visible.length,
      ariaModal: visible.filter((d) => d.getAttribute('aria-modal') === 'true').length,
      scrims: document.querySelectorAll('[data-overlay-scrim]').length,
      focusInside: visible.some((d) => d.contains(document.activeElement)),
      labelled: visible.every((d) => {
        const id = d.getAttribute('aria-labelledby');
        return !!id && !!document.getElementById(id);
      }),
    };
  });
  // Rule 1 allows at most one modal AND one drawer, so two dialogs is legal only in the
  // stacked case; three never is.
  if (r.dialogs > 2) fail(`[overlay] ${where}: ${r.dialogs} visible [role=dialog] - rule 1 allows one modal + one drawer`);
  if (r.ariaModal > 1) fail(`[overlay] ${where}: ${r.ariaModal} dialogs claim aria-modal - rule 7 allows one`);
  if (r.scrims > 1) fail(`[overlay] ${where}: ${r.scrims} scrims - rule 3 allows exactly one (defect D-2)`);
  if (r.dialogs > 0 && !r.focusInside) fail(`[overlay] ${where}: focus is outside the open dialog (rule 6)`);
  if (!r.labelled) fail(`[overlay] ${where}: a dialog has no resolvable aria-labelledby (rule 7)`);
  return r;
}

/** Rule 6: Tab must not walk out of an open layer. Eight Tabs is more than any dialog
 *  here has focusable children, so a working trap must have wrapped at least once. */
async function focusTrapCheck(page: Page, where: string) {
  for (let i = 0; i < 8; i++) await page.keyboard.press('Tab');
  const inside = await page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>('[role=dialog]'))
      .filter((d) => d.getClientRects().length > 0)
      .some((d) => d.contains(document.activeElement)),
  );
  if (!inside) {
    const landed = await page.evaluate(() => document.activeElement?.outerHTML.slice(0, 80) ?? 'null');
    fail(`[overlay] ${where}: 8 Tabs escaped the focus trap - landed on ${landed}`);
  }
}

const ALERTS = '/?theme=dark&role=operations_controller#/alerts';

/**
 * Validate the first alert into an event. It is the only route to a DRAWER over which a
 * MODAL can legally open, which is the only two-dialog state rule 7 permits - and the one
 * state where "exactly one aria-modal" can actually be violated.
 *
 * NOTE on modal-replaces-modal: it is no longer reachable from the UI, because presenter
 * hotkeys (H, 0-9, W, L) are deliberately blocked while any layer is open - an operator
 * must not have a dialog swapped under them mid-action. That is the stronger guarantee, so
 * this file asserts the reachable paths and the store keeps the replace-path fix.
 */
async function validateFirstAlert(page: Page): Promise<boolean> {
  const action = page.locator('[data-alert-action]').first();
  if ((await action.count()) === 0) return false;
  await action.click();
  const dialog = page.locator('[role=dialog]');
  await dialog.waitFor({ timeout: 10_000 }).catch(() => {});
  const boxes = dialog.locator('input[type=checkbox]');
  const n = await boxes.count();
  for (let i = 0; i < n; i++) await boxes.nth(i).check().catch(() => {});
  const confirm = dialog.getByRole('button', { name: /Confirm & create event/i });
  if (!(await confirm.isEnabled().catch(() => false))) return false;
  await confirm.click();
  await page.waitForTimeout(600);
  return true;
}

async function overlayChecks(page: Page) {
  // ---- modal, opened from a real trigger (the recommended action on an alert row)
  await page.goto(ALERTS);
  await page.waitForTimeout(2500);
  const trigger = page.locator('[data-alert-action]').first();
  if ((await trigger.count()) === 0) {
    fail('[overlay] no [data-alert-action] trigger on #/alerts - the modal path is UNVERIFIED');
  } else {
    await trigger.click();
    await page.waitForTimeout(500);
    await overlayInvariants(page, 'modal/open');
    await focusTrapCheck(page, 'modal');
    await overlapCheck(page, 'modal/open');
    await zIndexCheck(page, 'modal/open');

    // Rule 2: ONE Escape closes the top layer. Two were needed while the profile menu
    // installed a second global Escape handler.
    await page.keyboard.press('Escape');
    const left = await settledDialogs(page, 0);
    if (left > 0) fail(`[overlay] one Escape left ${left} dialog(s) open (rule 2)`);
    // Rule 6: focus returns to the trigger, never to <body>.
    const landed = await page.evaluate(() => document.activeElement?.tagName ?? 'null');
    if (landed === 'BODY' || landed === 'HTML') {
      fail('[overlay] focus fell to <body> after close instead of returning to the trigger (rule 6)');
    }
    const scrims = await page.locator('[data-overlay-scrim]').count();
    if (scrims !== 0) fail(`[overlay] ${scrims} scrim(s) survived the close (rule 3)`);
  }

  // ---- drawer, from the ask bar
  await page.goto('/?theme=dark&role=operations_controller#/command');
  await page.waitForTimeout(2200);
  const ask = page.locator('[data-askbar="top"]');
  if ((await ask.count()) === 0) {
    fail('[overlay] no ask bar on #/command - the drawer path is UNVERIFIED');
  } else {
    await ask.click();
    await ask.press('Enter');
    await page.waitForTimeout(1000);
    await overlayInvariants(page, 'drawer/open');
    await focusTrapCheck(page, 'drawer');
    await overlapCheck(page, 'drawer/open');
    await zIndexCheck(page, 'drawer/open');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(350);
    if ((await page.locator('[role=dialog]').count()) > 0) fail('[overlay] one Escape did not close the drawer (rule 2)');
  }

  // ---- the ONLY legal two-dialog state: a modal over a drawer. Supervisor, because the
  // override that opens the modal is supervisor-only (L1347).
  await page.goto('/?theme=dark&role=supervisor#/alerts');
  await page.waitForTimeout(2500);
  if (!(await validateFirstAlert(page))) {
    fail('[overlay] could not validate an alert into an event - the stacked modal-over-drawer state is UNVERIFIED');
  } else {
    // The event drawer is open at stage `creation`; the gate sits at `resolution`.
    const advance = page.getByRole('button', { name: /^Advance to/ });
    let blocked = false;
    for (let i = 0; i < 6; i++) {
      const b = advance.first();
      if (!(await b.isVisible().catch(() => false)) || !(await b.isEnabled().catch(() => false))) break;
      await b.click();
      await page.waitForTimeout(400);
      if ((await page.locator('[data-gate-blocked]').count()) > 0) { blocked = true; break; }
    }
    if (!blocked) {
      fail('[overlay] the L1346 gate never blocked, so the stacked state is UNVERIFIED (and see e2e/smoke.spec.ts)');
    } else {
      await page.locator('[data-gate-blocked]').getByRole('button', { name: /Override/i }).first().click();
      await page.waitForTimeout(600);
      const r = await overlayInvariants(page, 'modal-over-drawer');
      if (r.dialogs !== 2) fail(`[overlay] modal-over-drawer produced ${r.dialogs} dialog(s), expected the drawer plus the modal`);
      await focusTrapCheck(page, 'modal-over-drawer');
      await overlapCheck(page, 'modal-over-drawer');
      await zIndexCheck(page, 'modal-over-drawer');
      // Rule 2: modal first, then drawer. Two Escapes, two layers, nothing left.
      await page.keyboard.press('Escape');
      const mid = await settledDialogs(page, 1);
      if (mid !== 1) fail(`[overlay] the first Escape left ${mid} dialog(s) - it must close the modal and leave the drawer (rule 2)`);
      await page.keyboard.press('Escape');
      if ((await settledDialogs(page, 0)) > 0) fail('[overlay] two Escapes left a dialog open over a drawer (rule 2)');
    }
  }

  // ---- the toast stack: capped at 3 (12.2), and it must not cover anything (rule 3)
  await page.goto(ALERTS);
  await page.waitForTimeout(2500);
  const rowButtons = page.locator('[data-alert-row] button');
  const total = Math.min(await rowButtons.count(), 30);
  let clicked = 0;
  for (let i = 0; i < total && clicked < 5; i++) {
    const b = rowButtons.nth(i);
    const label = (await b.textContent()) ?? '';
    if (!/acknowledge/i.test(label)) continue;
    await b.click().catch(() => {});
    clicked++;
    await page.waitForTimeout(150);
  }
  if (clicked === 0) fail('[overlay] found no Acknowledge button - the toast stack is UNVERIFIED');
  const toasts = await page.locator('[data-toast]').count();
  if (toasts > 3) fail(`[overlay] ${toasts} toasts visible - 12.2 caps the stack at 3`);
  if (toasts > 0) await overlapCheck(page, 'toasts');

  // ---- rule 5: a route change force-closes every layer
  await page.locator('[data-alert-action]').first().click().catch(() => {});
  await page.waitForTimeout(500);
  await page.goto('/?theme=dark&role=operations_controller#/health');
  await page.waitForTimeout(1400);
  const after = await page.evaluate(() => ({
    dialogs: document.querySelectorAll('[role=dialog]').length,
    scrims: document.querySelectorAll('[data-overlay-scrim]').length,
  }));
  if (after.dialogs || after.scrims) {
    fail(`[overlay] a route change left ${after.dialogs} dialog(s) and ${after.scrims} scrim(s) open (rule 5)`);
  }

  // ---- wall mode: the host used to portal to <body>, OUTSIDE the .wall subtree, so every
  // overlay rendered at laptop size on a 3 m surface read at 3-8 m. H is the only overlay
  // trigger on the wall canvas (it has no TopBar and no clickable rows).
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/?theme=dark&role=operations_controller&mode=wall#/command');
  // Wait for the world, not for a stopwatch. A fixed 3 s sleep raced the boot on a loaded
  // machine and reported "H opened no dialog" - a flake reported as a contract breach is
  // worse than no check, because the next person learns to re-run until it is green.
  await page
    .waitForFunction(() => !/Building network/.test(document.body.textContent ?? ''), null, { timeout: 30_000 })
    .catch(() => {});
  await page.locator('.wall').waitFor({ timeout: 15_000 }).catch(() => {});
  // H is a TOGGLE, so "press again if nothing happened" is only safe once the listener is
  // definitely attached - otherwise press 1 opens the modal, press 2 closes it again and
  // the check reports a dialog that did open. So: wait for the wall canvas to have real
  // content (Shell mounted, hotkeys bound), press once, and give it a generous wait.
  await page
    .waitForFunction(() => (document.querySelector('.wall')?.textContent ?? '').trim().length > 200, null, { timeout: 30_000 })
    .catch(() => {});
  await page.keyboard.press('h');
  await page.locator('[role=dialog]').waitFor({ timeout: 10_000 }).catch(() => {});
  const wallOv = await page.evaluate(() => {
    const d = Array.from(document.querySelectorAll<HTMLElement>('[role=dialog]')).find((x) => x.getClientRects().length > 0);
    if (!d) return null;
    const wall = document.querySelector<HTMLElement>('.wall');
    const h = d.querySelector('h2');
    return {
      insideWall: !!wall && wall.contains(d),
      titlePx: h ? parseFloat(getComputedStyle(h).fontSize) : 0,
      // The RENDERED wall base, not the raw --wall-scale token. tokens.css clamps the
      // rendered size by viewport width (2.2 is budgeted for a 3840 signal; the same 3 m
      // surface driven at 1920 has pixels twice as big, so 2.2 there is 2x too large and
      // overflowed the no-scroll canvas). What must hold is that the overlay scales WITH
      // the wall - comparing against the unclamped token asserts a size that no longer
      // exists at any width but 3840.
      wallFs: wall ? parseFloat(getComputedStyle(wall).fontSize) : 0,
      scale: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--wall-scale')) || 1,
    };
  });
  if (!wallOv) {
    fail('[overlay] wall mode: H opened no dialog - UNVERIFIED');
  } else {
    if (!wallOv.insideWall) fail('[overlay] wall mode: the dialog renders outside .wall, so nothing scales it');
    // The dialog head is 0.82em of the wall base. Anything near the 13px operator size
    // means the wall scale never reached the overlay at all - which is the defect this
    // check exists for (the host used to portal OUTSIDE the .wall subtree).
    if (wallOv.wallFs < 16 || wallOv.titlePx < wallOv.wallFs * 0.75) {
      fail(`[overlay] wall mode: dialog title is ${wallOv.titlePx}px against a .wall base of ${wallOv.wallFs}px (--wall-scale ${wallOv.scale}) - the wall scale did not reach the overlay`);
    }
  }
  await overlayInvariants(page, 'wall/modal');
  await overlapCheck(page, 'wall/modal');
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 1440, height: HEIGHT });
}

/* ------------------------------------------------------------------ the run
 *
 * One test per concern, rather than one 45-minute test that timed out twice and told you
 * nothing about WHICH phase died. Each test carries its own budget, so a slow machine
 * degrades one phase instead of losing the whole run, and a failure names its own subject.
 *
 * Order matters: `advisory findings` prints the collected notes and must run last.
 * playwright.config.ts pins workers: 1 and fullyParallel: false, so file order is run order.
 */

const errors: string[] = [];
const watchErrors = (page: Page) => {
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + String(e).slice(0, 160)));
};

const clippedByWidth: Record<number, number> = {};

/**
 * Layout across the four widths section 19.1 names. ADVISORY: a clipped hint or a shared
 * edge wants a human, not a red build.
 *
 * Colour and z-index do not change with width, so they run once per theme at 1440 -
 * sweeping them four times quadruples the run for four identical answers. The theme only
 * doubles at 1440 for the same reason: the two themes share one type scale and one set of
 * metrics, so their LAYOUT is identical by construction.
 */
test('layout, contrast and z-index across four widths and both themes (advisory)', async ({ page }) => {
  test.setTimeout(20 * 60_000);
  watchErrors(page);
  ctxKey = '';
  for (const width of WIDTHS) {
    let clipped = 0;
    for (const theme of (width === 1440 ? (['dark', 'light'] as const) : (['dark'] as const))) {
      for (const route of ROUTES) {
        await visit(page, { width, height: HEIGHT, theme, route });
        const applied = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
        if (applied !== theme) note(`[theme] ${route}: data-theme is "${applied}", expected "${theme}"`);

        const where = `${width}/${theme}/${route}`;
        await overlapCheck(page, where);
        await overflowCheck(page, where);
        clipped += await clippedTextCheck(page, where);
        await scrollAffordanceCheck(page, where);
        if (width === 1440) {
          await contrastCheck(page, where);
          await zIndexCheck(page, where);
        }
      }
    }
    clippedByWidth[width] = clipped;
  }
});

/**
 * WALL MODE, and this one FAILS.
 *
 * The wall is a fixed no-scroll canvas on a 3 m x 10 m surface read at 3-8 m (L276-L296,
 * L2217, L2353). There is no scrollbar and no operator to scroll it: a panel whose box
 * ends past the viewport is content that is simply not on the wall. It is also the mode
 * most likely to be photographed. So overflow here is a contract breach, not a note.
 *
 * Both signal widths are checked. 3840 is the client's actual wall; 1920 is the same
 * physical surface driven at half the pixels, where --wall-scale 2.2 is twice too large in
 * physical terms - tokens.css clamps the RENDERED size for exactly that reason.
 */
test('wall mode fits its viewport at 1920 and 3840, both themes', async ({ page }) => {
  test.setTimeout(6 * 60_000);
  watchErrors(page);
  ctxKey = '';
  const over: string[] = [];
  for (const theme of ['dark', 'light'] as const) {
    for (const [w, h] of [[1920, 1080], [3840, 1080]] as const) {
      await visit(page, { width: w, height: h, theme, route: 'command', mode: 'wall' });
      const where = `wall-${w}/${theme}`;
      const scaled = await page.evaluate(() => {
        const wall = document.querySelector<HTMLElement>('.wall');
        if (!wall) return null;
        return {
          fs: parseFloat(getComputedStyle(wall).fontSize),
          scale: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--wall-scale')) || 1,
        };
      });
      expect(scaled, `${where}: no .wall subtree - wall mode did not render`).not.toBeNull();
      // The fix that --wall-scale follows `mode` as well as `preset`: ?mode=wall alone
      // must still produce 2.2, whatever the clamp then does to the rendered size.
      expect(scaled!.scale, `${where}: --wall-scale is ${scaled!.scale}, expected 2.2 from ?mode=wall`).toBeGreaterThanOrEqual(2);
      // ...and the rendered size must still be wall-sized, not laptop-sized.
      expect(scaled!.fs, `${where}: .wall renders at ${scaled!.fs}px - too small to read at 3-8 m`).toBeGreaterThanOrEqual(16);

      for (const hit of await overflowCheck(page, where)) over.push(`${where}: ${hit}`);
      await overlapCheck(page, where);
      await clippedTextCheck(page, where);
      if (theme === 'dark') await zIndexCheck(page, where);
    }
  }
  expect(over, `wall mode overflows its own viewport:\n  ${over.join('\n  ')}`).toEqual([]);
});

/** Role dashboards, the role-entry gate, headings and form labelling. ADVISORY. */
test('role dashboards, headings and accessible names (advisory)', async ({ page }) => {
  test.setTimeout(15 * 60_000);
  watchErrors(page);
  ctxKey = '';

  for (const role of ROLES_TO_AUDIT) {
    for (const theme of ['dark', 'light'] as const) {
      await visit(page, { width: 1440, height: HEIGHT, theme, route: 'dashboard', role });
      const where = `${theme}/role:${role}`;
      await overlapCheck(page, where);
      await overflowCheck(page, where);
      await clippedTextCheck(page, where);
      await contrastCheck(page, where);
      await zIndexCheck(page, where);
    }
  }

  // The role-entry gate itself (no ?role=, so the landing screen shows).
  ctxKey = '';
  for (const theme of ['dark', 'light'] as const) {
    await page.setViewportSize({ width: 1440, height: HEIGHT });
    await page.goto(`/?theme=${theme}`);
    await page.waitForTimeout(1200);
    await contrastCheck(page, `${theme}/role-select`);
    await overlapCheck(page, `${theme}/role-select`);
    await overflowCheck(page, `${theme}/role-select`);
    // Governance: the DEMO badge is never dismissible and never absent. It was missing
    // from this screen alone, which is also the most screenshotted one.
    const badge = await page.evaluate(() => /simulated data/i.test(document.body.textContent ?? ''));
    if (!badge) note(`[governance] ${theme}/role-select: the DEMO badge is absent`);
  }

  // Every route must announce a name (19.1). Shell renders exactly one <h1>.
  ctxKey = '';
  for (const route of ROUTES) {
    await visit(page, { width: 1440, height: HEIGHT, theme: 'dark', route });
    const h = await page.evaluate(() => ({
      h1: document.querySelectorAll('h1').length,
      text: document.querySelector('h1')?.textContent?.trim() ?? '',
    }));
    if (h.h1 === 0) note(`[heading] ${route}: no <h1>`);
    else if (h.h1 > 1) note(`[heading] ${route}: ${h.h1} <h1> elements`);
    else if (h.text.length === 0) note(`[heading] ${route}: the <h1> is empty`);
  }

  // The active nav row must be announced, not only coloured.
  await visit(page, { width: 1440, height: HEIGHT, theme: 'dark', route: 'alerts' });
  const current = await page.locator('nav [aria-current="page"]').count();
  if (current !== 1) note(`[nav] ${current} rows carry aria-current="page" on #/alerts, expected 1`);

  // Every form control must have an accessible name.
  for (const route of ['settings', 'comms', 'alerts'] as const) {
    await visit(page, { width: 1440, height: HEIGHT, theme: 'dark', route });
    const unnamed = await page.evaluate(() => {
      const out: string[] = [];
      for (const el of Array.from(document.querySelectorAll<HTMLElement>('input, select, textarea'))) {
        if (el.getClientRects().length === 0) continue;
        if ((el as HTMLInputElement).type === 'hidden') continue;
        const byAria = el.getAttribute('aria-label') || el.getAttribute('title');
        const byRef = el.getAttribute('aria-labelledby');
        const byFor = el.id ? document.querySelector(`label[for="${el.id}"]`) : null;
        const byWrap = el.closest('label');
        if (byAria || (byRef && document.getElementById(byRef)) || byFor || byWrap) continue;
        out.push(`<${el.tagName.toLowerCase()} type="${el.getAttribute('type') ?? ''}" class="${(el.className || '').toString().slice(0, 30)}">`);
      }
      return [...new Set(out)].slice(0, 6);
    });
    for (const u of unnamed) note(`[a11y] ${route}: form control with no accessible name ${u}`);
  }

  // Theme persists across navigation.
  ctxKey = '';
  await page.goto('/?theme=light&role=operations_controller#/command');
  await page.waitForTimeout(800);
  await page.goto('/?role=operations_controller#/alerts');
  await page.waitForTimeout(800);
  const persisted = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  if (persisted !== 'light') note(`[theme] did not persist across navigation - got "${persisted}"`);

  // Every collapsible panel can actually collapse and re-expand.
  ctxKey = '';
  await visit(page, { width: 1440, height: HEIGHT, theme: 'dark', route: 'command' });
  // Scoped to Panel headers. `button[aria-expanded]` on its own also matches the map's
  // "Hide legend" control, which sits under the funnel panel at some widths.
  const toggles = page.locator('section.panel > header button[aria-expanded]');
  const n = await toggles.count();
  if (n === 0) {
    note('[collapse] no collapsible panels found on the Command Centre');
  } else {
    for (let i = 0; i < Math.min(n, 4); i++) {
      const b = toggles.nth(i);
      const before = await b.getAttribute('aria-expanded');
      const ok = await b.click({ timeout: 5_000 }).then(() => true).catch(() => false);
      if (!ok) {
        note(`[collapse] toggle ${i} could not be clicked - it is obstructed or off-screen`);
        continue;
      }
      await page.waitForTimeout(250);
      const after = await b.getAttribute('aria-expanded');
      if (before === after) note(`[collapse] toggle ${i} did not change aria-expanded (${before})`);
      await b.click({ timeout: 5_000 }).catch(() => {});
      await page.waitForTimeout(200);
    }
    await overlapCheck(page, 'command/after-collapse');
  }
});

/**
 * Dead tab stops, and this one FAILS.
 *
 * A <button> that renders with `cursor: default` has no onClick, no form, no
 * aria-expanded and no href: it is announced as "button", does nothing when activated,
 * and costs a keyboard operator a Tab. 26 of 29 focusable elements on the Command Centre
 * were once exactly this. The fix (KpiTile renders a <div> when it has no onClick, and
 * Tailwind v4's dropped `cursor: pointer` restored in tokens.css) is invisible to every
 * other check in this file, so nothing else would notice it regressing.
 */
test('no dead tab stops on the Command Centre', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  watchErrors(page);
  ctxKey = '';
  await visit(page, { width: 1440, height: HEIGHT, theme: 'dark', route: 'command' });
  const dead = await page.evaluate(() => {
    const out: string[] = [];
    for (const b of Array.from(document.querySelectorAll<HTMLButtonElement>('button'))) {
      if (b.getClientRects().length === 0) continue;
      if (b.disabled || b.type === 'submit') continue;
      if (b.getAttribute('aria-expanded') !== null || b.getAttribute('aria-pressed') !== null) continue;
      if (b.style.cursor === 'pointer') continue;
      if (getComputedStyle(b).cursor === 'default') {
        out.push(`<button class="${(b.className || '').toString().slice(0, 40)}">${(b.textContent ?? '').trim().slice(0, 24)}`);
      }
    }
    return [...new Set(out)].slice(0, 10);
  });
  for (const d of dead) note(`[a11y] command: dead tab stop ${d}`);
  expect(dead, `focusable <button> elements that do nothing:\n  ${dead.join('\n  ')}`).toEqual([]);
});

/**
 * The overlay contract (plan section 12.3 rule 10), and this one FAILS.
 *
 * This is the architecture's central claim - one modal slot, one drawer slot, one scrim,
 * one Escape handler - and until this file existed nothing in the repository checked it.
 * Defect D-2 (two composited scrims, Escape closing neither) could be reintroduced with a
 * green suite. It drives real UI rather than the store, so it covers the wiring too.
 */
test('the overlay contract (plan 12.3)', async ({ page }) => {
  test.setTimeout(15 * 60_000);
  watchErrors(page);
  ctxKey = '';
  await page.setViewportSize({ width: 1440, height: HEIGHT });
  await overlayChecks(page);
  expect(breaches, `overlay contract breaches:\n  ${breaches.join('\n  ')}`).toEqual([]);
});

/** Always green. It exists to print what a human still has to look at. */
test('advisory findings', async () => {
  test.setTimeout(60_000);
  console.log(`\n=== CLIPPED STRINGS BY WIDTH (all routes; 1440 counts both themes) ===`);
  for (const w of WIDTHS) console.log(`  ${w}px: ${clippedByWidth[w] ?? 'not run'}`);
  console.log(`\n=== CONSOLE/PAGE ERRORS (${errors.length}) ===`);
  for (const e of [...new Set(errors)].slice(0, 10)) console.log('  ' + e);
  console.log(`\n=== UI FINDINGS (${findings.length}; ${breaches.length} of them are contract breaches asserted above) ===`);
  findings.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
});
