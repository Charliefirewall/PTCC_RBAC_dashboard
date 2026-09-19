import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import { App } from './app/App';
import { ErrorBoundary } from './app/ErrorBoundary';
import { applyTheme, useSettings } from './store';
// Side-effect import: activity.ts wires four store subscriptions at module load, so the
// agent feed is populated from tick zero rather than from whenever the agent console is
// first lazy-loaded. It must NOT be imported from store/index.ts - activity.ts imports
// that module, and the cycle leaves the stores undefined when the subscriptions run.
import './store/activity';

// Before first paint, so a light-theme user never sees a dark flash on reload.
applyTheme(useSettings.getState().theme);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
