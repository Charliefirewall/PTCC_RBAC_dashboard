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

import { lazy, useEffect, useMemo, useState } from 'react';
import { history, useAlerts, useComms, useEvents, useSelection, useSettings, useSim } from '../../store';
import { hhmmss } from '../../sim/engine';
import { eventWindow, impactInsights, isoToSimS } from './headwayImpact';
import { useHashQuery } from '../../app/App';
import { EChart, AXIS, CHART_BASE } from '../../charts/EChart';
import { Button, Empty, EventSeverityBadge, EvidenceTag, Panel, StatusPill, fmtInt } from '../../components/primitives';
import { t as tr, useT, useTx } from '../../i18n/t';
import { localizeValue as lv } from '../../i18n/codes';
import type { I18nKey } from '../../i18n/dict';
import type { EmergencyEvent } from '../../sim/types';
import { useAccessibleTabs } from '../../components/AccessibleTabs';
import { AsyncBoundary } from '../../components/AsyncBoundary';

// Long-term analytics (PTCC scenario 3) - an Extension outside R1096 scope, split out so
// the review tab does not pay for them.
const RouteProfile = lazy(() => import('./RouteProfile'));
const Hotspots = lazy(() => import('./Hotspots'));
const CapabilityPreviews = lazy(() => import('./CapabilityPreviews'));

type Row = { at: string; kind: 'alert' | 'stage' | 'action' | 'comm'; label: string; by?: string; /** on-screen reading of `label` in the UI language; `label` stays the exported code */ shown?: string };

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

type TabId = 'review' | 'route' | 'hotspots' | 'previews';
const TABS: { id: TabId; key: I18nKey }[] = [
  { id: 'review', key: 'an.tab.review' },
  { id: 'route', key: 'an.tab.route' },
  { id: 'hotspots', key: 'an.tab.hotspots' },
  { id: 'previews', key: 'an.tab.previews' },
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
  const tab: TabId = raw === 'route' || raw === 'hotspots' || raw === 'previews' ? raw : 'review';
  const qDow = q.get('dow');
  useEffect(() => {
    if (qDow !== null && Number.isFinite(+qDow)) setDow(+qDow);
  }, [qDow, setDow]);
  const selectTab = (next: TabId) => {
    const nextQuery = new URLSearchParams(q);
    if (next === 'review') nextQuery.delete('tab');
    else nextQuery.set('tab', next);
    const query = nextQuery.toString();
    location.hash = `#/analytics${query ? `?${query}` : ''}`;
  };
  const tabs = useAccessibleTabs(TABS.map((item) => item.id), tab, selectTab, 'analytics');
  const asyncCopy = {
    loading: t('async.loading'),
    errorTitle: t('async.errorTitle'),
    errorText: t('async.errorText'),
    retry: t('async.retry'),
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div role="tablist" aria-label={t('nav.analytics')} className="flex shrink-0 gap-1 overflow-x-auto border-b border-[var(--color-line)] px-2">
        {TABS.map((tb) => (
          <button
            key={tb.id}
            type="button"
            {...tabs.getTabProps(tb.id)}
            onClick={() => selectTab(tb.id)}
            className={`t-body -mb-px shrink-0 border-b-2 px-3 py-1.5 font-medium ${
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
        <div {...tabs.getPanelProps('review')} className="min-h-0 flex-1 pt-2 focus:outline-none">
          <ReviewTab />
        </div>
      ) : tab === 'previews' ? (
        <div {...tabs.getPanelProps('previews')} className="flex min-h-0 flex-1 pt-2 focus:outline-none">
          <AsyncBoundary {...asyncCopy}><CapabilityPreviews /></AsyncBoundary>
        </div>
      ) : (
        <div {...tabs.getPanelProps(tab)} className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto pt-2 focus:outline-none">
          {/* Every number below is a synthetic norm or a forecast - said once, up front. */}
          <div className="t-meta flex flex-wrap items-center gap-x-3 gap-y-1">
            <EvidenceTag label="INFERRED" />
            <span>{t('an.ext.scope')}</span>
            <span>{t('an.ext.norm')}</span>
            <span>{t('an.ext.day', { dow: t(`dow.${dow}` as I18nKey) })}</span>
          </div>
          <AsyncBoundary {...asyncCopy}>
            {tab === 'route' ? (
              <RouteProfile key={q.get('route') ?? ''} initialRoute={q.get('route')} />
            ) : (
              <Hotspots key={`${q.get('route') ?? ''}|${q.get('start') ?? ''}`} initialRoute={q.get('route')} initialStart={q.get('start')} />
            )}
          </AsyncBoundary>
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
  const lang = useSettings((s) => s.lang);
  const tx = useTx();
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
          shown:
            lang === 'mn'
              ? `${lv(a.rule_id, lang)} · ${lv(a.metric.name, lang)} ${intOr(a.metric.value)} ${lv(a.metric.unit, lang)} / ${intOr(a.metric.threshold)} ${lv(a.metric.unit, lang)}`
              : undefined,
        });
    }
    for (const h of ev.history) out.push({ at: h.at, kind: 'stage', label: h.stage, by: h.by });
    for (const a of ev.actions) {
      if (a.done_at) out.push({ at: a.done_at, kind: 'action', label: a.label_key, by: a.overridden_by });
    }
    for (const c of coordination.filter((c) => c.event_id === ev.event_id)) {
      out.push({ at: c.sent_at, kind: 'comm', label: `${c.message_type} → ${c.recipient}`, by: c.operator, shown: lang === 'mn' ? `${tr(`comms.type.${c.message_type}` as I18nKey, lang)} → ${tr(`rcpt.${c.recipient}` as I18nKey, lang)}` : undefined });
    }
    for (const p of passenger.filter((p) => p.event_id === ev.event_id)) {
      out.push({ at: p.created_at, kind: 'comm', label: `${p.category} · ${p.channels.join(', ')}`, by: p.status, shown: lang === 'mn' ? `${tr(`comms.cat.${p.category}` as I18nKey, lang)} · ${p.channels.map((c) => tr(`comms.ch.${c}` as I18nKey, lang)).join(', ')}` : undefined });
    }
    return out.sort((a, b) => a.at.localeCompare(b.at));
  }, [ev, alerts, coordination, passenger, lang]);

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
                  {e.event_id} · {tx(e.event_type)}
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
                {r.kind === 'stage' ? t(`ev.stage.${r.label}` as I18nKey) : r.kind === 'action' ? t(r.label as I18nKey) : (r.shown ?? r.label)}
              </span>
              {r.by ? <span className="t-meta shrink-0">{tx(r.by)}</span> : null}
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
  // re-render on every sim tick: the rings below are mutable and keep their identity
  useSim((s) => s.tick);
  const route = event.route_number;
  const ring = route ? history.headway.get(route) : undefined;
  // Align the headway ring with the time ring on the TAIL (a route that started
  // reporting late has a shorter ring). A never-written Float32 slot is non-finite and
  // becomes null - a break in the line - rather than being dropped, which would shift
  // every later sample against its timestamp.
  const hw = ring?.toArray() ?? [];
  const tAll = history.t.toArray();
  const n = Math.min(hw.length, tAll.length);
  const ts = tAll.slice(tAll.length - n);
  const vals = hw.slice(hw.length - n).map((v) => (Number.isFinite(v) ? +(v / 60).toFixed(1) : null));
  const real = vals.filter((v) => v !== null).length;
  const thrMin = Number.isFinite(gapThresholdS) ? gapThresholdS / 60 : Infinity;
  const win = eventWindow(ts, isoToSimS(event.timestamp), isoToSimS(event.closed_at));
  const ins = impactInsights(vals, ts, win, thrMin);

  const x = ts.map(hhmmss);
  const text2 = cssVar('--color-text2', '#9caabb');
  const text3 = cssVar('--color-text3', '#7d8b9d');
  const warn = cssVar('--color-sev-warn', '#e0a02e');
  const phaseLabel = (key: I18nKey) => ({
    formatter: t(key),
    position: 'insideTop' as const,
    color: text2,
    fontSize: 10,
  });
  const option = {
    ...CHART_BASE,
    // bottom room for the 45° tick labels plus the axis name under them
    grid: { ...CHART_BASE.grid, left: 50, right: 16, top: 22, bottom: 62 },
    tooltip: {
      ...CHART_BASE.tooltip,
      formatter: (ps: { dataIndex: number }[]) => {
        const i = ps[0]?.dataIndex ?? 0;
        const phase = i < win.start ? 'uxreg.imp.before' : i < win.end ? 'uxreg.imp.during' : 'uxreg.imp.after';
        const v = vals[i];
        return `<b>${hhmmss(ts[i]!)}</b> · ${t(phase)}<br/>${t('uxreg.imp.series')}: ${v ?? EM_DASH} ${t('unit.min')}`;
      },
    },
    xAxis: {
      ...AXIS,
      type: 'category',
      data: x,
      boundaryGap: false,
      name: t('uxreg.axis.time'),
      nameLocation: 'middle',
      nameGap: 44,
      nameTextStyle: { color: text3, fontSize: 10 },
      axisLabel: { ...AXIS.axisLabel, rotate: 45, interval: Math.max(0, Math.ceil(x.length / 12) - 1) },
    },
    yAxis: {
      ...AXIS,
      type: 'value',
      min: 0,
      name: t('uxreg.imp.yAxis'),
      nameLocation: 'middle',
      nameRotate: 90,
      nameGap: 32,
      nameTextStyle: { color: text3, fontSize: 10 },
    },
    series: [
      {
        name: t('uxreg.imp.series'),
        type: 'line',
        showSymbol: false,
        data: vals,
        lineStyle: { color: cssVar('--color-accent', '#4d8df0') },
        itemStyle: { color: cssVar('--color-accent', '#4d8df0') },
        // §13.8: the service-gap threshold this headway is judged against, drawn.
        markLine: {
          silent: true,
          symbol: 'none' as const,
          lineStyle: { color: warn, type: 'dashed' as const, width: 1 },
          label: {
            formatter: t('uxreg.imp.threshold', { min: Math.round(thrMin) }),
            color: warn,
            fontSize: 10,
            position: 'insideEndTop' as const,
          },
          data: Number.isFinite(thrMin) ? [{ yAxis: +thrMin.toFixed(1) }] : [],
        },
        // Sample indices, not HH:MM labels: labels repeat within a minute and ECharts
        // resolves a repeated label to its first occurrence.
        markArea: {
          silent: true,
          data: [
            ...(win.start > 0
              ? [[{ xAxis: 0, label: phaseLabel('uxreg.imp.before'), itemStyle: { color: 'transparent' } }, { xAxis: win.start }]]
              : []),
            [
              {
                xAxis: win.start,
                label: phaseLabel('uxreg.imp.during'),
                // canvas cannot resolve color-mix(), so the alpha rides along as a hex suffix (0x1f ~ 12 %)
                itemStyle: { color: cssVar('--color-ev-high', '#e07b39') + '1f' },
              },
              { xAxis: win.end - 1 },
            ],
            ...(win.end < n
              ? [[{ xAxis: win.end - 1, label: phaseLabel('uxreg.imp.after'), itemStyle: { color: 'transparent' } }, { xAxis: n - 1 }]]
              : []),
          ],
        },
      },
    ],
  } as Record<string, unknown>;
  void theme; // colours above are re-read on every render, so a theme switch is picked up

  /*
   * Two different absences, and they were the same sentence before: an event with no
   * route will NEVER have this chart, while an event on a route whose ring has not
   * filled yet will have it in a few ticks.
   */
  if (!route) return <Empty title={t('an.impactNoRouteTitle')} text={t('an.impactNoRouteText')} />;
  if (real < 3) return <Empty title={t('an.impactWarmTitle')} text={t('an.impactWarmText', { route })} />;

  const f1 = (v: number | null) => (v === null ? EM_DASH : v.toFixed(1));
  const thr = Math.round(thrMin);
  const head =
    ins.ratio !== null
      ? t(ins.ratio >= 1 ? 'uxreg.imp.sumRose' : 'uxreg.imp.sumFell', {
          x: ins.ratio.toFixed(1),
          before: f1(ins.before),
          during: f1(ins.during),
        })
      : t('uxreg.imp.sumPeak', { peak: f1(ins.peak?.min ?? null), at: ins.peak ? hhmmss(ins.peak.t) : EM_DASH });
  const tail =
    ins.recovered === null
      ? t('uxreg.imp.sumOpen')
      : ins.recovered
        ? t('uxreg.imp.sumBack', { thr, min: Math.round(ins.recoveryMin ?? 0) })
        : t('uxreg.imp.sumNot', { thr });
  const pct = ins.ratio === null ? null : Math.round((ins.ratio - 1) * 100);
  const cards: { key: string; label: string; value: string; note?: string; tone?: string }[] = [
    { key: 'before', label: t('uxreg.imp.mean', { phase: t('uxreg.imp.before') }), value: `${f1(ins.before)} ${t('unit.min')}`, note: ins.before === null ? t('uxreg.imp.noBase') : undefined },
    { key: 'during', label: t('uxreg.imp.mean', { phase: t('uxreg.imp.during') }), value: `${f1(ins.during)} ${t('unit.min')}` },
    { key: 'after', label: t('uxreg.imp.mean', { phase: t('uxreg.imp.after') }), value: `${f1(ins.after)} ${t('unit.min')}`, note: ins.after === null ? t('uxreg.imp.recOpen') : undefined },
    { key: 'peak', label: t('uxreg.imp.peak'), value: `${f1(ins.peak?.min ?? null)} ${t('unit.min')}`, note: ins.peak ? t('uxreg.imp.peakAt', { at: hhmmss(ins.peak.t) }) : undefined, tone: ins.peak && ins.peak.min > thrMin ? 'var(--color-sev-crit)' : undefined },
    { key: 'change', label: t('uxreg.imp.change'), value: pct === null ? EM_DASH : `${pct > 0 ? '+' : ''}${pct}%`, note: ins.ratio === null ? t('uxreg.imp.noBase') : `${ins.ratio.toFixed(1)}×`, tone: pct !== null && pct > 0 ? 'var(--color-sev-warn)' : undefined },
    {
      key: 'recovery',
      label: t('uxreg.imp.recovery'),
      value: ins.recovered === null ? t('uxreg.imp.recOpen') : ins.recovered ? t('uxreg.imp.recAfter', { min: Math.round(ins.recoveryMin ?? 0) }) : t('uxreg.imp.recNotYet'),
      note: `< ${thr} ${t('unit.min')}`,
      tone: ins.recovered ? 'var(--color-sev-ok)' : ins.recovered === false ? 'var(--color-sev-crit)' : undefined,
    },
  ];
  return (
    <div className="flex h-full min-h-0 flex-col gap-2" data-impact-route={route}>
      {/* absolute fill: a %-height inside a flexed item does not resolve reliably, and
          the canvas then stopped short of the space the panel gives it */}
      <div className="relative min-h-[260px] flex-1">
        <EChart option={option} className="absolute inset-0" />
      </div>
      <p
        className="t-body shrink-0 border-l-2 border-[var(--color-accent)] pl-2 text-[var(--color-text1)]"
        data-impact-summary
      >
        {head}; {tail}.
      </p>
      <dl className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-3" data-impact-insights>
        {cards.map((c) => (
          <div key={c.key} data-impact-card={c.key} className="min-w-0 rounded border border-[var(--color-line)] px-2 py-1">
            <dt className="t-meta truncate uppercase tracking-wider">{c.label}</dt>
            <dd className="num t-body font-medium" style={c.tone ? { color: c.tone } : undefined}>
              {c.value}
              {c.note ? <span className="t-meta ml-1.5 font-normal">{c.note}</span> : null}
            </dd>
          </div>
        ))}
      </dl>
      {win.approx ? <p className="t-meta shrink-0">{t('uxreg.imp.approx')}</p> : null}
    </div>
  );
}

function DailyReport({ events, closed }: { events: readonly EmergencyEvent[]; closed: readonly EmergencyEvent[] }) {
  const t = useT();
  const tx = useTx();
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
      <Stat label={t('an.avgClose')} value={meanClose === null ? EM_DASH : `${meanClose.toFixed(1)} ${t('unit.min')}`} />
      <Stat label={t('an.byType')} value={[...byType].map(([k, n]) => `${tx(k)} ${n}`).join(' · ') || EM_DASH} />
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
