/**
 * Bilingual strings for the long-term analytics tabs (PTCC scenario 3: route profile by
 * day of week and start time; top-5 delay hotspots). Ours, not the deck's: `r` unset.
 */
import type { Entry } from './dict';

export const insightDict = {
  'an.tab.review': { en: 'Incident review', mn: 'Зөрчлийн дүн шинжилгээ' },
  'an.tab.route': { en: 'Route profile', mn: 'Чиглэлийн профайл' },
  'an.tab.hotspots': { en: 'Delay hotspots', mn: 'Саатлын цэгүүд' },
  'an.ext.scope': { en: 'Extension — outside R1096 scope', mn: 'Нэмэлт — R1096-ийн хамрах хүрээнээс гадуур' },
  'an.ext.norm': {
    en: 'Norm: synthetic 8-week baseline (formula), SIMULATED',
    mn: 'Норм: 8 долоо хоногийн синтетик суурь (томьёо), СИМУЛЯЦ',
  },
  'an.ext.day': {
    en: 'Baseline day: {dow} — sim date is Mon 2026-09-21',
    mn: 'Суурь өдөр: {dow} — симуляцийн огноо Да 2026-09-21',
  },

  // ---- route profile (3a)
  'rp.title': { en: 'Route profile — forecast deviation per stop', mn: 'Чиглэлийн профайл — зогсоол бүрийн таамаг хазайлт' },
  'rp.sub': {
    en: 'Whole trip for the chosen day and start time: the norm band against the live trip and its forecast.',
    mn: 'Сонгосон өдөр, эхлэх цагийн бүтэн аялал: нормын муж, бодит аялал ба түүний таамаг.',
  },
  'rp.route': { en: 'Route', mn: 'Чиглэл' },
  'rp.dir': { en: 'Direction', mn: 'Чиглэлийн тал' },
  'rp.dir0': { en: 'Outbound', mn: 'Явах' },
  'rp.dir1': { en: 'Inbound', mn: 'Буцах' },
  'rp.dow': { en: 'Day of week', mn: 'Гараг' },
  'rp.start': { en: 'Start time', mn: 'Эхлэх цаг' },
  'rp.band': { en: 'norm p10–p90', mn: 'норм p10–p90' },
  'rp.normMean': { en: 'norm mean', mn: 'нормын дундаж' },
  'rp.actual': { en: 'actual', mn: 'бодит' },
  'rp.forecast': { en: 'forecast', mn: 'таамаг' },
  'rp.forecastNorm': { en: 'forecast (norm)', mn: 'таамаг (норм)' },
  'rp.segExcess': { en: 'segment excess per hop (s)', mn: 'хэсгийн илүүдэл, зогсоол хооронд (с)' },
  'rp.live': {
    en: 'Live trip {vehicle} started {time}: actual solid, forecast dashed.',
    mn: 'Шууд аялал {vehicle} {time}-д эхэлсэн: бодит — тасралтгүй, таамаг — тасархай.',
  },
  'rp.noLive': {
    en: 'No live trip on {route} started at {time} today — the forecast for this start is the norm.',
    mn: 'Өнөөдөр {time}-д эхэлсэн {route} шууд аялал алга — энэ эхлэлийн таамаг нь норм.',
  },
  'rp.otherDay': {
    en: 'Live trips only run on the sim date (Mon) — the forecast for {dow} is the norm.',
    mn: 'Шууд аялал зөвхөн симуляцийн өдөр (Да) — {dow} гарагийн таамаг нь норм.',
  },
  'rp.col.stop': { en: 'Stop', mn: 'Зогсоол' },
  'rp.col.planned': { en: 'Planned', mn: 'Төлөвлөсөн' },
  'rp.col.norm': { en: 'Norm (min)', mn: 'Норм (мин)' },
  'rp.col.actual': { en: 'Actual (min)', mn: 'Бодит (мин)' },
  'rp.col.delta': { en: 'Δ vs norm', mn: 'Нормоос зөрүү' },
  'rp.col.segment': { en: 'Segment', mn: 'Замын хэсэг' },
  'rp.compare': { en: 'Compare with', mn: 'Харьцуулах өдөр' },
  'rp.compareNone': { en: 'None', mn: 'Байхгүй' },
  'rp.view.trip': { en: 'Trip chart', mn: 'Аяллын график' },
  'rp.view.heat': { en: 'Day heatmap', mn: 'Өдрийн дулааны зураг' },
  'rp.heat.hint': {
    en: 'Norm deviation (min) at each stop, by trip start time, for {dow}. Click a cell to open that start in the trip chart.',
    mn: '{dow} гарагийн аяллын эхлэх цаг бүрээр зогсоол бүрийн нормын хазайлт (мин). Нүдэн дээр дарж тухайн эхлэлийг аяллын графикт нээнэ.',
  },

  // ---- hotspots (3b)
  'hs.title': { en: 'Top 5 road segments delaying buses', mn: 'Автобусыг хамгийн их саатуулдаг 5 замын хэсэг' },
  'hs.sub': {
    en: 'Ranked by deviation gained × segment length × routes crossing, over the chosen day and window.',
    mn: 'Сонгосон өдөр, цагийн мужид олсон хазайлт × хэсгийн урт × дайрах чиглэлийн тоогоор эрэмбэлсэн.',
  },
  'hs.window': { en: 'Time window', mn: 'Цагийн муж' },
  'hs.win.am': { en: 'AM peak 07:00–09:30', mn: 'Өглөөний оргил 07:00–09:30' },
  'hs.win.midday': { en: 'Midday 10:00–16:00', mn: 'Өдөр 10:00–16:00' },
  'hs.win.pm': { en: 'PM peak 16:30–19:30', mn: 'Оройн оргил 16:30–19:30' },
  'hs.win.evening': { en: 'Evening 19:30–21:00', mn: 'Орой 19:30–21:00' },
  'hs.win.all': { en: 'All day 06:00–21:00', mn: 'Өдөржин 06:00–21:00' },
  'hs.col.rank': { en: '#', mn: '#' },
  'hs.col.segment': { en: 'Segment', mn: 'Замын хэсэг' },
  'hs.col.mean': { en: 'Excess s/km', mn: 'Илүүдэл с/км' },
  'hs.col.band': { en: 'p10–p90', mn: 'p10–p90' },
  'hs.col.routes': { en: 'Routes crossing', mn: 'Дайрах чиглэл' },
  'hs.col.lost': { en: 'Bus-min lost (est.)', mn: 'Алдсан авт-мин (тооц.)' },
  'hs.col.live': { en: 'Live 30 min s/km', mn: 'Шууд 30 мин с/км' },
  'hs.col.action': { en: 'Proposed action', mn: 'Санал болгох арга хэмжээ' },
  'hs.lostNote': {
    en: 'Bus-min lost is an ESTIMATE: one pass per crossing route per 15 min, from the synthetic norm.',
    mn: 'Алдсан авт-мин нь ТООЦОО: 15 мин тутамд дайрах чиглэл бүр нэг удаа, синтетик нормоос.',
  },
  'hs.showMap': { en: 'Show on map', mn: 'Газрын зураг дээр харах' },
  'hs.clear': { en: 'Clear hotspots', mn: 'Саатлын цэгийг арилгах' },
  'hs.col.draft': { en: 'Coordination', mn: 'Зохицуулалт' },
  'hs.draft': { en: 'Draft', mn: 'Ноорог' },
  'hs.drafted': { en: 'Drafted', mn: 'Ноорог бэлэн' },
  'hs.draftDone': { en: 'Draft created — send from Comms', mn: 'Ноорог үүслээ — Харилцаа холбоо хэсгээс илгээнэ үү' },
  'hs.draftNoPerm': { en: 'Your role cannot send coordination messages', mn: 'Таны үүрэг зохицуулалтын мессеж илгээх эрхгүй' },
  'hs.draftMsg': {
    en: 'Hotspot {segment} ({window}, {day}): {action}. Requested by PTCC analytics.',
    mn: 'Саатлын цэг {segment} ({window}, {day}): {action}. PTCC-ийн шинжилгээнээс хүсэв.',
  },
  'hs.act.tcc_notify': { en: 'Notify TCC now — live delay over 2× norm', mn: 'ЗХТ-д одоо мэдэгдэх — шууд саатал нормоос 2 дахин их' },
  'hs.act.signal_priority': {
    en: 'Request bus signal priority / TCC signal-timing review',
    mn: 'Автобусны гэрлэн дохионы давуу эрх / ЗХТ-ийн дохионы хугацааны хяналт хүсэх',
  },
  'hs.act.stop_spacing': { en: 'Review stop spacing and dwell', mn: 'Зогсоолын зай, зогсолтын хугацааг хянах' },
  'hs.act.bus_lane': { en: 'Propose bus lane / enforcement window', mn: 'Автобусны эгнээ / хяналтын цаг санал болгох' },
  'hs.act.schedule_pad': {
    en: 'Add running-time padding in the timetable for this window',
    mn: 'Энэ цагийн мужид цагийн хуваарьт явах хугацааны нөөц нэмэх',
  },
} satisfies Record<string, Entry>;
