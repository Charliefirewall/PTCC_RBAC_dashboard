/**
 * Bilingual EN/MN dictionary.
 *
 * Mongolian strings marked `r: true` are taken VERBATIM from the presentation
 * (slides 2-10), which is rendered bilingually throughout. Everything else is
 * marked `r: false` and needs native review before Demo 2 (plan risk R11).
 */

import { agenticDict } from './dict.agentic';
import { rolesDict } from './dict.roles';
import { mapDict } from './dict.map';
import { modulesDict } from './dict.modules';
import { overlayDict } from './dict.overlay';
import { dashDict } from './dict.dash';
import { copilotDict } from './dict.copilot';
import { kitDict } from './dict.kit';
import { roiDict } from './dict.roi';
import { predictDict } from './dict.predict';
import { depotDict } from './dict.depot';
import { sopDict } from './dict.sop';
import { insightDict } from './dict.insight';
import { uxccDict } from './dict.uxcc';
import { uxregDict } from './dict.uxreg';
import { uxvehDict } from './dict.uxveh';
import { uxrpDict } from './dict.uxrp';
import { mnfixDict } from './dict.mnfix';
import { supportDict } from './dict.support';

export interface Entry {
  en: string;
  mn: string;
  /** reviewed: true = transcribed from the deck, so it is the client's own wording */
  r?: boolean;
}

const d = {
  // ---------------------------------------------------------------- shell
  'app.title': { en: 'PTCC Smart Operation Management', mn: 'PTCC Ухаалаг үйл ажиллагааны удирдлага', r: true },
  'app.demoBadge': { en: 'DEMO — simulated data — not a production system', mn: 'ДЕМО — загварчилсан өгөгдөл — бодит систем биш' },
  'app.lastUpdated': { en: 'Last updated', mn: 'Сүүлд шинэчлэгдсэн', r: true },
  'app.wallMode': { en: 'Video wall', mn: 'Видео хана' },
  'app.operatorMode': { en: 'Operator', mn: 'Оператор' },
  'app.paused': { en: 'Paused', mn: 'Түр зогсоосон' },
  'app.live': { en: 'Live', mn: 'Шууд' },
  'async.loading': { en: 'Loading workspace…', mn: 'Ажлын талбарыг ачаалж байна…' },
  'async.errorTitle': { en: 'Workspace could not be loaded', mn: 'Ажлын талбарыг ачаалж чадсангүй' },
  'async.errorText': { en: 'The current context is preserved. Retry when the connection is available.', mn: 'Одоогийн төлөв хадгалагдсан. Холболт сэргэхэд дахин оролдоно уу.' },
  'async.retry': { en: 'Retry', mn: 'Дахин оролдох' },

  // ---------------------------------------------------------------- nav
  'nav.command': { en: 'Command Centre', mn: 'Удирдлагын төв' },
  'nav.map': { en: 'Live Fleet Map', mn: 'Автобусны шууд байршил' },
  'nav.regularity': { en: 'Route & Service Regularity', mn: 'Үйлчилгээний тогтмол байдал', r: true },
  'nav.vehicle': { en: 'Vehicle Detail', mn: 'Тээврийн хэрэгслийн дэлгэрэнгүй' },
  'nav.passenger': { en: 'Passenger Intelligence', mn: 'Зорчигчийн эрэлт, ачаалал', r: true },
  'nav.alerts': { en: 'Alerts & Events', mn: 'Сэрэмжлүүлэг, үйл явдал' },
  'nav.forecast': { en: 'Forecast', mn: 'Таамаглал' },
  'nav.comms': { en: 'Communication', mn: 'Мэдээлэл, харилцаа' },
  'nav.health': { en: 'Fleet Health', mn: 'Системийн найдвартай байдал', r: true },
  'nav.operators': { en: 'Operator Performance', mn: 'Операторын гүйцэтгэл', r: true },
  'nav.copilot': { en: 'Ops Copilot', mn: 'Үйл ажиллагааны туслах' },
  'nav.roi': { en: 'Cost & ROI', mn: 'Зардал, ROI' },
  'nav.analytics': { en: 'Analytics & Review', mn: 'Шинжилгээ, дүгнэлт' },
  'nav.settings': { en: 'Thresholds & Settings', mn: 'Босго, тохиргоо' },
  'nav.multimodal': { en: 'Multimodal', mn: 'Олон төрлийн тээвэр' },

  // ---------------------------------------------------------------- KPI tiles (S7)
  'kpi.busesInService': { en: 'Buses in service', mn: 'Үйлчилж буй автобус', r: true },
  'kpi.routesOperating': { en: 'Routes operating', mn: 'Үйлчилж буй чиглэл', r: true },
  'kpi.activeAlerts': { en: 'Active alerts', mn: 'Идэвхтэй сэрэмжлүүлэг', r: true },
  'kpi.criticalAlerts': { en: 'Critical alerts', mn: 'Ноцтой сэрэмжлүүлэг', r: true },
  'kpi.ridershipToday': { en: 'Ridership today', mn: 'Өнөөдрийн зорчигч', r: true },
  'kpi.systemHealth': { en: 'System health', mn: 'Системийн төлөв', r: true },

  // ---------------------------------------------------------------- funnel (S3)
  'funnel.operating': { en: 'buses operating', mn: 'автобус үйлчилж байна', r: true },
  'funnel.normal': { en: 'Normal', mn: 'Хэвийн', r: true },
  'funnel.attention': { en: 'Require attention', mn: 'Анхаарах шаардлагатай', r: true },
  'funnel.critical': { en: 'Critical', mn: 'Ноцтой', r: true },
  'funnel.focus': { en: 'Operator focuses on {n} — not {total}', mn: 'Оператор {total} биш, {n}-д анхаарна', r: true },
  'funnel.banner': {
    en: 'Normal operation stays in the background. Abnormal operation comes to the operator.',
    mn: 'Хэвийн үйл ажиллагаа ар талд үлдэж, хэвийн бус нөхцөл операторт ирнэ.',
    r: true,
  },

  // ---------------------------------------------------------------- severity
  'sev.informational': { en: 'Informational', mn: 'Мэдээлэл', r: true },
  'sev.warning': { en: 'Warning', mn: 'Анхааруулга', r: true },
  'sev.critical': { en: 'Critical', mn: 'Ноцтой', r: true },
  'sev.crisis': { en: 'Crisis', mn: 'Хямрал' },
  'sev.high': { en: 'High', mn: 'Өндөр' },
  'sev.medium': { en: 'Medium', mn: 'Дунд' },
  'sev.low': { en: 'Low', mn: 'Бага' },

  // ---------------------------------------------------------------- map legend (S7)
  'legend.normal': { en: 'Normal', mn: 'Хэвийн', r: true },
  'legend.slower': { en: 'Slower than usual', mn: 'Ердийнхөөс удаан', r: true },
  'legend.disrupted': { en: 'Disrupted', mn: 'Тасалдсан', r: true },
  'legend.noservice': { en: 'No service', mn: 'Үйлчилгээгүй', r: true },
  'legend.title': { en: 'Network map', mn: 'Сүлжээний зураг', r: true },
  'legend.note': { en: 'Slide 7 legend (client-confirmed). Slide 5 alternative available in Settings.', mn: '7-р слайдын тэмдэглэгээ (захиалагч баталсан). 5-р слайдын хувилбарыг Тохиргооноос сонгоно.' },
  // Slide 5 alternative wording (four states). The deck's two legends are
  // unreconciled; the demo defaults to S7 and names the choice.
  'legend.onTime': { en: 'On time', mn: 'Цагтаа' },
  'legend.slightDelay': { en: 'Slight delay', mn: 'Бага зэргийн хоцролт' },
  'legend.majorDelay': { en: 'Major delay', mn: 'Их хоцролт' },
  'legend.noteS5': { en: 'Slide 5 legend. Slide 7 three-state is the client-confirmed default.', mn: '5-р слайдын тэмдэглэгээ. Захиалагчийн баталсан үндсэн хувилбар нь 7-р слайдын 3 төлөв.' },
  'map.byDelay': { en: 'By delay', mn: 'Хоцролтоор' },
  'map.byLoad': { en: 'By load', mn: 'Ачааллаар' },

  // ---------------------------------------------------------------- load bands (S8)
  'band.over90': { en: '> 90 %', mn: '> 90 %', r: true },
  'band.70to90': { en: '70 – 90 %', mn: '70 – 90 %', r: true },
  'band.50to70': { en: '50 – 70 %', mn: '50 – 70 %', r: true },
  'band.30to50': { en: '30 – 50 %', mn: '30 – 50 %', r: true },
  'band.under30': { en: '< 30 %', mn: '< 30 %', r: true },

  // ---------------------------------------------------------------- alerts
  'alerts.priority': { en: 'Priority Alerts', mn: 'Нэн тэргүүний сэрэмжлүүлэг', r: true },
  'alerts.showingTop': { en: 'Showing top {n} of {total}', mn: 'Эхний {n} (нийт {total})' },
  'alerts.none': { en: 'No active alerts', mn: 'Идэвхтэй сэрэмжлүүлэг байхгүй' },
  'alerts.fewer': { en: 'Fewer alerts, more useful alerts.', mn: 'Цөөн боловч илүү ашигтай сэрэмжлүүлэг.', r: true },
  'alert.service_gap': { en: '{route} gap {min} min', mn: '{route} {min} минутын завсар', r: true },
  'alert.bunching': { en: '{route} bunching ({n})', mn: '{route} бөөгнөрөл ({n})' },
  'alert.delay': { en: '{route} delay {min} min', mn: '{route} {min} минутын хоцролт' },
  'alert.overcrowding': { en: '{route} load {pct} %', mn: '{route} ачаалал {pct} %', r: true },
  'alert.panic': { en: 'Bus {bus} emergency', mn: '{bus} автобус яаралтай дохио', r: true },
  'alert.breakdown': { en: 'Bus {bus} breakdown', mn: '{bus} автобус эвдэрсэн' },
  'alert.accident': { en: 'Bus {bus} accident', mn: '{bus} автобус осолд орсон' },
  'alert.route_deviation': { en: 'Bus {bus} route deviation', mn: '{bus} маршрутаас хазайсан', r: true },
  'alert.harsh_braking': { en: 'Bus {bus} harsh braking', mn: '{bus} огцом тормослов', r: true },
  'alert.overspeed': { en: 'Bus {bus} overspeeding', mn: '{bus} хурд хэтрүүлэв', r: true },
  'alert.equipment': { en: 'Bus {bus} {device} offline', mn: '{bus} автобусны {device} тасарсан', r: true },
  'alert.repeated_failure': { en: 'Operator {operator} repeated failures ({n})', mn: '{operator} операторын давтагдсан гэмтэл ({n})' },
  'alerts.validate': { en: 'Validate → Event', mn: 'Баталгаажуулах → Үйл явдал' },
  'alerts.acknowledge': { en: 'Acknowledge', mn: 'Хүлээн авах' },
  'alerts.threshold': { en: 'Rule {rule}: {value}{unit} vs threshold {threshold}{unit}', mn: 'Дүрэм {rule}: {value}{unit}, босго {threshold}{unit}' },
  'alerts.tabAlerts': { en: 'Alerts (3 levels)', mn: 'Сэрэмжлүүлэг (3 түвшин)' },
  'alerts.tabEvents': { en: 'Events (5 levels)', mn: 'Үйл явдал (5 түвшин)' },
  'alerts.scalesNote': {
    en: 'Two separate scales by design: alerts have three severities (L1182), validated events have five (R1433).',
    mn: 'Санаатайгаар хоёр тусдаа шатлал: сэрэмжлүүлэг 3 зэрэглэлтэй (L1182), баталгаажсан үйл явдал 5 зэрэглэлтэй (R1433).',
  },

  // ---------------------------------------------------------------- widgets (S7)
  'widget.regularity': { en: 'Service regularity', mn: 'Үйлчилгээний тогтмол байдал', r: true },
  'widget.mostDelayed': { en: 'Most delayed routes', mn: 'Хамгийн их хоцролттой чиглэл', r: true },
  'widget.passengerLoad': { en: 'Passenger load', mn: 'Зорчигчийн ачаалал', r: true },
  'widget.highestLoad': { en: 'Highest load routes', mn: 'Хамгийн их ачаалалтай чиглэл', r: true },
  'widget.operatorPerf': { en: 'Operator performance', mn: 'Операторын гүйцэтгэл', r: true },
  'widget.onTime': { en: 'On-time performance', mn: 'Цагтаа гүйцэтгэл', r: true },
  'widget.systemHealth': { en: 'System health', mn: 'Системийн найдвартай байдал', r: true },
  // Deck wording (S9) with its English "(offline)" put into Mongolian - no longer verbatim, so no `r`.
  'widget.afcOffline': { en: 'AFC offline', mn: 'Төлбөрийн систем (тасарсан)' },
  'widget.cctvOffline': { en: 'CCTV offline', mn: 'Хяналтын камер (тасарсан)' },
  'widget.tboxOffline': { en: 'T-Box offline', mn: 'Бортын төхөөрөмж (тасарсан)' },
  'widget.network': { en: 'Network', mn: 'Холбооны сүлжээ', r: true },

  // ---------------------------------------------------------------- drill-down (S5)
  'drill.network': { en: 'Network View', mn: 'Сүлжээний ерөнхий хяналт', r: true },
  'drill.route': { en: 'Route View', mn: 'Чиглэлийн харагдац', r: true },
  'drill.vehicle': { en: 'Vehicle View', mn: 'Тээврийн хэрэгслийн харагдац', r: true },
  'drill.detail': { en: 'Detailed Investigation', mn: 'Дэлгэрэнгүй шалгалт', r: true },
  'drill.cctv': { en: 'CCTV View', mn: 'Камерын харагдац', r: true },
  'q.what': { en: 'What is happening?', mn: 'Юу болж байна вэ?', r: true },
  'q.where': { en: 'Where is it happening?', mn: 'Хаана болж байна вэ?', r: true },
  'q.why': { en: 'Why is it happening?', mn: 'Яагаад болж байна вэ?', r: true },
  'q.response': { en: 'What response is required?', mn: 'Ямар арга хэмжээ шаардлагатай вэ?', r: true },

  // ---------------------------------------------------------------- vehicle detail (S5)
  'veh.delay': { en: 'Delay', mn: 'Хоцролт', r: true },
  'veh.location': { en: 'Location', mn: 'Байршил', r: true },
  'veh.nextStop': { en: 'Next stop', mn: 'Дараагийн буудал', r: true },
  'veh.occupancy': { en: 'Occupancy', mn: 'Зорчигчийн ачаалал', r: true },
  'veh.status': { en: 'Status', mn: 'Төлөв', r: true },
  'veh.inService': { en: 'In service', mn: 'Үйлчилгээнд', r: true },
  'veh.outOfService': { en: 'Out of service', mn: 'Үйлчилгээнээс гарсан' },
  'veh.breakdown': { en: 'Breakdown', mn: 'Эвдрэл' },
  'veh.tabOps': { en: 'Operational Data', mn: 'Үйл ажиллагааны өгөгдөл', r: true },
  'veh.tabCctv': { en: 'CCTV', mn: 'Хяналтын камер', r: true },
  'veh.tabIncident': { en: 'Incident Info', mn: 'Ослын мэдээлэл', r: true },
  'veh.time': { en: 'Time', mn: 'Цаг', r: true },
  'veh.speed': { en: 'Speed', mn: 'Хурд', r: true },
  'veh.scheduleDeviation': { en: 'Schedule deviation', mn: 'Хуваарийн зөрүү', r: true },
  'veh.passengerLoad': { en: 'Passenger load', mn: 'Зорчигчийн ачаалал', r: true },
  'veh.doorStatus': { en: 'Door status', mn: 'Хаалганы төлөв', r: true },
  'veh.driverStatus': { en: 'Driver status', mn: 'Жолоочийн төлөв', r: true },
  'veh.normal': { en: 'Normal', mn: 'Хэвийн', r: true },
  'veh.speedNote': {
    en: 'Instantaneous reading. Slide 5 shows 8 km/h for this field. No average-speed KPI exists in any source.',
    mn: 'Агшин зуурын утга. 5-р слайдад энэ талбарт 8 км/ц гэж заасан. Дундаж хурдны KPI аль ч эх сурвалжид байхгүй.',
  },
  'veh.simulatedStill': { en: 'SIMULATED STILL', mn: 'ЗАГВАРЧИЛСАН ЗУРАГ' },
  'veh.source': { en: 'Source', mn: 'Эх сурвалж' },

  // ---------------------------------------------------------------- regularity
  'reg.topDeviation': { en: 'Top {n} route deviations', mn: 'Хуваарийн зөрүүтэй эхний {n} чиглэл' },
  'reg.topBunching': { en: 'Top {n} routes with bunching', mn: 'Бөөгнөрөл ихтэй эхний {n} чиглэл' },
  'reg.headwayTitle': { en: 'Headway analysis ({route})', mn: 'Үйлчилгээний давтамжийн шинжилгээ ({route})', r: true },
  'reg.planned': { en: 'Planned headway', mn: 'Төлөвлөсөн давтамж', r: true },
  'reg.actual': { en: 'Actual headway', mn: 'Бодит давтамж', r: true },
  'reg.serviceGap': { en: 'Service gap ({min} min)', mn: 'Үйлчилгээний завсар ({min} мин)', r: true },
  'reg.avgDelay': { en: 'Avg. delay', mn: 'Дундаж хоцролт', r: true },
  'reg.route': { en: 'Route', mn: 'Чиглэл', r: true },
  'reg.status': { en: 'Status', mn: 'Төлөв', r: true },
  'reg.timetableNote': {
    en: 'Planned service is a synthesised timetable — no timetable source exists in the deck or the design document. Client-approved for this demo.',
    mn: 'Төлөвлөсөн үйлчилгээ нь зохиомол хуваарь — слайд болон зураг төсөлд хуваарийн эх сурвалж байхгүй. Захиалагч энэ демод зөвшөөрсөн.',
  },
  'reg.headwayMin': { en: 'Headway (min)', mn: 'Давтамж (мин)', r: true },

  // ---------------------------------------------------------------- passenger
  'pax.topBusiest': { en: 'Top {n} busiest routes', mn: 'Хамгийн их ачаалалтай {n} чиглэл', r: true },
  'pax.overcrowded': { en: '{route} — Load {pct} % — Overcrowded', mn: '{route} — Ачаалал {pct} % — Хэт ачаалалтай', r: true },
  'pax.demandTitle': { en: 'Network passenger demand (today)', mn: 'Зорчигчийн эрэлт (өнөөдөр)', r: true },
  'pax.waiting': { en: 'Derived waiting time', mn: 'Тооцоолсон хүлээх хугацаа' },
  'pax.waitingNote': {
    en: 'Derived from headway — no source measures waiting passengers at stops.',
    mn: 'Давтамжаас тооцоолсон — буудал дээр хүлээж буй зорчигчийг хэмждэг эх сурвалж байхгүй.',
  },
  'pax.chevron1': { en: 'Service issue', mn: 'Үйлчилгээний асуудал', r: true },
  'pax.chevron2': { en: 'Passenger impact', mn: 'Зорчигчдод үзүүлэх нөлөө', r: true },
  'pax.chevron3': { en: 'PTCC action', mn: 'PTCC-ийн арга хэмжээ', r: true },
  'pax.banner': {
    en: 'A service deviation becomes more important when the passenger impact is high.',
    mn: 'Үйлчилгээний зөрчил нь зорчигчдод үзүүлэх нөлөө их байх үед илүү ач холбогдолтой.',
    r: true,
  },
  'pax.ridership': { en: 'Ridership', mn: 'Зорчигчийн тоо', r: true },
  'pax.leftBehind': { en: 'Left behind (15 min)', mn: 'Сууж чадаагүй зорчигч (15 мин)' },

  // ---------------------------------------------------------------- events / workflow
  'ev.stage.detection': { en: 'Detection', mn: 'Илрүүлэлт', r: true },
  'ev.stage.validation': { en: 'Validation', mn: 'Баталгаажуулалт', r: true },
  'ev.stage.creation': { en: 'Creation', mn: 'Бүртгэл', r: true },
  'ev.stage.response_assignment': { en: 'Response assignment', mn: 'Хариу арга хэмжээ хуваарилах', r: true },
  'ev.stage.response_monitoring': { en: 'Response monitoring', mn: 'Хариу арга хэмжээний хяналт', r: true },
  'ev.stage.resolution': { en: 'Resolution', mn: 'Шийдвэрлэлт', r: true },
  'ev.stage.closure': { en: 'Closure', mn: 'Хаалт', r: true },
  'ev.recommended': { en: 'Recommended actions', mn: 'Зөвлөмж болгосон арга хэмжээ', r: true },
  'ev.compulsory': { en: 'Compulsory actions', mn: 'Заавал хийх арга хэмжээ', r: true },
  'ev.advance': { en: 'Advance to {stage}', mn: 'Дараагийн шат: {stage}' },
  'ev.blocked': { en: 'Blocked — {n} compulsory action(s) outstanding', mn: 'Түгжээтэй — заавал хийх {n} арга хэмжээ үлдсэн' },
  'ev.override': { en: 'Supervisor override', mn: 'Ахлах хянагч хүчингүй болгох' },
  'ev.justification': { en: 'Justification (required)', mn: 'Үндэслэл (заавал)' },
  'ev.evidence': { en: 'Evidence bundle', mn: 'Нотлох баримтын багц' },
  'ev.history': { en: 'Event history', mn: 'Үйл явдлын түүх' },
  'ev.emergencyLevel': { en: 'Emergency level', mn: 'Онцгой байдлын түвшин' },
  'ev.none': { en: 'No events. Validate an alert to create one.', mn: 'Үйл явдал алга. Үүсгэхийн тулд сэрэмжлүүлэг баталгаажуулна уу.' },
  'ev.validateTitle': { en: 'Validate alert → create event', mn: 'Сэрэмжлүүлэг баталгаажуулах → үйл явдал үүсгэх' },
  'ev.validateNote': {
    en: 'An automated alert requires operator validation before it becomes a formal event (L1235).',
    mn: 'Автомат сэрэмжлүүлгийг оператор баталгаажуулсны дараа л албан ёсны үйл явдал болно (L1235).',
  },
  'ev.verifyChecklist': { en: 'Verified against', mn: 'Шалгасан эх сурвалж' },
  'ev.vTelemetry': { en: 'Vehicle telemetry', mn: 'Тээврийн хэрэгслийн телеметр', r: true },
  'ev.vRoute': { en: 'Route operational status', mn: 'Чиглэлийн үйл ажиллагааны төлөв', r: true },
  'ev.vCctv': { en: 'CCTV video feed', mn: 'Камерын дүрс', r: true },
  'ev.vDriver': { en: 'Driver communication', mn: 'Жолоочтой холбоо барих', r: true },

  // ---------------------------------------------------------------- playbook actions
  'pb.notify_maintenance': { en: 'Notify maintenance team', mn: 'Засварын багт мэдэгдэх', r: true },
  'pb.schedule_depot_inspection': { en: 'Schedule inspection on depot return', mn: 'Буцаж ирэхэд үзлэг товлох', r: true },
  'pb.record_system_failure': { en: 'Record system failure', mn: 'Системийн гэмтлийг бүртгэх', r: true },
  'pb.assign_post_return_inspection': { en: 'Assign post-return inspection task', mn: 'Буцсаны дараах үзлэг хуваарилах', r: true },
  'pb.dispatch_replacement': { en: 'Dispatch replacement vehicle', mn: 'Орлох тээврийн хэрэгсэл илгээх', r: true },
  'pb.notify_operator_dispatch': { en: 'Notify operator dispatch', mn: 'Операторын диспетчерт мэдэгдэх', r: true },
  'pb.record_breakdown': { en: 'Record breakdown event', mn: 'Эвдрэлийг бүртгэх', r: true },
  'pb.request_towing': { en: 'Request towing or roadside assistance', mn: 'Чирэгч дуудах', r: true },
  'pb.track_recovery': { en: 'Track vehicle recovery', mn: 'Сэргээлтийг хянах', r: true },
  'pb.review_cctv': { en: 'Review CCTV footage', mn: 'Камерын бичлэг шалгах', r: true },
  'pb.reroute_services': { en: 'Reroute affected services', mn: 'Үйлчилгээг өөрчлөх', r: true },
  'pb.notify_traffic_police': { en: 'Notify Traffic Police', mn: 'Замын цагдаад мэдэгдэх', r: true },
  'pb.preserve_cctv': { en: 'Preserve CCTV evidence', mn: 'Камерын нотлох баримтыг хадгалах', r: true },
  'pb.initiate_insurance': { en: 'Initiate insurance claim process', mn: 'Даатгалын нэхэмжлэл эхлүүлэх', r: true },
  'pb.contact_operator': { en: 'Contact bus operator', mn: 'Автобусны оператортой холбогдох', r: true },
  'pb.record_incident': { en: 'Record incident', mn: 'Хэргийг бүртгэх', r: true },
  'pb.preserve_evidence': { en: 'Preserve evidence', mn: 'Нотлох баримтыг хадгалах', r: true },
  'pb.notify_authorities': { en: 'Notify authorities if required', mn: 'Шаардлагатай бол эрх бүхий байгууллагад мэдэгдэх', r: true },
  'pb.contact_driver': { en: 'Contact bus driver', mn: 'Жолоочтой холбогдох', r: true },
  'pb.inform_operator_dispatch': { en: 'Inform bus operator dispatch', mn: 'Операторын диспетчерт мэдэгдэх', r: true },
  'pb.broadcast_update': { en: 'Broadcast passenger information update', mn: 'Зорчигчдод мэдээлэл түгээх', r: true },
  'pb.create_record': { en: 'Create event record', mn: 'Үйл явдлын бүртгэл үүсгэх', r: true },
  'pb.classify_event': { en: 'Classify event type and severity', mn: 'Төрөл, ноцтой байдлыг ангилах', r: true },

  // ---------------------------------------------------------------- comms
  'comms.passenger': { en: 'Passenger information', mn: 'Зорчигчийн мэдээлэл' },
  'comms.coordination': { en: 'Coordination', mn: 'Зохицуулалт' },
  'comms.approve': { en: 'Approve & dispatch', mn: 'Батлаад илгээх' },
  'comms.pending': { en: 'Pending approval', mn: 'Батлахыг хүлээж буй' },
  'comms.active': { en: 'Active', mn: 'Идэвхтэй' },
  'comms.send': { en: 'Send', mn: 'Илгээх' },
  'comms.recipient': { en: 'Recipient', mn: 'Хүлээн авагч' },
  'comms.channels': { en: 'Channels', mn: 'Суваг' },
  'comms.banner': {
    en: 'PTCC consolidates and validates; authorised PTPD units publish (L741).',
    mn: 'PTCC нэгтгэж, баталгаажуулна; НТГ-ын эрх бүхий нэгж нийтэлнэ (L741).',
  },
  'comms.tccNote': {
    en: 'No PTCC–TCC interface exists today, automatic or manual (R967).',
    mn: 'Одоогоор PTCC ба ЗХУТ-ын хооронд автомат ч, гар аргын ч холболт байхгүй (R967).',
  },
  'comms.type.incident_notification': { en: 'Incident Notification', mn: 'Ослын мэдэгдэл', r: true },
  'comms.type.operational_instruction': { en: 'Operational Instruction', mn: 'Үйл ажиллагааны заавар', r: true },
  'comms.type.coordination_request': { en: 'Coordination Request', mn: 'Зохицуулалтын хүсэлт', r: true },
  'comms.type.service_status_update': { en: 'Service Status Update', mn: 'Үйлчилгээний төлөвийн мэдээлэл', r: true },
  'rcpt.bus_operator': { en: 'Bus Operator OCC', mn: 'Автобусны операторын төв', r: true },
  'rcpt.traffic_police': { en: 'Traffic Police', mn: 'Замын цагдаа', r: true },
  'rcpt.tcc': { en: 'Traffic Control Centre', mn: 'Замын хөдөлгөөний удирдлагын төв', r: true },
  'rcpt.ptpd': { en: 'PTPD Division', mn: 'НТГ-ын хэлтэс', r: true },
  'rcpt.emergency_services': { en: 'Emergency Services', mn: 'Онцгой байдлын алба', r: true },
  'rcpt.municipal': { en: 'Municipal services', mn: 'Хотын үйлчилгээ', r: true },

  // ---------------------------------------------------------------- copilot
  'cop.title': { en: 'Ops Copilot', mn: 'Үйл ажиллагааны туслах' },
  'cop.assumption': {
    en: 'Proposed capability — no source describes a conversational interface. It proposes; you decide.',
    mn: 'Санал болгож буй боломж — харилцан ярианы интерфейсийг аль ч эх сурвалж дурдаагүй. Туслах санал болгоно; шийдвэрийг та гаргана.',
  },
  'cop.ask': { en: 'Ask about the network…', mn: 'Сүлжээний талаар асуух…' },
  'cop.sources': { en: 'Sources', mn: 'Эх сурвалж' },
  'cop.tier': { en: 'Tier {n}', mn: '{n}-р түвшин' },
  'cop.tier1': { en: 'Deterministic rules', mn: 'Тогтсон дүрэм' },
  'cop.tier2': { en: 'Playbook', mn: 'Арга хэмжээний заавар' },
  'cop.tier3': { en: 'Analytics-assisted', mn: 'Шинжилгээний тусламжтай' },
  'cop.tier4': { en: 'Conversational (proposed)', mn: 'Харилцан яриа (санал болгосон)' },
  'cop.q.lookFirst': { en: 'What requires immediate attention?', mn: 'Юунд яаралтай анхаарах ёстой вэ?' },
  'cop.q.why': { en: 'Why is {route} delayed?', mn: '{route} чиглэл яагаад хоцорч байна вэ?' },
  'cop.q.overcrowded': { en: 'Which routes are overcrowded?', mn: 'Аль чиглэл хэт ачаалалтай вэ?' },
  'cop.q.actions': { en: 'What response is required?', mn: 'Ямар арга хэмжээ шаардлагатай вэ?' },
  'cop.q.health': { en: 'Anything wrong with the equipment?', mn: 'Тоног төхөөрөмжид асуудал байна уу?' },
  'cop.q.brief': { en: 'Give me the shift handover brief', mn: 'Ээлж хүлээлцэх товч мэдээлэл гарга' },
  'cop.unknown': { en: 'I can answer these:', mn: 'Би дараах асуултад хариулж чадна:' },
  'cop.noAction': { en: 'The agent proposes; the operator decides. No action is taken automatically.', mn: 'Туслах санал болгоно, оператор шийднэ. Ямар ч арга хэмжээ автоматаар хийгдэхгүй.' },

  // ---------------------------------------------------------------- settings
  'set.thresholds': { en: 'Thresholds', mn: 'Босго утга' },
  'set.demoDefault': { en: 'DEMO DEFAULT — no value in any source', mn: 'ДЕМО УТГА — эх сурвалжид утга байхгүй' },
  'set.reset': { en: 'Reset to demo defaults', mn: 'Демо анхны утгад буцаах' },
  'set.language': { en: 'Language', mn: 'Хэл' },
  'set.preset': { en: 'Display preset', mn: 'Дэлгэцийн тохиргоо' },
  'set.legend': { en: 'Map legend', mn: 'Газрын зургийн тэмдэглэгээ' },
  'set.simSpeed': { en: 'Simulation speed', mn: 'Загварчлалын хурд' },
  'set.provenance': { en: 'Data provenance', mn: 'Өгөгдлийн эх сурвалж' },
  'set.speedProfile': { en: 'Speed profile (km/h)', mn: 'Хурдны профайл (км/ц)' },
  'set.speedNote': {
    en: 'Central peak 8 km/h is client-directed and matches the single instantaneous reading on Slide 5. Using it as a peak MEAN is our inference — it is never applied to suburban or off-peak links.',
    mn: 'Төвийн оргил цагийн 8 км/ц-ыг захиалагч заасан бөгөөд 5-р слайдын цорын ганц агшин зуурын утгатай тохирно. Үүнийг оргил цагийн ДУНДАЖ болгон ашигласан нь бидний дүгнэлт — захын болон оргил бус цагийн хэсэгт хэрэглэхгүй.',
  },
  'th.schedule_deviation_s': { en: 'Schedule deviation threshold', mn: 'Хуваарийн зөрүүний босго', r: true },
  'th.bunching_min_headway_s': { en: 'Bus bunching threshold (min headway)', mn: 'Бөөгнөрлийн босго', r: true },
  'th.service_gap_max_s': { en: 'Service gap threshold', mn: 'Үйлчилгээний завсрын босго', r: true },
  'th.passenger_load_pct': { en: 'Passenger load threshold', mn: 'Зорчигчийн ачааллын босго', r: true },
  'th.passenger_load_critical_pct': { en: 'Passenger load — critical', mn: 'Зорчигчийн ачаалал — ноцтой' },
  'th.demand_anomaly_pct': { en: 'Demand anomaly threshold', mn: 'Эрэлтийн хазайлтын босго', r: true },
  'th.demand_aggregation_min': { en: 'Demand aggregation interval', mn: 'Эрэлт нэгтгэх интервал', r: true },
  'th.baseline_period_min': { en: 'Baseline comparison period', mn: 'Харьцуулах суурь үе', r: true },
  'th.top_route_ranking_n': { en: 'Top route ranking number', mn: 'Эрэмбэлэх чиглэлийн тоо', r: true },
  'th.bunching_ranking_n': { en: 'Bunching ranking number', mn: 'Бөөгнөрлийн эрэмбийн тоо' },
  'th.monitoring_interval_s': { en: 'Monitoring interval', mn: 'Хяналтын интервал', r: true },
  'th.revenue_anomaly_pct': { en: 'Revenue anomaly threshold', mn: 'Орлогын хазайлтын босго', r: true },
  'th.revenue_aggregation_min': { en: 'Revenue aggregation interval', mn: 'Орлого нэгтгэх интервал', r: true },
  'th.failure_duration_s': { en: 'Failure duration threshold', mn: 'Гэмтлийн үргэлжлэх хугацааны босго', r: true },
  'th.health_polling_s': { en: 'System health polling interval', mn: 'Системийн төлөв шалгах интервал', r: true },
  'th.distance_aggregation_min': { en: 'Distance aggregation interval', mn: 'Зам нэгтгэх интервал', r: true },
  'th.video_trigger_events': { en: 'Video trigger events', mn: 'Видео дуудах үйл явдлууд', r: true },
  'th.max_concurrent_streams': { en: 'Maximum concurrent video streams', mn: 'Зэрэг гарах видеоны дээд тоо', r: true },
  'th.overspeed_kmh': { en: 'Overspeed threshold', mn: 'Хурд хэтрүүлэлтийн босго' },

  // ---------------------------------------------------------------- health / roi
  'health.title': { en: 'Fleet Health', mn: 'Паркийн техникийн төлөв' },
  'health.proposed': {
    en: 'Proposed extension — predictive maintenance and cost per bus. Business intent stated by the client; the input data does not exist yet. The design document places predictive functions outside PTCC scope (R1096).',
    mn: 'Санал болгож буй өргөтгөл — урьдчилан таамаглах засвар үйлчилгээ, автобус тутмын зардал. Зорилгыг захиалагч тодорхойлсон; оролтын өгөгдөл хараахан байхгүй. Зураг төсөлд урьдчилан таамаглах чиг үүргийг PTCC-ийн хүрээнээс гадуур тооцсон (R1096).',
  },
  'health.repeated': { en: 'Repeated failure pattern — Operator {op}', mn: 'Давтагдсан гэмтлийн хэв шинж — {op} оператор' },
  'health.score': { en: 'Health score', mn: 'Техникийн төлөвийн оноо' },
  'health.inputsRequired': { en: 'Inputs required from PTPD', mn: 'НТГ-аас шаардлагатай мэдээлэл' },
  'health.simulated': { en: 'simulated', mn: 'загварчилсан' },
  'cost.maintenance': { en: 'Maintenance', mn: 'Засвар үйлчилгээ' },
  'cost.fuel_gas': { en: 'Fuel / gas', mn: 'Түлш / хий' },
  'cost.electricity': { en: 'Electricity', mn: 'Цахилгаан' },
  'cost.driver_salary': { en: 'Driver salary', mn: 'Жолоочийн цалин' },
  'cost.insurance': { en: 'Insurance', mn: 'Даатгал' },
  'cost.accidents': { en: 'Accidents', mn: 'Осол' },
  'cmp.maintenance_type_a': { en: 'Maintenance type A', mn: 'А төрлийн засвар' },
  'cmp.maintenance_type_b': { en: 'Maintenance type B', mn: 'Б төрлийн засвар' },
  'cmp.brakes': { en: 'Brakes', mn: 'Тормос' },
  'cmp.tyres': { en: 'Tyres', mn: 'Дугуй' },
  'cmp.clutches': { en: 'Clutches', mn: 'Шүүрэг' },
  'roi.title': { en: 'Cost & ROI Intelligence', mn: 'Зардал ба ROI шинжилгээ' },
  'roi.spendPerKm': { en: 'Spend per km', mn: 'Км тутмын зардал' },
  'roi.savings': { en: 'Projected saving', mn: 'Төсөөлсөн хэмнэлт' },
  'roi.slider': { en: 'Assumed saving from predictive maintenance', mn: 'Урьдчилан таамаглах засвараас гарах хэмнэлт (таамаг)' },

  // ---------------------------------------------------------------- operators
  'op.serviceKm': { en: 'Service km', mn: 'Үйлчилгээний км', r: true },
  'op.totalKm': { en: 'Total kilometres operated', mn: 'Нийт гүйцэтгэсэн км', r: true },
  'op.interruptions': { en: 'Service interruptions', mn: 'Үйлчилгээний тасалдал', r: true },
  'op.revenue': { en: 'Revenue', mn: 'Орлого', r: true },
  'op.kpiNote': {
    en: 'PTPD manages the KPI, not the drivers and shifts. PTCC identifies service gaps and asks the operator OCC to act.',
    mn: 'НТГ жолооч, ээлжийг бус, KPI-г удирдана. PTCC үйлчилгээний завсрыг илрүүлж, автобусны операторын төвөөс арга хэмжээ авахыг хүснэ.',
  },

  // ---------------------------------------------------------------- misc
  // ------------------------------------------------ alerts & events module (6)
  'alerts.filters': { en: 'Filters', mn: 'Шүүлтүүр' },
  'alerts.moreFilters': { en: 'More filters', mn: 'Нэмэлт шүүлтүүр' },
  'alerts.lessFilters': { en: 'Fewer filters', mn: 'Цөөн шүүлтүүр' },
  'alerts.activeFilters': { en: 'Active filters', mn: 'Идэвхтэй шүүлтүүр' },
  'alerts.resetFilters': { en: 'Reset filters', mn: 'Шүүлтүүр цэвэрлэх' },
  'alerts.historyPages': { en: 'Historical alert pages', mn: 'Түүхэн анхааруулгын хуудсууд' },
  'alerts.historyPage': { en: 'Page {page} of {pages}', mn: '{pages}-с {page}-р хуудас' },
  'alerts.firstPage': { en: 'Already on the first page', mn: 'Эхний хуудсанд байна' },
  'alerts.lastPage': { en: 'Already on the last page', mn: 'Сүүлийн хуудсанд байна' },
  'alerts.all': { en: 'All', mn: 'Бүгд' },
  'alerts.age': { en: 'Age', mn: 'Хугацаа' },
  'alerts.impact': { en: 'Impact', mn: 'Нөлөө' },
  'alerts.ruleDerived': {
    en: 'Rule-derived — the breached threshold is the explanation (L1175). No AI involved.',
    mn: 'Дүрмээр илрүүлсэн — зөрчигдсөн босго нь тайлбар болно (L1175). Хиймэл оюун ашиглаагүй.',
  },
  'alerts.openSubject': { en: 'Open subject', mn: 'Дэлгэрэнгүйг нээх' },
  'alerts.acknowledged': { en: 'Acknowledged', mn: 'Хүлээн авсан' },
  'alerts.validated': { en: 'Validated → {id}', mn: 'Баталгаажсан → {id}' },
  'alerts.count': { en: '{n} alert(s)', mn: '{n} сэрэмжлүүлэг' },
  'alerts.filterVehicle': { en: 'Filter by bus or vehicle number', mn: 'Автобус эсвэл тээврийн хэрэгслийн дугаараар шүүх' },
  'alerts.vehiclePlaceholder': { en: 'Vehicle e.g. 1-062', mn: 'Тээврийн хэрэгсэл, ж. 1-062' },
  'alerts.dateRange': { en: 'Alert date range', mn: 'Сэрэмжлүүлгийн огнооны интервал' },
  'alerts.date.today': { en: 'Today', mn: 'Өнөөдөр' },
  'alerts.date.yesterday': { en: 'Yesterday', mn: 'Өчигдөр' },
  'alerts.date.7d': { en: 'Last 7 days', mn: 'Сүүлийн 7 хоног' },
  'alerts.date.30d': { en: 'Last 30 days', mn: 'Сүүлийн 30 хоног' },
  'alerts.startDate': { en: 'From', mn: 'Эхлэх' },
  'alerts.endDate': { en: 'To', mn: 'Дуусах' },
  'alerts.history': { en: 'Historical alerts — actual records', mn: 'Түүхэн сэрэмжлүүлэг — бодит бүртгэл' },
  'alerts.historyCount': { en: '{n} session records', mn: '{n} сессийн бүртгэл' },
  'alerts.noHistory': { en: 'No historical alerts in this range', mn: 'Энэ хугацаанд түүхэн сэрэмжлүүлэг алга' },
  'alerts.noHistoryHint': { en: 'Cleared simulated alerts appear here for this demo session only. Production persistence, retention and pagination are not connected.', mn: 'Арилсан загварчилсан сэрэмжлүүлэг зөвхөн энэ демо сессэд энд харагдана. Үйлдвэрлэлийн хадгалалт, хугацаа, хуудаслалт холбогдоогүй.' },
  'alerts.historySession': { en: 'SESSION-ONLY SIMULATED HISTORY — capped in memory; not a production archive.', mn: 'ЗӨВХӨН СЕССИЙН ЗАГВАРЧИЛСАН ТҮҮХ — санах ойд хязгаартай; үйлдвэрлэлийн архив биш.' },
  'alerts.resolutionSnapshot': { en: 'Resolution-time simulated snapshot. Alert-time and peak telemetry are unavailable until time-series retention is connected.', mn: 'Шийдвэрлэх үеийн загварчилсан төлөв. Цагийн цувааны хадгалалт холбогдох хүртэл сэрэмжлүүлэг үүссэн болон оргил үеийн телеметр боломжгүй.' },
  'alerts.resolved': { en: 'Resolved actual', mn: 'Шийдвэрлэгдсэн бодит' },
  'alerts.openHistory': { en: 'Inspect history', mn: 'Түүхийг шалгах' },
  'alerts.historyTitle': { en: 'Historical alert {id}', mn: 'Түүхэн сэрэмжлүүлэг {id}' },
  'alerts.actualRecord': { en: 'Actual alert record', mn: 'Бодит сэрэмжлүүлгийн бүртгэл' },
  'alerts.actualRecordHint': { en: 'Captured when the rule stopped breaching. Forecast evidence below remains explicitly labelled as prediction.', mn: 'Дүрмийн зөрчил дуусах үед авсан. Доорх таамаг нотолгоог таамаг гэж тодорхой тэмдэглэсэн.' },
  'alerts.operationalContext': { en: 'Operational context at resolution', mn: 'Шийдвэрлэх үеийн ажиллагааны нөхцөл' },
  'alerts.trip': { en: 'Trip', mn: 'Рейс' },
  'alerts.position': { en: 'Position', mn: 'Байршил' },
  'alerts.deviation': { en: 'Schedule deviation', mn: 'Хуваарийн зөрүү' },
  'alerts.tripProgress': { en: 'Trip progress', mn: 'Рейсийн явц' },
  'alerts.passengerLoad': { en: 'Passenger load', mn: 'Зорчигчийн ачаалал' },
  'alerts.nextStop': { en: 'Next stop', mn: 'Дараагийн буудал' },
  'alerts.raised': { en: 'Raised at', mn: 'Үүссэн цаг' },
  'alerts.resolvedAt': { en: 'Resolved at', mn: 'Шийдвэрлэсэн цаг' },
  'alerts.stopHistory': { en: 'Stop-by-stop historical context', mn: 'Буудал бүрийн түүхэн нөхцөл' },
  'alerts.noStops': { en: 'No completed stops recorded', mn: 'Бүртгэгдсэн дууссан буудал алга' },
  'alerts.noStopsHint': { en: 'The alert cleared before a stop arrival was logged for this trip.', mn: 'Энэ рейсийн буудалд ирэлтийг бүртгэхээс өмнө сэрэмжлүүлэг арилсан.' },
  'alerts.stop': { en: 'Stop', mn: 'Буудал' },
  'alerts.scheduled': { en: 'Scheduled', mn: 'Хуваарьт' },
  'alerts.actual': { en: 'Actual', mn: 'Бодит' },
  'alerts.load': { en: 'Passengers', mn: 'Зорчигч' },
  'alerts.relatedEvidence': { en: 'Related events and forecast evidence', mn: 'Холбогдох үйл явдал ба таамгийн нотолгоо' },
  'alerts.relatedEvents': { en: 'Related events', mn: 'Холбогдох үйл явдал' },
  'alerts.historicalForecast': { en: 'Forecast visible at resolution (prediction)', mn: 'Шийдвэрлэх үед харагдсан таамаг (таамаглал)' },
  'alerts.noHistoricalForecast': { en: 'No matching forecast was recorded at resolution.', mn: 'Шийдвэрлэх үед тохирох таамаг бүртгэгдээгүй.' },
  'alerts.chance': { en: 'chance', mn: 'магадлал' },
  'alerts.confidence': { en: 'confidence', mn: 'итгэлцэл' },
  'alerts.type.service_deviation': { en: 'Service deviation', mn: 'Үйлчилгээний зөрчил', r: true },
  'alerts.type.overcrowding': { en: 'Overcrowding', mn: 'Хэт ачаалал', r: true },
  'alerts.type.vehicle_safety': { en: 'Vehicle safety', mn: 'Тээврийн хэрэгслийн аюулгүй байдал', r: true },
  'alerts.type.equipment_failure': { en: 'Equipment failure', mn: 'Тоног төхөөрөмжийн гэмтэл', r: true },
  'alerts.type.security': { en: 'Security', mn: 'Хамгаалалт', r: true },
  'ev.notAnEvent': {
    en: 'An automated alert is NOT an event until an operator validates it (L1235).',
    mn: 'Автомат сэрэмжлүүлэг нь оператор баталгаажуулах хүртэл үйл явдал БИШ (L1235).',
  },
  'ev.record12': { en: 'Event record — all 12 fields (L1246–L1258)', mn: 'Үйл явдлын бүртгэл — бүх 12 талбар (L1246–L1258)' },
  'ev.f.event_id': { en: '1. Event ID', mn: '1. Үйл явдлын дугаар' },
  'ev.f.event_type': { en: '2. Event type', mn: '2. Үйл явдлын төрөл' },
  'ev.f.category': { en: '3. Category', mn: '3. Ангилал' },
  'ev.f.severity_level': { en: '4. Severity level (1–5)', mn: '4. Ноцтой байдлын түвшин (1–5)' },
  'ev.f.bus_number': { en: '5. Bus number', mn: '5. Автобусны дугаар' },
  'ev.f.route_number': { en: '6. Route number', mn: '6. Чиглэлийн дугаар' },
  'ev.f.driver_id': { en: '7. Driver ID', mn: '7. Жолоочийн дугаар' },
  'ev.f.location': { en: '8. Location', mn: '8. Байршил' },
  'ev.f.timestamp': { en: '9. Timestamp', mn: '9. Огноо, цаг' },
  'ev.f.detection_source': { en: '10. Detection source', mn: '10. Илрүүлсэн эх сурвалж' },
  'ev.f.description': { en: '11. Description', mn: '11. Тайлбар' },
  'ev.f.associated_alerts': { en: '12. Associated alerts', mn: '12. Холбогдох сэрэмжлүүлэг' },
  'ev.stageNow': { en: 'Current stage', mn: 'Одоогийн үе шат' },
  'ev.workflow': { en: 'Workflow — 7 stages, each logged (L1298–L1310)', mn: 'Ажлын урсгал — 7 үе шат, тус бүр бүртгэгдэнэ (L1298–L1310)' },
  'ev.gateNote': {
    en: 'Compulsory actions gate stage progression and closure (L1346). Only a supervisor may override, with justification, written to the audit log (L1347).',
    mn: 'Заавал хийх арга хэмжээ дуусаагүй бол дараагийн шатанд шилжих, хаах боломжгүй (L1346). Зөвхөн ахлах хянагч үндэслэл бичиж хүчингүй болгох бөгөөд энэ нь аудитын бүртгэлд үлдэнэ (L1347).',
  },
  'ev.overriddenBy': { en: 'Overridden by {by}', mn: '{by} хүчингүй болгосон' },
  'ev.overrideRole': { en: 'Supervisor role required', mn: 'Ахлах хянагчийн эрх шаардлагатай' },
  'ev.overrideMin': { en: 'At least 10 characters', mn: 'Хамгийн багадаа 10 тэмдэгт' },
  'ev.audit': { en: 'Audit trail', mn: 'Аудитын бүртгэл' },
  'ev.select': { en: 'Select an event', mn: 'Үйл явдал сонгоно уу' },
  'ev.manual': { en: 'Create event manually', mn: 'Үйл явдлыг гараар бүртгэх' },
  'ev.manualNote': {
    en: 'Not every event starts with telemetry — call centre, driver, Traffic Police and TCC reports are entered by hand.',
    mn: 'Бүх үйл явдал телеметрээс эхэлдэггүй — дуудлагын төв, жолооч, Замын цагдаа, ЗХУТ-аас ирсэн мэдээллийг гараар оруулна.',
  },
  'ev.src.call_centre': { en: 'Call centre', mn: 'Дуудлагын төв' },
  'ev.src.driver': { en: 'Driver report', mn: 'Жолоочийн мэдээлэл' },
  'ev.src.traffic_police': { en: 'Traffic Police', mn: 'Замын цагдаа' },
  'ev.src.tcc': { en: 'Traffic Control Centre', mn: 'Замын хөдөлгөөний удирдлагын төв' },
  'ev.severitySuggested': { en: 'Suggested severity — operator may change it (R1441)', mn: 'Санал болгосон зэрэглэл — оператор өөрчилж болно (R1441)' },
  'ev.confirm': { en: 'Confirm & create event', mn: 'Батлаад үйл явдал үүсгэх' },
  'ev.cancel': { en: 'Cancel', mn: 'Болих' },
  'ev.closedAt': { en: 'Closed at {t}', mn: 'Хаагдсан: {t}' },
  'ev.actor': { en: 'Actor', mn: 'Гүйцэтгэгч' },

  // ------------------------------------------------ communication module (7)
  'comms.category': { en: 'Category', mn: 'Ангилал' },
  'comms.cat.delay': { en: 'Delay', mn: 'Хоцролт', r: true },
  'comms.cat.disruption': { en: 'Disruption', mn: 'Тасалдал', r: true },
  'comms.cat.diversion': { en: 'Diversion', mn: 'Чиглэл өөрчлөлт', r: true },
  'comms.cat.suspension': { en: 'Suspension', mn: 'Түр зогсолт', r: true },
  'comms.cat.emergency': { en: 'Emergency', mn: 'Онцгой байдал', r: true },
  'comms.cat.special_event': { en: 'Special event', mn: 'Тусгай арга хэмжээ', r: true },
  'comms.cat.weather': { en: 'Weather', mn: 'Цаг агаар', r: true },
  'comms.ch.app': { en: 'Mobile app', mn: 'Гар утасны апп', r: true },
  'comms.ch.social': { en: 'Social media', mn: 'Олон нийтийн сүлжээ', r: true },
  'comms.ch.web': { en: 'Website', mn: 'Вэбсайт', r: true },
  'comms.ch.sms': { en: 'SMS', mn: 'Мессеж', r: true },
  'comms.ch.pis': { en: 'Stop displays (PIS)', mn: 'Буудлын мэдээллийн самбар', r: true },
  'comms.contentEn': { en: 'Content (EN)', mn: 'Агуулга (Англи)' },
  'comms.contentMn': { en: 'Content (MN)', mn: 'Агуулга (Монгол)' },
  'comms.draft': { en: 'Draft for approval', mn: 'Батлуулахаар илгээх' },
  // Seeded by the previous shift (store/seed.ts). Not marked reviewed: the Mongolian is
  // machine-quality like the rest of the unreviewed set.
  'comms.seedMsg': {
    en: 'Route {route}: buses are running with delays after an incident this morning. Please allow extra journey time.',
    mn: '{route} чиглэл: өнөө өглөөний ослоос болж автобуснууд хоцорч байна. Замдаа илүү хугацаа тооцно уу.',
  },
  'comms.approvalGate': {
    en: 'A drafted message is pending approval and is never published until approved (L1443).',
    mn: 'Боловсруулсан мэдээлэл батлагдахыг хүлээж байгаа бөгөөд батлагдах хүртэл нийтлэгдэхгүй (L1443).',
  },
  'comms.messageType': { en: 'Message type', mn: 'Мэдээллийн төрөл' },
  'comms.content': { en: 'Content', mn: 'Агуулга' },
  'comms.autoDrafts': { en: 'Suggested drafts', mn: 'Санал болгосон ноорог' },
  'comms.autoDraftNote': {
    en: 'Rule-derived from open events (L1512–L1518). One click prefills the composer; nothing sends itself.',
    mn: 'Нээлттэй үйл явдлаас дүрмээр үүсгэсэн (L1512–L1518). Нэг товшилтоор маягтыг бөглөнө; автоматаар юу ч илгээхгүй.',
  },
  'comms.requestWording': {
    en: 'PTCC is not a command authority (L718). It validates, requests, informs, coordinates and records — an Operational Instruction to an Operator OCC is worded as a request.',
    mn: 'PTCC тушаал өгөх эрхгүй (L718). Баталгаажуулж, хүсэлт гаргаж, мэдээлж, зохицуулж, бүртгэнэ — автобусны операторын төвд өгөх үйл ажиллагааны зааврыг хүсэлт хэлбэрээр бичнэ.',
  },
  'comms.fields7': { en: 'Passenger message record — 7 fields (L1464–L1471)', mn: 'Зорчигчийн мэдээллийн бүртгэл — 7 талбар (L1464–L1471)' },
  'comms.fields8': { en: 'Coordination record — 8 fields (L1533–L1541)', mn: 'Зохицуулалтын бүртгэл — 8 талбар (L1533–L1541)' },
  'comms.log': { en: 'Message log', mn: 'Мэдээллийн бүртгэл' },
  'comms.empty': { en: 'No messages yet', mn: 'Мэдээлэл хараахан алга' },
  'comms.channel': { en: 'Channel', mn: 'Суваг' },
  'comms.noEvent': { en: 'No event selected', mn: 'Үйл явдал сонгоогүй' },
  'comms.linkedEvent': { en: 'Linked event', mn: 'Холбогдох үйл явдал' },

  'ev.category.operational': { en: 'Operational', mn: 'Үйл ажиллагаа', r: true },
  'ev.category.safety': { en: 'Safety', mn: 'Аюулгүй байдал', r: true },
  'ev.category.security': { en: 'Security', mn: 'Хамгаалалт', r: true },
  'ev.category.equipment': { en: 'Equipment & system', mn: 'Тоног төхөөрөмж', r: true },
  'evidence.CONFIRMED': { en: 'Confirmed', mn: 'Баталгаажсан' },
  'evidence.INFERRED': { en: 'Inferred', mn: 'Дүгнэсэн' },
  'evidence.ASSUMPTION': { en: 'Assumption', mn: 'Таамаг' },
  'evidence.FUTURE': { en: 'Future', mn: 'Ирээдүйд' },
  'scenario.title': { en: 'Scenario', mn: 'Хувилбар' },
  'scenario.none': { en: 'No scenario running', mn: 'Ажиллаж буй хувилбар алга' },
  'multimodal.note': { en: 'Phase 3 — excluded from the PTS-G1 procurement (R368).', mn: '3-р үе шат — PTS-G1 худалдан авалтаас хасагдсан (R368).' },
  'multimodal.taxi': { en: 'Today: a manual morning count of licensed taxis (R964).', mn: 'Одоогоор: тусгай зөвшөөрөлтэй таксийг өглөө бүр гараар тоолдог (R964).' },
  // ------------------------------------------------- regularity / vehicle modules
  'reg.serviceGaps': { en: 'Routes with a service gap', mn: 'Үйлчилгээний завсартай чиглэл' },
  'reg.strip': { en: 'Vehicle spacing along {route}', mn: '{route} чиглэлийн автобус хоорондын зай' },
  'reg.selectRoute': { en: 'Select a route to see its headway.', mn: 'Давтамжийг харахын тулд чиглэл сонгоно уу.' },
  'veh.bus': { en: 'Bus #{id}', mn: '{id} автобус', r: true },
  'veh.unknown': { en: 'Unknown vehicle {id}.', mn: '{id} тээврийн хэрэгсэл олдсонгүй.' },
  'veh.noAlert': { en: 'No active alert on this vehicle.', mn: 'Энэ тээврийн хэрэгсэлд идэвхтэй сэрэмжлүүлэг байхгүй.' },
  'veh.rawIcd': { en: 'Raw ICD fields (Table 8)', mn: 'ICD-ийн боловсруулаагүй талбар (Хүснэгт 8)' },
  'veh.retrieve': { en: 'Retrieve footage', mn: 'Бичлэг татах' },
  'veh.timestamp': { en: 'Timestamp', mn: 'Огноо, цаг' },
  'veh.trigger': { en: 'Auto-open trigger', mn: 'Автоматаар нээх нөхцөл' },
  'veh.noTrigger': { en: 'No video trigger condition is active on this vehicle.', mn: 'Энэ тээврийн хэрэгсэлд видео нээх нөхцөл идэвхгүй байна.' },
  'veh.noIncidents': { en: 'No alerts or events reference this vehicle.', mn: 'Энэ тээврийн хэрэгсэлтэй холбоотой сэрэмжлүүлэг, үйл явдал алга.' },
  'veh.playbook': { en: 'Open playbook', mn: 'Арга хэмжээний заавар нээх' },

  // ------------------------------------------------ passenger intelligence (added)
  'pax.chain': {
    en: 'Demand → Boarding → Occupancy → Capacity → Overcrowding → Operational action',
    mn: 'Эрэлт → Суулт → Ачаалал → Багтаамж → Хэт ачаалал → Үйл ажиллагааны арга хэмжээ',
  },
  'pax.chainNote': {
    en: 'Occupancy and boardings are source metrics (Table 8, APC/AFC). Demand itself is inferred — no source measures unserved demand.',
    mn: 'Ачаалал, суулт нь эх сурвалжийн үзүүлэлт (Хүснэгт 8, зорчигч тоологч / AFC). Эрэлтийг дүгнэсэн — хангагдаагүй эрэлтийг ямар ч эх сурвалж хэмждэггүй.',
  },
  'pax.loadBands': { en: 'Load bands (Slide 8)', mn: 'Ачааллын түвшин (8-р слайд)' },
  'pax.loadBandsNote': {
    en: 'The only numeric threshold set that exists in the client material. Used verbatim.',
    mn: 'Захиалагчийн материалд байгаа цорын ганц тоон босгын багц. Өөрчлөлтгүй ашигласан.',
  },
  'pax.avgLoad': { en: 'Avg. load', mn: 'Дундаж ачаалал' },
  'pax.band': { en: 'Band', mn: 'Түвшин' },
  'pax.demandHeat': { en: 'Demand heat by route', mn: 'Чиглэл тус бүрийн эрэлтийн эрчим' },
  'pax.topByBoardings': { en: 'Top routes by boardings', mn: 'Суултаар тэргүүлэх чиглэл' },
  'pax.bottomByBoardings': { en: 'Lowest routes by boardings (R1162)', mn: 'Суулт хамгийн бага чиглэл (R1162)' },
  'pax.boardings': { en: 'Boardings', mn: 'Суулт' },
  'pax.waitingBasis': { en: '≈ observed headway {gap} min ÷ 2 on {route}', mn: '≈ {route} чиглэлийн ажиглагдсан давтамж {gap} мин ÷ 2' },
  'pax.noOvercrowding': { en: 'No route is at or above the overcrowding threshold.', mn: 'Хэт ачааллын босгод хүрсэн чиглэл алга.' },
  'pax.action': { en: 'Request OCC: add standby bus / hold trailing bus (headway control)', mn: 'Операторын төвөөс хүсэх: нөөц автобус нэмэх / араас яваа автобусыг саатуулах (давтамж тохируулга)' },

  // ------------------------------------------------ operators (added)
  'op.title': { en: 'Operator Performance & Revenue', mn: 'Операторын гүйцэтгэл, орлого' },
  'op.operator': { en: 'Operator', mn: 'Оператор' },
  'op.fareNote': {
    en: 'Revenue = boardings × 500 ₮. No fare figure exists in any source — 500 ₮ is a demo assumption. Fare fixation sits with PTPD (R992).',
    mn: 'Орлого = суулт × 500 ₮. Тарифын дүн аль ч эх сурвалжид байхгүй — 500 ₮ нь демо таамаг. Тарифыг НТГ тогтооно (R992).',
  },
  'op.revenueVariance': { en: 'Revenue variance {pct} %', mn: 'Орлогын хазайлт {pct} %' },
  'op.revenueVarianceNote': {
    en: "AFC-recorded revenue is below revenue expected from APC boardings because {n} of this operator's AFC validators are offline. The design document's own hypothesis for this pattern is a potential fare-system malfunction (L1092–L1097).",
    mn: 'AFC-ээр бүртгэсэн орлого APC-ийн суултаас тооцсон орлогоос бага байна, учир нь энэ операторын {n} AFC карт уншигч тасарсан. Зураг төсөлд энэ хэв шинжийг төлбөрийн системийн болзошгүй доголдол гэж үзсэн (L1092–L1097).',
  },
  'op.recorded': { en: 'AFC-recorded revenue', mn: 'AFC-ээр бүртгэсэн орлого' },
  'op.expected': { en: 'Expected from boardings', mn: 'Суултаас хүлээгдэх орлого' },
  'op.topRevenue': { en: 'Top 10 routes by revenue', mn: 'Орлогоор эхний 10 чиглэл' },
  'op.bottomRevenue': { en: 'Bottom 10 routes by revenue', mn: 'Орлогоор сүүлийн 10 чиглэл' },
  'op.kmHourNote': {
    en: 'T-Box calculates KM-Hour for operator payment today; that basis moves to the BMS (R958). Contracts are to become performance-based on PTCC data (R931). No payment amount is shown — any payment formula would be an assumption.',
    mn: 'Одоо T-Box операторын төлбөрийн км-цагийг тооцдог; энэ суурь BMS руу шилжинэ (R958). Гэрээг PTCC-ийн өгөгдөлд суурилсан гүйцэтгэлийн гэрээ болгоно (R931). Төлбөрийн дүн харуулаагүй — ямар ч томьёо таамаг болно.',
  },
  'op.roleFiltered': {
    en: 'Bus Operator OCC role — you see only your own fleet.',
    mn: 'Автобусны операторын төвийн эрх — зөвхөн өөрийн паркаа харна.',
  },
  'op.kmVsOnTime': { en: 'Service km and on-time % by operator', mn: 'Оператор тус бүрийн үйлчилгээний км, цагтаа гүйцэтгэл (%)' },

  // ------------------------------------------------ fleet health (added)
  'health.confirmedSection': { en: 'Device status monitoring', mn: 'Төхөөрөмжийн төлөвийн хяналт' },
  'health.noOffline': { en: 'All devices reporting.', mn: 'Бүх төхөөрөмж мэдээлэл илгээж байна.' },
  'health.bus': { en: 'Bus', mn: 'Автобус' },
  'health.formula': {
    en: 'health = 100 − 15 × (devices offline) − 10 × (seeded wear term 0–4). Weights are demo assumptions, not a model. PTCC receives device status and telematics alerts, not a health score.',
    mn: 'оноо = 100 − 15 × (тасарсан төхөөрөмж) − 10 × (өгөгдсөн элэгдлийн коэффициент 0–4). Жин нь демо таамаг, загвар биш. PTCC төхөөрөмжийн төлөв, телематикийн сэрэмжлүүлэг хүлээн авдаг — техникийн төлөвийн оноо биш.',
  },
  'health.risk.low': { en: 'Low', mn: 'Бага' },
  'health.risk.elevated': { en: 'Elevated', mn: 'Нэмэгдсэн' },
  'health.risk.high': { en: 'High', mn: 'Өндөр' },
  'health.risk.critical': { en: 'Critical', mn: 'Ноцтой' },
  'health.act.low': { en: 'None', mn: 'Шаардлагагүй' },
  'health.act.elevated': { en: 'Inspect at next depot return (Minor Equipment Failure playbook)', mn: 'Дараа баазад ирэхэд шалгах (тоног төхөөрөмжийн бага гэмтлийн заавар)' },
  'health.act.high': { en: 'Schedule inspection within 7 days; consider swap-out at peak', mn: '7 хоногийн дотор үзлэг товлох; оргил цагт солихыг авч үзэх' },
  'health.act.critical': { en: 'Withdraw at end of trip; Breakdown playbook pre-staged', mn: 'Рейсийн төгсгөлд үйлчилгээнээс татах; эвдрэлийн зааврыг урьдчилан бэлтгэх' },
  'health.components': { en: 'Component servicing and cost (client-named categories)', mn: 'Эд ангийн засвар, зардал (захиалагчийн нэрлэсэн ангилал)' },
  'health.componentNote': {
    en: 'The five categories named by the client. These are servicing and cost categories, not telemetry signals — PTCC has no sensor for tyre or clutch wear.',
    mn: 'Захиалагчийн нэрлэсэн таван ангилал. Эдгээр нь засвар, зардлын ангилал бөгөөд телеметрийн дохио биш — PTCC-д дугуй, шүүрэгний элэгдлийн мэдрэгч байхгүй.',
  },
  'health.nextService': { en: 'Next service (est.)', mn: 'Дараагийн засвар (тооцоо)' },
  'health.annualCost': { en: 'Annual cost', mn: 'Жилийн зардал' },
  'health.costPerBus': { en: 'Cost lines per bus', mn: 'Автобус тутмын зардлын задаргаа' },
  'health.annualKm': { en: 'Annual km (assumed)', mn: 'Жилийн км (таамаг)' },
  'health.priorityQueue': { en: 'Priority queue — risk × passenger exposure', mn: 'Эрэмбэлсэн жагсаалт — эрсдэл × зорчигчид үзүүлэх нөлөө' },
  'health.priorityNote': {
    en: "Ordering reuses the deck's own logic that a deviation matters more when passenger impact is high (S8). The risk term itself is invented.",
    mn: 'Эрэмбэ нь зорчигчид үзүүлэх нөлөө өндөр үед зөрчил илүү чухал гэсэн слайдын логикийг ашигласан (S8). Эрсдэлийн хэмжигдэхүүн нь зохиомол.',
  },
  'health.exposure': { en: 'Exposure', mn: 'Нөлөө' },
  'health.selectBus': { en: 'Select a bus from the queue or the offline lists.', mn: 'Дараалал эсвэл тасарсан төхөөрөмжийн жагсаалтаас автобус сонгоно уу.' },
  'health.input1': { en: 'Spend per bus per year, by operator', mn: 'Оператор тус бүрийн автобус тутмын жилийн зардал' },
  'health.input2': { en: 'Maintenance spend split by type A and type B service', mn: 'Засварын зардал, А ба Б төрлийн үйлчилгээгээр' },
  'health.input3': { en: 'Component spend and replacement intervals: brakes, tyres, clutches', mn: 'Эд ангийн зардал, солих интервал: тоормос, дугуй, шүүрэлт' },
  'health.input4': { en: 'Fuel/gas and electricity cost per bus, and the fleet mix (diesel / CNG / electric)', mn: 'Автобус тутмын түлш/хий, цахилгааны зардал ба паркийн бүрэлдэхүүн (дизель / CNG / цахилгаан)' },
  'health.input5': { en: 'Driver salary cost per bus or per km', mn: 'Автобус эсвэл км тутмын жолоочийн цалингийн зардал' },
  'health.input6': { en: 'Insurance premium per bus; annual accident cost', mn: 'Автобус тутмын даатгалын хураамж; жилийн ослын зардал' },
  'health.input7': { en: 'Annual km per bus — and whether the T-Box KM-Hour figure (R958) is usable for it', mn: 'Автобус тутмын жилийн км — T-Box-ын км-цагийн тоо (R958) үүнд ашиглагдах эсэх' },
  'health.input8': { en: 'Which body holds these numbers, PTPD or the operators, and in what system', mn: 'Эдгээр тоо хэнд байдаг — НТГ эсвэл операторуудад, ямар системд' },
  'health.electricityNote': {
    en: 'The client listed "electricity" beside "gas", implying an electric or hybrid element. No other source mentions one — the line is present and zeroed; nothing is built on it.',
    mn: 'Захиалагч "хий"-н хажууд "цахилгаан"-ыг дурдсан нь цахилгаан эсвэл хайбрид автобус байгааг илтгэнэ. Өөр эх сурвалжид дурдаагүй — мөрийг тэг утгатай оруулсан; үүн дээр юу ч тулгуурлаагүй.',
  },

  // ------------------------------------------------ cost & roi (added)
  'roi.banner': {
    en: 'Proposed — consulting value proposition. No source data; every figure simulated. The detailed design places predictive functions outside PTCC scope (R1096) — PTCC would visualise these outputs, not compute them.',
    mn: 'Санал болгож буй — зөвлөхийн үнэ цэнийн санал. Эх өгөгдөл байхгүй; бүх тоо загварчилсан. Зураг төсөлд урьдчилан таамаглах чиг үүргийг PTCC-ийн хүрээнээс гадуур тооцсон (R1096) — PTCC эдгээр үр дүнг тооцохгүй, зөвхөн харуулна.',
  },
  'roi.tabCost': { en: 'Cost & ROI (Inferred)', mn: 'Зардал ба ROI (дүгнэсэн)' },
  'roi.tabFleet': { en: 'Fleet sizing (Assumption)', mn: 'Паркийн хэмжээ (таамаг)' },
  'roi.baseline': { en: 'Baseline spend per km', mn: 'Км тутмын суурь зардал' },
  'roi.projected': { en: 'Projected with predictive maintenance', mn: 'Урьдчилан таамаглах засвартай үеийн тооцоо' },
  'roi.annualSaving': { en: 'Annual saving (fleet)', mn: 'Жилийн хэмнэлт (парк)' },
  'roi.sliderNote': {
    en: 'The slider exists so nobody mistakes the output for a calculation. The saving percentage is an input you choose, not a result the demo derived.',
    mn: 'Гулсагч нь үр дүнг тооцоолол гэж андуурахаас сэргийлнэ. Хэмнэлтийн хувийг та өөрөө сонгоно — демо үүнийг тооцоогүй.',
  },
  'roi.perOperator': { en: 'Simulated cost by operator', mn: 'Оператороор загварчилсан зардал' },
  'roi.fleetTotal': { en: 'Fleet annual spend', mn: 'Паркийн жилийн зардал' },
  'roi.peakRequirement': { en: 'Peak vehicle requirement', mn: 'Оргил цагийн автобусны хэрэгцээ' },
  'roi.currentFleet': { en: 'Current fleet in service', mn: 'Одоо үйлчилж буй парк' },
  'roi.gap': { en: 'Gap', mn: 'Зөрүү' },
  'roi.speedSlider': { en: 'Assumed central peak speed (km/h)', mn: 'Төвийн оргил цагийн таамагласан хурд (км/ц)' },
  'roi.speedNote': {
    en: 'Changing the assumed peak speed changes cycle time and therefore the answer. The 8 km/h central-peak figure is client-directed and matches the single instantaneous reading on Slide 5 — applying it as a peak mean is our inference.',
    mn: 'Таамагласан оргил хурдыг өөрчлөхөд эргэлтийн хугацаа, улмаар хариулт өөрчлөгдөнө. Төвийн оргил цагийн 8 км/ц-ыг захиалагч заасан бөгөөд 5-р слайдын агшин зуурын утгатай тохирно — үүнийг оргил цагийн дундаж болгон ашигласан нь бидний дүгнэлт.',
  },
  'roi.fleetFormula': {
    en: 'peak vehicles per route ≈ ceil(cycle time ÷ planned headway), summed over operating routes. Cycle time = 2 × route length ÷ assumed peak speed. Planned headway is a synthesised timetable — no timetable source exists.',
    mn: 'Чиглэл тутмын оргил цагийн автобус ≈ ceil(эргэлтийн хугацаа ÷ төлөвлөсөн давтамж), ажиллаж буй чиглэлээр нэгтгэнэ. Эргэлтийн хугацаа = 2 × чиглэлийн урт ÷ таамагласан оргил хурд. Төлөвлөсөн давтамж нь зохиомол хуваарь — хуваарийн эх сурвалж байхгүй.',
  },
  'roi.fleetRefusal': {
    en: 'This is not a quantity calculator. Peak vehicle requirement needs real cycle times, fleet-by-route allocation, spare ratio and depot constraints — none of which exist in any source.',
    mn: 'Энэ нь тоо хэмжээ тооцоолуур биш. Оргил цагийн хэрэгцээг тооцоход бодит эргэлтийн хугацаа, чиглэлээрх паркийн хуваарилалт, нөөцийн харьцаа, баазын хязгаарлалт шаардлагатай — эдгээрийн аль нь ч эх сурвалжид байхгүй.',
  },

  // ------------------------------------------------ copilot answers (Tier 4 surface)
  // No literal digits in any of these templates: every number in an answer must come
  // from the resolver's facts, so the prose can be checked against them (plan 22.5).
  'cop.dataTier': { en: 'Data', mn: 'Өгөгдөл' },
  'cop.offline': { en: 'Offline — scripted answers, no network call', mn: 'Офлайн — бэлтгэсэн хариулт, сүлжээнд хандахгүй' },
  'cop.a.empty': { en: 'The simulation has not produced a snapshot yet.', mn: 'Загварчлал хараахан төлөв гаргаагүй байна.' },
  'cop.a.lookFirst': {
    en: 'Open alerts: {critical} critical, {warning} warning, {info} informational. By impact score: {list}.',
    mn: 'Нээлттэй сэрэмжлүүлэг: {critical} ноцтой, {warning} анхааруулга, {info} мэдээлэл. Нөлөөгөөр эрэмбэлбэл: {list}.',
  },
  'cop.a.lookFirstNone': { en: 'No open alerts. Buses in service: {inservice}.', mn: 'Нээлттэй сэрэмжлүүлэг алга. Үйлчилгээнд буй автобус: {inservice}.' },
  'cop.a.why': {
    en: '{route}: {vehicles} buses in service, mean deviation {mean} min, worst {bus} at {dev} min, speed {speed} km/h. Dominant cause: {cause}.',
    mn: '{route}: үйлчилгээнд {vehicles} автобус, дундаж зөрүү {mean} мин, хамгийн их нь {bus} — {dev} мин, хурд {speed} км/ц. Гол шалтгаан: {cause}.',
  },
  'cop.a.whyNoRoute': { en: 'Name a route, for example {route}.', mn: 'Чиглэлээ нэрлэнэ үү, жишээ нь {route}.' },
  'cop.cause.congestion': {
    en: 'congestion — mean speed on the route is {speed} km/h against a planned {planned} km/h',
    mn: 'түгжрэл — чиглэлийн дундаж хурд {speed} км/ц, төлөвлөсөн нь {planned} км/ц',
  },
  'cop.cause.dwell': {
    en: 'dwell and boarding time — the buses are moving but losing {mean} min against the synthesised timetable',
    mn: 'буудлын зогсолт, суултын хугацаа — автобуснууд явж байгаа ч зохиомол хуваариас {mean} мин хоцорч байна',
  },
  'cop.cause.device': { en: 'a device fault — {n} on-board device(s) offline on this route', mn: 'төхөөрөмжийн гэмтэл — энэ чиглэлд {n} бортын төхөөрөмж тасарсан' },
  'cop.cause.event': { en: 'an open event on this route ({id}, {type})', mn: 'энэ чиглэлд нээлттэй үйл явдал ({id}, {type})' },
  'cop.a.speedNote': { en: 'Speed is an instantaneous reading (ICD), not an average.', mn: 'Хурд нь агшин зуурын утга (ICD), дундаж биш.' },
  'cop.a.whereBus': {
    en: '{bus} ({operator}, {route}): {status}, speed {speed} km/h, deviation {dev} min, load {load} % ({pax} of {cap}). Next stop {stop}, {dist} m. Devices offline: {devices}.',
    mn: '{bus} ({operator}, {route}): {status}, хурд {speed} км/ц, зөрүү {dev} мин, ачаалал {load} % ({pax}/{cap}). Дараагийн буудал {stop}, {dist} м. Тасарсан төхөөрөмж: {devices}.',
  },
  'cop.a.busUnknown': { en: 'No bus matches that id.', mn: 'Тийм дугаартай автобус алга.' },
  'cop.a.overcrowded': {
    en: '{n} route(s) at or above the load threshold of {th} %: {list}.',
    mn: 'Ачаалал босгод ({th} %) хүрсэн буюу давсан {n} чиглэл: {list}.',
  },
  'cop.a.overcrowdedNone': {
    en: 'No route is at or above the load threshold of {th} %. Highest is {route} at {pct} %.',
    mn: 'Ачаалал босгод ({th} %) хүрсэн чиглэл алга. Хамгийн өндөр нь {route} — {pct} %.',
  },
  'cop.a.device': {
    en: 'Offline now: AFC {afc}, CCTV {cctv}, T-Box {tbox}. System health {health} %. {pattern}',
    mn: 'Одоо тасарсан: AFC {afc}, камер {cctv}, T-Box {tbox}. Системийн төлөв {health} %. {pattern}',
  },
  'cop.a.devicePattern': { en: 'Repeated-failure pattern: operator {op} accounts for {n} offline devices.', mn: 'Давтагдсан гэмтлийн хэв шинж: тасарсан {n} төхөөрөмж {op} операторт ногдож байна.' },
  'cop.a.deviceNoPattern': { en: 'No operator is above the repeated-failure count.', mn: 'Давтагдсан гэмтлийн босгоос давсан оператор алга.' },
  'cop.a.operators': { en: 'Service km today: {km}. On-time: {ot}.', mn: 'Өнөөдрийн үйлчилгээний км: {km}. Цагтаа гүйцэтгэл: {ot}.' },
  'cop.a.recommend': {
    en: 'Event {id} ({type}), {playbook} playbook, stage {stage}. Recommended: {rec}. Compulsory: {comp}. Compulsory actions gate the stage named beside each one; only a supervisor may override, with justification.',
    mn: 'Үйл явдал {id} ({type}), {playbook} заавар, үе шат: {stage}. Зөвлөмж: {rec}. Заавал: {comp}. Заавал хийх арга хэмжээ бүр хажууд нь заасан үе шатыг түгжинэ; зөвхөн ахлах хянагч үндэслэлтэйгээр хүчингүй болгож болно.',
  },
  'cop.a.noEvent': {
    en: 'No open event. An alert is not an event until an operator validates it.',
    mn: 'Нээлттэй үйл явдал алга. Оператор баталгаажуулаагүй бол сэрэмжлүүлэг үйл явдал болохгүй.',
  },
  'cop.a.openEvents': { en: 'Open events: {n}. {list}.', mn: 'Нээлттэй үйл явдал: {n}. {list}.' },
  'cop.a.openEventsNone': { en: 'No open events.', mn: 'Нээлттэй үйл явдал алга.' },
  'cop.a.brief': {
    en: 'Handover snapshot {time}. Open events: {events} ({stages}). Critical alerts open: {critical}. Feed: {feed}. Thresholds changed this shift: {changed}. Passenger messages awaiting approval: {pending}.',
    mn: 'Ээлж хүлээлцэх төлөв {time}. Нээлттэй үйл явдал: {events} ({stages}). Нээлттэй ноцтой сэрэмжлүүлэг: {critical}. Өгөгдлийн урсгал: {feed}. Энэ ээлжид өөрчилсөн босго: {changed}. Батлахыг хүлээж буй зорчигчийн мэдээлэл: {pending}.',
  },
  'cop.a.feedOk': { en: 'ok', mn: 'хэвийн' },
  'cop.a.feedStale': { en: 'stale', mn: 'шинэчлэгдээгүй' },
  'cop.a.none': { en: 'none', mn: 'байхгүй' },
  'cop.a.threshold': {
    en: 'Current values: {list}. Every one of these parameters is named in the design document; none is given a value there, so each is a demo default.',
    mn: 'Одоогийн утга: {list}. Эдгээр үзүүлэлт бүрийг зураг төсөлд нэрлэсэн ч утга заагаагүй тул бүгд демо утга.',
  },
  'cop.p.openAlerts': { en: 'Open Alerts & Events', mn: 'Сэрэмжлүүлэг, үйл явдал нээх' },
  'cop.p.openRoute': { en: 'Open route regularity', mn: 'Чиглэлийн тогтмол байдал нээх' },
  'cop.p.openBus': { en: 'Open vehicle detail', mn: 'Тээврийн хэрэгслийн дэлгэрэнгүй нээх' },
  'cop.p.openHealth': { en: 'Open Fleet Health', mn: 'Системийн найдвартай байдал нээх' },
  'cop.p.openPassenger': { en: 'Open Passenger Intelligence', mn: 'Зорчигчийн эрэлт, ачаалал нээх' },
  'cop.p.openOperators': { en: 'Open Operator Performance', mn: 'Операторын гүйцэтгэл нээх' },
  'cop.p.openSettings': { en: 'Open Thresholds & Settings', mn: 'Босго, тохиргоо нээх' },
  'cop.p.openAnalytics': { en: 'Open Analytics & Review', mn: 'Шинжилгээ, дүгнэлт нээх' },
  'cop.p.openComms': { en: 'Open Communication', mn: 'Мэдээлэл, харилцаа нээх' },

  // ------------------------------------------------ settings module
  'set.role': { en: 'Role', mn: 'Үүрэг' },
  'set.evidence': { en: 'Evidence badges', mn: 'Нотолгооны тэмдэг' },
  'set.on': { en: 'On', mn: 'Идэвхтэй' },
  'set.off': { en: 'Off', mn: 'Идэвхгүй' },
  'set.llm': { en: 'Language-model answers (read-only flag)', mn: 'LLM-ийн хариулт (зөвхөн харах)' },
  'set.llmNote': {
    en: 'Off for the venue run. With the flag off the Copilot never touches the network; answers are scripted templates filled from live state.',
    mn: 'Танилцуулгын үеэр идэвхгүй. Идэвхгүй үед туслах сүлжээнд огт хандахгүй; хариултыг бодит төлвөөр бөглөсөн бэлэн загвараар гаргана.',
  },
  'set.legendS7': { en: 'Three-state (Normal / Slower / Disrupted) — Slide 7', mn: 'Гурван төлөв (Хэвийн / Ердийнхөөс удаан / Тасалдсан) — 7-р слайд' },
  'set.legendS5': { en: 'Four-state (adds No service) — Slide 5', mn: 'Дөрвөн төлөв (Үйлчилгээгүй нэмэгдэнэ) — 5-р слайд' },
  'set.noValueNote': {
    en: 'The design document names every parameter below and gives a value for none of them. Each value here is a demo default chosen so the scenarios read correctly; PTCC administrators configure them in the real system.',
    mn: 'Зураг төсөлд доорх үзүүлэлт бүрийг нэрлэсэн ч нэгд нь ч утга өгөөгүй. Энд байгаа утга бүр хувилбарууд зөв харагдахаар сонгосон демо утга; бодит системд PTCC-ийн администратор тохируулна.',
  },
  'set.changeNote': { en: 'Changing a value re-evaluates the rules immediately.', mn: 'Утгыг өөрчлөхөд дүрмүүд шууд дахин үнэлэгдэнэ.' },
  'set.unreviewed': { en: 'Mongolian strings awaiting native review', mn: 'Эх хэлтний хяналт хүлээж буй монгол бичвэр' },
  'set.provTimetable': { en: 'Planned service (timetable)', mn: 'Төлөвлөсөн үйлчилгээ (хуваарь)' },
  'set.provGeometry': { en: 'Route geometry', mn: 'Чиглэлийн геометр' },
  'set.provGeometryNote': {
    en: 'Partly synthetic: the corridors named in the deck are placed on real streets; the remaining routes are generated.',
    mn: 'Хэсэгчлэн зохиомол: слайдад нэрлэсэн коридоруудыг бодит гудамжаар байрлуулсан; бусад чиглэлийг үүсгэсэн.',
  },
  'set.provValues': { en: 'Operational values', mn: 'Үйл ажиллагааны утгууд' },
  'set.provValuesNote': { en: 'All simulated. No live feed is connected in this build.', mn: 'Бүгд загварчилсан. Энэ хувилбарт шууд өгөгдөл холбогдоогүй.' },
  'set.provCost': { en: 'Cost inputs', mn: 'Зардлын өгөгдөл' },
  'set.provCostNote': { en: 'Do not exist. No cost data has been supplied by PTPD.', mn: 'Байхгүй. НТГ-аас зардлын өгөгдөл ирээгүй.' },

  // ------------------------------------------------ analytics & post-incident review
  'an.pickEvent': { en: 'Select an event to review', mn: 'Дүгнэлт хийх үйл явдлаа сонгоно уу' },
  'an.none': { en: 'No events yet. Validate an alert to create one.', mn: 'Үйл явдал хараахан алга. Үүсгэхийн тулд сэрэмжлүүлэг баталгаажуулна уу.' },
  'an.timeline': { en: 'Reconstructed timeline', mn: 'Сэргээсэн үйл явдлын дараалал' },
  'an.impact': { en: 'Service reliability impact', mn: 'Үйлчилгээний найдвартай байдалд үзүүлсэн нөлөө' },
  'an.impactNote': { en: 'Largest headway gap on the affected route, before / during / after the event.', mn: 'Холбогдох чиглэлийн давтамжийн хамгийн их завсар — үйл явдлын өмнө / үед / дараа.' },
  'an.report': { en: 'Daily Event Report', mn: 'Өдрийн үйл явдлын тайлан' },
  'an.learn': { en: 'Learn & Improve', mn: 'Сургамж, сайжруулалт' },
  'an.learnNote': { en: 'Generated from the rule records only — no model, no prediction.', mn: 'Зөвхөн дүрмийн бүртгэлээс гаргасан — загвар, таамаглал байхгүй.' },
  'an.export': { en: 'Export timeline (JSON)', mn: 'Дарааллыг экспортлох (JSON)' },
  'an.total': { en: 'Total events', mn: 'Нийт үйл явдал' },
  'an.byType': { en: 'By type', mn: 'Төрлөөр' },
  'an.bySeverity': { en: 'By severity', mn: 'Ноцтой байдлаар' },
  'an.resolved': { en: 'Closed', mn: 'Хаагдсан' },
  'an.stillOpen': { en: 'Still open', mn: 'Нээлттэй хэвээр' },
  'an.avgClose': { en: 'Mean time to closure', mn: 'Хаах хүртэлх дундаж хугацаа' },
  'an.tl.alert': { en: 'Alert', mn: 'Сэрэмжлүүлэг' },
  'an.tl.stage': { en: 'Stage', mn: 'Үе шат' },
  'an.tl.action': { en: 'Action completed', mn: 'Гүйцэтгэсэн арга хэмжээ' },
  'an.tl.comm': { en: 'Communication', mn: 'Харилцаа' },
  'an.obsThreshold': {
    en: 'At a {alt}-minute service-gap threshold this event would have alerted about {min} minutes earlier, at a cost of roughly {extra} additional alerts per day at the current network state.',
    mn: 'Үйлчилгээний завсрын босго {alt} минут байсан бол энэ үйл явдлын сэрэмжлүүлэг ойролцоогоор {min} минутын өмнө гарах байсан ч сүлжээний одоогийн төлөвт өдөрт ойролцоогоор {extra} нэмэлт сэрэмжлүүлэг үүснэ.',
  },
  'an.obsCompulsory': {
    en: 'Compulsory actions: {done} of {n} complete. They gate stage progression and closure.',
    mn: 'Заавал хийх арга хэмжээ: {done}/{n} гүйцэтгэсэн. Эдгээр нь үе шат ахих болон хаалтыг түгжинэ.',
  },
  'an.obsComms': { en: 'Communications sent on this event: {n}.', mn: 'Энэ үйл явдлаар илгээсэн мэдэгдэл: {n}.' },
  'an.obsAlerts': { en: 'Alerts attached to this event: {n}, the earliest raised at {at}.', mn: 'Энэ үйл явдалд холбогдсон сэрэмжлүүлэг: {n}, хамгийн анхных нь {at}.' },

  // ------------------------------------------------ multimodal (Phase 3)
  'mm.taxi': { en: 'Taxi', mn: 'Такси' },
  'mm.brt': { en: 'Bus Rapid Transit (BRT)', mn: 'Хурдны автобус (BRT)' },
  'mm.lrt': { en: 'Light Rail Transit (LRT)', mn: 'Хөнгөн төмөр зам (LRT)' },
  'mm.metro': { en: 'Metro', mn: 'Метро' },
  'mm.cable': { en: 'Cable car', mn: 'Кабин тээвэр' },
  'mm.fields': { en: 'Required API data structure', mn: 'Шаардагдах API өгөгдлийн бүтэц' },
  'mm.noData': { en: 'No data — no interface exists today.', mn: 'Өгөгдөл байхгүй — одоогоор холболт алга.' },
  'mm.consume': {
    en: 'PTCC consumes monitoring data only; it does not control any of these systems.',
    mn: 'PTCC зөвхөн хяналтын өгөгдөл хүлээн авна; эдгээр системийг удирдахгүй.',
  },
} as const satisfies Record<string, Entry>;

/*
 * Area dictionaries live in their own files so that work on the agent layer, the role
 * dashboards, the map and the remaining modules cannot collide in one shared file.
 * Keys must be globally unique; a duplicate key is a compile error below.
 */
const merged = { ...d, ...agenticDict, ...rolesDict, ...mapDict, ...modulesDict, ...overlayDict, ...dashDict, ...copilotDict, ...kitDict, ...roiDict, ...predictDict, ...depotDict, ...sopDict, ...insightDict, ...uxccDict, ...uxregDict, ...uxvehDict, ...uxrpDict, ...mnfixDict, ...supportDict };

export type I18nKey = keyof typeof merged;

/**
 * Widen the values to `Entry`.
 *
 * `as const satisfies` keeps the key literals (which is what makes I18nKey useful)
 * but infers each value as its own literal shape - so entries written without `r`
 * have no `r` property at all, and `dict[k].r` fails to type-check. Re-exporting
 * through an explicit Record<I18nKey, Entry> keeps the keys and widens the values.
 */
export const dict: Record<I18nKey, Entry> = merged;
