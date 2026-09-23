/**
 * Bilingual strings owned by the "modules" workstream.
 *
 * Split out of dict.ts so parallel work on different areas cannot clobber a shared
 * file. Merged into the main dictionary by dict.ts; keys must stay globally unique.
 *
 * Mongolian here is NOT from the client's deck - leave `r` unset so unreviewedKeys()
 * keeps reporting it for native review (plan risk R11).
 */
import type { Entry } from './dict';

export const modulesDict = {
  // ---------------------------------------------------------------- nav
  // Short enough for the 208 px nav rail: the long form truncated on every route in the
  // app, which is 16 clipped strings at every viewport width (D-3). The page's own <h1>
  // still carries the full sentence - see 'pv.title'.
  'nav.provenance': { en: 'Evidence & Gaps', mn: 'Нотолгоо ба дутагдал' },
  'nav.group.operations': { en: 'Operations', mn: 'Үйл ажиллагаа' },
  'nav.group.intelligence': { en: 'Intelligence', mn: 'Шинжилгээ' },
  'nav.group.governance': { en: 'Governance', mn: 'Засаглал' },
  'nav.group.configuration': { en: 'Configuration', mn: 'Тохиргоо' },
  'nav.mobile.open': { en: 'Open navigation', mn: 'Цэс нээх' },

  'veh.colField': { en: 'Field', mn: 'Талбар' },
  'veh.colValue': { en: 'Value', mn: 'Утга' },

  // ---------------------------------------------------------------- page chrome
  'pv.title': { en: 'What the source material does not say', mn: 'Эх материалд дурдаагүй зүйлс' },
  'pv.lede': {
    en: 'Every row below is an absence in the client\'s own material, not a gap in this build. Each is already visible somewhere in the demo; this is the only page that collects them.',
    mn: 'Доорх мөр бүр энэ бүтээлийн дутагдал биш, захиалагчийн өөрийн материалд байхгүй зүйл юм. Тус бүр демогийн аль нэг хэсэгт аль хэдийн харагддаг; энэ хуудас л тэдгээрийг нэг дор цуглуулдаг.',
  },
  'pv.kpiOpen': { en: 'Open items', mn: 'Нээлттэй асуудал' },
  'pv.kpiParams': { en: 'Threshold parameters named', mn: 'Нэрлэсэн босго үзүүлэлт' },
  'pv.kpiValued': { en: 'Values given by the source', mn: 'Эх сурвалжид өгсөн утга' },
  'pv.kpiUnreviewed': { en: 'Unreviewed Mongolian strings', mn: 'Хянагдаагүй монгол текст' },
  'pv.kpiParamsSub': { en: 'Tables 9-14, from thresholds.ts', mn: 'Хүснэгт 9-14, босгын тохиргооны файлаас' },
  'pv.kpiValuedSub': { en: 'Quoted with citations in the table below', mn: 'Доорх хүснэгтэд эшлэлийн хамт' },
  'pv.export': { en: 'Export questionnaire', mn: 'Асуулгыг татах' },
  'pv.exportHint': { en: 'Downloads a Markdown file that can be sent to PTPD as-is.', mn: 'НТГ-т шууд илгээж болох Markdown файл татна.' },

  // ---------------------------------------------------------------- table headers
  'pv.colAbsence': { en: 'What is missing', mn: 'Дутуу зүйл' },
  'pv.colCite': { en: 'Evidence', mn: 'Нотолгоо' },
  'pv.colToday': { en: 'How the demo copes today', mn: 'Демо одоо хэрхэн шийддэг' },
  'pv.colQuestion': { en: 'Question for PTPD', mn: 'НТГ-д тавих асуулт' },
  'pv.colDecision': { en: 'Decision it blocks', mn: 'Саатуулж буй шийдвэр' },

  // ---------------------------------------------------------------- row 1: thresholds
  'pv.a1.what': {
    en: 'Tables 9-14 name every threshold parameter and give a value for only {v} of {n}.',
    mn: 'Хүснэгт 9-14 босго үзүүлэлт бүрийг нэрлэсэн ч {n}-аас зөвхөн {v}-д нь утга өгсөн.',
  },
  'pv.a1.today': {
    en: '{d} of {n} parameters run on demo defaults; Settings labels those fields "demo default".',
    mn: '{n} үзүүлэлтээс {d} нь демо утгаар ажилладаг; Тохиргоо хэсэгт эдгээр талбарыг "демо утга" гэж тэмдэглэсэн.',
  },
  'pv.a1.q': {
    en: 'For each parameter in Tables 9-14, what value should PTCC be configured with on day one?',
    mn: 'Хүснэгт 9-14-ийн үзүүлэлт бүрийг PTCC-д эхний өдрөөс ямар утгаар тохируулах вэ?',
  },
  'pv.a1.d': {
    en: 'Which alerts fire and how many - whether an operator sees six alerts an hour or six hundred.',
    mn: 'Ямар сэрэмжлүүлэг хэдэн удаа үүсэх - оператор цагт зургаа эсвэл зургаан зуун сэрэмжлүүлэг харах эсэх.',
  },

  // ---------------------------------------------------------------- row 2: timetable
  'pv.a2.what': {
    en: 'No timetable exists in any source, yet planned-versus-actual comparison is required.',
    mn: 'Аль ч эх сурвалжид хуваарь байхгүй ч төлөвлөгөө ба гүйцэтгэлийн харьцуулалт шаардлагатай.',
  },
  'pv.a2.today': {
    en: 'The demo synthesises a headway-based timetable and says so wherever it is used.',
    mn: 'Демо давтамжид суурилсан хуваарийг зохиомлоор үүсгэж, хэрэглэсэн газар бүрт үүнийгээ заадаг.',
  },
  'pv.a2.q': {
    en: 'Who owns the planned timetable, in what format, and can PTCC receive it as a feed?',
    mn: 'Төлөвлөсөн хуваарийг хэн эзэмшдэг, ямар форматтай вэ, PTCC үүнийг өгөгдлийн урсгалаар авч болох уу?',
  },
  'pv.a2.d': {
    en: 'Whether schedule deviation, bunching and service-gap detection can be computed at all.',
    mn: 'Хуваарийн зөрүү, бөөгнөрөл, үйлчилгээний завсрыг илрүүлэх тооцоо огт хийгдэх боломжтой эсэх.',
  },

  // ---------------------------------------------------------------- row 3: ROI
  'pv.a3.what': {
    en: 'ROI and maintenance cost data does not exist - the client stated "I don\'t have the answer".',
    mn: 'ROI болон засвар үйлчилгээний зардлын өгөгдөл байхгүй - захиалагч "надад хариулт алга" гэсэн.',
  },
  'pv.a3.today': {
    en: 'Every cost figure on the ROI screen is an assumption, collected under "Inputs required from PTPD".',
    mn: 'ROI дэлгэц дэх зардлын тоо бүр таамаг бөгөөд "НТГ-аас шаардлагатай мэдээлэл" хэсэгт цуглуулсан.',
  },
  'pv.a3.q': {
    en: 'What is the annual maintenance spend per bus, and the cost of one unplanned breakdown?',
    mn: 'Нэг автобусны жилийн засвар үйлчилгээний зардал хэд вэ, төлөвлөгөөт бус нэг эвдрэл ямар өртөгтэй вэ?',
  },
  'pv.a3.d': {
    en: 'Whether any payback or savings figure can be quoted to a budget holder.',
    mn: 'Төсөв захирагчид өртөг нөхөх хугацаа эсвэл хэмнэлтийн тоо хэлж болох эсэх.',
  },

  // ---------------------------------------------------------------- row 4: speed
  'pv.a4.what': {
    en: 'Average bus speed was supplied as 6 km/h, a figure appearing in no source; 8 km/h replaced it, itself a single instantaneous reading on Slide 5.',
    mn: 'Автобусны дундаж хурдыг 6 км/ц гэж өгсөн боловч энэ тоо аль ч эх сурвалжид байхгүй; оронд нь 8 км/ц-ийг авсан ч энэ нь 5-р слайд дээрх ганц агшин зуурын хэмжилт юм.',
  },
  'pv.a4.today': {
    en: '8 km/h is used as a central peak mean, labelled an inference, and never applied to suburban or off-peak links.',
    mn: '8 км/ц-ийг хотын төвийн оргил цагийн дундаж болгон ашиглаж, дүгнэсэн утга гэж тэмдэглэсэн бөгөөд захын болон оргил бус цагийн хэсэгт огт хэрэглэдэггүй.',
  },
  'pv.a4.q': {
    en: 'Is there a measured average commercial speed by district and by daypart?',
    mn: 'Дүүрэг болон өдрийн цагаар хэмжсэн дундаж ашиглалтын хурд байгаа юу?',
  },
  'pv.a4.d': {
    en: 'Cycle time, buses required per route, and therefore every ROI output.',
    mn: 'Эргэлтийн хугацаа, чиглэл бүрд шаардлагатай автобусны тоо, улмаар ROI-ийн бүх үр дүн.',
  },

  // ---------------------------------------------------------------- row 5: copilot
  'pv.a5.what': {
    en: 'No source describes a conversational interface; the deck carries one AI chip icon and no supporting text.',
    mn: 'Аль ч эх сурвалжид харилцан ярианы интерфэйсийг тайлбарлаагүй; үзүүлэнд ганц AI дүрс тэмдэг байгаа ч тайлбар текст алга.',
  },
  'pv.a5.today': {
    en: 'Ops Copilot is deterministic, answers only from stored figures, and is graded ASSUMPTION.',
    mn: 'Үйл ажиллагааны туслах нь тогтсон дүрмээр ажиллаж, зөвхөн хадгалсан тоонд тулгуурлан хариулдаг бөгөөд ТААМАГ гэж үнэлэгдсэн.',
  },
  'pv.a5.q': {
    en: 'Is a question-and-answer interface actually wanted, and by which role?',
    mn: 'Асуулт-хариултын интерфэйс үнэхээр хэрэгтэй юу, аль үүрэгт?',
  },
  'pv.a5.d': {
    en: 'Whether the copilot stays in scope, and whether any model-backed component enters it.',
    mn: 'Туслах хамрах хүрээнд үлдэх эсэх, мөн загварт суурилсан бүрэлдэхүүн хэсэг нэмэгдэх эсэх.',
  },

  // ---------------------------------------------------------------- row 6: language
  'pv.a6.what': {
    en: 'The Mongolian written by this team has had no native review.',
    mn: 'Энэ багийн бичсэн монгол текстийг төрөлх хэлтэн хянаагүй.',
  },
  'pv.a6.today': {
    en: 'Deck-derived strings are marked reviewed; {n} of {total} keys are ours and unreviewed.',
    mn: 'Үзүүлэнгээс авсан текстийг хянасан гэж тэмдэглэсэн; нийт {total} түлхүүрээс {n} нь бидний бичсэн, хянагдаагүй.',
  },
  'pv.a6.q': {
    en: 'Who at PTPD can review the Mongolian terminology before the next demo?',
    mn: 'Дараагийн демогийн өмнө НТГ-аас хэн монгол нэр томьёог хянаж чадах вэ?',
  },
  'pv.a6.d': {
    en: 'Whether the demo can be presented in Mongolian to an audience outside the project team.',
    mn: 'Демог төслийн багаас гадуурх үзэгчдэд монгол хэлээр танилцуулж болох эсэх.',
  },

  // ---------------------------------------------------------------- threshold panel
  'pv.thTitle': { en: 'Threshold parameters: named by the source, valued by us', mn: 'Босго үзүүлэлт: нэрийг эх сурвалж, утгыг бид өгсөн' },
  'pv.thNote': {
    en: 'Read live from the demo\'s own configuration. Every row carries a demo default and no client-supplied value.',
    mn: 'Демогийн өөрийн тохиргооноос шууд уншсан. Мөр бүр демо утгатай, захиалагчийн өгсөн утга байхгүй.',
  },
  'pv.colParam': { en: 'Parameter', mn: 'Үзүүлэлт' },
  'pv.colTable': { en: 'Source table', mn: 'Эх хүснэгт' },
  'pv.colDemo': { en: 'Demo default', mn: 'Демо утга' },
  'pv.colSource': { en: 'Source value', mn: 'Эх сурвалжийн утга' },
  'pv.noneInSource': { en: 'none', mn: 'байхгүй' },

  // ---------------------------------------------------------------- scope panel
  'pv.scopeTitle': { en: 'Deliberately not built', mn: 'Зориуд хийгээгүй зүйлс' },
  'pv.scopeNote': {
    en: 'A scope statement, not a backlog. Each item was excluded by decision; none of it is unfinished work.',
    mn: 'Энэ бол хамрах хүрээний мэдэгдэл, хийх ажлын жагсаалт биш. Зүйл бүрийг шийдвэрээр хассан; аль нь ч дутуу ажил биш.',
  },
  'pv.ns.scheduling': { en: 'Scheduling and timetable creation', mn: 'Хуваарь төлөвлөх, боловсруулах' },
  'pv.ns.routePlanning': { en: 'Route planning', mn: 'Чиглэлийн төлөвлөлт' },
  'pv.ns.rostering': { en: 'Driver rostering', mn: 'Жолоочийн ээлжийн хуваарь' },
  'pv.ns.dispatch': { en: 'Depot dispatch', mn: 'Баазын диспетчер' },
  'pv.ns.fares': { en: 'Fare products, payments and settlement', mn: 'Тарифын бүтээгдэхүүн, төлбөр, тооцоо нийлэлт' },
  'pv.ns.passengerApps': { en: 'Passenger-facing apps', mn: 'Зорчигчид зориулсан аппликейшн' },
  'pv.ns.connectors': { en: 'Any real connector to T-Box, UB Card or the TCC', mn: 'T-Box, UB Card эсвэл ЗХУТ-тэй бодит холболт' },
  'pv.ns.auth': { en: 'Authentication and RBAC - a role switcher stands in', mn: 'Нэвтрэлт ба эрхийн удирдлага - оронд нь үүрэг сонгогч ашиглаж байна' },
  'pv.ns.cctv': { en: 'Live CCTV - a captioned placeholder stands in', mn: 'Шууд хяналтын камер - оронд нь тайлбартай орлуулга ашиглаж байна' },
  'pv.ns.autonomy': { en: 'Autonomous action of any kind', mn: 'Ямар ч төрлийн бие даасан үйлдэл' },

  // ---------------------------------------------------------------- top bar
  'top.evidence': { en: 'Evidence', mn: 'Нотолгоо' },

  /*
   * ---------------------------------------------------------------- empty states
   *
   * Every one of these says two things: what the panel will show, and what has to
   * happen for it to show it. A bare "—" or a recycled title answers neither.
   *
   * The ones that are GOOD NEWS (no bunching, no service gap, no overcrowding, no
   * incident on this bus) are rendered with tone="ok" at the call site - emptiness
   * that is a result, not an absence.
   */
  'mod.warmingTitle': {
    en: 'Waiting for the first simulation tick',
    mn: 'Загварчлалын эхний алхмыг хүлээж байна',
  },

  'reg.warmingText': {
    en: 'Route regularity is computed from live vehicle positions. Start the simulation from the top bar and the rankings, the headway chart and the vehicle strip fill in here.',
    mn: 'Чиглэлийн тогтмол байдлыг тээврийн хэрэгслийн шууд байршлаас тооцдог. Дээд мөрнөөс загварчлалыг эхлүүлбэл эрэмбэ, давтамжийн график, тээврийн хэрэгслийн зурвас энд гарна.',
  },
  'reg.chartEmptyText': {
    en: 'Pick a route in the rankings on the left and its actual headway is drawn here against the planned one.',
    mn: 'Зүүн талын эрэмбээс чиглэл сонговол түүний бодит давтамжийг төлөвлөсөнтэй харьцуулан энд зурна.',
  },
  'reg.chartWarmTitle': {
    en: 'Not enough headway samples yet',
    mn: 'Давтамжийн хэмжилт хараахан хангалтгүй',
  },
  'reg.chartWarmText': {
    en: 'Headway on route {route} is sampled once per simulation tick. A few more ticks and the line is drawn here.',
    mn: '{route} чиглэлийн давтамжийг загварчлалын алхам бүрт нэг удаа хэмждэг. Хэдэн алхмын дараа график энд зурагдана.',
  },
  'reg.stripEmptyTitle': {
    en: 'No bus is in service on route {route}',
    mn: '{route} чиглэлд үйлчилгээнд яваа автобус алга',
  },
  'reg.stripEmptyText': {
    en: 'This strip carries one marker per bus at its position along the route. Markers appear as soon as a bus goes into service.',
    mn: 'Энэ зурвас автобус бүрийг чиглэл дээрх байршилд нь нэг тэмдгээр харуулна. Автобус үйлчилгээнд гармагц тэмдэг гарч ирнэ.',
  },
  'reg.stripNoRouteText': {
    en: 'Pick a route in the rankings on the left and its buses appear here, one marker each, in the order they run.',
    mn: 'Зүүн талын эрэмбээс чиглэл сонговол түүний автобусууд явж буй дарааллаараа, тус бүр нэг тэмдгээр энд харагдана.',
  },
  'reg.devEmptyTitle': { en: 'No route is reporting buses', mn: 'Автобусны мэдээлэл ирүүлж буй чиглэл алга' },
  'reg.devEmptyText': {
    en: 'The routes furthest from the planned timetable - early or late - are ranked here once buses are in service.',
    mn: 'Автобус үйлчилгээнд гармагц хуваариас хамгийн их зөрсөн - эрт ч, хоцорсон ч - чиглэлүүд энд эрэмбэлэгдэнэ.',
  },
  'reg.bunchEmptyTitle': { en: 'No bunching anywhere', mn: 'Бөөгнөрөл хаана ч алга' },
  'reg.bunchEmptyText': {
    en: 'Routes where two buses are running too close together are listed here. None is right now.',
    mn: 'Хоёр автобус хэт ойрхон явж буй чиглэлүүд энд жагсана. Одоогоор ийм чиглэл алга.',
  },
  'reg.gapEmptyTitle': { en: 'No service gaps', mn: 'Үйлчилгээний завсар алга' },
  'reg.gapEmptyText': {
    en: 'Routes whose longest wait between buses is over the service-gap threshold are listed here. None is right now.',
    mn: 'Автобус хоорондын хамгийн урт хүлээлт нь үйлчилгээний завсрын босгоос хэтэрсэн чиглэлүүд энд жагсана. Одоогоор ийм чиглэл алга.',
  },

  'pax.warmingText': {
    en: 'Occupancy, boardings and left-behind counts are read from the live vehicle feed. Start the simulation from the top bar and this page fills in.',
    mn: 'Ачаалал, суусан болон суулгүй үлдсэн зорчигчийн тоог тээврийн хэрэгслийн шууд урсгалаас уншдаг. Дээд мөрнөөс загварчлалыг эхлүүлбэл энэ хуудас бөглөгдөнө.',
  },
  'pax.top5EmptyTitle': { en: 'No route is reporting occupancy', mn: 'Ачааллын мэдээлэл ирүүлж буй чиглэл алга' },
  'pax.top5EmptyText': {
    en: 'The busiest routes by average load are listed here once buses are in service and counting passengers.',
    mn: 'Автобус үйлчилгээнд гарч зорчигч тоолж эхэлмэгц дундаж ачааллаар хамгийн их ачаалалтай чиглэлүүд энд жагсана.',
  },
  'pax.bandsEmptyTitle': { en: 'No occupancy to band yet', mn: 'Ангилах ачааллын мэдээлэл хараахан алга' },
  'pax.bandsEmptyText': {
    en: 'Each of the five load bands counts the routes currently in it, as soon as buses report passenger counts.',
    mn: 'Автобусууд зорчигчийн тоогоо мэдээлмэгц ачааллын таван ангилал тус бүрт одоо байгаа чиглэлийн тоо энд гарна.',
  },
  'pax.boardEmptyTitle': { en: 'No boardings recorded yet', mn: 'Суусан зорчигч хараахан бүртгэгдээгүй' },
  'pax.boardEmptyText': {
    en: 'The best and worst routes by boardings today are listed here as soon as the first passengers are counted.',
    mn: 'Эхний зорчигчид тоологдмогц өнөөдрийн суусан зорчигчийн тоогоор хамгийн сайн ба хамгийн муу чиглэлүүд энд жагсана.',
  },
  'pax.heatEmptyTitle': { en: 'No route is reporting load', mn: 'Ачааллын мэдээлэл ирүүлж буй чиглэл алга' },
  'pax.heatEmptyText': {
    en: 'Every reporting route is drawn here as one bar, coloured by the load band it is in.',
    mn: 'Мэдээлэл ирүүлж буй чиглэл бүрийг ачааллын ангиллынх нь өнгөөр будсан нэг баганаар энд харуулна.',
  },
  'pax.noOvercrowdingText': {
    en: 'Routes at or above the overcrowding threshold would be listed here, each with the action it needs.',
    mn: 'Хэт ачааллын босгод хүрсэн эсвэл давсан чиглэл байсан бол шаардлагатай арга хэмжээний хамт энд жагсах байсан.',
  },

  'op.warmingText': {
    en: 'Kilometres, on-time performance and AFC-recorded revenue are aggregated from the live vehicle feed. Start the simulation from the top bar and the operators fill in.',
    mn: 'Гүйлтийн км, цагтаа гүйцэтгэл, AFC-д бүртгэгдсэн орлогыг тээврийн хэрэгслийн шууд урсгалаас нэгтгэдэг. Дээд мөрнөөс загварчлалыг эхлүүлбэл операторуудын мэдээлэл гарна.',
  },
  'op.revEmptyTitle': { en: 'No route has recorded revenue today', mn: 'Өнөөдөр орлого бүртгэсэн чиглэл алга' },
  'op.revEmptyText': {
    en: 'Routes are ranked here by the revenue their AFC validators actually recorded. A route whose validators are all offline records none.',
    mn: 'Чиглэлүүдийг AFC карт уншигчийн бодитоор бүртгэсэн орлогоор энд эрэмбэлнэ. Бүх карт уншигч нь тасарсан чиглэл орлого бүртгэхгүй.',
  },
  'op.noneTitle': { en: 'No operator in this view', mn: 'Энэ харагдацад оператор алга' },
  'op.noneText': {
    en: 'A bus operator OCC sees only its own fleet. Switch role in the top bar to see every operator.',
    mn: 'Автобусны операторын төв зөвхөн өөрийн паркийг хардаг. Бүх операторыг харахын тулд дээд мөрнөөс үүргээ солино уу.',
  },
  'op.onTimeNoData': {
    en: 'No route of this operator has a bus in service, so on-time performance cannot be computed.',
    mn: 'Энэ операторын аль ч чиглэлд үйлчилгээнд яваа автобус байхгүй тул цагтаа гүйцэтгэлийг тооцох боломжгүй.',
  },

  'veh.unknownText': {
    en: 'This bus is not in the fleet this demo was built from, or it has left service. Go back to the network view and pick another bus.',
    mn: 'Энэ автобус демод ашигласан паркийн бүрэлдэхүүнд байхгүй, эсвэл үйлчилгээнээс гарсан. Сүлжээний харагдац руу буцаж өөр автобус сонгоно уу.',
  },
  'veh.noneSelected': { en: 'No bus selected', mn: 'Автобус сонгоогүй байна' },
  'veh.noIncidentsText': {
    en: 'Alerts raised on this bus and events it was part of are listed here. There are none.',
    mn: 'Энэ автобусанд үүссэн сэрэмжлүүлэг, түүний оролцсон үйл явдлууд энд жагсана. Одоогоор алга.',
  },
  'veh.moreAlerts': { en: '+{n} further alerts on this bus, not shown', mn: 'Энэ автобусны өөр {n} сэрэмжлүүлгийг харуулаагүй' },

  'an.noneText': {
    en: 'A post-incident timeline is rebuilt from an event\'s own alerts, stage changes, completed actions and messages. Validate an alert on the Alerts screen to create the first event.',
    mn: 'Ослын дараах цагийн хэлхээсийг үйл явдлын өөрийн сэрэмжлүүлэг, шатны өөрчлөлт, гүйцэтгэсэн арга хэмжээ, мэдэгдлээс сэргээн байгуулдаг. Эхний үйл явдлыг үүсгэхийн тулд "Сэрэмжлүүлэг ба үйл явдал" дэлгэцэд сэрэмжлүүлгийг баталгаажуулна уу.',
  },
  'an.timelineEmptyTitle': { en: 'Nothing recorded on this event yet', mn: 'Энэ үйл явдалд хараахан юу ч бүртгэгдээгүй' },
  'an.timelineEmptyText': {
    en: 'Every alert, stage change, completed action and message on this event appears here, in time order.',
    mn: 'Энэ үйл явдлын сэрэмжлүүлэг, шатны өөрчлөлт, гүйцэтгэсэн арга хэмжээ, мэдэгдэл бүр цагийн дарааллаар энд харагдана.',
  },
  'an.impactNoRouteTitle': { en: 'This event names no route', mn: 'Энэ үйл явдалд чиглэл заагаагүй' },
  'an.impactNoRouteText': {
    en: 'When an event is tied to a route, that route\'s headway before, during and after the event is drawn here.',
    mn: 'Үйл явдал чиглэлтэй холбоотой бол тухайн чиглэлийн үйл явдлын өмнөх, үеийн, дараах давтамжийг энд зурна.',
  },
  'an.impactWarmTitle': { en: 'Not enough headway samples yet', mn: 'Давтамжийн хэмжилт хараахан хангалтгүй' },
  'an.impactWarmText': {
    en: 'Headway on route {route} is sampled once per simulation tick. A few more ticks and the before / during / after comparison is drawn here.',
    mn: '{route} чиглэлийн давтамжийг загварчлалын алхам бүрт нэг удаа хэмждэг. Хэдэн алхмын дараа өмнө / үед / дараа харьцуулалт энд зурагдана.',
  },
} as const satisfies Record<string, Entry>;
