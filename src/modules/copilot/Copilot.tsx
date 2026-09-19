/**
 * Ops Copilot - the Tier 4 surface. ASSUMPTION, permanently labelled.
 *
 * The client's brief asked for an "agentic AI experience"; their deck contains one
 * AI reference, a chip icon with no supporting text. Nothing in any source describes
 * a conversational interface, so this module wears that on its face: a violet frame,
 * an ASSUMPTION tag and a "Tier 4 - Conversational (proposed)" ribbon on every card.
 *
 * The data tier badge next to it is the honest part: the numbers come from the Tier 1
 * rule engine, the Tier 2 playbooks or the Tier 3 pattern counters, and the citation
 * chips jump to the record they came from.
 *
 * NOTHING HERE EXECUTES. Proposals are anchors into the operator flow; the only store
 * writes are selection (which row is highlighted), because operator validation is
 * mandatory before an alert becomes an event (L1235) and PTCC is not a command
 * authority (L718).
 *
 * WHAT THIS FILE NO LONGER OWNS (defect A-9, item 44): the input, the answer card and
 * the session are in `app/AskBar.tsx`, shared with the ambient drawer. A question asked
 * from the top bar of any screen renders here through the SAME renderer, so the page and
 * the drawer cannot show one question two ways. What is left here is the page: the
 * boundary header, the agent roster, and the empty state that used to be 700 px of
 * nothing - now a greeting read off live state, the suggestion chips, and a plain table
 * of what the thing can actually answer.
 */

import { AnswerFeed, AskBar, History, SuggestionChips } from '../../app/AskBar';
import { SUGGESTED, type IntentName } from '../../agent';
import { useAlerts, useSettings, useSelection, useSim } from '../../store';
import { AGENTS, AGENT_ORDER } from '../../store/agentic';
import { EvidenceTag, Panel } from '../../components/primitives';
import { useT } from '../../i18n/t';
import type { I18nKey } from '../../i18n/dict';

export default function Copilot() {
  const t = useT();
  const llmEnabled = useSettings((s) => s.llmEnabled);

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      {/* permanent boundary statement (plan 22.9) */}
      <header
        className="panel flex flex-wrap items-center gap-2 px-3 py-2"
        style={{ borderColor: 'var(--color-tier4)' }}
      >
        <span className="text-[13px] font-semibold" style={{ color: 'var(--color-tier4)' }}>
          {t('cop.title')}
        </span>
        <EvidenceTag label="ASSUMPTION" />
        <span className="text-[11px] text-[var(--color-text2)]">{t('cop.assumption')}</span>
        {!llmEnabled && (
          <span className="ml-auto rounded border border-[var(--color-line)] px-1.5 py-[1px] text-[10px] text-[var(--color-text3)]">
            {t('cop.offline')}
          </span>
        )}
      </header>

      {/* Console, not a chat box: the roster that can answer is visible before you ask. */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="t-meta">{t('ag.roster')}</span>
        {AGENT_ORDER.map((id) => (
          <span
            key={id}
            title={`${t(AGENTS[id].remitKey as I18nKey)} — ${AGENTS[id].cite}`}
            className="rounded-full border px-2 py-[1px] text-[10px]"
            style={{ borderColor: 'var(--color-agent)', color: 'var(--color-agent)' }}
          >
            {t(AGENTS[id].nameKey as I18nKey)}
          </span>
        ))}
      </div>

      <AskBar page />

      {/* Item 44: what this session asked, one click from asking it again. */}
      <History />

      {/* An answer is free text and can be very long. `min-w-0` + `break-words` on the
          feed container keeps a 5 000-character reply inside the panel (the panel body is
          already the scroller); without them one unbroken token widens the whole page. */}
      <Panel className="min-h-0 flex-1" bodyClassName="flex min-w-0 flex-col gap-2 break-words p-2">
        <AnswerFeed empty={<EmptyState />} />
      </Panel>

      <footer className="px-1 text-[11px] text-[var(--color-text3)]">{t('cop.noAction')}</footer>
    </div>
  );
}

/**
 * Defect A-9. The old empty state was the string `cop.unknown` centred in a panel, and
 * below it seven hundred pixels of nothing.
 *
 * The greeting is composed from the state the dashboards are already showing, so it is
 * different every time the demo is opened - and it contains no number of its own: the
 * three figures beside it are labelled tiles reading `metrics` and the alert store, the
 * same source the answers cite.
 */
function EmptyState() {
  const t = useT();
  const alerts = useAlerts((s) => s.alerts);
  const raw = useSim((s) => s.metrics?.in_service);
  const inService = typeof raw === 'number' && Number.isFinite(raw) ? Math.round(raw) : null;
  const open = alerts.filter((a) => !a.validated_event_id);
  const critical = open.filter((a) => a.severity === 'critical');
  const greeting = critical.length > 0 ? 'cop.greet.critical' : open.length > 0 ? 'cop.greet.alerts' : 'cop.greet.calm';

  return (
    <div className="flex flex-col gap-3 p-3">
      <div>
        <p className="text-[13px] font-semibold text-[var(--color-text1)]">{t(greeting)}</p>
        <p className="mt-1 max-w-[62ch] text-[11px] text-[var(--color-text3)]">{t('cop.empty.hint')}</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Stat label={t('kpi.activeAlerts')} value={open.length} />
        <Stat label={t('kpi.criticalAlerts')} value={critical.length} tone="var(--color-sev-crit)" />
        <Stat label={t('kpi.busesInService')} value={inService} />
      </div>

      {/* The chips live INSIDE the empty state now, where the eye already is. */}
      <SuggestionChips />

      <CapabilityTable />
    </div>
  );
}

/** `value === null` means "not computable yet" - an em dash, never "NaN". */
function Stat({ label, value, tone }: { label: string; value: number | null; tone?: string }) {
  return (
    <span className="flex items-baseline gap-1.5 rounded border border-[var(--color-line)] px-2 py-1">
      <span className="num text-[13px] font-semibold" style={tone ? { color: tone } : undefined}>
        {value ?? '—'}
      </span>
      <span className="text-[10px] uppercase tracking-wider text-[var(--color-text3)]">{label}</span>
    </span>
  );
}

/** One row per intent the router actually has a resolver for - nothing aspirational. */
const CAPABILITY: Partial<Record<IntentName, I18nKey>> = {
  look_first: 'cop.cap.attention',
  why_delayed: 'cop.cap.delay',
  overcrowded: 'cop.cap.load',
  recommend_actions: 'cop.cap.response',
  device_health: 'cop.cap.equipment',
  shift_brief: 'cop.cap.brief',
};

function CapabilityTable() {
  const t = useT();
  const routeHint = useSelection((s) => s.route_id);
  const firstRoute = useSim((s) => s.snap?.routes[0]?.route_id);
  const route = routeHint ?? firstRoute ?? '';
  return (
    <div className="rounded border border-[var(--color-line-soft)]">
      <p className="border-b border-[var(--color-line-soft)] px-2 py-1 text-[11px] font-semibold text-[var(--color-text2)]">
        {t('cop.cap.title')}
      </p>
      <table className="w-full text-left text-[11px]">
        <thead>
          <tr className="text-[10px] uppercase tracking-wider text-[var(--color-text3)]">
            <th className="px-2 py-1 font-medium">{t('cop.cap.colWhat')}</th>
            <th className="px-2 py-1 font-medium">{t('cop.cap.colAsk')}</th>
          </tr>
        </thead>
        <tbody>
          {SUGGESTED.map((q) => (
            <tr key={q.key} className="border-t border-[var(--color-line-soft)]">
              <td className="px-2 py-1 text-[var(--color-text1)]">{t(CAPABILITY[q.intent] ?? (q.key as I18nKey))}</td>
              <td className="px-2 py-1 text-[var(--color-text3)]">“{t(q.key as I18nKey, { route })}”</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
