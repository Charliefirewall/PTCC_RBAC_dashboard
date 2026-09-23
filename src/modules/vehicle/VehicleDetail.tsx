/**
 * Module 4 - Vehicle Detail. Layers 3-5 of the drill-down (L1188-L1199) and the
 * "four key questions" screen the client drew on S5.
 *
 * Two things here are load-bearing and easy to get wrong:
 *
 * 1. SOURCE SPLIT. AVL/GPS and APC/AFC reach PTCC through UB Card; telematics
 *    events (doors, driver state) come off the T-Box. That is a real constraint in
 *    the source, not a decoration, so the Operational Data table carries it per row.
 *    Getting it wrong would misrepresent what the client actually owns.
 *
 * 2. `speed` is INSTANTANEOUS (R1036). S5 shows 8 km/h and the room will read it as
 *    an average. The speed row carries veh.speedNote for exactly that reason.
 *
 * Identity comes from `world.vehicleById`; every live value is read from the current
 * `useSim().snap` so the screen moves with the simulation.
 */

import { useMemo, useState } from 'react';
import {
  Button,
  DrillBreadcrumb,
  Empty,
  EvidenceTag,
  Panel,
  SeverityChip,
  StatusPill,
  fmtInt,
  fmtMin,
} from '../../components/primitives';
import { NODES } from '../../data/corridors';
import type { I18nKey } from '../../i18n/dict';
import { useT, useTx } from '../../i18n/t';
import { bandOf } from '../../rules/thresholds';
import { haversine } from '../../sim/geo';
import { tripIdOf, type Vehicle } from '../../sim/types';
import { useAlerts, useEvents, useSelection, useSettings, useSim, world } from '../../store';
import { useForecast } from '../../store/forecast';
import { useHashQuery } from '../../app/App';
import { TripTab } from './TripTab';
import { LevelBadge } from '../alerts/sop';

type TabId = 'trip' | 'ops' | 'cctv' | 'incident';

/** Rows the incident tab will render before it stops and says how many it withheld. */
const MAX_ALERT_ROWS = 25;

const TABS: { id: TabId; key: I18nKey }[] = [
  // PTCC drill-down: the trip - driver, position, speed, every stop vs schedule and norm
  { id: 'trip', key: 'trip.tab' },
  { id: 'ops', key: 'veh.tabOps' },
  { id: 'cctv', key: 'veh.tabCctv' },
  { id: 'incident', key: 'veh.tabIncident' },
];

/** Table 9 (L1003-L1009) names the conditions that auto-open video. */
const TRIGGERS: { flag: keyof Vehicle['flags']; key: I18nKey }[] = [
  { flag: 'panic', key: 'alert.panic' },
  { flag: 'route_deviation', key: 'alert.route_deviation' },
  { flag: 'harsh_braking', key: 'alert.harsh_braking' },
  { flag: 'overspeed', key: 'alert.overspeed' },
  { flag: 'accident', key: 'alert.accident' },
];

/**
 * `fmtInt` / `fmtMin` in primitives print the literal "NaN" for a non-finite input and
 * belong to another workstream's file, so this page guards at the call site.
 *
 * The live case is not hypothetical: `loadPct` below divides by `capacity`, and a bus
 * recorded with capacity 0 makes that Infinity (or NaN, when pax_count is 0 too).
 */
const EM_DASH = '—';
function intOr(n: number): string {
  return Number.isFinite(n) ? fmtInt(n) : EM_DASH;
}
function minOr(n: number): string {
  return Number.isFinite(n) ? fmtMin(n) : EM_DASH;
}
function fixOr(n: number, d: number): string {
  return Number.isFinite(n) ? n.toFixed(d) : EM_DASH;
}
/** Occupancy as a percentage of capacity, or null when the bus has no usable capacity. */
function loadPctOf(v: Vehicle): number | null {
  return v.capacity > 0 && Number.isFinite(v.pax_count) ? (v.pax_count / v.capacity) * 100 : null;
}
/** Anything handed to t() as a parameter: nullish interpolates as the word "undefined". */
function paramOr(x: string | number | null | undefined): string | number {
  return x === null || x === undefined || x === '' ? EM_DASH : x;
}

/** Nearest corridor node - the demo's place names are the deck's own (S5, S9). */
function placeLabel(lon: number, lat: number, mn: boolean): string {
  let best = NODES[0]!;
  let bestD = Infinity;
  for (const n of NODES) {
    const d = haversine([lon, lat], [n.lon, n.lat]);
    if (d < bestD) (bestD = d), (best = n);
  }
  return mn ? best.name_mn : best.name_en;
}

export default function VehicleDetail({ vehicleId }: { vehicleId: string }) {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const th = useSettings((s) => s.th);
  const snap = useSim((s) => s.snap);
  const alerts = useAlerts((s) => s.alerts);
  const events = useEvents((s) => s.events);
  // Arriving from an alert (`?alert=`) opens the trip; otherwise the source-data tab as before.
  const query = useHashQuery();
  const fromAlert = query.get('alert');
  const fromForecast = query.get('forecast');
  const forecastH = Number(query.get('h'));
  const fromMap = query.get('from') === 'map';
  // Map drill-down lands on the operational trip context promised by the hover
  // card; direct/deep links retain the established source-data landing tab.
  const [tab, setTab] = useState<TabId>(fromAlert || fromForecast || fromMap ? 'trip' : 'ops');
  const forecasts = useForecast((s) => s.byHorizon);
  const sourceForecast = fromForecast
    ? ([15, 30, 45, 60] as const).flatMap((h) => forecasts[h]).find((f) => f.id === fromForecast) ?? null
    : null;

  const identity = world.vehicleById.get(vehicleId);
  // Live values come from the snapshot, never from the world object, so the card
  // updates every tick rather than freezing on whatever the world held at mount.
  const v = useMemo(
    () => snap?.vehicles.find((x) => x.vehicle_id === vehicleId) ?? identity ?? null,
    [snap, vehicleId, identity],
  );

  const myAlerts = useMemo(() => alerts.filter((a) => a.vehicle_id === vehicleId), [alerts, vehicleId]);
  const myEvents = useMemo(() => events.filter((e) => e.bus_number === vehicleId), [events, vehicleId]);
  // Highest-impact alert answers "what is happening" - the feed is already sorted by it.
  // Arriving from a route-level alert (`?alert=delay_sop:R7`) the vehicle has none of its
  // own, so the alert that brought us here answers it first.
  const lead = (fromAlert ? alerts.find((a) => a.id === fromAlert) : undefined) ?? myAlerts[0] ?? null;

  /*
   * A bus that has left service, or an id typed into the hash that never existed.
   * `vehicleId` can also arrive empty from a malformed hash, and t() would then
   * interpolate the empty string into "Unknown vehicle .".
   */
  if (!identity || !v) {
    return (
      <div className="flex h-full flex-col gap-2 p-2">
        <DrillBreadcrumb path={[{ key: 'drill.network' }, { key: 'drill.vehicle', label: vehicleId || EM_DASH }]} />
        <Empty
          title={vehicleId ? t('veh.unknown', { id: vehicleId }) : t('veh.noneSelected')}
          text={t('veh.unknownText')}
        />
      </div>
    );
  }

  const route = world.routeById.get(v.route_id);
  const place = placeLabel(v.longitude, v.latitude, lang === 'mn');
  const nextStop = route?.stops.find((s) => s.stop_id === v.next_stop_id);
  const loadPct = loadPctOf(v);
  const band = bandOf(loadPct ?? 0);
  const statusKey: I18nKey =
    v.status === 'in_service' ? 'veh.inService' : v.status === 'breakdown' ? 'veh.breakdown' : 'veh.outOfService';

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 p-2">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <DrillBreadcrumb
          path={[
            { key: 'drill.network', onClick: () => { location.hash = fromMap ? '#/map' : '#/command'; } },
            { key: 'drill.route', label: v.route_id, onClick: () => { location.hash = '#/regularity'; } },
            { key: 'drill.vehicle', label: v.vehicle_id },
            { key: 'drill.detail' },
          ]}
        />
        <EvidenceTag label="CONFIRMED" cite="S5 · Table 8" />
      </div>

      {fromAlert || sourceForecast ? (
        <div
          className={`flex shrink-0 flex-wrap items-center gap-2 rounded border-l-4 bg-[var(--color-bg2)] px-3 py-2 ${sourceForecast ? 'border-l-[var(--color-forecast)]' : 'border-l-[var(--color-sev-warn)]'}`}
          data-vehicle-source-context={sourceForecast ? 'forecast' : 'alert'}
        >
          <StatusPill tone={sourceForecast ? 'neutral' : 'warn'}>{sourceForecast ? t('fc.tag') : t('uxveh.actualAlert')}</StatusPill>
          <span className="t-body min-w-0 flex-1">
            {sourceForecast
              ? t('uxveh.openedFromForecast', { horizon: sourceForecast.horizon_min, chance: Math.round(sourceForecast.probability * 100) })
              : t('uxveh.openedFromAlert', { id: fromAlert ?? EM_DASH })}
          </span>
          <Button
            size="sm"
            onClick={() => {
              if (sourceForecast) location.hash = `#/forecast?h=${Number.isFinite(forecastH) ? forecastH : sourceForecast.horizon_min}&id=${encodeURIComponent(sourceForecast.id)}`;
              else if (fromAlert) { useSelection.getState().selectAlert(fromAlert); location.hash = '#/alerts'; }
            }}
          >
            {t('uxveh.returnSource')} →
          </Button>
        </div>
      ) : null}

      {/* ---- S5 header strip: the vehicle card facts + the four key questions, one row */}
      <div className="grid shrink-0 grid-cols-1 gap-2 md:grid-cols-3 xl:grid-cols-5">
        <section className="panel flex min-w-0 flex-col gap-1 px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <span className="panel-title truncate">{t('veh.bus', { id: v.vehicle_id })}</span>
            <StatusPill tone={v.status === 'in_service' ? 'ok' : v.status === 'breakdown' ? 'crit' : 'neutral'}>
              {t(statusKey)}
            </StatusPill>
          </div>
          <dl className="t-body flex flex-col gap-0.5">
            <Field label={t('map.popTrip')}>
              <span className="num">{tripIdOf(v)}</span>
            </Field>
            <Field label={t('map.popProgress')}>
              <span className="num">{intOr(v.trip_progress * 100)} % · {v.route_id}</span>
            </Field>
            <Field label={t('veh.delay')}>
              <span className="num" style={{ color: devColor(v.schedule_deviation, th.schedule_deviation_s) }}>
                {minOr(v.schedule_deviation)} {t('unit.min')}
              </span>
            </Field>
            <Field label={t('veh.occupancy')}>
              <span className="num" style={{ color: band.color }}>
                {loadPct === null ? EM_DASH : `${t(band.key)} (${intOr(loadPct)} %)`}
              </span>
            </Field>
          </dl>
        </section>

        <QBox titleKey="q.what">
          {lead ? (
            <div className="flex min-w-0 flex-col gap-1">
              <span className="flex flex-wrap items-center gap-1">
                {lead.level ? <LevelBadge level={lead.level} /> : null}
                <SeverityChip severity={lead.severity} size="sm" />
              </span>
              <span className="text-[var(--color-text1)]">{t(lead.title_key as I18nKey, lead.params)}</span>
              {lead.vehicle_id !== vehicleId && lead.route_id ? (
                <span className="t-meta">{t('uxveh.routeAlert', { route: lead.route_id })}</span>
              ) : null}
            </div>
          ) : sourceForecast ? (
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-[var(--color-forecast)]">{t('fc.tag')} · +{sourceForecast.horizon_min} {t('unit.min')}</span>
              <span className="text-[var(--color-text1)]">{t(sourceForecast.title_key as I18nKey, sourceForecast.params)}</span>
              <span className="t-meta">{t('uxveh.forecastNotActual')}</span>
            </div>
          ) : (
            <span>{t('veh.noAlert')}</span>
          )}
        </QBox>

        <QBox titleKey="q.where">
          <div className="flex flex-col gap-1">
            {/* A long place name must wrap inside the box, not widen it. */}
            <span className="break-words text-[var(--color-text1)]">{place}</span>
            <span className="num">
              {t('veh.nextStop')}: {fixOr(v.distance_to_next_stop_m / 1000, 1)} {t('unit.km')}
              {nextStop ? ` · ${lang === 'mn' ? nextStop.name_mn : nextStop.name_en}` : ''}
            </span>
          </div>
        </QBox>

        <QBox titleKey="q.why">
          {/* The breaching source row IS the explanation - no AI involved (Tier 1). */}
          <div className="flex flex-col gap-1">
            <span className="num text-[var(--color-text1)]">
              {t('veh.speed')} {intOr(v.speed)} {t('unit.kmh')} · {minOr(v.schedule_deviation)} {t('unit.min')}
            </span>
            {lead ? (
              <span className="num">
                {t('alerts.threshold', {
                  rule: paramOr(lead.rule_id),
                  value: paramOr(lead.metric.value),
                  threshold: paramOr(lead.metric.threshold),
                  unit: paramOr(lead.metric.unit),
                })}
              </span>
            ) : sourceForecast?.terms ? (
              <span className="num text-[var(--color-forecast)]">
                {t('forecast.liveVsNormal')}: {minOr(sourceForecast.terms.drift_s)} {t('unit.min')} · {t('forecast.confidence')}: {Math.round(sourceForecast.confidence * 100)}%
              </span>
            ) : null}
          </div>
        </QBox>

        <QBox titleKey="q.response">
          <div className="flex flex-col items-start gap-1">
            <Button size="sm" onClick={() => {
              if (sourceForecast) location.hash = `#/forecast?h=${sourceForecast.horizon_min}&id=${encodeURIComponent(sourceForecast.id)}`;
              else if (lead) { useSelection.getState().selectAlert(lead.id); location.hash = '#/alerts'; }
              else location.hash = '#/alerts';
            }}>
              {sourceForecast ? t('uxveh.reviewPreparation') : t('veh.playbook')} →
            </Button>
            {sourceForecast ? <span className="t-meta">{t('uxveh.forecastResponseNote')}</span> : null}
            <a className="t-meta text-[var(--color-accent)] hover:underline" href={`#/analytics?tab=route&route=${encodeURIComponent(v.route_id)}`}>
              {t('forecast.openHistorical')} →
            </a>
          </div>
        </QBox>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {/* ------------------------------------------------------------- three tabs */}
        <section className="panel flex min-h-0 flex-1 flex-col">
          {/* flex-wrap, not overflow: at a narrow width the third tab drops to a
              second row instead of running off the edge of the panel. */}
          <div role="tablist" className="flex shrink-0 flex-wrap gap-1 border-b border-[var(--color-line)] px-2">
            {TABS.map((tb) => (
              <button
                key={tb.id}
                role="tab"
                type="button"
                aria-selected={tab === tb.id}
                onClick={() => setTab(tb.id)}
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
          <div className="flex min-h-0 flex-1 flex-col overflow-auto p-3">
            {tab === 'trip' ? <TripTab v={v} fromAlert={fromAlert} /> : null}
            {tab === 'ops' ? <OpsTab v={v} /> : null}
            {tab === 'cctv' ? <CctvTab v={v} place={place} /> : null}
            {tab === 'incident' ? (
              <IncidentTab alerts={myAlerts} events={myEvents} />
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Layer 4: ops data

function OpsTab({ v }: { v: Vehicle }) {
  const t = useT();
  const loadPct = loadPctOf(v);

  // Source per FIELD, as S5's table is laid out. AVL/GPS and APC/AFC arrive via UB
  // Card; door and driver state are T-Box telematics. This split is the constraint,
  // not a label.
  const rows: { key: I18nKey; value: string; source: 'UB Card' | 'T-Box'; note?: string }[] = [
    { key: 'veh.time', value: v.timestamp.slice(11, 19), source: 'UB Card' },
    { key: 'veh.speed', value: `${intOr(v.speed)} ${t('unit.kmh')}`, source: 'UB Card', note: t('veh.speedNote') },
    { key: 'veh.scheduleDeviation', value: `${minOr(v.schedule_deviation)} ${t('unit.min')}`, source: 'UB Card' },
    // A bus with capacity 0 printed "12 / 0 (Infinity %)". It now prints the counts it
    // really has and an em dash where the percentage cannot exist.
    { key: 'veh.passengerLoad', value: `${intOr(v.pax_count)} / ${intOr(v.capacity)} (${loadPct === null ? EM_DASH : `${intOr(loadPct)} %`})`, source: 'UB Card' },
    { key: 'veh.doorStatus', value: v.door_status === 'normal' ? t('veh.normal') : 'fault', source: 'T-Box' },
    { key: 'veh.driverStatus', value: v.driver_status === 'normal' ? t('veh.normal') : 'alert', source: 'T-Box' },
  ];

  // Table 8 field names, verbatim (R1031-R1043). Raw, untranslated, on purpose:
  // the room needs to see that the screen is the ICD and not a re-invention of it.
  const icd: [string, string | number][] = [
    ['vehicle_id', v.vehicle_id],
    ['timestamp', v.timestamp],
    ['latitude', fixOr(v.latitude, 5)],
    ['longitude', fixOr(v.longitude, 5)],
    ['speed', fixOr(v.speed, 1)],
    ['route_id', v.route_id],
    ['schedule_deviation', v.schedule_deviation],
    ['pax_count', v.pax_count],
  ];

  return (
    <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
      <div className="flex min-w-0 flex-col gap-3">
      <table className="t-body w-full">
        <thead>
          <tr className="t-meta text-left uppercase tracking-wider">
            <th className="py-1 pr-3 font-medium">{t('veh.colField')}</th>
            <th className="py-1 pr-3 font-medium">{t('veh.colValue')}</th>
            <th className="py-1 font-medium">{t('veh.source')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-t border-[var(--color-line)] align-top">
              <td className="py-1 pr-3 text-[var(--color-text2)]">
                {t(r.key)}
                {r.note ? (
                  <sup className="ml-0.5" style={{ color: 'var(--color-sev-warn)' }}>
                    *
                  </sup>
                ) : null}
              </td>
              <td className="num break-words py-1 pr-3 text-[var(--color-text1)]">{r.value}</td>
              <td className="py-1">
                <StatusPill tone={r.source === 'T-Box' ? 'info' : 'neutral'}>{r.source}</StatusPill>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* R1036: `speed` is instantaneous, not an average - the room will read it as
          one. The star is coloured inline because .t-meta sets a colour of its own
          and would otherwise win over a utility class. */}
      <p className="t-meta leading-snug">
        <span style={{ color: 'var(--color-sev-warn)' }}>*</span> {t('veh.speedNote')}
      </p>
      </div>

      {/* Same collapsible surface as every other panel in the app, instead of a
          hand-rolled <details>. Collapsed it still names the vehicle it belongs to. */}
      <Panel collapsible defaultOpen title={t('veh.rawIcd')} summary={v.vehicle_id} bodyClassName="px-3 py-2">
        <dl className="t-meta grid grid-cols-2 gap-x-4 gap-y-2">
          {icd.map(([k, val]) => (
            <div key={k} className="flex flex-col">
              <dt className="num text-[var(--color-text3)]">{k}</dt>
              <dd className="num text-[var(--color-text1)]">{String(val)}</dd>
            </div>
          ))}
        </dl>
      </Panel>
    </div>
  );
}

// ---------------------------------------------------------------- Layer 5: CCTV

function CctvTab({ v, place }: { v: Vehicle; place: string }) {
  const t = useT();
  const tx = useTx();
  // The form only re-captions the placeholder. There is no footage: pretending to
  // retrieve any would be the one thing in this demo that is a lie.
  const [bus, setBus] = useState(v.vehicle_id);
  const [ts, setTs] = useState(v.timestamp);
  const [caption, setCaption] = useState(`${place} / ${v.timestamp}`);
  const recaption = () => setCaption(`${place} / ${ts}`);

  const fired = TRIGGERS.filter((tr) => v.flags[tr.flag]);

  // A field surface, not the frame surface: in light theme bg0 is near-white, so an
  // input on bg0 inside a bg0 frame has no visible edge at all.
  const inputCls =
    'num rounded border border-[var(--color-line)] bg-[var(--color-bg3)] px-2 py-1 text-[var(--color-text1)]';

  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(260px,2fr)]">
      {/*
       * Four stacked layers in one aspect-video box. Each takes its z-index from the
       * token scale (never a raw z-* utility), and the two corner captions are
       * width-capped so a long place/timestamp cannot slide under the centred badge.
       */}
      <div className="relative flex aspect-video max-h-[60vh] w-full items-center justify-center overflow-hidden rounded border border-[var(--color-line)] bg-[var(--color-bg0)]">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            zIndex: 'var(--z-base)',
            backgroundImage:
              'repeating-linear-gradient(135deg, var(--color-bg2) 0 12px, var(--color-bg1) 12px 24px)',
          }}
        />
        <span
          className="t-body relative rounded border border-[var(--color-sev-warn)] px-3 py-1 font-semibold uppercase tracking-widest text-[var(--color-sev-warn)]"
          style={{ zIndex: 'var(--z-raised)' }}
        >
          {t('veh.simulatedStill')}
        </span>
        {/* Tailwind cannot apply an opacity modifier to a var() colour, so the old
            80% modifier on bg0 rendered no background at all. color-mix does. */}
        <span
          className="num t-body absolute bottom-2 left-2 max-w-[60%] truncate rounded px-2 py-0.5 text-[var(--color-text1)]"
          style={{
            zIndex: 'var(--z-raised)',
            background: 'color-mix(in srgb, var(--color-bg0) 80%, transparent)',
          }}
        >
          {caption}
        </span>
        <span
          className="num t-body absolute right-2 top-2 max-w-[35%] truncate rounded px-2 py-0.5 text-[var(--color-text2)]"
          style={{
            zIndex: 'var(--z-raised)',
            background: 'color-mix(in srgb, var(--color-bg0) 80%, transparent)',
          }}
        >
          {t('veh.bus', { id: bus })}
        </span>
      </div>

      <div className="flex min-w-0 flex-col gap-3">
      <form
        className="t-body flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          recaption();
        }}
      >
        <label className="flex flex-col gap-1">
          <span className="num text-[var(--color-text3)]">{tx('vehicle_id')}</span>
          <input value={bus} onChange={(e) => setBus(e.target.value)} className={`w-28 ${inputCls}`} />
        </label>
        <label className="flex min-w-0 flex-col gap-1">
          <span className="text-[var(--color-text3)]">{t('veh.timestamp')}</span>
          <input value={ts} onChange={(e) => setTs(e.target.value)} className={`w-full sm:w-60 ${inputCls}`} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[var(--color-text3)]">{t('reg.route')}</span>
          <input readOnly value={v.route_id} className={`w-20 ${inputCls} text-[var(--color-text2)]`} />
        </label>
        {/* Button renders type="button", so the click path calls recaption() itself;
            the form's onSubmit still covers Enter pressed inside an input. */}
        <Button variant="primary" size="sm" onClick={recaption}>
          {t('veh.retrieve')}
        </Button>
        <EvidenceTag label="ASSUMPTION" cite="no footage source" className="ml-auto" />
      </form>

      <div className="t-meta flex flex-wrap items-center gap-2">
        <span>{t('veh.trigger')}:</span>
        {fired.length === 0 ? (
          <span>{t('veh.noTrigger')}</span>
        ) : (
          fired.map((tr) => (
            <StatusPill key={tr.flag} tone="crit">
              {t(tr.key, { bus: v.vehicle_id })}
            </StatusPill>
          ))
        )}
      </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- incident info

function IncidentTab({
  alerts,
  events,
}: {
  alerts: ReturnType<typeof useAlerts.getState>['alerts'];
  events: ReturnType<typeof useEvents.getState>['events'];
}) {
  const t = useT();
  /*
   * Good news, and rendered as good news (tone="ok"): a bus with nothing against it
   * is a result, not a hole in the screen.
   */
  if (alerts.length === 0 && events.length === 0)
    return <Empty title={t('veh.noIncidents')} text={t('veh.noIncidentsText')} tone="ok" />;
  // A bus that has been raising alerts all morning must not render a thousand rows
  // into a panel nobody can scroll to the end of.
  const shownAlerts = alerts.slice(0, MAX_ALERT_ROWS);
  // Headed, never merged: the three-level ALERT scale (L1182-L1185) and the
  // five-level EVENT scale (R1433-R1440) stay visibly separate groups.
  return (
    <div className={`t-body grid grid-cols-1 items-start gap-4 ${alerts.length > 0 && events.length > 0 ? 'xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]' : ''}`}>
      {alerts.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h3 className="panel-title">{t('alerts.tabAlerts')}</h3>
          {shownAlerts.map((a) => (
            <div key={a.id} className="flex flex-col gap-1 border-b border-[var(--color-line)] pb-2">
              <div className="flex items-center gap-2">
                <SeverityChip severity={a.severity} size="sm" />
                <span className="text-[var(--color-text1)]">{t(a.title_key as I18nKey, a.params)}</span>
                <span className="num ml-auto text-[var(--color-text3)]">{a.raised_at.slice(11, 19)}</span>
              </div>
              <span className="num t-meta">
                {t('alerts.threshold', {
                  rule: paramOr(a.rule_id),
                  value: paramOr(a.metric.value),
                  threshold: paramOr(a.metric.threshold),
                  unit: paramOr(a.metric.unit),
                })}
              </span>
            </div>
          ))}
          {alerts.length > shownAlerts.length ? (
            <span className="t-meta">{t('veh.moreAlerts', { n: alerts.length - shownAlerts.length })}</span>
          ) : null}
        </section>
      ) : null}
      {events.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h3 className="panel-title">{t('alerts.tabEvents')}</h3>
          {events.map((e) => (
            <div key={e.event_id} className="flex min-w-0 items-center gap-2">
              <span className="num shrink-0 text-[var(--color-accent)]">{e.event_id}</span>
              <span className="min-w-0 break-words text-[var(--color-text1)]">{e.event_type}</span>
              <StatusPill tone="info">{t(`ev.stage.${e.stage}` as I18nKey)}</StatusPill>
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------- small pieces

function QBox({ titleKey, children }: { titleKey: I18nKey; children: React.ReactNode }) {
  const t = useT();
  return (
    <div className="panel flex flex-col gap-1 px-3 py-2">
      <span className="panel-title">{t(titleKey)}</span>
      <div className="t-body text-[var(--color-text2)]">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-[var(--color-text3)]">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function devColor(dev_s: number, threshold_s: number): string {
  const a = Math.abs(dev_s);
  if (a > threshold_s * 3) return 'var(--color-sev-crit)';
  if (a > threshold_s) return 'var(--color-sev-warn)';
  return 'var(--color-sev-ok)';
}
