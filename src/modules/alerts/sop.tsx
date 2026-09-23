/**
 * Shared SOP presentation for alert lists (Alerts module and Command Centre).
 */
import type { I18nKey } from '../../i18n/dict';
import { useT } from '../../i18n/t';
import type { Alert } from '../../sim/types';

/**
 * Where "drill down" goes for an alert (PTCC: "all the alert when click can link to more
 * drill-down information like car number, driver, real time position..."). A delay alert
 * opens its worst bus on the Trip tab; a network delay opens Regularity. Shared with the
 * Command Centre so both screens drill to the same place.
 */
export function drillHref(a: Alert): string | null {
  const bus = a.vehicle_id ?? (typeof a.params.bus === 'string' && a.params.bus ? a.params.bus : null);
  if (bus) return `#/vehicle/${bus}?alert=${encodeURIComponent(a.id)}${a.forecast ? `&h=${a.horizon_min}` : ''}`;
  if (a.route_id || a.rule_id === 'delay_network') return '#/regularity';
  return null;
}

/** PTCC SOP level: L1 route level, L2 medium, L3 senior. Square, so it never reads as a severity dot. */
export function LevelBadge({ level, forecast }: { level: 1 | 2 | 3; forecast?: boolean }) {
  const t = useT();
  const bg = level === 3 ? 'var(--color-sev-crit)' : level === 2 ? 'var(--color-sev-warn)' : 'var(--color-sev-info)';
  return (
    <span
      data-sop-level={level}
      title={t(`sop.level.${level}` as I18nKey)}
      className="num inline-flex h-5 shrink-0 items-center rounded px-1.5 text-[10px] font-bold text-[var(--color-on-accent)]"
      style={forecast ? { border: `2px dashed ${bg}`, color: bg } : { background: bg }}
    >
      {t('sop.level', { n: level })}
    </span>
  );
}
