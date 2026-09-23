# PTCC Demo — Presenter Script: SOP ladder, Forecast, Analytics

**Version:** 1.0 · **Date:** 23 September 2026
**Build:** `ptcc-demo`, branch `feat/ptcc-precision`
**Covers:** PTCC's three suggested scenarios (live SOP alerts, short-term forecast, long-term analytics)
**Length:** about 12 minutes · **Data:** everything is SIMULATED (say so once at the start; the banner stays on screen)

---

## Before you start (1 minute, off stage)

1. Open the demo: `http://<host>:8080/?role=operations_controller#/command`. If Mongolian should be the starting language, add `&lang=mn`.
2. Confirm you see:
   - the **"Next hour (forecast)"** panel above the priority alerts;
   - the clock is moving;
   - the DEMO banner.
3. Press **0** once so every scenario starts from clean.
4. Keys you will use:

| Key | Does |
|---|---|
| **P** | start PTCC's scenario D10 (Level 1) |
| **N** | next level (L2, then L3) |
| **Shift+P** | same scenario, advancing by itself every 45 s: use it if you want to talk, not press |
| **Space** | pause / resume the simulation |
| **L** | English ↔ Mongolian |
| **0** | reset everything |

---

## Part 1 — Live delay alerts and the SOP ladder (5 min)

| # | Do | Point at | Say |
|---|---|---|---|
| 1.1 | Go to **Alerts**. Press **P**. | The new row with a blue **L1** badge and an amber **"Sending in 30 s"** pill with **Cancel** | "Route R10 is 7 minutes late: route level, Level 1. PTCC's SOP says execute automatically. The system will notify the driver and operator dispatch by itself, but it first shows a countdown so a controller can stop it." |
| 1.2 | Wait about 3 seconds. | The pill turns green: **"Auto-sent to driver / OCC · CM-…"**, with **Revoke** | "Sent, and logged in the audit trail with 'system' as the actor. It is a notification, not a control action: the system never moves a bus. If it was wrong, Revoke." |
| 1.3 | Press **N**. | An amber **L2** row for R5, ~17 min, with its proposed action as a button (e.g. **"Adjust headway / hold following buses →"**) | "Level 2, medium: one route past 15 minutes. The system proposes, and a person approves. Clicking opens the SOP actions for sign-off." |
| 1.4 | Press **N**. | Rows move up a level. A red **L3** row for R7, and the network row **"8 routes delayed — worst 32 min · <corridor>"** | "Now five more routes are late at the same time. PTCC's rule: 5 or more routes lifts every late route one level. The network alert also says **where**: the stretch most of these routes share." |
| 1.5 | On the L3 row, point to **Escalate** and **Traffic draft**. Click **Traffic draft**. | Comms → a red-bordered **"Draft — not sent"** to TCC | "Level 3 means escalate and communicate with the Traffic department. The system has written the request, with the routes and the corridor, but a person sends it." |
| 1.6 | Click **Send**. Wait about 6 seconds. | A green **"↩ TCC acknowledged (SIMULATED)…"** line under the message | "Here the loop closes: TCC replies. This reply is simulated, since there is no PTCC–TCC link yet, but it shows where the reply would land and that it is recorded." |
| 1.7 | Back to **Alerts** and click the bus number **↗** on the R7 row. | The bus **Trip** tab | "This is the drill-down PTCC asked for:" point at each panel below. |
| 1.8 | Walk the Trip tab top to bottom. | • **Driver:** masked name, ID, shift, radio<br>• **Position:** mini-map and "Open on map"<br>• **Speed this trip** and **passenger load**<br>• **What has been done about this alert:** raised, escalated, draft, sent, TCC acknowledged<br>• **Chart:** this trip vs the normal trip, shaded normal range, violet forecast for stops still ahead<br>• **Table:** every stop with planned, actual, **+x min**, normal, difference | "Car number, driver, real-time position, speed history this trip, every stop with its deviation, and the comparison with a normal trip at a similar time. Violet is forecast, for the stops the bus hasn't reached yet." |

---

## Part 2 — Short-term forecast (3 min)

| # | Do | Point at | Say |
|---|---|---|---|
| 2.1 | **Alerts → Forecast** tab. | Violet rows, each **"81% chance · +15 min"** with an L-badge | "Same table, same levels, but these haven't happened yet. Each row says how likely it is. Violet means forecast everywhere in the product." |
| 2.2 | Click **+30m**, **+45m**, **+1h**. | Rows change or fade | "The further ahead, the less certain, and delays that are clearing drop off." |
| 2.3 | Click **All horizons**. | A route × horizon matrix | "One view of how the next hour develops, route by route." |
| 2.4 | Back to the list, click **How?** on a row. | The 3-step explanation with this row's numbers | "No black box: normal delay for that time and day, plus how far the route is from normal now, fading over 30 minutes, plus any road that is unusually slow right now. Hover the percentage to see the model's own confidence, capped at 0.6 because it's a demo model." |
| 2.5 | Scroll to **Forecast vs what happened**. | Scorecard: ✓ / ≈ / ✗ rows and hit rates per horizon | "Every forecast is checked when its time comes. This is how you'd hold a forecast to account. It needs about 15 simulated minutes after the disruption to fill up." |
| 2.6 | *(If asked, "what if nothing is happening?")* Press **0**, open Forecast. | Greyed **watch list** | "When no route reaches the listing chance, it still shows the five routes closest to it." |
| 2.7 | Go to **Command Centre**. | **Next hour (forecast)** panel | "And the headline is on the main dashboard, one click from the detail." |

---

## Part 3 — Long-term analytics (3 min)

| # | Do | Point at | Say |
|---|---|---|---|
| 3.1 | **Analytics → Route profile**, route **R7**, day **Mon**, start **08:00**. | The whole trip across all stops: normal band, normal line, violet forecast, bars for delay added per road segment | "Pick a route, a day of the week, a start time, and see the whole trip stop by stop against the normal range." |
| 3.2 | Set **Compare with: Fri**. | A second, muted band | "Friday against Monday for the same trip." |
| 3.3 | Switch to **Day heatmap**. Click a warm cell. | Start time × stop, red where delay builds; the click jumps back to that trip | "The whole day at once: when and where this route loses time." |
| 3.4 | **Hotspots** tab, **Mon**, **AM peak**. | Top 5 road segments, recognisable central stretches, with a proposed action each | "The five segments that cost buses the most time, from the history, by day and time window, each with a proposed action in advance." |
| 3.5 | Click **Draft** on row 1, then **Show on map**. | Button reads "Drafted"; the map highlights the 5 segments in violet | "The proposal becomes a draft request to TCC or the operator, sent from Comms by a person. And here they are on the map." |

---

## Close (30 s)

"Three scenarios, one product:
- the live SOP ladder, where Level 1 acts by itself but can be stopped, Level 2 proposes and Level 3 escalates to the Traffic department;
- a forecast that explains itself and keeps score;
- analytics that turn history into proposed actions.

Everything you saw is simulated, and every threshold is PTCC's to set in Settings."

---

## If something goes wrong

| Symptom | Fix |
|---|---|
| Nothing happens on P / N | Click on an empty area of the page first (a focused button eats the key), then press again. |
| L1 went straight to "Auto-sent" before you could show Cancel | That's fine: say "it waited 30 seconds; here's Revoke instead". To show Cancel, press Space right after P. |
| Forecast tab empty and no watch list | Wait for one forecast refresh (a few seconds) or press P. |
| No ✓/✗ in the scorecard yet | It needs about 15 sim-minutes after the disruption; say so and move on. |
| Need a clean restart | Press **0**. For a full reload, use F5 (the simulation restarts at 07:40). |
