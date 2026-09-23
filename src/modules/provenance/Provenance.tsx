/**
 * Evidence & Open Questions - the absence questionnaire (plan §15.1, §15.5).
 *
 * The deepest finding of this engagement is not what the client's source material says,
 * it is what it does not say. Five absences are already visible somewhere in the demo -
 * Settings says "demo default", the timetable says SYNTHETIC, the ROI screen lists its
 * inputs - but nowhere are they collected. This page collects them, and exports them as
 * a file that can be sent to PTPD unedited.
 *
 * NOTHING HERE IS INVENTED. Each row restates an absence that is already documented in
 * the code it cites. The counts are read live:
 *   - the threshold parameter count comes from THRESHOLD_META (rules/thresholds.ts)
 *   - the unreviewed-string count comes from unreviewedKeys() (i18n/t.ts)
 *   - the timetable's own provenance string comes from sim/timetable.ts
 * so the page cannot drift from the build the way a slide would.
 */

import { useTx } from '../../i18n/t';
import { useMemo } from 'react';
import { Button, Callout, EvidenceTag, KpiTile, Panel, fmtInt } from '../../components/primitives';
import { useT, unreviewedKeys, useLang } from '../../i18n/t';
import { dict, type I18nKey } from '../../i18n/dict';
import { DEMO_DEFAULTS, THRESHOLD_META, type Thresholds } from '../../rules/thresholds';
import { TIMETABLE_PROVENANCE } from '../../sim/timetable';

type Row = { what: string; cite: string; today: string; question: string; decision: string; priority: 'P0' | 'P1' | 'P2'; owner: I18nKey; blocked: I18nKey };

/**
 * Parameters in Tables 9-14 for which the source states a numeric value.
 *
 * Zero, and that is the finding. The only threshold set that exists in any source is the
 * Slide 8 passenger-load band list (LOAD_BANDS), which is not a configurable parameter.
 * See the file header of rules/thresholds.ts.
 */
const PARAM_KEYS = Object.keys(THRESHOLD_META) as (keyof Thresholds)[];

// Derived, never asserted. A hand-typed 0 here printed "none" over four values the
// client's own document supplies - the citations were in thresholds.ts the whole time.
// An honesty artefact that is itself wrong is worse than no honesty artefact.
const SOURCE_VALUED = PARAM_KEYS.filter((k) => !!THRESHOLD_META[k].sourceValue);
const SOURCE_VALUED_PARAMS = SOURCE_VALUED.length;

const NOT_BUILT: I18nKey[] = [
  'pv.ns.scheduling', 'pv.ns.routePlanning', 'pv.ns.rostering', 'pv.ns.dispatch',
  'pv.ns.fares', 'pv.ns.passengerApps', 'pv.ns.connectors', 'pv.ns.auth',
  'pv.ns.cctv', 'pv.ns.autonomy',
];


function valueOf(k: keyof Thresholds, tx: (s: string) => string = (s) => s): string {
  const v = DEMO_DEFAULTS[k];
  const unit = THRESHOLD_META[k].unit;
  return Array.isArray(v) ? v.map(tx).join(', ') : `${v}${unit ? ` ${tx(unit)}` : ''}`;
}

export default function Provenance() {
  const t = useT();
  const tx = useTx();
  const lang = useLang();

  const unreviewed = useMemo(() => unreviewedKeys().length, []);
  const totalKeys = Object.keys(dict).length;

  const rows: Row[] = [
    {
      what: t('pv.a1.what', { n: PARAM_KEYS.length, v: SOURCE_VALUED_PARAMS }),
      cite: 'Design document · Tables 9-14 (L1003-L1163)',
      today: t('pv.a1.today', { n: PARAM_KEYS.length, d: PARAM_KEYS.length - SOURCE_VALUED_PARAMS }),
      question: t('pv.a1.q'),
      decision: t('pv.a1.d'),
      priority: 'P0', owner: 'support.pv.owner.ptpd', blocked: 'support.pv.block.analytics',
    },
    {
      what: t('pv.a2.what'),
      cite: `All sources · ${TIMETABLE_PROVENANCE}`,
      today: t('pv.a2.today'),
      question: t('pv.a2.q'),
      decision: t('pv.a2.d'),
      priority: 'P0', owner: 'support.pv.owner.data', blocked: 'support.pv.block.timetable',
    },
    {
      what: t('pv.a3.what'),
      cite: 'Client conversation',
      today: t('pv.a3.today'),
      question: t('pv.a3.q'),
      decision: t('pv.a3.d'),
      priority: 'P1', owner: 'support.pv.owner.operators', blocked: 'support.pv.block.maintenance',
    },
    {
      what: t('pv.a4.what'),
      cite: 'Slide 5 · client decision',
      today: t('pv.a4.today'),
      question: t('pv.a4.q'),
      decision: t('pv.a4.d'),
      priority: 'P0', owner: 'support.pv.owner.data', blocked: 'support.pv.block.integration',
    },
    {
      what: t('pv.a5.what'),
      cite: 'Presentation deck',
      today: t('pv.a5.today'),
      question: t('pv.a5.q'),
      decision: t('pv.a5.d'),
      priority: 'P1', owner: 'support.pv.owner.ptpd', blocked: 'support.pv.block.integration',
    },
    {
      what: t('pv.a6.what'),
      cite: 'This build · i18n dictionary',
      today: t('pv.a6.today', { n: unreviewed, total: totalKeys }),
      question: t('pv.a6.q'),
      decision: t('pv.a6.d'),
      priority: 'P2', owner: 'support.pv.owner.comms', blocked: 'support.pv.block.language',
    },
  ];

  return (
    /* The page scrolls as one document - each panel keeps its natural height so no table
       is cut off mid-row, which on a page whose point is completeness would be absurd. */
    <div className="flex h-full flex-col gap-2 overflow-y-auto">
      <Panel
        className="shrink-0"
        title={t('pv.title')}
        right={
          <span className="flex items-center gap-2">
            <span className="t-meta hidden lg:inline">{t('pv.exportHint')}</span>
            <Button size="sm" variant="primary" onClick={() => exportQuestionnaire(rows, lang, t)}>
              {t('pv.export')}
            </Button>
          </span>
        }
        bodyClassName="p-3"
      >
        <p className="t-body max-w-[110ch] text-[var(--color-text2)]">{t('pv.lede')}</p>
        <Callout kind="warn" className="mt-3" title={t('support.pv.priority')}>
          {t('support.pv.summary')}
        </Callout>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <KpiTile labelKey="pv.kpiOpen" value={rows.length} tone="warn" evidence="CONFIRMED" />
          <KpiTile labelKey="pv.kpiParams" value={PARAM_KEYS.length} evidence="CONFIRMED" sub={t('pv.kpiParamsSub')} />
          <KpiTile labelKey="pv.kpiValued" value={SOURCE_VALUED_PARAMS} tone="crit" evidence="CONFIRMED" sub={t('pv.kpiValuedSub')} />
          <KpiTile labelKey="pv.kpiUnreviewed" value={fmtInt(unreviewed)} tone="warn" evidence="CONFIRMED" sub={`/ ${fmtInt(totalKeys)}`} />
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[1350px] border-collapse text-left">
            <thead>
              <tr className="t-meta uppercase tracking-wider text-[var(--color-text3)]">
                <Th>{t('pv.colAbsence')}</Th>
                <Th>{t('pv.colCite')}</Th>
                <Th>{t('pv.colToday')}</Th>
                <Th>{t('pv.colQuestion')}</Th>
                <Th>{t('pv.colDecision')}</Th>
                <Th>{t('support.pv.priority')}</Th>
                <Th>{t('support.pv.owner')}</Th>
                <Th>{t('support.pv.blocked')}</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-[var(--color-line)] align-top">
                  <Td className="w-[26%] font-medium text-[var(--color-text1)]">{r.what}</Td>
                  <Td className="w-[14%] text-[var(--color-text3)]">{tx(r.cite)}</Td>
                  <Td className="w-[20%] text-[var(--color-text2)]">{r.today}</Td>
                  <Td className="w-[22%] text-[var(--color-accent)]">{r.question}</Td>
                  <Td className="w-[18%] text-[var(--color-text2)]">{r.decision}</Td>
                  <Td className="font-semibold text-[var(--color-sev-warn)]">{r.priority}</Td>
                  <Td className="text-[var(--color-text2)]">{t(r.owner)}</Td>
                  <Td className="text-[var(--color-text2)]">{t(r.blocked)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid shrink-0 gap-2 xl:grid-cols-2">
        <Panel
          className="shrink-0"
          title={t('pv.thTitle')}
          right={<EvidenceTag label="CONFIRMED" cite="Tables 9-14" />}
          bodyClassName="p-3"
        >
          <p className="t-meta mb-2">{t('pv.thNote')}</p>
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="t-meta uppercase tracking-wider text-[var(--color-text3)]">
                <Th>{t('pv.colParam')}</Th>
                <Th>{t('pv.colTable')}</Th>
                <Th>{t('pv.colDemo')}</Th>
                <Th>{t('pv.colSource')}</Th>
              </tr>
            </thead>
            <tbody>
              {PARAM_KEYS.map((k) => (
                <tr key={k} className="border-t border-[var(--color-line)]">
                  <Td className="text-[var(--color-text1)]">{t(THRESHOLD_META[k].labelKey as I18nKey)}</Td>
                  <Td className="t-meta">{tx(THRESHOLD_META[k].table)}</Td>
                  <Td className="num text-[var(--color-text2)]">{valueOf(k, tx)}</Td>
                  <Td className={THRESHOLD_META[k].sourceValue ? '' : 'text-[var(--color-sev-warn)]'}>
                    {THRESHOLD_META[k].sourceValue ? tx(THRESHOLD_META[k].sourceValue) : t('pv.noneInSource')}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel
          className="shrink-0"
          title={t('pv.scopeTitle')}
          right={<EvidenceTag label="CONFIRMED" cite="README" />}
          bodyClassName="p-3"
        >
          <p className="t-meta mb-2">{t('pv.scopeNote')}</p>
          <ul className="flex flex-col gap-1.5">
            {NOT_BUILT.map((k) => (
              <li key={k} className="t-body flex items-baseline gap-2 text-[var(--color-text2)]">
                <span aria-hidden className="shrink-0 text-[var(--color-text3)]">—</span>
                <span>{t(k)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-2 py-1.5 font-semibold">{children}</th>;
}
function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-2 py-2 text-[11px] leading-snug ${className}`}>{children}</td>;
}

/**
 * Markdown, not JSON: the deliverable is a document a client reads and replies to, and
 * Markdown survives being pasted into an email or a Word file. Same Blob-download shape
 * as Analytics.exportTimeline - no dependency, no server.
 */
function exportQuestionnaire(rows: Row[], lang: string, t: (k: I18nKey, p?: Record<string, string | number>) => string): void {
  const esc = (s: string) => s.replaceAll('|', '\\|');
  const md = [
    `# PTCC — ${t('pv.title')}`,
    '',
    t('pv.lede'),
    '',
    `_Generated from the PTCC demo build on ${new Date().toISOString().slice(0, 10)} · language: ${lang}_`,
    '',
    `| # | ${t('pv.colAbsence')} | ${t('pv.colCite')} | ${t('pv.colToday')} | ${t('pv.colQuestion')} | ${t('pv.colDecision')} | ${t('support.pv.priority')} | ${t('support.pv.owner')} | ${t('support.pv.blocked')} |`,
    '|---|---|---|---|---|---|---|---|---|',
    ...rows.map((r, i) => `| ${i + 1} | ${esc(r.what)} | ${esc(r.cite)} | ${esc(r.today)} | ${esc(r.question)} | ${esc(r.decision)} | ${r.priority} | ${esc(t(r.owner))} | ${esc(t(r.blocked))} |`),
    '',
    `## ${t('pv.thTitle')}`,
    '',
    t('pv.thNote'),
    '',
    `| ${t('pv.colParam')} | ${t('pv.colTable')} | ${t('pv.colDemo')} | ${t('pv.colSource')} |`,
    '|---|---|---|---|',
    ...PARAM_KEYS.map(
      (k) => `| ${esc(t(THRESHOLD_META[k].labelKey as I18nKey))} | ${THRESHOLD_META[k].table} | ${esc(valueOf(k))} | ${esc(THRESHOLD_META[k].sourceValue ?? t('pv.noneInSource'))} |`,
    ),
    '',
    `## ${t('pv.scopeTitle')}`,
    '',
    t('pv.scopeNote'),
    '',
    ...NOT_BUILT.map((k) => `- ${t(k)}`),
    '',
  ].join('\n');

  const url = URL.createObjectURL(new Blob([md], { type: 'text/markdown;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `ptcc-open-questions-${lang}.md`;
  a.click();
  URL.revokeObjectURL(url);
}
