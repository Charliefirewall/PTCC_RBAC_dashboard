# Testing

The verification story for this repository, including the parts that went wrong.

---

## The rule

**Every fix is pinned by a check that was verified to fail without it.** Not "a test was added"
— the fix is reverted, the failure is observed, the fix is restored. A test written against
code that already works proves only that it compiles.

## The second rule

**A check that passes for the wrong reason is worse than no check**, because it also consumes
the attention that would have found the bug. Several checks here were initially green or red
for reasons unrelated to what they claimed to measure. They are named in
[§ Checks that lied](#checks-that-lied) rather than quietly rewritten.

---

## Running everything

```bash
npm test                          # 147 unit tests, ~13 s
npm run typecheck                 # tsc -b

npm run preview                   # needed by everything below (serves :4173)
npm run verify                    # integration + journey + role-journey
npm run audit                     # UI audit: 4 widths x 2 themes + video wall, ~2.5 min

node tools/role-sweep.mts         # 63 role-screens: crashes, empty panels, clipping
node tools/overlap-sweep.mjs      # containers flex has shrunk below their content
node tools/map-offline-check.mjs  # zero off-origin requests
node tools/responsive-final.mjs   # clipping + overflow at 1024/1280/1440/1680
node tools/soak.mjs 14            # 14-minute leak and drift check
```

---

## Layers

### 1. Unit — `npm test` · 147 tests / 11 files

Vitest in the `node` environment. Covers the parts where a wrong answer is silent: simulation
physics (no bus moves further in a tick than its speed allows), rule thresholds and hysteresis,
the road graph, the ROI engine, i18n integrity, permission guards, the advance debounce, and
**the agent-autonomy boundary**.

That last one is the most important file in the suite. It asserts the agent stage clock stops
at `recommended`, that approval records a human decision and mutates nothing else, and that no
decision object carries a callable anywhere — autonomous action must not be *representable*.

### 2. Behaviour — Playwright against the production build

| Script | Checks | Scope |
|---|---|---|
| `integration-verify.mjs` | 49 | Every route × both themes: renders, zero console errors, icon sprite live |
| `journey-e2e.mjs` | 16 | The presenter's path: arrive → triage → locate → decide → act |
| `role-journey.mjs` | 35 | **Interaction.** Every role's primary action, all nine scenarios, both directions of the override rule, bilingual rendering |
| `verify-ai.mjs` | 11 | The agent reasoning chain and the stated autonomy boundary |
| `verify-motion.mjs` | 3 | Tick cadence and sub-tick interpolation (18 rendered positions per 5 engine positions) |
| `verify-fixes.mjs` | 4 | Specific regressions, including the validation gate |
| `final-check.mjs` | 12 | Navigation, bilingual rendering, demo badge |
| `map-offline-check.mjs` | 8 | **Zero off-origin requests** — the offline guarantee |

`role-journey.mjs` is the one that answers "does the demo *work*", as opposed to "does it
render". It drives real controls and asserts the store actually changed.

### 3. Visual and structural

| Script | What it catches |
|---|---|
| `uiaudit.spec.ts` | Overlap, clipping, contrast, dead tab stops, toast stacking — 4 widths × 2 themes + wall |
| `role-sweep.mts` | Per role × screen: crashes, console errors, empty panels, all-dash tiles, clipped strings |
| `overlap-sweep.mjs` | Containers a parent flex column has shrunk below their content — the cause of panels painting over each other |
| `responsive-final.mjs` | Horizontal overflow and clipping at four widths |
| `soak.mjs` | Heap growth, DOM growth, tick-rate drift over a realistic demo length |

---

## Current results

| Suite | Result |
|---|---|
| Unit | **147 / 11 files** |
| Typecheck · production build | clean |
| Integration | **49 / 49** |
| Journey | **16 / 16** |
| Role interaction | **35 / 35** |
| UI audit | **6 / 6** (2.5 min) |
| AI · Motion · Fixes · Final · Offline | **11/11 · 3/3 · 4/4 · 12/12 · 8/8** |
| Role × screen sweep | 63 screens — 0 crashes, 0 console errors, 0 empty panels, 0 clipped |
| Shrunk containers | **0** at 1280 / 1366 / 1920 |
| Responsive | 0 overflow at every width; 0 clipped at 1440 and 1680, **2 clipped at 1024** |
| Soak (14 min) | heap **45 → 45 MB**, DOM **+1 node**, 144 ticks/min, **0 errors** |

---

## Checks that lied

Kept as a record, because each one is a category of mistake that will recur.

**The Space-key check passed because the handler crashed.** It dispatched `keydown` on
`window`; the handler threw inside `el?.closest` before reaching `preventDefault`, so the
assertion "Space was not prevented" held — for exactly the wrong reason. The crash *was* the
bug. Fixed by dispatching on the focused button.

**`el?.closest` guards null but not a missing method.** Optional chaining covers `el === null`.
It does not cover `el` being a `Document`, which has no `closest`. A keydown targeted at
`document` threw. Now `instanceof Element`.

**The governance regression test could not fail.** Its baseline was `generic`, so any downgrade
*to* the generic playbook passed by definition — including the `panic` → towing downgrade it
was written to catch. Replaced with a per-rule expected-playbook table, verified to fail when
the `panic` and `tbox` cases are disabled.

**The motion test measured nothing.** Interpolation eased from `world.vehicles`, but the store
subscription fires *after* the engine mutates it, so the "previous" position was already the
new one. The test compared a value to itself. Fixed by easing from the last drawn frame — 5
engine positions now yield 18 rendered ones.

**"The map is blank."** A WebGL canvas cannot be read through `drawImage` without
`preserveDrawingBuffer`. The finding was a test artifact; the assertion is now on screenshot
size.

**Three of four journey "failures" were my own selectors** — an `sr-only <h1>`, a
`[data-alert-row]` that does not exist on `#/command`, and `__ptccMap` exposing `halo()` rather
than the raw map. The fourth was correct behaviour: the camera deliberately holds still for a
bus already on screen.

**`halo()` read a repaint-dependent API.** `querySourceFeatures` only returns features from
tiles the map has actually rendered, so on an idle map it answered `0` for a halo that was
plainly on screen. Confirmed by freezing the engine and diffing the canvas across a selection:
the pixels change, the query does not. The probe now reads what was written to the source.
**The product was correct; the check was not.**

**Test sections leaked state into each other.** Two `page.goto` calls differing only in the
hash are a same-document navigation — the app never reloads, so one section inherited the
previous section's store and passed or failed for reasons unconnected to its own subject. Every
section now routes through `about:blank` first.

**A "no Confirm control" failure was a stale label.** After `Escalate` became `Escalate…`, a
`/^assign$/` selector stopped matching. The label change was mine; so was the broken check.

**An integration check asserted an empty screen.** `#/analytics` was asserted to show "no events
yet" — true only because nothing had ever validated an alert. Once the shift handover seeded
events, the check failed. The check was wrong, not the app: it now asserts the review screen
renders real content.

---

## Reading a failure

1. **Reproduce it before explaining it.** Several "defects" above were the test.
2. **Check whether the selector still matches.** Label changes break checks silently.
3. **Check whether the probe depends on rendering.** Canvas and tile-backed APIs answer
   differently on an idle page.
4. **Check for state leaking in from the previous section.**
5. Only then look at the product.
