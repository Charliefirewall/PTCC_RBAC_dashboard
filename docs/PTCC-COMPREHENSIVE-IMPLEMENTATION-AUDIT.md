# PTCC comprehensive implementation audit

Audit date: 2026-09-23

The application is a deterministic demonstration. Live, historical, passenger, driver and forecast values are simulated unless a source/evidence tag says otherwise. Forecasts remain separate from confirmed alerts and cannot be validated or executed as actual events.

| Area | Requirement | Before | Final status | Implementation / evidence |
| --- | --- | --- | --- | --- |
| Live Map | Dynamic vehicle hover | Missing | Implemented | Per-rendered-vehicle card with route/direction, trip, crew identifiers, deviation, load band, next stop/distance, service state, alert and route forecast |
| Live Map | Context-preserving Open Details | Partial | Implemented | Map-origin and trip ID retained in the hash; vehicle detail opens on Trip and returns to Map |
| Vehicle | Position, speed, route/trip, progress, stops, history, forecast, alerts | Partial | Implemented | Existing Vehicle Detail/Trip view enhanced with explicit trip/progress context |
| Headway | Readable labels and responsive spacing | Partial | Implemented | Contained grid, thinned 45° timestamps, confined tooltip and responsive chart sizing |
| Headway | Actual vs planned headway | Partial | Implemented | Planned timetable series, dashed reference/mark line, legend, tooltip difference and scale inclusion |
| Command Centre | Larger forecast panel | Partial | Implemented | Responsive 2×2 15/30/45/60 horizon panel with route, expected deviation, chance, confidence, impact and SOP level |
| Trip comparison | Meaningful axes and baseline distinction | Partial | Implemented | Stop sequence and schedule-deviation axes, actual series, normal mean/band, forecast and previous-trip legend |
| Charts | Global axes, units, legends, tooltips and containment | Partial | Implemented | All 10 ECharts audited; shared contained grid, confined tooltip, themed axis titles and accessible chart labels |
| UI shell | Responsive navigation, hierarchy and page organization | Partial | Implemented | Grouped mobile navigation drawer, responsive top bar, route-focus announcements, command-centre reflow and context-aware operational brief/map insight |
| Accessibility | Keyboard tabs, loading/error states and data tables | Partial | Implemented | APG roving-tab behavior, named tab panels, route focus management, retryable async boundaries, named keyboard-scroll tables and live pagination status |
| Alerts | Partial vehicle search | Missing | Implemented | Composable pure filter over vehicle ID / bus parameter |
| Alerts | Today/yesterday/7/30/custom dates | Missing | Implemented | Inclusive operational-local-date ranges and date inputs |
| Alerts | Combined severity/type/vehicle/date filters | Missing | Implemented | One predicate used for current and historical actual alerts |
| Alerts | Historical drill-down | Missing | Implemented | Immutable resolution snapshot: route/vehicle/trip/driver, position, speed, load, stops, related events and forecast-at-resolution evidence |
| Forecast | Primary navigation module | Missing | Implemented | Role-aware `#/forecast` route and direct Command Centre hand-off |
| Forecast | 15/30/45/60-minute horizons | Partial (Alerts only) | Implemented | First-class list/matrix workspace backed by the existing deterministic forecast store |
| Forecast | Prediction vs actual distinction | Implemented | Preserved/enhanced | Forecast color/dashed treatment, explicit simulated/model labels, no validation/acknowledgement actions |
| Forecast | Drill-down and evidence | Partial | Implemented | Route/segment/outlook, affected live vehicles, current metrics, historical analytics link, model terms and read-only SOP preview |
| SOP | L1 automatic, L2 proposed, L3 escalation | Implemented | Preserved/validated | Existing actual-event ladder remains intact; proactive Analytics proposals and escalation-review requests have distinct provenance and cannot become confirmed L3 events automatically |
| Analytics | Route/day/start-time whole-trip forecast | Partial | Implemented | Independent deterministic pre-trip forecast for every stop with scheduled/norm/forecast arrivals, segment and cumulative deviation, confidence, state transitions, onset, evidence and interactive stop detail |
| Analytics | Top five delay segments and time/day patterns | Partial | Implemented | Route/day/exact-start-aware top five with affected-service estimate, frequency, recurrence, persistence, most-affected days/windows, contribution and upcoming-trip risk |
| Analytics | Data-supported proposed action | Partial | Implemented | Traceable evidence and rationale produce a role-gated proactive draft; high analytical risk can request senior/TCC review without fabricating an SOP policy or actual incident |
| Communications | Traffic Department hand-off | Partial | Implemented | Analytics proposal and escalation-review intents carry segment/route/day/start, reason, evidence and recommended action into Comms; TCC dispatch remains a deliberate manual telephone action |
| Production dependencies | How-and-feel placeholders | Missing | Implemented | Connected `Analytics & Review → Production previews` workspace covers persistent history, calibrated forecast outputs, observed AVL analytics, digital Traffic Department hand-off, intervention outcome monitoring and source readiness without fabricating records |
| Workflow | Detect → investigate → compare → predict → recommend → escalate → monitor | Partial | Implemented | Cross-links connect alerts, map, vehicle/trip, route analytics, forecast, SOP and communications without treating predictions as facts |

## Validation

- TypeScript strict project check: passed.
- Production Vite build: passed (704 modules).
- Vitest: 31 files, 260 tests passed.
- Playwright functional suite: 20 tests passed, including production-preview disclosure/navigation, responsive-shell coverage and end-to-end Analytics/forecast/action/escalation journeys.
- Live-hover journey repeated three times to cover overlapping rendered vehicle glyphs: passed 3/3.
- Responsive UI audit: seven contracts passed across 390/768/1024/1280/1440/1680 widths, dark/light themes, 1920/3840 wall mode, headings, APG tab behavior, context preservation, route focus, tab stops and overlay behavior; zero contract breaches and zero console/page errors.
- Integration verifier: 51/51 passed; presenter journey 16/16 passed; role journey 35/35 passed.

## Deliberate limitations and dependencies

- Historical alert records are session-memory snapshots capped at 1,000; production requires persisted telemetry/event storage and retention policy.
- Historical rows accumulate only when real simulated alerts clear; the UI does not seed fabricated historical incidents.
- Forecast attribution is route-level because the available deterministic model does not produce independent per-vehicle forecasts.
- Forecast duration is displayed as not estimated because the current model has no defensible duration output.
- Driver enrichment is limited to the existing deterministic demo profile and remains evidence-labelled.
- Hover applies to individual vehicle glyphs; aggregate cluster bubbles intentionally represent multiple vehicles and do not claim one vehicle's details.
- SOP actions remain bound to the existing centralized playbooks; no operational policy was invented for this implementation.
- The long-term route and segment history is an explicitly labelled deterministic, stationary eight-week demo baseline. A production deployment requires persisted AVL segment observations; historical trend direction is intentionally reported as unavailable rather than fabricated.
- Affected-service counts and probabilities are estimates derived from planned headway and the synthetic baseline, not observed unique buses.
- TCC/Traffic Department delivery is a human-gated manual telephone workflow because no external agency integration is available.
- Production-dependent capabilities remain visible as interactive layout previews with working links to the nearest implemented workspace. They are marked `FUTURE`/not connected and never emit fake records or success states.
