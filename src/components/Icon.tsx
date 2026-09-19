/**
 * The icon system (plan §13.6).
 *
 * Replaces Unicode glyphs rendered as text. Glyphs are font-dependent, have whatever
 * stroke weight the font happens to give them, and one of them (👥) rendered as a colour
 * emoji next to monochrome neighbours. None of that can be themed.
 *
 * Every symbol lives in the inline sprite in `index.html`. It carries geometry only - no
 * stroke, fill or colour of its own - so the attributes set here inherit into the <use>
 * shadow content. That is what gives the whole set one stroke weight and makes it follow
 * `currentColor` into both themes and into wall mode.
 *
 * Sizing: a number is CSS pixels; a string passes through, so `size="1.2em"` scales with
 * `--wall-scale` on the wall. No new dependency - the sprite is drawn by hand.
 */

const NAMES = [
  // navigation
  'dashboard', 'command', 'map', 'route', 'passengers', 'alert', 'comms', 'health',
  'operators', 'sparkles', 'agent', 'analytics', 'settings', 'multimodal', 'roi',
  // controls
  'chevron-left', 'chevron-right', 'chevron-up', 'chevron-down', 'close', 'check',
  'search', 'mic', 'bell', 'play', 'pause', 'download', 'external', 'filter',
  'plus', 'minus', 'layers', 'refresh',
  // status
  'info', 'warning', 'danger', 'ok', 'clock', 'shield', 'user', 'trend-up', 'trend-down',
  // transport
  'bus', 'stop', 'depot',
] as const;

export type IconName = (typeof NAMES)[number];

/** The full list, so a picker or a doc page can enumerate the set without duplicating it. */
export const ICON_NAMES: readonly IconName[] = NAMES;

export function Icon({
  name,
  size = 16,
  className = '',
  title,
}: {
  name: IconName;
  /** number = px; string passes through (use `em` to ride `--wall-scale`). */
  size?: number | string;
  className?: string;
  /** Only set this when the icon is the ONLY label; otherwise it is decorative. */
  title?: string;
}) {
  // Dev-only guard against the sprite and the IconName union drifting apart.
  if (import.meta.env.DEV && typeof document !== 'undefined' && !document.getElementById(`i-${name}`)) {
    console.warn(`[Icon] no <symbol id="i-${name}"> in the sprite (index.html)`);
  }
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
    >
      <use href={`#i-${name}`} />
    </svg>
  );
}
