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
  'nav.provenance': { en: 'Evidence & Gaps', mn: 'Нотолгоо ба цоорхой' },

  'veh.colField': { en: 'Field', mn: 'Талбар' },
  'veh.colValue': { en: 'Value', mn: 'Утга' },

  // ---------------------------------------------------------------- page chrome
  'pv.title': { en: 'What the source material does not say', mn: 'Эх сурвалжид тусгагдаагүй зүйлс' },
  'pv.lede': {
    en: 'Every row below is an absence in the client\'s own material, not a gap in this build. Each is already visible somewhere in the demo; this is the only page that collects them.',
    mn: 'Доорх мөр бүр нь энэ бүтээгдэхүүний дутагдал биш, харин захиалагчийн эх материалд байхгүй зүйл юм. Тус бүр нь демо дотор аль нэг хэсэгт харагддаг; тэдгээрийг нэг дор цуглуулсан цорын ганц хуудас энэ.',
  },
  'pv.kpiOpen': { en: 'Open items', mn: 'Нээлттэй асуудал' },
  'pv.kpiParams': { en: 'Threshold parameters named', mn: 'Нэрлэгдсэн босго үзүүлэлт' },
  'pv.kpiValued': { en: 'Values given by the source', mn: 'Эх сурвалжид өгсөн утга' },
  'pv.kpiUnreviewed': { en: 'Unreviewed Mongolian strings', mn: 'Хянагдаагүй монгол мөр' },
  'pv.kpiParamsSub': { en: 'Tables 9-14, from thresholds.ts', mn: 'Хүснэгт 9-14, thresholds.ts-ээс' },
  'pv.kpiValuedSub': { en: 'Quoted with citations in the table below', mn: 'Доорх хүснэгтэд эшлэлийн хамт' },
  'pv.export': { en: 'Export questionnaire', mn: 'Асуулгыг татах' },
  'pv.exportHint': { en: 'Downloads a Markdown file that can be sent to PTPD as-is.', mn: 'НТГ-т шууд илгээх боломжтой Markdown файл татагдана.' },

  // ---------------------------------------------------------------- table headers
  'pv.colAbsence': { en: 'What is missing', mn: 'Юу дутуу байна' },
  'pv.colCite': { en: 'Evidence', mn: 'Нотолгоо' },
  'pv.colToday': { en: 'How the demo copes today', mn: 'Демо өнөөдөр яаж шийдэж байна' },
  'pv.colQuestion': { en: 'Question for PTPD', mn: 'НТГ-д тавих асуулт' },
  'pv.colDecision': { en: 'Decision it blocks', mn: 'Ямар шийдвэрийг саатуулж байна' },

  // ---------------------------------------------------------------- row 1: thresholds
  'pv.a1.what': {
    en: 'Tables 9-14 name every threshold parameter and give a value for only {v} of {n}.',
    mn: '9-14-р хүснэгт босго үзүүлэлт бүрийг нэрлэсэн боловч {n}-аас зөвхөн {v}-д нь утга өгсөн.',
  },
  'pv.a1.today': {
    en: '{d} of {n} parameters run on demo defaults; Settings labels those fields "demo default".',
    mn: '{n} үзүүлэлтээс {d} нь демо анхны утгаар ажиллаж байгаа бөгөөд Тохиргоо тэдгээр талбарыг "демо анхны утга" гэж тэмдэглэдэг.',
  },
  'pv.a1.q': {
    en: 'For each parameter in Tables 9-14, what value should PTCC be configured with on day one?',
    mn: '9-14-р хүснэгтийн үзүүлэлт бүрт PTCC эхний өдрөөс ямар утгатай тохируулагдах вэ?',
  },
  'pv.a1.d': {
    en: 'Which alerts fire and how many - whether an operator sees six alerts an hour or six hundred.',
    mn: 'Ямар сэрэмжлүүлэг хэдэн ширхэг үүсэх нь - оператор цагт зургаа эсвэл зургаан зуун сэрэмжлүүлэг харах уу.',
  },

  // ---------------------------------------------------------------- row 2: timetable
  'pv.a2.what': {
    en: 'No timetable exists in any source, yet planned-versus-actual comparison is required.',
    mn: 'Ямар ч эх сурвалжид цагийн хуваарь байхгүй атал төлөвлөсөн ба гүйцэтгэлийн харьцуулалт шаардагддаг.',
  },
  'pv.a2.today': {
    en: 'The demo synthesises a headway-based timetable and says so wherever it is used.',
    mn: 'Демо интервалд суурилсан цагийн хуваарийг зохиомлоор үүсгэж, хэрэглэсэн газар бүрт нь үүнийг зааж өгдөг.',
  },
  'pv.a2.q': {
    en: 'Who owns the planned timetable, in what format, and can PTCC receive it as a feed?',
    mn: 'Төлөвлөсөн цагийн хуваарийг хэн эзэмшдэг, ямар форматтай, PTCC түүнийг урсгал өгөгдлөөр хүлээн авах боломжтой юу?',
  },
  'pv.a2.d': {
    en: 'Whether schedule deviation, bunching and service-gap detection can be computed at all.',
    mn: 'Хуваариас хазайх, бөөгнөрөх, үйлчилгээний завсар илрүүлэх тооцоог хийх боломжтой эсэх.',
  },

  // ---------------------------------------------------------------- row 3: ROI
  'pv.a3.what': {
    en: 'ROI and maintenance cost data does not exist - the client stated "I don\'t have the answer".',
    mn: 'Өгөөж ба засвар үйлчилгээний зардлын өгөгдөл байхгүй - захиалагч "надад хариулт байхгүй" гэж хэлсэн.',
  },
  'pv.a3.today': {
    en: 'Every cost figure on the ROI screen is an assumption, collected under "Inputs required from PTPD".',
    mn: 'Өгөөжийн дэлгэц дэх зардлын тоо бүр таамаг бөгөөд "НТГ-аас шаардлагатай мэдээлэл" дор цуглуулагдсан.',
  },
  'pv.a3.q': {
    en: 'What is the annual maintenance spend per bus, and the cost of one unplanned breakdown?',
    mn: 'Нэг автобусны жилийн засварын зардал хэд вэ, төлөвлөгөөт бус нэг эвдрэлийн өртөг хэд вэ?',
  },
  'pv.a3.d': {
    en: 'Whether any payback or savings figure can be quoted to a budget holder.',
    mn: 'Төсөв захирагчид эргэн төлөгдөх хугацаа буюу хэмнэлтийн тоог хэлэх боломжтой эсэх.',
  },

  // ---------------------------------------------------------------- row 4: speed
  'pv.a4.what': {
    en: 'Average bus speed was supplied as 6 km/h, a figure appearing in no source; 8 km/h replaced it, itself a single instantaneous reading on Slide 5.',
    mn: 'Автобусны дундаж хурдыг 6 км/ц гэж өгсөн ч энэ тоо ямар ч эх сурвалжид байхгүй; оронд нь 8 км/ц авсан бөгөөд энэ нь 5-р слайд дээрх агшин зуурын ганц хэмжилт юм.',
  },
  'pv.a4.today': {
    en: '8 km/h is used as a central peak mean, labelled an inference, and never applied to suburban or off-peak links.',
    mn: '8 км/ц-ийг төвийн оргил үеийн дундаж болгон ашиглаж, дүгнэлт гэж тэмдэглэсэн бөгөөд захын буюу оргил бус хэсэгт хэзээ ч хэрэглээгүй.',
  },
  'pv.a4.q': {
    en: 'Is there a measured average commercial speed by district and by daypart?',
    mn: 'Дүүрэг болон өдрийн цагийн хэсгээр хэмжсэн дундаж ашиглалтын хурд байдаг уу?',
  },
  'pv.a4.d': {
    en: 'Cycle time, buses required per route, and therefore every ROI output.',
    mn: 'Эргэлтийн хугацаа, чиглэл тус бүрд шаардагдах автобусны тоо, улмаар өгөөжийн бүх тооцоо.',
  },

  // ---------------------------------------------------------------- row 5: copilot
  'pv.a5.what': {
    en: 'No source describes a conversational interface; the deck carries one AI chip icon and no supporting text.',
    mn: 'Ямар ч эх сурвалжид харилцан ярианы интерфэйс тодорхойлогдоогүй; үзүүлэнд ганц AI дүрс тэмдэг байх бөгөөд түүнийг тайлбарласан текст байхгүй.',
  },
  'pv.a5.today': {
    en: 'Ops Copilot is deterministic, answers only from stored figures, and is graded ASSUMPTION.',
    mn: 'Ops Copilot нь тодорхой дүрэмд суурилсан, зөвхөн хадгалсан тоонуудаас хариулдаг бөгөөд ТААМАГ гэж үнэлэгдсэн.',
  },
  'pv.a5.q': {
    en: 'Is a question-and-answer interface actually wanted, and by which role?',
    mn: 'Асуулт хариултын интерфэйс үнэхээр шаардлагатай юу, аль үүрэгт хэрэгтэй вэ?',
  },
  'pv.a5.d': {
    en: 'Whether the copilot stays in scope, and whether any model-backed component enters it.',
    mn: 'Туслах хэвээр үлдэх эсэх, мөн загварт суурилсан ямар нэг бүрэлдэхүүн хамрах хүрээнд орох эсэх.',
  },

  // ---------------------------------------------------------------- row 6: language
  'pv.a6.what': {
    en: 'The Mongolian written by this team has had no native review.',
    mn: 'Энэ багийн бичсэн монгол хэлний хэсэг төрөлх хэлтний хяналт хийгдээгүй байна.',
  },
  'pv.a6.today': {
    en: 'Deck-derived strings are marked reviewed; {n} of {total} keys are ours and unreviewed.',
    mn: 'Үзүүлэнгээс авсан мөрүүд хянагдсан гэж тэмдэглэгдсэн; нийт {total} түлхүүрээс {n} нь бидний бичсэн, хянагдаагүй.',
  },
  'pv.a6.q': {
    en: 'Who at PTPD can review the Mongolian terminology before the next demo?',
    mn: 'Дараагийн демогийн өмнө НТГ-аас хэн монгол нэр томьёог хянах вэ?',
  },
  'pv.a6.d': {
    en: 'Whether the demo can be presented in Mongolian to an audience outside the project team.',
    mn: 'Демог төслийн багаас гадуурх үзэгчдэд монголоор танилцуулах боломжтой эсэх.',
  },

  // ---------------------------------------------------------------- threshold panel
  'pv.thTitle': { en: 'Threshold parameters: named by the source, valued by us', mn: 'Босго үзүүлэлт: эх сурвалж нэрлэсэн, утгыг бид өгсөн' },
  'pv.thNote': {
    en: 'Read live from the demo\'s own configuration. Every row carries a demo default and no client-supplied value.',
    mn: 'Демогийн өөрийн тохиргооноос шууд уншсан. Мөр бүр демо анхны утгатай бөгөөд захиалагчийн өгсөн утгагүй.',
  },
  'pv.colParam': { en: 'Parameter', mn: 'Үзүүлэлт' },
  'pv.colTable': { en: 'Source table', mn: 'Эх хүснэгт' },
  'pv.colDemo': { en: 'Demo default', mn: 'Демо анхны утга' },
  'pv.colSource': { en: 'Source value', mn: 'Эх сурвалжийн утга' },
  'pv.noneInSource': { en: 'none', mn: 'байхгүй' },

  // ---------------------------------------------------------------- scope panel
  'pv.scopeTitle': { en: 'Deliberately not built', mn: 'Зориудаар хийгээгүй зүйлс' },
  'pv.scopeNote': {
    en: 'A scope statement, not a backlog. Each item was excluded by decision; none of it is unfinished work.',
    mn: 'Энэ бол хийгдээгүй ажлын жагсаалт биш, хамрах хүрээний мэдэгдэл юм. Зүйл бүрийг шийдвэрээр хассан бөгөөд аль нь ч дуусаагүй ажил биш.',
  },
  'pv.ns.scheduling': { en: 'Scheduling and timetable creation', mn: 'Хуваарь боловсруулах, цагийн хуваарь үүсгэх' },
  'pv.ns.routePlanning': { en: 'Route planning', mn: 'Чиглэлийн төлөвлөлт' },
  'pv.ns.rostering': { en: 'Driver rostering', mn: 'Жолоочийн ээлжийн хуваарь' },
  'pv.ns.dispatch': { en: 'Depot dispatch', mn: 'Депогийн диспетчер' },
  'pv.ns.fares': { en: 'Fare products, payments and settlement', mn: 'Тарифын бүтээгдэхүүн, төлбөр ба тооцоо' },
  'pv.ns.passengerApps': { en: 'Passenger-facing apps', mn: 'Зорчигчид зориулсан аппликейшн' },
  'pv.ns.connectors': { en: 'Any real connector to T-Box, UB Card or the TCC', mn: 'T-Box, UB Card эсвэл TCC-тэй холбогдох бодит холболт' },
  'pv.ns.auth': { en: 'Authentication and RBAC - a role switcher stands in', mn: 'Нэвтрэлт ба эрхийн удирдлага - үүрэг солигч түр орлож байна' },
  'pv.ns.cctv': { en: 'Live CCTV - a captioned placeholder stands in', mn: 'Шууд дүрс бичлэг - тайлбартай орлуулагч түр орлож байна' },
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
    mn: 'Симуляцийн эхний мөчлөгийг хүлээж байна',
  },

  'reg.warmingText': {
    en: 'Route regularity is computed from live vehicle positions. Start the simulation from the top bar and the rankings, the headway chart and the vehicle strip fill in here.',
    mn: 'Чиглэлийн тогтмол байдлыг тээврийн хэрэгслийн шууд байршлаас тооцдог. Дээд талын самбараас симуляцийг эхлүүлбэл эрэмбэ, давтамжийн график, тээврийн хэрэгслийн зурвас энд гарч ирнэ.',
  },
  'reg.chartEmptyText': {
    en: 'Pick a route in the rankings on the left and its actual headway is drawn here against the planned one.',
    mn: 'Зүүн талын эрэмбээс чиглэл сонговол түүний бодит давтамжийг төлөвлөсөнтэй харьцуулан энд зурна.',
  },
  'reg.chartWarmTitle': {
    en: 'Not enough headway samples yet',
    mn: 'Давтамжийн хэмжилт хараахан хүрэлцэхгүй байна',
  },
  'reg.chartWarmText': {
    en: 'Headway on route {route} is sampled once per simulation tick. A few more ticks and the line is drawn here.',
    mn: '{route} чиглэлийн давтамжийг симуляцийн мөчлөг тутамд нэг удаа хэмждэг. Хэдэн мөчлөгийн дараа график энд зурагдана.',
  },
  'reg.stripEmptyTitle': {
    en: 'No bus is in service on route {route}',
    mn: '{route} чиглэлд үйлчилгээнд яваа автобус алга',
  },
  'reg.stripEmptyText': {
    en: 'This strip carries one marker per bus at its position along the route. Markers appear as soon as a bus goes into service.',
    mn: 'Энэ зурвас автобус бүрийг чиглэл дээрх байршлаар нь нэг тэмдэглэгээгээр харуулна. Автобус үйлчилгээнд орсон даруйд тэмдэглэгээ гарч ирнэ.',
  },
  'reg.stripNoRouteText': {
    en: 'Pick a route in the rankings on the left and its buses appear here, one marker each, in the order they run.',
    mn: 'Зүүн талын эрэмбээс чиглэл сонговол түүний автобусууд явж буй дарааллаараа, тус бүр нэг тэмдэглэгээтэй энд харагдана.',
  },
  'reg.devEmptyTitle': { en: 'No route is reporting buses', mn: 'Автобус мэдээлж буй чиглэл алга' },
  'reg.devEmptyText': {
    en: 'The routes furthest from the planned timetable - early or late - are ranked here once buses are in service.',
    mn: 'Төлөвлөсөн цагийн хуваариас хамгийн их хазайсан - эрт ч бай, хоцорсон ч бай - чиглэлүүд автобус үйлчилгээнд орсны дараа энд эрэмбэлэгдэнэ.',
  },
  'reg.bunchEmptyTitle': { en: 'No bunching anywhere', mn: 'Хаана ч бөөгнөрөл алга' },
  'reg.bunchEmptyText': {
    en: 'Routes where two buses are running too close together are listed here. None is right now.',
    mn: 'Хоёр автобус хэт ойрхон явж буй чиглэлүүд энд жагсаана. Одоогоор нэг ч байхгүй.',
  },
  'reg.gapEmptyTitle': { en: 'No service gaps', mn: 'Үйлчилгээний завсар алга' },
  'reg.gapEmptyText': {
    en: 'Routes whose longest wait between buses is over the service-gap threshold are listed here. None is right now.',
    mn: 'Автобус хоорондын хамгийн урт хүлээлт нь үйлчилгээний завсрын босгоос давсан чиглэлүүд энд жагсаана. Одоогоор нэг ч байхгүй.',
  },

  'pax.warmingText': {
    en: 'Occupancy, boardings and left-behind counts are read from the live vehicle feed. Start the simulation from the top bar and this page fills in.',
    mn: 'Ачаалал, зорчигчийн тоо, суусангүй үлдсэн тоог тээврийн хэрэгслийн шууд урсгалаас уншдаг. Дээд талын самбараас симуляцийг эхлүүлбэл энэ хуудас дүүрнэ.',
  },
  'pax.top5EmptyTitle': { en: 'No route is reporting occupancy', mn: 'Ачаалал мэдээлж буй чиглэл алга' },
  'pax.top5EmptyText': {
    en: 'The busiest routes by average load are listed here once buses are in service and counting passengers.',
    mn: 'Автобус үйлчилгээнд орж зорчигч тоолж эхэлсний дараа дундаж ачааллаар хамгийн их ачаалалтай чиглэлүүд энд жагсаана.',
  },
  'pax.bandsEmptyTitle': { en: 'No occupancy to band yet', mn: 'Ангилах ачаалал хараахан алга' },
  'pax.bandsEmptyText': {
    en: 'Each of the five load bands counts the routes currently in it, as soon as buses report passenger counts.',
    mn: 'Автобусууд зорчигчийн тоогоо мэдээлмэгц ачааллын таван зурвас тус бүр дэх чиглэлийн тоог энд харуулна.',
  },
  'pax.boardEmptyTitle': { en: 'No boardings recorded yet', mn: 'Бүртгэгдсэн зорчигч хараахан алга' },
  'pax.boardEmptyText': {
    en: 'The best and worst routes by boardings today are listed here as soon as the first passengers are counted.',
    mn: 'Өнөөдрийн зорчигчийн тоогоор хамгийн их ба хамгийн бага чиглэлүүд эхний зорчигч тоологдмогц энд жагсаана.',
  },
  'pax.heatEmptyTitle': { en: 'No route is reporting load', mn: 'Ачаалал мэдээлж буй чиглэл алга' },
  'pax.heatEmptyText': {
    en: 'Every reporting route is drawn here as one bar, coloured by the load band it is in.',
    mn: 'Мэдээлж буй чиглэл бүрийг ачааллын зурвасынх нь өнгөөр будсан нэг баганаар энд зурна.',
  },
  'pax.noOvercrowdingText': {
    en: 'Routes at or above the overcrowding threshold would be listed here, each with the action it needs.',
    mn: 'Хэт ачааллын босгод хүрсэн буюу давсан чиглэлүүд шаардагдах арга хэмжээнийх нь хамт энд жагсах байсан.',
  },

  'op.warmingText': {
    en: 'Kilometres, on-time performance and AFC-recorded revenue are aggregated from the live vehicle feed. Start the simulation from the top bar and the operators fill in.',
    mn: 'Гүйлтийн километр, цагтаа явалт, AFC-д бүртгэгдсэн орлогыг тээврийн хэрэгслийн шууд урсгалаас нэгтгэдэг. Дээд талын самбараас симуляцийг эхлүүлбэл тээвэрлэгчид гарч ирнэ.',
  },
  'op.revEmptyTitle': { en: 'No route has recorded revenue today', mn: 'Өнөөдөр орлого бүртгүүлсэн чиглэл алга' },
  'op.revEmptyText': {
    en: 'Routes are ranked here by the revenue their AFC validators actually recorded. A route whose validators are all offline records none.',
    mn: 'Чиглэлүүдийг AFC баталгаажуулагчид нь бодитоор бүртгэсэн орлогоор энд эрэмбэлнэ. Бүх баталгаажуулагч нь офлайн байгаа чиглэл орлого бүртгэхгүй.',
  },
  'op.noneTitle': { en: 'No operator in this view', mn: 'Энэ харагдацад тээвэрлэгч алга' },
  'op.noneText': {
    en: 'A bus operator OCC sees only its own fleet. Switch role in the top bar to see every operator.',
    mn: 'Автобусны операторын OCC зөвхөн өөрийн парктаа хардаг. Бүх тээвэрлэгчийг харахын тулд дээд самбараас үүргээ солино уу.',
  },
  'op.onTimeNoData': {
    en: 'No route of this operator has a bus in service, so on-time performance cannot be computed.',
    mn: 'Энэ тээвэрлэгчийн аль ч чиглэлд үйлчилгээнд яваа автобус байхгүй тул цагтаа явалтыг тооцох боломжгүй.',
  },

  'veh.unknownText': {
    en: 'This bus is not in the fleet this demo was built from, or it has left service. Go back to the network view and pick another bus.',
    mn: 'Энэ автобус демог бүтээсэн парк дотор байхгүй, эсвэл үйлчилгээнээс гарсан байна. Сүлжээний харагдац руу буцаж өөр автобус сонгоно уу.',
  },
  'veh.noneSelected': { en: 'No bus selected', mn: 'Автобус сонгоогүй байна' },
  'veh.noIncidentsText': {
    en: 'Alerts raised on this bus and events it was part of are listed here. There are none.',
    mn: 'Энэ автобусанд үүссэн сэрэмжлүүлэг, түүний оролцсон үйл явдлыг энд жагсаана. Одоогоор нэг ч алга.',
  },
  'veh.moreAlerts': { en: '+{n} further alerts on this bus, not shown', mn: 'Энэ автобусны бусад {n} сэрэмжлүүлэг харуулаагүй' },

  'an.noneText': {
    en: 'A post-incident timeline is rebuilt from an event\'s own alerts, stage changes, completed actions and messages. Validate an alert on the Alerts screen to create the first event.',
    mn: 'Ослын дараах цагийн хэлхээг үйл явдлын өөрийн сэрэмжлүүлэг, үе шатны өөрчлөлт, гүйцэтгэсэн арга хэмжээ, илгээсэн мэдэгдлээс дахин угсардаг. Эхний үйл явдлыг үүсгэхийн тулд Сэрэмжлүүлэг дэлгэц дээр сэрэмжлүүлгийг баталгаажуулна уу.',
  },
  'an.timelineEmptyTitle': { en: 'Nothing recorded on this event yet', mn: 'Энэ үйл явдалд хараахан юу ч бүртгэгдээгүй' },
  'an.timelineEmptyText': {
    en: 'Every alert, stage change, completed action and message on this event appears here, in time order.',
    mn: 'Энэ үйл явдлын сэрэмжлүүлэг, үе шатны өөрчлөлт, гүйцэтгэсэн арга хэмжээ, мэдэгдэл бүр цагийн дарааллаар энд харагдана.',
  },
  'an.impactNoRouteTitle': { en: 'This event names no route', mn: 'Энэ үйл явдалд чиглэл заагаагүй' },
  'an.impactNoRouteText': {
    en: 'When an event is tied to a route, that route\'s headway before, during and after the event is drawn here.',
    mn: 'Үйл явдал чиглэлтэй холбогдсон үед тухайн чиглэлийн давтамжийг үйл явдлын өмнө, үед, дараа гэж энд зурна.',
  },
  'an.impactWarmTitle': { en: 'Not enough headway samples yet', mn: 'Давтамжийн хэмжилт хараахан хүрэлцэхгүй байна' },
  'an.impactWarmText': {
    en: 'Headway on route {route} is sampled once per simulation tick. A few more ticks and the before / during / after comparison is drawn here.',
    mn: '{route} чиглэлийн давтамжийг симуляцийн мөчлөг тутамд нэг удаа хэмждэг. Хэдэн мөчлөгийн дараа өмнө / үед / дараах харьцуулалт энд зурагдана.',
  },
} as const satisfies Record<string, Entry>;
