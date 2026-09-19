/**
 * The ROI engine has no source to be checked against — the client does not hold the
 * data. So the only thing that CAN be tested is that it is internally consistent: that
 * the terms add up to the gross, that gross minus cost is the net, and that the payback
 * is the thing the label claims it is. If that ever stops holding, the screen is lying
 * about its own arithmetic on top of being an assumption.
 */
import { describe, expect, it } from 'vitest';
import { DASH, FALLBACK_INPUTS, SCENARIOS, compute, fmtPct, fmtT, mnt, num, sanitise, scaleTo, type RoiInputs } from './engine';

const I: RoiInputs = FALLBACK_INPUTS;

describe('roi engine', () => {
  it('sums the benefit terms to the gross', () => {
    const o = compute(I);
    expect(o.terms.reduce((a, b) => a + b.annual, 0)).toBeCloseTo(o.gross, 6);
    expect(o.terms.reduce((a, b) => a + b.share, 0)).toBeCloseTo(1, 9);
  });

  it('gross - platform cost = net', () => {
    const o = compute(I);
    expect(o.gross - o.platformCost).toBeCloseTo(o.net, 6);
    expect(o.platformCost).toBeCloseTo(I.platformCostPerBusYear * I.fleetSize, 6);
  });

  it('payback is the months of gross benefit that cover one year of platform cost', () => {
    const o = compute(I);
    expect(o.paybackMonths).not.toBeNull();
    expect((o.gross / 12) * o.paybackMonths!).toBeCloseTo(o.platformCost, 4);
  });

  it('reports no payback when nothing is saved', () => {
    const o = compute({ ...I, preventedFailuresPct: 0, plannedMaintReductionPct: 0, energyReductionPct: 0, accidentReductionPct: 0 });
    expect(o.gross).toBe(0);
    expect(o.paybackMonths).toBeNull();
    expect(o.net).toBeCloseTo(-o.platformCost, 6);
  });

  it('per-km after = per-km before less the net benefit per km', () => {
    const o = compute(I);
    const fleetKm = I.annualKmPerBus * I.fleetSize;
    expect(o.perKmBefore - o.perKmAfter).toBeCloseTo(o.net / fleetKm, 6);
  });

  it('scales linearly, so per-bus x fleet = fleet total', () => {
    const one = scaleTo(I, 1);
    const all = compute(I);
    expect(one.gross * I.fleetSize).toBeCloseTo(all.gross, 4);
    expect(one.net * I.fleetSize).toBeCloseTo(all.net, 4);
    expect(one.baselineSpend * I.fleetSize).toBeCloseTo(all.baselineSpend, 4);
  });

  it('splits across operators without creating or destroying value', () => {
    const buses = [200, 180, 120];
    const total = buses.reduce((a, b) => a + b, 0);
    const all = compute({ ...I, fleetSize: total });
    const sum = buses.reduce((a, b) => a + scaleTo({ ...I, fleetSize: total }, b).net, 0);
    expect(sum).toBeCloseTo(all.net, 4);
  });

  it('uses the prediction aggregate in place of the breakdown-rate assumption', () => {
    const assumed = compute(I);
    const predicted = compute(I, 999);
    expect(assumed.failuresFromPrediction).toBe(false);
    expect(predicted.failuresFromPrediction).toBe(true);
    expect(predicted.failures).toBe(999);
    expect(predicted.failuresAvoided).toBeCloseTo(999 * (I.preventedFailuresPct / 100), 6);
  });

  it('orders the scenario presets', () => {
    const c = compute({ ...I, ...SCENARIOS.conservative }).gross;
    const b = compute({ ...I, ...SCENARIOS.base }).gross;
    const o = compute({ ...I, ...SCENARIOS.optimistic }).gross;
    expect(c).toBeLessThan(b);
    expect(b).toBeLessThan(o);
  });

  it('moves every output when one input moves', () => {
    const a = compute(I);
    const b = compute({ ...I, maintenancePerBusYear: I.maintenancePerBusYear * 2 });
    expect(b.baselineSpend).toBeGreaterThan(a.baselineSpend);
    expect(b.gross).toBeGreaterThan(a.gross);
    expect(b.net).toBeGreaterThan(a.net);
    expect(b.paybackMonths!).toBeLessThan(a.paybackMonths!);
  });

  it('formats tugrik at a readable magnitude instead of fmtCompact soup', () => {
    // The defect: 68_489_876_000 rendered as "68489876k ₮".
    expect(mnt(68_489_876_000)).toEqual({ value: '68.5', unitKey: 'roi.unitBn' });
    expect(mnt(1_234_567)).toEqual({ value: '1.23', unitKey: 'roi.unitMn' });
    expect(mnt(4_500)).toEqual({ value: '4,500', unitKey: 'roi.unitNone' });
    expect(mnt(-2_000_000_000).unitKey).toBe('roi.unitBn');
    expect(fmtPct(0.0734)).toBe('7.3 %');
  });
});

/*
 * Degenerate inputs. Every field on the ROI screen is typed by hand during a live demo,
 * and `<input type="number" min max>` clamps nothing: it styles the box. So an empty
 * field, a minus sign, twenty digits and a paste all reach the engine. None of them may
 * put "NaN", "Infinity" or "undefined" on a client's screen.
 */
describe('roi engine, degenerate inputs', () => {
  const OUT_NUMBERS = (o: ReturnType<typeof compute>) => [
    o.baselineSpend, o.failures, o.failuresAvoided, o.gross, o.platformCost, o.net,
    o.grossShareOfSpend, o.perKmBefore, o.perKmAfter,
    ...o.terms.flatMap((t) => [t.annual, t.share]),
  ];

  /*
   * The contract under test is the SCREEN's, not the arithmetic's: a figure is either a
   * real number or it renders as an em dash. Two inputs of 1e308 multiplied by a fleet
   * still overflow to Infinity - no clamp can honestly invent a finite answer there - so
   * what is guaranteed is that the overflow never reaches a client as the word.
   */
  it('never emits a number that would render as a word, whatever is typed', () => {
    const CASES: Partial<RoiInputs>[] = [
      {},                                        // the defaults
      { fleetSize: 0 },                          // an empty fleet field
      { fleetSize: 1 },                          // one bus
      { fleetSize: 1_000_000 },                  // very many
      { fleetSize: -500 },                       // a typed minus sign
      { annualKmPerBus: 0 },                     // divide-by-zero on cost per km
      { annualKmPerBus: Number.NaN },            // a paste that is not a number
      { platformCostPerBusYear: 0 },             // a free platform
      { energyPerKm: Number.POSITIVE_INFINITY }, // twenty digits
      { maintenancePerBusYear: 1e308, consumablesPerBusYear: 1e308 },
      { preventedFailuresPct: -40 },
      { breakdownsPer100BusesYear: Number.NaN, downtimeDaysPerFailure: Number.NaN },
    ];
    for (const patch of CASES) {
      for (const predicted of [undefined, 0, 250, Number.NaN, Number.POSITIVE_INFINITY]) {
        const o = compute({ ...I, ...patch }, predicted);
        for (const n of OUT_NUMBERS(o)) {
          const shown = Number.isFinite(n) || mnt(n).value === DASH;
          expect(shown, `${JSON.stringify(patch)} / ${predicted} -> ${n}`).toBe(true);
          expect(mnt(n).value).not.toMatch(/NaN|Infinity|undefined/);
        }
        // The two nullable outputs are null or a real number - never NaN, never Infinity.
        for (const n of [o.paybackMonths, o.netMultiple]) expect(n === null || Number.isFinite(n)).toBe(true);
      }
    }
  });

  it('treats a zero fleet as zero everything rather than a division', () => {
    const o = compute({ ...I, fleetSize: 0 });
    expect(o.baselineSpend).toBe(0);
    expect(o.gross).toBe(0);
    expect(o.platformCost).toBe(0);
    expect(o.net).toBe(0);
    expect(o.paybackMonths).toBeNull();
    expect(o.netMultiple).toBeNull();
    expect(o.perKmBefore).toBe(0);
    expect(o.perKmAfter).toBe(0);
  });

  it('clamps a negative quantity to zero instead of inverting the argument', () => {
    // A negative spend would otherwise produce a negative baseline and a saving that
    // reads as a gain - a wrong number that looks flattering is the worst kind here.
    const s = sanitise({ ...I, fleetSize: -10, maintenancePerBusYear: -1, energyPerKm: Number.NaN });
    expect(s.fleetSize).toBe(0);
    expect(s.maintenancePerBusYear).toBe(0);
    expect(s.energyPerKm).toBe(0);
    expect(sanitise(I)).toEqual(I); // a sane input is untouched
  });

  it('scales to a degenerate bus count without dividing by it', () => {
    for (const n of [0, -3, Number.NaN, Number.POSITIVE_INFINITY]) {
      const o = scaleTo(I, n);
      expect(OUT_NUMBERS(o).every(Number.isFinite)).toBe(true);
      expect(o.platformCost).toBe(0);
    }
  });

  it('prints an em dash rather than the words "NaN" or "Infinity"', () => {
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(mnt(bad).value).toBe(DASH);
      expect(fmtPct(bad)).toBe(DASH);
      expect(fmtT(bad, () => 'bn')).toBe(DASH);
      expect(num(bad, String)).toBe(DASH);
    }
    expect(num(42, String)).toBe('42');
  });

  it('never renders an output as a word on an absurd input', () => {
    const o = compute({ ...I, fleetSize: 1e308, driverSalaryPerBusYear: 1e308 });
    const shown = [mnt(o.gross).value, mnt(o.net).value, mnt(o.baselineSpend).value, fmtPct(o.grossShareOfSpend)];
    for (const s of shown) expect(s).not.toMatch(/NaN|Infinity|undefined/);
  });
});
