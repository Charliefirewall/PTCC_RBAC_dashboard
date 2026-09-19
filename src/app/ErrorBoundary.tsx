/**
 * Defect D-1: there was no error boundary anywhere. One lazy chunk that failed to load
 * (a stale `dist/`, 404 on `Operators-*.js`) threw during render and React unmounted
 * the ENTIRE tree - 8 of 15 routes went blank with nothing on screen to say why.
 *
 * A boundary must be a class component; React has no hook equivalent. Shell wraps the
 * route <Suspense> in one and keys it by route, so navigating away from a broken route
 * remounts a fresh boundary and the app recovers without a reload.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /**
   * Bilingual strings are resolved by the caller - a class cannot call useT().
   * Optional so the OUTERMOST boundary (main.tsx, above the i18n provider and above
   * App itself) can still mount; it is the last line of defence and must never be the
   * thing that fails to render. English fallbacks only apply there.
   */
  title?: string;
  hint?: string;
  reloadLabel?: string;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Silence is what made D-1 invisible. Keep the trace in the console.
    console.error('[route error]', error, info.componentStack);
  }

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="p-4" role="alert">
        <div className="panel max-w-[640px] p-4">
          <h2 className="t-card text-[var(--color-sev-crit)]">{this.props.title ?? 'This screen could not be rendered'}</h2>
          <p className="t-body mt-2 text-[var(--color-text2)]">{this.props.hint ?? 'The rest of the application is unaffected.'}</p>
          <pre className="num mt-2 max-h-[180px] overflow-auto rounded border border-[var(--color-line)] bg-[var(--color-bg2)] p-2 text-[11px] !text-[var(--color-text2)] t-meta">
            {String(error?.message || error)}
          </pre>
          <button
            type="button"
            onClick={() => location.reload()}
            className="mt-3 rounded border border-[var(--color-accent)] px-2 py-1 text-[11px] font-medium text-[var(--color-accent)]"
          >
            {this.props.reloadLabel ?? 'Reload'}
          </button>
        </div>
      </div>
    );
  }
}
