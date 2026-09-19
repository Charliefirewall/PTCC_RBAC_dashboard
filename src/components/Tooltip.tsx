/**
 * Tooltip (plan §13.7, backlog 25, defect A-7).
 *
 * The app carried 40 native `title=` attributes. A native title cannot be reached by a
 * keyboard, never appears on a touch device, waits a second before showing, cannot be
 * styled or themed, and is clipped by the OS rather than by the viewport. It is not a
 * tooltip; it is a footnote nobody reads.
 *
 * This one renders through the ONE overlay host (plan §12.3 rule 8) into the tooltip
 * slot at `--z-badge`, so it floats above the modal instead of being clipped by the
 * panel that owns the trigger. Shows on hover AND on focus, dismisses on Escape, blur,
 * pointer-leave and scroll.
 *
 * `aria-describedby` rather than `aria-label`: the tooltip EXPLAINS the trigger, it does
 * not rename it. A tooltip that becomes the accessible name hides the visible one.
 */

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type Side = 'top' | 'bottom';

export function Tooltip({
  content,
  children,
  side = 'top',
  className = '',
}: {
  /** Prose. A bare source-line citation is defect A-7 - use an EvidenceTag `cite` for that. */
  content: ReactNode;
  children: ReactNode;
  side?: Side;
  className?: string;
}) {
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);
  const [box, setBox] = useState<{ x: number; y: number; side: Side } | null>(null);

  const show = () => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    // Flip when there is no room above. 56px is the tooltip's worst case at two lines.
    const flip: Side = side === 'top' && r.top < 56 ? 'bottom' : side;
    setBox({ x: r.left + r.width / 2, y: flip === 'top' ? r.top - 6 : r.bottom + 6, side: flip });
  };
  const hide = () => setBox(null);

  useEffect(() => {
    if (!box) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // Stop the overlay host's own Escape handler closing the dialog underneath: the
      // user asked to dismiss the tooltip, nothing more.
      e.stopPropagation();
      hide();
    };
    addEventListener('keydown', onKey, true);
    addEventListener('scroll', hide, true);
    return () => {
      removeEventListener('keydown', onKey, true);
      removeEventListener('scroll', hide, true);
    };
  }, [box]);

  const host = typeof document === 'undefined' ? null : document.getElementById('overlay-tooltip-slot');

  return (
    <>
      <span
        ref={ref}
        aria-describedby={box ? id : undefined}
        onPointerEnter={show}
        onPointerLeave={hide}
        // React's onFocus/onBlur are delegated focusin/focusout, so they fire for a
        // focusable CHILD too - a wrapped button needs nothing added to it.
        onFocus={show}
        onBlur={hide}
        className={`inline-flex min-w-0 items-center ${className}`}
      >
        {children}
      </span>
      {box && host
        ? createPortal(
            <span
              id={id}
              role="tooltip"
              className="t-body pointer-events-none fixed block rounded px-2 py-1"
              style={{
                left: box.x,
                top: box.y,
                transform: `translate(-50%, ${box.side === 'top' ? '-100%' : '0'})`,
                maxWidth: 'min(280px, 90vw)',
                background: 'var(--color-bg-raised)',
                color: 'var(--color-text1)',
                border: '1px solid var(--color-line)',
                borderRadius: 'var(--r-2)',
                boxShadow: 'var(--shadow-2)',
                animation: 'tip-in var(--dur-1) var(--ease)',
              }}
            >
              {content}
            </span>,
            host,
          )
        : null}
    </>
  );
}
