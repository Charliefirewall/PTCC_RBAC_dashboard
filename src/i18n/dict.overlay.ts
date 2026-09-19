/**
 * Bilingual strings owned by the "overlay" workstream.
 *
 * Split out of dict.ts so parallel work on different areas cannot clobber a shared
 * file. Merged into the main dictionary by dict.ts; keys must stay globally unique.
 *
 * Mongolian here is NOT from the client's deck - leave `r` unset so unreviewedKeys()
 * keeps reporting it for native review (plan risk R11).
 */
import type { Entry } from './dict';

export const overlayDict = {
  // ---------------------------------------------------------------- overlay chrome
  'ov.close': { en: 'Close', mn: 'Хаах' },
  'ov.dismiss': { en: 'Dismiss', mn: 'Арилгах' },

  // ---------------------------------------------------------------- error boundary (D-1)
  'ov.err.title': { en: 'This screen failed to load', mn: 'Энэ дэлгэц ачаалагдсангүй' },
  'ov.err.hint': {
    en: 'The rest of the application is still running. Switch to another screen, or reload.',
    mn: 'Бусад хэсэг хэвийн ажиллаж байна. Өөр дэлгэц рүү шилжих эсвэл дахин ачаална уу.',
  },
  'ov.err.reload': { en: 'Reload', mn: 'Дахин ачаалах' },

  // ---------------------------------------------------------------- presenter help
  'ov.help.title': { en: 'Presenter keys', mn: 'Илтгэгчийн товчлуур' },
  'ov.help.scenarios': { en: 'Scenarios', mn: 'Хувилбарууд' },

  // ---------------------------------------------------------------- governance toasts
  'ov.toast.ack': { en: 'Alert {id} acknowledged', mn: '{id} сэрэмжлүүлгийг хүлээн авлаа' },
  'ov.toast.event': { en: 'Event {id} created', mn: '{id} үйл явдал үүслээ' },
  'ov.toast.stage': { en: '{id} advanced to {stage}', mn: '{id} — {stage} үе шат руу шилжлээ' },
  'ov.toast.stageBlocked': {
    en: '{id} blocked — {n} compulsory action(s) outstanding',
    mn: '{id} хаагдсан — {n} заавал биелүүлэх арга хэмжээ дутуу',
  },
  'ov.toast.action': { en: 'Action completed — {label}', mn: 'Арга хэмжээ биелэв — {label}' },
  // ---------------------------------------------------------------- ranked worklist (item 15)
  'wl.rowsNote': { en: '{rows} rows · {alerts} alerts', mn: '{rows} мөр · {alerts} сэрэмжлүүлэг' },
  'wl.similar': { en: '+{n} similar', mn: '+{n} ижил төрлийн' },
  'wl.collapse': { en: 'Collapse', mn: 'Хураах' },
  'wl.groupCount': { en: '×{n}', mn: '×{n}' },
  'wl.openEvent': { en: 'Open event', mn: 'Үйл явдлыг нээх' },
  'wl.actionHint': {
    en: 'Recommended by the rule playbook — an operator must validate the alert before this becomes an event',
    mn: 'Дүрмийн зааврын дагуу зөвлөсөн — оператор баталгаажуулсны дараа үйл явдал болно',
  },
  'wl.consequence': { en: 'This event will carry', mn: 'Энэ үйл явдал дагуулах зүйлс' },

  // ---------------------------------------------------------------- compulsory-action gate (item 43)
  'wl.gate.hint': {
    en: 'The stage cannot advance until each of these is completed, or overridden by a supervisor with a recorded justification.',
    mn: 'Доорх арга хэмжээ бүрийг биелүүлэх, эсвэл ахлах шалгуурыг бичгээр тайлбарлан давахгүйгээр үе шат ахихгүй.',
  },
  'wl.gate.complete': { en: 'Mark complete', mn: 'Биелсэн гэж тэмдэглэх' },

  'ov.toast.override': {
    en: 'Compulsory action overridden — written to the audit log',
    mn: 'Заавал биелүүлэх арга хэмжээг давсан — аудитын бүртгэлд тэмдэглэв',
  },

  // ---------------------------------------------------------------- L1: live validate dialog
  'ev.alertCleared': {
    en: 'This alert has cleared — the condition it reported no longer holds, so it can no longer be validated into an event. Close this dialog and pick a live alert.',
    mn: 'Энэ сэрэмжлүүлэг арилсан — мэдээлсэн нөхцөл нь одоо биелэхгүй байгаа тул үйл явдал болгон баталгаажуулах боломжгүй. Хаагаад идэвхтэй сэрэмжлүүлэг сонгоно уу.',
  },

  // ---------------------------------------------------------------- L6: drawer title, empty states
  'ev.drawerTitle': { en: 'Event {id}', mn: 'Үйл явдал {id}' },
  'alerts.noneHint': {
    en: 'No rule is currently breached. Start or speed up the simulation, or relax a threshold in Settings, to see alerts here.',
    mn: 'Одоогоор ямар ч дүрэм зөрчигдөөгүй. Симуляцыг эхлүүлэх/хурдасгах, эсвэл тохиргоонд босгыг сулруулснаар сэрэмжлүүлэг харагдана.',
  },
  'ev.noneHint': {
    en: 'Open the Alerts tab, validate an alert against telemetry, route status, CCTV and driver comms, and the event record will appear here.',
    mn: 'Сэрэмжлүүлэг таб дээр орж, телеметр, маршрутын байдал, CCTV, жолоочийн холбоогоор баталгаажуулсны дараа үйл явдлын бүртгэл энд харагдана.',
  },
  'ev.emptyRecommended': { en: 'No recommended actions', mn: 'Зөвлөсөн арга хэмжээ байхгүй' },
  'ev.emptyRecommendedHint': {
    en: 'This playbook carries compulsory actions only. Work through the compulsory list below to advance the stage.',
    mn: 'Энэ заавар зөвхөн заавал биелүүлэх арга хэмжээ агуулна. Үе шатыг ахиулахын тулд доорх заавал биелүүлэх хэсгийг гүйцээнэ үү.',
  },
  'ev.emptyAudit': { en: 'Audit log empty', mn: 'Аудитын бүртгэл хоосон' },
  'ev.emptyAuditHint': {
    en: 'Validating an alert, advancing a stage, completing an action or overriding a compulsory action writes a row here.',
    mn: 'Сэрэмжлүүлэг баталгаажуулах, үе шат ахиулах, арга хэмжээ биелүүлэх, заавал биелүүлэх арга хэмжээг давах үед энд мөр бичигдэнэ.',
  },

  // ---------------------------------------------------------------- L6: auto-drafted coordination
  // L718: PTCC asks, it never orders - both languages keep the request wording.
  'comms.draft.accident': {
    en: 'Incident Notification — {id}. Bus {bus} involved in a traffic accident at {where} ({at}). PTCC requests Traffic Police attendance and confirmation of the scene status. CCTV evidence is being preserved and will be made available on request.',
    mn: 'Тохиолдлын мэдэгдэл — {id}. {bus} автобус {where}-д ({at}) замын хөдөлгөөний осолд оролцсон. ЗТХБ-ын цагдаагийн ирэлт болон үйл явдлын газрын байдлыг тодруулахыг ПТХТ хүсэж байна. CCTV бичлэгийг хадгалж, шаардсан тохиолдолд гаргаж өгнө.',
  },
  'comms.draft.disruption': {
    en: 'Operational Instruction (request) — {id}. PTCC requests that the Operator OCC adjust headway for buses trailing route {route} to prevent bunching, and confirm the recovery plan for bus {bus}. Dispatch, towing and driver reassignment remain with the Operator OCC.',
    mn: 'Ажиллагааны заавар (хүсэлт) — {id}. {route} маршрутын дараах автобуснуудын интервалыг тохируулж овоорохоос сэргийлэх, мөн {bus} автобусны нөхөн ажиллагааны төлөвлөгөөг батлахыг ПТХТ Операторын OCC-с хүсэж байна. Явуулах, чирэх, жолооч солих нь Операторын OCC-д хамаарна.',
  },
  'comms.draft.congestion': {
    en: 'Coordination Request — {id}. Severe congestion affecting route {route} at {where}. PTCC requests signal timing review / priority consideration from the Traffic Control Centre. Note: no automatic PTCC–TCC interface exists; this is a manual channel (R967).',
    mn: 'Зохицуулалтын хүсэлт — {id}. {where}-д {route} маршрутад хүчтэй бөглөрөл үүсээд байна. Гэрлэн дохионы хугацааг хянах / тэргүүн эрх авах талаар ЗХУТ-аас ПТХТ хүсэж байна. Тэмдэглэл: ПТХТ–ЗХУТ хооронд автомат холболт байхгүй, энэ нь гар аргаар дамжих суваг (R967).',
  },

  // ---------------------------------------------------------------- L6: comms empty states
  'comms.emptyPassengerHint': {
    en: 'Draft a passenger message above. It is created as pending_approval and only an explicit approval publishes it (L1443).',
    mn: 'Дээрх талбарт зорчигчийн мэдээлэл боловсруулна уу. Энэ нь "зөвшөөрөл хүлээгдэж буй" төлөвтэй үүсэх бөгөөд зөвхөн шууд зөвшөөрснөөр нийтлэгдэнэ (L1443).',
  },
  'comms.emptyDraftsHint': {
    en: 'Drafts are derived from open events. Validate an alert into an event, and any accident, major disruption or severe congestion draft appears here.',
    mn: 'Төслүүд нээлттэй үйл явдлаас гаралтай. Сэрэмжлүүлгийг үйл явдал болгон баталгаажуулсны дараа осол, томоохон саатал, хүнд бөглөрлийн төслүүд энд харагдана.',
  },
  'comms.emptyCoordHint': {
    en: 'Send a coordination message above. PTCC requests and informs — it does not order (L718).',
    mn: 'Дээрээс зохицуулалтын мэдэгдэл илгээнэ үү. ПТХТ хүсэлт гаргаж, мэдээлдэг — тушаал өгдөггүй (L718).',
  },
  'alerts.filterSeverity': { en: 'Filter by severity', mn: 'Ноцтой байдлаар шүүх' },
  'alerts.filterType': { en: 'Filter by alert type', mn: 'Сэрэмжлүүлгийн төрлөөр шүүх' },

  // ---------------------------------------------------------------- hardening: honest empty states
  // The subject of a dialog can disappear while the dialog is open - an alert clears, an
  // event is removed, a compulsory action is completed from the drawer behind. Each of
  // those says WHAT happened and WHAT to do next, and the Confirm button is disabled.
  'ev.alertClearedTitle': { en: 'This alert has cleared', mn: 'Энэ сэрэмжлүүлэг арилсан' },
  'ev.eventGoneTitle': { en: 'This event is no longer in the record', mn: 'Энэ үйл явдал бүртгэлд алга' },
  'ev.eventGoneHint': {
    en: 'It was closed or removed while this panel was open. Close the drawer and pick an event from the Events tab.',
    mn: 'Энэ хэсэг нээлттэй байх хооронд хаагдсан эсвэл устсан байна. Хаагаад "Үйл явдал" табаас сонгоно уу.',
  },
  'ev.actionGoneTitle': { en: 'This action is no longer outstanding', mn: 'Энэ арга хэмжээ дутуу биш болсон' },
  'ev.actionGoneHint': {
    en: 'It was completed or already overridden while this dialog was open, so there is nothing left to override. Close this dialog.',
    mn: 'Энэ цонх нээлттэй байх хооронд биелсэн эсвэл давагдсан тул давах зүйл үлдсэнгүй. Цонхыг хаана уу.',
  },
  'ev.emptyCompulsory': { en: 'No compulsory actions', mn: 'Заавал биелүүлэх арга хэмжээ байхгүй' },
  'ev.emptyCompulsoryHint': {
    en: 'This playbook carries recommended actions only, so the stage gate has nothing outstanding to block on.',
    mn: 'Энэ заавар зөвхөн зөвлөсөн арга хэмжээ агуулах тул үе шатны хаалт саатуулах зүйлгүй.',
  },
  'ev.emptyEvidence': { en: 'No evidence attached yet', mn: 'Хавсаргасан нотолгоо алга' },
  'ev.emptyEvidenceHint': {
    en: 'CCTV clips, telemetry extracts and call recordings linked to this event are listed here as they are attached (L1384).',
    mn: 'Энэ үйл явдалтай холбоотой CCTV бичлэг, телеметрийн хэсэг, дуудлагын бичлэгийг хавсаргах тутам энд жагсаана (L1384).',
  },
  'wl.showingTop': {
    en: 'Showing the {n} highest-priority of {total} — narrow the filters to see the rest',
    mn: '{total}-аас хамгийн чухал {n}-ыг харуулж байна — бусдыг үзэхийн тулд шүүлтүүрээ нарийсгана уу',
  },
  'ev.auditShowing': {
    en: 'Showing the {n} most recent of {total} audit entries',
    mn: 'Аудитын {total} бичлэгээс хамгийн сүүлийн {n}-г харуулж байна',
  },

  // ---------------------------------------------------------------- hardening: Command Centre
  'cc.bootTitle': { en: 'Waiting for the first simulation frame', mn: 'Симуляцын эхний хүрээг хүлээж байна' },
  'cc.bootText': {
    en: 'Every figure on this screen is read from the running simulation. Press Play in the header, or choose a scenario, and the tiles, map and alert list fill in.',
    mn: 'Энэ дэлгэцийн бүх тоо ажиллаж буй симуляцаас уншигдана. Дээд талын Play товчийг дарах эсвэл хувилбар сонгоход хавтан, газрын зураг, сэрэмжлүүлгийн жагсаалт дүүрнэ.',
  },
  'cc.emptyDelayed': { en: 'No route data yet', mn: 'Маршрутын өгөгдөл алга' },
  'cc.emptyDelayedHint': {
    en: 'This ranks the three routes with the largest mean schedule deviation. It fills as soon as at least one route has a vehicle in service.',
    mn: 'Энэ нь хуваарийн дундаж хазайлт хамгийн их гурван маршрутыг эрэмбэлнэ. Дор хаяж нэг маршрут үйлчилгээнд орсон даруйд дүүрнэ.',
  },
  'cc.emptyLoad': { en: 'No load data yet', mn: 'Ачааллын өгөгдөл алга' },
  'cc.emptyLoadHint': {
    en: 'This ranks the three busiest routes by passenger load. It fills as soon as at least one route has a vehicle in service.',
    mn: 'Энэ нь зорчигчийн ачааллаар хамгийн их гурван маршрутыг эрэмбэлнэ. Дор хаяж нэг маршрут үйлчилгээнд орсон даруйд дүүрнэ.',
  },
  'cc.emptyOnTime': { en: 'No on-time data yet', mn: 'Цагийн баримжааны өгөгдөл алга' },
  'cc.emptyOnTimeHint': {
    en: 'On-time performance is weighted by vehicles in service, so it needs at least one operating route. Start the simulation to see the three operators compared.',
    mn: 'Цаг баримтлалт нь үйлчилгээнд яваа тээврийн хэрэгслээр жигнэгддэг тул дор хаяж нэг ажиллаж буй маршрут шаардлагатай. Гурван операторыг харьцуулахын тулд симуляцыг эхлүүлнэ үү.',
  },
} as const satisfies Record<string, Entry>;
