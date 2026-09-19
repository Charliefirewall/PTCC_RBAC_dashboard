/**
 * The ambient ask bar (plan §10.2.4-7, items 14/45/56, feature F-06).
 *
 * The copilot used to be a route you had to travel to. This file makes it ambient: one
 * input in the top chrome of every screen, a global `/` to focus it, and an answer that
 * arrives in the DRAWER SLOT so the operator never loses the screen they were reading.
 *
 * THE ANSWER ENGINE IS UNTOUCHED. `agent/index.ts` still owns intent routing and every
 * number; this file only decides where the reply is painted. There is no fetch, no LLM,
 * no `VITE_LLM_ENABLED` branch, and `ProposedAction` is still `{label, href}` - the
 * proposal buttons below navigate and nothing else (plan §10.3, §15.3, §1.3).
 *
 * ONE renderer, two surfaces: `AnswerCard` / `AnswerFeed` here are used by the drawer
 * and by `modules/copilot/Copilot.tsx` alike, so the same question cannot render two
 * different ways. The session store is module-level for the same reason - a question
 * asked in the drawer is in the page's history and vice versa.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { create } from 'zustand';
import {
  SUGGESTED,
  answer,
  ask as askAgent,
  type AgentReply,
  type Citation,
  type Intent,
  type IntentName,
} from '../agent';
// The route hook is App's, not a second copy: this file used to carry a byte-for-byte
// clone of it. `useRoute` is a hoisted function declaration, so the App <-> AskBar import
// cycle (App -> Shell -> TopBar -> AskBar) resolves fine at call time.
import { useRoute } from './App';
import { useSelection, useSettings, useSim } from '../store';
import { overlay } from '../store/overlay';
import { AGENTS, agentForIntent, type AgentDef } from '../store/agentic';
import { Icon } from '../components/Icon';
import { EvidenceTag, TierBadge } from '../components/primitives';
import { useT } from '../i18n/t';
import type { I18nKey } from '../i18n/dict';

// ---------------------------------------------------------------- session

export interface Turn {
  id: number;
  question: string;
  intent: Intent;
  reply: AgentReply;
}

interface Session {
  turns: Turn[];
  /** The question whose three dots are showing. One at a time is enough (item 56). */
  pending: string | null;
  ask(question: string, intent?: Intent): void;
}

/**
 * Item 56. 650 ms of three dots, 50 ms if the operator asked for less motion. The delay
 * is also WHY the reply is computed inside the timeout: it reads the state as it is when
 * the answer appears, not as it was when the key was pressed.
 */
function thinkMs(): number {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches ? 50 : 650;
}

let seq = 0;

export const useSession = create<Session>((set) => ({
  turns: [],
  pending: null,
  ask(q, intent) {
    const question = q.trim();
    if (!question) return;
    set({ pending: question });
    setTimeout(() => {
      const r = intent ? { intent, reply: answer(intent) } : askAgent(question);
      set((s) => ({
        turns: [{ id: ++seq, question, intent: r.intent, reply: r.reply }, ...s.turns],
        pending: null,
      }));
    }, thinkMs());
  },
}));

// ---------------------------------------------------------------- context seeding

/**
 * Item 45: what this screen would ask. Every entry names an intent `routeIntent()`
 * ALREADY matches, and the wording is checked against its PATTERNS table in both
 * languages - we offer nothing the engine cannot answer.
 */
const SEEDS: Record<string, { key: I18nKey; intent: IntentName }> = {
  regularity: { key: 'cop.q.why', intent: 'why_delayed' },
  vehicle: { key: 'cop.q.whereBus', intent: 'where_bus' },
  health: { key: 'cop.q.health', intent: 'device_health' },
  passenger: { key: 'cop.q.overcrowded', intent: 'overcrowded' },
  alerts: { key: 'cop.q.events', intent: 'open_events' },
  comms: { key: 'cop.q.actions', intent: 'recommend_actions' },
  agentic: { key: 'cop.q.actions', intent: 'recommend_actions' },
  operators: { key: 'cop.q.operators', intent: 'operator_compare' },
  settings: { key: 'cop.q.threshold', intent: 'threshold_lookup' },
  analytics: { key: 'cop.q.brief', intent: 'shift_brief' },
  roi: { key: 'cop.q.brief', intent: 'shift_brief' },
  provenance: { key: 'cop.q.threshold', intent: 'threshold_lookup' },
};
const SEED_FALLBACK = { key: 'cop.q.lookFirst' as I18nKey, intent: 'look_first' as IntentName };

export function useSeed(): { question: string; key: I18nKey } {
  const t = useT();
  const [path] = useRoute();
  const [head, tail] = [path.split('/')[0] ?? '', path.split('/')[1] ?? ''];
  const selRoute = useSelection((s) => s.route_id);
  const selVehicle = useSelection((s) => s.vehicle_id);
  const firstRoute = useSim((s) => s.snap?.routes[0]?.route_id);
  const seed = SEEDS[head] ?? SEED_FALLBACK;
  const bus = head === 'vehicle' ? tail : (selVehicle ?? '');
  // `where_bus` is only offered where a bus id actually exists to put in the question.
  if (seed.intent === 'where_bus' && !bus) {
    return { question: t(SEED_FALLBACK.key), key: SEED_FALLBACK.key };
  }
  const route = selRoute ?? firstRoute ?? '';
  if (seed.intent === 'why_delayed' && !route) {
    return { question: t(SEED_FALLBACK.key), key: SEED_FALLBACK.key };
  }
  return { question: t(seed.key, { route, bus }), key: seed.key };
}

// ---------------------------------------------------------------- the bar

const DRAWER_ID = 'copilot-ask';

/**
 * `/` focuses the bar. Guarded exactly like `hotkeys.ts`: never while the caret is in a
 * field, never with a modifier held - otherwise it would eat every slash typed into a
 * search box and break Ctrl+/ in the browser.
 *
 * The TOP BAR instance owns the shortcut. The copy on the copilot page passes
 * `page` and registers nothing, so there is exactly one owner of the key.
 */
export function AskBar({ page = false }: { page?: boolean }) {
  const t = useT();
  const input = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const seed = useSeed();
  const [path] = useRoute();
  const ask = useSession((s) => s.ask);
  const onCopilotPage = path === 'copilot';

  useEffect(() => {
    if (page) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/') return;
      const el = e.target as HTMLElement | null;
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      if (el?.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      e.preventDefault();
      input.current?.focus();
      input.current?.select();
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [page]);

  function submit(raw: string) {
    // Enter on an empty bar asks what this screen suggests - the one-tap context question.
    const question = raw.trim() || seed.question;
    ask(question);
    setText('');
    // Already looking at the copilot? Then the page IS the answer surface; opening a
    // drawer over it would hide the thing the user came for.
    if (!onCopilotPage) {
      overlay.openDrawer({
        id: DRAWER_ID,
        title: t('cop.title'),
        sub: t('cop.drawer.sub'),
        body: <AskDrawerBody />,
        wide: true,
      });
    }
  }

  return (
    <form
      className={`flex min-w-0 items-center gap-1.5 rounded-md border border-[var(--color-line)] bg-[var(--color-bg2)] px-2 ${page ? 'w-full shrink-0 py-1.5' : 'h-7 flex-1 max-w-[420px]'} focus-within:border-[var(--color-tier4)]`}
      onSubmit={(e) => {
        e.preventDefault();
        submit(text);
      }}
      role="search"
    >
      <Icon name="sparkles" size={13} className="shrink-0 text-[var(--color-tier4)]" />
      <input
        ref={input}
        data-askbar={page ? 'page' : 'top'}
        value={text}
        onChange={(e) => setText(e.target.value)}
        aria-label={t('cop.bar.label')}
        title={t('cop.bar.hint')}
        placeholder={seed.question}
        className="t-body min-w-0 flex-1 bg-transparent text-[var(--color-text1)] outline-none placeholder:text-[var(--color-text3)]"
      />
      {!page && (
        <span
          aria-hidden
          className="t-meta num shrink-0 rounded border border-[var(--color-line)] px-1"
        >
          /
        </span>
      )}
      <button
        type="submit"
        aria-label={t('cop.bar.label')}
        className="shrink-0 text-[var(--color-text3)] hover:text-[var(--color-tier4)]"
      >
        <Icon name="search" size={13} />
      </button>
    </form>
  );
}

// ---------------------------------------------------------------- shared renderer

/** Item 56. Three dots, and the same sentence for a screen reader. */
export function Typing({ question }: { question: string }) {
  const t = useT();
  return (
    <div
      className="flex items-center gap-2 rounded border bg-[var(--color-bg2)] p-2"
      style={{ borderColor: 'var(--color-tier4)' }}
      role="status"
      aria-live="polite"
    >
      <span className="flex items-center gap-1" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="agent-dot inline-block h-[5px] w-[5px] rounded-full"
            style={{ background: 'var(--color-tier4)' }}
          />
        ))}
      </span>
      <span className="t-meta">{t('cop.thinking')}</span>
      <span className="t-meta ml-auto truncate">{question}</span>
    </div>
  );
}

/**
 * The feed: the pending bubble, then every answer, newest first. Drawer and page both
 * render THIS, which is why they cannot disagree about a reply.
 */
export function AnswerFeed({ empty }: { empty?: ReactNode }) {
  const turns = useSession((s) => s.turns);
  const pending = useSession((s) => s.pending);
  if (!turns.length && !pending) return <>{empty}</>;
  return (
    <>
      {pending && <Typing question={pending} />}
      {turns.map((turn) => (
        <AnswerCard key={turn.id} turn={turn} />
      ))}
    </>
  );
}

/** Selection is view state, not fleet state - highlighting a row changes nothing. */
export function navigate(c: Citation | { href: string }): void {
  if ('kind' in c) {
    const sel = useSelection.getState();
    if (c.kind === 'vehicle') sel.selectVehicle(c.id);
    if (c.kind === 'route') sel.selectRoute(c.id);
    if (c.kind === 'alert') sel.selectAlert(c.id);
    if (c.kind === 'event') sel.selectEvent(c.id);
  }
  if (c.href) location.hash = c.href.replace(/^#/, '');
}

/**
 * Which agent's data answered. The intent router is NOT an agent, and when nothing
 * more specific applies the card says so rather than crediting an agent that did
 * no work. A Tier 3 answer came from the pattern counter, a Tier 2 one from a playbook.
 */
function answeringAgent(intent: Intent, reply: AgentReply): AgentDef | null {
  if (reply.tier === 3) return AGENTS.pattern;
  if (reply.tier === 2) return AGENTS.response;
  return agentForIntent(intent.name);
}

export function AnswerCard({ turn }: { turn: Turn }) {
  const t = useT();
  const { reply } = turn;
  const agent = answeringAgent(turn.intent, reply);
  return (
    <article className="rounded border bg-[var(--color-bg2)] p-2" style={{ borderColor: 'var(--color-tier4)' }}>
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <span className="t-meta">{t('ag.answeredBy')}</span>
        <span
          className="t-card"
          style={{ color: 'var(--color-agent)' }}
          title={agent ? `${t(agent.remitKey as I18nKey)} — ${agent.cite}` : t('ag.remit.console')}
        >
          {t((agent?.nameKey ?? 'ag.agent.console') as I18nKey)}
        </span>
        {/* the INTERFACE is Tier 4; the DATA tier sits beside it, never merged */}
        <span
          className="rounded px-1.5 py-[1px] text-[10px] font-semibold"
          style={{ color: 'var(--color-tier4)', border: '1px solid var(--color-tier4)' }}
        >
          {t('cop.tier', { n: 4 })} · {t('cop.tier4')}
        </span>
        <span className="t-meta">{t('cop.dataTier')}:</span>
        <TierBadge tier={reply.tier} />
        <span className="t-meta ml-auto truncate">{turn.question}</span>
      </div>

      <p data-answer="" className="t-body text-[var(--color-text1)]">
        {reply.text}
      </p>

      {reply.citations.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1">
          <span className="t-label">{t('cop.sources')}</span>
          {reply.citations.map((c, i) => (
            <button
              key={`${c.kind}:${c.id}:${i}`}
              type="button"
              onClick={() => navigate(c)}
              className="t-meta num rounded border border-[var(--color-line)] px-1.5 py-[1px] !text-[var(--color-text2)] hover:border-[var(--color-accent)]"
              title={c.label}
            >
              {c.id}
            </button>
          ))}
        </div>
      )}

      {reply.proposals.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {reply.proposals.map((p) => (
            <button
              key={p.href + p.label}
              type="button"
              onClick={() => navigate(p)}
              className="rounded border border-[var(--color-accent)] px-2 py-1 text-[11px] text-[var(--color-accent)] hover:bg-[color-mix(in_srgb,var(--color-accent)_14%,transparent)]"
            >
              {p.label} →
            </button>
          ))}
        </div>
      )}

      {/* The property the answer layer guarantees, made visible: every number in the
          prose above is one of these facts. Nothing is written that was not read. */}
      {reply.facts.length > 0 && (
        <details className="mt-2 rounded border border-[var(--color-line-soft)]">
          <summary
            className="cursor-pointer select-none px-2 py-1 text-[11px] font-semibold"
            style={{ color: 'var(--color-agent)' }}
          >
            {t('ag.facts')}
          </summary>
          <div className="collapse-in border-t border-[var(--color-line-soft)] px-2 py-1.5">
            <p className="t-meta mb-1">{t('ag.factsNote')}</p>
            <ul className="flex flex-col gap-0.5">
              {reply.facts.map((f) => (
                <li key={f.k} className="flex gap-2 text-[11px]">
                  <span className="num w-20 shrink-0 text-[var(--color-text3)]">{f.k}</span>
                  <span className="num min-w-0 flex-1 break-words text-[var(--color-text1)]">{f.v}</span>
                </li>
              ))}
            </ul>
          </div>
        </details>
      )}
    </article>
  );
}

// ---------------------------------------------------------------- chips and history

/** The seeded question first, then the six the engine advertises. */
export function SuggestionChips() {
  const t = useT();
  const seed = useSeed();
  const ask = useSession((s) => s.ask);
  const routeHint = useSelection((s) => s.route_id);
  const firstRoute = useSim((s) => s.snap?.routes[0]?.route_id);
  const route = routeHint ?? firstRoute ?? '';
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={() => ask(seed.question)}
        title={t('cop.seed.here')}
        className="flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px]"
        style={{ borderColor: 'var(--color-tier4)', color: 'var(--color-tier4)' }}
      >
        <Icon name="sparkles" size={11} />
        {seed.question}
      </button>
      {SUGGESTED.filter((q) => t(q.key as I18nKey, { route }) !== seed.question).map((q) => (
        <button
          key={q.key}
          type="button"
          onClick={() => ask(t(q.key as I18nKey, { route }), { name: q.intent, slots: route ? { route_id: route } : {}, via: 'canned' })}
          className="rounded-full border border-[var(--color-line)] px-2.5 py-1 text-[11px] text-[var(--color-text2)] hover:border-[var(--color-tier4)] hover:text-[var(--color-text1)]"
        >
          {t(q.key as I18nKey, { route })}
        </button>
      ))}
    </div>
  );
}

/** Item 44: the questions this session asked, re-askable against current state. */
export function History() {
  const t = useT();
  const turns = useSession((s) => s.turns);
  const ask = useSession((s) => s.ask);
  if (!turns.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="t-meta" title={t('cop.hist.hint')}>
        {t('cop.hist.title')}
      </span>
      {turns.map((turn) => (
        <button
          key={turn.id}
          type="button"
          onClick={() => ask(turn.question, turn.intent.via === 'canned' ? turn.intent : undefined)}
          title={t('cop.hist.hint')}
          className="max-w-[240px] truncate rounded-full border border-[var(--color-line-soft)] px-2 py-[2px] text-[11px] text-[var(--color-text3)] hover:border-[var(--color-tier4)] hover:text-[var(--color-text1)]"
        >
          {turn.question}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- drawer body

/**
 * The drawer. Same feed, same cards, plus the two honesty labels that must travel with
 * an answer wherever it is shown: the ASSUMPTION tag and the offline chip.
 */
export function AskDrawerBody() {
  const t = useT();
  const llmEnabled = useSettings((s) => s.llmEnabled);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <EvidenceTag label="ASSUMPTION" />
        {!llmEnabled && (
          <span className="t-meta rounded border border-[var(--color-line)] px-1.5 py-[1px]">
            {t('cop.offline')}
          </span>
        )}
        <button
          type="button"
          onClick={() => navigate({ href: '#/copilot' })}
          className="ml-auto text-[11px] font-semibold text-[var(--color-accent)]"
        >
          {t('cop.drawer.full')} →
        </button>
      </div>
      <AnswerFeed />
      <SuggestionChips />
      <p className="t-meta">{t('cop.noAction')}</p>
    </div>
  );
}
