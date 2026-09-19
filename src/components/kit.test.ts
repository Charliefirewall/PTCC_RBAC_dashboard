/**
 * One check for the only arithmetic in the kit. The pager window is three clamps in a
 * row, which is exactly the shape that ends up off by one and shows a page button that
 * does not exist.
 */
import { describe, expect, it } from 'vitest';
import { pageWindow } from './pager';

describe('DataTable pager window', () => {
  it('never leaves the page range, at either end or in the middle', () => {
    expect(pageWindow(0, 1)).toEqual([0]);
    expect(pageWindow(0, 3)).toEqual([0, 1, 2]);
    // Fewer pages than the window: show them all, invent none.
    expect(pageWindow(2, 3)).toEqual([0, 1, 2]);
    // First page of many: the window starts at 0, not at -2.
    expect(pageWindow(0, 20)).toEqual([0, 1, 2, 3, 4]);
    // Last page of many: the window ends at the last page, not past it.
    expect(pageWindow(19, 20)).toEqual([15, 16, 17, 18, 19]);
    // Middle: centred.
    expect(pageWindow(10, 20)).toEqual([8, 9, 10, 11, 12]);
    for (const pages of [1, 2, 5, 7, 40]) {
      for (let p = 0; p < pages; p++) {
        const w = pageWindow(p, pages);
        expect(w.length).toBe(Math.min(5, pages));
        expect(w.every((n) => n >= 0 && n < pages)).toBe(true);
        expect(w).toContain(p);
      }
    }
  });
});
