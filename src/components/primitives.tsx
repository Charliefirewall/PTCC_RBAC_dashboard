/**
 * Shared presentational primitives. No store imports here - props only.
 */

import { useTx } from '../i18n/t';
import { useState, type ReactNode } from 'react';
import { useSettings } from '../store';
import type { EventSeverity, Evidence, Severity } from '../sim/types';
import { dict, type I18nKey } from '../i18n/dict';
import { useLang, useT } from '../i18n/t';
import { Icon, type IconName } from './Icon';
import { Tooltip } from './Tooltip';

/*
 * The new components live in their own files but are re-exported HERE, because every
 * module in the app already imports from `components/primitives`. One import path for
 * the kit, no per-call-site archaeology about which file a primitive lives in.
 */
export { DataTable, type Column, type SortDir } from './DataTable';
export { Tooltip } from './Tooltip';
export {
  Callout, type CalloutKind,
  Stepper, type Step, type StepState,
  Input, Select, TextArea, NumberInput, Range, Switch, Checkbox,
} from './kit';

// ---------------------------------------------------------------- bilingual label

export function BilingualLabel({
  k,
  params,
  stack,
  className = '',
}: {
  k: I18nKey;
  params?: Record<string, string | number>;
  /** wall mode stacks EN over MN, as the deck's own tiles do */
  stack?: boolean;
  className?: string;
}) {
  const t = useT();
  const lang = useLang();
  if (!stack) return <span className={className}>{t(k, params)}</span>;
  const en = dict[k].en;
  let mn = dict[k].mn;
  if (params) for (const [pk, pv] of Object.entries(params)) mn = mn.replaceAll(`{${pk}}`, String(pv));
  return (
    <span className={`flex flex-col leading-tight ${className}`}>
      <span>{lang === 'mn' ? mn : en}</span>
      <span className="text-[0.72em] text-[var(--color-text3)]">{lang === 'mn' ? en : mn}</span>
    </span>
  );
}

// ---------------------------------------------------------------- evidence tag

const EV_COLOR: Record<Evidence, string> = {
  CONFIRMED: 'var(--color-sev-ok)',
  INFERRED: 'var(--color-accent)',
  ASSUMPTION: 'var(--color-sev-warn)',
  FUTURE: 'var(--color-tier4)',
};

/**
 * Evidence grade. Two renderings of the same fact:
 *
 *   quiet (default)       - a 6 px dot. The grade is still on every panel and still in
 *                           the tooltip, but it stops competing with the numbers.
 *   loud  (Evidence mode) - the full badge, for the moment a client challenges a figure.
 *
 * The label is never REMOVED in either mode. Provenance is the point of this build.
 */
export function EvidenceTag({ label, cite, className = '' }: { label: Evidence; cite?: string; className?: string }) {
  const t = useT();
  const tx = useTx();
  const loud = useSettings((s) => s.showEvidence);
  const title = `${t(`evidence.${label}` as I18nKey)}${cite ? ` - ${tx(cite)}` : ''}`;
  /*
   * Defect A-7: this used to be a native `title=`, which no keyboard and no touch device
   * can reach. It is now a real Tooltip carrying a SENTENCE about what the grade means,
   * not just the word.
   *
   * The quiet dot is deliberately NOT a tab stop. There are a dozen or more per screen,
   * and putting each 5 px dot in the tab order would bury the page's real controls. It
   * keeps its `aria-label`, so assistive tech still reads the grade; the full badge - the
   * form Evidence mode shows when a client challenges a figure - IS focusable.
   */
  const tip = (
    <>
      <span className="font-semibold">{t(`kit.ev.${label}` as I18nKey)}</span>
      {cite ? (
        <>
          <br />
          <span className="t-meta">
            {t('kit.ev.source')}: {tx(cite)}
          </span>
        </>
      ) : null}
    </>
  );

  if (!loud) {
    /*
     * Quiet marker, weighted by how much the grade actually needs saying.
     *
     * A filled colour dot in a tile corner reads as a STATUS LIGHT - a green dot on
     * "Buses in service" looks like an OK indicator, not provenance. So the default
     * grades get almost no ink, and only the two that warrant a second look carry
     * colour. Provenance stays reachable everywhere via the tooltip.
     */
    const flagged = label === 'ASSUMPTION' || label === 'FUTURE';
    return (
      <Tooltip content={tip} className={`shrink-0 ${className}`}>
        <span
          className="inline-block shrink-0 rounded-full"
          style={
            flagged
              ? { width: 6, height: 6, background: EV_COLOR[label], opacity: 0.95 }
              : {
                  width: 5,
                  height: 5,
                  border: `1px solid var(--color-text3)`,
                  opacity: label === 'CONFIRMED' ? 0.3 : 0.55,
                }
          }
          aria-label={title}
          role="img"
        />
      </Tooltip>
    );
  }
  return (
    <Tooltip content={tip} className={`shrink-0 ${className}`}>
      <span
        // Focusable: in Evidence mode the badge is the affordance a presenter is asked
        // to reach for, so it has to be reachable without a mouse.
        tabIndex={0}
        className="inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-[1px] text-[9px] font-semibold uppercase tracking-wider"
        style={{ color: EV_COLOR[label], border: `1px solid ${EV_COLOR[label]}`, opacity: 0.9 }}
      >
        {t(`evidence.${label}` as I18nKey)}
        {cite ? <span className="font-normal opacity-70">{tx(cite)}</span> : null}
      </span>
    </Tooltip>
  );
}

// ---------------------------------------------------------------- severity

const SEV_COLOR: Record<Severity, string> = {
  informational: 'var(--color-sev-info)',
  warning: 'var(--color-sev-warn)',
  critical: 'var(--color-sev-crit)',
};
const SEV_ICON: Record<Severity, string> = { informational: 'i', warning: '!', critical: '●' };

/** Three-level ALERT severity. Round dot + word. */
export function SeverityChip({ severity, size = 'md' }: { severity: Severity; size?: 'sm' | 'md' | 'wall' }) {
  const t = useT();
  const px = size === 'wall' ? 'text-[0.85em] px-2 py-1' : size === 'sm' ? 'text-[10px] px-1.5 py-[1px]' : 'text-[11px] px-2 py-0.5';
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full font-semibold ${px}`}
      style={{ color: SEV_COLOR[severity], background: `color-mix(in srgb, ${SEV_COLOR[severity]} 16%, transparent)` }}
    >
      <span aria-hidden>{SEV_ICON[severity]}</span>
      {t(`sev.${severity}` as I18nKey)}
    </span>
  );
}

const EV_SEV_COLOR: Record<EventSeverity, string> = {
  1: 'var(--color-ev-crisis)',
  2: 'var(--color-ev-critical)',
  3: 'var(--color-ev-high)',
  4: 'var(--color-ev-medium)',
  5: 'var(--color-ev-low)',
};
const EV_SEV_KEY: Record<EventSeverity, I18nKey> = {
  1: 'sev.crisis',
  2: 'sev.critical',
  3: 'sev.high',
  4: 'sev.medium',
  5: 'sev.low',
};

/**
 * Five-level EVENT severity. Deliberately a different shape from SeverityChip -
 * a hexagon carrying the integer 1-5 - so the two scales cannot be confused.
 */
export function EventSeverityBadge({ level, size = 'md' }: { level: EventSeverity; size?: 'sm' | 'md' }) {
  const t = useT();
  const c = EV_SEV_COLOR[level];
  const s = size === 'sm' ? 16 : 20;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-flex items-center justify-center text-[10px] font-bold text-[var(--color-on-accent)]"
        style={{
          width: s,
          height: s,
          background: c,
          clipPath: 'polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%)',
        }}
      >
        {level}
      </span>
      <span className="text-[11px] font-semibold" style={{ color: c }}>
        {t(EV_SEV_KEY[level])}
      </span>
    </span>
  );
}

// ---------------------------------------------------------------- status pill

export function StatusPill({
  tone = 'neutral',
  children,
}: {
  tone?: 'neutral' | 'ok' | 'warn' | 'crit' | 'info';
  children: ReactNode;
}) {
  const color =
    tone === 'ok' ? 'var(--color-sev-ok)'
    : tone === 'warn' ? 'var(--color-sev-warn)'
    : tone === 'crit' ? 'var(--color-sev-crit)'
    : tone === 'info' ? 'var(--color-accent)'
    : 'var(--color-text2)';
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{ color, background: `color-mix(in srgb, ${color} 14%, transparent)` }}
    >
      {children}
    </span>
  );
}

// ---------------------------------------------------------------- sparkline

export function Sparkline({
  values,
  width = 64,
  height = 18,
  color = 'var(--color-accent)',
}: {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  if (values.length < 2) return <svg width={width} height={height} />;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || 1;
  const step = width / (values.length - 1);
  const d = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)},${(height - ((v - lo) / span) * height).toFixed(1)}`).join(' ');
  return (
    <svg width={width} height={height} className="shrink-0 opacity-80">
      <path d={d} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  );
}

// ---------------------------------------------------------------- KPI tile

/**
 * The tile foot (plan §13.7, defect A-4). Four shapes in one optional slot,
 * discriminated by which key is present so a call site reads as a sentence:
 *
 *   { hint }  - what the number actually is, in words
 *   { delta } - arrow + text, coloured by `good` and NOT by direction: a falling
 *               alert count is good news and must never render red
 *   { spark } - the trend, under the number where it has the tile's full width
 *   { dist }  - a stacked critical / warning / ok bar, the way the reference shows
 *               a split inside a tile. Always labelled: an unlabelled three-colour
 *               bar is the same defect in a new costume.
 */
export type KpiFoot =
  | { hint: string }
  | { delta: { dir: 'up' | 'down' | 'flat'; text: string; good?: boolean } }
  | { spark: number[] }
  | { dist: { crit: number; warn: number; ok: number } };

function KpiFootRow({ foot, color, wall }: { foot: KpiFoot; color: string; wall?: boolean }) {
  const t = useT();
  const fs = wall ? '0.6em' : 10;

  if ('hint' in foot) {
    // Wraps rather than truncates, for the same reason as `dist` below: the hint is the
    // sentence that says what the number IS, and half a sentence says nothing.
    return (
      <span className="t-meta" style={{ fontSize: fs, lineHeight: 1.3 }}>
        {foot.hint}
      </span>
    );
  }
  if ('spark' in foot) {
    return <Sparkline values={foot.spark} color={color} width={wall ? 160 : 96} height={wall ? 26 : 18} />;
  }
  if ('delta' in foot) {
    const d = foot.delta;
    const c =
      d.good === undefined ? 'var(--color-text3)'
      : d.good ? 'var(--color-sev-ok)'
      : 'var(--color-sev-crit)';
    return (
      <span className="flex min-w-0 items-center gap-1" style={{ color: c, fontSize: fs }}>
        {d.dir !== 'flat' && <Icon name={d.dir === 'up' ? 'trend-up' : 'trend-down'} size={wall ? '0.8em' : 11} />}
        <span className="num truncate">{d.text}</span>
      </span>
    );
  }

  const { crit, warn, ok } = foot.dist;
  const total = crit + warn + ok || 1;
  const segs = [
    { n: crit, c: 'var(--color-sev-crit)' },
    { n: warn, c: 'var(--color-sev-warn)' },
    { n: ok, c: 'var(--color-sev-ok)' },
  ];
  const label = t('kit.dist', { crit: fmtInt(crit), warn: fmtInt(warn), ok: fmtInt(ok) });
  return (
    <span className="flex w-full flex-col gap-1">
      <span
        className="flex w-full overflow-hidden rounded-full bg-[var(--color-bg3)]"
        style={{ height: wall ? 8 : 5 }}
        role="img"
        aria-label={label}
      >
        {segs.map((s, i) => (s.n > 0 ? <span key={i} style={{ width: `${(s.n / total) * 100}%`, background: s.c }} /> : null))}
      </span>
      {/* NOT truncated. It is the only place the funnel split is written out, and
          "29 critical . 21 attention . 1..." needs 180px where the tile gives 168 at
          1024 - ellipsising it removes the number the operator is being asked to read.
          Wrapping costs the KPI row ~13px of height on one breakpoint; a lost figure
          costs the operator the point of the tile. */}
      <span className="t-meta" style={{ fontSize: fs, lineHeight: 1.25 }}>
        {label}
      </span>
    </span>
  );
}

export function KpiTile({
  labelKey,
  value,
  spark,
  tone = 'neutral',
  evidence,
  wall,
  onClick,
  sub,
  icon,
  unit,
  foot,
}: {
  labelKey: I18nKey;
  value: string | number;
  spark?: number[];
  tone?: 'neutral' | 'ok' | 'warn' | 'crit';
  evidence?: Evidence;
  wall?: boolean;
  onClick?: () => void;
  sub?: string;
  /** Sits before the label. Names come from the sprite - see `ICON_NAMES`. */
  icon?: IconName;
  /** Rendered at ~60 % of the value, in text2, on the value's baseline. */
  unit?: string;
  foot?: KpiFoot;
}) {
  const color =
    tone === 'crit' ? 'var(--color-sev-crit)'
    : tone === 'warn' ? 'var(--color-sev-warn)'
    : tone === 'ok' ? 'var(--color-sev-ok)'
    : 'var(--color-text1)';
  // Only a tile that DOES something is a button. Rendering every tile as one made 26 of
  // 29 focusable dead ends - 21 on the Command Centre alone - each announced to a screen
  // reader as "button" with nothing behind it. A keyboard user tabbed through six inert
  // stops before reaching a real control.
  const Root = onClick ? 'button' : 'div';
  return (
    <Root
      {...(onClick ? { type: 'button' as const, onClick } : {})}
      className={`panel flex flex-col items-start gap-1 px-3 py-2 text-left transition-colors ${onClick ? 'cursor-pointer hover:border-[var(--color-accent)]' : 'cursor-default'}`}
      style={{ minWidth: 0 }}
    >
      <div className="flex w-full items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5 text-[var(--color-text3)]">
          {icon ? <Icon name={icon} size={wall ? '1em' : 13} className="shrink-0" /> : null}
          <BilingualLabel k={labelKey} stack={wall} className="panel-title" />
        </span>
        {evidence ? <EvidenceTag label={evidence} /> : null}
      </div>
      <div className="flex w-full items-end justify-between gap-2">
        <span className="num font-semibold leading-none" style={{ color, fontSize: wall ? '2.6em' : '1.9rem' }}>
          {value}
          {unit ? (
            <span className="ml-1 font-medium text-[var(--color-text2)]" style={{ fontSize: '0.6em' }}>
              {unit}
            </span>
          ) : null}
        </span>
        {spark ? <Sparkline values={spark} color={color} /> : null}
      </div>
      {sub ? <span className="t-meta">{sub}</span> : null}
      {foot ? (
        <div className="flex w-full min-w-0 items-center pt-0.5">
          <KpiFootRow foot={foot} color={color} wall={wall} />
        </div>
      ) : null}
    </Root>
  );
}

// ---------------------------------------------------------------- drill breadcrumb

export function DrillBreadcrumb({
  path,
}: {
  path: { key: I18nKey; label?: string; onClick?: () => void }[];
}) {
  const t = useT();
  return (
    <nav className="t-meta flex items-center gap-1">
      {path.map((p, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <span className="opacity-50">›</span>}
          <button
            type="button"
            onClick={p.onClick}
            className={p.onClick ? 'hover:text-[var(--color-accent)]' : 'cursor-default'}
          >
            {t(p.key)}
            {p.label ? <span className="num ml-1 text-[var(--color-text2)]">{p.label}</span> : null}
          </button>
        </span>
      ))}
    </nav>
  );
}

// ---------------------------------------------------------------- tier badge

export function TierBadge({ tier }: { tier: 1 | 2 | 3 | 4 }) {
  const t = useT();
  const key: I18nKey = tier === 1 ? 'cop.tier1' : tier === 2 ? 'cop.tier2' : tier === 3 ? 'cop.tier3' : 'cop.tier4';
  const color = tier === 4 ? 'var(--color-tier4)' : tier === 3 ? 'var(--color-tier3)' : tier === 2 ? 'var(--color-accent)' : 'var(--color-text3)';
  return (
    <span
      className="inline-flex items-center gap-1 rounded px-1.5 py-[1px] text-[10px] font-semibold"
      style={{ color, border: `1px solid ${color}` }}
    >
      {t('cop.tier', { n: tier })} · {t(key)}
    </span>
  );
}

// ---------------------------------------------------------------- misc

/**
 * Panel. Optionally collapsible: the whole header is the toggle, so there is one
 * obvious target rather than a 12 px chevron hit area.
 *
 * A collapsed panel keeps its `summary` visible. Collapsing to a bare title strips the
 * one thing the operator wanted to keep - the headline number - and forces them to
 * expand it again, which defeats the point.
 */
export function Panel({
  titleKey,
  title,
  right,
  children,
  className = '',
  bodyClassName = '',
  collapsible = false,
  defaultOpen = true,
  summary,
  sub,
  foot,
}: {
  titleKey?: I18nKey;
  title?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  /** Shown in the header while collapsed - keep it to one number or a short phrase. */
  summary?: ReactNode;
  /**
   * One explanatory sentence under the title (plan item 27 / defect A-6). This is what
   * makes a panel self-explaining: it says what the panel is, not what it is called.
   */
  sub?: ReactNode;
  /**
   * Bottom row. The reference's convention, adopted exactly: a hint on the LEFT saying
   * how to read the panel or what clicking does, and a deeper link on the RIGHT. The
   * row is a `justify-between` flex, so passing two children gives that shape for free:
   *
   *   foot={<><span>{t('...hint')}</span><PanelLink .../></>}
   */
  foot?: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const shown = !collapsible || open;
  const hasHeader = Boolean(titleKey || title || right || collapsible);

  const heading = (
    <h2 className="panel-title flex min-w-0 items-center gap-1.5">
      {collapsible && <Chevron open={open} />}
      <span className="truncate">{titleKey ? <BilingualLabel k={titleKey} /> : title}</span>
    </h2>
  );

  return (
    // `self-start` while collapsed: grid and flex rows stretch every cell to the tallest
    // sibling, so a collapsed panel next to an open one rendered as a title bar on top of
    // 280px of nothing - which reads as an unfinished screen, not a closed panel.
    <section className={`panel flex min-h-0 min-w-0 flex-col ${collapsible && !open ? 'self-start' : ''} ${className}`}>
      {hasHeader && (
        <header
          className={`flex shrink-0 items-center justify-between gap-2 px-3 py-1.5 ${shown && !sub ? 'border-b border-[var(--color-line)]' : ''}`}
        >
          {collapsible ? (
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              className="flex min-w-0 flex-1 items-center gap-2 text-left hover:text-[var(--color-text2)]"
            >
              {heading}
              {/* The summary is the WHOLE reason a collapsed panel is still useful - it
                  carries the headline number. Sharing the header's shrink budget evenly
                  with the title gave "Annual cost 9,140,748" 33px of 122 at 1024, i.e.
                  the number the panel collapsed around was the first thing ellipsised.
                  The title truncates first now; the summary keeps up to 70% of the row. */}
              {!open && summary ? (
                <span className="t-meta shrink-0 truncate" style={{ maxWidth: '70%' }}>
                  {summary}
                </span>
              ) : null}
            </button>
          ) : (
            heading
          )}
          {right}
        </header>
      )}
      {/* `sub` sits below the header band so it can run the panel's full width without
          fighting `right` for room. Rendered only when given: the DOM of every existing
          call site is unchanged. */}
      {hasHeader && shown && sub ? (
        <p
          className="t-meta shrink-0 border-b border-[var(--color-line)] px-3 pb-1.5"
          style={{ maxWidth: '90ch' }}
        >
          {sub}
        </p>
      ) : null}
      {shown && (
        <div className={`min-h-0 flex-1 overflow-auto ${bodyClassName} ${collapsible ? 'collapse-in' : ''}`}>
          {children}
        </div>
      )}
      {shown && foot ? (
        <div
          className="t-meta flex shrink-0 items-center justify-between gap-3 border-t border-[var(--color-line)]"
          style={{ padding: 'var(--sp-2, 8px) var(--sp-3, 12px)' }}
        >
          {foot}
        </div>
      ) : null}
    </section>
  );
}

/**
 * The right half of a Panel `foot`: the deeper link. A hash href rather than an onClick,
 * so it is a real link - middle-clickable, and it tells you where it goes.
 */
export function PanelLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      className="flex shrink-0 items-center gap-1 font-medium text-[var(--color-accent)] hover:underline"
    >
      {children}
      <Icon name="chevron-right" size={11} />
    </a>
  );
}

export function Chevron({ open, size = 10 }: { open: boolean; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 10 10"
      aria-hidden
      className="shrink-0 transition-transform duration-150"
      style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}
    >
      <path d="M1 3l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** The one button in the app. Variants, not a bespoke class string per call site. */
export function Button({
  children,
  onClick,
  variant = 'ghost',
  size = 'md',
  disabled,
  title,
  className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'ghost' | 'danger' | 'agent';
  size?: 'sm' | 'md';
  disabled?: boolean;
  title?: string;
  className?: string;
}) {
  const pad = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1.5 text-[12px]';
  const look =
    variant === 'primary'
      ? 'border-transparent text-[var(--color-on-accent)]'
      : variant === 'danger'
        ? 'border-[var(--color-sev-crit)] text-[var(--color-sev-crit)]'
        : variant === 'agent'
          ? 'border-[var(--color-agent)] text-[var(--color-agent)]'
          : 'border-[var(--color-line)] text-[var(--color-text2)] hover:border-[var(--color-text3)] hover:text-[var(--color-text1)]';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md border font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${pad} ${look} ${className}`}
      style={variant === 'primary' ? { background: 'var(--color-accent)' } : undefined}
    >
      {children}
    </button>
  );
}

/**
 * Empty state (plan §13.7, backlog 39, defect A-9). A bare "-" told the operator
 * nothing: is it loading, is it broken, or is there genuinely nothing to see?
 *
 * `children` still works exactly as before - 20-odd call sites pass a sentence and
 * render unchanged. Passing `title`/`text` instead gets the two-line treatment, and
 * `tone="ok"` says the emptiness is GOOD NEWS (no overcrowded routes is a result, not
 * a void).
 */
export function Empty({
  children,
  title,
  text,
  tone = 'neutral',
  action,
}: {
  children?: ReactNode;
  title?: string;
  text?: string;
  tone?: 'neutral' | 'ok';
  action?: ReactNode;
}) {
  const color = tone === 'ok' ? 'var(--color-sev-ok)' : 'var(--color-text3)';
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1 p-6 text-center" style={{ gap: 'var(--sp-1)' }}>
      {title ? (
        <span className="t-card" style={{ color }}>
          {title}
        </span>
      ) : null}
      {text || children ? <span className="t-meta" style={{ maxWidth: '44ch' }}>{text ?? children}</span> : null}
      {action}
    </div>
  );
}

export function Bar({ pct, color, height = 6 }: { pct: number; color: string; height?: number }) {
  return (
    <div className="w-full rounded-full bg-[var(--color-bg3)]" style={{ height }}>
      <div className="rounded-full transition-[width] duration-300" style={{ width: `${Math.min(100, Math.max(0, pct))}%`, height, background: color }} />
    </div>
  );
}

export function fmtInt(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}
export function fmtCompact(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 100_000 ? 0 : 1)}k` : String(Math.round(n));
}
export function fmtMin(seconds: number): string {
  const m = seconds / 60;
  return `${m >= 0 ? '+' : ''}${m.toFixed(m > -10 && m < 10 ? 1 : 0)}`;
}
export function fmtMnt(n: number): string {
  return `${Math.round(n).toLocaleString('en-US')} ₮`;
}
