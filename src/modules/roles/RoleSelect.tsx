/**
 * Role selection — the first screen of the client's walkthrough ("Login / role selection").
 *
 * This is NOT authentication. The README says so in as many words: "authentication and
 * RBAC (a role switcher stands in)". The screen says it too, on screen, because a
 * convincing login page in a demo is exactly the kind of thing that gets remembered as a
 * delivered feature.
 *
 * Presenter escape hatches (see ./store.ts):
 *   ?role=dispatcher  skips this screen entirely
 *   last role         remembered, pre-selected, one Enter away
 */

import { useEffect, useState } from 'react';
import { Button, EvidenceTag } from '../../components/primitives';
import { DemoBadge } from '../../app/Shell';
import { useSettings } from '../../store';
import { ThemeIcon } from '../../app/TopBar';
import { useT } from '../../i18n/t';
import { ROLE_ORDER, roleLabelKey, specOf } from './roles';
import { readLastRole, useRoleEntry } from './store';
import type { RoleId } from '../../sim/types';
import type { I18nKey } from '../../i18n/dict';

export default function RoleSelect() {
  const t = useT();
  const { lang, setLang, theme, toggleTheme } = useSettings();
  const enter = useRoleEntry((s) => s.enter);
  const last = readLastRole();
  const [sel, setSel] = useState<RoleId>(last ?? 'operations_controller');

  /*
   * Enter goes straight in — the presenter should never have to hunt for the button.
   *
   * Except when a role card has keyboard focus: keydown fires before the synthetic click,
   * so a blanket handler would enter as the PREVIOUSLY selected role. Let the card's own
   * click handle that case.
   */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return;
      if ((document.activeElement as HTMLElement | null)?.hasAttribute('aria-pressed')) return;
      enter(sel);
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [sel, enter]);

  return (
    // The scroll moved off the root and onto the card list, so the DEMO badge is pinned to
    // the bottom of the screen instead of scrolling out of sight with the content.
    <div className="flex h-full flex-col bg-[var(--color-bg0)]">
      <header className="flex shrink-0 items-center gap-3 px-6 pt-5">
        <div className="grid h-8 w-8 place-items-center rounded bg-[var(--color-accent)] text-[15px] font-bold text-[var(--color-on-accent)]">P</div>
        <span className="t-head">{t('app.title')}</span>
        <div className="flex-1" />
        <Button size="sm" onClick={toggleTheme} title={t('top.theme')}>
          <ThemeIcon dark={theme === 'dark'} />
        </Button>
        <Button size="sm" onClick={() => setLang(lang === 'en' ? 'mn' : 'en')}>
          {lang === 'en' ? 'EN' : 'МН'}
        </Button>
      </header>

      <div className="mx-auto flex w-full min-h-0 max-w-[1100px] flex-1 flex-col gap-4 overflow-auto px-6 py-6">
        <div>
          <h1 className="t-head text-[22px] text-[var(--color-text1)]">{t('role.selectTitle')}</h1>
          <p className="t-body mt-1 max-w-[70ch] text-[var(--color-text2)]">{t('role.selectSub')}</p>
        </div>

        {/* Stated, not implied. */}
        <div className="flex items-start gap-2 rounded-md border border-[var(--color-sev-warn)] bg-[var(--color-bg1)] px-3 py-2">
          <span className="text-[var(--color-sev-warn)]">⚠</span>
          <p className="t-body text-[var(--color-text2)]">
            {t('role.notAuth')}
            <EvidenceTag label="FUTURE" cite="README — authentication and RBAC are out of scope" className="ml-2 align-middle" />
          </p>
        </div>

        <ul className="grid grid-cols-3 gap-3">
          {ROLE_ORDER.map((id) => {
            const spec = specOf(id);
            const active = sel === id;
            return (
              <li key={id}>
                <button
                  type="button"
                  // Click to select; click the selected card again (or double-click any
                  // card) to enter. This is also what makes Enter work on a focused card.
                  onClick={() => (sel === id ? enter(id) : setSel(id))}
                  onDoubleClick={() => enter(id)}
                  aria-pressed={active}
                  className="panel flex h-full w-full flex-col gap-1.5 px-3 py-3 text-left transition-colors"
                  style={{
                    borderColor: active ? 'var(--color-accent)' : undefined,
                    background: active ? 'var(--color-accent-soft)' : undefined,
                    // The tinted selected background lifts the floor: tertiary text on
                    // it measured 3.66:1. Step the card's muted text up one level.
                    ...(active ? { ['--color-text3' as string]: 'var(--color-text2)' } : {}),
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="t-body min-w-0 flex-1 truncate font-semibold text-[var(--color-text1)]">
                      {t(roleLabelKey(id))}
                    </span>
                    {last === id && <span className="t-meta text-[var(--color-accent)]">{t('role.lastUsed')}</span>}
                    <EvidenceTag label={spec.composition} cite={spec.cite} />
                  </div>
                  <p className="t-meta">{t(spec.fnKey)}</p>
                  <p className="t-body text-[var(--color-text2)]">{t(`role.focus.${id}` as I18nKey)}</p>
                  <p className="t-meta mt-auto pt-1">
                    {t('role.landsOn', { screen: t(`nav.${spec.home}` as I18nKey) })}
                    {' · '}
                    {t('role.modulesCount', { n: spec.nav.length })}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-3">
          <Button variant="primary" onClick={() => enter(sel)}>
            {t('role.continueAs', { role: t(roleLabelKey(sel)) })} ⏎
          </Button>
          <span className="t-meta">{t('role.skipHint')}</span>
        </div>

        <p className="t-meta">{t('role.roleSource')}</p>
      </div>

      {/* Governance: the DEMO badge is never dismissible and never absent. It was missing
          from this screen only - the first screen of the walkthrough, and the one most
          likely to be screenshotted. */}
      <DemoBadge />
    </div>
  );
}
