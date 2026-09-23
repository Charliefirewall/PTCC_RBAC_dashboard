import { useRef, type KeyboardEvent, type RefCallback } from 'react';

/**
 * Shared WAI-ARIA tab keyboard behaviour. Visual treatment stays with each module,
 * while focus order, arrow navigation and tab/panel relationships stay consistent.
 */
export function useAccessibleTabs<T extends string>(
  ids: readonly T[],
  active: T,
  onChange: (id: T) => void,
  prefix: string,
) {
  const refs = useRef(new Map<T, HTMLButtonElement>());
  const focus = (id: T) => requestAnimationFrame(() => refs.current.get(id)?.focus());

  const getTabProps = (id: T) => ({
    id: `${prefix}-tab-${id}`,
    role: 'tab' as const,
    'aria-selected': active === id,
    'aria-controls': `${prefix}-panel-${id}`,
    tabIndex: active === id ? 0 : -1,
    ref: ((node: HTMLButtonElement | null) => {
      if (node) refs.current.set(id, node);
      else refs.current.delete(id);
    }) as RefCallback<HTMLButtonElement>,
    onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => {
      const index = ids.indexOf(id);
      let next: T | undefined;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = ids[(index + 1) % ids.length];
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = ids[(index - 1 + ids.length) % ids.length];
      if (event.key === 'Home') next = ids[0];
      if (event.key === 'End') next = ids[ids.length - 1];
      if (!next) return;
      event.preventDefault();
      onChange(next);
      focus(next);
    },
  });

  const getPanelProps = (id: T) => ({
    id: `${prefix}-panel-${id}`,
    role: 'tabpanel' as const,
    'aria-labelledby': `${prefix}-tab-${id}`,
    tabIndex: 0,
  });

  return { getTabProps, getPanelProps };
}
