import { useEffect } from 'react';
import { create } from 'zustand';
import { engine, useSettings, useSim, world } from '../store';
import { SCENARIOS, resetAll, type ScenarioId } from '../sim/scenarios';
import { useOverlayStore } from '../store/overlay';
import type { I18nKey } from '../i18n/dict';

interface RunnerState {
  active: ScenarioId | null;
  step: number;
  startedAt: number;
  showHelp: boolean;
  /** E15: steps advance on their own every AUTOPLAY_MS, so the presenter can talk */
  autoplay: boolean;
  start(id: ScenarioId, autoplay?: boolean): void;
  next(): void;
  stop(): void;
  pauseAuto(): void;
  toggleHelp(): void;
}

/** Real-time pause between auto-played steps (E15). */
export const AUTOPLAY_MS = 45_000;
let autoTimer: ReturnType<typeof setInterval> | null = null;
function clearAuto() {
  if (autoTimer) clearInterval(autoTimer);
  autoTimer = null;
}

export const useRunner = create<RunnerState>((set, get) => ({
  active: null,
  step: -1,
  startedAt: 0,
  showHelp: false,
  autoplay: false,
  start(id, autoplay = false) {
    clearAuto();
    resetAll(world);
    set({ active: id, step: -1, startedAt: world.sim_time_s, autoplay });
    get().next();
    if (autoplay) {
      autoTimer = setInterval(() => {
        const { active, step } = get();
        if (!active || step >= SCENARIOS[active].steps.length - 1) return get().pauseAuto();
        get().next();
        if (get().step >= SCENARIOS[active].steps.length - 1) get().pauseAuto();
      }, AUTOPLAY_MS);
    }
  },
  pauseAuto() {
    clearAuto();
    set({ autoplay: false });
  },
  next() {
    const { active, step } = get();
    if (!active) return;
    const sc = SCENARIOS[active];
    const i = step + 1;
    if (i >= sc.steps.length) return;
    engine.inject((w, t) => sc.steps[i]!.apply(w, t));
    set({ step: i });
  },
  stop() {
    clearAuto();
    resetAll(world);
    set({ active: null, step: -1, autoplay: false });
  },
  toggleHelp: () => set((s) => ({ showHelp: !s.showHelp })),
}));

const KEY_TO_SCENARIO: Record<string, ScenarioId> = {
  '1': 'D1', '2': 'D2', '3': 'D3', '4': 'D4', '5': 'D5',
  '6': 'D6', '7': 'D7', '8': 'D8', '9': 'D9',
  // PTCC's own SOP scenario - P for PTCC (Shift+P auto-plays it, E15)
  p: 'D10',
};

export function useHotkeys(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el instanceof Element && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      // Space is a button's own activation key. Swallowing it here with preventDefault()
      // meant NO button, summary or link in the app could be operated from the keyboard -
      // tabbing to "Approve" and pressing Space paused the simulation instead. Anything
      // natively activatable owns its keys; presenter hotkeys only apply to the page.
      // `el?.closest` guards null, NOT a missing method - a keydown targeted at `document`
      // has no .closest and would throw, taking the whole handler with it.
      if (el instanceof Element && el.closest('button, summary, a[href], [role="button"], [contenteditable]')) return;
      // Presenter keys must not fire behind an open dialog: 0-9 restart scenarios, W
      // flips to the video wall and 0 resets everything - all while an operator is
      // halfway through a Validate or Override they cannot see change.
      if (useOverlayStore.getState().modal || useOverlayStore.getState().drawer) return;

      const r = useRunner.getState();
      if (e.key === 'P') { r.start('D10', true); return; }
      // any other presenter key takes the wheel back from auto-play
      if (r.autoplay) r.pauseAuto();
      const sid = KEY_TO_SCENARIO[e.key];
      if (sid) { r.start(sid); return; }

      switch (e.key.toLowerCase()) {
        case '0': r.stop(); break;
        case 'n': r.next(); break;
        case 'h': r.toggleHelp(); break;
        case 'w': {
          const s = useSettings.getState();
          s.setMode(s.mode === 'wall' ? 'operator' : 'wall');
          break;
        }
        case 'l': {
          const s = useSettings.getState();
          s.setLang(s.lang === 'en' ? 'mn' : 'en');
          break;
        }
        case ' ': {
          e.preventDefault();
          if (engine.isRunning()) engine.pause();
          else engine.start();
          useSim.setState({ running: engine.isRunning() });
          break;
        }
      }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, []);
}

/**
 * The presenter help table. Keys, not prose: these seven rows render into the presenter
 * modal (ScenarioBar.tsx) and were the largest block of hard-coded English left in the
 * app - pressing `L` translated the whole product except its own help.
 *
 * The key column is a literal on purpose: `W` is the W key in both languages.
 */
export const HOTKEY_HELP: readonly [string, I18nKey][] = [
  ['1 – 9', 'hk.scenario'],
  ['P', 'hk.ptcc'],
  ['Shift+P', 'hk.autoplay'],
  ['N', 'hk.next'],
  ['0', 'hk.reset'],
  ['W', 'hk.wall'],
  ['L', 'hk.lang'],
  ['Space', 'hk.pause'],
  ['H', 'hk.help'],
];
