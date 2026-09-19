/**
 * Architecture & Data — plan §9.2 class B ("highly effective in a workshop"),
 * §15.5, §17 item 5.10, backlog 65.
 *
 * NOTHING ON THIS PAGE IS INVENTED. Every row restates something that already exists:
 * the README's simulation description and its deliberately-not-built list, §14.4's
 * production path, and one defect we found by reading the client's own specification.
 * That is why the page is cheap and why it is worth showing — it is a summary of
 * decisions already taken and already defensible, not a new claim.
 *
 * The ICD defect is the item to put in front of the client. The source specifies
 * `EPSG:4326/3857` (R1035) and then gives coordinates in decimal degrees. 3857 is Web
 * Mercator, whose units are metres. Both cannot describe the same field, and a connector
 * written against that line will either reject valid data or misplace every bus by
 * kilometres. Finding it cost one careful read; it is the concrete evidence that the
 * review was real.
 */

import { Callout, type Column, DataTable, EvidenceTag, Panel, PanelLink, Stepper } from '../../components/primitives';
import { useT } from '../../i18n/t';
import type { I18nKey } from '../../i18n/dict';

interface Feed {
  id: string;
  key: I18nKey;
  sim: I18nKey;
  real: I18nKey;
  owner: I18nKey;
}

const FEEDS: Feed[] = [
  { id: 'tbox', key: 'plat.f.tbox', sim: 'plat.f.tbox.sim', real: 'plat.f.tbox.real', owner: 'plat.f.tbox.owner' },
  { id: 'afc', key: 'plat.f.afc', sim: 'plat.f.afc.sim', real: 'plat.f.afc.real', owner: 'plat.f.afc.owner' },
  { id: 'cctv', key: 'plat.f.cctv', sim: 'plat.f.cctv.sim', real: 'plat.f.cctv.real', owner: 'plat.f.cctv.owner' },
  { id: 'tcc', key: 'plat.f.tcc', sim: 'plat.f.tcc.sim', real: 'plat.f.tcc.real', owner: 'plat.f.tcc.owner' },
  { id: 'timetable', key: 'plat.f.timetable', sim: 'plat.f.timetable.sim', real: 'plat.f.timetable.real', owner: 'plat.f.timetable.owner' },
  { id: 'depot', key: 'plat.f.depot', sim: 'plat.f.depot.sim', real: 'plat.f.depot.real', owner: 'plat.f.depot.owner' },
];

const LAYERS: I18nKey[] = ['plat.l.sim', 'plat.l.data', 'plat.l.rules', 'plat.l.store', 'plat.l.agent', 'plat.l.modules'];

/** The README's list, verbatim — it already lives in the dictionary for #/provenance. */
const NOT_BUILT: I18nKey[] = [
  'pv.ns.scheduling', 'pv.ns.routePlanning', 'pv.ns.rostering', 'pv.ns.dispatch',
  'pv.ns.fares', 'pv.ns.passengerApps', 'pv.ns.connectors', 'pv.ns.auth',
  'pv.ns.cctv', 'pv.ns.autonomy',
];

export default function Platform() {
  const t = useT();

  const cols: Column<Feed>[] = [
    { key: 'key', label: t('plat.colFeed'), width: '20%', render: (f) => <span className="font-medium text-[var(--color-text1)]">{t(f.key)}</span> },
    { key: 'sim', label: t('plat.colToday'), width: '28%', render: (f) => <span className="text-[var(--color-text2)]">{t(f.sim)}</span> },
    { key: 'real', label: t('plat.colReal'), width: '34%', render: (f) => <span className="text-[var(--color-accent)]">{t(f.real)}</span> },
    { key: 'owner', label: t('plat.colOwner'), width: '18%', render: (f) => <span className="t-meta">{t(f.owner)}</span> },
  ];

  return (
    <div className="flex h-full flex-col gap-2 overflow-y-auto">
      <Panel
        className="shrink-0"
        title={t('plat.title')}
        sub={t('plat.lede')}
        right={<EvidenceTag label="CONFIRMED" cite="README · plan §14.4 · R1035" />}
        bodyClassName="p-3"
      >
        <Callout
          kind="danger"
          title={t('plat.icdTitle')}
          icon={<EvidenceTag label="CONFIRMED" cite="R1035" />}
        >
          <p className="t-body text-[var(--color-text2)]">{t('plat.icdBody')}</p>
          <p className="t-meta mt-1.5">{t('plat.icdFound')}</p>
        </Callout>
      </Panel>

      <Panel
        className="shrink-0"
        title={t('plat.feedsTitle')}
        sub={t('plat.feedsSub')}
        right={<EvidenceTag label="CONFIRMED" cite="README · what is simulated" />}
        bodyClassName="p-3"
      >
        <DataTable columns={cols} rows={FEEDS} rowKey={(f) => f.id} compact />
      </Panel>

      <div className="grid shrink-0 gap-2 xl:grid-cols-2">
        <Panel
          className="shrink-0"
          title={t('plat.roadTitle')}
          sub={t('plat.roadSub')}
          right={<EvidenceTag label="FUTURE" cite="plan §14.4" />}
          bodyClassName="p-3"
          foot={
            <>
              <span>{t('plat.icdFound')}</span>
              <PanelLink href="#/provenance">{t('dep.openQuestions')}</PanelLink>
            </>
          }
        >
          {/* pill, not chevron: the chevron strip clips each label to its slot, and these
              four steps are sentences, not one-word stages. */}
          <Stepper
            steps={[
              { label: t('plat.road.demo'), state: 'done' },
              { label: t('plat.road.connector'), state: 'active' },
              { label: t('plat.road.auth'), state: 'pending' },
              { label: t('plat.road.rest'), state: 'pending' },
            ]}
          />
          <Callout kind="warn" className="mt-3" title={t('plat.rbacTitle')}>
            {t('plat.rbacBody')}
          </Callout>
        </Panel>

        <Panel
          className="shrink-0"
          title={t('plat.stackTitle')}
          sub={t('plat.stackSub')}
          right={<EvidenceTag label="CONFIRMED" cite="This build" />}
          bodyClassName="p-3"
        >
          <ol className="flex flex-col gap-1.5">
            {LAYERS.map((k) => (
              <li key={k} className="t-body flex items-baseline gap-2 text-[var(--color-text2)]">
                <span aria-hidden className="shrink-0 text-[var(--color-text3)]">→</span>
                <span>{t(k)}</span>
              </li>
            ))}
          </ol>
        </Panel>
      </div>

      <Panel
        className="shrink-0"
        title={t('plat.notBuiltTitle')}
        sub={t('plat.notBuiltSub')}
        right={<EvidenceTag label="CONFIRMED" cite="README · §15.5" />}
        bodyClassName="p-3"
      >
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {NOT_BUILT.map((k) => (
            <li key={k} className="t-body flex items-baseline gap-2 text-[var(--color-text2)]">
              <span aria-hidden className="shrink-0 text-[var(--color-text3)]">—</span>
              <span>{t(k)}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
