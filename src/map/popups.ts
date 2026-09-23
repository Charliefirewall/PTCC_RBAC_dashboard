/**
 * Map popups with actions (plan 11.5 step 2, backlog item 11).
 *
 * Clicking a bus used to set `location.hash` immediately, which destroyed the GL
 * context and the operator's camera position to show a detail page they may not
 * have wanted. The popup is the missing rung of the drill-down chain the brief
 * asks for — map → asset → event → prediction — and it keeps the map alive while
 * the operator decides which way to go.
 *
 * Built as DOM rather than an HTML string because the three action buttons need
 * real listeners, and because `Popup.setHTML` would make every label an XSS
 * surface the moment a route name came from a feed instead of our own generator.
 *
 * Styling lives in `chrome.css` and is entirely `var(--color-*)`: a popup is DOM,
 * not GL, so unlike the layer paint it follows a theme swap with no JS at all.
 */
import maplibregl from 'maplibre-gl';
import { useAlerts, useSelection, useSettings, world } from '../store';
import { useForecast } from '../store/forecast';
import { overlay } from '../store/overlay';
import { LOAD_BANDS, bandOf } from '../rules/thresholds';
import { devTier } from './risk';
import { fmtInt, fmtMin } from '../components/primitives';
import type { I18nKey } from '../i18n/dict';
import { tripIdOf, type Lang, type Route, type Vehicle } from '../sim/types';

export interface PopupCtx {
  t: (key: I18nKey, params?: Record<string, string | number>) => string;
  lang: Lang;
}

const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls?: string,
  text?: string,
): HTMLElementTagNameMap[K] => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};

/** The value span rides on the row so `tick()` below can rewrite one text node
 *  rather than rebuilding the popup (which would drop keyboard focus from an
 *  action button under the operator's fingers). */
type Row = HTMLDivElement & { v: HTMLSpanElement };

function row(label: string, value: string, color?: string): Row {
  const r = el('div', 'ptcc-pop-row') as Row;
  r.append(el('span', 'ptcc-pop-k', label));
  const v = el('span', 'ptcc-pop-v', value);
  if (color) v.style.color = color;
  r.append(v);
  r.v = v;
  return r;
}

const setRow = (r: Row, value: string, color?: string) => {
  if (r.v.textContent !== value) r.v.textContent = value;
  const c = color ?? '';
  if (r.v.style.color !== c) r.v.style.color = c;
};

/**
 * A popup whose subject keeps moving. The rAF loop in LiveMap already runs at
 * ~18 Hz over `world.vehicles`; it calls `ptccTick` from there, so the popup
 * stays glued to its dot and its figures stay live without a second timer and
 * without any of it passing through React state.
 */
export type LivePopup = maplibregl.Popup & { ptccTick?: () => void };

export interface VehiclePopupOptions {
  /** Hover cards do not select a vehicle and stay open while the pointer is over them. */
  hover?: boolean;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
}

function actions(
  specs: { label: string; run: () => void }[],
  onDone: () => void,
): HTMLDivElement {
  const box = el('div', 'ptcc-pop-actions');
  for (const s of specs) {
    const b = el('button', 'ptcc-pop-btn', s.label);
    b.type = 'button';
    b.addEventListener('click', () => {
      s.run();
      onDone();
    });
    box.append(b);
  }
  return box;
}

const routeName = (route_id: string, lang: Lang): string => {
  const r = world.routeById.get(route_id);
  if (!r) return route_id;
  return `${route_id} · ${lang === 'mn' ? r.name_mn : r.name_en}`;
};

const stopName = (r: Route, idx: number, lang: Lang) => {
  const s = r.stops[idx];
  return s ? (lang === 'mn' ? s.name_mn : s.name_en) : '—';
};

/** Direction-aware termini. This uses the vehicle's real route/direction relationship;
 * no location or assignment is invented for the hover card. */
export function routeDirection(v: Vehicle, lang: Lang): string {
  const r = world.routeById.get(v.route_id);
  if (!r || r.stops.length === 0) return '—';
  const first = v.direction === 0 ? 0 : r.stops.length - 1;
  const last = v.direction === 0 ? r.stops.length - 1 : 0;
  return `${stopName(r, first, lang)} → ${stopName(r, last, lang)}`;
}

/** Distance reads in metres up to a kilometre, then in km — a "1,240 m" next
 *  stop is harder to judge at a glance than "1.2 km". */
/** The three-state ladder's colours, indexed by `devTier`. */
const DEV_TONE = [
  'var(--color-map-normal)',
  'var(--color-map-slower)',
  'var(--color-map-disrupted)',
] as const;

const dist = (m: number): string => (m < 1000 ? `${fmtInt(m)} m` : `${(m / 1000).toFixed(1)} km`);

/**
 * The vehicle popup — the one that matters. Every field the plan lists, then the
 * three actions that leave the map for the right place.
 */
export function vehiclePopup(
  map: maplibregl.Map,
  vehicle_id: string,
  ctx: PopupCtx,
  options: VehiclePopupOptions = {},
): LivePopup | null {
  // The sim mutates Vehicle objects in place (see sim/engine.ts), which is what
  // lets the rAF loop read `world.vehicles` every frame — so this reference stays
  // live and `tick()` below has nothing to look up.
  const v = world.vehicleById.get(vehicle_id);
  if (!v) return null;
  const { t, lang } = ctx;

  const body = el('div', 'ptcc-pop');
  body.dataset.vehicleId = v.vehicle_id;
  if (options.hover) body.dataset.vehicleHover = '';
  if (options.onPointerEnter) body.addEventListener('pointerenter', options.onPointerEnter);
  if (options.onPointerLeave) body.addEventListener('pointerleave', options.onPointerLeave);
  body.append(el('div', 'ptcc-pop-id', v.vehicle_id));
  body.append(el('div', 'ptcc-pop-sub', routeName(v.route_id, lang)));
  body.append(el('div', 'ptcc-pop-direction', routeDirection(v, lang)));

  const rows = el('div', 'ptcc-pop-rows');
  const tripRow = row(t('map.popTrip'), '');
  const crewRow = row(t('map.popCrew'), '');
  const devRow = row(t('veh.scheduleDeviation'), '');
  const loadRow = row(t('veh.passengerLoad'), '');
  const stopRow = row(t('veh.nextStop'), '');
  const statusRow = row(t('veh.status'), '');
  const alertRow = row(t('map.popAlert'), '');
  const forecastRow = row(t('map.popForecast'), '');
  rows.append(tripRow, crewRow, devRow, loadRow, stopRow, statusRow, alertRow, forecastRow);
  body.append(rows);

  /** Every live figure in one place, so the initial paint and `tick()` cannot
   *  drift apart. Re-reads the thresholds too: they are operator-adjustable. */
  const paint = () => {
    const th = useSettings.getState().th;

    setRow(tripRow, `${tripIdOf(v)} · ${Math.round(v.trip_progress * 100)}%`);
    setRow(crewRow, `${t('op.operator')} ${v.operator_id} · ${v.driver_id || '—'}`);

    // Schedule deviation, on the one three-state ladder (map/risk.ts devTier).
    setRow(
      devRow,
      `${fmtMin(v.schedule_deviation)} ${t('map.popMin')}`,
      DEV_TONE[devTier(v.schedule_deviation, th.schedule_deviation_s)],
    );

    // Load band — the S8 heat-map bands, the only threshold set in any source.
    const pct = (v.pax_count / v.capacity) * 100;
    const band = bandOf(pct);
    setRow(
      loadRow,
      `${Math.round(pct)}% · ${t(band.key as I18nKey)}`,
      LOAD_BANDS.find((b) => b.key === band.key)?.color,
    );

    const stop = v.next_stop_id
      ? world.routeById.get(v.route_id)?.stops.find((s) => s.stop_id === v.next_stop_id)
      : undefined;
    setRow(
      stopRow,
      stop ? `${lang === 'mn' ? stop.name_mn : stop.name_en} · ${dist(v.distance_to_next_stop_m)}` : '—',
    );

    setRow(
      statusRow,
      t(
        v.status === 'in_service'
          ? 'veh.inService'
          : v.status === 'breakdown'
            ? 'veh.breakdown'
            : 'veh.outOfService',
      ),
      v.status === 'in_service' ? undefined : 'var(--color-sev-crit)',
    );

    const lead = useAlerts.getState().alerts.find((a) => a.vehicle_id === v.vehicle_id);
    setRow(
      alertRow,
      lead ? t(`sev.${lead.severity}` as I18nKey) : t('map.popNone'),
      lead?.severity === 'critical'
        ? 'var(--color-sev-crit)'
        : lead?.severity === 'warning'
          ? 'var(--color-sev-warn)'
          : undefined,
    );

    const forecasts = Object.values(useForecast.getState().byHorizon)
      .flat()
      .filter((f) => f.route_id === v.route_id)
      .sort((a, b) => a.horizon_min - b.horizon_min || b.probability - a.probability);
    const forecast = forecasts[0];
    setRow(
      forecastRow,
      forecast
        ? `+${forecast.horizon_min} ${t('map.popMin')} · ${Math.round(forecast.probability * 100)}% · ${Math.round(forecast.confidence * 100)}% ${t('map.popConfidence')}`
        : t('map.popNone'),
      forecast ? 'var(--color-forecast)' : undefined,
    );
  };
  paint();

  // Lead alert: `alerts` is already sorted by impact_score, so the first hit is
  // the one the operator would have been shown in the priority list.
  // CEILING: a snapshot — an alert that opens or clears while the popup is up is
  // not reflected. The four rows above are what the operator reads for movement.
  const lead = useAlerts.getState().alerts.find((a) => a.vehicle_id === v.vehicle_id);
  if (lead) {
    const box = el('div', 'ptcc-pop-alert');
    box.style.setProperty(
      '--pop-sev',
      lead.severity === 'critical'
        ? 'var(--color-sev-crit)'
        : lead.severity === 'warning'
          ? 'var(--color-sev-warn)'
          : 'var(--color-sev-info)',
    );
    box.append(el('span', 'ptcc-pop-dot'));
    box.append(el('span', undefined, t(lead.title_key as I18nKey, lead.params)));
    body.append(box);
  }

  const popup: LivePopup = new maplibregl.Popup({
    closeButton: !options.hover,
    closeOnClick: !options.hover,
    maxWidth: '22rem',
    offset: 10,
    className: options.hover ? 'ptcc-popup ptcc-hover-popup' : 'ptcc-popup',
  });

  body.append(
    actions(
      [
        {
          label: t('map.actOpenDetail'),
          run: () => {
            useSelection.getState().selectVehicle(v.vehicle_id);
            location.hash = `#/vehicle/${v.vehicle_id}?from=map&trip=${encodeURIComponent(tripIdOf(v))}`;
          },
        },
        {
          label: t('map.actShowRoute'),
          run: () => {
            useSelection.getState().selectRoute(v.route_id);
            location.hash = '#/regularity';
          },
        },
        {
          // CEILING: the Validate form itself is module-private to Alerts.tsx
          // (`openValidate`, not exported), so this hands off by selecting the
          // lead alert and navigating rather than duplicating the form. When
          // Alerts exports its validate opener, call it here instead.
          label: t('map.actRaiseEvent'),
          run: () => {
            useSelection.getState().selectVehicle(v.vehicle_id);
            if (lead) useSelection.getState().selectAlert(lead.id);
            location.hash = '#/alerts';
            overlay.toast(t(lead ? 'map.raiseHandoff' : 'map.raiseNoAlert'), {
              tone: lead ? 'warn' : 'info',
            });
          },
        },
      ],
      () => popup.remove(),
    ),
  );

  // K4: the bus does not stop moving because a popup is open. The caller drives
  // this from the existing ~18 Hz rAF loop; `setLngLat` is a transform on the
  // popup's own DOM node, and `paint()` only writes text that actually changed.
  popup.ptccTick = () => {
    popup.setLngLat([v.longitude, v.latitude]);
    paint();
  };

  return popup.setLngLat([v.longitude, v.latitude]).setDOMContent(body).addTo(map) as LivePopup;
}

export function stopPopup(
  map: maplibregl.Map,
  lngLat: maplibregl.LngLatLike,
  stop_id: string,
  route_id: string,
  ctx: PopupCtx,
): maplibregl.Popup | null {
  const r = world.routeById.get(route_id);
  const s = r?.stops.find((x) => x.stop_id === stop_id);
  if (!s) return null;
  const { t, lang } = ctx;
  const body = el('div', 'ptcc-pop');
  body.append(el('div', 'ptcc-pop-id', lang === 'mn' ? s.name_mn : s.name_en));
  body.append(el('div', 'ptcc-pop-sub', routeName(route_id, lang)));
  const rows = el('div', 'ptcc-pop-rows');
  rows.append(row(t('map.popStopId'), s.stop_id));
  rows.append(row(t('map.popAlongRoute'), dist(s.dist_m)));
  body.append(rows);
  const popup = new maplibregl.Popup({
    closeButton: true,
    closeOnClick: true,
    maxWidth: '18rem',
    offset: 8,
    className: 'ptcc-popup',
  });
  body.append(
    actions(
      [
        {
          label: t('map.actShowRoute'),
          run: () => {
            useSelection.getState().selectRoute(route_id);
            location.hash = '#/regularity';
          },
        },
      ],
      () => popup.remove(),
    ),
  );
  return popup.setLngLat(lngLat).setDOMContent(body).addTo(map);
}

export function routePopup(
  map: maplibregl.Map,
  lngLat: maplibregl.LngLatLike,
  route_id: string,
  ctx: PopupCtx,
): maplibregl.Popup | null {
  const r = world.routeById.get(route_id);
  if (!r) return null;
  const { t, lang } = ctx;
  const body = el('div', 'ptcc-pop');
  body.append(el('div', 'ptcc-pop-id', route_id));
  body.append(el('div', 'ptcc-pop-sub', lang === 'mn' ? r.name_mn : r.name_en));
  const rows = el('div', 'ptcc-pop-rows');
  rows.append(row(t('op.operator'), r.operator_id));
  rows.append(row(t('map.popStops'), fmtInt(r.stops.length)));
  rows.append(row(t('map.popLength'), dist(r.length_m)));
  body.append(rows);
  const popup = new maplibregl.Popup({
    closeButton: true,
    closeOnClick: true,
    maxWidth: '18rem',
    offset: 8,
    className: 'ptcc-popup',
  });
  body.append(
    actions(
      [
        {
          label: t('map.actShowRoute'),
          run: () => {
            useSelection.getState().selectRoute(route_id);
            location.hash = '#/regularity';
          },
        },
      ],
      () => popup.remove(),
    ),
  );
  return popup.setLngLat(lngLat).setDOMContent(body).addTo(map);
}
