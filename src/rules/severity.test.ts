import { describe, expect, it } from 'vitest';
import { DEMO_DEFAULTS } from './thresholds';
import { sopLevel } from './severity';

const th = DEMO_DEFAULTS;

describe('PTCC SOP matrix', () => {
  it('uses the client-supplied thresholds', () => {
    expect([th.delay_l1_min, th.delay_l2_min, th.delay_l3_min, th.routes_affected_l2]).toEqual([5, 15, 30, 5]);
  });

  it.each([
    [5, 1, 1],
    [15, 1, 2],
    [30, 1, 3],
    [5, 5, 2],
    [15, 5, 3],
    [30, 5, 3],
    [4.9, 50, 0],
    [120, 99, 3],
  ])('delay %s min on %s route(s) -> L%s', (min, n, lvl) => {
    expect(sopLevel(min, n, th)).toBe(lvl);
  });
});
