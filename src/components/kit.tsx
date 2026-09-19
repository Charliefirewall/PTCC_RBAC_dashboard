/**
 * Callout, Stepper and the form controls (plan §13.7, backlog 46).
 *
 * Why these exist:
 *
 *  - Callout: six ad-hoc "bordered div with a coloured edge" blocks were written by
 *    hand, each picking its own border width, radius and tint recipe.
 *  - Stepper: three separate implementations of "done / active / pending" existed
 *    (the agent StageTrack, the alert workflow stages, the S8 chevron strip). One
 *    component, two looks - the chevron look is kept because it IS the client's own
 *    Slide 8 diagram and reproducing it is the point.
 *  - Form controls: six copy-pasted `const INPUT = '…'` strings across four files. Every
 *    one of them paired a `<div>` with a `<span>` caption, so not one control in the app
 *    had an accessible name. Here the caption is a real `<label>` wrapping the control,
 *    which is the whole reason to extract them.
 */

import { useId, type ReactNode } from 'react';

// ---------------------------------------------------------------- Callout

export type CalloutKind = 'info' | 'warn' | 'danger' | 'ok';

const CALLOUT_COLOR: Record<CalloutKind, string> = {
  info: 'var(--color-accent)',
  warn: 'var(--color-sev-warn)',
  danger: 'var(--color-sev-crit)',
  ok: 'var(--color-sev-ok)',
};

/**
 * A tinted block that says one thing. `dashed` is the demo's "this is proposed, not
 * real" frame - the honesty device Fleet Health and ROI are built around, so it is a
 * prop here rather than a second component.
 */
export function Callout({
  kind = 'info',
  icon,
  title,
  children,
  dashed,
  className = '',
}: {
  kind?: CalloutKind;
  /** An EvidenceTag, a badge - whatever identifies the claim. Sits left of the text. */
  icon?: ReactNode;
  title?: ReactNode;
  children?: ReactNode;
  /** 2px dashed border + a 4% wash: "proposed extension", never a live figure. */
  dashed?: boolean;
  className?: string;
}) {
  const c = CALLOUT_COLOR[kind];
  return (
    <div
      className={`flex min-w-0 items-start gap-2 ${className}`}
      style={{
        border: dashed ? `2px dashed ${c}` : `1px solid ${c}`,
        background: `color-mix(in srgb, ${c} ${dashed ? 4 : 8}%, transparent)`,
        borderRadius: 'var(--r-3)',
        padding: 'var(--sp-2) var(--sp-3)',
      }}
    >
      {icon ? <span className="shrink-0 pt-0.5">{icon}</span> : null}
      <div className="min-w-0 flex-1">
        {title ? (
          <div className="t-card" style={{ color: c }}>
            {title}
          </div>
        ) : null}
        {children ? <div className="t-body text-[var(--color-text2)]">{children}</div> : null}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Stepper

export type StepState = 'done' | 'active' | 'pending';

export interface Step {
  label: ReactNode;
  state: StepState;
  /** Overrides the state colour - the agent track tints its terminal node by outcome. */
  color?: string;
  onClick?: () => void;
}

const STEP_COLOR: Record<StepState, string> = {
  done: 'var(--color-sev-ok)',
  active: 'var(--color-accent)',
  pending: 'var(--color-text3)',
};

export function Stepper({
  steps,
  variant = 'pill',
  className = '',
}: {
  steps: Step[];
  /** `chevron` is the Slide 8 arrow strip; `pill` is the workflow/agent track. */
  variant?: 'pill' | 'chevron';
  className?: string;
}) {
  if (variant === 'chevron') {
    return (
      <ol className={`flex gap-0.5 ${className}`}>
        {steps.map((s, i) => (
          <li
            key={i}
            aria-current={s.state === 'active' ? 'step' : undefined}
            className="flex min-w-0 flex-1 items-center justify-center bg-[var(--color-bg3)] px-4 py-1.5"
            style={{
              // The clip eats 14px off each end, so the label truncates rather than
              // running under the arrow.
              clipPath:
                i === steps.length - 1
                  ? 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 14px 50%)'
                  : 'polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%, 14px 50%)',
              color: s.state === 'pending' ? 'var(--color-text3)' : 'var(--color-text1)',
            }}
          >
            <span className="t-body min-w-0 truncate font-semibold">{s.label}</span>
          </li>
        ))}
      </ol>
    );
  }

  return (
    <ol className={`flex flex-wrap items-center gap-1 ${className}`}>
      {steps.map((s, i) => {
        const c = s.color ?? STEP_COLOR[s.state];
        const on = s.state !== 'pending';
        const body = (
          <span
            className="t-label inline-flex items-center gap-1 normal-case"
            style={{
              borderRadius: 'var(--r-1)',
              padding: '1px 6px',
              color: on ? c : 'var(--color-text3)',
              border: on ? `1px solid ${c}` : '1px dashed var(--color-line)',
              background: on ? `color-mix(in srgb, ${c} 12%, transparent)` : undefined,
            }}
          >
            {/* State never travels as colour alone: done carries a tick, the rest a number. */}
            <span aria-hidden>{s.state === 'done' ? '✓' : i + 1}</span>
            {s.label}
          </span>
        );
        return (
          <li key={i} className="flex items-center gap-1" aria-current={s.state === 'active' ? 'step' : undefined}>
            {i > 0 && (
              <span aria-hidden className="t-meta" style={{ color: on ? c : 'var(--color-line)' }}>
                →
              </span>
            )}
            {s.onClick ? (
              <button type="button" onClick={s.onClick}>
                {body}
              </button>
            ) : (
              body
            )}
          </li>
        );
      })}
    </ol>
  );
}

// ---------------------------------------------------------------- form controls

/* bg3, not bg2: in the light theme bg2 (#f7f9fc) on a bg1 (#ffffff) panel is not a
   visible field at all. bg3 reads as an input well in BOTH themes. */
const CONTROL =
  't-body w-full rounded border border-[var(--color-line)] bg-[var(--color-bg3)] px-2 py-1 text-[var(--color-text1)] outline-none focus:border-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-50';

/**
 * The wrapper every control shares. A real `<label>` around the control, so clicking
 * the caption focuses the field and assistive tech has a name to read - which is what
 * the `<div>` + `<span>` pattern this replaces never provided.
 */
function Field({
  label,
  hint,
  children,
  row,
  className = '',
}: {
  label: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
  /** Caption beside the control instead of above it - for switches and checkboxes. */
  row?: boolean;
  className?: string;
}) {
  return (
    <label className={`flex min-w-0 ${row ? 'items-center gap-2' : 'flex-col gap-1'} ${className}`}>
      <span className={row ? 't-body min-w-0 text-[var(--color-text2)]' : 't-label'}>{label}</span>
      {children}
      {hint ? <span className="t-meta">{hint}</span> : null}
    </label>
  );
}

export function Input({
  label,
  value,
  onChange,
  placeholder,
  hint,
  type = 'text',
  disabled,
  className = '',
}: {
  label: ReactNode;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: ReactNode;
  type?: 'text' | 'search' | 'tel' | 'email';
  disabled?: boolean;
  className?: string;
}) {
  return (
    <Field label={label} hint={hint} className={className}>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={CONTROL}
      />
    </Field>
  );
}

export function TextArea({
  label,
  value,
  onChange,
  rows = 3,
  placeholder,
  hint,
  disabled,
  className = '',
}: {
  label: ReactNode;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
  hint?: ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <Field label={label} hint={hint} className={className}>
      <textarea
        value={value}
        rows={rows}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={`${CONTROL} resize-y`}
      />
    </Field>
  );
}

export function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  hint,
  disabled,
  className = '',
}: {
  label: ReactNode;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Rendered after the field, not inside it - a unit inside the box is not editable text. */
  unit?: ReactNode;
  hint?: ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <Field label={label} hint={hint} className={className}>
      <span className="flex min-w-0 items-center gap-1.5">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          className={`${CONTROL} num`}
        />
        {unit ? <span className="t-meta shrink-0">{unit}</span> : null}
      </span>
    </Field>
  );
}

export function Select<T extends string>({
  label,
  value,
  onChange,
  options,
  hint,
  disabled,
  className = '',
}: {
  label: ReactNode;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode }[];
  hint?: ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <Field label={label} hint={hint} className={className}>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as T)}
        className={CONTROL}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {/* An <option> can only hold text, so a ReactNode label is stringified here. */}
            {typeof o.label === 'string' || typeof o.label === 'number' ? o.label : String(o.value)}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function Range({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  format,
  hint,
  right,
  disabled,
  className = '',
}: {
  label: ReactNode;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  /** The readout beside the track. A slider with no number is an unreadable input. */
  format?: (v: number) => string;
  hint?: ReactNode;
  /** Extra content after the readout - a status pill, a comparison figure. */
  right?: ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <Field label={label} hint={hint} className={className}>
      <span className="flex min-w-0 items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          className="min-w-0 flex-1"
          style={{ accentColor: 'var(--color-accent)' }}
        />
        <span className="t-card num shrink-0 text-right" style={{ color: 'var(--color-accent)' }}>
          {format ? format(value) : value}
        </span>
        {right}
      </span>
    </Field>
  );
}

export function Checkbox({
  label,
  checked,
  onChange,
  hint,
  disabled,
  className = '',
}: {
  label: ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <Field label={label} hint={hint} row className={className}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="order-first shrink-0"
        style={{ accentColor: 'var(--color-accent)' }}
      />
    </Field>
  );
}

/**
 * Switch. A real `<input type="checkbox" role="switch">` under a drawn track, so it
 * keeps every keyboard and AT behaviour a checkbox already has for free - the version
 * built out of a `<div>` and an `onClick` has none of them.
 */
export function Switch({
  label,
  checked,
  onChange,
  hint,
  disabled,
  className = '',
}: {
  label: ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className={`flex min-w-0 cursor-pointer items-center justify-between gap-3 ${className}`}
    >
      <span className="min-w-0">
        <span className="t-body block text-[var(--color-text2)]">{label}</span>
        {hint ? <span className="t-meta block">{hint}</span> : null}
      </span>
      <span
        aria-hidden
        className="switch-track relative flex shrink-0 items-center rounded-full"
        style={{
          width: 32,
          height: 18,
          background: checked ? 'var(--color-accent)' : 'var(--color-bg3)',
          border: '1px solid var(--color-line)',
          transition: `background-color var(--dur-1) var(--ease)`,
        }}
      >
        <span
          className="absolute rounded-full"
          style={{
            width: 12,
            height: 12,
            left: checked ? 17 : 3,
            background: checked ? 'var(--color-on-accent)' : 'var(--color-text2)',
            transition: `left var(--dur-1) var(--ease)`,
          }}
        />
      </span>
      <input
        id={id}
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        // Visually replaced by the track above, but still the real focusable control:
        // sr-only keeps it in the tab order and in the accessibility tree.
        className="sr-only"
      />
    </label>
  );
}
