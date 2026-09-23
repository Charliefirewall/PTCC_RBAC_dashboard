import { useEffect, useState } from 'react';
import { engine, startBridge, useSettings, useSim, warmup } from '../store';
import { Shell } from './Shell';
import { useRoleEntry } from '../modules/roles/store';
import { seedShift } from '../store/seed';
import RoleSelect from '../modules/roles/RoleSelect';

export const MODULES = [
  // Role dashboard. INFERRED: R2898-R2909 names the roles, not a per-role screen.
  { path: 'dashboard', key: 'nav.dashboard', evidence: 'INFERRED' },
  { path: 'command', key: 'nav.command', evidence: 'CONFIRMED' },
  { path: 'map', key: 'nav.map', evidence: 'CONFIRMED' },
  { path: 'regularity', key: 'nav.regularity', evidence: 'CONFIRMED' },
  { path: 'passenger', key: 'nav.passenger', evidence: 'CONFIRMED' },
  { path: 'alerts', key: 'nav.alerts', evidence: 'CONFIRMED' },
  { path: 'comms', key: 'nav.comms', evidence: 'CONFIRMED' },
  { path: 'health', key: 'nav.health', evidence: 'INFERRED' },
  { path: 'operators', key: 'nav.operators', evidence: 'CONFIRMED' },
  { path: 'copilot', key: 'nav.copilot', evidence: 'ASSUMPTION' },
  // Agent console. ASSUMPTION: no source describes an agent console - it is the
  // proposed AI layer, sitting next to the Copilot for that reason.
  { path: 'agentic', key: 'nav.agentic', evidence: 'ASSUMPTION' },
  { path: 'roi', key: 'nav.roi', evidence: 'INFERRED' },
  { path: 'analytics', key: 'nav.analytics', evidence: 'CONFIRMED' },
  { path: 'multimodal', key: 'nav.multimodal', evidence: 'FUTURE' },
  // Absence questionnaire (plan §15.1). CONFIRMED: every row restates a gap that the
  // source material itself leaves - the page invents nothing.
  { path: 'provenance', key: 'nav.provenance', evidence: 'CONFIRMED' },
  { path: 'depot', key: 'nav.depot', evidence: 'ASSUMPTION' },
  { path: 'platform', key: 'nav.platform', evidence: 'CONFIRMED' },
  { path: 'settings', key: 'nav.settings', evidence: 'INFERRED' },
] as const;

/** Route path without its `?query` - `#/vehicle/3-015?alert=x` routes as `vehicle/3-015`. */
const pathOf = () => location.hash.slice(2).split('?')[0] || 'command';

export function useRoute(): [string, (p: string) => void] {
  const [hash, setHash] = useState(pathOf);
  useEffect(() => {
    const on = () => setHash(pathOf());
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  return [hash, (p: string) => { location.hash = `#/${p}`; }];
}

/** The `?query` part of the hash route, e.g. `#/analytics?tab=route&route=R7`. Live. */
export function useHashQuery(): URLSearchParams {
  const read = () => new URLSearchParams(location.hash.split('?')[1] ?? '');
  const [q, setQ] = useState(read);
  useEffect(() => {
    const on = () => setQ(read());
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  return q;
}

export function App() {
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    // Warm up so the demo opens on a plausible network rather than an empty one.
    warmup(180);
    const stop = startBridge();
    engine.tick();
    // After the first tick, so there are alerts to hand over. See store/seed.ts for why
    // this does not weaken L1235.
    seedShift();
    engine.start();
    useSim.setState({ running: true });
    setBooted(true);
    return () => {
      stop();
      engine.pause();
    };
  }, []);

  const preset = useSettings((s) => s.preset);
  const mode = useSettings((s) => s.mode);
  useEffect(() => {
    // `W` and ?mode=wall switch the LAYOUT to the video wall, but the type scale was
    // bound to `preset` alone - so the wall rendered at 16px on a surface the source
    // says is read at 3-8 m (L276-L296). Either signal means "this is the wall".
    const wall = preset === 'wall' || mode === 'wall';
    const scale = wall ? 2.2 : preset === 'ws' ? 1.15 : 1;
    document.documentElement.style.setProperty('--wall-scale', String(scale));
  }, [preset, mode]);

  // The walkthrough starts at role selection. `?role=` skips it; see modules/roles/store.ts.
  const entered = useRoleEntry((s) => s.entered);

  if (!booted) {
    return (
      <div className="flex h-full items-center justify-center text-[var(--color-text3)]">
        Building network…
      </div>
    );
  }
  if (!entered) return <RoleSelect />;
  return <Shell />;
}
