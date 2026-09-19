/**
 * Role-entry gate. Deliberately NOT authentication - see RoleSelect.tsx and the README
 * ("authentication and RBAC (a role switcher stands in)").
 *
 * Presenter escape hatches, in priority order:
 *   ?role=dispatcher   enter straight into that role, no landing screen at all
 *   last role          remembered in localStorage and pre-selected on the landing screen
 *
 * localStorage is wrapped the same way the theme is (store/index.ts): a locked-down demo
 * laptop can throw on access, and that must never be the thing that stops the demo.
 */

import { create } from 'zustand';
import { useSettings } from '../../store';
import { isRoleId, specOf } from './roles';
import type { RoleId } from '../../sim/types';

const ROLE_KEY = 'ptcc.role';

export function readLastRole(): RoleId | null {
  try {
    const v = localStorage.getItem(ROLE_KEY);
    return isRoleId(v) ? v : null;
  } catch {
    return null;
  }
}

function remember(role: RoleId): void {
  try {
    localStorage.setItem(ROLE_KEY, role);
  } catch {
    /* ignore - the role still applies for this session */
  }
}

interface EntryState {
  entered: boolean;
  /** Enter the app as `role`, landing on that role's home screen. */
  enter(role: RoleId): void;
  /** Back to the landing screen, e.g. to show a client a different role's view. */
  exit(): void;
}

const urlRole = (() => {
  const v = new URLSearchParams(location.search).get('role');
  return isRoleId(v) ? v : null;
})();

export const useRoleEntry = create<EntryState>((set) => ({
  entered: urlRole != null,
  enter: (role) => {
    useSettings.getState().setRole(role);
    remember(role);
    location.hash = `#/${specOf(role).home}`;
    set({ entered: true });
  },
  exit: () => set({ entered: false }),
}));

/*
 * ?role= wins over everything and skips the landing screen entirely - which also means
 * taking over the landing SCREEN, not just the role. Without this the URL entered the app
 * on the default route (Command Centre) for every role, including Field Inspector, whose
 * nav does not even contain it.
 *
 * An explicit hash still wins, so `?role=dispatcher#/map` deep-links as written.
 */
if (urlRole) {
  useSettings.getState().setRole(urlRole);
  if (!location.hash || location.hash === '#/') location.hash = `#/${specOf(urlRole).home}`;
}
