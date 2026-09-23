/**
 * Analytics & Post-Incident Review - step 7 of the client's own decision loop
 * ("Learn & Improve"), which their deck states and then leaves with no component.
 *
 * Everything on this screen is a re-reading of records that already exist: the event's
 * alerts, its stage transitions, its completed actions and the communications sent on
 * it, merged into one time-ordered list. The "Learn & Improve" observations are Tier 1
 * arithmetic over those same records - no model, no prediction, and they are worded to
 * say so (R1096 puts predictive functions outside PTCC scope).
 */

import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { history, useAlerts, useComms, useEvents, useSelection, useSettings } from '../../store';
import { useHashQuery } from '../../app/App';
import { EChart, AXIS, CHART_BASE } from '../../charts/EChart';
import { Button, Empty, EventSeverityBadge, EvidenceTag, Panel, StatusPill, fmtInt } from '../../components/primitives';
import { useT } from '../../i18n/t';
import type { I18nKey } from '../../i18n/dict';
import type { EmergencyEvent } from '../../sim/types';

// Long-term analytics (PTCC scenario 3) - an Extension outside R1096 scope, split out so
// the review tab does not pay for them.
const RouteProfile = lazy(() => import('./RouteProfile'));
const Hotspots = lazy(() => import('./Hotspots'));

type Row = { at: string; kind: 'alert' | 'stage' | 'action' | 'comm'; label: string; by?: string };

/** Learn & Improve always emits exactly this many observations - see `Learn` below. */
const LEARN_OBSERVATIONS = 3;

const EM_DASH = '—';

function timeOf(iso: string): string {
  return iso.slice(11, 19);
}
/**
 * NaN when either timestamp is unparseable - which is exactly what an imported or
 * hand-edited record can carry. Every caller therefore has to check, so the only
 * consumer (mean time to close) filters on Number.isFinite before averaging.
 */
function minutesBetween(a: string, b: string): number {
  return (Date.parse(b) - Date.parse(a)) / 60000;
}
/** `fmtInt` renders "NaN"; it is not this workstream's file, so guard here. */
function intOr(n: number): string {
  return Number.isFinite(n) ? fmtInt(n) : EM_DASH;
}
/** Canvas cannot resolve `var(--x)`, so series colours are read off the live root. */
function cssVar(n: string, f: string): string {
  return typeof document === 'undefined' ? f : getComputedStyle(document.documentElement).getPropertyValue(n).trim() || f;
}

type TabId = 'review' | 'route' | 'hotspots';
const TABS: { id: TabId; key: I18nKey }[] = [
  { id: 'review', key: 'an.tab.review' },
  { id: 'route', key: 'an.tab.route' },
  { id: 'hotspots', key: 'an.tab.hotspots' },
];

/**
 * Tab shell. The tab lives in the hash (`#/analytics?tab=route&route=R7&dow=4`), so a
 * tab is a deep link and the back button walks tabs; `dow` in the hash sets the
 * baseline day like `?dow=` does.
 */
export default function Analytics() {
  const t = useT();
  const q = useHashQuery();
  const setDow = useSettings((s) => s.setDow);
  const dow = useSettings((s) => s.dow);
  const raw = q.get('tab');
  const tab: TabId = raw === 'route' || raw === 'hotspots' ? raw : 'review';
  const qDow = q.get('dow');
  useEffect(() => {
    if (qDow !== null && Number.isFinite(+qDow)) setDow(+qDow);
  }, [qDow, setDow]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div role="tablist" className="flex shrink-0 flex-wrap gap-1 border-b border-[var(--color-line)] px-2">
        {TABS.map((tb) => (
          <button
            key={tb.id}
            role="tab"
            type="button"
            aria-selected={tab === tb.id}
            onClick={() => {
              location.hash = tb.id === 'review' ? '#/analytics' : `#/analytics?tab=${tb.id}`;
            }}
            className={`t-body -mb-px border-b-2 px-3 py-1.5 font-medium ${
              tab === tb.id
                ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                : 'border-transparent text-[var(--color-text3)] hover:text-[var(--color-text2)]'
            }`}
          >
            {t(tb.key)}
          </button>
        ))}
      </div>
      {tab === 'review' ? (
        <div className="min-h-0 flex-1 pt-2">
          <ReviewTab />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto pt-2">
          {/* Every number below is a synthetic norm or a forecast - said once, up front. */}
          <div className="t-meta flex flex-wrap items-center gap-x-3 gap-y-1">
            <EvidenceTag label="INFERRED" />
            <span>{t('an.ext.scope')}</span>
            <span>{t('an.ext.norm')}</span>
            <span>{t('an.ext.day', { dow: t(`dow.${dow}` as I18nKey) })}</span>
          </div>
          <Suspense fallback={null}>
            {tab === 'route' ? <RouteProfile key={q.get('route') ?? ''} initialRoute={q.get('route')} /> : <Hotspots />}
          </Suspense>
        </div>
      )}
    </div>
  );
}

/** Post-incident review - the original Analytics screen, unchanged. */
function ReviewTab() {
  const t = useT();
  const events = useEvents((s) => s.events);
  const alerts = useAlerts((s) => s.alerts);
  const coordination = useComms((s) => s.coordination);
  const passenger = useComms((s) => s.passenger);
  const selected = useSelection((s) => s.event_id);
  const th = useSettings((s) => s.th);
  const [local, setLocal] = useState<string | null>(null);

  const ev = events.find((e) => e.event_id === (local ?? selected)) ?? events[0];

  /*
   * The event the operator picked in this panel can be closed and dropped from the
   * store while the panel is open. Without this the local id keeps pointing at a
   * record that no longer exists, the fallback quietly shows a DIFFERENT event, and
   * the <select> renders a value none of its options carry.
   */
  useEffect(() => {
    if (local && !events.some((e) => e.event_id === local)) setLocal(null);
  }, [events, local]);

  // lifted out of DailyReport so the collapsed panel summary and the body share one count
  const closed = useMemo(() => events.filter((e) => e.closed_at), [events]);

  const rows = useMemo<Row[]>(() => {
    if (!ev) return [];
    const out: Row[] = [];
    for (const id of ev.associated_alert_ids) {
      const a = alerts.find((x) => x.id === id);
      if (a)
        out.push({
          at: a.raised_at,
          kind: 'alert',
          // A metric that arrives without a value must read as a missing number, not
          // as "NaNs / 600s".
          label: `${a.rule_id} · ${a.metric.name} ${intOr(a.metric.value)}${a.metric.unit} / ${intOr(a.metric.threshold)}${a.metric.unit}`,
        });
    }
    for (const h of ev.history) out.push({ at: h.at, kind: 'stage', label: h.stage, by: h.by });
    for (const a of ev.actions) {
      if (a.done_at) out.push({ at: a.done_at, kind: 'action', label: a.label_key, by: a.overridden_by });
    }
    for (const c of coordination.filter((c) => c.event_id === ev.event_id)) {
      out.push({ at: c.sent_at, kind: 'comm', label: `${c.message_type} → ${c.recipient}`, by: c.operator });
    }
    for (const p of passenger.filter((p) => p.event_id === ev.event_id)) {
      out.push({ at: p.created_at, kind: 'comm', label: `${p.category} · ${p.channels.join(', ')}`, by: p.status });
    }
    return out.sort((a, b) => a.at.localeCompare(b.at));
  }, [ev, alerts, coordination, passenger]);

  /*
   * No event exists yet. That is not a failure and not a load: an event only exists
   * once an operator has validated an alert, so the panel says exactly that.
   */
  if (!ev) {
    return (
      <Panel titleKey="nav.analytics">
        <Empty title={t('an.none')} text={t('an.noneText')} />
      </Panel>
    );
  }

  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-2 overflow-auto xl:grid-cols-2">
      <Panel
        titleKey="an.timeline"
        className="xl:row-span-2"
        right={
          <span className="flex shrink-0 flex-wrap items-center gap-2">
            <select
              value={ev.event_id}
              onChange={(e) => setLocal(e.target.value)}
              className="t-body max-w-[12rem] truncate rounded border border-[var(--color-line)] bg-[var(--color-bg3)] px-1 py-0.5"
              aria-label={t('an.pickEvent')}
            >
              {events.map((e) => (
                <option key={e.event_id} value={e.event_id}>
                  {e.event_id} · {e.event_type}
                </option>
              ))}
            </select>
            <Button size="sm" onClick={() => exportTimeline(ev, rows)}>
              {t('an.export')}
            </Button>
          </span>
        }
        bodyClassName="p-2"
      >
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <EventSeverityBadge level={ev.severity_level} size="sm" />
          <span className="t-body num text-[var(--color-text2)]">{ev.event_id}</span>
          <StatusPill tone={ev.closed_at ? 'ok' : 'warn'}>
            {t(`ev.stage.${ev.stage}` as I18nKey)}
          </StatusPill>
        </div>
        {rows.length === 0 ? (
          <Empty title={t('an.timelineEmptyTitle')} text={t('an.timelineEmptyText')} />
        ) : null}
        <ol className="flex flex-col gap-2">
          {rows.map((r, i) => (
            <li key={i} className="t-body flex items-baseline gap-2 border-b border-[var(--color-line)] pb-1 last:border-0">
              <span className="num w-16 shrink-0 text-[var(--color-text3)]">{timeOf(r.at)}</span>
              <span className="t-meta w-24 shrink-0 uppercase tracking-wider">
                {t(`an.tl.${r.kind}` as I18nKey)}
              </span>
              <span className="min-w-0 flex-1 break-words text-[var(--color-text1)]">
                {r.kind === 'stage' ? t(`ev.stage.${r.label}` as I18nKey) : r.kind === 'action' ? t(r.label as I18nKey) : r.label}
              </span>
              {r.by ? <span className="t-meta shrink-0">{r.by}</span> : null}
            </li>
          ))}
        </ol>
      </Panel>

      <Panel
        titleKey="an.impact"
        right={<EvidenceTag label="INFERRED" />}
        bodyClassName="flex flex-col gap-2 p-2"
        collapsible
        defaultOpen
        summary={t('an.impactNote')}
      >
        <p className="t-meta">{t('an.impactNote')}</p>
        <div className="min-h-0 flex-1">
          <HeadwayImpact event={ev} gapThresholdS={th.service_gap_max_s} />
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-2">
        <Panel
          titleKey="an.report"
          bodyClassName="p-2"
          collapsible
          defaultOpen={false}
          summary={`${t('an.total')} ${intOr(events.length)} · ${t('an.resolved')} ${intOr(closed.length)}`}
        >
          <DailyReport events={events} closed={closed} />
        </Panel>
        <Panel
          titleKey="an.learn"
          right={<EvidenceTag label="INFERRED" />}
          bodyClassName="p-2"
          collapsible
          defaultOpen={false}
          summary={`${intOr(LEARN_OBSERVATIONS)} · ${t('an.learnNote')}`}
        >
          <p className="t-meta mb-2">{t('an.learnNote')}</p>
          <Learn event={ev} rows={rows} gapThresholdS={th.service_gap_max_s} />
        </Panel>
      </div>
    </div>
  );
}

/** Headway ring for the affected route: before / during / after the event window. */
function HeadwayImpact({ event, gapThresholdS }: { event: EmergencyEvent; gapThresholdS: number }) {
  const t = useT();
  // subscribe to the theme so the canvas colours below are re-read on a theme switch
  const theme = useSettings((s) => s.theme);
  const route = event.route_number;
  const ring = route ? history.headway.get(route) : undefined;
  // A ring is a Float32Array; a slot never written reads back as a non-finite number.
  // NOT memoised on `ring`: a Ring is mutable and keeps its identity for the life of
  // the page, so memoising on it would freeze this chart at the first tick it saw.
  const series = (ring?.toArray() ?? []).filter((v) => Number.isFinite(v));
  // Floor of a short series is 0, which would make the "during" band a zero-width area
  // pinned to the first sample. The render guard below keeps this above 0.
  const third = Math.max(1, Math.floor(series.length / 3));
  const option = useMemo(
    () => ({
      ...CHART_BASE,
      grid: { ...CHART_BASE.grid, left: 40 },
      xAxis: { type: 'category', data: series.map((_, i) => String(i)), ...AXIS },
      yAxis: { type: 'value', name: 'min', ...AXIS },
      series: [
        {
          type: 'line',
          showSymbol: false,
          data: series.map((v) => +(v / 60).toFixed(1)),
          lineStyle: { color: cssVar('--color-accent', '#4d8df0') },
          // §13.8: the service-gap threshold this headway is judged against, drawn.
          markLine: {
            silent: true,
            symbol: 'none' as const,
            lineStyle: { color: cssVar('--color-sev-warn', '#e0a02e'), type: 'dashed' as const, width: 1 },
            label: {
              formatter: Number.isFinite(gapThresholdS) ? `${(gapThresholdS / 60).toFixed(0)} min` : EM_DASH,
              color: cssVar('--color-text3', '#7d8b9d'),
              fontSize: 9,
              position: 'insideEndTop' as const,
            },
            data: Number.isFinite(gapThresholdS) ? [{ yAxis: +(gapThresholdS / 60).toFixed(1) }] : [],
          },
          markArea: {
            // canvas cannot resolve color-mix(), so the alpha rides along as a hex suffix (0x1f ~ 12 %)
            itemStyle: { color: cssVar('--color-ev-high', '#e07b39') + '1f' },
            data: [[{ xAxis: String(third) }, { xAxis: String(third * 2) }]],
          },
        },
      ],
    }),
    [series, third, theme, gapThresholdS],
  );
  /*
   * Two different absences, and they were the same sentence before: an event with no
   * route will NEVER have this chart, while an event on a route whose ring has not
   * filled yet will have it in a few ticks.
   */
  if (!route) return <Empty title={t('an.impactNoRouteTitle')} text={t('an.impactNoRouteText')} />;
  if (series.length < 3) return <Empty title={t('an.impactWarmTitle')} text={t('an.impactWarmText', { route })} />;
  return <EChart option={option} />;
}

function DailyReport({ events, closed }: { events: readonly EmergencyEvent[]; closed: readonly EmergencyEvent[] }) {
  const t = useT();
  const byType = new Map<string, number>();
  const bySev = new Map<number, number>();
  for (const e of events) {
    byType.set(e.event_type, (byType.get(e.event_type) ?? 0) + 1);
    bySev.set(e.severity_level, (bySev.get(e.severity_level) ?? 0) + 1);
  }
  /*
   * One unparseable timestamp used to poison the whole average into NaN, and "NaN min"
   * went on the screen. Only the intervals that are real are averaged, and with none of
   * them the figure is an em dash - not a confident 0.0 min.
   */
  const spans = closed
    .map((e) => minutesBetween(e.timestamp, e.closed_at!))
    .filter((m) => Number.isFinite(m));
  const meanClose = spans.length ? spans.reduce((a, m) => a + m, 0) / spans.length : null;
  return (
    <dl className="t-body grid grid-cols-2 gap-2">
      <Stat label={t('an.total')} value={intOr(events.length)} />
      <Stat label={t('an.resolved')} value={intOr(closed.length)} />
      <Stat label={t('an.stillOpen')} value={intOr(Math.max(0, events.length - closed.length))} />
      <Stat label={t('an.avgClose')} value={meanClose === null ? EM_DASH : `${meanClose.toFixed(1)} min`} />
      <Stat label={t('an.byType')} value={[...byType].map(([k, n]) => `${k} ${n}`).join(' · ') || EM_DASH} />
      <Stat label={t('an.bySeverity')} value={[...bySev].sort().map(([k, n]) => `${k}: ${n}`).join(' · ') || EM_DASH} />
    </dl>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col border-b border-[var(--color-line)] py-1">
      <dt className="t-meta uppercase tracking-wider">{label}</dt>
      <dd className="num break-words text-[var(--color-text1)]">{value}</dd>
    </div>
  );
}

/**
 * Three plain-language observations. The threshold one is the loop-closing move: it
 * restates the event against a tighter service-gap threshold and prices the change in
 * extra alerts per day, so "tune the threshold" stops being a hand-wave.
 */
function Learn({ event, rows, gapThresholdS }: { event: EmergencyEvent; rows: Row[]; gapThresholdS: number }) {
  const t = useT();
  const alerts = useAlerts((s) => s.alerts);
  // A non-finite threshold (a hand-edited setting) would put the word "NaN" into a
  // sentence the operator is being asked to act on.
  const gap = Number.isFinite(gapThresholdS) ? gapThresholdS : 0;
  const alt = Math.max(5, Math.round((gap * 0.75) / 60)); // 25 % tighter, in minutes
  const earlier = Math.max(1, Math.round((gap - alt * 60) / 60));
  // how many currently-open alerts sit between the tighter and the current threshold
  const extra = alerts.filter(
    (a) => a.metric.name === 'headway_s' && a.metric.value >= alt * 60 && a.metric.value < gap,
  ).length;
  const comms = rows.filter((r) => r.kind === 'comm').length;
  const compulsory = event.actions.filter((a) => a.compulsory);
  const done = compulsory.filter((a) => a.done || a.overridden_by).length;
  const firstAlert = rows.find((r) => r.kind === 'alert');

  // length === LEARN_OBSERVATIONS, which is what the collapsed panel summary counts
  const lines = [
    t('an.obsThreshold', { alt, min: earlier, extra }),
    t('an.obsCompulsory', { done, n: compulsory.length }),
    firstAlert
      ? t('an.obsAlerts', { n: event.associated_alert_ids.length, at: timeOf(firstAlert.at) })
      : t('an.obsComms', { n: comms }),
  ];
  return (
    <ul className="flex flex-col gap-2">
      {lines.map((l, i) => (
        <li key={i} className="t-body border-l-2 border-[var(--color-accent)] pl-2 leading-relaxed text-[var(--color-text2)]">
          {l}
        </li>
      ))}
    </ul>
  );
}

function exportTimeline(event: EmergencyEvent, rows: Row[]): void {
  const blob = new Blob(
    [JSON.stringify({ event_id: event.event_id, event_type: event.event_type, exported_from: 'PTCC demo (simulated data)', timeline: rows }, null, 2)],
    { type: 'application/json' },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${event.event_id}-timeline.json`;
  a.click();
  URL.revokeObjectURL(url);
}
