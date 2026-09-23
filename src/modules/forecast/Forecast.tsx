/**
 * Dedicated short-term forecast workspace.
 *
 * Forecasts deliberately stay outside the live-alert store: they cannot be acknowledged,
 * validated, or executed. The recommendation is a read-only preview of the existing SOP
 * playbook and is labelled as such; an operator must wait for/validate an actual alert.
 */
import { useEffect, useMemo, useState } from 'react';
import { useHashQuery } from '../../app/App';
import { Button, Empty, EvidenceTag, Panel, SeverityChip, StatusPill } from '../../components/primitives';
import { segmentName } from '../../data/segments';
import type { I18nKey } from '../../i18n/dict';
import { useLang, useT } from '../../i18n/t';
import { HORIZONS, type ForecastAlert, type Horizon } from '../../rules/forecast';
import { PLAYBOOKS, playbookFor } from '../../rules/playbooks';
import { baselineOf, bucketOf } from '../../sim/baseline';
import { hhmm } from '../../sim/engine';
import { useSettings, useSim, world } from '../../store';
import { useForecast } from '../../store/forecast';
import { HorizonMatrix, openHowItWorks, ScorecardPanel, WatchList } from '../alerts/ForecastParts';
import { LevelBadge } from '../alerts/sop';

const pct = (v: number) => `${Math.round(v * 100)}%`;
const mins = (v: number) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(1)} min`;

export default function Forecast() {
  const t = useT();
  const query = useHashQuery();
  const requestedH = Number(query.get('h'));
  const initialH: Horizon = HORIZONS.includes(requestedH as Horizon) ? requestedH as Horizon : 15;
  const [h, setH] = useState<Horizon>(initialH);
  const [mode, setMode] = useState<'list' | 'matrix'>('list');
  const rows = useForecast((s) => s.byHorizon[h]);
  const [selectedId, setSelectedId] = useState<string | null>(query.get('id'));
  const selected = rows.find((a) => a.id === selectedId) ?? null;
  const pMin = useSettings((s) => s.th.forecast_min_probability_pct);
  const dow = useSettings((s) => s.dow);

  useEffect(() => {
    if (selectedId && !rows.some((a) => a.id === selectedId)) setSelectedId(null);
  }, [rows, selectedId]);

  const selectForecast = (id: string | null) => {
    setSelectedId(id);
    location.hash = id ? `#/forecast?h=${h}&id=${encodeURIComponent(id)}` : `#/forecast?h=${h}`;
  };

  return (
    <div className="flex min-h-full flex-col gap-2" data-forecast-module="">
      <div className="panel flex shrink-0 flex-wrap items-center gap-3 border-l-4 border-l-[var(--color-forecast)] px-3 py-2">
        <div>
          <div className="panel-title text-[var(--color-forecast)]">{t('forecast.workspace')}</div>
          <div className="t-meta">{t('forecast.workspaceSub')}</div>
        </div>
        <div role="radiogroup" aria-label={t('fc.horizon')} className="flex overflow-hidden rounded border border-[var(--color-line)]">
          {HORIZONS.map((x) => (
            <button
              key={x}
              type="button"
              role="radio"
              aria-checked={h === x}
              data-horizon={x}
              onClick={() => { setH(x); setSelectedId(null); location.hash = `#/forecast?h=${x}`; }}
              className={`num px-3 py-1.5 text-[11px] font-semibold ${h === x ? 'bg-[var(--color-forecast)] text-[var(--color-on-accent)]' : 'text-[var(--color-text2)] hover:bg-[var(--color-bg2)]'}`}
            >
              +{x === 60 ? '1 hour' : `${x} min`}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={() => setMode((v) => (v === 'list' ? 'matrix' : 'list'))}>
          {mode === 'list' ? t('fc.view.matrix') : t('fc.view.list')}
        </Button>
        <span className="t-meta">{t('fc.minChance', { p: pMin, dow: t(`dow.${dow}` as I18nKey) })}</span>
        <span className="ml-auto flex items-center gap-2">
          <EvidenceTag label="INFERRED" cite="R1096" />
          <StatusPill tone="neutral">{t('fc.tag')}</StatusPill>
        </span>
      </div>

      <div className={`grid min-h-0 flex-1 gap-2 ${selected ? 'xl:grid-cols-[minmax(0,1.15fr)_minmax(330px,.85fr)]' : ''}`}>
        <Panel titleKey="fc.title.panel" bodyClassName="p-0" className="min-h-[18rem]">
          {mode === 'matrix' ? (
            <div className="overflow-auto p-2"><HorizonMatrix /></div>
          ) : rows.length === 0 ? (
            <>
              <Empty tone="ok" title={t('fc.none', { h })} text={t('fc.noneHint')} />
              <WatchList h={h} />
            </>
          ) : (
            <ul data-forecast-list="" className="divide-y divide-[var(--color-line)]">
              {rows.map((a, index) => (
                <ForecastRow key={a.id} a={a} rank={index + 1} selected={a.id === selectedId} onOpen={() => selectForecast(a.id)} />
              ))}
            </ul>
          )}
        </Panel>
        {selected ? <ForecastDetail a={selected} onClose={() => selectForecast(null)} /> : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <a href="#/analytics?tab=route" className="rounded border border-[var(--color-line)] px-3 py-1.5 text-[11px] font-semibold hover:bg-[var(--color-bg2)]">
          {t('forecast.routeAnalytics')} →
        </a>
        <a href="#/analytics?tab=hotspots" className="rounded border border-[var(--color-line)] px-3 py-1.5 text-[11px] font-semibold hover:bg-[var(--color-bg2)]">
          {t('forecast.hotspots')} →
        </a>
      </div>
      <ScorecardPanel />
    </div>
  );
}

function preparationKey(level: 1 | 2 | 3): I18nKey {
  return level === 3 ? 'forecast.state.escalationPreview' : level === 2 ? 'forecast.state.prepareProposal' : 'forecast.state.monitor';
}

function ForecastRow({ a, rank, selected, onOpen }: { a: ForecastAlert; rank: number; selected: boolean; onOpen: () => void }) {
  const t = useT();
  const bus = typeof a.params.bus === 'string' ? a.params.bus : '';
  return (
    <li className={`border-l-4 border-l-[var(--color-forecast)] p-3 ${selected ? 'bg-[var(--color-bg2)]' : ''}`} data-forecast-row="">
      <div className="flex flex-wrap items-start gap-2">
        <span className="num t-meta mt-0.5">#{rank}</span>
        <LevelBadge level={a.level} forecast />
        <SeverityChip severity={a.severity} size="sm" />
        <div className="min-w-[14rem] flex-1">
          <div className="text-[12px] font-semibold">{t(a.title_key as I18nKey, a.params)}</div>
          <div className="num mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[var(--color-text2)]">
            <span className="font-semibold text-[var(--color-forecast)]">{pct(a.probability)} {t('forecast.chance')}</span>
            <span>{t('forecast.confidence')}: {pct(a.confidence)}</span>
            <span>{t('forecast.expected')}: {mins(a.metric.value)}</span>
            <span>{t('forecast.impact')}: {a.pax_affected.toLocaleString()} {t('forecast.passengers')}</span>
            {bus ? <span>{t('forecast.leadVehicle')}: {bus}</span> : null}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <StatusPill tone={a.level === 3 ? 'warn' : a.level === 2 ? 'info' : 'neutral'}>{t(preparationKey(a.level))}</StatusPill>
            <span className="t-meta">{t('forecast.whyRanked', { rank, chance: pct(a.probability), impact: a.pax_affected.toLocaleString(), deviation: mins(a.metric.value) })}</span>
          </div>
        </div>
        <button type="button" onClick={() => openHowItWorks(a, t('fc.how.title'))} className="rounded border border-[var(--color-line)] px-2 py-1 text-[11px] hover:bg-[var(--color-bg3)]">
          {t('fc.how.button')}
        </button>
        <Button size="sm" variant="primary" onClick={onOpen}>{t('fc.drill')}</Button>
      </div>
    </li>
  );
}

function ForecastDetail({ a, onClose }: { a: ForecastAlert; onClose: () => void }) {
  const t = useT();
  const lang = useLang();
  // Subscribe to the tick because `world` is intentionally mutable and supplies the
  // current position/speed/load side of this otherwise predictive view.
  useSim((s) => s.tick);
  const route = a.route_id ? world.routeById.get(a.route_id) : undefined;
  const affected = useMemo(
    () => world.vehicles.filter((v) => v.status === 'in_service' && (!a.route_id || v.route_id === a.route_id)).sort((x, y) => y.schedule_deviation - x.schedule_deviation),
    [a.route_id, world.sim_time_s],
  );
  const pb = PLAYBOOKS[playbookFor(a.rule_id, a.level)];
  const seg = useMemo(() => {
    if (!route?.edges?.length) return null;
    const base = baselineOf(world);
    const b = bucketOf(world.sim_time_s + a.horizon_min * 60);
    return [...route.edges].sort((x, y) => base.segExcess(y.key, useSettings.getState().dow, b).mean - base.segExcess(x.key, useSettings.getState().dow, b).mean)[0]?.key ?? null;
  }, [route, a.horizon_min]);
  const start = route?.stops[0];
  const end = route?.stops.at(-1);
  const routeName = route ? (lang === 'mn' ? route.name_mn : route.name_en) : String(a.params.routes || t('fc.matrix.network'));

  return (
    <Panel
      title={t('forecast.detailTitle')}
      className="min-h-0"
      right={<Button size="sm" onClick={onClose}>{t('forecast.close')}</Button>}
      bodyClassName="flex flex-col gap-3 p-3"
    >
      <div className="rounded border border-dashed border-[var(--color-forecast)] bg-[color-mix(in_srgb,var(--color-forecast)_8%,transparent)] p-2">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill tone="neutral">{t('fc.tag')}</StatusPill>
          <LevelBadge level={a.level} forecast />
          <span className="num font-semibold text-[var(--color-forecast)]">{pct(a.probability)} {t('forecast.chance')}</span>
          <StatusPill tone={a.level === 3 ? 'warn' : a.level === 2 ? 'info' : 'neutral'}>{t(preparationKey(a.level))}</StatusPill>
        </div>
        <p className="t-meta mt-1">{t('forecast.notActual')}</p>
      </div>

      <Section title={t('forecast.route')}>
        <Fact label={t('forecast.route')} value={route ? `${route.route_id} · ${routeName}` : routeName} />
        {start && end ? <Fact label={t('forecast.direction')} value={`${lang === 'mn' ? start.name_mn : start.name_en} → ${lang === 'mn' ? end.name_mn : end.name_en}`} /> : null}
        <Fact label={t('forecast.segment')} value={seg ? segmentName(seg, lang) : t('forecast.notAvailable')} />
      </Section>

      <Section title={t('forecast.outlook')}>
        <Fact label={t('fc.horizon')} value={`+${a.horizon_min} min · ${hhmm(world.sim_time_s + a.horizon_min * 60)}`} />
        <Fact label={t('forecast.expected')} value={mins(a.metric.value)} />
        <Fact label={t('forecast.confidence')} value={pct(a.confidence)} />
        <Fact label={t('forecast.duration')} value={t('forecast.notEstimated')} />
        <Fact label={t('forecast.impact')} value={`${a.pax_affected.toLocaleString()} ${t('forecast.passengers')} · ${a.routes_affected ?? 1} ${t('forecast.routes')}`} />
      </Section>

      <Section title={t('forecast.vehicles')}>
        <p className="t-meta mb-2">{t('forecast.vehicleLimit')}</p>
        {affected.length ? (
          <div className="overflow-auto">
            <table className="w-full text-left text-[11px]">
              <thead className="text-[var(--color-text3)]"><tr><th>{t('forecast.vehicle')}</th><th>{t('forecast.speed')}</th><th>{t('forecast.currentDev')}</th><th>{t('forecast.load')}</th><th>{t('forecast.progress')}</th></tr></thead>
              <tbody>
                {affected.slice(0, 6).map((v) => (
                  <tr key={v.vehicle_id} className="border-t border-[var(--color-line)]">
                    <td className="py-1"><a className="font-semibold text-[var(--color-accent)]" href={`#/vehicle/${v.vehicle_id}?forecast=${encodeURIComponent(a.id)}&h=${a.horizon_min}`}>{v.vehicle_id} ↗</a></td>
                    <td className="num">{v.speed.toFixed(0)} km/h</td>
                    <td className="num">{mins(v.schedule_deviation / 60)}</td>
                    <td className="num">{Math.round(v.pax_count / Math.max(1, v.capacity) * 100)}%</td>
                    <td className="num">{Math.round(v.trip_progress * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {affected.length > 6 ? <p className="t-meta mt-1">{t('forecast.moreVehicles', { n: affected.length - 6 })}</p> : null}
          </div>
        ) : <p className="t-meta">{t('forecast.noVehicle')}</p>}
      </Section>

      <Section title={t('forecast.evidence')}>
        {a.terms ? (
          <div className="num grid grid-cols-2 gap-2 text-[11px]">
            <Fact label={t('forecast.normalAtTime')} value={mins(a.terms.norm_h_s / 60)} />
            <Fact label={t('forecast.liveVsNormal')} value={mins(a.terms.drift_s / 60)} />
            <Fact label={t('forecast.recentTrend')} value={a.terms.slope_s_per_min === null ? t('forecast.notAvailable') : `${a.terms.slope_s_per_min >= 0 ? '+' : ''}${a.terms.slope_s_per_min.toFixed(1)} s/min`} />
            <Fact label={t('forecast.modelConfidence')} value={pct(a.confidence)} />
          </div>
        ) : <p className="t-meta">{t('forecast.networkEvidence')}</p>}
        {a.route_id ? <a href={`#/analytics?tab=route&route=${encodeURIComponent(a.route_id)}`} className="mt-2 inline-block text-[11px] font-semibold text-[var(--color-accent)]">{t('forecast.openHistorical')} →</a> : null}
      </Section>

      <Section title={t('forecast.verifyTitle')}>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded border-l-2 border-l-[var(--color-sev-warn)] bg-[var(--color-bg2)] p-2">
            <div className="panel-title">{t('forecast.confirmTitle')}</div>
            <p className="t-meta mt-1">{t('forecast.confirmText', { threshold: `${a.metric.threshold} ${a.metric.unit}`, horizon: a.horizon_min })}</p>
          </div>
          <div className="rounded border-l-2 border-l-[var(--color-sev-ok)] bg-[var(--color-bg2)] p-2">
            <div className="panel-title">{t('forecast.clearTitle')}</div>
            <p className="t-meta mt-1">{t('forecast.clearText')}</p>
          </div>
        </div>
      </Section>

      <Section title={t('forecast.recommendation')}>
        <div className="flex items-center gap-2"><EvidenceTag label="ASSUMPTION" cite="PTCC SOP ladder" /><span className="t-meta">{t('forecast.sopPreview')}</span></div>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-[11px]">
          {[...pb.recommended, ...pb.compulsory].map((k) => <li key={k}>{t(k as I18nKey)}</li>)}
        </ul>
        <p className="t-meta mt-2">{a.level === 3 ? t('forecast.escalationPreview') : a.level === 2 ? t('forecast.proposedOnly') : t('forecast.monitorOnly')}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <a href="#/alerts" className="rounded border border-[var(--color-line)] px-2 py-1 text-[11px] font-semibold hover:bg-[var(--color-bg3)]">{t('forecast.checkActualAlerts')} →</a>
          {a.route_id ? <a href={`#/analytics?tab=hotspots&route=${encodeURIComponent(a.route_id)}`} className="rounded border border-[var(--color-line)] px-2 py-1 text-[11px] font-semibold hover:bg-[var(--color-bg3)]">{t('forecast.openRiskSegments')} →</a> : null}
        </div>
      </Section>
    </Panel>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h2 className="panel-title mb-1">{title}</h2><div className="rounded border border-[var(--color-line)] p-2">{children}</div></section>;
}

function Fact({ label, value }: { label: string; value: string }) {
  return <div className="flex min-w-0 justify-between gap-3 text-[11px]"><span className="text-[var(--color-text3)]">{label}</span><span className="min-w-0 text-right font-medium text-[var(--color-text1)]">{value}</span></div>;
}
