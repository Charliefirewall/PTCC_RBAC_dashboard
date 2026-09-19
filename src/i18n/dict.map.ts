/**
 * Bilingual strings owned by the "map" workstream.
 *
 * Split out of dict.ts so parallel work on different areas cannot clobber a shared
 * file. Merged into the main dictionary by dict.ts; keys must stay globally unique.
 *
 * Mongolian here is NOT from the client's deck - leave `r` unset so unreviewedKeys()
 * keeps reporting it for native review (plan risk R11).
 */
import type { Entry } from './dict';

export const mapDict = {
  // ---- collapsible panel (client asked that the map not dominate the workflow)
  'map.panelTitle': { en: 'Network map', mn: 'Сүлжээний зураг' },
  'map.collapsedSummary': { en: 'hidden — incidents in focus', mn: 'нуусан — ослуудад анхаарч байна' },

  // ---- basemap switcher. Default is the bundled street pack (plan 1.1): street
  // detail AND no network, so it is labelled plainly rather than hedged.
  'map.basemapBundled': { en: 'Streets', mn: 'Гудамж' },
  'map.basemapBundledHint': {
    en: 'Street map bundled into the build — full detail with networking off',
    mn: 'Бүтээцэд багтаасан гудамжны зураг — сүлжээгүйгээр бүрэн нарийвчлалтай',
  },
  'map.basemapNetwork': { en: 'Network', mn: 'Сүлжээ' },
  // labelled 'online' in the control itself: the operator should not have to hover to learn it needs a network
  'map.basemapStreets': { en: 'Online', mn: 'Онлайн' },
  'map.basemapNetworkHint': {
    en: 'Vector route network drawn from memory — works with networking off',
    mn: 'Санах ойгоос зурсан вектор чиглэлийн сүлжээ — сүлжээгүйгээр ажиллана',
  },
  'map.basemapStreetsHint': {
    en: 'OpenStreetMap raster tiles — requires a network connection; falls back to Network automatically',
    mn: 'OpenStreetMap гудамжны хавтан — интернэт холболт шаардана; холболтгүй бол Сүлжээ рүү автоматаар шилжинэ',
  },
  'map.offlineNotice': { en: 'Offline — vector network', mn: 'Офлайн — вектор сүлжээ' },
  'map.tilesNotice': {
    en: 'Street tiles unavailable — vector network',
    mn: 'Гудамжны хавтан ачаалагдсангүй — вектор сүлжээ',
  },

  // ---- legend: the marks the S7 line legend does not cover
  'map.legendBusTitle': { en: 'Buses', mn: 'Автобус' },
  'map.legendLoadTitle': { en: 'Bus load', mn: 'Автобусны ачаалал' },
  'map.legendIncident': { en: 'Incident', mn: 'Осол, гэмтэл' },
  'map.legendShow': { en: 'Legend', mn: 'Тайлбар' },
  'map.legendHide': { en: 'Hide legend', mn: 'Тайлбарыг нуух' },

  // ---- selected-vehicle context (U3). Shown only while a bus is selected, so
  // the legend costs nothing until the three marks are actually on the map.
  'map.legendSelTitle': { en: 'Selected bus', mn: 'Сонгосон автобус' },
  'map.legendAhead': { en: 'Route ahead', mn: 'Үлдсэн чиглэл' },
  'map.legendBehind': { en: 'Route travelled', mn: 'Туулсан чиглэл' },
  'map.legendTrail': { en: 'Recent movement', mn: 'Сүүлийн хөдөлгөөн' },
  'map.legendDeviation': { en: 'Off booked route', mn: 'Чиглэлээсээ гарсан' },

  // ---- clusters (plan 11.5 step 1). The accessible name carries the funnel
  // split, because the marker itself can only show two numbers.
  'map.clusterAria': {
    en: '{total} buses — {critical} critical, {attention} require attention. Activate to zoom in.',
    mn: '{total} автобус — {critical} ноцтой, {attention} анхаарах шаардлагатай. Томруулахын тулд сонгоно уу.',
  },

  // ---- popups (plan 11.5 step 2)
  'map.popMin': { en: 'min', mn: 'мин' },
  'map.popStopId': { en: 'Stop ID', mn: 'Буудлын код' },
  'map.popAlongRoute': { en: 'Along route', mn: 'Чиглэлийн дагуу' },
  'map.popStops': { en: 'Stops', mn: 'Буудал' },
  'map.popLength': { en: 'Route length', mn: 'Чиглэлийн урт' },
  'map.actOpenDetail': { en: 'Open detail', mn: 'Дэлгэрэнгүй' },
  'map.actShowRoute': { en: 'Show route', mn: 'Чиглэлийг харах' },
  'map.actRaiseEvent': { en: 'Raise event', mn: 'Үйл явдал бүртгэх' },
  'map.raiseHandoff': {
    en: 'Alert selected in Alerts & Events — press Validate → Event to raise it',
    mn: 'Сэрэмжлүүлэг ба үйл явдал дээр сонголоо — Баталгаажуулах → Үйл явдал дарна уу',
  },
  'map.raiseNoAlert': {
    en: 'No open alert on this bus — use Manual event in Alerts & Events',
    mn: 'Энэ автобуст нээлттэй сэрэмжлүүлэг байхгүй — Гараар үйл явдал бүртгэнэ үү',
  },

  // ---- layer panel + zoom (plan 11.5 step 6). Collapsed to a chip by default so
  // it costs nothing on the Command Centre's small embed.
  'map.layers': { en: 'Layers', mn: 'Давхарга' },
  'map.layerBuses': { en: 'Buses', mn: 'Автобус' },
  'map.layerStops': { en: 'Stops', mn: 'Буудал' },
  'map.layerRoutes': { en: 'Routes', mn: 'Чиглэл' },
  'map.layerIncidents': { en: 'Incidents', mn: 'Осол, гэмтэл' },
  'map.layerBasemap': { en: 'Basemap', mn: 'Дэвсгэр зураг' },
  'map.layerColour': { en: 'Bus colour', mn: 'Автобусны өнгө' },
  'map.zoomIn': { en: 'Zoom in', mn: 'Томруулах' },
  'map.zoomOut': { en: 'Zoom out', mn: 'Жижигрүүлэх' },
} as const satisfies Record<string, Entry>;
