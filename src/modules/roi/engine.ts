/**
 * ROI engine. Pure arithmetic, no React, no store.
 *
 * THE POINT OF THIS FILE IS THAT IT HAS NO ANSWER IN IT.
 *
 * Plan §21, verbatim: "Do not fabricate ROI figures. The client said they do not have
 * the data." Every number below is therefore an INPUT with a stated default, not a
 * finding. `compute()` is a spreadsheet: change an input, every output moves. Nothing
 * here is calibrated against a Mongolian benchmark because no such benchmark was given
 * to us - CV: "I don't have the answer."
 *
 * Grading: every cost figure this file produces is ASSUMPTION, never INFERRED.
 * INFERRED means "follows necessarily from a client source". A cost does not.
 */

/** Every editable assumption on the screen. All money is MNT (₮). */
export interface RoiInputs {
  /** buses in the modelled fleet */
  fleetSize: number;
  /** km driven per bus per year - turns the per-km energy input into an annual figure */
  annualKmPerBus: number;

  // ---- the spend lines the client named, per bus per year unless noted
  maintenancePerBusYear: number;
  /** fuel OR electricity, ₮ per km - CV names both; the demo models one energy line */
  energyPerKm: number;
  driverSalaryPerBusYear: number;
  insurancePerBusYear: number;
  accidentCostPerBusYear: number;
  /** tyres + brakes + clutches, the consumables CV listed separately from servicing */
  consumablesPerBusYear: number;

  // ---- reliability
  /** unplanned failures per 100 buses per year */
  breakdownsPer100BusesYear: number;
  /** ₮ value of one bus-day out of service */
  downtimeValuePerDay: number;
  /** days a bus is out of service per unplanned failure */
  downtimeDaysPerFailure: number;

  // ---- the cost of the thing being justified
  platformCostPerBusYear: number;

  // ---- effectiveness levers (%). These are the scenario, and nothing else.
  /** share of unplanned failures a prediction can be acted on in time to avoid */
  preventedFailuresPct: number;
  /** reduction in planned servicing + consumables from condition-based scheduling */
  plannedMaintReductionPct: number;
  /** reduction in energy per km from driving/routing feedback */
  energyReductionPct: number;
  /** reduction in accident + insurance cost */
  accidentReductionPct: number;
}

export type RoiInputKey = keyof RoiInputs;

/**
 * Fallback defaults, used only when no simulated fleet is loaded.
 *
 * PROVENANCE, honestly: the spend lines are the midpoints of the demo's own simulated
 * per-bus cost model (modules/health/FleetHealth.ts), which is itself a placeholder
 * with no source. The reliability and effectiveness lines have no counterpart anywhere
 * - not in the deck, not in the conversation, not in R1096 - and are round numbers
 * chosen to be arguable rather than flattering.
 */
export const FALLBACK_INPUTS: RoiInputs = {
  fleetSize: 500,
  annualKmPerBus: 60_000,
  maintenancePerBusYear: 6_000_000,
  energyPerKm: 450,
  driverSalaryPerBusYear: 22_000_000,
  insurancePerBusYear: 1_800_000,
  accidentCostPerBusYear: 1_650_000,
  consumablesPerBusYear: 4_000_000,
  breakdownsPer100BusesYear: 40,
  downtimeValuePerDay: 800_000,
  downtimeDaysPerFailure: 1.5,
  platformCostPerBusYear: 480_000,
  preventedFailuresPct: 35,
  plannedMaintReductionPct: 12,
  energyReductionPct: 4,
  accidentReductionPct: 8,
};

/** The four effectiveness levers are the only thing a preset moves that is not a cost. */
export type ScenarioName = 'conservative' | 'base' | 'optimistic' | 'custom';

export const SCENARIOS: Record<Exclude<ScenarioName, 'custom'>, Pick<
  RoiInputs,
  'preventedFailuresPct' | 'plannedMaintReductionPct' | 'energyReductionPct' | 'accidentReductionPct'
>> = {
  conservative: { preventedFailuresPct: 15, plannedMaintReductionPct: 5, energyReductionPct: 1, accidentReductionPct: 3 },
  base: { preventedFailuresPct: 35, plannedMaintReductionPct: 12, energyReductionPct: 4, accidentReductionPct: 8 },
  optimistic: { preventedFailuresPct: 55, plannedMaintReductionPct: 20, energyReductionPct: 7, accidentReductionPct: 14 },
};

/** One line of "where the value comes from". `key` is an i18n key. */
export interface BenefitTerm {
  key: string;
  /** ₮ per year, whole fleet */
  annual: number;
  /** share of gross benefit, 0-1 */
  share: number;
}

export interface RoiOutputs {
  /** total annual operating spend on the stated inputs, whole fleet */
  baselineSpend: number;
  /** unplanned failures per year across the fleet, before any intervention */
  failures: number;
  /** failures avoided on the stated effectiveness */
  failuresAvoided: number;
  /** true when `failures` came from the prediction layer rather than the slider */
  failuresFromPrediction: boolean;
  terms: BenefitTerm[];
  gross: number;
  platformCost: number;
  net: number;
  /** months of gross benefit needed to cover one year of platform cost; null if never */
  paybackMonths: number | null;
  /** net / platform cost; null when the platform is free */
  netMultiple: number | null;
  /** gross benefit as a share of baseline spend, 0-1 */
  grossShareOfSpend: number;
  /** blended operating cost per km, before and after */
  perKmBefore: number;
  perKmAfter: number;
}

const pct = (n: number) => Math.max(0, n) / 100;

/**
 * Em dash, never "NaN" / "Infinity" / "undefined". `fmtInt` and `fmtMnt` in
 * components/primitives render the literal string for a non-finite input, so every call
 * site in this module routes through `num()` instead.
 */
export const DASH = '—';

/** `null` for anything that is not a real number — the outputs' existing "no answer". */
const fin = (n: number | null): number | null => (n !== null && Number.isFinite(n) ? n : null);

/** Format `n`, or an em dash when `n` is not a real number. */
export const num = (n: number, f: (n: number) => string): string => (Number.isFinite(n) ? f(n) : DASH);

/**
 * Degenerate-input guard, applied ONCE at the entry to compute() so every caller is
 * covered. Every field of RoiInputs is a non-negative quantity, so a blank field
 * (`Number('')` = 0), a pasted `NaN`, a typed minus sign and `Infinity` all collapse to
 * a value the arithmetic below can carry. This changes no result for a sane input.
 */
export function sanitise(i: RoiInputs): RoiInputs {
  const out = {} as RoiInputs;
  for (const k of Object.keys(i) as RoiInputKey[]) {
    const v = i[k];
    out[k] = Number.isFinite(v) ? Math.max(0, v) : 0;
  }
  return out;
}

/**
 * @param predictedFailuresPerYear Fleet-level aggregate of predicted interventions from
 *   Workstream P (`src/rules/predict.ts`). When supplied it REPLACES the breakdown-rate
 *   assumption as the failure count; when omitted the rate slider is used and the UI
 *   says so. This is the whole coupling - no other term touches the prediction layer.
 */
export function compute(raw_i: RoiInputs, predictedFailuresPerYear?: number): RoiOutputs {
  const i = sanitise(raw_i);
  const fleet = i.fleetSize;
  const energyPerBus = i.energyPerKm * i.annualKmPerBus;
  const perBusSpend =
    i.maintenancePerBusYear +
    i.consumablesPerBusYear +
    energyPerBus +
    i.driverSalaryPerBusYear +
    i.insurancePerBusYear +
    i.accidentCostPerBusYear;
  const baselineSpend = perBusSpend * fleet;

  const failuresFromPrediction = typeof predictedFailuresPerYear === 'number';
  const failures = failuresFromPrediction
    ? Math.max(0, Number.isFinite(predictedFailuresPerYear) ? predictedFailuresPerYear : 0)
    : (fleet / 100) * i.breakdownsPer100BusesYear;
  const failuresAvoided = failures * pct(i.preventedFailuresPct);

  const raw: { key: string; annual: number }[] = [
    // Avoided unplanned failures are valued at lost service time ONLY. The repair cost
    // of those failures sits inside the maintenance line below; counting it twice is
    // exactly the kind of flattering arithmetic §21 warns about.
    { key: 'roi.termFailures', annual: failuresAvoided * i.downtimeDaysPerFailure * i.downtimeValuePerDay },
    {
      key: 'roi.termMaint',
      annual: (i.maintenancePerBusYear + i.consumablesPerBusYear) * fleet * pct(i.plannedMaintReductionPct),
    },
    { key: 'roi.termEnergy', annual: energyPerBus * fleet * pct(i.energyReductionPct) },
    {
      key: 'roi.termSafety',
      annual: (i.insurancePerBusYear + i.accidentCostPerBusYear) * fleet * pct(i.accidentReductionPct),
    },
  ];
  const gross = raw.reduce((a, b) => a + b.annual, 0);
  const terms = raw.map((r) => ({ ...r, share: gross > 0 ? r.annual / gross : 0 }));

  const platformCost = Math.max(0, i.platformCostPerBusYear) * fleet;
  const net = gross - platformCost;
  const fleetKm = i.annualKmPerBus * fleet;

  return {
    baselineSpend,
    failures,
    failuresAvoided,
    failuresFromPrediction,
    terms,
    gross,
    platformCost,
    net,
    /* `null` is the screen's "no answer" case and it already renders honestly. An input
       large enough to overflow to Infinity produces a non-finite ratio, which is the
       same "no answer" — so it takes the same branch rather than printing "NaN". */
    paybackMonths: fin(gross > 0 ? (12 * platformCost) / gross : null),
    netMultiple: fin(platformCost > 0 ? net / platformCost : null),
    grossShareOfSpend: baselineSpend > 0 ? gross / baselineSpend : 0,
    perKmBefore: fleetKm > 0 ? baselineSpend / fleetKm : 0,
    perKmAfter: fleetKm > 0 ? (baselineSpend - gross + platformCost) / fleetKm : 0,
  };
}

/** Scale a computed result to a sub-fleet. Every term is linear in fleet size except
 *  the prediction aggregate, so re-running compute() on a smaller fleet is the honest
 *  way to get a per-operator or per-bus view rather than dividing a total. */
export function scaleTo(i: RoiInputs, buses: number, predicted?: number): RoiOutputs {
  const n = Number.isFinite(buses) ? Math.max(0, buses) : 0;
  const share = i.fleetSize > 0 ? n / i.fleetSize : 0;
  return compute({ ...i, fleetSize: n }, predicted === undefined ? undefined : predicted * share);
}

// ------------------------------------------------------------------ ₮ formatting

/**
 * `fmtCompact` is built for boardings ("17.3k") and renders a fleet's annual spend as
 * "68489876k ₮", which nobody can sanity-check - least of all on the one screen where
 * the client has no figure of their own to check it against. So: split the magnitude
 * off and let the caller render it as a unit.
 *
 * Returns the scale as an i18n key so "bn" reads "тэрбум" in Mongolian.
 */
export function mnt(n: number): { value: string; unitKey: 'roi.unitBn' | 'roi.unitMn' | 'roi.unitNone' } {
  // An absurd input overflows to Infinity, and `Infinity.toFixed()` is the string
  // "Infinity". A figure nobody can read is better shown as absent than as a word.
  if (!Number.isFinite(n)) return { value: DASH, unitKey: 'roi.unitNone' };
  const a = Math.abs(n);
  const dp = (x: number) => (x >= 100 ? 0 : x >= 10 ? 1 : 2);
  if (a >= 1e9) {
    const x = n / 1e9;
    return { value: x.toFixed(dp(Math.abs(x))), unitKey: 'roi.unitBn' };
  }
  if (a >= 1e6) {
    const x = n / 1e6;
    return { value: x.toFixed(dp(Math.abs(x))), unitKey: 'roi.unitMn' };
  }
  return { value: Math.round(n).toLocaleString('en-US'), unitKey: 'roi.unitNone' };
}

/** One-string form for tables, where a separate unit span would not fit a cell. */
export function fmtT(n: number, unit: (k: 'roi.unitBn' | 'roi.unitMn' | 'roi.unitNone') => string): string {
  if (!Number.isFinite(n)) return DASH;
  const m = mnt(n);
  const u = unit(m.unitKey);
  return `${m.value}${u ? ` ${u}` : ''} ₮`;
}

export function fmtPct(share: number, dp = 1): string {
  return Number.isFinite(share) ? `${(share * 100).toFixed(dp)} %` : DASH;
}
