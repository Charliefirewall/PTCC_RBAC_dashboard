/**
 * Module 7 - Communication & Passenger Information.
 *
 * Two composers, two record shapes, one governance rule underneath both:
 *
 * L718:  PTCC is not a command authority. It validates, requests, informs,
 *        coordinates and records. It never dispatches a tow truck itself - it asks
 *        the bus Operator's OCC. Every prefill below is therefore worded as a
 *        REQUEST, never as an order, including the "Operational Instruction" type
 *        (which is the source's name for the message class, not its tone).
 * L1443: a drafted passenger message is `pending_approval` and only an explicit
 *        approval turns it `active`. Nothing publishes itself.
 * L741:  PTCC consolidates and validates; authorised PTPD units publish.
 * R967:  no PTCC-TCC interface exists today - a TCC message is a manual channel.
 * L1512-L1518: the automatic drafts (accident -> Traffic Police, major disruption ->
 *        operator, severe congestion -> TCC) are rule-derived from open events.
 */

import { useMemo, useState, type ReactNode } from 'react';
import { useComms, useEvents, useSelection, useSettings } from '../../store';
import type { CoordinationMessage, EmergencyEvent, PassengerMessage } from '../../sim/types';
import { hhmmss, simSecondsOf } from '../../sim/engine';
import type { I18nKey } from '../../i18n/dict';
import { useT } from '../../i18n/t';
import { Empty, EvidenceTag, Panel, StatusPill } from '../../components/primitives';
import { can } from '../roles/roles';

type PaxCategory = PassengerMessage['category'];
type Channel = PassengerMessage['channels'][number];
type MsgType = CoordinationMessage['message_type'];
type Recipient = CoordinationMessage['recipient'];

const CATEGORIES: PaxCategory[] = [
  'delay',
  'disruption',
  'diversion',
  'suspension',
  'emergency',
  'special_event',
  'weather',
];
const CHANNELS: Channel[] = ['app', 'social', 'web', 'sms', 'pis'];
const MSG_TYPES: MsgType[] = [
  'incident_notification',
  'operational_instruction',
  'coordination_request',
  'service_status_update',
];
const RECIPIENTS: Recipient[] = ['bus_operator', 'traffic_police', 'tcc', 'ptpd', 'emergency_services', 'municipal'];

// bg3, not bg2: in light theme bg2 (#f7f9fc) on a bg1 (#ffffff) panel is not a
// visible field. bg3 reads as an input well in BOTH themes.
const INPUT =
  't-body w-full rounded border border-[var(--color-line)] bg-[var(--color-bg3)] px-2 py-1 text-[var(--color-text1)] outline-none focus:border-[var(--color-accent)]';
const BTN =
  't-body rounded border border-[var(--color-line)] px-2 py-1 font-medium text-[var(--color-text2)] hover:border-[var(--color-accent)] hover:text-[var(--color-text1)] disabled:cursor-not-allowed disabled:opacity-40';

/**
 * `hhmmss` renders "NaN:NaN:NaN" for a stamp it cannot parse, and it is not ours to
 * change (reported as a defect). A time we cannot compute is an em dash.
 *
 * `LOG_LIMIT` bounds the two message logs: they only ever grow, and a session that
 * drafts hundreds of messages must not render hundreds of cards. The count of what is
 * not shown stays on screen, so nothing is silently lost.
 */
const DASH = '—';
const LOG_LIMIT = 25;
function clockOf(iso: string | undefined): string {
  if (!iso) return DASH;
  const s = simSecondsOf(iso);
  return Number.isFinite(s) ? hhmmss(s) : DASH;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="panel-title">{label}</span>
      {children}
    </label>
  );
}

// ---------------------------------------------------------------- module

export default function Comms() {
  const t = useT();
  const events = useEvents((s) => s.events);
  const event_id = useSelection((s) => s.event_id);
  const selected = events.find((e) => e.event_id === event_id) ?? events[0];
  // One-click prefill: the nonce remounts the composer with the suggested values.
  const [picked, setPicked] = useState<{ draft: Draft; n: number } | null>(null);

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      {/* Both banners stay on screen for the whole module - they are the governance
          statement, not a dismissible hint. */}
      <div className="flex shrink-0 flex-wrap gap-2">
        <div className="panel flex min-w-0 flex-1 items-center gap-2 px-3 py-1.5">
          <EvidenceTag label="CONFIRMED" cite="L741" />
          <span className="t-body text-[var(--color-text2)]">{t('comms.banner')}</span>
        </div>
        <div className="panel flex min-w-0 flex-1 items-center gap-2 border-[var(--color-sev-warn)] px-3 py-1.5">
          <EvidenceTag label="CONFIRMED" cite="R967" />
          {/* t-body, not t-meta: t-meta would force text3 over the warn colour. */}
          <span className="t-body" style={{ color: 'var(--color-sev-warn)' }}>
            {t('comms.tccNote')}
          </span>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 overflow-auto xl:grid-cols-2">
        <div className="flex flex-col gap-2">
          <PassengerComposer event={selected} />
          <PassengerLog />
        </div>
        <div className="flex flex-col gap-2">
          <AutoDrafts onPick={(d) => setPicked((p) => ({ draft: d, n: (p?.n ?? 0) + 1 }))} />
          <CoordinationComposer key={picked?.n ?? 0} event={selected} prefill={picked?.draft} />
          <CoordinationLog />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- passenger composer

function PassengerComposer({ event }: { event: EmergencyEvent | undefined }) {
  const t = useT();
  const role = useSettings((s) => s.role);
  const [category, setCategory] = useState<PaxCategory>('disruption');
  const [en, setEn] = useState('');
  const [mn, setMn] = useState('');
  const [channels, setChannels] = useState<Channel[]>(['app', 'web', 'pis']);

  const toggle = (c: Channel) =>
    setChannels((cs) => (cs.includes(c) ? cs.filter((x) => x !== c) : [...cs, c]));

  return (
    <Panel
      titleKey="comms.passenger"
      right={<EvidenceTag label="CONFIRMED" cite="L1428" />}
      className="shrink-0"
      collapsible
      defaultOpen
      summary={event?.event_id ?? t('comms.noEvent')}
    >
      <div className="flex flex-col gap-2 p-2">
        <p className="t-meta">{t('comms.approvalGate')}</p>
        {event ? (
          <span className="num t-meta truncate">
            {t('comms.linkedEvent')}: {event.event_id}
          </span>
        ) : null}

        <Field label={t('comms.category')}>
          <select className={INPUT} value={category} onChange={(e) => setCategory(e.target.value as PaxCategory)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t(`comms.cat.${c}` as I18nKey)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t('comms.contentEn')}>
          <textarea className={INPUT} rows={2} value={en} onChange={(e) => setEn(e.target.value)} />
        </Field>
        <Field label={t('comms.contentMn')}>
          <textarea className={INPUT} rows={2} value={mn} onChange={(e) => setMn(e.target.value)} />
        </Field>

        <fieldset className="rounded border border-[var(--color-line)] p-2">
          <legend className="panel-title px-1">{t('comms.channels')}</legend>
          <div className="flex flex-wrap gap-3">
            {CHANNELS.map((c) => (
              <label key={c} className="t-body flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={channels.includes(c)}
                  onChange={() => toggle(c)}
                  style={{ accentColor: 'var(--color-accent)' }}
                />
                {t(`comms.ch.${c}` as I18nKey)}
              </label>
            ))}
          </div>
        </fieldset>

        <button
          type="button"
          className={`${BTN} self-end border-[var(--color-accent)] text-[var(--color-accent)]`}
          disabled={en.trim().length === 0 || channels.length === 0}
          onClick={() => {
            useComms.getState().draftPassenger({
              content_en: en.trim(),
              content_mn: mn.trim(),
              category,
              originating_operator: role,
              channels,
              event_id: event?.event_id,
            });
            setEn('');
            setMn('');
          }}
        >
          {t('comms.draft')}
        </button>
      </div>
    </Panel>
  );
}

function PassengerLog() {
  const t = useT();
  const msgs = useComms((s) => s.passenger);
  const role = useSettings((s) => s.role);
  const shown = msgs.slice(0, LOG_LIMIT);
  // The approval backlog is the one number worth keeping visible while collapsed.
  const pending = msgs.filter((m) => m.status !== 'active').length;
  return (
    <Panel
      titleKey="comms.fields7"
      className="shrink-0"
      collapsible
      defaultOpen={false}
      summary={msgs.length === 0 ? t('comms.empty') : `${msgs.length} · ${pending} ${t('comms.pending')}`}
    >
      {msgs.length === 0 ? (
        <Empty title={t('comms.empty')} text={t('comms.emptyPassengerHint')} />
      ) : (
        <ul className="p-2">
          {shown.map((m) => (
            <li key={m.message_id} className="mb-2 rounded border border-[var(--color-line)] p-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="num t-meta min-w-0 truncate">{m.message_id}</span>
                <StatusPill tone={m.status === 'active' ? 'ok' : 'warn'}>
                  {m.status === 'active' ? t('comms.active') : t('comms.pending')}
                </StatusPill>
                <span className="num t-meta ml-auto shrink-0">{clockOf(m.created_at)}</span>
              </div>
              <dl className="t-body mt-1 grid grid-cols-1 gap-x-3 sm:grid-cols-2">
                <Row label={t('comms.category')} value={t(`comms.cat.${m.category}` as I18nKey)} />
                <Row label={t('comms.channels')} value={m.channels.map((c) => t(`comms.ch.${c}` as I18nKey)).join(', ')} />
                <Row label={t('comms.contentEn')} value={m.content_en || DASH} />
                <Row label={t('comms.contentMn')} value={m.content_mn || DASH} />
                <Row label={t('ev.actor')} value={m.originating_operator} />
                <Row label={t('comms.linkedEvent')} value={m.event_id ?? t('comms.noEvent')} />
              </dl>
              {/* L1443: the approval gate. Nothing reaches a passenger without it. */}
              {m.status !== 'active' ? <ApproveButton message_id={m.message_id} role={role} /> : null}
            </li>
          ))}
          {msgs.length > shown.length ? (
            <li className="t-meta px-1 py-1">{t('comms.older', { n: msgs.length - shown.length })}</li>
          ) : null}
        </ul>
      )}
    </Panel>
  );
}

/**
 * `useComms.approve` re-writes an `approve_message` audit row every time it is called
 * (reported as a defect). The button unmounts once the message turns active, but a
 * double-click can land twice before that render: one local latch makes the second
 * click a no-op, so one approval writes exactly one audit row.
 */
function ApproveButton({ message_id, role }: { message_id: string; role: string }) {
  const t = useT();
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      disabled={done}
      className={`${BTN} mt-1 border-[var(--color-sev-ok)] text-[var(--color-sev-ok)]`}
      onClick={() => {
        if (done) return;
        setDone(true);
        useComms.getState().approve(message_id, role);
      }}
    >
      {t('comms.approve')}
    </button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col">
      <dt className="panel-title">{label}</dt>
      <dd className="break-words text-[var(--color-text2)]">{value}</dd>
    </div>
  );
}

// ---------------------------------------------------------------- coordination

interface Draft {
  message_type: MsgType;
  recipient: Recipient;
  /** L6: the body is a dictionary key + params, never a baked English paragraph. */
  body_key: I18nKey;
  params: Record<string, string | number>;
  event_id?: string;
}

/**
 * L1512-L1518. Rule-derived suggestions from the OPEN events - same deterministic
 * spirit as the Tier 1 alert rules. Wording follows L718: PTCC asks, it does not order.
 */
function suggestDrafts(events: readonly EmergencyEvent[]): Draft[] {
  const out: Draft[] = [];
  for (const e of events) {
    if (e.stage === 'closure') continue;
    // A location without a label, a bus with no number: `t()` would interpolate the
    // literal "undefined" into a message addressed to the Traffic Police.
    const where = e.location?.label || DASH;
    const bus = e.bus_number ?? '—';
    const route = e.route_number ?? '—';
    if (e.playbook === 'traffic_accident') {
      out.push({
        message_type: 'incident_notification',
        recipient: 'traffic_police',
        event_id: e.event_id,
        body_key: 'comms.draft.accident',
        params: { id: e.event_id, bus, where, at: hhmmss(simSecondsOf(e.timestamp)) },
      });
    }
    // "Major disruption": a validated event at event severity 1-3 that is operational
    // or an equipment/breakdown case where the OCC owns the recovery (D3).
    if (e.severity_level <= 3 && (e.category === 'operational' || e.playbook === 'vehicle_breakdown')) {
      out.push({
        message_type: 'operational_instruction',
        recipient: 'bus_operator',
        event_id: e.event_id,
        body_key: 'comms.draft.disruption',
        params: { id: e.event_id, route, bus },
      });
    }
    // Severe congestion: the route-level deviation rules are the congestion evidence.
    if (['schedule_deviation', 'service_gap', 'bunching'].includes(e.event_type) && e.severity_level <= 3) {
      out.push({
        message_type: 'coordination_request',
        recipient: 'tcc',
        event_id: e.event_id,
        body_key: 'comms.draft.congestion',
        params: { id: e.event_id, route, where },
      });
    }
  }
  return out;
}

function AutoDrafts({ onPick }: { onPick: (d: Draft) => void }) {
  const t = useT();
  const events = useEvents((s) => s.events);
  const drafts = useMemo(() => suggestDrafts(events), [events]);

  return (
    <Panel
      titleKey="comms.autoDrafts"
      right={<EvidenceTag label="CONFIRMED" cite="L1512" />}
      className="shrink-0"
      collapsible
      defaultOpen={false}
      summary={String(drafts.length)}
    >
      <div className="flex flex-col gap-2 p-2">
        <p className="t-meta">{t('comms.autoDraftNote')}</p>
        {drafts.length === 0 ? (
          <Empty tone="ok" title={t('comms.noDraftsTitle')} text={t('comms.emptyDraftsHint')} />
        ) : (
          <ul className="flex flex-col gap-1">
            {drafts.map((d, n) => (
              <li key={n}>
                <button
                  type="button"
                  data-comms-draft=""
                  onClick={() => onPick(d)}
                  className="w-full rounded border border-[var(--color-line)] px-2 py-1 text-left hover:border-[var(--color-accent)]"
                >
                  <div className="t-body flex min-w-0 items-center gap-2 font-medium">
                    <span className="truncate">{t(`comms.type.${d.message_type}` as I18nKey)}</span>
                    <span className="shrink-0 text-[var(--color-text3)]">→</span>
                    <span className="truncate">{t(`rcpt.${d.recipient}` as I18nKey)}</span>
                    <span className="num t-meta ml-auto shrink-0">{d.event_id}</span>
                  </div>
                  <div className="t-meta line-clamp-2">{t(d.body_key, d.params)}</div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  );
}

function CoordinationComposer({ event, prefill }: { event: EmergencyEvent | undefined; prefill?: Draft }) {
  const t = useT();
  const role = useSettings((s) => s.role);
  const [message_type, setType] = useState<MsgType>(prefill?.message_type ?? 'incident_notification');
  const [recipient, setRecipient] = useState<Recipient>(prefill?.recipient ?? 'traffic_police');
  const [content, setContent] = useState(prefill ? t(prefill.body_key, prefill.params) : '');

  /*
   * The subject is resolved LIVE, not frozen at prefill time (same reason the Validate
   * dialog in Alerts.tsx takes an id and subscribes). If the event a draft was built
   * from is no longer in the record, the message is still worth sending - but it must
   * not carry a dangling event reference into the audit trail.
   */
  const events = useEvents((s) => s.events);
  const picked_id = prefill?.event_id ?? event?.event_id;
  const event_id = events.some((e) => e.event_id === picked_id) ? picked_id : undefined;

  return (
    <Panel
      titleKey="comms.coordination"
      right={<EvidenceTag label="CONFIRMED" cite="L1533" />}
      className="shrink-0"
      collapsible
      // Picking an auto-draft remounts this component via key={picked.n}, so Panel's
      // useState(defaultOpen) re-initialises and the prefilled panel opens itself.
      defaultOpen={Boolean(prefill)}
      summary={event_id ?? t('comms.noEvent')}
    >
      <div className="flex flex-col gap-2 p-2">
        <p className="t-meta">{t('comms.requestWording')}</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Field label={t('comms.messageType')}>
            <select className={INPUT} value={message_type} onChange={(e) => setType(e.target.value as MsgType)}>
              {MSG_TYPES.map((m) => (
                <option key={m} value={m}>
                  {t(`comms.type.${m}` as I18nKey)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('comms.recipient')}>
            <select className={INPUT} value={recipient} onChange={(e) => setRecipient(e.target.value as Recipient)}>
              {RECIPIENTS.map((r) => (
                <option key={r} value={r}>
                  {t(`rcpt.${r}` as I18nKey)}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label={t('comms.content')}>
          <textarea className={INPUT} rows={4} value={content} onChange={(e) => setContent(e.target.value)} />
        </Field>
        <div className="flex min-w-0 items-center gap-2">
          <span className="num t-meta min-w-0 truncate">
            {t('comms.linkedEvent')}: {event_id ?? t('comms.noEvent')}
          </span>
          <button
            type="button"
            className={`${BTN} ml-auto border-[var(--color-accent)] text-[var(--color-accent)]`}
            disabled={content.trim().length === 0}
            onClick={() => {
              useComms.getState().sendCoordination({
                event_id,
                message_type,
                content: content.trim(),
                recipient,
                // R967: TCC has no system interface today - name the manual channel.
                channel: recipient === 'tcc' ? 'manual (telephone)' : 'ptcc_console',
                operator: role,
              });
              setContent('');
            }}
          >
            {t('comms.send')}
          </button>
        </div>
      </div>
    </Panel>
  );
}

function CoordinationLog() {
  const t = useT();
  const msgs = useComms((s) => s.coordination);
  const role = useSettings((s) => s.role);
  const shown = msgs.slice(0, LOG_LIMIT);
  // An SOP draft is waiting for a person to send it: open the log so it is seen.
  const hasDraft = msgs.some((m) => m.status === 'draft');
  return (
    <Panel
      titleKey="comms.fields8"
      className="shrink-0"
      collapsible
      defaultOpen={hasDraft}
      summary={msgs.length === 0 ? t('comms.empty') : String(msgs.length)}
    >
      {msgs.length === 0 ? (
        <Empty title={t('comms.empty')} text={t('comms.emptyCoordHint')} />
      ) : (
        <ul className="p-2">
          {shown.map((m) => (
            <li
              key={m.communication_id}
              data-coord={m.status ?? 'sent'}
              className={`mb-2 rounded border p-2 ${m.status === 'draft' ? 'border-[var(--color-sev-crit)]' : 'border-[var(--color-line)]'}`}
            >
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="num t-meta min-w-0 truncate">{m.communication_id}</span>
                <StatusPill tone="info">{t(`comms.type.${m.message_type}` as I18nKey)}</StatusPill>
                {/* PTCC SOP: L1 messages the system sent itself; L3 drafts a person sends. */}
                {m.auto ? <StatusPill tone={m.status === 'revoked' ? 'neutral' : 'ok'}>{t('sop.auto')}</StatusPill> : null}
                {m.status === 'revoked' ? <StatusPill tone="neutral">{t('sop.revoked')}</StatusPill> : null}
                {m.status === 'draft' ? (
                  <>
                    <StatusPill tone="crit">{t('sop.draft')}</StatusPill>
                    <button
                      type="button"
                      data-send-draft=""
                      disabled={!can(role, 'send_coordination')}
                      onClick={() => useComms.getState().sendDraft(m.communication_id, role)}
                      className="rounded border border-[var(--color-accent)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-accent)] disabled:opacity-40"
                    >
                      {t('sop.sendDraft')}
                    </button>
                  </>
                ) : null}
                {m.auto && m.status !== 'revoked' ? (
                  <button
                    type="button"
                    disabled={!can(role, 'revoke_auto_action')}
                    onClick={() => useComms.getState().revoke(m.communication_id, role)}
                    className="rounded border border-[var(--color-line)] px-2 py-0.5 text-[11px] text-[var(--color-text2)] disabled:opacity-40"
                  >
                    {t('sop.revoke')}
                  </button>
                ) : null}
                <span className="num t-meta ml-auto shrink-0">{clockOf(m.sent_at)}</span>
              </div>
              <dl className="t-body mt-1 grid grid-cols-1 gap-x-3 sm:grid-cols-2">
                <Row label={t('comms.linkedEvent')} value={m.event_id ?? m.alert_id ?? t('comms.noEvent')} />
                <Row label={t('comms.recipient')} value={t(`rcpt.${m.recipient}` as I18nKey)} />
                <Row label={t('comms.channel')} value={m.channel} />
                <Row label={t('ev.actor')} value={m.operator} />
              </dl>
              <p className="t-body mt-1 min-w-0 break-words text-[var(--color-text2)]">{m.content}</p>
              {m.acknowledged_at ? (
                <p className="t-body mt-1 rounded border border-[var(--color-sev-ok)] px-2 py-1 text-[var(--color-sev-ok)]" data-ack="">
                  ↩ {clockOf(m.acknowledged_at)} · {m.ack_text}
                </p>
              ) : null}
            </li>
          ))}
          {msgs.length > shown.length ? (
            <li className="t-meta px-1 py-1">{t('comms.older', { n: msgs.length - shown.length })}</li>
          ) : null}
        </ul>
      )}
    </Panel>
  );
}
