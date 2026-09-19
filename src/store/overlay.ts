/**
 * Overlay store - the single source of truth for what is floating above the app.
 *
 * Plan section 12.2: there is exactly ONE modal slot and ONE drawer slot in the whole
 * application. `openModal()` REPLACES the slot's content instead of pushing onto a
 * stack, so two modals cannot coexist and two scrims can never composite (defect D-2).
 *
 * Rendering lives in app/OverlayHost.tsx; this file only holds state. Callers use the
 * non-hook `overlay` facade at the bottom - it works from event handlers and stores as
 * well as components, which is why the hook wrapper this comment used to advertise had
 * zero call sites in the whole app and has been removed.
 */
import { create } from 'zustand';
import type { ReactNode } from 'react';

export type Tone = 'info' | 'ok' | 'warn' | 'crit';

interface Common {
  /** Identifies the OWNER of the slot, so a component can tell "is my layer still up?". */
  id?: string;
  title: string;
  body: ReactNode;
  footer?: ReactNode;
  /** Called when this layer leaves the slot - closed, or replaced by another. */
  onClose?: () => void;
  /** Element to restore focus to; captured automatically at open time. */
  trigger?: HTMLElement | null;
}

export interface ModalSpec extends Common {
  /** 'wide' widens the centred panel from 640px to 880px. */
  size?: 'default' | 'wide';
}

export interface DrawerSpec extends Common {
  sub?: string;
  wide?: boolean;
}

export interface ToastSpec {
  id: number;
  msg: string;
  tone: Tone;
  action?: { label: string; run: () => void };
}

/** Plan section 12.2: max 3 visible, 4.2s auto-dismiss. */
const TOAST_MAX = 3;
export const TOAST_MS = 4200;

interface OverlayState {
  modal: ModalSpec | null;
  drawer: DrawerSpec | null;
  toasts: ToastSpec[];
  openModal(spec: ModalSpec): void;
  openDrawer(spec: DrawerSpec): void;
  closeModal(): void;
  closeDrawer(): void;
  /** Escape / scrim click: modal first, then drawer (rule 2). Returns true if it closed something. */
  closeTop(): boolean;
  closeAll(): void;
  toast(msg: string, opts?: { tone?: Tone; action?: ToastSpec['action'] }): void;
  dismissToast(id: number): void;
}

const activeElement = (): HTMLElement | null =>
  typeof document === 'undefined' ? null : (document.activeElement as HTMLElement | null);

/**
 * Rule 6, the return half. Three paths dropped focus on <body>:
 *
 *  - modal REPLACES modal (H over a Validate dialog): the outgoing trigger was thrown
 *    away, so closing the replacement had nothing to go back to;
 *  - opened from a hotkey or from a store callback: `document.activeElement` is <body>
 *    at that moment, which is not a trigger, it is the absence of one;
 *  - the trigger was unmounted while the layer was open (a list row that re-rendered).
 *
 * One helper for capture and one for restore, so every open/close path shares them.
 */
function triggerFor(explicit: HTMLElement | null | undefined, inherited: HTMLElement | null | undefined): HTMLElement | null {
  if (explicit) return explicit;
  const live = activeElement();
  if (live && live !== document.body && live.tagName !== 'HTML') return live;
  return inherited ?? null;
}

function restore(el: HTMLElement | null | undefined): void {
  // A detached node cannot take focus; calling focus() on it moves focus to <body>,
  // which is worse than leaving it where the browser put it.
  if (el?.isConnected) el.focus?.();
}

let toastSeq = 0;

export const useOverlayStore = create<OverlayState>((set, get) => ({
  modal: null,
  drawer: null,
  toasts: [],

  openModal(spec) {
    // Replacing, not stacking: the outgoing layer still gets its onClose so the
    // component that opened it can drop its own "is open" flag. The slot is swapped
    // FIRST, so that callback can ask who holds the slot now (see ScenarioBar).
    const prev = get().modal;
    set({ modal: { ...spec, trigger: triggerFor(spec.trigger, prev?.trigger) } });
    prev?.onClose?.();
  },

  openDrawer(spec) {
    const prev = get().drawer;
    set({ drawer: { ...spec, trigger: triggerFor(spec.trigger, prev?.trigger) } });
    prev?.onClose?.();
  },

  closeModal() {
    const m = get().modal;
    if (!m) return;
    set({ modal: null });
    m.onClose?.();
    restore(m.trigger);
  },

  closeDrawer() {
    const d = get().drawer;
    if (!d) return;
    set({ drawer: null });
    d.onClose?.();
    restore(d.trigger);
  },

  closeTop() {
    if (get().modal) { get().closeModal(); return true; }
    if (get().drawer) { get().closeDrawer(); return true; }
    return false;
  },

  closeAll() {
    if (get().modal) get().closeModal();
    if (get().drawer) get().closeDrawer();
  },

  toast(msg, opts) {
    const id = ++toastSeq;
    set((s) => ({ toasts: [...s.toasts, { id, msg, tone: opts?.tone ?? 'info', action: opts?.action }].slice(-TOAST_MAX) }));
    if (typeof setTimeout !== 'undefined') setTimeout(() => get().dismissToast(id), TOAST_MS);
  },

  dismissToast(id) {
    set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) }));
  },
}));

/** Non-hook access, for event handlers and stores. */
export const overlay = {
  openModal: (s: ModalSpec) => useOverlayStore.getState().openModal(s),
  openDrawer: (s: DrawerSpec) => useOverlayStore.getState().openDrawer(s),
  closeModal: () => useOverlayStore.getState().closeModal(),
  closeDrawer: () => useOverlayStore.getState().closeDrawer(),
  closeAll: () => useOverlayStore.getState().closeAll(),
  toast: (m: string, o?: { tone?: Tone; action?: ToastSpec['action'] }) => useOverlayStore.getState().toast(m, o),
};
