/**
 * Connected previews for production-dependent capabilities.
 *
 * These are deliberately field-complete shells, not fake operational records. Every
 * empty value says which feed/model must supply it and every action links to an existing
 * workspace, so the page demonstrates the intended experience without dead controls.
 */
import { useState } from 'react';
import { Callout, DataTable, EvidenceTag, Panel, PanelLink, StatusPill, Stepper, type Column } from '../../components/primitives';
import { useT } from '../../i18n/t';
import type { I18nKey } from '../../i18n/dict';
import { useAccessibleTabs } from '../../components/AccessibleTabs';

type PreviewId = 'history' | 'forecast' | 'analytics' | 'traffic' | 'monitor' | 'sources';

const PREVIEWS: { id: PreviewId; key: I18nKey }[] = [
  { id: 'history', key: 'preview.tab.history' },
  { id: 'forecast', key: 'preview.tab.forecast' },
  { id: 'analytics', key: 'preview.tab.analytics' },
  { id: 'traffic', key: 'preview.tab.traffic' },
  { id: 'monitor', key: 'preview.tab.monitor' },
  { id: 'sources', key: 'preview.tab.sources' },
];

type SourceRow = { id: string; source: I18nKey; enables: I18nKey; state: I18nKey; owner: I18nKey };
const SOURCES: SourceRow[] = [
  { id: 'avl', source: 'preview.source.avl', enables: 'preview.source.avlEnables', state: 'preview.state.awaiting', owner: 'preview.owner.operator' },
  { id: 'timetable', source: 'preview.source.timetable', enables: 'preview.source.timetableEnables', state: 'preview.state.awaiting', owner: 'preview.owner.ptcc' },
  { id: 'afc', source: 'preview.source.afc', enables: 'preview.source.afcEnables', state: 'preview.state.awaiting', owner: 'preview.owner.operator' },
  { id: 'crew', source: 'preview.source.crew', enables: 'preview.source.crewEnables', state: 'preview.state.awaiting', owner: 'preview.owner.operator' },
  { id: 'tcc', source: 'preview.source.tcc', enables: 'preview.source.tccEnables', state: 'preview.state.manual', owner: 'preview.owner.tcc' },
  { id: 'conditions', source: 'preview.source.conditions', enables: 'preview.source.conditionsEnables', state: 'preview.state.awaiting', owner: 'preview.owner.city' },
];

export default function CapabilityPreviews() {
  const t = useT();
  const [active, setActive] = useState<PreviewId>('history');
  const tabs = useAccessibleTabs(PREVIEWS.map((preview) => preview.id), active, setActive, 'capability-preview');
  const sourceCols: Column<SourceRow>[] = [
    { key: 'source', label: t('preview.col.source'), render: (r) => <span className="font-medium text-[var(--color-text1)]">{t(r.source)}</span> },
    { key: 'enables', label: t('preview.col.enables'), render: (r) => t(r.enables) },
    { key: 'owner', label: t('preview.col.owner'), render: (r) => t(r.owner) },
    { key: 'state', label: t('preview.col.state'), render: (r) => <StatusPill tone={r.id === 'tcc' ? 'warn' : 'neutral'}>{t(r.state)}</StatusPill> },
  ];

  return (
    <div data-capability-previews className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto">
      <Callout kind="info" title={t('preview.title')} icon={<EvidenceTag label="FUTURE" cite="Production dependencies" />}>
        <p className="t-body text-[var(--color-text2)]">{t('preview.lede')}</p>
        <p className="t-meta mt-1">{t('preview.guardrail')}</p>
      </Callout>

      <div role="tablist" aria-label={t('preview.title')} className="flex shrink-0 gap-1 overflow-x-auto rounded-md border border-[var(--color-line)] bg-[var(--color-bg1)] p-1">
        {PREVIEWS.map((p) => (
          <button
            key={p.id}
            type="button"
            {...tabs.getTabProps(p.id)}
            data-preview-tab={p.id}
            onClick={() => setActive(p.id)}
            className={`shrink-0 rounded px-3 py-1.5 text-[11px] font-semibold ${active === p.id ? 'bg-[var(--color-bg3)] text-[var(--color-accent)]' : 'text-[var(--color-text2)] hover:bg-[var(--color-bg2)]'}`}
          >
            {t(p.key)}
          </button>
        ))}
      </div>

      <div {...tabs.getPanelProps(active)} className="min-h-0 focus:outline-none">
      {active === 'history' ? <HistoryPreview /> : null}
      {active === 'forecast' ? <ForecastPreview /> : null}
      {active === 'analytics' ? <AnalyticsPreview /> : null}
      {active === 'traffic' ? <TrafficPreview /> : null}
      {active === 'monitor' ? <MonitorPreview /> : null}
      {active === 'sources' ? (
        <Panel titleKey="preview.sources.title" sub={t('preview.sources.sub')} right={<EvidenceTag label="FUTURE" />} bodyClassName="p-2" foot={<><span>{t('preview.noConnection')}</span><PanelLink href="#/platform">{t('preview.openPlatform')}</PanelLink></>}>
          <DataTable columns={sourceCols} rows={SOURCES} rowKey={(r) => r.id} compact accessibleName={t('preview.sources.title')} minWidth={640} />
        </Panel>
      ) : null}
      </div>
    </div>
  );
}

function HistoryPreview() {
  const t = useT();
  return (
    <Panel titleKey="preview.history.title" sub={t('preview.history.sub')} right={<FutureState />} bodyClassName="p-3" foot={<><span>{t('preview.dep.archive')}</span><PanelLink href="#/alerts?view=historical">{t('preview.openAlerts')}</PanelLink></>}>
      <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <PreviewField label={t('preview.field.range')} value={t('preview.value.dateRange')} />
        <PreviewField label={t('preview.field.vehicle')} value={t('preview.value.search')} />
        <PreviewField label={t('preview.field.retention')} value={t('preview.value.retention')} />
        <PreviewField label={t('preview.field.coverage')} value={t('preview.value.awaiting')} />
      </div>
      <div className="overflow-hidden rounded border border-[var(--color-line)]">
        <div className="grid grid-cols-[1.1fr_.8fr_.7fr_1fr] gap-2 bg-[var(--color-bg2)] px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text3)]">
          <span>{t('preview.history.timestamp')}</span><span>{t('preview.history.vehicle')}</span><span>{t('preview.history.route')}</span><span>{t('preview.history.snapshot')}</span>
        </div>
        <EmptyPreview text={t('preview.history.empty')} />
      </div>
    </Panel>
  );
}

function ForecastPreview() {
  const t = useT();
  return (
    <Panel titleKey="preview.forecast.title" sub={t('preview.forecast.sub')} right={<FutureState />} bodyClassName="grid gap-2 p-3 lg:grid-cols-[1.05fr_.95fr]" foot={<><span>{t('preview.dep.model')}</span><PanelLink href="#/forecast">{t('preview.openForecast')}</PanelLink></>}>
      <div className="rounded border border-dashed border-[var(--color-forecast)] p-3">
        <div className="mb-3 flex flex-wrap items-center gap-2"><StatusPill>{t('preview.sample')}</StatusPill><span className="t-card text-[var(--color-forecast)]">{t('preview.forecast.card')}</span></div>
        <div className="grid grid-cols-2 gap-2">
          <PreviewField label={t('preview.forecast.duration')} value={t('preview.value.calibration')} />
          <PreviewField label={t('preview.forecast.vehicleRisk')} value={t('preview.value.vehicleModel')} />
          <PreviewField label={t('preview.forecast.conditions')} value={t('preview.value.conditions')} />
          <PreviewField label={t('preview.forecast.validation')} value={t('preview.value.backtest')} />
        </div>
      </div>
      <div className="rounded border border-[var(--color-line)] bg-[var(--color-bg2)] p-3">
        <div className="t-label mb-3">{t('preview.forecast.timeline')}</div>
        <Stepper steps={[
          { label: t('preview.forecast.now'), state: 'done' },
          { label: t('preview.forecast.onset'), state: 'active' },
          { label: t('preview.forecast.peak'), state: 'pending' },
          { label: t('preview.forecast.recovery'), state: 'pending' },
        ]} />
        <p className="t-meta mt-3">{t('preview.forecast.timelineNote')}</p>
      </div>
    </Panel>
  );
}

function AnalyticsPreview() {
  const t = useT();
  return (
    <Panel titleKey="preview.analytics.title" sub={t('preview.analytics.sub')} right={<FutureState />} bodyClassName="grid gap-2 p-3 lg:grid-cols-[1.2fr_.8fr]" foot={<><span>{t('preview.dep.avl')}</span><PanelLink href="#/analytics?tab=hotspots">{t('preview.openHotspots')}</PanelLink></>}>
      <div className="relative min-h-48 overflow-hidden rounded border border-[var(--color-line)] bg-[var(--color-bg2)] p-3">
        <div className="t-label">{t('preview.analytics.chart')}</div>
        <div className="mt-4 flex h-28 items-end gap-2 border-b border-l border-[var(--color-line)] px-3">
          {[28, 44, 35, 62, 48, 74, 58, 81].map((h, i) => <span key={i} className="flex-1 rounded-t bg-[var(--color-forecast)] opacity-25" style={{ height: `${h}%` }} />)}
        </div>
        <div className="absolute inset-0 flex items-center justify-center"><StatusPill>{t('preview.analytics.overlay')}</StatusPill></div>
      </div>
      <div className="space-y-2">
        <PreviewField label={t('preview.analytics.trend')} value={t('preview.value.awaiting')} />
        <PreviewField label={t('preview.analytics.observedBuses')} value={t('preview.value.avl')} />
        <PreviewField label={t('preview.analytics.seasonality')} value={t('preview.value.seasonality')} />
        <PreviewField label={t('preview.analytics.export')} value={t('preview.value.archive')} />
      </div>
    </Panel>
  );
}

function TrafficPreview() {
  const t = useT();
  return (
    <Panel titleKey="preview.traffic.title" sub={t('preview.traffic.sub')} right={<FutureState />} bodyClassName="grid gap-3 p-3 lg:grid-cols-[1fr_.9fr]" foot={<><span>{t('preview.dep.tcc')}</span><PanelLink href="#/comms">{t('preview.openComms')}</PanelLink></>}>
      <div>
        <div className="t-label mb-3">{t('preview.traffic.workflow')}</div>
        <Stepper steps={[
          { label: t('preview.traffic.draft'), state: 'done' },
          { label: t('preview.traffic.review'), state: 'active' },
          { label: t('preview.traffic.delivery'), state: 'pending' },
          { label: t('preview.traffic.ack'), state: 'pending' },
        ]} />
        <p className="t-meta mt-3">{t('preview.traffic.manual')}</p>
      </div>
      <div className="rounded border border-[var(--color-line)] bg-[var(--color-bg2)] p-3">
        <div className="mb-2 flex items-center justify-between gap-2"><span className="t-card">{t('preview.traffic.receipt')}</span><StatusPill tone="warn">{t('preview.state.notConnected')}</StatusPill></div>
        <PreviewField label={t('preview.traffic.reference')} value="—" />
        <div className="mt-2"><PreviewField label={t('preview.traffic.accepted')} value="—" /></div>
        <div className="mt-2"><PreviewField label={t('preview.traffic.response')} value="—" /></div>
      </div>
    </Panel>
  );
}

function MonitorPreview() {
  const t = useT();
  return (
    <Panel titleKey="preview.monitor.title" sub={t('preview.monitor.sub')} right={<FutureState />} bodyClassName="grid gap-3 p-3 lg:grid-cols-[1fr_.9fr]" foot={<><span>{t('preview.dep.execution')}</span><PanelLink href="#/agentic">{t('preview.openAgentic')}</PanelLink></>}>
      <div>
        <div className="t-label mb-3">{t('preview.monitor.lifecycle')}</div>
        <Stepper steps={[
          { label: t('preview.monitor.baseline'), state: 'done' },
          { label: t('preview.monitor.execute'), state: 'active' },
          { label: t('preview.monitor.observe'), state: 'pending' },
          { label: t('preview.monitor.outcome'), state: 'pending' },
        ]} />
        <p className="t-meta mt-3">{t('preview.monitor.note')}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <PreviewField label={t('preview.monitor.actionId')} value={t('preview.value.execution')} />
        <PreviewField label={t('preview.monitor.owner')} value={t('preview.value.execution')} />
        <PreviewField label={t('preview.monitor.window')} value={t('preview.value.outcomeWindow')} />
        <PreviewField label={t('preview.monitor.effect')} value={t('preview.value.causal')} />
      </div>
    </Panel>
  );
}

function FutureState() {
  const t = useT();
  return <span className="flex items-center gap-2"><EvidenceTag label="FUTURE" /><StatusPill>{t('evidence.FUTURE')} · {t('preview.layoutOnly')}</StatusPill></span>;
}

function PreviewField({ label, value }: { label: string; value: string }) {
  return <div className="rounded border border-[var(--color-line)] bg-[var(--color-bg1)] px-2 py-1.5"><div className="t-label">{label}</div><div className="t-body mt-0.5 text-[var(--color-text2)]">{value}</div></div>;
}

function EmptyPreview({ text }: { text: string }) {
  return <div className="flex min-h-28 items-center justify-center p-4 text-center"><div><EvidenceTag label="FUTURE" /><p className="t-meta mt-2 max-w-lg">{text}</p></div></div>;
}
