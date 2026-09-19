/**
 * Top bar.
 *
 * Seven controls in a row was six too many. What stays visible is what an operator or a
 * presenter looks at rather than operates: the clock, whether the feed is live or stale,
 * which role they are in, and - since item 14 - the ask bar, which now takes the middle.
 * Transport (play/pause) stays too; it is one click and gets used constantly in a demo.
 *
 * Everything that is a preference or is set once and then left alone - role switching,
 * theme, language, display preset, simulation speed, video-wall mode - lives in the
 * profile menu (§7.2 A-5). The menu is positioned with `var(--z-dropdown)`; no raw
 * z-index anywhere.
 *
 * Evidence mode is the exception and came back OUT of the menu (§15.2): it is the demo's
 * central claim, not a setting, so it keeps a labelled control on the bar itself.
 */

import { useEffect, useRef, useState } from 'react';
import { engine, useSettings, useSim } from '../store';
import { useOverlayStore } from '../store/overlay';
import { hhmmss } from '../sim/engine';
import { useT } from '../i18n/t';
import { Button, StatusPill } from '../components/primitives';
import { Icon } from '../components/Icon';
import { AskBar } from './AskBar';
import { ROLE_ORDER, roleLabelKey, specOf } from '../modules/roles/roles';
import { useRoleEntry } from '../modules/roles/store';
import type { RoleId } from '../sim/types';

/** ☀/☾ as text renders as tofu in the bundled font. Two paths, no icon dependency. */
export function ThemeIcon({ dark }: { dark: boolean }) {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.4">
      {dark ? (
        <>
          <circle cx="8" cy="8" r="3.2" />
          <path d="M8 1v1.6M8 13.4V15M1 8h1.6M13.4 8H15M3.05 3.05l1.13 1.13M11.82 11.82l1.13 1.13M12.95 3.05l-1.13 1.13M4.18 11.82l-1.13 1.13" strokeLinecap="round" />
        </>
      ) : (
        <path d="M13.5 9.6A5.8 5.8 0 0 1 6.4 2.5 5.8 5.8 0 1 0 13.5 9.6Z" strokeLinejoin="round" />
      )}
    </svg>
  );
}

const SELECT_CLASS =
  'rounded border border-[var(--color-line)] bg-[var(--color-bg2)] px-1.5 py-1 text-[11px] text-[var(--color-text1)]';

/**
 * One row of the profile popover.
 *
 * It was a <div> with a <span>, so every <select> in the menu had no accessible name at
 * all - the row's visible label was never associated with the control it labels. A
 * <label> element does that for free, with no aria and no id plumbing. Each row holds
 * exactly one labelable control, so the implicit association is unambiguous.
 */
function MenuRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center justify-between gap-3 px-3 py-1.5">
      <span className="t-body whitespace-nowrap text-[var(--color-text2)]">{label}</span>
      {children}
    </label>
  );
}

/**
 * The profile / settings menu (plan §7.2 A-5).
 *
 * The ask bar needs the middle of a 48 px bar, so role, theme and language came in here
 * - they are per-person preferences, not instruments. Two things did NOT move: the role
 * LABEL stays on the bar (a role-based demo may never hide who you are) and the Evidence
 * toggle stays out here, because §15.2 promoted it deliberately.
 */
function ProfileMenu() {
  const t = useT();
  const { mode, setMode, preset, setPreset, lang, setLang, role, setRole, theme, toggleTheme } = useSettings();
  const exit = useRoleEntry((s) => s.exit);
  const speed = useSim((s) => s.speed);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  // §12.3 rule 2 allows exactly ONE global Escape handler, and OverlayHost owns it. This
  // menu used to install a second one, which is why closing a modal over the menu needed
  // two Escapes: the modal's handler ran, the menu's did not. The popover is not an
  // overlay layer (no scrim, no focus trap, closes on blur), so it does not belong in the
  // host either - it subscribes to the host's store instead and closes when any layer
  // opens, which also fixes it surviving a modal close.
  const layerOpen = useOverlayStore((s) => !!s.modal || !!s.drawer);
  useEffect(() => {
    if (layerOpen) setOpen(false);
  }, [layerOpen]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    // Scoped to the popover, not the window: Escape with focus inside it closes it, and
    // Escape anywhere else stays the host's business.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
      }
    };
    addEventListener('pointerdown', onDown);
    box.current?.addEventListener('keydown', onKey);
    const el = box.current;
    return () => {
      removeEventListener('pointerdown', onDown);
      el?.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={box}>
      <Button
        size="sm"
        onClick={() => setOpen((o) => !o)}
        title={t('cop.top.profile')}
        aria-label={t('cop.top.profile')}
        aria-expanded={open}
      >
        <Icon name="user" size={13} />
        <span aria-hidden>⋯</span>
      </Button>
      {open && (
        // NOT role="menu": it contained zero role="menuitem" children, so assistive tech
        // announced an empty menu and arrow keys did nothing. It is a group of settings
        // controls, which is what a plain labelled group is for.
        <div
          className="panel absolute right-0 mt-1 w-[260px] py-1 shadow-lg"
          style={{ zIndex: 'var(--z-dropdown)' }}
          role="group"
          aria-label={t('cop.top.profile')}
        >
          <MenuRow label={t('top.signedInAs')}>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as RoleId)}
              className={SELECT_CLASS}
              title={`R2898-R2909 · ${specOf(role).cite}`}
            >
              {ROLE_ORDER.map((r) => (
                <option key={r} value={r}>{t(roleLabelKey(r))}</option>
              ))}
            </select>
          </MenuRow>

          <MenuRow label={t('top.switchRoleHint')}>
            <Button size="sm" onClick={exit}>{t('top.switchRole')}</Button>
          </MenuRow>

          <MenuRow label={t('top.theme')}>
            {/* Icon-only: without this it announced as an unnamed button. */}
            <Button size="sm" onClick={toggleTheme} aria-label={t('top.theme')}>
              <ThemeIcon dark={theme === 'dark'} />
            </Button>
          </MenuRow>

          <MenuRow label={t('cop.top.lang')}>
            <Button size="sm" onClick={() => setLang(lang === 'en' ? 'mn' : 'en')} title="L">
              {lang === 'en' ? 'EN' : 'МН'}
            </Button>
          </MenuRow>

          <div className="my-1 border-t border-[var(--color-line)]" />

          <MenuRow label={t('top.preset')}>
            <select
              value={preset}
              onChange={(e) => setPreset(e.target.value as 'laptop' | 'ws' | 'wall')}
              className={SELECT_CLASS}
            >
              <option value="laptop">{t('top.presetLaptop')}</option>
              <option value="ws">{t('top.presetWs')}</option>
              <option value="wall">{t('top.presetWall')}</option>
            </select>
          </MenuRow>

          <MenuRow label={t('top.speed')}>
            <select
              value={speed}
              onChange={(e) => {
                engine.setSpeed(Number(e.target.value));
                useSim.setState({ speed: engine.speed });
              }}
              className={SELECT_CLASS}
            >
              {[1, 4, 12, 30, 60].map((x) => (
                <option key={x} value={x}>{x}×</option>
              ))}
            </select>
          </MenuRow>

          <MenuRow label={t('top.wallMode')}>
            <Button size="sm" onClick={() => setMode(mode === 'wall' ? 'operator' : 'wall')} title="W">
              {mode === 'wall' ? t('app.operatorMode') : t('app.wallMode')}
            </Button>
          </MenuRow>

          <div className="mt-1 border-t border-[var(--color-line)] px-3 pt-1.5 pb-1">
            <p className="t-meta">{t('top.moreHint')}</p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Evidence mode, promoted out of the overflow menu (plan §15.2).
 *
 * Grading every figure is the most differentiating thing in this build, and it was three
 * clicks deep. One labelled control, one click, and the state is readable across a room:
 * filled accent = loud grades everywhere, outline = quiet dots.
 */
function EvidenceToggle() {
  const t = useT();
  const showEvidence = useSettings((s) => s.showEvidence);
  const toggleEvidence = useSettings((s) => s.toggleEvidence);
  return (
    <Button
      size="sm"
      variant={showEvidence ? 'primary' : 'ghost'}
      onClick={toggleEvidence}
      title={`${t('top.evidenceMode')} — ${showEvidence ? t('top.on') : t('top.off')}`}
    >
      <span
        aria-hidden
        className="inline-block h-[7px] w-[7px] shrink-0 rounded-full border"
        style={{
          borderColor: 'currentColor',
          background: showEvidence ? 'currentColor' : 'transparent',
        }}
      />
      <span className="hidden md:inline">{t('top.evidence')}</span>
      <span className="t-label !text-current opacity-80">
        {showEvidence ? t('top.on') : t('top.off')}
      </span>
    </Button>
  );
}

export function TopBar() {
  const t = useT();
  const role = useSettings((s) => s.role);
  const snap = useSim((s) => s.snap);
  const running = useSim((s) => s.running);
  const stale = snap?.feed_stale;

  return (
    <header className="flex h-12 shrink-0 items-center gap-2.5 border-b border-[var(--color-line)] bg-[var(--color-bg1)] px-3">
      <div className="flex items-center gap-2">
        <div className="grid h-7 w-7 place-items-center rounded bg-[var(--color-accent)] t-card !font-bold text-[var(--color-on-accent)]">P</div>
        <span className="t-card tracking-tight">{t('app.title')}</span>
      </div>

      <div className="mx-1 h-6 w-px bg-[var(--color-line)]" />

      <span className="t-section num">{snap ? hhmmss(snap.sim_time_s) : '--:--:--'}</span>
      <span className="t-meta">UB · UTC+8</span>
      {stale ? (
        <StatusPill tone="crit">{t('app.staleFeed')}</StatusPill>
      ) : (
        <StatusPill tone={running ? 'ok' : 'warn'}>{running ? t('app.live') : t('app.paused')}</StatusPill>
      )}

      <Button
        size="sm"
        onClick={() => {
          if (engine.isRunning()) engine.pause();
          else engine.start();
          useSim.setState({ running: engine.isRunning() });
        }}
        title={t('top.playPause')}
        aria-label={t('top.playPause')}
      >
        <span aria-hidden>{running ? '❚❚' : '▶'}</span>
      </Button>

      {/* The ask bar takes the middle. It is present on every route, and in wall mode -
          which drops this whole header - it is simply absent (item 14, F-06). */}
      <div className="mx-1 flex min-w-0 flex-1 justify-center">
        <AskBar />
      </div>

      {/* Who you are is the one thing a role-based demo must never hide - the control
          moved into the profile menu, the label did not. */}
      <span className="t-meta hidden truncate xl:inline" title={specOf(role).cite}>
        {t(roleLabelKey(role))}
      </span>

      <div className="mx-1 h-6 w-px bg-[var(--color-line)]" />

      <EvidenceToggle />

      <ProfileMenu />
    </header>
  );
}
