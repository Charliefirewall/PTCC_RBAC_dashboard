import { describe, expect, it } from 'vitest';
import { AXIS, CHART_BASE, SET_OPTION_OPTS } from './EChart';

describe('shared chart readability defaults', () => {
  it('keeps labels and tooltips inside responsive panels', () => {
    expect(CHART_BASE.grid.containLabel).toBe(true);
    expect(CHART_BASE.tooltip.confine).toBe(true);
  });

  it('provides a consistent readable axis-name style', () => {
    expect(AXIS.nameTextStyle.fontSize).toBeGreaterThanOrEqual(10);
    expect(AXIS.nameTextStyle.color).toBeTruthy();
  });

  it('replaces variable-length chart collections so removed series cannot linger', () => {
    expect(SET_OPTION_OPTS.notMerge).toBe(false);
    expect(SET_OPTION_OPTS.replaceMerge).toEqual(expect.arrayContaining(['series', 'legend', 'xAxis', 'yAxis']));
  });
});
