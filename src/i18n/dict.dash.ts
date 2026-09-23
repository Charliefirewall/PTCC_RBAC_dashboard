/**
 * Bilingual strings owned by the "dash" workstream.
 *
 * Split out of dict.ts so parallel work on different areas cannot clobber a shared
 * file. Merged into the main dictionary by dict.ts; keys must stay globally unique.
 *
 * Mongolian here is NOT from the client's deck - leave `r` unset so unreviewedKeys()
 * keeps reporting it for native review (plan risk R11).
 */
import type { Entry } from './dict';

export const dashDict = {
  // ---------------------------------------------------------------- agent decision queue
  // D-4 / §1.5: the role dashboards compose from the agent decision queue as well as
  // events, because decisions exist from second one and events only after validation.
  'dash.agentQueue': {
    en: 'Agent queue — awaiting validation',
    mn: 'Агентын дараалал — баталгаажуулалт хүлээж буй',
  },
  'dash.agentQueueNote': {
    en: 'Proposed by the agent layer from live alerts. It becomes an event only when an operator validates it (L1235).',
    mn: 'Агентын давхарга шууд сэрэмжлүүлгээс санал болгосон. Оператор баталгаажуулсны дараа л үйл явдал болно (L1235).',
  },
  'dash.proposedN': { en: '{n} proposed', mn: '{n} санал' },
  'dash.eventsAndQueue': { en: '{n} open · {q} proposed', mn: '{n} нээлттэй · {q} санал' },
  'dash.openConsole': { en: 'Agent Console', mn: 'Агентын консол' },
  'dash.notYetEvent': {
    en: 'Not an event yet — operator validation creates it (L1235).',
    mn: 'Үйл явдал болоогүй — оператор баталгаажуулснаар үүснэ (L1235).',
  },

  // ---------------------------------------------------------------- proposal detail
  'dash.proposal': { en: 'Agent proposal', mn: 'Агентын санал' },
  'dash.propType': { en: 'Proposed type', mn: 'Санал болгосон төрөл' },
  'dash.propSeverity': { en: 'Proposed severity', mn: 'Санал болгосон ноцтой байдал' },
  'dash.propPlaybook': { en: 'Playbook', mn: 'Арга хэмжээний заавар' },
  'dash.propActions': { en: 'Actions · compulsory', mn: 'Арга хэмжээ · заавал' },
  'dash.confidence': { en: 'Confidence', mn: 'Итгэлийн түвшин' },
  'dash.why': { en: 'Why the agent says so', mn: 'Агент яагаад ингэж үзэв' },

  // ---------------------------------------------------------------- lifecycle
  'dash.lifecycle': { en: 'Agent lifecycle', mn: 'Агентын ажлын мөчлөг' },
  'dash.thenWorkflow': {
    en: 'Approval plus operator validation creates the event; the seven-stage workflow starts there.',
    mn: 'Зөвшөөрөл ба операторын баталгаажуулалтаар үйл явдал үүсч, долоон шаттай ажлын урсгал эндээс эхэлнэ.',
  },

  // ---------------------------------------------------------------- playbook preview
  'dash.playbookPreview': { en: 'Playbook preview', mn: 'Зааврыг урьдчилан харах' },
  'dash.playbookPreviewNote': {
    en: 'The checklist this incident will carry once validated. Read-only until then.',
    mn: 'Баталгаажсаны дараа энэ осолд хамаарах хяналтын хуудас. Түүнээс өмнө зөвхөн харах боломжтой.',
  },

  // ---------------------------------------------------------------- communication roll-up
  'dash.commsRequired': { en: 'Communication actions in the queue', mn: 'Дараалал дахь мэдээллийн арга хэмжээ' },
  'dash.commsRequiredNote': {
    en: 'Playbook actions of the open agent queue that are communication work. Each becomes approvable only once a message is drafted for it (L1443).',
    mn: 'Агентын нээлттэй дараалал дахь зааврын мэдээлэлтэй холбоотой арга хэмжээ. Тус бүрд мэдэгдлийн ноорог бэлдсэний дараа л батлах боломжтой болно (L1443).',
  },
  'dash.timesN': { en: '× {n}', mn: '× {n}' },
  // ---------------------------------------------------------------- narrative hero (§6.3)
  // Every figure is a parameter filled from `metrics.funnel` / `useAlerts` at render
  // time. Nothing here states a number of its own.
  'dash.heroKicker': { en: 'Analysis cycle {status} · {time} · PTCC Ulaanbaatar', mn: 'Шинжилгээний мөчлөг {status} · {time} · PTCC Улаанбаатар' },
  'dash.cycleLive': { en: 'running', mn: 'ажиллаж байна' },
  'dash.cyclePaused': { en: 'paused', mn: 'түр зогссон' },
  'dash.greetMorning': { en: 'Good morning.', mn: 'Өглөөний мэнд.' },
  'dash.greetAfternoon': { en: 'Good afternoon.', mn: 'Өдрийн мэнд.' },
  'dash.greetEvening': { en: 'Good evening.', mn: 'Оройн мэнд.' },
  'dash.heroHeadline': {
    en: '{greeting} {n} of {total} buses need attention.',
    mn: '{greeting} {total} автобуснаас {n} нь анхаарал шаардаж байна.',
  },
  'dash.heroHeadlineClear': {
    en: '{greeting} All {total} buses are operating normally.',
    mn: '{greeting} {total} автобус бүгд хэвийн ажиллаж байна.',
  },
  'dash.heroSub': {
    en: '{crit} critical alerts · {routes} routes affected · {offline} on-board devices offline',
    mn: '{crit} ноцтой сэрэмжлүүлэг · {routes} чиглэлд нөлөөлсөн · {offline} бортын төхөөрөмж тасарсан',
  },
  'dash.ctaAlerts': { en: 'Review {n} alerts', mn: '{n} сэрэмжлүүлгийг хянах' },
  'dash.ctaAgent': { en: 'Agent console', mn: 'Агентын консол' },
  'dash.ctaMap': { en: 'Open fleet map', mn: 'Паркийн газрын зургийг нээх' },
  'dash.ctaHealth': { en: '{n} devices offline', mn: '{n} төхөөрөмж тасарсан' },

  // ---------------------------------------------------------------- KPI tile foots (item 26 / A-4)
  'dash.kpiOfPlanned': { en: 'of {total} planned routes', mn: 'төлөвлөсөн {total} чиглэлээс' },
  'dash.kpiSince': { en: '{d} since {time}', mn: '{time}-аас хойш {d}' },
  'dash.kpiPaxToday': { en: 'boardings since service start', mn: 'үйлчилгээ эхэлснээс хойш суусан зорчигч' },
  'dash.kpiHealthHint': { en: 'share of on-board devices reporting', mn: 'мэдээлэл илгээж буй бортын төхөөрөмжийн хувь' },

  // ---------------------------------------------------------------- panel sub / foot (item 27 / A-6)
  'dash.subPriority': {
    en: 'Ranked by impact score — alert severity multiplied by the passengers affected.',
    mn: 'Нөлөөллийн оноогоор эрэмбэлсэн — сэрэмжлүүлгийн ноцтой байдлыг нөлөөлөлд өртсөн зорчигчийн тоогоор үржүүлсэн.',
  },
  'dash.footPriority': { en: 'Click a row to open that vehicle or route.', mn: 'Мөр дээр дарж тухайн тээврийн хэрэгсэл эсвэл чиглэлийг нээнэ.' },
  'dash.linkAlerts': { en: 'All alerts & events', mn: 'Бүх сэрэмжлүүлэг ба үйл явдал' },
  'dash.subDelayed': {
    en: 'Mean schedule deviation per route, the worst three right now.',
    mn: 'Чиглэл тус бүрийн хуваарийн дундаж зөрүү, одоогийн хамгийн муу гурав.',
  },
  'dash.footDelayed': { en: 'Bars scale to the worst route.', mn: 'Баганын уртыг хамгийн муу чиглэлээр жишсэн.' },
  'dash.linkRegularity': { en: 'Service regularity', mn: 'Үйлчилгээний тогтмол байдал' },
  'dash.subLoad': {
    en: 'Passenger load against capacity, the worst three right now.',
    mn: 'Багтаамжтай харьцуулсан зорчигчийн ачаалал, одоогийн хамгийн их гурав.',
  },
  'dash.footLoad': { en: 'Colour = the slide 8 load bands.', mn: 'Өнгө = 8-р слайдын ачааллын ангилал.' },
  'dash.linkPassenger': { en: 'Passenger intelligence', mn: 'Зорчигчийн эрэлт, ачаалал' },
  'dash.subOnTime': {
    en: 'On-time share per operator, weighted by the vehicles each one runs.',
    mn: 'Оператор тус бүрийн цагтаа гүйцэтгэл, ажиллуулж буй тээврийн хэрэгслийн тоогоор жигнэсэн.',
  },
  'dash.footOnTime': { en: 'Green from 90 %, amber from 75 %.', mn: 'Ногоон ≥ 90 %, шар ≥ 75 %.' },
  'dash.linkOperators': { en: 'Operator performance', mn: 'Операторын гүйцэтгэл' },
  'dash.subHealth': {
    en: 'On-board equipment that has stopped reporting, counted as vehicles per device type.',
    mn: 'Мэдээлэл илгээхээ больсон бортын төхөөрөмж, төрөл тус бүрээр тээврийн хэрэгслийн тоогоор.',
  },
  'dash.footHealth': { en: 'A vehicle can appear in more than one row.', mn: 'Нэг тээврийн хэрэгсэл хэд хэдэн мөрөнд орж болно.' },
  'dash.linkHealth': { en: 'Fleet health', mn: 'Системийн найдвартай байдал' },

  // ---------------------------------------------------------------- role-widget empty states
  /*
   * Every one of these answers two questions the bare "—" and the bare one-word labels
   * did not: WHAT will this panel show, and WHAT makes it appear. Emptiness that is good
   * news (nothing pending, nothing assigned, no open incident) is rendered with
   * tone="ok" at the call site, so it reads as reassurance rather than as absence.
   *
   * There is deliberately no "loading" text for a computed panel: every number on the
   * role dashboards is derived synchronously from a store, so a spinner would be a lie.
   * The only honest wait is for the simulation's first tick, which is what waitTitle says.
   */
  'dash.e.waitTitle': { en: 'Waiting for the first reading', mn: 'Эхний хэмжилтийг хүлээж байна' },
  'dash.e.waitText': {
    en: 'The simulation has not produced a snapshot yet. The figures appear on the next tick — no action needed.',
    mn: 'Загварчлал хараахан төлөв гаргаагүй байна. Тоонууд дараагийн алхамд гарна — юу ч хийх шаардлагагүй.',
  },
  'dash.e.waitPausedText': {
    en: 'The clock is paused, so no snapshot exists yet. Press play in the top bar to start the feed.',
    mn: 'Цаг түр зогссон тул төлөв хараахан алга. Өгөгдлийн урсгалыг эхлүүлэхийн тулд дээд мөрний тоглуулах товчийг дарна уу.',
  },
  'dash.e.opsIdleTitle': { en: 'No vehicle is running', mn: 'Ажиллаж буй тээврийн хэрэгсэл алга' },
  'dash.e.opsIdleText': {
    en: 'On-time performance is weighted by the vehicles each route runs, and no route is running one right now. The figures return with the first departure.',
    mn: 'Цагтаа гүйцэтгэлийг чиглэл бүрийн ажиллуулж буй тээврийн хэрэгслээр жигнэдэг бөгөөд одоо аль ч чиглэлд тээврийн хэрэгсэл ажиллахгүй байна. Эхний рейс гарахад тоонууд эргэн гарна.',
  },
  'dash.e.aiAlertsTitle': { en: 'No repeated-failure patterns', mn: 'Давтагдсан гэмтлийн хэв шинж алга' },
  'dash.e.aiAlertsText': {
    en: 'A tier-3 alert appears here when the same fault repeats on one vehicle, route or operator. Nothing is repeating.',
    mn: 'Нэг тээврийн хэрэгсэл, чиглэл эсвэл операторт ижил гэмтэл давтагдвал 3-р түвшний сэрэмжлүүлэг энд гарна. Одоогоор давтагдаж буй зүйл алга.',
  },
  'dash.e.incidentsTitle': { en: 'No open incidents', mn: 'Нээлттэй осол алга' },
  'dash.e.incidentsText': {
    en: 'Validated events and the agent proposals still awaiting validation are listed here as they arise.',
    mn: 'Баталгаажсан үйл явдал болон баталгаажуулалт хүлээж буй агентын саналууд үүсмэгц энд жагсана.',
  },
  'dash.e.queueTitle': { en: 'Queue clear', mn: 'Дараалал хоосон' },
  'dash.e.queueText': {
    en: 'Open events queue here, highest severity first, with the agent proposals underneath. Validate an alert on the Emergency Handling screen to put one here.',
    mn: 'Нээлттэй үйл явдлууд хамгийн ноцтойгоос нь эхлэн энд дараалж, доор нь агентын саналууд байрлана. Энд нэмэхийн тулд "Сэрэмжлүүлэг ба үйл явдал" дэлгэцэд сэрэмжлүүлгийг баталгаажуулна уу.',
  },
  'dash.e.pickTitle': { en: 'No incident selected', mn: 'Осол сонгоогүй байна' },
  'dash.e.detailText': {
    en: 'Select a row in the incident queue to see its record here: severity, location, playbook and how many compulsory actions are still outstanding.',
    mn: 'Ослын дарааллаас мөр сонговол түүний бүртгэл энд харагдана: ноцтой байдал, байршил, арга хэмжээний заавар, дутуу үлдсэн заавал хийх арга хэмжээний тоо.',
  },
  'dash.e.escalationText': {
    en: 'Select an incident to follow it through the seven workflow stages and to advance it when its compulsory actions allow.',
    mn: 'Осол сонгож, түүнийг ажлын урсгалын долоон шатаар дагаж, заавал хийх арга хэмжээ нь зөвшөөрөх үед дараагийн шатанд шилжүүлнэ.',
  },
  'dash.e.checklistText': {
    en: 'Select an incident to work through its playbook checklist. Compulsory items are marked and gate stage progression.',
    mn: 'Осол сонгож, түүний зааврын хяналтын хуудсыг гүйцэтгэнэ. Заавал хийх зүйлсийг тэмдэглэсэн бөгөөд тэдгээрийг гүйцэтгэхгүйгээр дараагийн шатанд шилжихгүй.',
  },
  'dash.e.instrText': {
    en: 'Select an incident to generate the ground instructions for it — location, confirmed type and the outstanding playbook steps.',
    mn: 'Осол сонговол түүнд зориулсан газар дээрх заавар үүснэ — байршил, баталгаажсан төрөл, зааврын дутуу алхмууд.',
  },
  'dash.e.evidenceText': {
    en: 'Select an incident to see the evidence attached to it — photographs, CCTV references and reports keyed to the event id.',
    mn: 'Осол сонговол түүнд хавсаргасан нотлох баримт харагдана — үйл явдлын дугаартай холбосон гэрэл зураг, хяналтын камерын холбоос, тайлан.',
  },
  'dash.e.approvalsTitle': { en: 'Nothing awaiting your approval', mn: 'Таны батлахыг хүлээж буй зүйл алга' },
  'dash.e.approvalsText': {
    en: 'A passenger message must be approved before it is dispatched (L1443). Drafted messages queue here for release.',
    mn: 'Зорчигчид зориулсан мэдэгдлийг илгээхээс өмнө батлах ёстой (L1443). Бэлдсэн мэдэгдлүүд илгээгдэхээс өмнө энд дараалалд орно.',
  },
  'dash.e.commsLogTitle': { en: 'No coordination messages yet', mn: 'Зохицуулалтын мэдэгдэл хараахан алга' },
  'dash.e.commsLogText': {
    en: 'Every message sent to an agency or an operator is recorded here with its recipient and the time it left.',
    mn: 'Байгууллага эсвэл операторт илгээсэн мэдэгдэл бүр хүлээн авагч, илгээсэн цагийн хамт энд бүртгэгдэнэ.',
  },
  'dash.e.recsTitle': { en: 'Nothing to dispatch', mn: 'Диспетчерийн шийдвэр шаардлагагүй' },
  'dash.e.recsText': {
    en: 'Warning and critical alerts appear here with the standby, diversion, inspection or vehicle-swap action each one implies.',
    mn: 'Анхааруулга болон ноцтой сэрэмжлүүлэг бүр шаардах арга хэмжээний хамт энд гарна: нөөц автобус, тойруу зам, үзлэг эсвэл тээврийн хэрэгсэл солих.',
  },
  'dash.e.assignedTitle': { en: 'Nothing assigned to you', mn: 'Танд оноосон ажил алга' },
  'dash.e.assignedText': {
    en: 'Incidents at the ground-verification stages appear here, together with the agent proposals still awaiting validation.',
    mn: 'Газар дээр шалгах шатанд буй осол, мөн баталгаажуулалт хүлээж буй агентын саналууд энд гарна.',
  },
  'dash.e.actionsTitle': { en: 'No checklist on this incident', mn: 'Энэ осолд хяналтын хуудас алга' },
  'dash.e.actionsText': {
    en: 'The playbook this incident carries defines no actions, so there is nothing to complete before it advances.',
    mn: 'Энэ ослын зааварт арга хэмжээ тодорхойлоогүй тул дараагийн шатанд шилжүүлэхээс өмнө гүйцэтгэх зүйл алга.',
  },
  'dash.e.bundleTitle': { en: 'No evidence attached', mn: 'Хавсаргасан нотлох баримт алга' },
  'dash.e.bundleText': {
    en: 'Photographs, CCTV references and reports linked to this incident will be listed here as they are recorded.',
    mn: 'Энэ осолтой холбоотой гэрэл зураг, хяналтын камерын холбоос, тайлан бүртгэгдэх тусам энд жагсана.',
  },
  'dash.e.auditTitle': { en: 'No actions recorded yet', mn: 'Бүртгэгдсэн үйлдэл хараахан алга' },
  'dash.e.auditText': {
    en: 'Every validation, stage advance, completed action and override is written here the moment it happens, with the actor and the role.',
    mn: 'Баталгаажуулалт, шат ахиулалт, гүйцэтгэсэн арга хэмжээ, хүчингүй болголт бүрийг гүйцэтгэгч, үүргийн хамт тэр даруй энд бүртгэнэ.',
  },
  'dash.e.moreRows': { en: '+{n} more — open the full list', mn: '+{n} бусад — бүх жагсаалтыг нээх' },
  'dash.e.noWidgetsTitle': { en: 'This role has no dashboard panels', mn: 'Энэ үүрэгт хяналтын самбарын хэсэг алга' },
  'dash.e.noWidgetsText': {
    en: 'Its work lives in another module — {screen}. Use the navigation on the left.',
    mn: 'Энэ үүргийн ажил өөр модульд байна — {screen}. Зүүн талын цэсийг ашиглана уу.',
  },
  'dash.e.roleTitle': { en: 'Unknown role', mn: 'Тодорхойгүй үүрэг' },
  'dash.e.roleText': {
    en: 'No composition is defined for the role id “{role}”. Return to the role selection screen and choose one of the listed roles.',
    mn: '“{role}” үүргийн ID-д тохирох бүрэлдэхүүн тодорхойлогдоогүй. Үүрэг сонгох дэлгэц рүү буцаж, жагсаалтаас нэгийг сонгоно уу.',
  },

  // ---------------------------------------------------------------- app chrome (N5)
  // Seventeen strings were hard-coded English in the shell. Every one of them is on
  // screen during the demo, so `L` used to leave the chrome untranslated.
  'nav.aria': { en: 'Modules', mn: 'Модулиуд' },
  'app.staleFeed': { en: 'Stale feed', mn: 'Өгөгдөл хоцорсон' },
  'sb.step': { en: 'Step {n}/{total}', mn: 'Алхам {n}/{total}' },
  'sb.source': { en: 'Source: {src}', mn: 'Эх сурвалж: {src}' },
  'sb.next': { en: 'Next (N)', mn: 'Дараах (N)' },
  'sb.reset': { en: 'Reset (0)', mn: 'Тэглэх (0)' },
  'hk.scenario': { en: 'Run scenario D1 - D9', mn: 'D1 - D9 хувилбарыг ажиллуулах' },
  'hk.next': { en: 'Next step in a multi-step scenario', mn: 'Олон алхамт хувилбарын дараагийн алхам' },
  'hk.reset': { en: 'Reset all scenarios', mn: 'Бүх хувилбарыг тэглэх' },
  'hk.wall': { en: 'Toggle video-wall / operator mode', mn: 'Видео хана / операторын горим солих' },
  'hk.lang': { en: 'Toggle English / Mongolian', mn: 'Англи / монгол хэл солих' },
  'hk.pause': { en: 'Pause / resume the simulation', mn: 'Загварчлалыг түр зогсоох / үргэлжлүүлэх' },
  'hk.help': { en: 'Show or hide this help', mn: 'Энэ тусламжийг харуулах / нуух' },
} as const satisfies Record<string, Entry>;
