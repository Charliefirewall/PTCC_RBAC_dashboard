/**
 * Agent console - the visible half of `store/agentic.ts`.
 *
 * Read that file's header first: the agents are a presentation over the existing
 * deterministic rule engine, playbooks and Tier-3 counters. Nothing here computes a
 * number; every figure on screen is a field of an `Alert` the rule engine raised.
 *
 * The colour contract, and it is the whole point of the screen:
 *
 *   violet (--color-agent) = the AI did this (detected, reasoned, recommended)
 *   green  (--color-sev-ok) = a human did this (approved)
 *   accent (--color-accent) = closed out through the operator's own event flow
 *   grey                    = a human dismissed it
 *
 * The four-stage track always shows the fourth stage as a HUMAN stage. There is no
 * arrow past it that an agent can walk on its own (L1235, L718).
 */

import { useMemo, useState } from 'react';
import {
  AGENTS,
  AGENT_ORDER,
  useAgentic,
  type AgentDecision,
  type AgentDef,
  isHumanStage,
  type DecisionStage,
  type Phrase,
} from '../../store/agentic';
import { AGENT_COUNT, AGENT_ICON, useActivity, type ActivityEntry, type ActivityTone } from '../../store/activity';
import { useAlerts, useEvents, useSelection, useSettings } from '../../store';
import { overlay } from '../../store/overlay';
import { Icon } from '../../components/Icon';
import { PLAYBOOKS } from '../../rules/playbooks';
import { hhmmss, simSecondsOf } from '../../sim/engine';
import type { Alert } from '../../sim/types';
import type { I18nKey } from '../../i18n/dict';
import { t as tRaw, useT, useTx } from '../../i18n/t';
import {
  Button,
  type Column,
  DataTable,
  Empty,
  EventSeverityBadge,
  EvidenceTag,
  Panel,
  SeverityChip,
  StatusPill,
  TierBadge,
  fmtInt,
} from '../../components/primitives';

// ---------------------------------------------------------------- small pieces

type T = ReturnType<typeof useT>;

/** A stored phrase is an i18n key plus params - render it, never build prose here. */
function say(t: T, p: Phrase): string {
  return t(p.key as I18nKey, p.params);
}

/**
 * Degenerate-data guards. `fmtInt`/`hhmmss` in the shared kit render "NaN" and
 * "NaN:NaN:NaN" for non-finite input, and neither file is ours to change (reported as a
 * defect). A count or a clock that cannot be computed is an em dash, never "NaN".
 */
const DASH = '—';
function n(v: number | undefined | null): string {
  return typeof v === 'number' && Number.isFinite(v) ? fmtInt(v) : DASH;
}
function clock(at_s: number | undefined | null): string {
  return typeof at_s === 'number' && Number.isFinite(at_s) ? hhmmss(at_s) : DASH;
}
function clockOf(iso: string | undefined): string {
  return iso ? clock(simSecondsOf(iso)) : DASH;
}

const STAGE_COLOR: Record<DecisionStage, string> = {
  detected: 'var(--color-agent)',
  reasoning: 'var(--color-agent)',
  recommended: 'var(--color-agent)',
  approved: 'var(--color-sev-ok)',
  rejected: 'var(--color-text3)',
  completed: 'var(--color-accent)',
};

/**
 * Bounded thinking indicator: it is shown only while a decision is actually in
 * `detected` or `reasoning`, which the stage clock resolves in a few sim seconds.
 * It is never the resting state of the screen.
 */
function AgentDots() {
  return (
    <span className="inline-flex items-center gap-[3px]" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="agent-dot inline-block rounded-full"
          style={{ width: 4, height: 4, background: 'var(--color-agent)' }}
        />
      ))}
    </span>
  );
}

export function StageChip({ stage, small = false }: { stage: DecisionStage; small?: boolean }) {
  const t = useT();
  const c = STAGE_COLOR[stage];
  const ai = stage === 'detected' || stage === 'reasoning' || stage === 'recommended';
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full font-semibold ${
        small ? 'px-1.5 py-[1px] text-[9px]' : 'px-2 py-0.5 text-[10px]'
      }`}
      style={{ color: c, background: `color-mix(in srgb, ${c} 16%, transparent)` }}
    >
      <span className="opacity-70">{t(ai ? 'ag.by.ai' : 'ag.by.human')}</span>
      {t(`ag.stage.${stage}` as I18nKey)}
    </span>
  );
}

/** The lifecycle, as four nodes. The fourth is the human one, and it is the terminus. */
function StageTrack({ d }: { d: AgentDecision }) {
  const t = useT();
  const order: DecisionStage[] = ['detected', 'reasoning', 'recommended', 'approved'];
  const reached =
    d.stage === 'detected' ? 0
    : d.stage === 'reasoning' ? 1
    : d.stage === 'recommended' ? 2
    : 3;
  return (
    <ol className="flex flex-wrap items-center gap-1">
      {order.map((s, i) => {
        const done = i <= reached;
        const last = i === 3;
        const label =
          last && d.stage === 'rejected' ? t('ag.stage.rejected')
          : last && d.stage === 'completed' ? t('ag.stage.completed')
          : t(`ag.stage.${s}` as I18nKey);
        const c = last ? STAGE_COLOR[isHumanStage(d.stage) ? d.stage : 'approved'] : 'var(--color-agent)';
        return (
          <li key={s} className="flex items-center gap-1">
            {i > 0 && <span className="text-[10px]" style={{ color: done ? c : 'var(--color-line)' }}>→</span>}
            <span
              className="inline-flex items-center gap-1 rounded px-1.5 py-[1px] text-[10px] font-semibold"
              style={
                done
                  ? { color: c, border: `1px solid ${c}`, background: `color-mix(in srgb, ${c} 12%, transparent)` }
                  : { color: 'var(--color-text3)', border: '1px dashed var(--color-line)' }
              }
            >
              {last ? '☑' : i + 1} {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function ConfidenceMeter({ value }: { value: number }) {
  const t = useT();
  // A confidence that is not a finite 0-1 number has no bar and no percentage: an
  // undefined metric must not paint a "NaN %" chip or a `width: NaN%` bar.
  const ok = Number.isFinite(value);
  const pct = ok ? Math.min(100, Math.max(0, Math.round(value * 100))) : 0;
  return (
    <span className="inline-flex items-center gap-1.5" title={t('ag.confNote')}>
      <span className="t-meta">{t('ag.breachMargin')}</span>
      <span className="inline-block h-1.5 w-12 rounded-full bg-[var(--color-bg3)]">
        <span
          className="block h-1.5 rounded-full"
          style={{ width: `${pct}%`, background: 'var(--color-agent)' }}
        />
      </span>
      <span className="num text-[11px] font-semibold" style={{ color: 'var(--color-agent)' }}>
        {ok ? `${pct} %` : DASH}
      </span>
    </span>
  );
}

/** Collapsible "Why?" - native <details>, no state, no library. */
function Why({ d }: { d: AgentDecision }) {
  const t = useT();
  const tx = useTx();
  return (
    <details className="mt-1.5 rounded border border-[var(--color-line-soft)] bg-[var(--color-bg1)]">
      <summary className="cursor-pointer select-none px-2 py-1 text-[11px] font-semibold" style={{ color: 'var(--color-agent)' }}>
        {t('ag.why')}
      </summary>
      <div className="collapse-in border-t border-[var(--color-line-soft)] px-2 py-1.5">
        <p className="t-meta mb-1">{t('ag.whyNote')}</p>
        <ol className="flex flex-col gap-1">
          {d.reasoning.map((step, i) => (
            <li key={i} className="flex items-start gap-2 text-[11px] leading-snug">
              <span className="num mt-[1px] shrink-0 text-[10px] text-[var(--color-text3)]">{i + 1}</span>
              {/* A justification is free text and can be long: it must wrap, never widen
                  the card. `min-w-0` + `break-words` is the pair that guarantees it. */}
              <span className="min-w-0 flex-1 break-words text-[var(--color-text2)]">
                {say(t, step.text)}
                {step.metric ? (
                  <span className="num ml-1 text-[var(--color-text1)]">
                    [{tx(step.metric.name)} {n(step.metric.value)}
                    {tx(step.metric.unit)} / {t('ag.thresholdShort')} {n(step.metric.threshold)}
                    {tx(step.metric.unit)}]
                  </span>
                ) : null}
              </span>
              <span className="num shrink-0 text-[10px] text-[var(--color-text3)]">{tx(step.cite)}</span>
            </li>
          ))}
        </ol>
      </div>
    </details>
  );
}

// ---------------------------------------------------------------- activity feed

/**
 * The attributed activity stream (plan §10.2 opportunity 2, backlog 13).
 *
 * Self-contained on purpose: it takes no props but an optional `limit`, so it can be
 * mounted on the Command Centre as well without either page owning the other's state.
 * It reads `useActivity` and nothing else; see `store/activity.ts` for where the rows
 * come from. Rows carry the `.enter` class, which `styles/tokens.css` already disables
 * under `prefers-reduced-motion`.
 */
const TONE_COLOR: Record<ActivityTone, string> = {
  agent: 'var(--color-agent)',
  human: 'var(--color-sev-ok)',
  alert: 'var(--color-sev-warn)',
  info: 'var(--color-accent)',
};

function ActivityRow({ e }: { e: ActivityEntry }) {
  const t = useT();
  const c = TONE_COLOR[e.tone];
  const who = e.agentId ? t(AGENTS[e.agentId].nameKey as I18nKey) : t('ag.act.operator');
  return (
    <li className="enter flex items-start gap-2 border-b border-[var(--color-line-soft)] px-2 py-1.5 last:border-0">
      <span className="num mt-[2px] shrink-0 text-[10px] text-[var(--color-text3)]">{clock(e.at_s)}</span>
      <span className="mt-[1px] shrink-0" style={{ color: c }}>
        <Icon name={e.icon} />
      </span>
      <span className="min-w-0 flex-1">
        {/* Wrap to two lines rather than ellipsising. A one-line stream reads tidily at
            1680 and hid the end of every entry below it - 41 clipped strings per theme,
            ~80% of all clipping left in the app. An activity feed whose text you cannot
            read is not an activity feed. `line-clamp-2` keeps rows bounded so the panel
            still shows a useful number of entries. */}
        <span className="line-clamp-2 block text-[11px] leading-snug">
          <span className="font-semibold" style={{ color: c }}>
            {who}
          </span>
          <span className="ml-1.5 text-[var(--color-text1)]">{say(t, e.headline)}</span>
        </span>
        <span className="line-clamp-2 block text-[10px] leading-snug text-[var(--color-text3)]">{say(t, e.detail)}</span>
      </span>
    </li>
  );
}

/**
 * `limit` defaults rather than being unbounded: the store caps at ACTIVITY_CAP (300) and
 * every row re-rendered on every tick, for rows nobody scrolls to. The visible window is
 * what matters; the full count stays in the header so nothing is silently lost.
 */
export function AgentActivityFeed({ limit = 40 }: { limit?: number }) {
  const t = useT();
  const entries = useActivity((s) => s.entries);
  const shown = entries.slice(0, limit);
  return (
    <Panel
      titleKey="ag.act.title"
      right={<span className="num t-meta">{n(entries.length)}</span>}
      className="min-h-0 flex-1"
      bodyClassName="p-0"
      foot={
        /* Names the pipeline, and names where it stops. In Panel's foot slot rather than
           sticky inside the body: a sticky footer carrying a background covers the last
           rows of the very feed it describes - the overlap audit caught it doing exactly
           that on #/command and in the open drawer. */
        <span className="text-[10px] font-semibold" style={{ color: 'var(--color-agent)' }}>
          {t('ag.act.pipeline', { n: AGENT_COUNT })}
        </span>
      }
    >
      {shown.length === 0 ? (
        <Empty title={t('ag.actNoneTitle')} text={t('ag.actNoneHint')} />
      ) : (
        // a screen reader hears new rows announced; the list is the feed's whole point.
        <ul aria-live="polite" aria-relevant="additions">
          {shown.map((e) => (
            <ActivityRow key={e.id} e={e} />
          ))}
        </ul>
      )}
    </Panel>
  );
}

// ---------------------------------------------------------------- decision card

/**
 * Defect M5. `onModify` used to be optional and `#/agentic` never passed it, so the same
 * button opened the validate flow from the Alerts tab and was inert on the console.
 * It now defaults to the handoff `map/popups.ts` already uses - select the alert, go to
 * the Alerts module, say so - because the Validate form itself is module-private to
 * Alerts.tsx (`openValidate`, not exported).
 * CEILING: when Alerts exports its validate opener, make that the default here.
 */
function handoffToValidate(alertId: string): void {
  useSelection.getState().selectAlert(alertId);
  location.hash = '#/alerts';
  overlay.toast(tRaw('ag.modifyHandoff', useSettings.getState().lang), { tone: 'warn' });
}

export function DecisionCard({
  d,
  alert,
  onModify = handoffToValidate,
}: {
  d: AgentDecision;
  alert?: Alert;
  onModify?: (alertId: string) => void;
}) {
  const t = useT();
  const tx = useTx();
  const approve = useAgentic((s) => s.approve);
  const dismiss = useAgentic((s) => s.dismiss);
  const modify = useAgentic((s) => s.modify);
  const agent = AGENTS[d.agentId];
  const pb = PLAYBOOKS[d.recommendation.playbook];
  /*
   * Rapid interaction. `approve`/`dismiss` in the store already refuse a decision that
   * is no longer `recommended`, but `modify` does not (reported as a defect), and a
   * double-click reaches all three before React has re-rendered the new stage. One local
   * latch covers the whole footer: the first click is the decision, the second is a
   * no-op, and the audit log gets exactly one row.
   */
  const [acted, setActed] = useState(false);
  const ready = d.stage === 'recommended' && !acted;

  return (
    <article
      className="enter rounded-md border bg-[var(--color-bg2)] p-2"
      style={{ borderColor: STAGE_COLOR[d.stage] }}
    >
      <header className="flex flex-wrap items-center gap-2">
        <span className="text-[12px] font-semibold" style={{ color: 'var(--color-agent)' }}>
          {t(agent.nameKey as I18nKey)}
        </span>
        <TierBadge tier={agent.tier} />
        <EvidenceTag label="ASSUMPTION" cite={`agent framing · rules ${agent.cite}`} />
        {(d.stage === 'detected' || d.stage === 'reasoning') && (
          <span className="inline-flex items-center gap-1.5 text-[10px]" style={{ color: 'var(--color-agent)' }}>
            <AgentDots />
            {t('ag.thinking')}
          </span>
        )}
        <span className="ml-auto">
          <ConfidenceMeter value={d.confidence} />
        </span>
      </header>

      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        {alert ? <SeverityChip severity={alert.severity} size="sm" /> : null}
        <span className="min-w-0 break-words text-[12px] font-medium">
          {alert ? t(alert.title_key as I18nKey, alert.params) : tx(d.alertIds[0] ?? DASH)}
        </span>
        <span className="num text-[10px] text-[var(--color-text3)]">
          {tx(d.alertIds[0] ?? DASH)}
          {alert ? ` · ${t('alerts.impact')} ${n(alert.impact_score)}` : ''}
        </span>
      </div>

      <div className="mt-1.5">
        <StageTrack d={d} />
      </div>

      {/* recommendation. Navigation and a pre-filled form - not an executed action. */}
      <div className="mt-1.5 rounded border border-[var(--color-line-soft)] px-2 py-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="t-meta">{t('ag.rec')}</span>
          <span className="min-w-0 break-words text-[12px] font-semibold text-[var(--color-text1)]">
            {say(t, d.recommendation.label)}
          </span>
          <EventSeverityBadge level={d.recommendation.severity_level} size="sm" />
        </div>
        {/* Free text from the rule engine: wraps, never widens the card. */}
        <p className="mt-1 min-w-0 break-words text-[11px] text-[var(--color-text2)]">
          <span className="t-meta mr-1">{t('ag.rationale')}</span>
          {say(t, d.recommendation.rationale)}
        </p>
        <p className="mt-1 min-w-0 break-words text-[11px] text-[var(--color-text2)]">
          <span className="t-meta mr-1">{t('ag.effect')}</span>
          {say(t, d.recommendation.expected_effect)}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1">
          <span className="t-meta">{t('ag.playbookActions')}</span>
          {pb.recommended.map((k) => (
            <span key={k} className="rounded border border-[var(--color-line)] px-1.5 py-[1px] text-[10px] text-[var(--color-text2)]">
              {t(k as I18nKey)}
            </span>
          ))}
          <EvidenceTag label="CONFIRMED" cite="L1349-L1382" />
        </div>
      </div>

      <Why d={d} />

      <footer className="mt-2 flex flex-wrap items-center gap-1.5">
        {isHumanStage(d.stage) ? (
          <DecisionOutcome d={d} />
        ) : (
          <>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                if (!ready) return;
                setActed(true);
                approve(d.id);
              }}
              disabled={!ready}
            >
              {t('ag.approve')}
            </Button>
            <Button
              size="sm"
              disabled={!ready}
              onClick={() => {
                if (!ready) return;
                setActed(true);
                modify(d.id);
                const alertId = d.alertIds[0];
                if (alertId) onModify(alertId);
              }}
            >
              {t('ag.modify')}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                if (!ready) return;
                setActed(true);
                dismiss(d.id);
              }}
              disabled={!ready}
            >
              {t('ag.dismiss')}
            </Button>
            {/* The no-autonomy sentence is stated ONCE, in the console header (§10.2/11).
                It used to be repeated in every card footer; that is what made it wallpaper. */}
          </>
        )}
      </footer>
    </article>
  );
}

function DecisionOutcome({ d }: { d: AgentDecision }) {
  const t = useT();
  const at = clockOf(d.approvedAt);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <StageChip stage={d.stage} />
      <span className="num text-[11px] text-[var(--color-text2)]">
        {d.stage === 'rejected'
          ? t('ag.rejectedBy', { role: d.approvedBy ?? DASH, at })
          : t('ag.approvedBy', { role: d.approvedBy ?? DASH, at })}
      </span>
      {d.stage === 'completed' ? (
        <StatusPill tone="info">
          {d.eventId ? t('ag.completedAs', { id: d.eventId }) : t('ag.completedCleared')}
        </StatusPill>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------- grouping

/**
 * Backlog 40 / §10.2 opportunity 10. Fourteen open alerts used to render fourteen
 * near-identical cards - three consecutive "AFC offline" cards was a real screenshot.
 * Decisions are grouped by the RULE that fired, groups are ordered by `impact_score`
 * (already computed in `rules/evaluate.ts`, which is why `alerts` arrives pre-sorted),
 * the highest-impact member is shown in full and the rest collapse behind one line.
 *
 * Nothing is hidden from the operator: the tail is one click away, and every card in it
 * is the same card with the same human gate.
 */
interface DecisionGroup {
  rule: string;
  /** the alert `type`, for the 3-level family label. '' if the alert has cleared. */
  type: string;
  items: AgentDecision[];
}

function DecisionGroupView({
  g,
  byAlert,
  onModify,
}: {
  g: DecisionGroup;
  byAlert: Map<string, Alert>;
  onModify?: (alertId: string) => void;
}) {
  const t = useT();
  const [head, ...tail] = g.items;
  if (!head) return null;
  return (
    <section className="flex flex-col gap-1.5">
      {g.items.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="t-meta">
            {t('ag.group.rule', {
              label: g.type ? t(`alerts.type.${g.type}` as I18nKey) : g.rule,
              rule: g.rule,
            })}
          </span>
          <span className="num t-meta">{t('alerts.count', { n: g.items.length })}</span>
          <span className="t-meta ml-auto">{t('ag.group.topBy')}</span>
        </div>
      )}
      <DecisionCard d={head} alert={byAlert.get(head.alertIds[0]!)} onModify={onModify} />
      {tail.length > 0 && (
        <details className="rounded border border-[var(--color-line-soft)] bg-[var(--color-bg1)]">
          <summary
            className="cursor-pointer select-none px-2 py-1 text-[11px] font-semibold"
            style={{ color: 'var(--color-agent)' }}
          >
            {t('ag.group.more', { n: tail.length })}
          </summary>
          <div className="collapse-in flex flex-col gap-1.5 border-t border-[var(--color-line-soft)] p-1.5">
            {tail.map((d) => (
              <DecisionCard key={d.id} d={d} alert={byAlert.get(d.alertIds[0]!)} onModify={onModify} />
            ))}
          </div>
        </details>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- roster

/**
 * One roster card per agent (plan §10.2 opportunity 9, backlog 42): icon, remit, tier,
 * three LIVE stats and the citation. Every stat is counted off state that already
 * exists - no capability is implied that the agent does not have.
 */
function AgentCard({ agent, decisions }: { agent: AgentDef; decisions: AgentDecision[] }) {
  const t = useT();
  const tx = useTx();
  const events = useEvents((s) => s.events);
  const open = decisions.filter((d) => !isHumanStage(d.stage));
  const thinking = open.some((d) => d.stage === 'detected' || d.stage === 'reasoning');
  // The Response Agent has no rules of its own: what it "watches" is the open events
  // the playbooks apply to. Counting anything else would be inventing a workload.
  const isResponse = agent.id === 'response';
  const findings = isResponse ? events.filter((e) => e.stage !== 'closure').length : open.length;
  const stats: [I18nKey, number][] = [
    [isResponse ? 'ag.stat.openEvents' : 'ag.stat.findings', findings],
    ['ag.stat.awaiting', open.filter((d) => d.stage === 'recommended').length],
    [
      isResponse ? 'ag.stat.playbooks' : 'ag.stat.rules',
      isResponse ? Object.keys(PLAYBOOKS).length : agent.rules.length,
    ],
  ];

  return (
    <li className="rounded-md border border-[var(--color-line-soft)] bg-[var(--color-bg2)] p-2">
      <div className="flex items-start gap-1.5">
        <span className="shrink-0 pt-px" style={{ color: findings ? 'var(--color-agent)' : 'var(--color-text3)' }}>
          <Icon name={AGENT_ICON[agent.id]} />
        </span>
        {/* Wraps: the agent's name is the card's identity, and "Regularity Agent" lost
            half of itself to truncation in the roster column at every width. */}
        <span className="min-w-0 flex-1 text-[11px] font-semibold leading-tight" style={{ color: 'var(--color-agent)' }}>
          {t(agent.nameKey as I18nKey)}
        </span>
        <TierBadge tier={agent.tier} />
        {thinking ? <AgentDots /> : null}
      </div>
      <p className="t-meta mt-1 leading-snug">{t(agent.remitKey as I18nKey)}</p>
      <dl className="mt-1.5 flex flex-col gap-[2px] border-t border-[var(--color-line-soft)] pt-1">
        {stats.map(([k, v]) => (
          <div key={k} className="flex items-baseline gap-1.5">
            <dt className="t-meta min-w-0 flex-1 truncate">{t(k)}</dt>
            <dd className="num text-[11px] font-semibold" style={{ color: v ? 'var(--color-agent)' : 'var(--color-text3)' }}>
              {n(v)}
            </dd>
          </div>
        ))}
      </dl>
      <p className="num mt-1 text-[9px] text-[var(--color-text3)]">{tx(agent.cite)}</p>
    </li>
  );
}

// ---------------------------------------------------------------- console

function decidedCols(t: T, tx: (s: string) => string): Column<AgentDecision>[] {
  return [
    { key: 'stage', label: t('ag.col.decision'), render: (d) => <StageChip stage={d.stage} small /> },
    {
      key: 'agent',
      label: t('ag.col.agent'),
      render: (d) => (
        <span className="text-[11px]" style={{ color: 'var(--color-agent)' }}>
          {t(AGENTS[d.agentId].nameKey as I18nKey)}
        </span>
      ),
    },
    { key: 'alert', label: t('ag.col.alert'), mono: true, render: (d) => tx(d.alertIds[0] ?? DASH) },
    {
      key: 'by',
      label: t('ag.col.by'),
      mono: true,
      render: (d) => (
        <span className="text-[10px] text-[var(--color-text3)]">
          {tx(d.approvedBy ?? DASH)} · {clockOf(d.approvedAt)}
          {d.eventId ? ` · ${d.eventId}` : ''}
        </span>
      ),
    },
  ];
}

export default function AgentConsole({ onModify }: { onModify?: (alertId: string) => void }) {
  const t = useT();
  const tx = useTx();
  const decisions = useAgentic((s) => s.decisions);
  const alerts = useAlerts((s) => s.alerts);

  const byAlert = useMemo(() => new Map(alerts.map((a) => [a.id, a])), [alerts]);
  // Defect M4: "active alert" means OPEN - not yet validated into an event. This is the
  // definition `agent/index.ts:openAlerts()` and the Copilot already use; an alert the
  // operator has already turned into an event is not still awaiting a decision.
  // alerts arrive sorted by impact_score, so the queue inherits that order for free.
  const queue = useMemo(
    () =>
      alerts
        .filter((a) => !a.validated_event_id)
        .map((a) => decisions[a.id])
        .filter((d): d is AgentDecision => !!d && !isHumanStage(d.stage)),
    [alerts, decisions],
  );
  const decided = useMemo(
    () =>
      Object.values(decisions)
        .filter((d) => isHumanStage(d.stage))
        .sort((a, b) => (b.approvedAt ?? '').localeCompare(a.approvedAt ?? '')),
    [decisions],
  );
  // `queue` inherits the impact_score ordering of `alerts`, so both the groups and the
  // members inside each group come out ranked without re-sorting on a derived number.
  // Defect M2: a CRITICAL finding is never folded into a "+N more" tail - it always gets
  // its own group. Same guard, same reason as `buildWorklist` in modules/alerts/Alerts.tsx;
  // two grouping policies over one list is exactly what made the surfaces disagree.
  const groups = useMemo(() => {
    const out: DecisionGroup[] = [];
    const byRule = new Map<string, DecisionGroup>();
    for (const d of queue) {
      const a = byAlert.get(d.alertIds[0]!);
      const rule = a?.rule_id ?? d.recommendation.event_type;
      if (a?.severity === 'critical') {
        out.push({ rule, type: a.type, items: [d] });
        continue;
      }
      const g = byRule.get(rule);
      if (g) {
        g.items.push(d);
        continue;
      }
      const fresh: DecisionGroup = { rule, type: a?.type ?? '', items: [d] };
      byRule.set(rule, fresh);
      out.push(fresh);
    }
    return out;
  }, [queue, byAlert]);

  return (
    <div data-agent-console className="flex h-full min-h-0 flex-col gap-2 overflow-auto xl:flex-row xl:overflow-hidden">
      {/* fluid, not a hard 290px: the roster and feed truncated at every width. */}
      <aside className="flex w-full shrink-0 flex-col gap-2 xl:w-[clamp(260px,24%,380px)]">
        <Panel
          titleKey="ag.roster"
          right={<EvidenceTag label="ASSUMPTION" cite="agent framing" />}
          className="shrink-0 xl:max-h-[58%]"
          bodyClassName="p-1.5"
        >
          <ul className="flex flex-col gap-1.5">
            {AGENT_ORDER.map((id) => (
              <AgentCard
                key={id}
                agent={AGENTS[id]}
                decisions={Object.values(decisions).filter((d) => d.agentId === id)}
              />
            ))}
          </ul>
        </Panel>
        <AgentActivityFeed />
      </aside>

      <div className="flex min-h-[520px] flex-1 flex-col gap-2 xl:min-h-0">
        {/* The autonomy boundary is stated here, once and prominently. It is deliberately
            NOT repeated per card any more (§10.2 opportunity 11). */}
        <header
          className="panel flex shrink-0 flex-col gap-1 px-3 py-2"
          style={{ borderColor: 'var(--color-agent)' }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] font-semibold" style={{ color: 'var(--color-agent)' }}>
              {t('ag.title')}
            </span>
            <span className="ml-auto flex items-center gap-1.5">
              <EvidenceTag label="CONFIRMED" cite="L1235 · L718" />
              <span className="t-meta">{t('ag.humanGate')}</span>
            </span>
          </div>
          <p className="flex items-start gap-1.5 text-[12px] font-semibold" style={{ color: 'var(--color-agent)' }}>
            <span className="mt-[1px] shrink-0">
              <Icon name="shield" />
            </span>
            {t('ag.noAutonomy')}
          </p>
        </header>

        <Panel
          titleKey="ag.queue"
          right={<span className="num t-meta">{n(queue.length)}</span>}
          className="min-h-0 flex-1"
          bodyClassName="flex flex-col gap-2 p-2"
        >
          {groups.length === 0 ? (
            // Good news, and it must read as good news: nothing is waiting on the operator.
            <Empty tone="ok" title={t('ag.noQueueTitle')} text={t('ag.noQueueHint')} />
          ) : (
            groups.map((g) => (
              <DecisionGroupView key={g.items[0]!.id} g={g} byAlert={byAlert} onModify={onModify} />
            ))
          )}
        </Panel>

        <Panel
          titleKey="ag.decided"
          collapsible
          defaultOpen={false}
          summary={<span className="num">{n(decided.length)}</span>}
          className="max-h-[38%] shrink-0"
          bodyClassName="p-2"
        >
          {/* The decision log only ever grows: over a long session it is the one list on
              this screen that can reach hundreds of rows, so it pages rather than
              rendering all of them. Same table primitive as every other log in the app. */}
          <DataTable
            columns={decidedCols(t, tx)}
            rows={decided}
            rowKey={(d) => d.id}
            pageSize={12}
            compact
            empty={{ title: t('ag.noDecidedTitle'), text: t('ag.noDecidedHint') }}
          />
        </Panel>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- alert-row badge

/** Compact lifecycle marker for a live alert row in the Alerts module. */
export function AlertDecisionBadge({ alertId }: { alertId: string }) {
  const t = useT();
  const d = useAgentic((s) => s.decisions[alertId]);
  if (!d) return null;
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-[10px]" style={{ color: 'var(--color-agent)' }} title={t(AGENTS[d.agentId].remitKey as I18nKey)}>
        {t(AGENTS[d.agentId].nameKey as I18nKey)}
      </span>
      <StageChip stage={d.stage} small />
    </span>
  );
}
