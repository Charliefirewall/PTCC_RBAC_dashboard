/**
 * OverlayHost - the one place in the application where anything floats.
 *
 * Defect D-2: Alerts.tsx and ScenarioBar.tsx each rendered their own `position: fixed`
 * layer at var(--z-modal). Siblings, so paint order was DOM order, both scrims
 * composited, and Escape closed neither. The fix is structural, not cosmetic: one host,
 * mounted once in Shell, portalled to <body>, owning one modal slot, one drawer slot,
 * one shared scrim, the toast stack and the tooltip slot.
 *
 * Plan section 12.3, all ten rules:
 *  1. one modal / one drawer slot - see store/overlay.ts, open() replaces
 *  2. Escape: modal then drawer - ONE global handler, here, never per component
 *  3. the scrim is a single node; its opacity derives from what is open
 *  4. scrim click closes the topmost layer; content clicks stopPropagation
 *  5. route change force-closes everything - Shell.tsx effect on `path`
 *  6. focus trap in modal and drawer; focus returns to the trigger on close
 *  7. role="dialog" + aria-labelledby on both; aria-modal on the TOPMOST only
 *  8. the tooltip slot sits above the modal, inside this host
 *  9. the presenter-help panel is a modal like any other
 * 10. the widened uiaudit asserts <=1 [role=dialog] and <=1 scrim
 *
 * z-index comes only from the --z-* token scale. Colours only from --color-*.
 *
 * WALL MODE. The host used to portal unconditionally to <body>, which is OUTSIDE the
 * `.wall` subtree - so every toast, modal and drawer rendered at laptop size on a 3 m
 * surface read at 3-8 m. In wall mode it therefore renders IN PLACE (it is already a
 * child of the .wall div in Shell) and inherits `font-size: calc(16px * --wall-scale)`.
 * Rendering in place is safe because nothing between <body> and .wall sets `transform`,
 * `filter` or `contain`, so `position: fixed` still resolves against the viewport. Every
 * size in this file is expressed in `em` for the same reason.
 */
import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useOverlayStore, type Tone } from '../store/overlay';
import { useSettings } from '../store';
import { useT } from '../i18n/t';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Rule 6. Plain DOM - no focus-trap dependency for twenty lines of behaviour.
 *
 * Two holes were measured and both are fixed here:
 *
 *  1. the listener was bound to the dialog element, so it only ran while focus was still
 *     INSIDE the dialog. Focus starting on the container itself (tabIndex -1, which is
 *     what happens when the dialog has no focusable child) fell through to native Tab,
 *     landed in the TopBar, and from there the handler never ran again - five consecutive
 *     Tabs walked the whole shell with an aria-modal dialog on screen. The listener is
 *     now on `document` in the capture phase and pulls stray focus back in.
 *  2. `offsetParent !== null` reports false for anything `position: fixed`, so a fixed
 *     child was silently dropped from the tab ring. `getClientRects()` is the test that
 *     actually means "is laid out and visible".
 */
function useFocusTrap(spec: object | null) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!spec) return;
    const el = ref.current;
    if (!el) return;
    const first = el.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? el).focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const items = [...el.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (n) => n.getClientRects().length > 0,
      );
      if (items.length === 0) {
        e.preventDefault();
        el.focus();
        return;
      }
      const lo = items[0]!;
      const hi = items[items.length - 1]!;
      const a = document.activeElement as HTMLElement | null;
      if (!a || a === el || !el.contains(a)) {
        e.preventDefault();
        (e.shiftKey ? hi : lo).focus();
      } else if (e.shiftKey && a === lo) {
        e.preventDefault();
        hi.focus();
      } else if (!e.shiftKey && a === hi) {
        e.preventDefault();
        lo.focus();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
    // The SPEC, not a boolean: a modal that replaces a modal keeps `!!modal` true, so the
    // effect never re-ran and focus stayed wherever the replaced layer left it - outside
    // the dialog that now owns the user. Each open() writes a fresh spec object, so the
    // identity is exactly "a different layer is in the slot".
  }, [spec]);
  return ref;
}

const TONE_COLOR: Record<Tone, string> = {
  info: 'var(--color-sev-info)',
  ok: 'var(--color-sev-ok)',
  warn: 'var(--color-sev-warn)',
  crit: 'var(--color-sev-crit)',
};

export function OverlayHost() {
  const t = useT();
  const modal = useOverlayStore((s) => s.modal);
  const drawer = useOverlayStore((s) => s.drawer);
  const toasts = useOverlayStore((s) => s.toasts);
  const closeTop = useOverlayStore((s) => s.closeTop);
  const closeModal = useOverlayStore((s) => s.closeModal);
  const closeDrawer = useOverlayStore((s) => s.closeDrawer);
  const dismissToast = useOverlayStore((s) => s.dismissToast);

  const wall = useSettings((s) => s.mode === 'wall');

  const modalRef = useFocusTrap(modal);
  // A drawer under an open modal is `inert`; the modal owns focus (rule 7).
  const drawerRef = useFocusTrap(modal ? null : drawer);

  // Rule 2: the ONE Escape handler. Capture phase, so a dialog's own inputs cannot
  // swallow it and module code never needs its own listener again.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (useOverlayStore.getState().closeTop()) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    addEventListener('keydown', onKey, true);
    return () => removeEventListener('keydown', onKey, true);
  }, []);

  if (typeof document === 'undefined') return null;

  const scrimOpen = !!modal || !!drawer;

  const tree = (
    <>
      {/* Rule 3: ONE scrim node, ever. Opacity derives from the deepest open layer,
          so two scrims physically cannot composite. */}
      {scrimOpen && (
        <div
          data-overlay-scrim=""
          aria-hidden
          onClick={() => closeTop()}
          className="fixed inset-0"
          style={{
            zIndex: 'calc(var(--z-drawer) - 1)',
            background: 'var(--color-bg0)',
            opacity: modal ? 0.72 : 0.5,
          }}
        />
      )}

      {/* ---------------------------------------------------------------- drawer */}
      {drawer && (
        <div
          className="fixed inset-y-0 right-0 flex"
          style={{ zIndex: 'var(--z-drawer)', width: drawer.wide ? 'min(47.5em, 96vw)' : 'min(35em, 96vw)' }}
        >
          <div
            ref={drawerRef}
            role="dialog"
            // Only ONE layer may claim aria-modal at a time. With a modal open over the
            // drawer, two aria-modal dialogs coexist and assistive tech cannot tell which
            // owns the user. React 19 supports `inert`, which also stops the covered
            // drawer taking pointer or keyboard focus - correct modal semantics.
            aria-modal={modal ? undefined : true}
            inert={modal ? true : undefined}
            aria-labelledby="overlay-drawer-title"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            className="panel enter flex h-full w-full flex-col rounded-none"
            /* §13.1/§13.4: a drawer painted bg1 was byte-identical to the panel behind it,
               and in dark there is no panel shadow to separate them - it did not read as
               floating at all. The raised tier plus the drawer shadow is the contract. */
            style={{ background: 'var(--color-bg-raised)', boxShadow: 'var(--shadow-drawer)' }}
          >
            <Head
              id="overlay-drawer-title"
              title={drawer.title}
              sub={drawer.sub}
              onClose={closeDrawer}
              label={t('ov.close')}
            />
            <div className="min-h-0 flex-1 overflow-auto p-3">{drawer.body}</div>
            {drawer.footer ? <Foot>{drawer.footer}</Foot> : null}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- modal */}
      {modal && (
        <div
          className="pointer-events-none fixed inset-0 flex items-center justify-center p-4"
          style={{ zIndex: 'var(--z-modal)' }}
        >
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="overlay-modal-title"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            className="panel enter pointer-events-auto flex w-full flex-col"
            style={{
              maxWidth: modal.size === 'wide' ? 'min(55em, 100%)' : 'min(40em, 100%)',
              maxHeight: '90vh',
              background: 'var(--color-bg-raised)',
              boxShadow: 'var(--shadow-3)',
            }}
          >
            <Head id="overlay-modal-title" title={modal.title} onClose={closeModal} label={t('ov.close')} />
            <div className="min-h-0 flex-1 overflow-auto p-3">{modal.body}</div>
            {modal.footer ? <Foot>{modal.footer}</Foot> : null}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- toasts */}
      <div
        className="pointer-events-none fixed bottom-3 right-3 flex flex-col items-end gap-2"
        style={{ zIndex: 'var(--z-toast)' }}
        role="status"
        aria-live="polite"
      >
        {toasts.map((x) => (
          <div
            key={x.id}
            data-toast=""
            className="panel enter pointer-events-auto flex max-w-[23.75em] items-center gap-3 border-l-2 px-3 py-2 text-[0.75em]"
            style={{
              borderLeftColor: TONE_COLOR[x.tone],
              background: 'var(--color-bg-raised)',
              boxShadow: 'var(--shadow-2)',
            }}
          >
            <span className="text-[var(--color-text1)]">{x.msg}</span>
            {x.action ? (
              <button
                type="button"
                className="shrink-0 text-[0.92em] font-semibold text-[var(--color-accent)]"
                onClick={() => {
                  x.action!.run();
                  dismissToast(x.id);
                }}
              >
                {x.action.label}
              </button>
            ) : null}
            <button
              type="button"
              aria-label={t('ov.dismiss')}
              className="ml-auto shrink-0 text-[var(--color-text3)] hover:text-[var(--color-text1)]"
              onClick={() => dismissToast(x.id)}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Rule 8: tooltips and popovers render HERE, above the modal - never as its
          children. Placeholder slot; the tooltip workstream fills it. */}
      <div id="overlay-tooltip-slot" className="pointer-events-none fixed inset-0" style={{ zIndex: 'var(--z-badge)' }} />
    </>
  );

  // In wall mode stay inside the scaled subtree; otherwise portal to <body> as before.
  return wall ? tree : createPortal(tree, document.body);
}

function Head({
  id,
  title,
  sub,
  onClose,
  label,
}: {
  id: string;
  title: string;
  sub?: string;
  onClose: () => void;
  label: string;
}) {
  return (
    <header className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--color-line)] px-3 py-2">
      <div className="min-w-0">
        <h2 id={id} className="text-[0.82em] font-semibold text-[var(--color-text1)]">
          {title}
        </h2>
        {sub ? <p className="mt-0.5 text-[0.69em] text-[var(--color-text3)]">{sub}</p> : null}
      </div>
      <button
        type="button"
        aria-label={label}
        className="px-1 text-[var(--color-text3)] hover:text-[var(--color-text1)]"
        onClick={onClose}
      >
        ✕
      </button>
    </header>
  );
}

function Foot({ children }: { children: ReactNode }) {
  return (
    <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-[var(--color-line)] px-3 py-2">
      {children}
    </footer>
  );
}
