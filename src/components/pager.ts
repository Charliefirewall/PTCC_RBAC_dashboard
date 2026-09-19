/**
 * The pager's arithmetic, on its own so it can be tested without pulling React, the
 * i18n dictionary and the whole store in behind it (see kit.test.ts).
 */

/** How many numbered buttons the pager shows before it starts eliding. */
export const PAGE_WINDOW = 5;

/**
 * A window of at most PAGE_WINDOW page indices centred on `p`, clamped so it never
 * contains a page that does not exist at either end of the range.
 */
export function pageWindow(p: number, pages: number): number[] {
  const half = Math.floor(PAGE_WINDOW / 2);
  const start = Math.max(0, Math.min(p - half, pages - PAGE_WINDOW));
  return Array.from({ length: Math.min(PAGE_WINDOW, pages) }, (_, i) => start + i);
}
