import { Component, Suspense, type ErrorInfo, type ReactNode } from 'react';

function Loading({ label }: { label: string }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="flex min-h-32 flex-1 items-center justify-center p-4">
      <span className="t-body text-[var(--color-text2)]">{label}</span>
    </div>
  );
}

class LoadError extends Component<
  { children: ReactNode; title: string; text: string; retry: string },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Lazy module failed to load', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="panel m-2 flex min-h-32 flex-col items-center justify-center gap-2 p-4 text-center">
        <strong className="t-card text-[var(--color-text1)]">{this.props.title}</strong>
        <span className="t-body text-[var(--color-text2)]">{this.props.text}</span>
        <button
          type="button"
          className="rounded border border-[var(--color-accent)] px-3 py-1.5 text-[var(--color-accent)]"
          onClick={() => location.reload()}
        >
          {this.props.retry}
        </button>
      </div>
    );
  }
}

export function AsyncBoundary({ children, loading, errorTitle, errorText, retry }: {
  children: ReactNode;
  loading: string;
  errorTitle: string;
  errorText: string;
  retry: string;
}) {
  return (
    <LoadError title={errorTitle} text={errorText} retry={retry}>
      <Suspense fallback={<Loading label={loading} />}>{children}</Suspense>
    </LoadError>
  );
}
