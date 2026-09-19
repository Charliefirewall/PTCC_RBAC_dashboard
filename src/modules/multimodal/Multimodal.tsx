/**
 * Multimodal placeholder - Phase 3, FUTURE throughout.
 *
 * The five modes and their field lists are transcribed from the design document's
 * Multimodal Transport Integration section (L1561-L1697). None of it is built: the
 * module is excluded from the PTS-G1 procurement (R368), and no interface to any of
 * these operators exists today. The cards are greyed on purpose - the point is to show
 * the SHAPE of Phase 3 without implying data that does not exist.
 *
 * The source is also explicit that PTCC would consume monitoring data only and would
 * not control any of these systems, which is the same boundary as the bus side (L718).
 */

import { EvidenceTag, Panel, StatusPill } from '../../components/primitives';
import { useT } from '../../i18n/t';
import type { I18nKey } from '../../i18n/dict';

interface Mode {
  key: I18nKey;
  groups: { title: string; fields: string[] }[];
  extra?: I18nKey;
}

const MODES: Mode[] = [
  {
    key: 'mm.taxi',
    extra: 'multimodal.taxi',
    groups: [
      { title: 'Vehicle information', fields: ['taxi ID', 'vehicle type', 'operator identification'] },
      { title: 'Vehicle location', fields: ['real-time GPS coordinates', 'operational status (available / occupied / offline)', 'timestamp of last location update'] },
      { title: 'Service status', fields: ['taxis available by zone', 'active trips', 'average passenger waiting time'] },
      { title: 'Operational indicators', fields: ['fleet availability by service area', 'peak demand indicators'] },
    ],
  },
  {
    key: 'mm.brt',
    groups: [
      { title: 'Vehicle operations', fields: ['vehicle ID', 'route ID', 'trip ID', 'vehicle location (GPS)', 'operational status'] },
      { title: 'Service performance', fields: ['planned schedule', 'actual departure and arrival times', 'headway information'] },
      { title: 'Passenger information', fields: ['passenger load factor', 'station passenger counts (if available)'] },
      { title: 'Infrastructure status', fields: ['station operational status', 'lane availability or disruptions'] },
    ],
  },
  {
    key: 'mm.lrt',
    groups: [
      { title: 'Train operations', fields: ['train ID', 'route or line ID', 'train location', 'operational status'] },
      { title: 'Service performance', fields: ['scheduled departure and arrival times', 'delay information'] },
      { title: 'Station information', fields: ['station operational status', 'station passenger load (if available)'] },
      { title: 'Incident information', fields: ['operational disruptions', 'infrastructure failures', 'emergency events affecting LRT'] },
    ],
  },
  {
    key: 'mm.metro',
    groups: [
      { title: 'Train information', fields: ['train ID', 'line ID', 'train location or station position', 'operational status'] },
      { title: 'Service performance', fields: ['schedule adherence', 'train delays', 'headway information'] },
      { title: 'Passenger flow indicators', fields: ['station passenger volumes', 'peak passenger load indicators'] },
      { title: 'Operational alerts', fields: ['service disruptions', 'station closures', 'emergency incidents'] },
    ],
  },
  {
    key: 'mm.cable',
    groups: [
      { title: 'System status', fields: ['line ID', 'operational status (operational / suspended / maintenance)'] },
      { title: 'Cabin operations', fields: ['cabin ID', 'cabin position along line', 'operational status'] },
      { title: 'Station information', fields: ['station operational status', 'passenger waiting times'] },
      { title: 'Operational alerts', fields: ['service interruptions', 'weather-related suspensions', 'technical system failures'] },
    ],
  },
];

export default function Multimodal() {
  const t = useT();
  return (
    <Panel
      titleKey="nav.multimodal"
      right={<EvidenceTag label="FUTURE" cite="L1561–L1697" />}
      bodyClassName="p-2"
    >
      <p className="t-meta mb-2">
        {t('multimodal.note')} {t('mm.consume')}
      </p>
      {/*
       * Each mode is a collapsed Panel: 16-ish bullet lines x 5 modes was 80 lines of
       * undifferentiated text. The header keeps the two things that ARE the evidence -
       * the FUTURE grade and the "no interface exists" pill - visible while collapsed,
       * so nothing is hidden except the field list itself.
       *
       * opacity-75 rather than the old opacity-60: at 60% the text3 body washed out to
       * roughly 1.7:1 against the white light-theme surface. "Not built" is now carried
       * by the noData pill + FUTURE tag + text3 body, with the dimming only supporting it.
       */}
      <div className="grid grid-cols-1 items-start gap-2 lg:grid-cols-2 2xl:grid-cols-3">
        {/* No `summary` on these panels: at 1024 the header is chevron + mode name + field
            count + FUTURE tag + "no interface exists" pill inside ~390 px, and the bare
            field count was the one of the four that got ellipsised (D-3). The two that
            carry the EVIDENCE stay. */}
        {MODES.map((m, i) => (
          <Panel
            key={m.key}
            titleKey={m.key}
            collapsible
            defaultOpen={i === 0}
            className="opacity-75"
            bodyClassName="p-2"
            right={
              <span className="flex shrink-0 items-center gap-2">
                <EvidenceTag label="FUTURE" />
                <StatusPill>{t('mm.noData')}</StatusPill>
              </span>
            }
          >
            <h4 className="panel-title mb-1">{t('mm.fields')}</h4>
            {m.groups.map((g) => (
              <div key={g.title} className="mb-1.5">
                <div className="t-meta font-semibold">{g.title}</div>
                <ul className="t-meta ml-3 list-disc">
                  {g.fields.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </div>
            ))}
            {m.extra ? (
              <p
                className="t-meta mt-1 border-t border-[var(--color-line)] pt-1"
                style={{ color: 'var(--color-sev-warn)' }}
              >
                {t(m.extra)}
              </p>
            ) : null}
          </Panel>
        ))}
      </div>
    </Panel>
  );
}
