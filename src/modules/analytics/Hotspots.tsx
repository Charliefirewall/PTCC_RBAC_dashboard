/** Forward-looking road-segment analytics backed by the explicit synthetic demo baseline. */
import { useMemo, useState } from 'react';
import { useComms, useSelection, useSettings, useSim, world } from '../../store';
import { overlay } from '../../store/overlay';
import { can } from '../roles/roles';
import { baselineOf, bucketOf, bucketStartS, BUCKETS, liveSegExcess, SIM_DOW } from '../../sim/baseline';
import { hhmm } from '../../sim/engine';
import { segmentName } from '../../data/segments';
import { EChart, AXIS, CHART_BASE } from '../../charts/EChart';
import { Button, DataTable, Empty, Panel, StatusPill, type Column } from '../../components/primitives';
import { Select } from '../../components/kit';
import { useLang, useT } from '../../i18n/t';
import type { I18nKey } from '../../i18n/dict';
import {
  analyzeHotspots,
  draftFor,
  hotspotActionDecision,
  WINDOWS,
  type Hotspot,
  type HotspotActionDecision,
  type HotspotWindow,
} from './hotspotRank';

function cssVar(n: string, f: string): string {
  return typeof document === 'undefined' ? f : getComputedStyle(document.documentElement).getPropertyValue(n).trim() || f;
}

type Row = Hotspot & {
  rank: number;
  name: string;
  live: number | null;
  decision: HotspotActionDecision;
  recipient: 'tcc' | 'bus_operator';
};

const DAY_LONG_EN = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_LONG_MN = ['Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба', 'Ням'];

function evidenceFor(r: Row): string[] {
  return [
    `Synthetic ${r.baseline_weeks}-week baseline: delay frequency ${r.delay_frequency_pct.toFixed(1)}%`,
    `Recurrence ${r.recurrence_pct.toFixed(1)}%; contribution ${r.contribution_pct.toFixed(1)}%`,
    `Upcoming risk ${r.upcoming_risk.score}/100; probability ${r.upcoming_risk.probability_pct.toFixed(1)}%`,
    `Estimated affected services ${r.affected_buses_est} (${r.affected_buses_pct.toFixed(1)}%)`,
  ];
}

export default function Hotspots({ initialRoute, initialStart }: { initialRoute?: string | null; initialStart?: string | null }) {
  const t = useT();
  const lang = useLang();
  const dow = useSettings((s) => s.dow);
  const setDow = useSettings((s) => s.setDow);
  const theme = useSettings((s) => s.theme);
  const tick = useSim((s) => s.tick);
  const role = useSettings((s) => s.role);
  const activeRoutes = useMemo(() => world.routes.filter((r) => r.active), []);
  const validInitialRoute = initialRoute && activeRoutes.some((r) => r.route_id === initialRoute) ? initialRoute : '';
  const parsedStart = initialStart == null ? NaN : Number(initialStart);
  const [routeId, setRouteId] = useState(validInitialRoute);
  const [startBucket, setStartBucket] = useState(Number.isFinite(parsedStart) ? Math.max(0, Math.min(BUCKETS - 1, Math.trunc(parsedStart))) : bucketOf(world.sim_time_s));
  const [win, setWin] = useState<HotspotWindow>('am');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [drafted, setDrafted] = useState<ReadonlySet<string>>(new Set());
  const [escalated, setEscalated] = useState<ReadonlySet<string>>(new Set());
  const base = baselineOf(world);

  const analysis = useMemo(
    () => analyzeHotspots(base, activeRoutes, { dow, window: win, startBucket, routeId: routeId || undefined, n: 5 }),
    [base, activeRoutes, dow, win, startBucket, routeId],
  );
  const rows = useMemo<Row[]>(() => {
    const nowB = bucketOf(world.sim_time_s);
    return analysis.hotspots.map((h, i) => {
      const live = liveSegExcess(world, h.key, 1800);
      const normNow = base.segExcess(h.key, SIM_DOW, nowB).mean;
      const liveMean = live.n ? live.mean : null;
      const decision = hotspotActionDecision(h.key, win, liveMean === null ? null : liveMean - normNow);
      return { ...h, rank: i + 1, name: segmentName(h.key, lang), live: liveMean, decision, recipient: draftFor(decision.action).recipient };
    });
    // tick refreshes the live comparison while the historical ranking stays deterministic.
  }, [analysis, base, lang, win, tick]);
  const selected = rows.find((r) => r.key === selectedKey) ?? rows[0];

  const option = useMemo(() => ({
    ...CHART_BASE,
    grid: { ...CHART_BASE.grid, left: 54, right: 18, bottom: 42 },
    tooltip: {
      ...CHART_BASE.tooltip,
      formatter: (ps: { dataIndex: number }[]) => {
        const r = rows[ps[0]?.dataIndex ?? 0];
        if (!r) return '';
        return [
          `<b>#${r.rank} · ${r.name}</b>`,
          `${t('chart.axis.delayImpact')}: ${(r.impact_s / 60).toFixed(1)}`,
          `${t('hs.col.routes')}: ${r.routes.join(', ')}`,
          `${t('hs.col.frequency')}: ${r.delay_frequency_pct.toFixed(1)}%`,
          `${t('hs.col.contribution')}: ${r.contribution_pct.toFixed(1)}%`,
          `${t('hs.context', { route: routeId || t('hs.allRoutes'), day: lang === 'mn' ? DAY_LONG_MN[dow] : DAY_LONG_EN[dow], start: hhmm(bucketStartS(startBucket)) })}`,
          `${t('hs.assumptions')}: ${t(`hs.win.${win}` as I18nKey)}`,
        ].join('<br/>');
      },
    },
    xAxis: { ...AXIS, type: 'category', data: rows.map((r) => `#${r.rank}`), name: t('chart.axis.rank'), nameLocation: 'middle', nameGap: 25 },
    yAxis: { ...AXIS, type: 'value', name: t('chart.axis.delayImpact'), nameLocation: 'middle', nameGap: 42 },
    series: [{ id: 'hotspot-impact', name: t('chart.series.delayImpact'), type: 'bar', barWidth: '50%', itemStyle: { color: cssVar('--color-forecast', '#b48cf2') }, data: rows.map((r) => ({ value: +(r.impact_s / 60).toFixed(1), name: r.name })) }],
  }), [rows, theme, t, routeId, lang, dow, startBucket, win]);

  const draftId = (r: Row) => `${r.key}|${routeId}|${win}|${dow}|${startBucket}`;
  const contextFor = (r: Row) => ({
    route_id: routeId || undefined,
    segment_id: r.key,
    day: t(`dow.${dow}` as I18nKey),
    time_window: t(`hs.win.${win}` as I18nKey),
    start_time: hhmm(bucketStartS(startBucket)),
    expected_impact: `${r.upcoming_risk.expected_excess_s.toFixed(0)} s segment excess; ${r.affected_buses_est} estimated affected services`,
  });
  const reasonFor = (r: Row) => t('hs.reason', {
    segment: r.name,
    risk: r.upcoming_risk.score,
    frequency: r.delay_frequency_pct.toFixed(1),
    contribution: r.contribution_pct.toFixed(1),
  });
  const contentFor = (r: Row) => t('hs.draftMsg', {
    segment: r.name,
    window: t(`hs.win.${win}` as I18nKey),
    day: lang === 'mn' ? DAY_LONG_MN[dow] : DAY_LONG_EN[dow],
    route: routeId || t('hs.allRoutes'),
    start: hhmm(bucketStartS(startBucket)),
    action: t(r.decision.action),
    reason: reasonFor(r),
  });
  const draft = (r: Row) => {
    const msg = useComms.getState().draftProactiveCoordination({
      ...draftFor(r.decision.action), operator: role, channel: 'PTCC analytics', content: contentFor(r),
      reason: reasonFor(r), evidence: evidenceFor(r), recommended_action: t(r.decision.action), context: contextFor(r),
    });
    if (!msg) return;
    setDrafted((d) => new Set(d).add(draftId(r)));
    overlay.toast(t('hs.draftDone'), { tone: 'ok' });
  };
  const escalate = (r: Row) => {
    const msg = useComms.getState().requestAnalyticsEscalation({
      operator: role, content: contentFor(r), reason: reasonFor(r), evidence: evidenceFor(r),
      recommended_action: t(r.decision.action), context: contextFor(r),
    });
    if (!msg) return;
    setEscalated((d) => new Set(d).add(draftId(r)));
    overlay.toast(t('hs.escalateDone'), { tone: 'ok' });
  };

  const columns: Column<Row>[] = [
    { key: 'rank', label: t('hs.col.rank'), num: true },
    { key: 'name', label: t('hs.col.segment'), render: (r) => <span data-hotspot-row data-recipient={r.recipient}>{r.name}</span> },
    { key: 'routes', label: t('hs.col.routes'), mono: true, render: (r) => r.routes.slice(0, 4).join(', ') + (r.routes.length > 4 ? ` +${r.routes.length - 4}` : '') },
    { key: 'mean', label: t('hs.col.mean'), num: true, render: (r) => <span data-hotspot-mean>{r.mean.toFixed(1)}</span> },
    { key: 'affected', label: t('hs.col.affected'), num: true, render: (r) => <span data-hotspot-affected>{r.affected_buses_est} / {r.affected_buses_pct.toFixed(1)}%</span> },
    { key: 'frequency', label: t('hs.col.frequency'), num: true, render: (r) => <span data-hotspot-frequency>{r.delay_frequency_pct.toFixed(1)}%</span> },
    { key: 'recurrence', label: t('hs.col.recurrence'), num: true, render: (r) => <span data-hotspot-recurrence>{r.recurrence_pct.toFixed(1)}%</span> },
    { key: 'contribution', label: t('hs.col.contribution'), num: true, render: (r) => <span data-hotspot-contribution>{r.contribution_pct.toFixed(1)}%</span> },
    { key: 'risk', label: t('hs.col.risk'), render: (r) => <StatusPill tone={r.upcoming_risk.level === 'high' ? 'crit' : r.upcoming_risk.level === 'medium' ? 'warn' : 'ok'}>{r.upcoming_risk.score}/100 {t(`hs.risk.${r.upcoming_risk.level}` as I18nKey)}</StatusPill> },
    { key: 'action', label: t('hs.col.action'), render: (r) => t(r.decision.action) },
    { key: 'draft', label: t('hs.col.draft'), sortable: false, render: (r) => {
      const done = drafted.has(draftId(r));
      const allowed = can(role, 'send_coordination');
      return <span data-hotspot-draft><Button size="sm" disabled={!allowed || done} title={allowed ? undefined : t('hs.draftNoPerm')} onClick={() => draft(r)}>{t(done ? 'hs.drafted' : 'hs.draft')}</Button></span>;
    } },
  ];

  const showOnMap = () => {
    useSelection.getState().setSegments(rows.map((h) => h.key));
    location.hash = '#/map';
  };

  return (
    <div data-hotspots-root>
      <Panel titleKey="hs.title" sub={t('hs.sub')} right={<Button size="sm" onClick={showOnMap}>{t('hs.showMap')}</Button>} bodyClassName="flex flex-col gap-2 p-2">
        <div className="flex flex-wrap items-end gap-2">
          <div data-hotspot-route><Select label={t('rp.route')} value={routeId} onChange={setRouteId} options={[{ value: '', label: t('hs.allRoutes') }, ...activeRoutes.map((r) => ({ value: r.route_id, label: `${r.route_id} · ${lang === 'mn' ? r.name_mn : r.name_en}` }))]} /></div>
          <div data-hotspot-day><Select label={t('rp.dow')} value={String(dow)} onChange={(v) => setDow(+v)} options={[0, 1, 2, 3, 4, 5, 6].map((d) => ({ value: String(d), label: t(`dow.${d}` as I18nKey) }))} /></div>
          <div data-hotspot-start><Select label={t('rp.start')} value={String(startBucket)} onChange={(v) => setStartBucket(+v)} options={Array.from({ length: BUCKETS }, (_, b) => ({ value: String(b), label: hhmm(bucketStartS(b)) }))} /></div>
          <div data-hotspot-window><Select label={t('hs.window')} value={win} onChange={setWin} options={(Object.keys(WINDOWS) as HotspotWindow[]).map((w) => ({ value: w, label: t(`hs.win.${w}` as I18nKey) }))} /></div>
        </div>
        <p className="t-meta">{t('hs.context', { route: routeId || t('hs.allRoutes'), day: lang === 'mn' ? DAY_LONG_MN[dow] : DAY_LONG_EN[dow], start: hhmm(bucketStartS(startBucket)) })}</p>
        <div data-hotspots-table className="overflow-x-auto">
          <div className="min-w-[1180px]">
            <DataTable columns={columns} rows={rows} rowKey={(r) => r.key} onRowClick={(r) => setSelectedKey(r.key)} rowClass={(r) => r.key === selected?.key ? 'bg-[var(--color-bg2)]' : ''} compact empty={{ title: t('kit.empty.title'), text: t('hs.assumptions') }} />
          </div>
        </div>
        {selected ? (
          <section className="grid gap-2 rounded-md border border-[var(--color-line)] bg-[var(--color-bg2)] p-3 md:grid-cols-[1fr_auto]" aria-label={t('hs.detail.title')}>
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2"><strong className="t-card">{selected.name}</strong><StatusPill tone={selected.upcoming_risk.level === 'high' ? 'crit' : selected.upcoming_risk.level === 'medium' ? 'warn' : 'ok'}>{t('hs.riskScore', { score: selected.upcoming_risk.score })}</StatusPill></div>
              <p data-hotspot-risk className="t-body">{t('hs.riskDetail', { probability: selected.upcoming_risk.probability_pct.toFixed(1), excess: selected.upcoming_risk.expected_excess_s.toFixed(0), start: hhmm(bucketStartS(selected.upcoming_risk.start_bucket)) })}</p>
              <p data-hotspot-rationale className="t-body">{reasonFor(selected)}</p>
              <p data-hotspot-action className="t-body"><strong>{t('hs.col.action')}:</strong> {t(selected.decision.action)}</p>
              <p className="t-meta text-[var(--color-sev-warn)]">{t('hs.actionDisclaimer')}</p>
              <p className="t-meta">{t('hs.pattern', { days: selected.most_affected_days.map((d) => lang === 'mn' ? DAY_LONG_MN[d] : DAY_LONG_EN[d]).join(', '), windows: selected.most_affected_windows.map((w) => t(`hs.win.${w}` as I18nKey)).join(', '), persistence: selected.longest_persistent_buckets })}</p>
              <p className="t-meta">{t('hs.traceability')} {evidenceFor(selected).join(' · ')}</p>
              <p className="t-meta">{t('hs.trendUnavailable')}</p>
            </div>
            <div className="flex flex-col items-stretch justify-center gap-2">
              <Button size="sm" disabled={!can(role, 'send_coordination') || drafted.has(draftId(selected))} onClick={() => draft(selected)}>{t(drafted.has(draftId(selected)) ? 'hs.drafted' : 'hs.propose')}</Button>
              <span data-hotspot-escalate><Button size="sm" variant="danger" disabled={selected.upcoming_risk.level !== 'high' || !can(role, 'escalate_l3') || escalated.has(draftId(selected))} title={selected.upcoming_risk.level !== 'high' ? t('hs.escalateRiskOnly') : !can(role, 'escalate_l3') ? t('hs.escalateNoPerm') : undefined} onClick={() => escalate(selected)}>{t(escalated.has(draftId(selected)) ? 'hs.escalated' : 'hs.escalate')}</Button></span>
              <span className="t-meta max-w-48">{t('hs.escalateNote')}</span>
            </div>
          </section>
        ) : null}
        <p className="t-meta">{t('hs.assumptions')} {analysis.assumptions.join(' · ')}</p>
        {rows.length ? (
          <div style={{ height: 180 }}><EChart option={option} ariaLabel={`${t('hs.title')} · ${t('chart.axis.delayImpact')} · ${t('hs.context', { route: routeId || t('hs.allRoutes'), day: lang === 'mn' ? DAY_LONG_MN[dow] : DAY_LONG_EN[dow], start: hhmm(bucketStartS(startBucket)) })}`} /></div>
        ) : <div className="h-[180px]"><Empty title={t('kit.empty.title')} text={t('hs.assumptions')} /></div>}
      </Panel>
    </div>
  );
}
