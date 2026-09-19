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
  'app.wallMode': { en: 'Video wall', mn: 'Дэлгэцийн хана' },
  'app.operatorMode': { en: 'Operator', mn: 'Оператор' },
  'app.paused': { en: 'Paused', mn: 'Түр зогсоосон' },
  'app.live': { en: 'Live', mn: 'Шууд' },

  // ---------------------------------------------------------------- nav
  'nav.command': { en: 'Command Centre', mn: 'Удирдлагын төв' },
  'nav.map': { en: 'Live Fleet Map', mn: 'Тээврийн хэрэгслийн зураг' },
  'nav.regularity': { en: 'Route & Service Regularity', mn: 'Үйлчилгээний тогтмол байдал', r: true },
  'nav.vehicle': { en: 'Vehicle Detail', mn: 'Тээврийн хэрэгслийн дэлгэрэнгүй' },
  'nav.passenger': { en: 'Passenger Intelligence', mn: 'Зорчигчийн эрэлт, ачаалал', r: true },
  'nav.alerts': { en: 'Alerts & Events', mn: 'Сэрэмжлүүлэг ба үйл явдал' },
  'nav.comms': { en: 'Communication', mn: 'Харилцаа холбоо' },
  'nav.health': { en: 'Fleet Health', mn: 'Системийн найдвартай байдал', r: true },
  'nav.operators': { en: 'Operator Performance', mn: 'Операторын гүйцэтгэл', r: true },
  'nav.copilot': { en: 'Ops Copilot', mn: 'Үйл ажиллагааны туслах' },
  'nav.roi': { en: 'Cost & ROI', mn: 'Зардал ба өгөөж' },
  'nav.analytics': { en: 'Analytics & Review', mn: 'Шинжилгээ ба дүгнэлт' },
  'nav.settings': { en: 'Thresholds & Settings', mn: 'Босго ба тохиргоо' },
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
  'legend.note': { en: 'Slide 7 legend (client-confirmed). Slide 5 alternative available in Settings.', mn: '7-р слайдын тэмдэглэгээ (баталгаажсан).' },
  // Slide 5 alternative wording (four states). The deck's two legends are
  // unreconciled; the demo defaults to S7 and names the choice.
  'legend.onTime': { en: 'On time', mn: 'Цагтаа' },
  'legend.slightDelay': { en: 'Slight delay', mn: 'Бага зэрэг хоцролт' },
  'legend.majorDelay': { en: 'Major delay', mn: 'Их хоцролт' },
  'legend.noteS5': { en: 'Slide 5 legend. Slide 7 three-state is the client-confirmed default.', mn: '5-р слайдын тэмдэглэгээ. 7-р слайдын 3 төлөв нь үндсэн сонголт.' },
  'map.byDelay': { en: 'By delay', mn: 'Хоцролтоор' },
  'map.byLoad': { en: 'By load', mn: 'Ачаалалаар' },

  // ---------------------------------------------------------------- load bands (S8)
  'band.over90': { en: '> 90 %', mn: '> 90 %', r: true },
  'band.70to90': { en: '70 – 90 %', mn: '70 – 90 %', r: true },
  'band.50to70': { en: '50 – 70 %', mn: '50 – 70 %', r: true },
  'band.30to50': { en: '30 – 50 %', mn: '30 – 50 %', r: true },
  'band.under30': { en: '< 30 %', mn: '< 30 %', r: true },

  // ---------------------------------------------------------------- alerts
  'alerts.priority': { en: 'Priority Alerts', mn: 'Нэн тэргүүний сэрэмжлүүлэг', r: true },
  'alerts.showingTop': { en: 'Showing top {n} of {total}', mn: '{total}-аас эхний {n}-г харуулж байна' },
  'alerts.none': { en: 'No active alerts', mn: 'Идэвхтэй сэрэмжлүүлэг байхгүй' },
  'alerts.fewer': { en: 'Fewer alerts, more useful alerts.', mn: 'Цөөн боловч илүү ашигтай сэрэмжлүүлэг.', r: true },
  'alert.service_gap': { en: '{route} gap {min} min', mn: '{route} {min} минутын завсар', r: true },
  'alert.bunching': { en: '{route} bunching ({n})', mn: '{route} бөөгнөрөл ({n})' },
  'alert.delay': { en: '{route} delay {min} min', mn: '{route} {min} минут хоцорч байна' },
  'alert.overcrowding': { en: '{route} load {pct} %', mn: '{route} ачаалал {pct} %', r: true },
  'alert.panic': { en: 'Bus {bus} emergency', mn: '{bus} автобус яаралтай дохио', r: true },
  'alert.breakdown': { en: 'Bus {bus} breakdown', mn: '{bus} автобус эвдэрсэн' },
  'alert.accident': { en: 'Bus {bus} accident', mn: '{bus} автобус осол' },
  'alert.route_deviation': { en: 'Bus {bus} route deviation', mn: '{bus} маршрутаас хазайсан', r: true },
  'alert.harsh_braking': { en: 'Bus {bus} harsh braking', mn: '{bus} огцом тормослов', r: true },
  'alert.overspeed': { en: 'Bus {bus} overspeeding', mn: '{bus} хурд хэтрүүлэв', r: true },
  'alert.equipment': { en: 'Bus {bus} {device} offline', mn: '{bus} автобусны {device} тасарсан', r: true },
  'alert.repeated_failure': { en: 'Operator {operator} repeated failures ({n})', mn: '{operator} операторын давтагдсан гэмтэл ({n})' },
  'alerts.validate': { en: 'Validate → Event', mn: 'Баталгаажуулах → Үйл явдал' },
  'alerts.acknowledge': { en: 'Acknowledge', mn: 'Хүлээн авах' },
  'alerts.threshold': { en: 'Rule {rule}: {value}{unit} vs threshold {threshold}{unit}', mn: 'Дүрэм {rule}: {value}{unit} / босго {threshold}{unit}' },
  'alerts.tabAlerts': { en: 'Alerts (3 levels)', mn: 'Сэрэмжлүүлэг (3 түвшин)' },
  'alerts.tabEvents': { en: 'Events (5 levels)', mn: 'Үйл явдал (5 түвшин)' },
  'alerts.scalesNote': {
    en: 'Two separate scales by design: alerts have three severities (L1182), validated events have five (R1433).',
    mn: 'Хоёр тусдаа хуваарь: сэрэмжлүүлэг 3 түвшин, үйл явдал 5 түвшин.',
  },

  // ---------------------------------------------------------------- widgets (S7)
  'widget.regularity': { en: 'Service regularity', mn: 'Үйлчилгээний тогтмол байдал', r: true },
  'widget.mostDelayed': { en: 'Most delayed routes', mn: 'Хамгийн их хоцролттой чиглэл', r: true },
  'widget.passengerLoad': { en: 'Passenger load', mn: 'Зорчигчийн ачаалал', r: true },
  'widget.highestLoad': { en: 'Highest load routes', mn: 'Хамгийн их ачаалалтай чиглэл', r: true },
  'widget.operatorPerf': { en: 'Operator performance', mn: 'Операторын гүйцэтгэл', r: true },
  'widget.onTime': { en: 'On-time performance', mn: 'Цагтаа гүйцэтгэл', r: true },
  'widget.systemHealth': { en: 'System health', mn: 'Системийн найдвартай байдал', r: true },
  'widget.afcOffline': { en: 'AFC offline', mn: 'Төлбөрийн систем (offline)', r: true },
  'widget.cctvOffline': { en: 'CCTV offline', mn: 'CCTV камер (offline)', r: true },
  'widget.tboxOffline': { en: 'T-Box offline', mn: 'Бортын төхөөрөмж (offline)', r: true },
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
  'veh.outOfService': { en: 'Out of service', mn: 'Үйлчилгээнд байхгүй' },
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
    mn: 'Агшин зуурын утга. 5-р слайдад 8 км/ц гэж заасан.',
  },
  'veh.simulatedStill': { en: 'SIMULATED STILL', mn: 'ЗАГВАРЧИЛСАН ЗУРАГ' },
  'veh.source': { en: 'Source', mn: 'Эх сурвалж' },

  // ---------------------------------------------------------------- regularity
  'reg.topDeviation': { en: 'Top {n} routes by schedule deviation', mn: 'Хуваарийн зөрүүгээр эхний {n} чиглэл' },
  'reg.topBunching': { en: 'Top {n} routes with bunching', mn: 'Бөөгнөрөлтэй эхний {n} чиглэл' },
  'reg.headwayTitle': { en: 'Headway analysis ({route})', mn: 'Үйлчилгээний давтамжийн шинжилгээ ({route})', r: true },
  'reg.planned': { en: 'Planned headway', mn: 'Төлөвлөсөн давтамж', r: true },
  'reg.actual': { en: 'Actual headway', mn: 'Бодит давтамж', r: true },
  'reg.serviceGap': { en: 'Service gap ({min} min)', mn: 'Үйлчилгээний завсар ({min} мин)', r: true },
  'reg.avgDelay': { en: 'Avg. delay', mn: 'Дундаж хоцролт', r: true },
  'reg.route': { en: 'Route', mn: 'Чиглэл', r: true },
  'reg.status': { en: 'Status', mn: 'Төлөв', r: true },
  'reg.timetableNote': {
    en: 'Planned service is a synthesised timetable — no timetable source exists in the deck or the design document. Client-approved for this demo.',
    mn: 'Төлөвлөсөн хуваарь нь загварчилсан — эх сурвалжид хуваарийн мэдээлэл байхгүй.',
  },
  'reg.headwayMin': { en: 'Headway (min)', mn: 'Давтамж (мин)', r: true },

  // ---------------------------------------------------------------- passenger
  'pax.topBusiest': { en: 'Top {n} busiest routes', mn: 'Хамгийн их ачаалалтай {n} чиглэл', r: true },
  'pax.overcrowded': { en: '{route} — Load {pct} % — Overcrowded', mn: '{route} — Ачаалал {pct} % — Хэт ачаалалтай', r: true },
  'pax.demandTitle': { en: 'Network passenger demand (today)', mn: 'Зорчигчийн эрэлт (өнөөдөр)', r: true },
  'pax.waiting': { en: 'Derived waiting time', mn: 'Тооцоолсон хүлээх хугацаа' },
  'pax.waitingNote': {
    en: 'Derived from headway — no source measures waiting passengers at stops.',
    mn: 'Давтамжаас тооцоолсон — буудал дээрх хүлээгчдийн тоог хэмждэг эх сурвалж байхгүй.',
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
  'pax.leftBehind': { en: 'Left behind (15 min)', mn: 'Суулгүй үлдсэн (15 мин)' },

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
  'ev.advance': { en: 'Advance to {stage}', mn: '{stage} рүү шилжих' },
  'ev.blocked': { en: 'Blocked — {n} compulsory action(s) outstanding', mn: 'Хаагдсан — {n} заавал хийх арга хэмжээ дутуу' },
  'ev.override': { en: 'Supervisor override', mn: 'Хяналтын ажилтны зөвшөөрөл' },
  'ev.justification': { en: 'Justification (required)', mn: 'Үндэслэл (заавал)' },
  'ev.evidence': { en: 'Evidence bundle', mn: 'Нотлох баримт' },
  'ev.history': { en: 'Event history', mn: 'Үйл явдлын түүх' },
  'ev.emergencyLevel': { en: 'Emergency level', mn: 'Онцгой байдлын түвшин' },
  'ev.none': { en: 'No events. Validate an alert to create one.', mn: 'Үйл явдал байхгүй.' },
  'ev.validateTitle': { en: 'Validate alert → create event', mn: 'Сэрэмжлүүлгийг баталгаажуулах' },
  'ev.validateNote': {
    en: 'An automated alert requires operator validation before it becomes a formal event (L1235).',
    mn: 'Автомат сэрэмжлүүлэг нь операторын баталгаажуулалтгүйгээр үйл явдал болохгүй.',
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
  'comms.pending': { en: 'Pending approval', mn: 'Батлахыг хүлээж байна' },
  'comms.active': { en: 'Active', mn: 'Идэвхтэй' },
  'comms.send': { en: 'Send', mn: 'Илгээх' },
  'comms.recipient': { en: 'Recipient', mn: 'Хүлээн авагч' },
  'comms.channels': { en: 'Channels', mn: 'Сувгууд' },
  'comms.banner': {
    en: 'PTCC consolidates and validates; authorised PTPD units publish (L741).',
    mn: 'PTCC нэгтгэж баталгаажуулна; эрх бүхий нэгж нийтэлнэ.',
  },
  'comms.tccNote': {
    en: 'No PTCC–TCC interface exists today, automatic or manual (R967).',
    mn: 'Өнөөдөр PTCC–TCC хооронд холболт байхгүй.',
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
    mn: 'Санал болгосон боломж — эх сурвалжид харилцан ярианы интерфейс байхгүй.',
  },
  'cop.ask': { en: 'Ask about the network…', mn: 'Сүлжээний талаар асуух…' },
  'cop.sources': { en: 'Sources', mn: 'Эх сурвалж' },
  'cop.tier': { en: 'Tier {n}', mn: '{n}-р түвшин' },
  'cop.tier1': { en: 'Deterministic rules', mn: 'Тодорхой дүрэм' },
  'cop.tier2': { en: 'Playbook', mn: 'Үйл ажиллагааны заавар' },
  'cop.tier3': { en: 'Analytics-assisted', mn: 'Шинжилгээнд суурилсан' },
  'cop.tier4': { en: 'Conversational (proposed)', mn: 'Харилцан яриа (санал)' },
  'cop.q.lookFirst': { en: 'What requires immediate attention?', mn: 'Юунд яаралтай анхаарах вэ?' },
  'cop.q.why': { en: 'Why is {route} delayed?', mn: '{route} яагаад хоцорч байна вэ?' },
  'cop.q.overcrowded': { en: 'Which routes are overcrowded?', mn: 'Аль чиглэл хэт ачаалалтай вэ?' },
  'cop.q.actions': { en: 'What response is required?', mn: 'Ямар арга хэмжээ шаардлагатай вэ?' },
  'cop.q.health': { en: 'Anything wrong with the equipment?', mn: 'Тоног төхөөрөмжид асуудал байна уу?' },
  'cop.q.brief': { en: 'Give me the shift handover brief', mn: 'Ээлж хүлээлцэх товч мэдээлэл' },
  'cop.unknown': { en: 'I can answer these:', mn: 'Би эдгээрт хариулж чадна:' },
  'cop.noAction': { en: 'The agent proposes; the operator decides. No action is taken automatically.', mn: 'Туслах санал болгоно; оператор шийднэ.' },

  // ---------------------------------------------------------------- settings
  'set.thresholds': { en: 'Thresholds', mn: 'Босго утгууд' },
  'set.demoDefault': { en: 'DEMO DEFAULT — no value in any source', mn: 'ДЕМО УТГА — эх сурвалжид утга байхгүй' },
  'set.reset': { en: 'Reset to demo defaults', mn: 'Анхны утгад буцаах' },
  'set.language': { en: 'Language', mn: 'Хэл' },
  'set.preset': { en: 'Display preset', mn: 'Дэлгэцийн тохиргоо' },
  'set.legend': { en: 'Map legend', mn: 'Зургийн тэмдэглэгээ' },
  'set.simSpeed': { en: 'Simulation speed', mn: 'Загварчлалын хурд' },
  'set.provenance': { en: 'Data provenance', mn: 'Өгөгдлийн гарал үүсэл' },
  'set.speedProfile': { en: 'Speed profile (km/h)', mn: 'Хурдны профайл (км/ц)' },
  'set.speedNote': {
    en: 'Central peak 8 km/h is client-directed and matches the single instantaneous reading on Slide 5. Using it as a peak MEAN is our inference — it is never applied to suburban or off-peak links.',
    mn: 'Төвийн оргил үеийн 8 км/ц нь захиалагчийн заасан утга.',
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
  'th.overspeed_kmh': { en: 'Overspeed threshold', mn: 'Хурд хэтрэлтийн босго' },

  // ---------------------------------------------------------------- health / roi
  'health.title': { en: 'Fleet Health', mn: 'Тээврийн хэрэгслийн төлөв' },
  'health.proposed': {
    en: 'Proposed extension — predictive maintenance and cost per bus. Business intent stated by the client; the input data does not exist yet. The design document places predictive functions outside PTCC scope (R1096).',
    mn: 'Санал болгосон өргөтгөл — урьдчилан таамаглах засвар үйлчилгээ. Өгөгдөл хараахан байхгүй.',
  },
  'health.repeated': { en: 'Repeated failure pattern — Operator {op}', mn: 'Давтагдсан гэмтлийн загвар — {op} оператор' },
  'health.score': { en: 'Health score', mn: 'Эрүүл мэндийн оноо' },
  'health.inputsRequired': { en: 'Inputs required from PTPD', mn: 'НТГ-аас шаардлагатай мэдээлэл' },
  'health.simulated': { en: 'simulated', mn: 'загварчилсан' },
  'cost.maintenance': { en: 'Maintenance', mn: 'Засвар үйлчилгээ' },
  'cost.fuel_gas': { en: 'Fuel / gas', mn: 'Түлш' },
  'cost.electricity': { en: 'Electricity', mn: 'Цахилгаан' },
  'cost.driver_salary': { en: 'Driver salary', mn: 'Жолоочийн цалин' },
  'cost.insurance': { en: 'Insurance', mn: 'Даатгал' },
  'cost.accidents': { en: 'Accidents', mn: 'Осол' },
  'cmp.maintenance_type_a': { en: 'Maintenance type A', mn: 'А төрлийн засвар' },
  'cmp.maintenance_type_b': { en: 'Maintenance type B', mn: 'Б төрлийн засвар' },
  'cmp.brakes': { en: 'Brakes', mn: 'Тормос' },
  'cmp.tyres': { en: 'Tyres', mn: 'Дугуй' },
  'cmp.clutches': { en: 'Clutches', mn: 'Шүүрэг' },
  'roi.title': { en: 'Cost & ROI Intelligence', mn: 'Зардал ба өгөөжийн шинжилгээ' },
  'roi.spendPerKm': { en: 'Spend per km', mn: 'Км тутмын зардал' },
  'roi.savings': { en: 'Projected saving', mn: 'Тооцоолсон хэмнэлт' },
  'roi.slider': { en: 'Assumed saving from predictive maintenance', mn: 'Таамагласан хэмнэлт' },

  // ---------------------------------------------------------------- operators
  'op.serviceKm': { en: 'Service km', mn: 'Үйлчилгээний км', r: true },
  'op.totalKm': { en: 'Total kilometres operated', mn: 'Нийт гүйцэтгэсэн км', r: true },
  'op.interruptions': { en: 'Service interruptions', mn: 'Үйлчилгээний тасалдал', r: true },
  'op.revenue': { en: 'Revenue', mn: 'Орлого', r: true },
  'op.kpiNote': {
    en: 'PTPD manages the KPI, not the drivers and shifts. PTCC identifies service gaps and asks the operator OCC to act.',
    mn: 'НТГ нь KPI-г удирддаг, жолооч, ээлжийг биш.',
  },

  // ---------------------------------------------------------------- misc
  // ------------------------------------------------ alerts & events module (6)
  'alerts.filters': { en: 'Filters', mn: 'Шүүлтүүр' },
  'alerts.all': { en: 'All', mn: 'Бүгд' },
  'alerts.age': { en: 'Age', mn: 'Хугацаа' },
  'alerts.impact': { en: 'Impact', mn: 'Нөлөө' },
  'alerts.ruleDerived': {
    en: 'Rule-derived — the breached threshold is the explanation (L1175). No AI involved.',
    mn: 'Дүрмээс гаралтай — зөрчсөн босго нь тайлбар мөн. Хиймэл оюун оролцоогүй.',
  },
  'alerts.openSubject': { en: 'Open subject', mn: 'Холбогдох нэгжийг нээх' },
  'alerts.acknowledged': { en: 'Acknowledged', mn: 'Хүлээн авсан' },
  'alerts.validated': { en: 'Validated → {id}', mn: 'Баталгаажсан → {id}' },
  'alerts.count': { en: '{n} alert(s)', mn: '{n} сэрэмжлүүлэг' },
  'alerts.type.service_deviation': { en: 'Service deviation', mn: 'Үйлчилгээний зөрчил', r: true },
  'alerts.type.overcrowding': { en: 'Overcrowding', mn: 'Хэт ачаалал', r: true },
  'alerts.type.vehicle_safety': { en: 'Vehicle safety', mn: 'Тээврийн хэрэгслийн аюулгүй байдал', r: true },
  'alerts.type.equipment_failure': { en: 'Equipment failure', mn: 'Тоног төхөөрөмжийн гэмтэл', r: true },
  'alerts.type.security': { en: 'Security', mn: 'Хамгаалалт', r: true },
  'ev.notAnEvent': {
    en: 'An automated alert is NOT an event until an operator validates it (L1235).',
    mn: 'Автомат сэрэмжлүүлэг нь операторын баталгаажуулалт хүртэл үйл явдал биш (L1235).',
  },
  'ev.record12': { en: 'Event record — all 12 fields (L1246–L1258)', mn: 'Үйл явдлын бүртгэл — 12 талбар (L1246–L1258)' },
  'ev.f.event_id': { en: '1. Event ID', mn: '1. Үйл явдлын дугаар' },
  'ev.f.event_type': { en: '2. Event type', mn: '2. Төрөл' },
  'ev.f.category': { en: '3. Category', mn: '3. Ангилал' },
  'ev.f.severity_level': { en: '4. Severity level (1–5)', mn: '4. Ноцтой байдал (1–5)' },
  'ev.f.bus_number': { en: '5. Bus number', mn: '5. Автобусны дугаар' },
  'ev.f.route_number': { en: '6. Route number', mn: '6. Чиглэлийн дугаар' },
  'ev.f.driver_id': { en: '7. Driver ID', mn: '7. Жолоочийн дугаар' },
  'ev.f.location': { en: '8. Location', mn: '8. Байршил' },
  'ev.f.timestamp': { en: '9. Timestamp', mn: '9. Хугацаа' },
  'ev.f.detection_source': { en: '10. Detection source', mn: '10. Илрүүлсэн эх сурвалж' },
  'ev.f.description': { en: '11. Description', mn: '11. Тайлбар' },
  'ev.f.associated_alerts': { en: '12. Associated alerts', mn: '12. Холбогдох сэрэмжлүүлэг' },
  'ev.stageNow': { en: 'Current stage', mn: 'Одоогийн үе шат' },
  'ev.workflow': { en: 'Workflow — 7 stages, each logged (L1298–L1310)', mn: 'Ажлын урсгал — 7 үе шат (L1298–L1310)' },
  'ev.gateNote': {
    en: 'Compulsory actions gate stage progression and closure (L1346). Only a supervisor may override, with justification, written to the audit log (L1347).',
    mn: 'Заавал хийх арга хэмжээ нь үе шат ахих, хаахыг хязгаарлана (L1346). Зөвхөн хяналтын ажилтан үндэслэлтэйгээр хүчингүй болгоно (L1347).',
  },
  'ev.overriddenBy': { en: 'Overridden by {by}', mn: '{by} хүчингүй болгосон' },
  'ev.overrideRole': { en: 'Supervisor role required', mn: 'Хяналтын ажилтны эрх шаардлагатай' },
  'ev.overrideMin': { en: 'At least 10 characters', mn: 'Хамгийн багадаа 10 тэмдэгт' },
  'ev.audit': { en: 'Audit trail', mn: 'Аудитын бүртгэл' },
  'ev.select': { en: 'Select an event', mn: 'Үйл явдлыг сонгоно уу' },
  'ev.manual': { en: 'Create event manually', mn: 'Үйл явдлыг гараар бүртгэх' },
  'ev.manualNote': {
    en: 'Not every event starts with telemetry — call centre, driver, Traffic Police and TCC reports are entered by hand.',
    mn: 'Бүх үйл явдал телеметрээс эхлэхгүй — дуудлагын төв, жолооч, замын цагдаа, ЗХУТ-аас гараар бүртгэнэ.',
  },
  'ev.src.call_centre': { en: 'Call centre', mn: 'Дуудлагын төв' },
  'ev.src.driver': { en: 'Driver report', mn: 'Жолоочийн мэдээлэл' },
  'ev.src.traffic_police': { en: 'Traffic Police', mn: 'Замын цагдаа' },
  'ev.src.tcc': { en: 'Traffic Control Centre', mn: 'Замын хөдөлгөөний удирдлагын төв' },
  'ev.severitySuggested': { en: 'Suggested severity — operator may change it (R1441)', mn: 'Санал болгосон түвшин — оператор өөрчилж болно (R1441)' },
  'ev.confirm': { en: 'Confirm & create event', mn: 'Баталж үйл явдал үүсгэх' },
  'ev.cancel': { en: 'Cancel', mn: 'Цуцлах' },
  'ev.closedAt': { en: 'Closed at {t}', mn: '{t}-д хаагдсан' },
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
    mn: '{route} чиглэл: өглөөний ослын улмаас автобуснууд хоцролттой явж байна. Аяллын нэмэлт цаг тооцно уу.',
  },
  'comms.approvalGate': {
    en: 'A drafted message is pending approval and is never published until approved (L1443).',
    mn: 'Боловсруулсан мэдээлэл батлагдах хүртэл нийтлэгдэхгүй (L1443).',
  },
  'comms.messageType': { en: 'Message type', mn: 'Мэдээллийн төрөл' },
  'comms.content': { en: 'Content', mn: 'Агуулга' },
  'comms.autoDrafts': { en: 'Suggested drafts', mn: 'Санал болгосон төсөл' },
  'comms.autoDraftNote': {
    en: 'Rule-derived from open events (L1512–L1518). One click prefills the composer; nothing sends itself.',
    mn: 'Нээлттэй үйл явдлаас дүрмээр гаргасан (L1512–L1518). Нэг товшилтоор бөглөнө; өөрөө илгээхгүй.',
  },
  'comms.requestWording': {
    en: 'PTCC is not a command authority (L718). It validates, requests, informs, coordinates and records — an Operational Instruction to an Operator OCC is worded as a request.',
    mn: 'PTCC нь тушаах эрх мэдэлгүй (L718). Баталгаажуулж, хүсэлт гаргаж, мэдээлж, зохицуулж, бүртгэнэ.',
  },
  'comms.fields7': { en: 'Passenger message record — 7 fields (L1464–L1471)', mn: 'Зорчигчийн мэдээллийн бүртгэл — 7 талбар' },
  'comms.fields8': { en: 'Coordination record — 8 fields (L1533–L1541)', mn: 'Зохицуулалтын бүртгэл — 8 талбар' },
  'comms.log': { en: 'Message log', mn: 'Мэдээллийн бүртгэл' },
  'comms.empty': { en: 'No messages yet', mn: 'Мэдээлэл алга' },
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
  'scenario.none': { en: 'No scenario running', mn: 'Хувилбар ажиллаагүй' },
  'multimodal.note': { en: 'Phase 3 — excluded from the PTS-G1 procurement (R368).', mn: '3-р үе шат — тендерээс хасагдсан.' },
  'multimodal.taxi': { en: 'Today: a manual morning count of licensed taxis (R964).', mn: 'Өнөөдөр: өглөө гараар тоолсон такси.' },
  // ------------------------------------------------- regularity / vehicle modules
  'reg.serviceGaps': { en: 'Routes with a service gap', mn: 'Үйлчилгээний завсартай чиглэлүүд' },
  'reg.strip': { en: 'Vehicle spacing along {route}', mn: '{route} чиглэл дэх зай' },
  'reg.selectRoute': { en: 'Select a route to see its headway.', mn: 'Давтамжийг харахын тулд чиглэл сонгоно уу.' },
  'veh.bus': { en: 'Bus #{id}', mn: '{id} автобус', r: true },
  'veh.unknown': { en: 'Unknown vehicle {id}.', mn: 'Тодорхойгүй тээврийн хэрэгсэл {id}.' },
  'veh.noAlert': { en: 'No active alert on this vehicle.', mn: 'Энэ тээврийн хэрэгсэлд идэвхтэй сэрэмжлүүлэг байхгүй.' },
  'veh.rawIcd': { en: 'Raw ICD fields (Table 8)', mn: 'ICD-ийн түүхий талбарууд (Хүснэгт 8)' },
  'veh.retrieve': { en: 'Retrieve footage', mn: 'Бичлэг татах' },
  'veh.timestamp': { en: 'Timestamp', mn: 'Цагийн тэмдэг' },
  'veh.trigger': { en: 'Auto-open trigger', mn: 'Автоматаар нээх нөхцөл' },
  'veh.noTrigger': { en: 'No video trigger condition is active on this vehicle.', mn: 'Энэ тээврийн хэрэгсэлд бичлэг нээх нөхцөл идэвхгүй.' },
  'veh.noIncidents': { en: 'No alerts or events reference this vehicle.', mn: 'Энэ тээврийн хэрэгсэлд холбогдох бүртгэл алга.' },
  'veh.playbook': { en: 'Open playbook', mn: 'Ажиллагааны заавар нээх' },

  // ------------------------------------------------ passenger intelligence (added)
  'pax.chain': {
    en: 'Demand → Boarding → Occupancy → Capacity → Overcrowding → Operational action',
    mn: 'Эрэлт → Суулт → Ачаалал → Багтаамж → Хэт ачаалал → Үйл ажиллагааны арга хэмжээ',
  },
  'pax.chainNote': {
    en: 'Occupancy and boardings are source metrics (Table 8, APC/AFC). Demand itself is inferred — no source measures unserved demand.',
    mn: 'Ачаалал ба суулт нь эх сурвалжийн үзүүлэлт. Эрэлтийг дүгнэсэн.',
  },
  'pax.loadBands': { en: 'Load bands (Slide 8)', mn: 'Ачааллын түвшин (Слайд 8)' },
  'pax.loadBandsNote': {
    en: 'The only numeric threshold set that exists in the client material. Used verbatim.',
    mn: 'Захиалагчийн материалд байгаа цорын ганц тоон босго. Яг хэвээр нь ашигласан.',
  },
  'pax.avgLoad': { en: 'Avg. load', mn: 'Дундаж ачаалал' },
  'pax.band': { en: 'Band', mn: 'Түвшин' },
  'pax.demandHeat': { en: 'Demand heat by route', mn: 'Чиглэл тус бүрийн эрэлтийн ачаалал' },
  'pax.topByBoardings': { en: 'Top routes by boardings', mn: 'Хамгийн их суулттай чиглэл' },
  'pax.bottomByBoardings': { en: 'Lowest routes by boardings (R1162)', mn: 'Хамгийн бага суулттай чиглэл' },
  'pax.boardings': { en: 'Boardings', mn: 'Суулт' },
  'pax.waitingBasis': { en: '≈ observed headway {gap} min ÷ 2 on {route}', mn: '{route} чиглэлийн давтамж {gap} мин ÷ 2' },
  'pax.noOvercrowding': { en: 'No route is at or above the overcrowding threshold.', mn: 'Хэт ачаалалтай чиглэл алга.' },
  'pax.action': { en: 'Request OCC: add standby bus / hold trailing bus (headway control)', mn: 'OCC-ээс нэмэлт автобус хүсэх / ар автобусыг барих' },

  // ------------------------------------------------ operators (added)
  'op.title': { en: 'Operator Performance & Revenue', mn: 'Операторын гүйцэтгэл ба орлого' },
  'op.operator': { en: 'Operator', mn: 'Оператор' },
  'op.fareNote': {
    en: 'Revenue = boardings × 500 ₮. No fare figure exists in any source — 500 ₮ is a demo assumption. Fare fixation sits with PTPD (R992).',
    mn: 'Орлого = суулт × 500 ₮. Эх сурвалжид тарифын тоо байхгүй — 500 ₮ нь демо таамаг.',
  },
  'op.revenueVariance': { en: 'Revenue variance {pct} %', mn: 'Орлогын хазайлт {pct} %' },
  'op.revenueVarianceNote': {
    en: "AFC-recorded revenue is below revenue expected from APC boardings because {n} of this operator's AFC validators are offline. The design document's own hypothesis for this pattern is a potential fare-system malfunction (L1092–L1097).",
    mn: 'AFC-ээр бүртгэгдсэн орлого APC-ийн суултаас доогуур байна: энэ операторын {n} AFC төхөөрөмж офлайн байна.',
  },
  'op.recorded': { en: 'AFC-recorded revenue', mn: 'AFC-ээр бүртгэгдсэн орлого' },
  'op.expected': { en: 'Expected from boardings', mn: 'Суултаас хүлээгдэх орлого' },
  'op.topRevenue': { en: 'Top 10 routes by revenue', mn: 'Орлогоор эхний 10 чиглэл' },
  'op.bottomRevenue': { en: 'Bottom 10 routes by revenue', mn: 'Орлогоор сүүлийн 10 чиглэл' },
  'op.kmHourNote': {
    en: 'T-Box calculates KM-Hour for operator payment today; that basis moves to the BMS (R958). Contracts are to become performance-based on PTCC data (R931). No payment amount is shown — any payment formula would be an assumption.',
    mn: 'Өнөөдөр T-Box нь операторын төлбөрийн KM-Hour-ыг тооцдог; энэ нь BMS рүү шилжинэ (R958). Гэрээ нь PTCC-ийн өгөгдөлд суурилсан гүйцэтгэлийн болно (R931).',
  },
  'op.roleFiltered': {
    en: 'Bus Operator OCC role — you see only your own fleet.',
    mn: 'Операторын OCC эрх — зөвхөн өөрийн парк харагдана.',
  },
  'op.kmVsOnTime': { en: 'Service km and on-time % by operator', mn: 'Операторын км ба цагтаа гүйцэтгэл' },

  // ------------------------------------------------ fleet health (added)
  'health.confirmedSection': { en: 'Device status monitoring', mn: 'Төхөөрөмжийн төлөвийн хяналт' },
  'health.noOffline': { en: 'All devices reporting.', mn: 'Бүх төхөөрөмж ажиллаж байна.' },
  'health.bus': { en: 'Bus', mn: 'Автобус' },
  'health.formula': {
    en: 'health = 100 − 15 × (devices offline) − 10 × (seeded wear term 0–4). Weights are demo assumptions, not a model. PTCC receives device status and telematics alerts, not a health score.',
    mn: 'health = 100 − 15 × (офлайн төхөөрөмж) − 10 × (элэгдлийн гишүүн 0–4). Жингүүд нь демо таамаг.',
  },
  'health.risk.low': { en: 'Low', mn: 'Бага' },
  'health.risk.elevated': { en: 'Elevated', mn: 'Ихэссэн' },
  'health.risk.high': { en: 'High', mn: 'Өндөр' },
  'health.risk.critical': { en: 'Critical', mn: 'Ноцтой' },
  'health.act.low': { en: 'None', mn: 'Байхгүй' },
  'health.act.elevated': { en: 'Inspect at next depot return (Minor Equipment Failure playbook)', mn: 'Дараагийн депод шалгах' },
  'health.act.high': { en: 'Schedule inspection within 7 days; consider swap-out at peak', mn: '7 хоногт шалгуулах; оргил үед солих' },
  'health.act.critical': { en: 'Withdraw at end of trip; Breakdown playbook pre-staged', mn: 'Аяллын төгсгөлд татах; эвдрэлийн журам бэлтгэх' },
  'health.components': { en: 'Component servicing and cost (client-named categories)', mn: 'Эд ангийн засвар ба зардал' },
  'health.componentNote': {
    en: 'The five categories named by the client. These are servicing and cost categories, not telemetry signals — PTCC has no sensor for tyre or clutch wear.',
    mn: 'Захиалагчийн нэрлэсэн таван ангилал. Эдгээр нь зардлын ангилал, мэдрэгчийн дохио биш.',
  },
  'health.nextService': { en: 'Next service (est.)', mn: 'Дараагийн засвар (тооцоо)' },
  'health.annualCost': { en: 'Annual cost', mn: 'Жилийн зардал' },
  'health.costPerBus': { en: 'Cost lines per bus', mn: 'Автобус тутмын зардал' },
  'health.annualKm': { en: 'Annual km (assumed)', mn: 'Жилийн км (таамаг)' },
  'health.priorityQueue': { en: 'Priority queue — risk × passenger exposure', mn: 'Тэргүүлэх дараалал — эрсдэл × зорчигчийн нөлөө' },
  'health.priorityNote': {
    en: "Ordering reuses the deck's own logic that a deviation matters more when passenger impact is high (S8). The risk term itself is invented.",
    mn: 'Эрэмбэлэлт нь S8-ын логикийг ашигласан. Эрсдэлийн гишүүн нь зохиомол.',
  },
  'health.exposure': { en: 'Exposure', mn: 'Нөлөө' },
  'health.selectBus': { en: 'Select a bus from the queue or the offline lists.', mn: 'Дараалал эсвэл офлайн жагсаалтаас автобус сонгоно уу.' },
  'health.input1': { en: 'Spend per bus per year, by operator', mn: 'Автобус тутмын жилийн зардал, оператороор' },
  'health.input2': { en: 'Maintenance spend split by type A and type B service', mn: 'Засварын зардлыг А ба Б төрлөөр ангилсан байдал' },
  'health.input3': { en: 'Component spend and replacement intervals: brakes, tyres, clutches', mn: 'Тормос, дугуй, шүүрэгний зардал ба солих давтамж' },
  'health.input4': { en: 'Fuel/gas and electricity cost per bus, and the fleet mix (diesel / CNG / electric)', mn: 'Түлш, цахилгааны зардал ба паркийн бүрэлдэхүүн' },
  'health.input5': { en: 'Driver salary cost per bus or per km', mn: 'Жолоочийн цалингийн зардал' },
  'health.input6': { en: 'Insurance premium per bus; annual accident cost', mn: 'Даатгалын хураамж; жилийн ослын зардал' },
  'health.input7': { en: 'Annual km per bus — and whether the T-Box KM-Hour figure (R958) is usable for it', mn: 'Автобус тутмын жилийн км — T-Box-ын KM-Hour тохирох эсэх' },
  'health.input8': { en: 'Which body holds these numbers, PTPD or the operators, and in what system', mn: 'Эдгээр тоог хэн эзэмшдэг — НТГ эсвэл операторууд, ямар системд' },
  'health.electricityNote': {
    en: 'The client listed "electricity" beside "gas", implying an electric or hybrid element. No other source mentions one — the line is present and zeroed; nothing is built on it.',
    mn: '"Цахилгаан" нь "хий"-ийн хажууд дурдагдсан. Өөр эх сурвалж байхгүй — мөр нь тэглэгдсэн.',
  },

  // ------------------------------------------------ cost & roi (added)
  'roi.banner': {
    en: 'Proposed — consulting value proposition. No source data; every figure simulated. The detailed design places predictive functions outside PTCC scope (R1096) — PTCC would visualise these outputs, not compute them.',
    mn: 'Санал болгосон — зөвлөхийн үнэ цэнийн санал. Эх өгөгдөл байхгүй; бүх тоо загварчилсан. R1096 нь урьдчилан таамаглах чиг үүргийг PTCC-ийн хүрээнээс гадуур тавьсан.',
  },
  'roi.tabCost': { en: 'Cost & ROI (Inferred)', mn: 'Зардал ба ROI (дүгнэсэн)' },
  'roi.tabFleet': { en: 'Fleet sizing (Assumption)', mn: 'Паркийн хэмжээ (таамаг)' },
  'roi.baseline': { en: 'Baseline spend per km', mn: 'Суурь зардал/км' },
  'roi.projected': { en: 'Projected with predictive maintenance', mn: 'Урьдчилсан засвартай үеийн тооцоо' },
  'roi.annualSaving': { en: 'Annual saving (fleet)', mn: 'Жилийн хэмнэлт (парк)' },
  'roi.sliderNote': {
    en: 'The slider exists so nobody mistakes the output for a calculation. The saving percentage is an input you choose, not a result the demo derived.',
    mn: 'Гулсагч нь энэ үр дүнг тооцоолол гэж эндүүрэхээс сэргийлэхийн тулд байна.',
  },
  'roi.perOperator': { en: 'Simulated cost by operator', mn: 'Оператороор загварчилсан зардал' },
  'roi.fleetTotal': { en: 'Fleet annual spend', mn: 'Паркийн жилийн зардал' },
  'roi.peakRequirement': { en: 'Peak vehicle requirement', mn: 'Оргил үеийн хэрэгцээ' },
  'roi.currentFleet': { en: 'Current fleet in service', mn: 'Одоогийн үйлчилж буй парк' },
  'roi.gap': { en: 'Gap', mn: 'Зөрүү' },
  'roi.speedSlider': { en: 'Assumed central peak speed (km/h)', mn: 'Таамагласан төвийн оргил хурд (км/ц)' },
  'roi.speedNote': {
    en: 'Changing the assumed peak speed changes cycle time and therefore the answer. The 8 km/h central-peak figure is client-directed and matches the single instantaneous reading on Slide 5 — applying it as a peak mean is our inference.',
    mn: 'Таамагласан хурдыг өөрчлөх нь эргэлтийн хугацааг, улмаар хариултыг өөрчилнө. 8 км/ц нь захиалагчийн заасан тоо.',
  },
  'roi.fleetFormula': {
    en: 'peak vehicles per route ≈ ceil(cycle time ÷ planned headway), summed over operating routes. Cycle time = 2 × route length ÷ assumed peak speed. Planned headway is a synthesised timetable — no timetable source exists.',
    mn: 'Чиглэл тутмын оргил машин ≈ ceil(эргэлтийн хугацаа ÷ төлөвлөсөн давтамж).',
  },
  'roi.fleetRefusal': {
    en: 'This is not a quantity calculator. Peak vehicle requirement needs real cycle times, fleet-by-route allocation, spare ratio and depot constraints — none of which exist in any source.',
    mn: 'Энэ нь тоо хэмжээ тооцоолуур биш.',
  },

  // ------------------------------------------------ copilot answers (Tier 4 surface)
  // No literal digits in any of these templates: every number in an answer must come
  // from the resolver's facts, so the prose can be checked against them (plan 22.5).
  'cop.dataTier': { en: 'Data', mn: 'Өгөгдөл' },
  'cop.offline': { en: 'Offline — scripted answers, no network call', mn: 'Сүлжээгүй — бэлтгэсэн хариулт' },
  'cop.a.empty': { en: 'The simulation has not produced a snapshot yet.', mn: 'Загварчлал хараахан төлөв гаргаагүй байна.' },
  'cop.a.lookFirst': {
    en: 'Open alerts: {critical} critical, {warning} warning, {info} informational. By impact score: {list}.',
    mn: 'Нээлттэй сэрэмжлүүлэг: {critical} ноцтой, {warning} анхааруулга, {info} мэдээлэл. Нөлөөгөөр: {list}.',
  },
  'cop.a.lookFirstNone': { en: 'No open alerts. Buses in service: {inservice}.', mn: 'Нээлттэй сэрэмжлүүлэг алга. Үйлчилгээнд: {inservice}.' },
  'cop.a.why': {
    en: '{route}: {vehicles} buses in service, mean deviation {mean} min, worst {bus} at {dev} min, speed {speed} km/h. Dominant cause: {cause}.',
    mn: '{route}: {vehicles} автобус, дундаж зөрүү {mean} мин, хамгийн муу нь {bus} — {dev} мин, хурд {speed} км/ц. Гол шалтгаан: {cause}.',
  },
  'cop.a.whyNoRoute': { en: 'Name a route, for example {route}.', mn: 'Чиглэлээ нэрлэнэ үү, жишээ нь {route}.' },
  'cop.cause.congestion': {
    en: 'congestion — mean speed on the route is {speed} km/h against a planned {planned} km/h',
    mn: 'түгжрэл — чиглэлийн дундаж хурд {speed} км/ц, төлөвлөсөн {planned} км/ц',
  },
  'cop.cause.dwell': {
    en: 'dwell and boarding time — the buses are moving but losing {mean} min against the synthesised timetable',
    mn: 'буудал дээрх саатал — автобус явж байгаа ч хуваариасаа {mean} мин хоцорч байна',
  },
  'cop.cause.device': { en: 'a device fault — {n} on-board device(s) offline on this route', mn: 'төхөөрөмжийн гэмтэл — энэ чиглэлд {n} төхөөрөмж тасарсан' },
  'cop.cause.event': { en: 'an open event on this route ({id}, {type})', mn: 'энэ чиглэлд нээлттэй үйл явдал ({id}, {type})' },
  'cop.a.speedNote': { en: 'Speed is an instantaneous reading (ICD), not an average.', mn: 'Хурд нь агшин зуурын утга (ICD), дундаж биш.' },
  'cop.a.whereBus': {
    en: '{bus} ({operator}, {route}): {status}, speed {speed} km/h, deviation {dev} min, load {load} % ({pax} of {cap}). Next stop {stop}, {dist} m. Devices offline: {devices}.',
    mn: '{bus} ({operator}, {route}): {status}, хурд {speed} км/ц, зөрүү {dev} мин, ачаалал {load} % ({pax}/{cap}). Дараагийн буудал {stop}, {dist} м. Тасарсан төхөөрөмж: {devices}.',
  },
  'cop.a.busUnknown': { en: 'No bus matches that id.', mn: 'Тийм дугаартай автобус алга.' },
  'cop.a.overcrowded': {
    en: '{n} route(s) at or above the load threshold of {th} %: {list}.',
    mn: 'Ачааллын босго {th} %-аас давсан {n} чиглэл: {list}.',
  },
  'cop.a.overcrowdedNone': {
    en: 'No route is at or above the load threshold of {th} %. Highest is {route} at {pct} %.',
    mn: 'Ачааллын босго {th} %-аас давсан чиглэл алга. Хамгийн өндөр нь {route} — {pct} %.',
  },
  'cop.a.device': {
    en: 'Offline now: AFC {afc}, CCTV {cctv}, T-Box {tbox}. System health {health} %. {pattern}',
    mn: 'Одоо тасарсан: AFC {afc}, CCTV {cctv}, T-Box {tbox}. Системийн төлөв {health} %. {pattern}',
  },
  'cop.a.devicePattern': { en: 'Repeated-failure pattern: operator {op} accounts for {n} offline devices.', mn: 'Давтагдсан гэмтэл: {op} оператор {n} тасарсан төхөөрөмжтэй.' },
  'cop.a.deviceNoPattern': { en: 'No operator is above the repeated-failure count.', mn: 'Давтагдсан гэмтлийн хэмжээнд хүрсэн оператор алга.' },
  'cop.a.operators': { en: 'Service km today: {km}. On-time: {ot}.', mn: 'Өнөөдрийн үйлчилгээний км: {km}. Цагтаа: {ot}.' },
  'cop.a.recommend': {
    en: 'Event {id} ({type}), {playbook} playbook, stage {stage}. Recommended: {rec}. Compulsory: {comp}. Compulsory actions gate the stage named beside each one; only a supervisor may override, with justification.',
    mn: 'Үйл явдал {id} ({type}), {playbook} заавар, үе шат {stage}. Зөвлөмж: {rec}. Заавал: {comp}. Заавал хийх арга хэмжээ үе шатыг хаана; зөвхөн хяналтын ажилтан үндэслэлтэйгээр чөлөөлнө.',
  },
  'cop.a.noEvent': {
    en: 'No open event. An alert is not an event until an operator validates it.',
    mn: 'Нээлттэй үйл явдал алга. Оператор баталгаажуулаагүй бол сэрэмжлүүлэг үйл явдал болохгүй.',
  },
  'cop.a.openEvents': { en: 'Open events: {n}. {list}.', mn: 'Нээлттэй үйл явдал: {n}. {list}.' },
  'cop.a.openEventsNone': { en: 'No open events.', mn: 'Нээлттэй үйл явдал алга.' },
  'cop.a.brief': {
    en: 'Handover snapshot {time}. Open events: {events} ({stages}). Critical alerts open: {critical}. Feed: {feed}. Thresholds changed this shift: {changed}. Passenger messages awaiting approval: {pending}.',
    mn: 'Ээлж хүлээлцэх төлөв {time}. Нээлттэй үйл явдал: {events} ({stages}). Ноцтой сэрэмжлүүлэг: {critical}. Дата урсгал: {feed}. Өөрчилсөн босго: {changed}. Батлахыг хүлээж буй мэдээлэл: {pending}.',
  },
  'cop.a.feedOk': { en: 'ok', mn: 'хэвийн' },
  'cop.a.feedStale': { en: 'stale', mn: 'хоцорсон' },
  'cop.a.none': { en: 'none', mn: 'байхгүй' },
  'cop.a.threshold': {
    en: 'Current values: {list}. Every one of these parameters is named in the design document; none is given a value there, so each is a demo default.',
    mn: 'Одоогийн утгууд: {list}. Эдгээр үзүүлэлт бүр зохиомжийн бичигт нэрлэгдсэн боловч утга заагаагүй тул демо утга юм.',
  },
  'cop.p.openAlerts': { en: 'Open Alerts & Events', mn: 'Сэрэмжлүүлэг ба үйл явдал нээх' },
  'cop.p.openRoute': { en: 'Open route regularity', mn: 'Чиглэлийн тогтмол байдал нээх' },
  'cop.p.openBus': { en: 'Open vehicle detail', mn: 'Тээврийн хэрэгслийн дэлгэрэнгүй нээх' },
  'cop.p.openHealth': { en: 'Open Fleet Health', mn: 'Системийн төлөв нээх' },
  'cop.p.openPassenger': { en: 'Open Passenger Intelligence', mn: 'Зорчигчийн шинжилгээ нээх' },
  'cop.p.openOperators': { en: 'Open Operator Performance', mn: 'Операторын гүйцэтгэл нээх' },
  'cop.p.openSettings': { en: 'Open Thresholds & Settings', mn: 'Босго ба тохиргоо нээх' },
  'cop.p.openAnalytics': { en: 'Open Analytics & Review', mn: 'Шинжилгээ ба дүгнэлт нээх' },
  'cop.p.openComms': { en: 'Open Communication', mn: 'Харилцаа холбоо нээх' },

  // ------------------------------------------------ settings module
  'set.role': { en: 'Role', mn: 'Үүрэг' },
  'set.evidence': { en: 'Evidence badges', mn: 'Нотолгооны тэмдэг' },
  'set.on': { en: 'On', mn: 'Идэвхтэй' },
  'set.off': { en: 'Off', mn: 'Идэвхгүй' },
  'set.llm': { en: 'Language-model answers (read-only flag)', mn: 'Хэлний загварын хариулт (зөвхөн харах)' },
  'set.llmNote': {
    en: 'Off for the venue run. With the flag off the Copilot never touches the network; answers are scripted templates filled from live state.',
    mn: 'Танилцуулгын үеэр идэвхгүй. Тохиргоо идэвхгүй үед туслах сүлжээ ашиглахгүй.',
  },
  'set.legendS7': { en: 'Three-state (Normal / Slower / Disrupted) — Slide 7', mn: 'Гурван төлөв — 7-р слайд' },
  'set.legendS5': { en: 'Four-state (adds No service) — Slide 5', mn: 'Дөрвөн төлөв — 5-р слайд' },
  'set.noValueNote': {
    en: 'The design document names every parameter below and gives a value for none of them. Each value here is a demo default chosen so the scenarios read correctly; PTCC administrators configure them in the real system.',
    mn: 'Зохиомжийн бичиг доорх үзүүлэлт бүрийг нэрлэсэн боловч нэгд нь ч утга өгөөгүй. Эдгээр нь демо утгууд.',
  },
  'set.changeNote': { en: 'Changing a value re-evaluates the rules immediately.', mn: 'Утга өөрчлөхөд дүрэм шууд дахин тооцогдоно.' },
  'set.unreviewed': { en: 'Mongolian strings awaiting native review', mn: 'Хянагдаагүй монгол мөрүүд' },
  'set.provTimetable': { en: 'Planned service (timetable)', mn: 'Төлөвлөсөн үйлчилгээ (хуваарь)' },
  'set.provGeometry': { en: 'Route geometry', mn: 'Чиглэлийн геометр' },
  'set.provGeometryNote': {
    en: 'Partly synthetic: the corridors named in the deck are placed on real streets; the remaining routes are generated.',
    mn: 'Хэсэгчлэн загварчилсан: слайдад нэрлэсэн коридорууд бодит гудамжаар, бусад нь үүсгэсэн.',
  },
  'set.provValues': { en: 'Operational values', mn: 'Үйл ажиллагааны утгууд' },
  'set.provValuesNote': { en: 'All simulated. No live feed is connected in this build.', mn: 'Бүгд загварчилсан. Энэ хувилбарт шууд холболт байхгүй.' },
  'set.provCost': { en: 'Cost inputs', mn: 'Зардлын өгөгдөл' },
  'set.provCostNote': { en: 'Do not exist. No cost data has been supplied by PTPD.', mn: 'Байхгүй. НТГ-аас зардлын өгөгдөл ирээгүй.' },

  // ------------------------------------------------ analytics & post-incident review
  'an.pickEvent': { en: 'Select an event to review', mn: 'Дүгнэх үйл явдлаа сонгоно уу' },
  'an.none': { en: 'No events yet. Validate an alert to create one.', mn: 'Үйл явдал алга. Сэрэмжлүүлэг баталгаажуулна уу.' },
  'an.timeline': { en: 'Reconstructed timeline', mn: 'Сэргээсэн цаг хугацааны дараалал' },
  'an.impact': { en: 'Service reliability impact', mn: 'Үйлчилгээний найдвартай байдалд үзүүлсэн нөлөө' },
  'an.impactNote': { en: 'Largest headway gap on the affected route, before / during / after the event.', mn: 'Холбогдох чиглэлийн хамгийн том завсар — өмнө / үед / дараа.' },
  'an.report': { en: 'Daily Event Report', mn: 'Өдрийн үйл явдлын тайлан' },
  'an.learn': { en: 'Learn & Improve', mn: 'Сурч сайжруулах' },
  'an.learnNote': { en: 'Generated from the rule records only — no model, no prediction.', mn: 'Зөвхөн дүрмийн бүртгэлээс гаргасан — загвар, таамаглал байхгүй.' },
  'an.export': { en: 'Export timeline (JSON)', mn: 'Дарааллыг JSON болгон гаргах' },
  'an.total': { en: 'Total events', mn: 'Нийт үйл явдал' },
  'an.byType': { en: 'By type', mn: 'Төрлөөр' },
  'an.bySeverity': { en: 'By severity', mn: 'Ноцтой байдлаар' },
  'an.resolved': { en: 'Closed', mn: 'Хаагдсан' },
  'an.stillOpen': { en: 'Still open', mn: 'Нээлттэй хэвээр' },
  'an.avgClose': { en: 'Mean time to closure', mn: 'Хаах дундаж хугацаа' },
  'an.tl.alert': { en: 'Alert', mn: 'Сэрэмжлүүлэг' },
  'an.tl.stage': { en: 'Stage', mn: 'Үе шат' },
  'an.tl.action': { en: 'Action completed', mn: 'Арга хэмжээ гүйцэтгэсэн' },
  'an.tl.comm': { en: 'Communication', mn: 'Харилцаа' },
  'an.obsThreshold': {
    en: 'At a {alt}-minute service-gap threshold this event would have alerted about {min} minutes earlier, at a cost of roughly {extra} additional alerts per day at the current network state.',
    mn: 'Үйлчилгээний завсрын босгыг {alt} минут болговол энэ үйл явдал ойролцоогоор {min} минутын өмнө мэдэгдэх байсан ч өдөрт ойролцоогоор {extra} нэмэлт сэрэмжлүүлэг үүсэх байв.',
  },
  'an.obsCompulsory': {
    en: 'Compulsory actions: {done} of {n} complete. They gate stage progression and closure.',
    mn: 'Заавал хийх арга хэмжээ: {n}-аас {done} нь дууссан. Эдгээр нь үе шат, хаалтыг хаана.',
  },
  'an.obsComms': { en: 'Communications sent on this event: {n}.', mn: 'Энэ үйл явдлаар илгээсэн мэдэгдэл: {n}.' },
  'an.obsAlerts': { en: 'Alerts attached to this event: {n}, the earliest raised at {at}.', mn: 'Энэ үйл явдалд холбогдсон сэрэмжлүүлэг: {n}, хамгийн эртнийх {at}.' },

  // ------------------------------------------------ multimodal (Phase 3)
  'mm.taxi': { en: 'Taxi', mn: 'Такси' },
  'mm.brt': { en: 'Bus Rapid Transit (BRT)', mn: 'Хурдны автобус (BRT)' },
  'mm.lrt': { en: 'Light Rail Transit (LRT)', mn: 'Хөнгөн төмөр зам (LRT)' },
  'mm.metro': { en: 'Metro', mn: 'Метро' },
  'mm.cable': { en: 'Cable car', mn: 'Кабин тээвэр' },
  'mm.fields': { en: 'Required API data structure', mn: 'Шаардагдах API өгөгдлийн бүтэц' },
  'mm.noData': { en: 'No data — no interface exists today.', mn: 'Өгөгдөл байхгүй — холболт одоогоор байхгүй.' },
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
const merged = { ...d, ...agenticDict, ...rolesDict, ...mapDict, ...modulesDict, ...overlayDict, ...dashDict, ...copilotDict, ...kitDict, ...roiDict, ...predictDict, ...depotDict };

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
