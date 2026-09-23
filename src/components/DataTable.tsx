/**
 * DataTable (plan §13.7, backlog 23, defect A-8).
 *
 * Fifteen hand-rolled `<table>`s existed across the modules. Each one re-declared its
 * own `<Th>`, its own `px-2 py-1`, its own sticky header, and none of them could sort,
 * page, or say anything when empty. This is that table, once.
 *
 * Three things here are not cosmetic:
 *
 *  1. `e.target.closest('button,a,input,select')` guards the row handler. Without it a
 *     button inside a row fires the button AND navigates the row - two actions from one
 *     click, and the user only asked for one.
 *
 *  2. A clickable row is KEYBOARD REACHABLE. 22 clickable `<tr>`s in this app could not
 *     be reached by a keyboard at all, and on three routes that row was the only way
 *     into the drill-down. `tabIndex`, `role="button"` and Enter/Space fix that; the
 *     mouse path is unchanged.
 *
 *  3. Numeric columns are right-aligned AND tabular (`.num`). A column of MNT figures
 *     with proportional digits cannot be compared by eye, which is the only reason to
 *     put it in a column in the first place.
 */

import { useMemo, useState, type ReactNode } from 'react';
import { useT } from '../i18n/t';
import { pageWindow } from './pager';

export interface Column<R> {
  /** Also the default sort accessor: `row[key]` when `sortValue` is absent. */
  key: string;
  label: ReactNode;
  /** Right-aligned and tabular. */
  num?: boolean;
  /** Tabular but still LEFT aligned - for identifiers. A route id is not a quantity and
      must not be right-aligned with the numbers it sits beside. */
  mono?: boolean;
  sortable?: boolean;
  /** Sort on something other than the rendered value - a raw number behind "12.4 %". */
  sortValue?: (row: R) => number | string;
  render?: (row: R) => ReactNode;
  width?: number | string;
}

export type SortDir = 'asc' | 'desc';

export function DataTable<R>({
  columns,
  rows,
  rowKey,
  sortKey,
  sortDir = 'asc',
  pageSize,
  compact,
  maxHeight,
  onRowClick,
  rowClass,
  empty,
  foot,
  caption,
  accessibleName,
  minWidth,
  className = '',
}: {
  columns: Column<R>[];
  rows: R[];
  /** Defaults to the row index. Give a real key when rows can reorder. */
  rowKey?: (row: R, i: number) => string;
  /** INITIAL sort; the header takes over from there. */
  sortKey?: string;
  sortDir?: SortDir;
  /** Omit for one long list. Set it and a pager appears under the body. */
  pageSize?: number;
  compact?: boolean;
  /** Scroll container height. The header stays put at `--z-sticky`. */
  maxHeight?: number | string;
  onRowClick?: (row: R) => void;
  rowClass?: (row: R) => string;
  /** The in-body empty row. Both lines, because "—" is not an answer (defect A-9). */
  empty?: { title: string; text?: string };
  /** `<tr>`s for the `<tfoot>` - a total line that must not be sorted or paged away. */
  foot?: ReactNode;
  /** Visible or visually-hidden context for screen-reader table navigation. */
  caption?: ReactNode;
  /** Use when a visible caption would duplicate the surrounding panel title. */
  accessibleName?: string;
  /** Keeps dense operational columns readable; the labelled wrapper then scrolls. */
  minWidth?: number | string;
  className?: string;
}) {
  const t = useT();
  const [sort, setSort] = useState<{ key: string; dir: SortDir } | null>(
    sortKey ? { key: sortKey, dir: sortDir } : null,
  );
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return rows;
    const val = col.sortValue ?? ((r: R) => (r as Record<string, unknown>)[col.key] as number | string);
    const sign = sort.dir === 'asc' ? 1 : -1;
    // Copy: sorting the caller's array in place would mutate a memoised store value.
    return [...rows].sort((a, b) => {
      const x = val(a);
      const y = val(b);
      if (typeof x === 'number' && typeof y === 'number') return (x - y) * sign;
      return String(x).localeCompare(String(y)) * sign;
    });
  }, [rows, columns, sort]);

  const pages = pageSize ? Math.max(1, Math.ceil(sorted.length / pageSize)) : 1;
  // A filter change can shrink the list under the current page; clamp rather than
  // render an empty page and look broken.
  const p = Math.min(page, pages - 1);
  const shown = pageSize ? sorted.slice(p * pageSize, p * pageSize + pageSize) : sorted;

  const pad = compact ? 'px-2 py-0.5' : 'px-2 py-1';

  return (
    <div className={`flex min-h-0 flex-col ${className}`}>
      {/* Only becomes a scroll container when a maxHeight is given. Otherwise the
          enclosing Panel body is the scroller, and the sticky header must stick against
          THAT - an unconditional overflow-auto here would silently break it. */}
      <div
        className={maxHeight || minWidth ? 'min-h-0 flex-1 overflow-auto' : 'min-h-0'}
        style={maxHeight ? { maxHeight } : undefined}
        tabIndex={minWidth ? 0 : undefined}
        role={minWidth ? 'region' : undefined}
        aria-label={minWidth ? accessibleName : undefined}
      >
        <table className="t-body w-full" aria-label={accessibleName} style={minWidth ? { minWidth } : undefined}>
          {caption ? <caption className="p-2 text-left t-meta">{caption}</caption> : null}
          <thead className="sticky top-0 bg-[var(--color-bg1)]" style={{ zIndex: 'var(--z-sticky)' }}>
            <tr>
              {columns.map((c) => {
                const active = sort?.key === c.key;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    style={c.width ? { width: c.width } : undefined}
                    className={`t-label ${pad} ${c.num ? 'text-right' : 'text-left'}`}
                    aria-sort={active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                  >
                    {c.sortable ? (
                      <button
                        type="button"
                        className={`inline-flex items-center gap-1 uppercase tracking-[0.04em] hover:text-[var(--color-text1)] ${
                          active ? 'text-[var(--color-text1)]' : ''
                        }`}
                        onClick={() =>
                          setSort((s) =>
                            s?.key === c.key ? { key: c.key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key: c.key, dir: c.num ? 'desc' : 'asc' },
                          )
                        }
                      >
                        {c.label}
                        {/* The indicator is a glyph, not colour alone - the sorted column
                            has to be identifiable in a screenshot and in greyscale. */}
                        <span aria-hidden className={active ? '' : 'opacity-30'}>
                          {active ? (sort!.dir === 'asc' ? '▲' : '▼') : '↕'}
                        </span>
                      </button>
                    ) : (
                      c.label
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-6 text-center">
                  <div className="t-card text-[var(--color-text2)]">{empty?.title ?? t('kit.empty.title')}</div>
                  {empty?.text ? <div className="t-meta mt-1">{empty.text}</div> : null}
                </td>
              </tr>
            ) : (
              shown.map((r, i) => {
                const activate = onRowClick ? () => onRowClick(r) : undefined;
                return (
                  <tr
                    key={rowKey ? rowKey(r, i) : i}
                    // Keep native table-row semantics while offering the same activation
                    // path to pointer and keyboard users. The row's cells remain its label.
                    tabIndex={activate ? 0 : undefined}
                    onClick={
                      activate
                        ? (e) => {
                            // The A-8 guard: an in-row action never also fires row navigation.
                            if ((e.target as HTMLElement).closest('button,a,input,select,textarea')) return;
                            activate();
                          }
                        : undefined
                    }
                    onKeyDown={
                      activate
                        ? (e) => {
                            if (e.key !== 'Enter' && e.key !== ' ') return;
                            if ((e.target as HTMLElement).closest('button,a,input,select,textarea')) return;
                            e.preventDefault(); // Space would scroll the panel
                            activate();
                          }
                        : undefined
                    }
                    className={`border-t border-[var(--color-line)] ${
                      activate ? 'cursor-pointer hover:bg-[var(--color-bg2)]' : ''
                    } ${rowClass?.(r) ?? ''}`}
                  >
                    {columns.map((c) => (
                      <td key={c.key} className={`${pad} ${c.num ? 'num text-right' : c.mono ? 'num' : ''}`}>
                        {c.render ? c.render(r) : String((r as Record<string, unknown>)[c.key] ?? '')}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
          {foot ? <tfoot>{foot}</tfoot> : null}
        </table>
      </div>

      {pageSize && pages > 1 ? (
        <nav
          className="t-meta flex shrink-0 items-center justify-between gap-2 border-t border-[var(--color-line)]"
          style={{ padding: 'var(--sp-1) var(--sp-2)' }}
          aria-label={t('kit.page.label')}
        >
          <span className="num truncate">
            {t('kit.page.of', { from: p * pageSize + 1, to: Math.min(sorted.length, (p + 1) * pageSize), total: sorted.length })}
          </span>
          <span className="flex shrink-0 items-center gap-1">
            <PageBtn label={t('kit.page.prev')} disabled={p === 0} onClick={() => setPage(p - 1)}>
              ‹
            </PageBtn>
            {pageWindow(p, pages).map((n) => (
              <PageBtn key={n} active={n === p} onClick={() => setPage(n)} label={String(n + 1)}>
                {n + 1}
              </PageBtn>
            ))}
            <PageBtn label={t('kit.page.next')} disabled={p >= pages - 1} onClick={() => setPage(p + 1)}>
              ›
            </PageBtn>
          </span>
        </nav>
      ) : null}
    </div>
  );
}

function PageBtn({
  children,
  onClick,
  disabled,
  active,
  label,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      className="num min-w-6 rounded border px-1.5 disabled:cursor-not-allowed disabled:opacity-30"
      style={{
        borderRadius: 'var(--r-1)',
        borderColor: active ? 'var(--color-accent)' : 'var(--color-line)',
        color: active ? 'var(--color-accent)' : 'var(--color-text2)',
      }}
    >
      {children}
    </button>
  );
}
