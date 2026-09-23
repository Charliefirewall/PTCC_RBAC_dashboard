import { useEffect } from 'react';
import { useTx } from '../i18n/t';
import { HOTKEY_HELP, useRunner } from './hotkeys';
import { SCENARIOS } from '../sim/scenarios';
import { useSettings } from '../store';
import { overlay, useOverlayStore } from '../store/overlay';
import { useLang, useT } from '../i18n/t';

const HELP_ID = 'presenter-help';

/**
 * Plan 12.3 rule 9: the presenter-help panel is a modal like any other. It used to be a
 * second `position: fixed` node at var(--z-modal), a sibling of the Alerts dialog - the
 * two composited their scrims and Escape closed neither (defect D-2).
 *
 * The `H` hotkey still flips `showHelp` in the runner store; this effect mirrors that
 * flag into the single modal slot. Pressing `H` over the Validate dialog therefore
 * REPLACES it, which is the correct behaviour under rule 1.
 */
function usePresenterHelp() {
  const t = useT();
  const tx = useTx();
  const lang = useLang();
  const showHelp = useRunner((s) => s.showHelp);
  const toggleHelp = useRunner((s) => s.toggleHelp);

  useEffect(() => {
    if (showHelp) {
      overlay.openModal({
        id: HELP_ID,
        title: t('ov.help.title'),
        // Closing from the host (Escape, scrim, ✕, a replacement modal) must clear the
        // runner flag, or `H` would need two presses to come back.
        onClose: () => {
          // Re-opened in the same slot (a language switch)? Keep the flag. Replaced by
          // somebody else's modal? Drop it, or `H` would need two presses to return.
          if (useOverlayStore.getState().modal?.id === HELP_ID) return;
          if (useRunner.getState().showHelp) toggleHelp();
        },
        body: (
          <>
            {/* `em`, not px: this modal also renders on the video wall now that the overlay
                host lives inside the scaled subtree, and a 12px help table is unreadable
                at 3-8 m. In operator mode 0.75em resolves to the same 12px as before. */}
            <table className="w-full text-[0.75em]">
              <tbody>
                {HOTKEY_HELP.map(([k, d]) => (
                  <tr key={k}>
                    <td className="num w-[6em] py-1 text-[var(--color-accent)]">{k}</td>
                    <td className="py-1 text-[var(--color-text2)]">{t(d)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <h4 className="panel-title mt-4 mb-1">{t('ov.help.scenarios')}</h4>
            <ul className="space-y-1 text-[0.7em] text-[var(--color-text2)]">
              {Object.values(SCENARIOS).map((s) => (
                <li key={s.id}>
                  <span className="num mr-2 text-[var(--color-accent)]">{s.id}</span>
                  {tx(s.title)}
                </li>
              ))}
            </ul>
          </>
        ),
      });
    } else if (useOverlayStore.getState().modal?.id === HELP_ID) {
      // Only close if OUR modal is still the one in the slot - never yank someone else's.
      overlay.closeModal();
    }
    // NB: `t` is deliberately not a dependency - useT() returns a fresh closure every
    // render, which would re-open the modal on every render. `lang` covers translation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showHelp, lang]);
}

export function ScenarioBar() {
  const t = useT();
  const tx = useTx();
  const { active, step, next, stop, autoplay, pauseAuto } = useRunner();
  const mode = useSettings((s) => s.mode);
  const sc = active ? SCENARIOS[active] : null;
  usePresenterHelp();

  if (mode === 'wall' && !sc) return null;

  return (
    <>
      {sc && (
        <footer className="flex h-9 shrink-0 items-center gap-3 border-t border-[var(--color-line)] bg-[var(--color-bg1)] px-3 text-[11px]">
          <span className="num rounded bg-[var(--color-accent)] px-1.5 py-0.5 font-bold text-[var(--color-on-accent)]">{sc.id}</span>
          <span className="font-medium">{tx(sc.title)}</span>
          <span className="text-[var(--color-text3)]">
            {t('sb.step', { n: step + 1, total: sc.steps.length })}
            {sc.steps[step]?.role ? ` · ${tx(sc.steps[step]!.role!)}` : ''}
            {sc.steps[step] ? ` — ${tx(sc.steps[step]!.label)}` : ''}
          </span>
          <div className="flex-1" />
          <span className="t-meta max-w-[40%] truncate" title={tx(sc.source)}>
            {t('sb.source', { src: tx(sc.source) })}
          </span>
          {autoplay ? (
            <button type="button" data-autoplay="" onClick={pauseAuto} className="rounded border border-[var(--color-accent)] px-2 py-0.5 text-[var(--color-accent)]">
              ⏸ {t('sc.autoplay')}
            </button>
          ) : null}
          {step < sc.steps.length - 1 && (
            <button type="button" onClick={next} className="rounded border border-[var(--color-line)] px-2 py-0.5 hover:border-[var(--color-accent)]">
              {t('sb.next')}
            </button>
          )}
          <button type="button" onClick={stop} className="rounded border border-[var(--color-line)] px-2 py-0.5 hover:border-[var(--color-sev-crit)]">
            {t('sb.reset')}
          </button>
        </footer>
      )}
    </>
  );
}
