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
    mn: 'Програмын бусад хэсэг ажиллаж байна. Өөр дэлгэц рүү шилжих эсвэл дахин ачаална уу.',
  },
  'ov.err.reload': { en: 'Reload', mn: 'Дахин ачаалах' },

  // ---------------------------------------------------------------- presenter help
  'ov.help.title': { en: 'Presenter keys', mn: 'Илтгэгчийн товчлуур' },
  'ov.help.scenarios': { en: 'Scenarios', mn: 'Хувилбарууд' },

  // ---------------------------------------------------------------- governance toasts
  'ov.toast.ack': { en: 'Alert {id} acknowledged', mn: '{id} сэрэмжлүүлгийг хүлээн авлаа' },
  'ov.toast.event': { en: 'Event {id} created', mn: '{id} үйл явдал үүслээ' },
  'ov.toast.stage': { en: '{id} advanced to {stage}', mn: '{id} — {stage} үе шатад шилжлээ' },
  'ov.toast.stageBlocked': {
    en: '{id} blocked — {n} compulsory action(s) outstanding',
    mn: '{id} ахих боломжгүй — {n} заавал хийх арга хэмжээ дутуу',
  },
  'ov.toast.action': { en: 'Action completed — {label}', mn: 'Арга хэмжээ гүйцэтгэв — {label}' },
  // ---------------------------------------------------------------- ranked worklist (item 15)
  'wl.rowsNote': { en: '{rows} rows · {alerts} alerts', mn: '{rows} мөр · {alerts} сэрэмжлүүлэг' },
  'wl.similar': { en: '+{n} similar', mn: '+{n} ижил төрлийн' },
  'wl.collapse': { en: 'Collapse', mn: 'Хураах' },
  'wl.groupCount': { en: '×{n}', mn: '×{n}' },
  'wl.openEvent': { en: 'Open event', mn: 'Үйл явдлыг нээх' },
  'wl.actionHint': {
    en: 'Recommended by the rule playbook — an operator must validate the alert before this becomes an event',
    mn: 'Дүрмийн зааврын зөвлөмж — оператор сэрэмжлүүлгийг баталгаажуулсны дараа үйл явдал болно',
  },
  'wl.consequence': { en: 'This event will carry', mn: 'Энэ үйл явдалд хамаарах зүйл' },

  // ---------------------------------------------------------------- compulsory-action gate (item 43)
  'wl.gate.hint': {
    en: 'The stage cannot advance until each of these is completed, or overridden by a supervisor with a recorded justification.',
    mn: 'Эдгээрийг бүгдийг гүйцэтгэх, эсвэл ахлах хянагч үндэслэлээ бүртгэж хүчингүй болгохоос нааш үе шат ахихгүй.',
  },
  'wl.gate.complete': { en: 'Mark complete', mn: 'Гүйцэтгэсэн гэж тэмдэглэх' },

  'ov.toast.override': {
    en: 'Compulsory action overridden — written to the audit log',
    mn: 'Заавал хийх арга хэмжээг хүчингүй болгосон — аудитын бүртгэлд тэмдэглэв',
  },

  // ---------------------------------------------------------------- L1: live validate dialog
  'ev.alertCleared': {
    en: 'This alert has cleared — the condition it reported no longer holds, so it can no longer be validated into an event. Close this dialog and pick a live alert.',
    mn: 'Энэ сэрэмжлүүлэг арилсан — мэдээлсэн нөхцөл нь байхгүй болсон тул үйл явдал болгон баталгаажуулах боломжгүй. Цонхыг хааж, идэвхтэй сэрэмжлүүлэг сонгоно уу.',
  },

  // ---------------------------------------------------------------- L6: drawer title, empty states
  'ev.drawerTitle': { en: 'Event {id}', mn: 'Үйл явдал {id}' },
  'alerts.noneHint': {
    en: 'No rule is currently breached. Start or speed up the simulation, or relax a threshold in Settings, to see alerts here.',
    mn: 'Одоогоор ямар ч дүрмийн босго давагдаагүй. Сэрэмжлүүлэг харахын тулд загварчлалыг эхлүүлэх/хурдасгах, эсвэл Тохиргоонд босгыг сулруулна уу.',
  },
  'ev.noneHint': {
    en: 'Open the Alerts tab, validate an alert against telemetry, route status, CCTV and driver comms, and the event record will appear here.',
    mn: 'Сэрэмжлүүлэг табыг нээж, сэрэмжлүүлгийг телеметр, чиглэлийн төлөв, хяналтын камер, жолоочтой холбоо барих замаар баталгаажуулбал үйл явдлын бүртгэл энд гарна.',
  },
  'ev.emptyRecommended': { en: 'No recommended actions', mn: 'Зөвлөмж болгосон арга хэмжээ алга' },
  'ev.emptyRecommendedHint': {
    en: 'This playbook carries compulsory actions only. Work through the compulsory list below to advance the stage.',
    mn: 'Энэ зааварт зөвхөн заавал хийх арга хэмжээ бий. Үе шатыг ахиулахын тулд доорх жагсаалтыг гүйцэтгэнэ үү.',
  },
  'ev.emptyAudit': { en: 'Audit log empty', mn: 'Аудитын бүртгэл хоосон' },
  'ev.emptyAuditHint': {
    en: 'Validating an alert, advancing a stage, completing an action or overriding a compulsory action writes a row here.',
    mn: 'Сэрэмжлүүлэг баталгаажуулах, үе шат ахиулах, арга хэмжээ гүйцэтгэх, заавал хийх арга хэмжээг хүчингүй болгох бүрд энд мөр нэмэгдэнэ.',
  },

  // ---------------------------------------------------------------- L6: auto-drafted coordination
  // L718: PTCC asks, it never orders - both languages keep the request wording.
  'comms.draft.accident': {
    en: 'Incident Notification — {id}. Bus {bus} involved in a traffic accident at {where} ({at}). PTCC requests Traffic Police attendance and confirmation of the scene status. CCTV evidence is being preserved and will be made available on request.',
    mn: 'Ослын мэдэгдэл — {id}. {bus} автобус {where}-д ({at}) зам тээврийн осолд орсон. Замын цагдаа хэргийн газарт ирж, нөхцөл байдлыг баталгаажуулахыг PTCC хүсэж байна. Хяналтын камерын бичлэгийг хадгалж байгаа бөгөөд хүсэлтээр гаргаж өгнө.',
  },
  'comms.draft.disruption': {
    en: 'Operational Instruction (request) — {id}. PTCC requests that the Operator OCC adjust headway for buses trailing route {route} to prevent bunching, and confirm the recovery plan for bus {bus}. Dispatch, towing and driver reassignment remain with the Operator OCC.',
    mn: 'Үйл ажиллагааны заавар (хүсэлт) — {id}. {route} чиглэлд араас явж буй автобусны давтамжийг тохируулж бөөгнөрлөөс сэргийлэх, {bus} автобусны сэргэлтийн төлөвлөгөөг баталгаажуулахыг PTCC Автобусны операторын төвөөс хүсэж байна. Диспетчер, чирэлт, жолооч солих асуудал Автобусны операторын төвийн мэдэлд хэвээр байна.',
  },
  'comms.draft.congestion': {
    en: 'Coordination Request — {id}. Severe congestion affecting route {route} at {where}. PTCC requests signal timing review / priority consideration from the Traffic Control Centre. Note: no automatic PTCC–TCC interface exists; this is a manual channel (R967).',
    mn: 'Зохицуулалтын хүсэлт — {id}. {where}-д хүчтэй түгжрэл үүсч, {route} чиглэлд нөлөөлж байна. PTCC нь Замын хөдөлгөөний удирдлагын төв (ЗХУТ)-өөс гэрлэн дохионы хугацааг хянах / тэргүүн ээлж олгох асуудлыг авч үзэхийг хүсэж байна. Тэмдэглэл: PTCC–ЗХУТ хооронд автомат холболт байхгүй, энэ нь гар ажиллагаатай суваг (R967).',
  },

  // ---------------------------------------------------------------- L6: comms empty states
  'comms.emptyPassengerHint': {
    en: 'Draft a passenger message above. It is created as pending_approval and only an explicit approval publishes it (L1443).',
    mn: 'Дээр зорчигчийн мэдэгдэл бэлтгэнэ үү. Энэ нь "Батлахыг хүлээж байна" төлөвтэй үүсэх ба зөвхөн тодорхой батласны дараа нийтлэгдэнэ (L1443).',
  },
  'comms.emptyDraftsHint': {
    en: 'Drafts are derived from open events. Validate an alert into an event, and any accident, major disruption or severe congestion draft appears here.',
    mn: 'Ноорог нь нээлттэй үйл явдлаас үүснэ. Сэрэмжлүүлгийг үйл явдал болгон баталгаажуулбал осол, томоохон тасалдал, хүчтэй түгжрэлийн ноорог энд гарна.',
  },
  'comms.emptyCoordHint': {
    en: 'Send a coordination message above. PTCC requests and informs — it does not order (L718).',
    mn: 'Дээрээс зохицуулалтын мэдэгдэл илгээнэ үү. PTCC хүсэлт гаргаж, мэдээлдэг — тушаал өгдөггүй (L718).',
  },
  'comms.proactiveProposal': { en: 'Proactive proposal', mn: 'Урьдчилсан санал' },
  'comms.escalationRequest': { en: 'Escalation request', mn: 'Дээд шатны хяналтын хүсэлт' },
  'comms.reason': { en: 'Reason', mn: 'Үндэслэл' },
  'comms.evidence': { en: 'Supporting evidence', mn: 'Нотлох баримт' },
  'comms.recommendedAction': { en: 'Action for review', mn: 'Хянаж үзэх арга хэмжээ' },
  'comms.pendingWork': { en: 'Pending communication work', mn: 'Хүлээгдэж буй харилцаа холбооны ажил' },
  'comms.pendingWorkHint': { en: '{n} item(s) require human review or handoff. Drafts are listed before sent records.', mn: '{n} зүйлд хүний хяналт эсвэл дамжуулалт шаардлагатай. Нооргийг илгээсэн бүртгэлээс түрүүнд харуулна.' },
  'comms.pendingWorkClear': { en: 'No communication item is waiting for human action.', mn: 'Хүний үйлдэл хүлээж буй харилцаа холбооны зүйл алга.' },
  'comms.pendingPassenger': { en: 'Passenger approvals', mn: 'Зорчигчийн мэдээллийн баталгаажуулалт' },
  'comms.actualL3Drafts': { en: 'Actual L3 drafts', mn: 'Бодит L3 ноорог' },
  'comms.escalationRequests': { en: 'Escalation requests', mn: 'Дээд шатны хяналтын хүсэлт' },
  'comms.proactiveDrafts': { en: 'Proactive proposals', mn: 'Урьдчилсан санал' },
  'comms.recordTelephoneHandoff': { en: 'Record telephone handoff', mn: 'Утасны дамжуулалтыг бүртгэх' },
  'comms.telephoneHandoffHint': { en: 'No system interface exists. Call TCC, then use this button to record that the manual handoff was completed.', mn: 'Системийн холболт байхгүй. ЗХУТ рүу утасдаад, гар ажиллагаатай дамжуулалт дууссаныг энэ товчоор бүртгэнэ үү.' },
  'comms.sendNotPermitted': { en: 'Your role cannot send coordination messages.', mn: 'Таны үүрэгт зохицуулалтын мэдэгдэл илгээх эрх алга.' },
  'comms.openSource': { en: 'Open source context', mn: 'Эх нөхцөлийг нээх' },
  'alerts.filterSeverity': { en: 'Filter by severity', mn: 'Зэрэглэлээр шүүх' },
  'alerts.filterType': { en: 'Filter by alert type', mn: 'Сэрэмжлүүлгийн төрлөөр шүүх' },

  // ---------------------------------------------------------------- hardening: honest empty states
  // The subject of a dialog can disappear while the dialog is open - an alert clears, an
  // event is removed, a compulsory action is completed from the drawer behind. Each of
  // those says WHAT happened and WHAT to do next, and the Confirm button is disabled.
  'ev.alertClearedTitle': { en: 'This alert has cleared', mn: 'Энэ сэрэмжлүүлэг арилсан' },
  'ev.eventGoneTitle': { en: 'This event is no longer in the record', mn: 'Энэ үйл явдал бүртгэлд байхгүй болсон' },
  'ev.eventGoneHint': {
    en: 'It was closed or removed while this panel was open. Close the drawer and pick an event from the Events tab.',
    mn: 'Энэ самбар нээлттэй байх үед хаагдсан эсвэл устгагдсан. Самбарыг хааж, "Үйл явдал" табаас сонгоно уу.',
  },
  'ev.actionGoneTitle': { en: 'This action is no longer outstanding', mn: 'Энэ арга хэмжээ шийдэгдсэн' },
  'ev.actionGoneHint': {
    en: 'It was completed or already overridden while this dialog was open, so there is nothing left to override. Close this dialog.',
    mn: 'Энэ цонх нээлттэй байх үед гүйцэтгэсэн эсвэл хүчингүй болгосон тул хүчингүй болгох зүйл үлдсэнгүй. Цонхыг хаана уу.',
  },
  'ev.emptyCompulsory': { en: 'No compulsory actions', mn: 'Заавал хийх арга хэмжээ алга' },
  'ev.emptyCompulsoryHint': {
    en: 'This playbook carries recommended actions only, so the stage gate has nothing outstanding to block on.',
    mn: 'Энэ зааварт зөвхөн зөвлөмж болгосон арга хэмжээ байгаа тул үе шатыг хаах дутуу зүйл алга.',
  },
  'ev.emptyEvidence': { en: 'No evidence attached yet', mn: 'Нотолгоо хавсаргаагүй байна' },
  'ev.emptyEvidenceHint': {
    en: 'CCTV clips, telemetry extracts and call recordings linked to this event are listed here as they are attached (L1384).',
    mn: 'Энэ үйл явдалд холбогдох хяналтын камерын бичлэг, телеметрийн хэсэг, дуудлагын бичлэгийг хавсаргах тутам энд жагсаана (L1384).',
  },
  'wl.showingTop': {
    en: 'Showing the {n} highest-priority of {total} — narrow the filters to see the rest',
    mn: '{total}-аас хамгийн чухал {n}-ийг харуулж байна — бусдыг харахын тулд шүүлтүүрээ нарийсгана уу',
  },
  'ev.auditShowing': {
    en: 'Showing the {n} most recent of {total} audit entries',
    mn: 'Аудитын {total} бичлэгээс сүүлийн {n}-ийг харуулж байна',
  },

  // ---------------------------------------------------------------- hardening: Command Centre
  'cc.bootTitle': { en: 'Waiting for the first simulation frame', mn: 'Загварчлалын эхний өгөгдлийг хүлээж байна' },
  'cc.bootText': {
    en: 'Every figure on this screen is read from the running simulation. Press Play in the header, or choose a scenario, and the tiles, map and alert list fill in.',
    mn: 'Энэ дэлгэцийн бүх тоо ажиллаж буй загварчлалаас уншигдана. Дээд талын ▶ (Play) товчийг дарах эсвэл хувилбар сонговол хавтан, газрын зураг, сэрэмжлүүлгийн жагсаалт дүүрнэ.',
  },
  'cc.emptyDelayed': { en: 'No route data yet', mn: 'Чиглэлийн өгөгдөл хараахан алга' },
  'cc.emptyDelayedHint': {
    en: 'This ranks the three routes with the largest mean schedule deviation. It fills as soon as at least one route has a vehicle in service.',
    mn: 'Хуваарийн дундаж зөрүү хамгийн их гурван чиглэлийг эрэмбэлнэ. Дор хаяж нэг чиглэлд автобус үйлчилгээнд гармагц дүүрнэ.',
  },
  'cc.emptyLoad': { en: 'No load data yet', mn: 'Ачааллын өгөгдөл хараахан алга' },
  'cc.emptyLoadHint': {
    en: 'This ranks the three busiest routes by passenger load. It fills as soon as at least one route has a vehicle in service.',
    mn: 'Зорчигчийн ачаалал хамгийн их гурван чиглэлийг эрэмбэлнэ. Дор хаяж нэг чиглэлд автобус үйлчилгээнд гармагц дүүрнэ.',
  },
  'cc.emptyOnTime': { en: 'No on-time data yet', mn: 'Цагтаа гүйцэтгэлийн өгөгдөл хараахан алга' },
  'cc.emptyOnTimeHint': {
    en: 'On-time performance is weighted by vehicles in service, so it needs at least one operating route. Start the simulation to see the three operators compared.',
    mn: 'Цагтаа гүйцэтгэлийг үйлчилгээнд буй автобусны тоогоор жигнэдэг тул дор хаяж нэг чиглэл ажиллаж байх шаардлагатай. Гурван операторыг харьцуулж харахын тулд загварчлалыг эхлүүлнэ үү.',
  },
} as const satisfies Record<string, Entry>;
