/**
 * The role dashboard: one component, seven compositions.
 *
 * The platform underneath is shared - every widget reads the same stores the Command
 * Centre reads. What changes per role is the information hierarchy (which widget is
 * first and how wide), the actions offered, and the permissions behind them.
 *
 * Roles whose `home` is a real module (operations_controller → Command Centre) still
 * have a dashboard; it is simply not where they land.
 */

import { Empty, EvidenceTag, Panel } from '../../components/primitives';
import { useSettings } from '../../store';
import { useT } from '../../i18n/t';
import type { I18nKey } from '../../i18n/dict';
import { PERMISSIONS, can, permLabelKey, roleLabelKey, specOf } from './roles';
import { WIDGETS } from './widgets';

function PermissionStrip() {
  const t = useT();
  const role = useSettings((s) => s.role);
  return (
    <Panel
      titleKey="role.permTitle"
      collapsible
      defaultOpen={false}
      summary={t('role.permSummary', { n: specOf(role).can.length, total: PERMISSIONS.length })}
      bodyClassName="px-3 py-2"
      right={
        <EvidenceTag
          label="INFERRED"
          cite="override_compulsory is L1347 and exclusive; the rest follow from R2898-R2909"
        />
      }
    >
      <ul className="flex flex-wrap gap-1.5">
        {PERMISSIONS.map((p) => {
          const on = can(role, p);
          return (
            <li
              key={p}
              className="t-meta rounded-full border px-2 py-0.5"
              style={{
                color: on ? 'var(--color-sev-ok)' : 'var(--color-text3)',
                borderColor: on ? 'var(--color-sev-ok)' : 'var(--color-line)',
                opacity: on ? 1 : 0.6,
              }}
              title={p === 'override_compulsory' ? t('kit.tip.overrideCompulsory') : undefined}
            >
              {on ? '✓' : '✕'} {t(permLabelKey(p))}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

export default function RoleDashboard() {
  const t = useT();
  const role = useSettings((s) => s.role);
  const spec = specOf(role);

  /*
   * A role id the table does not hold. `?role=` and the remembered role both run through
   * isRoleId(), so this is unreachable by any path the app itself offers - but the id also
   * sits in localStorage, where an older build's value survives an upgrade, and reading a
   * missing spec threw on `spec.widgets` before anything rendered: a blank screen at the
   * first click of a demo, with the role name it failed on not shown anywhere.
   */
  if (!spec) {
    return (
      <div className="flex h-full min-h-0 flex-col gap-2 p-2">
        <Panel title={t('dash.e.roleTitle')}>
          <Empty title={t('dash.e.roleTitle')} text={t('dash.e.roleText', { role: String(role) })} />
        </Panel>
      </div>
    );
  }

  // A composition with no widgets is a legitimate state (a role whose whole job lives in
  // another module), not an error - but it must not render as a half-drawn page.
  const widgets = spec.widgets.filter((id) => WIDGETS[id]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-auto">
      <header className="panel flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
        {/* h2: Shell renders the route's <h1>. */}
        <h2 className="t-head text-[var(--color-text1)]">{t(roleLabelKey(role))}</h2>
        <span className="t-meta">{t(spec.fnKey)}</span>
        <div className="flex-1" />
        <span className="t-meta">{t('role.compositionNote')}</span>
        <EvidenceTag label={spec.composition} cite={spec.cite} />
      </header>

      <PermissionStrip />

      {/* Fixed 4 columns: this is a control-room app, it is never rendered narrow. */}
      {/* auto-rows-fr + flex-1: rows share the available height instead of collapsing to
          content, which left a role with few widgets looking like a half-drawn page.
          Each Panel scrolls internally, so a widget-heavy role degrades gracefully. */}
      {widgets.length === 0 ? (
        <Panel title={t(roleLabelKey(role))} className="flex-1">
          <Empty title={t('dash.e.noWidgetsTitle')} text={t('dash.e.noWidgetsText', { screen: t(`nav.${spec.home}` as I18nKey) })} />
        </Panel>
      ) : (
      // `key={role}`: two roles share widget ids (activeIncidents is on four dashboards).
      // Keyed by widget id alone, React reused the same component instance across a role
      // switch, so a panel kept the previous role's local state - a collapsed section, a
      // "cannot advance" warning - under a different role's permissions. Remounting on
      // the role is one attribute and makes a stale subscription impossible.
      <div key={role} className="grid min-h-0 flex-1 auto-rows-fr grid-cols-4 gap-2">
        {widgets.map((id) => {
          const { span, Comp } = WIDGETS[id];
          return (
            <div key={id} className="h-full min-w-0 [&>*]:h-full" style={{ gridColumn: `span ${span}` }}>
              <Comp />
            </div>
          );
        })}
      </div>
      )}

      <p className="t-meta shrink-0 px-1">{t('role.dashboardFooter' as I18nKey)}</p>
    </div>
  );
}
