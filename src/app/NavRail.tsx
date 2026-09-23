import { useT } from '../i18n/t';
import { EvidenceTag } from '../components/primitives';
import type { Evidence } from '../sim/types';
import type { I18nKey } from '../i18n/dict';
import { useAlerts } from '../store';
import { Icon, type IconName } from '../components/Icon';

/**
 * Nav path -> sprite symbol (plan §13.6). Previously Unicode glyphs rendered as text,
 * which is font-dependent, mixes stroke weights, and put one colour emoji (👥) next to
 * fourteen monochrome ones. The sprite inherits `currentColor`, so the rail themes.
 */
const ICONS: Record<string, IconName> = {
  dashboard: 'dashboard', command: 'command', map: 'map', regularity: 'route', passenger: 'passengers',
  alerts: 'alert', comms: 'comms', health: 'health', operators: 'operators', copilot: 'sparkles',
  forecast: 'trend-up',
  agentic: 'agent', roi: 'roi', analytics: 'analytics', multimodal: 'multimodal', settings: 'settings',
  // The provenance row was added to MODULES without an entry here, so the rail rendered
  // an empty 16 px slot and the label sat out of line with its fourteen neighbours.
  provenance: 'info',
  depot: 'depot',
  platform: 'layers',
};

const GROUPS = [
  { key: 'nav.group.operations', paths: new Set(['dashboard', 'command', 'map', 'regularity', 'passenger', 'alerts', 'comms', 'health', 'operators', 'depot']) },
  { key: 'nav.group.intelligence', paths: new Set(['forecast', 'copilot', 'agentic', 'roi', 'analytics']) },
  { key: 'nav.group.governance', paths: new Set(['multimodal', 'provenance', 'platform']) },
  { key: 'nav.group.configuration', paths: new Set(['settings']) },
] as const;

export function NavRail({
  modules,
  current,
  mobile = false,
}: {
  modules: readonly { path: string; key: string; evidence: string }[];
  current: string;
  mobile?: boolean;
}) {
  const t = useT();
  const alerts = useAlerts((s) => s.alerts);
  const crit = alerts.filter((a) => a.severity === 'critical').length;

  return (
    <nav
      aria-label={t('nav.aria')}
      data-primary-navigation
      data-mobile-navigation={mobile || undefined}
      className={`flex shrink-0 flex-col overflow-y-auto bg-[var(--color-bg1)] p-2 ${mobile ? 'h-full w-full' : 'hidden w-52 border-r border-[var(--color-line)] lg:flex'}`}
    >
      {GROUPS.map((group) => {
        const entries = modules.filter((m) => group.paths.has(m.path));
        if (!entries.length) return null;
        return (
          <div key={group.key} className="mb-2 last:mb-0">
            <div className="t-label sticky top-0 mb-1 bg-[var(--color-bg1)] px-2 py-1" style={{ zIndex: 'var(--z-raised)' }}>
              {t(group.key as I18nKey)}
            </div>
            <div className="flex flex-col gap-0.5">
            {entries.map((m) => {
        const active = current === m.path || (m.path === 'regularity' && current.startsWith('regularity'));
        return (
          <a
            key={m.path}
            href={`#/${m.path}`}
            // The active row was signalled by background colour alone: nothing announced
            // "you are here", and colour is not an accessible state (§19.1).
            aria-current={active ? 'page' : undefined}
            className={`flex items-center gap-2 rounded px-2 py-1.5 text-[12px] transition-colors ${
              active ? 'bg-[var(--color-bg3)] text-[var(--color-text1)]' : 'text-[var(--color-text2)] hover:bg-[var(--color-bg2)]'
            }`}
          >
            <span className="flex w-4 shrink-0 items-center justify-center opacity-80">
              {ICONS[m.path] ? <Icon name={ICONS[m.path]!} size={15} /> : null}
            </span>
            <span className="min-w-0 flex-1 truncate">{t(m.key as I18nKey)}</span>
            {m.path === 'alerts' && crit > 0 ? (
              <span className="num rounded-full bg-[var(--color-sev-crit)] px-1.5 text-[10px] font-bold text-[var(--color-on-accent)]">{crit}</span>
            ) : m.evidence !== 'CONFIRMED' ? (
              <EvidenceTag label={m.evidence as Evidence} />
            ) : null}
          </a>
        );
            })}
            </div>
          </div>
        );
      })}
    </nav>
  );
}
