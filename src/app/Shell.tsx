import { lazy, Suspense, useEffect, useMemo, type ReactNode } from 'react';
import { MODULES, useRoute } from './App';
import { TopBar } from './TopBar';
import { NavRail } from './NavRail';
import { ScenarioBar } from './ScenarioBar';
import { ErrorBoundary } from './ErrorBoundary';
import { OverlayHost } from './OverlayHost';
import { useHotkeys } from './hotkeys';
import { overlay } from '../store/overlay';
import { useSettings } from '../store';
import { useT } from '../i18n/t';
import { specOf } from '../modules/roles/roles';
import type { I18nKey } from '../i18n/dict';

const CommandCentre = lazy(() => import('../modules/command/CommandCentre'));
const LiveMap = lazy(() => import('../modules/map/LiveMap'));
const Regularity = lazy(() => import('../modules/regularity/Regularity'));
const VehicleDetail = lazy(() => import('../modules/vehicle/VehicleDetail'));
const Passenger = lazy(() => import('../modules/passenger/Passenger'));
const Alerts = lazy(() => import('../modules/alerts/Alerts'));
const Forecast = lazy(() => import('../modules/forecast/Forecast'));
const Comms = lazy(() => import('../modules/comms/Comms'));
const FleetHealth = lazy(() => import('../modules/health/FleetHealth'));
const Operators = lazy(() => import('../modules/operators/Operators'));
const Copilot = lazy(() => import('../modules/copilot/Copilot'));
const Roi = lazy(() => import('../modules/roi/Roi'));
const Analytics = lazy(() => import('../modules/analytics/Analytics'));
const Multimodal = lazy(() => import('../modules/multimodal/Multimodal'));
const Settings = lazy(() => import('../modules/settings/Settings'));
const RoleDashboard = lazy(() => import('../modules/roles/RoleDashboard'));
const AgentConsole = lazy(() => import('../modules/agentic/AgentConsole'));
const Provenance = lazy(() => import('../modules/provenance/Provenance'));
const Depot = lazy(() => import('../modules/depot/Depot'));
const Platform = lazy(() => import('../modules/platform/Platform'));

function Route({ path }: { path: string }) {
  if (path.startsWith('vehicle/')) return <VehicleDetail vehicleId={path.slice('vehicle/'.length)} />;
  if (path.startsWith('regularity')) return <Regularity />;
  switch (path) {
    case 'dashboard': return <RoleDashboard />;
    case 'command': return <CommandCentre />;
    case 'map': return <LiveMap />;
    case 'passenger': return <Passenger />;
    case 'alerts': return <Alerts />;
    case 'forecast': return <Forecast />;
    case 'comms': return <Comms />;
    case 'health': return <FleetHealth />;
    case 'operators': return <Operators />;
    case 'copilot': return <Copilot />;
    case 'agentic': return <AgentConsole />;
    case 'roi': return <Roi />;
    case 'analytics': return <Analytics />;
    case 'provenance': return <Provenance />;
    case 'depot': return <Depot />;
    case 'platform': return <Platform />;
    case 'multimodal': return <Multimodal />;
    case 'settings': return <Settings />;
    default: return <CommandCentre />;
  }
}

/**
 * "DEMO - simulated data" disclaimer. Governance: always visible, never dismissible.
 *
 * It used to be `position: fixed` bottom-centre. That is exactly the wrong choice for a
 * notice that may not be missed: with `pointer-events-none` it did not block clicks, it
 * silently sat ON TOP of whatever was underneath - at 1600x900 with no ScenarioBar it
 * covered the bottom panel row's text. A disclaimer that hides content is worse than one
 * that costs 22px.
 *
 * So it is a normal flow row now. It reserves its own space, it cannot overlap anything
 * in any route or either mode, and it is still unmissable. No z-index needed at all,
 * which is also the only way to be sure it never fights another layer.
 */
export function DemoBadge() {
  const t = useT();
  return (
    <div className="flex h-[22px] shrink-0 items-center justify-center border-t border-[var(--color-sev-warn)] bg-[var(--color-bg0)]">
      <span className="t-label !text-[var(--color-sev-warn)]">
        {t('app.demoBadge')}
      </span>
    </div>
  );
}

/**
 * One <h1> per route, in the shell rather than in sixteen modules.
 *
 * 14 of 16 routes had no <h1> at all and #/copilot had no heading at any level, so a
 * screen reader landed on a screen with no announced name. Putting it here means exactly
 * one heading per route, no module has to remember, and the modules' own layouts - whose
 * vertical budgets are tight - do not change, because `sr-only` takes no space.
 *
 * The modules that DID carry an <h1> (the Command Centre hero, the role dashboard's role
 * name) were demoted to <h2>: they are content headings under the page name, not the page
 * name itself.
 */
function PageHeading({ path }: { path: string }) {
  const t = useT();
  const key =
    path.startsWith('vehicle/') ? 'nav.vehicle'
    : MODULES.find((m) => path === m.path || (m.path === 'regularity' && path.startsWith('regularity')))?.key
      ?? 'nav.command';
  return <h1 className="sr-only">{t(key as I18nKey)}</h1>;
}

export function Shell() {
  const [path] = useRoute();
  const t = useT();
  const mode = useSettings((s) => s.mode);
  const role = useSettings((s) => s.role);
  useHotkeys();

  // Overlay rule 5 (plan 12.3): a route change force-closes every layer. Shell is the
  // only place that knows the route, so this is the only place it can be enforced.
  useEffect(() => overlay.closeAll(), [path]);

  // The boundary is keyed by route: navigating away from a broken screen remounts a
  // fresh boundary, so a failure is recoverable without a reload (D-1).
  const guard = (children: ReactNode) => (
    <ErrorBoundary
      key={path}
      title={t('ov.err.title')}
      hint={t('ov.err.hint')}
      reloadLabel={t('ov.err.reload')}
    >
      {children}
    </ErrorBoundary>
  );

  /*
   * Nav subset per role (R2898-R2909 names the roles; the subset is INFERRED from each
   * role's stated function). A hidden module is hidden from the NAV only - its URL still
   * resolves, because hiding a screen is an information-hierarchy decision here, not a
   * security boundary. Real RBAC is out of scope (README).
   */
  const modules = useMemo(() => {
    const allowed = specOf(role).nav as readonly string[];
    return [...MODULES]
      .filter((m) => allowed.includes(m.path))
      .sort((a, b) => allowed.indexOf(a.path) - allowed.indexOf(b.path));
  }, [role]);

  const openNavigation = () => {
    overlay.openDrawer({
      id: 'primary-navigation',
      title: t('nav.aria'),
      body: <NavRail modules={modules} current={path} mobile />,
    });
  };

  if (mode === 'wall') {
    return (
      <div className="wall flex h-full flex-col bg-[var(--color-bg0)]">
        <PageHeading path="command" />
        {guard(
          <Suspense fallback={<div className="p-6 text-[var(--color-text3)]">{t('app.loading')}</div>}>
            <CommandCentre />
          </Suspense>,
        )}
        <ScenarioBar />
        <DemoBadge />
        <ErrorBoundary title={t('ov.err.title')} hint={t('ov.err.hint')} reloadLabel={t('ov.err.reload')}>
        <OverlayHost />
      </ErrorBoundary>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-[var(--color-bg0)]">
      <TopBar onOpenNav={openNavigation} />
      <div className="flex min-h-0 flex-1">
        <NavRail modules={modules} current={path} />
        {/* D-3: `overflow-hidden` meant a layout that did not fit was simply cut off with
            no scroll affordance at all - at 1024 that was 31 px of the bottom panel row,
            silently. `overflow-auto` is the affordance; every module still manages its own
            internal scrolling, so nothing gains a second scrollbar at a size that fits. */}
        <main className="min-w-0 flex-1 overflow-auto p-2">
          <PageHeading path={path} />
          {guard(
            <Suspense fallback={<div className="p-6 text-[var(--color-text3)]">{t('app.loading')}</div>}>
              <Route path={path} />
            </Suspense>,
          )}
        </main>
      </div>
      <ScenarioBar />
      <DemoBadge />
      <ErrorBoundary title={t('ov.err.title')} hint={t('ov.err.hint')} reloadLabel={t('ov.err.reload')}>
        <OverlayHost />
      </ErrorBoundary>
    </div>
  );
}
