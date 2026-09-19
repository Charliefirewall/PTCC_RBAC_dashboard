# Architecture

How the demo is put together, and why each part is the way it is. Read
[`../README.md`](../README.md) first for what the product does.

---

## 1. The shape of it

```
main.tsx  →  App  →  RoleSelect | Shell
                        │
                        ├── NavRail      role-filtered, live badges
                        ├── TopBar       clock, sim controls, ask bar, theme
                        ├── <module>     one of 18 route modules
                        └── OverlayHost  drawer · modal · toast, one owner
```

Routing is hash-based (`#/command`, `#/map`, …) with no router dependency — 18 routes over a
`switch` is smaller than the library that would manage them. `?role=` and `&lang=` are read
once at boot so any screen is linkable, which is what makes the verification suite possible.

Every route is wrapped in an error boundary. A module that throws replaces its own panel, not
the application; overlays render outside the route boundary and so are caught separately.

---

## 2. Simulation

### Clock

| | |
|---|---|
| Tick | **5 simulated seconds**, compressed **12×** → a real tick roughly every **415 ms** |
| Render | **~18 Hz** via `requestAnimationFrame`, decoupled from the tick |
| Warm-up | 180 ticks before first paint, so the demo opens on a plausible network |

The renderer runs four times faster than the engine. It interpolates between the last two
engine positions rather than extrapolating, so it can smooth motion **without ever showing a
bus somewhere the engine has not put it**. Interpolation eases from the last *drawn* frame,
not the last world state — easing from the world state is a no-op, because the store
subscription fires *after* the engine has already mutated it.

### Determinism

No `Math.random` anywhere in `src/`. Five independent `mulberry32` streams seeded by FNV-1a
hash, so consuming randomness in one subsystem cannot shift another. The same `?seed=`
reproduces the same shift exactly — a demo you can rehearse, and a bug you can replay.

### Motion

Buses follow **real street centrelines**, not straight lines between stops.

- The road graph is extracted **offline** from the bundled OpenMapTiles vector tiles by
  [`tools/build-roads.mjs`](../tools/build-roads.mjs): **223,612 vertices / 247,017 segments**
  from 1,057 tiles, drivable classes only, weighted to prefer arterials over back alleys.
- Corridors are routed with a shortest path over that graph. **45 of 48** pairs route on road;
  the three that fail cross the Tuul river where the tiles hold no connected crossing, and they
  fall back to a straight line — listed explicitly in `ROAD_FALLBACK_PAIRS`.
- Routed paths run **1.50×** the straight-line distance, which is about right for a real city.
- Output is generated into [`src/data/roads.ts`](../src/data/roads.ts) at build time. No routing
  service, no network call, no new runtime dependency.

Longitudinal behaviour uses the **Krauss safe-velocity** car-following model: a bus brakes so
that it can still stop safely given the gap to the bus ahead and comfort deceleration. On top
of that sit stop dwell, terminus layover, per-vehicle character (some drivers run hot), and
traffic effects from scenarios. The result is that spacing, bunching and recovery emerge from
the model instead of being animated.

> A note on what this replaced: the first version drew straight lines between 36 hand-placed
> nodes with a `Math.sin()` wobble, computed a heading that no map file ever read, and wrapped
> `trip_progress` instantly at the terminus — which was the teleport. The realism work was a
> root-cause fix, not a polish pass.

---

## 3. State

Seven zustand stores, **one `set` per store per tick**:

| Store | Holds |
|---|---|
| `useSim` | Snapshot, derived metrics, tick counter, run state |
| `useAlerts` | Live alerts from the rule engine |
| `useEvents` | Validated events, their workflow stage, **and the audit trail** |
| `useComms` | Passenger messages (draft → pending → active) and coordination log |
| `useAgentic` | Agent decisions and reasoning traces |
| `useSelection` | Selected vehicle / route — the cross-screen link |
| `useSettings` | Role, language, theme, thresholds, display preset |

**Vehicle positions are deliberately not in React state.** 1,100 vehicles moving at 18 Hz
through a store would re-render the tree continuously; the map reads them straight from the
engine each frame.

### Permission guards live here

Not in the widget. See the README section on the role model for why. The guarded mutations are
`advance`, `completeAction`, `approve`, `sendCoordination` and `override`.

`advance` also carries a **600 ms per-event debounce**. The Advance button is large and the
stage it moves to is only visible on the next paint, so a double click used to walk two stages
forward and write two audit rows — an operator "skipping" a stage they never saw. A repeat
inside the window is dropped; the window only opens on a transition that actually happened, so
a blocked click stays answerable the moment its blocker clears.

### The shift handover

`store/seed.ts` opens the demo with two events the *previous shift* validated and one passenger
message they drafted. This does **not** weaken the operator-validation rule: nothing in the
running app converts an alert on its own, and the audit row and event history name that
operator rather than "system".

It exists because without it four of the seven roles landed on an empty queue, `#/analytics`
had no event to reconstruct and rendered as an empty state for the whole demo, and the
compulsory-action gate — the strongest governance control in the product — was unreachable
from any landing screen. One of the two events is carried to `response_monitoring` so the Field
Inspector's queue and that gate are both live on arrival.

---

## 4. Rules and playbooks

```
snapshot ─→ deriveMetrics ─→ evaluateRules ─→ alerts (3 levels)
                                  │
                        hysteresis: an alert must clear
                        its threshold by a margin to drop,
                        so nothing flickers on the wall
```

`playbookFor(event_type)` maps an event to its playbook; `eventTypeForAlert(rule_id, type)`
maps an alert to an event type. **Order matters in that second function** — an early version
checked the generic cases first, so `panic` routed to the towing playbook and silently lost
`preserve_evidence`, which is a resolution gate. There is a per-rule expected-playbook table in
the test suite guarding exactly this.

`gateStageFor(label_key)` decides whether a compulsory action blocks `resolution` or `closure`.
That is the whole of the L1346 gate: a stage will not advance while a compulsory action for the
*next* stage is outstanding. The gate panel is **derived from the event**, not seeded from the
return value of `advance()` — a drawer that stored the blocker list in local state went stale
the moment the ask bar replaced the drawer and the operator reopened it.

---

## 5. Map

MapLibre GL with a **fully bundled** basemap. Nothing is fetched at runtime.

| Asset | What it is |
|---|---|
| `public/tiles/` | ~19 MB of OpenMapTiles-schema vector tiles, z0–14 over the UB bbox |
| `public/fonts/` | Glyph PBFs — including Cyrillic (1024–1279) for Mongolian street names |
| `public/sprite/` | Icon sprite for the basemap style |
| `public/styles/` | The Liberty style, rewritten with relative URLs |

All four are regenerated by `npm run tiles` and are **not committed** — see the README's
attribution section.

> **Two traps worth knowing**, both documented in [`tools/fetch-tiles.mjs`](../tools/fetch-tiles.mjs):
> tiles must land on disk **decompressed** (`fetch()` transparently gunzips, and a static server
> will not re-add the `Content-Encoding` header, so a still-gzipped `.pbf` is unparseable);
> and the source maxzoom is 14 — z15 comes back empty and MapLibre overzooms from 14 anyway.

### Layers

Vehicles render as a clustered GeoJSON source with rotated bus glyphs; cluster accumulators sum
0/1 indicator properties per bus, because MapLibre has no "count where" aggregate. The
**selection halo is its own unclustered source** — it used to be a filter on the clustered
vehicle source, which meant the halo silently vanished for any bus inside a cluster, i.e. for
1,098 of 1,100 buses.

There is one opt-in online basemap (`Streets`) for context. It is never the default, and four
independent fallback triggers return to the offline network if it fails — including a watchdog
for "wifi associates but never routes", which fires no error event.

---

## 6. Design system

CSS-first Tailwind v4 (`@theme`, no config file) over a token layer in
[`src/styles/tokens.css`](../src/styles/tokens.css):

- **Spacing / radius / motion** — `--sp-1..6`, `--r-1/2/3/pill`, `--ease`, `--dur-1/2/3`
- **Type scale** — `.t-metric`, `.t-card`, `.t-body`, `.t-label`, `.t-meta`
- **Elevation** — `--shadow-1/2/3`
- **Z-index**, one ordered scale, so two overlays can never collide by accident:

  ```
  base 0 · raised 10 · sticky 20 · dropdown 100 · drawer 200 · modal 300 · toast 400 · badge 500
  ```

Both themes are generated from the same tokens, so a colour fix lands in both. Video-wall mode
scales type 2.2× for reading at 3–8 m.

### Layout rule worth repeating

A grid of fixed-height panels inside a scrolling flex column **must carry `shrink-0`**. Without
it flexbox shrinks the row — sometimes to `0px` — while its children still render at full
height, and they paint straight over the section below. That single missing class was the cause
of Cost & ROI and Fleet Health looking "unfinished". A collapsed `Panel` also sets `self-start`,
so it renders at title height instead of being stretched to match an open sibling.

---

## 7. Internationalisation

`t(key, lang, params)` over dictionaries split by area, with a build-time test asserting no
duplicate keys, EN/MN symmetry and placeholder parity.

`t()` **degrades rather than throws**. An unknown key used to raise a `TypeError`; since modules
build keys by template (`ag.act.${stage}`), one unhandled stage took the whole app down — and
overlay bodies render outside the route boundary, so there was nowhere to catch it. It now warns
in dev and returns the key. `null`, `undefined` and non-finite numbers render as `—` instead of
reaching the screen as the literal strings `"undefined"` or `"NaN"`.

The `r: true` flag marks a string a native speaker has reviewed: **181 of 1,426**.

---

## 8. Evidence grading

Every non-trivial figure carries a grade, and `E` reveals them all at once:

| Grade | Meaning |
|---|---|
| `CONFIRMED` | Traceable to a specific line of the client's design document |
| `INFERRED` | Derived from it by a stated step |
| `ASSUMPTION` | Ours, labelled as ours |
| `FUTURE` | Out of scope, shown so the gap is visible rather than hidden |

This is the mechanism that lets the demo be persuasive without overclaiming. A screen that
cannot cite its source says `ASSUMPTION` on its face.
