/**
 * Bilingual strings for the depot-capacity / consumables module and the
 * Architecture & Data page.
 *
 * Split out of dict.ts so parallel workstreams cannot clobber one shared file. Merged by
 * dict.ts; keys must stay globally unique.
 *
 * NONE of this Mongolian comes from the client's deck, so `r` is deliberately unset and
 * `unreviewedKeys()` keeps reporting it for native review (plan risk R11).
 */
import type { Entry } from './dict';

export const depotDict = {
  // ---------------------------------------------------------------- nav
  'nav.depot': { en: 'Depot Capacity', mn: 'Баазын хүчин чадал' },
  'nav.platform': { en: 'Architecture & Data', mn: 'Архитектур ба өгөгдөл' },

  // ---------------------------------------------------------------- thresholds (Settings + provenance)
  'th.depot_horizon_weeks': { en: 'Planning horizon', mn: 'Төлөвлөлтийн хугацаа' },
  'th.depot_capacity_warn_pct': { en: 'Depot utilisation — attention', mn: 'Баазын ачаалал — анхаарах' },
  'th.depot_capacity_over_pct': { en: 'Depot utilisation — over capacity', mn: 'Баазын ачаалал — хүчин чадлаас хэтэрсэн' },
  'th.depot_hours_per_intervention': { en: 'Workshop hours per intervention', mn: 'Нэг засварт зарцуулах цаг' },
  'th.depot_routine_hours_per_bus_week': { en: 'Routine hours per bus per week', mn: 'Автобус тутмын долоо хоногийн ээлжит үйлчилгээний цаг' },
  'th.consumable_cover_weeks': { en: 'Minimum stock cover', mn: 'Нөөцийн доод хүрэлцээ' },
  'th.interval_km_brakes': { en: 'Brake service interval', mn: 'Тоормосны засвар үйлчилгээний интервал' },
  'th.interval_km_tyres': { en: 'Tyre replacement interval', mn: 'Дугуй солих интервал' },
  'th.interval_km_clutch': { en: 'Clutch service interval', mn: 'Шүүрэлтийн засвар үйлчилгээний интервал' },
  'th.interval_km_battery': { en: 'Battery replacement interval', mn: 'Аккумлятор солих интервал' },

  // ---------------------------------------------------------------- depot page
  'dep.title': { en: 'Depot capacity & consumables', mn: 'Баазын хүчин чадал ба сэлбэг' },
  'dep.lede': {
    en: 'An oversight view: which depot is heading over its workshop capacity, and which consumable will run short — far enough ahead to raise it with the operator. PTCC does not schedule the work.',
    mn: 'Хяналтын харагдац: аль бааз засварын хүчин чадлаасаа хэтрэх гэж байгаа, аль сэлбэг дутах гэж байгааг оператортой ярилцахад хангалттай эрт харуулна. Засварын ажлыг PTCC төлөвлөхгүй.',
  },
  'dep.notOps': {
    en: 'Not a workshop scheduler. No bay assignment, no slot booking, no technician rostering and no purchase orders — those belong to the operators. PTPD oversees the KPI; this page shows the risk, not the job card.',
    mn: 'Энэ нь засварын ажил төлөвлөгч биш. Бокс хуваарилах, цаг захиалах, засварчны ээлж гаргах, худалдан авалтын захиалга өгөх нь операторын ажил. НТГ KPI-г хянана; энэ хуудас ажлын хуудсыг биш, эрсдэлийг харуулна.',
  },
  'dep.kpiOver': { en: 'Depot-weeks over capacity', mn: 'Хүчин чадлаас хэтэрсэн бааз-долоо хоног' },
  'dep.kpiPeak': { en: 'Peak depot utilisation', mn: 'Баазын оргил ачаалал' },
  'dep.kpiBuses': { en: 'Buses with a depot', mn: 'Баазтай автобус' },
  'dep.kpiShortfall': { en: 'Earliest consumable shortfall', mn: 'Сэлбэгийн хамгийн эрт дутагдал' },
  'dep.kpiShortfallNone': { en: 'none in horizon', mn: 'хугацаанд дутагдалгүй' },

  'dep.heatTitle': { en: 'Workshop-hour utilisation by depot and week', mn: 'Засварын цагийн ачаалал, баазаар ба долоо хоногоор' },
  'dep.heatSub': {
    en: 'Forecast workshop hours as a share of each depot\'s weekly capacity. A red cell is a week the depot cannot absorb without help. Click a depot to see what is driving it.',
    mn: 'Таамагласан засварын цаг баазын долоо хоногийн хүчин чадлын хэдэн хувийг эзлэхийг харуулна. Улаан нүд нь бааз гадны тусламжгүйгээр даахгүй долоо хоног. Ачааллын шалтгааныг харахын тулд баазыг дарна уу.',
  },
  'dep.heatHint': { en: 'Each cell is one depot-week; colour is utilisation against capacity.', mn: 'Нүд бүр нэг баазын нэг долоо хоног; өнгө нь хүчин чадалд эзлэх ачааллыг заана.' },
  'dep.week': { en: 'Week', mn: 'Долоо хоног' },
  'dep.weekShort': { en: 'W{n}', mn: '{n}-р д/х' },
  'dep.depot': { en: 'Depot', mn: 'Бааз' },
  'dep.capacity': { en: 'Capacity', mn: 'Хүчин чадал' },
  'dep.util': { en: 'Utilisation', mn: 'Ачаалал' },
  'dep.hours': { en: 'h', mn: 'ц' },
  'dep.routineH': { en: 'Routine hours', mn: 'Ээлжит үйлчилгээний цаг' },
  'dep.interventionH': { en: 'Intervention hours', mn: 'Засварын цаг' },
  'dep.totalH': { en: 'Total hours', mn: 'Нийт цаг' },
  'dep.interventions': { en: 'Interventions', mn: 'Засварын ажил' },
  'dep.state.ok': { en: 'Within capacity', mn: 'Хүчин чадалд багтана' },
  'dep.state.warn': { en: 'Approaching capacity', mn: 'Хүчин чадалд ойртож байна' },
  'dep.state.over': { en: 'Over capacity', mn: 'Хүчин чадлаас хэтэрсэн' },
  'dep.buses': { en: 'Buses based here', mn: 'Энэ баазын автобус' },
  'dep.peak': { en: 'Peak', mn: 'Оргил' },
  'dep.overWeeks': { en: 'Weeks over capacity', mn: 'Хүчин чадлаас хэтэрсэн долоо хоног' },

  'dep.detailTitle': { en: 'What is driving the load — {depot}', mn: 'Ачааллын шалтгаан — {depot}' },
  'dep.detailSub': {
    en: 'The weeks this depot is forecast to carry, and the buses behind them. Read-only: PTPD raises the exposure with the operator, the operator decides the work.',
    mn: 'Энэ баазад таамагласан долоо хоног бүрийн ачаалал ба түүнийг үүсгэж буй автобуснууд. Зөвхөн харах: НТГ эрсдэлийг операторт мэдэгдэж, ажлыг оператор шийднэ.',
  },
  'dep.selectDepot': { en: 'Select a depot', mn: 'Бааз сонгоно уу' },
  'dep.selectDepotText': { en: 'Click a depot row in the heatmap above to see its weeks, its buses and its consumables.', mn: 'Дээрх өнгөт хүснэгтээс баазын мөрийг дарж долоо хоног, автобус, сэлбэгийн мэдээллийг харна уу.' },
  'dep.bus': { en: 'Bus', mn: 'Автобус' },
  'dep.dueWeek': { en: 'Due week', mn: 'Засвар хийх долоо хоног' },
  'dep.component': { en: 'Component', mn: 'Эд анги' },
  'dep.earliest': { en: 'Earliest', mn: 'Хамгийн эрт' },
  'dep.confidence': { en: 'Model confidence', mn: 'Загварын итгэлийн түвшин' },
  'dep.rangeNote': {
    en: 'Every due week is a median with an earliest plausible week beside it. Model confidence is capped at 60 % while the client holds no maintenance history — plan the capacity against the earliest week, not the median.',
    mn: 'Хугацаа бүр медиан утга бөгөөд хажууд нь хамгийн эрт болж болох долоо хоногийг заасан. Захиалагчид засвар үйлчилгээний түүх байхгүй тул загварын итгэлийн түвшинг 60 %-иар хязгаарласан — хүчин чадлыг медианаар биш, хамгийн эрт долоо хоногоор төлөвлөнө үү.',
  },
  'dep.nonStocked': {
    en: 'Doors, heating, driveline and on-board devices load the workshop but are not stocked consumables, so they appear in the hours and not in the parts forecast.',
    mn: 'Хаалга, халаалт, хүч дамжуулах систем, бортын төхөөрөмж засварын цагийг эзэлдэг ч нөөцөд хадгалдаг сэлбэг биш тул сэлбэгийн таамаглалд бус, зөвхөн цагийн тооцоонд орно.',
  },

  'dep.consTitle': { en: 'Consumables demand and cover', mn: 'Сэлбэгийн хэрэгцээ ба нөөцийн хүрэлцээ' },
  'dep.consSub': {
    en: 'Forecast demand netted against a notional stock level, so a shortfall shows up before it stops a bus. Forecasting only — no supplier, no order, no transfer.',
    mn: 'Таамагласан хэрэгцээг жишиг нөөцийн түвшинтэй тулгасан тул дутагдал автобусыг зогсоохоос өмнө харагдана. Зөвхөн таамаглал — нийлүүлэгч, захиалга, шилжүүлэг хамаарахгүй.',
  },
  'dep.consumable': { en: 'Consumable', mn: 'Сэлбэг' },
  'dep.cons.brakes': { en: 'Brakes', mn: 'Тоормос' },
  'dep.cons.tyres': { en: 'Tyres', mn: 'Дугуй' },
  'dep.cons.clutch': { en: 'Clutch', mn: 'Шүүрэлт' },
  'dep.cons.battery': { en: 'Battery', mn: 'Аккумлятор' },
  'dep.cmp.doors': { en: 'Doors', mn: 'Хаалга' },
  'dep.cmp.hvac': { en: 'Heating / air conditioning', mn: 'Халаалт / агааржуулалт' },
  'dep.cmp.driveline': { en: 'Engine / driveline', mn: 'Хөдөлгүүр / хүч дамжуулах систем' },
  'dep.cmp.devices': { en: 'On-board devices', mn: 'Бортын төхөөрөмж' },
  'dep.stock': { en: 'Stock on hand', mn: 'Одоогийн нөөц' },
  'dep.demand': { en: 'Demand over horizon', mn: 'Хугацааны нийт хэрэгцээ' },
  'dep.cover': { en: 'Cover', mn: 'Хүрэлцээ' },
  'dep.coverWeeks': { en: '{n} wk', mn: '{n} д/х' },
  'dep.shortfall': { en: 'Shortfall', mn: 'Дутагдал' },
  'dep.shortfallAt': { en: 'from week {n}', mn: '{n}-р долоо хоногоос' },
  'dep.noShortfall': { en: 'covered', mn: 'хүрэлцэнэ' },
  'dep.consEmpty': { en: 'No consumable demand forecast', mn: 'Сэлбэгийн хэрэгцээний таамаглал алга' },
  'dep.consEmptyText': { en: 'No bus based at this depot reaches a service interval inside the planning horizon.', mn: 'Энэ баазын нэг ч автобус төлөвлөлтийн хугацаанд засвар үйлчилгээний интервалд хүрэхгүй.' },
  // The forecast divides stock by a consumption rate. A rate of zero has no quotient, and
  // "∞ weeks of cover" would be a claim about a store room nobody has data on.
  'dep.coverNone': { en: 'no consumption forecast', mn: 'хэрэглээний таамаглал алга' },
  'dep.dueEmpty': { en: 'Nothing due at this depot in the horizon', mn: 'Энэ баазад тухайн хугацаанд хийх засвар алга' },
  'dep.dueEmptyText': {
    en: 'This table lists each bus, the component the model expects to reach end of life, and the week. Rows appear when a component falls due inside the planning horizon — lengthen the horizon in Settings to look further out.',
    mn: 'Энэ хүснэгт автобус бүр, ашиглалтын хугацаа нь дуусна гэж загвар тооцсон эд анги, түүний долоо хоногийг харуулна. Эд ангийн хугацаа төлөвлөлтийн хугацаанд дуусах үед мөр гарна — илүү холыг харахын тулд Тохиргоонд хугацааг уртасгана уу.',
  },
  'dep.noBuses': { en: 'No bus is based at this depot', mn: 'Энэ баазад харьяалагдах автобус алга' },
  'dep.noBusesText': {
    en: 'Workshop load and parts demand are both driven by the buses assigned here. Pick another depot in the heatmap above, or wait for the simulation to place a bus at this one.',
    mn: 'Засварын ачаалал ба сэлбэгийн хэрэгцээ хоёулаа энд харьяалагдсан автобуснаас хамаарна. Дээрх өнгөт хүснэгтээс өөр бааз сонгох эсвэл загварчлал энэ баазад автобус оноохыг хүлээнэ үү.',
  },

  'dep.inputsTitle': { en: 'Inputs required from PTPD', mn: 'НТГ-аас шаардагдах мэдээлэл' },
  'dep.in.depots': { en: 'The real depot list: how many, where, and which operator runs each.', mn: 'Баазын бодит жагсаалт: хэд байгаа, хаана, аль нь аль операторынх.' },
  'dep.in.capacity': { en: 'Workshop capacity per depot — bays, shifts or technician hours per week.', mn: 'Бааз тус бүрийн засварын хүчин чадал — бокс, ээлж эсвэл долоо хоногийн засварчны цаг.' },
  'dep.in.assignment': { en: 'The real bus→depot assignment. Ours is seeded from the vehicle id.', mn: 'Автобус→баазын бодит хуваарилалт. Манайх тээврийн хэрэгслийн дугаараас үүсгэсэн.' },
  'dep.in.intervals': { en: 'Service intervals for brakes, tyres, clutch and battery, and the labour hours each takes.', mn: 'Тоормос, дугуй, шүүрэлт, аккумляторын засвар үйлчилгээний интервал ба тус бүрт шаардагдах ажлын цаг.' },
  'dep.in.history': { en: 'Maintenance history. Without it the remaining-life model cannot exceed 60 % confidence, by design.', mn: 'Засвар үйлчилгээний түүх. Түүнгүйгээр үлдэгдэл ашиглалтын хугацааны загварын итгэлийн түвшин зориуд 60 %-иас хэтрэхгүй.' },
  'dep.in.stock': { en: 'Whether PTPD can see operator stock at all — if not, the netting half of this page cannot be built.', mn: 'НТГ операторын сэлбэгийн нөөцийг харж чадах эсэх — чадахгүй бол энэ хуудасны нөөц тулгах хэсгийг хийх боломжгүй.' },
  'dep.in.odometer': { en: 'Odometer or cumulative km per bus. The ICD carries position, not distance.', mn: 'Автобус тус бүрийн гүйлтийн тоолуур буюу нийт гүйлт (км). ICD байршил дамжуулдаг ч туулсан зай дамжуулдаггүй.' },
  'dep.openQuestions': { en: 'All open questions', mn: 'Бүх нээлттэй асуулт' },

  'dep.noDepotEntity': {
    en: 'No depot exists in the client\'s data model. The five depots, their capacities and every bus→depot assignment are ours — invented so this view can be discussed at all. Nothing here is CONFIRMED.',
    mn: 'Захиалагчийн өгөгдлийн загварт бааз гэсэн ойлголт огт байхгүй. Таван бааз, тэдгээрийн хүчин чадал, автобус→баазын хуваарилалт бүгд бидний зохиосон зүйл бөгөөд зөвхөн энэ харагдацыг хэлэлцэх боломж олгох зорилготой. Энд БАТАЛГААЖСАН зүйл алга.',
  },
  'dep.empty': { en: 'Waiting for the simulation', mn: 'Загварчлалыг хүлээж байна' },
  'dep.emptyText': { en: 'The depot forecast needs a fleet snapshot. It will appear on the first tick.', mn: 'Баазын таамаглалд паркийн одоогийн төлөв хэрэгтэй. Загварчлалын эхний мөчлөгт гарч ирнэ.' },

  // ---------------------------------------------------------------- architecture & data page
  'plat.title': { en: 'Architecture & data', mn: 'Архитектур ба өгөгдөл' },
  'plat.lede': {
    en: 'What this demo simulates, what a production PTCC would connect to instead, who owns each feed, and what we already know is wrong with the interface specification.',
    mn: 'Энэ демо юуг загварчилдаг, бодит PTCC оронд нь юунд холбогдох, өгөгдлийн урсгал бүрийг хэн эзэмшдэг, интерфейсийн тодорхойлолтод аль хэдийн ямар алдаа илэрсэн болохыг харуулна.',
  },
  'plat.feedsTitle': { en: 'Simulated today · real connector tomorrow', mn: 'Өнөөдөр загварчилсан · маргааш бодит холболт' },
  'plat.feedsSub': {
    en: 'Every number in this build comes from an in-process simulation. Nothing leaves the browser and there is no backend. This table is the honest map from each simulated feed to the system that would replace it.',
    mn: 'Энэ хувилбарын бүх тоо хөтөч дотор ажилладаг загварчлалаас гардаг. Өгөгдөл хөтчөөс гарахгүй, сервер байхгүй. Энэ хүснэгт загварчилсан урсгал бүрийг орлох бодит системийг шударгаар харуулна.',
  },
  'plat.colFeed': { en: 'Feed', mn: 'Өгөгдлийн урсгал' },
  'plat.colToday': { en: 'In this demo', mn: 'Энэ демод' },
  'plat.colReal': { en: 'Real connector', mn: 'Бодит холболт' },
  'plat.colOwner': { en: 'Owner', mn: 'Эзэмшигч' },

  'plat.f.tbox': { en: 'Vehicle telemetry (T-Box / AVL)', mn: 'Тээврийн хэрэгслийн телеметр (T-Box / AVL)' },
  'plat.f.tbox.sim': { en: 'Seeded engine, 5 s tick, 1,100 buses on a 36-node corridor graph', mn: 'Тогтмол үртэй загварчлагч, 5 сек мөчлөг, 36 зангилаатай коридорын сүлжээнд 1,100 автобус' },
  'plat.f.tbox.real': { en: 'The ICD feed itself — position, speed, deviation, load, device status. The first connector worth building (§14.4)', mn: 'ICD-ийн урсгал өөрөө — байршил, хурд, хазайлт, ачаалал, төхөөрөмжийн төлөв. Хамгийн түрүүнд хийх ёстой холболт (§14.4)' },
  'plat.f.tbox.owner': { en: 'Operators / vehicle OEM', mn: 'Операторууд / автобус үйлдвэрлэгч' },

  'plat.f.afc': { en: 'Fare collection (UB Card AFC)', mn: 'Төлбөр хураалт (UB Card AFC)' },
  'plat.f.afc.sim': { en: 'Boardings derived from the demand model; revenue derived from boardings', mn: 'Зорчигчийн суултыг эрэлтийн загвараас, орлогыг суултаас тооцсон' },
  'plat.f.afc.real': { en: 'UB Card transaction feed. Fare products, payments and settlement stay out of scope', mn: 'UB Card-ын гүйлгээний урсгал. Тарифын төрөл, төлбөр, тооцоо хамрах хүрээнд орохгүй' },
  'plat.f.afc.owner': { en: 'UB Card operator', mn: 'UB Card-ын оператор' },

  'plat.f.cctv': { en: 'On-board CCTV', mn: 'Автобусны хяналтын камер' },
  'plat.f.cctv.sim': { en: 'A captioned placeholder tile. No video of any kind is played', mn: 'Тайлбартай орлуулагч цонх. Ямар ч бичлэг тоглуулахгүй' },
  'plat.f.cctv.real': { en: 'Event-triggered streams, 8–24 concurrent (L540–L549). Retention and privacy must be decided first', mn: 'Үйл явдлаар идэвхждэг дүрс дамжуулалт, зэрэг 8–24 (L540–L549). Хадгалах хугацаа, хувийн нууцыг эхлээд шийдэх ёстой' },
  'plat.f.cctv.owner': { en: 'Operators · PTPD policy', mn: 'Операторууд · НТГ-ын журам' },

  'plat.f.tcc': { en: 'Traffic Control Centre (TCC)', mn: 'Замын хөдөлгөөний удирдлагын төв (ЗХУТ)' },
  'plat.f.tcc.sim': { en: 'Congestion is an emergent property of the speed profile — no TCC data is read', mn: 'Түгжрэл хурдны загвараас аяндаа үүсдэг — ЗХУТ-ийн өгөгдөл уншдаггүй' },
  'plat.f.tcc.real': { en: 'Signal state and incident feed, monitoring only. PTCC is not a command authority (L718)', mn: 'Гэрлэн дохионы төлөв ба ослын мэдээлэл, зөвхөн хяналтад. PTCC тушаал өгөх эрхгүй (L718)' },
  'plat.f.tcc.owner': { en: 'Traffic authority', mn: 'Замын хөдөлгөөний эрх бүхий байгууллага' },

  'plat.f.timetable': { en: 'Timetable / planned service', mn: 'Хуваарь / төлөвлөсөн үйлчилгээ' },
  'plat.f.timetable.sim': { en: 'Synthesised — no timetable exists in any client source, yet planned-vs-actual is required', mn: 'Зохиомлоор үүсгэсэн — захиалагчийн аль ч эх сурвалжид хуваарь байхгүй ч төлөвлөсөн ба бодит гүйцэтгэлийн харьцуулалт шаардлагатай' },
  'plat.f.timetable.real': { en: 'The scheduling system of record, whichever that turns out to be. PTCC reads it; it never writes one', mn: 'Хуваарийн албан ёсны систем, аль нь болох нь тодорхойгүй. PTCC түүнийг уншина, хэзээ ч бичихгүй' },
  'plat.f.timetable.owner': { en: 'PTPD / operators — undecided', mn: 'НТГ / операторууд — шийдэгдээгүй' },

  'plat.f.depot': { en: 'Depots, workshops, consumables', mn: 'Бааз, засварын газар, сэлбэг' },
  'plat.f.depot.sim': { en: 'Five invented depots, invented capacities, a seeded bus→depot assignment', mn: 'Зохиомол таван бааз, зохиомол хүчин чадал, тогтмол үрээр үүсгэсэн автобус→баазын хуваарилалт' },
  'plat.f.depot.real': { en: 'Operator maintenance systems. There is no depot entity in the ICD at all', mn: 'Операторын засвар үйлчилгээний систем. ICD-д бааз гэсэн объект огт байхгүй' },
  'plat.f.depot.owner': { en: 'Operators', mn: 'Операторууд' },

  'plat.icdTitle': { en: 'A defect in the interface specification', mn: 'Интерфейсийн тодорхойлолтын алдаа' },
  'plat.icdBody': {
    en: 'The source specifies the coordinate reference system as EPSG:4326/3857 (R1035) and gives latitude and longitude in decimal degrees. EPSG:3857 is Web Mercator, whose units are metres — the two cannot both describe the same field. A connector written to this line will either reject valid data or silently misplace every bus. One CRS must be named, and for a GPS feed it is 4326; 3857 is a map-rendering projection, not a transport format.',
    mn: 'Эх баримт координатын системийг EPSG:4326/3857 (R1035) гэж заагаад өргөрөг, уртрагийг аравтын бутархай градусаар өгсөн. EPSG:3857 бол нэгж нь метр болох Web Mercator — хоёулаа нэг талбарыг зэрэг тодорхойлж чадахгүй. Энэ мөрийн дагуу бичсэн холболт зөв өгөгдлийг татгалзах, эсвэл автобус бүрийг анзааралгүй буруу байрлуулна. Нэг л координатын системийг заах ёстой бөгөөд GPS-ийн урсгалд энэ нь 4326; 3857 бол газрын зураг дүрслэх проекц болохоос дамжуулах формат биш.',
  },
  'plat.icdFound': { en: 'Found by reading the specification, not by running it. It is the reason §14.4 says "expect one real connector not to be sufficient".', mn: 'Ажиллуулж биш, тодорхойлолтыг уншиж илрүүлсэн. §14.4-т "нэг бодит холболт хангалтгүй байх магадлалтай" гэж бичсэний шалтгаан энэ.' },

  'plat.roadTitle': { en: 'Production path', mn: 'Бодит ашиглалтад шилжих зам' },
  'plat.roadSub': { en: 'Outside demo scope by design. The order matters: the connector validates the ICD, and what it finds changes everything after it.', mn: 'Демогийн хамрах хүрээнээс зориуд гадуур. Дараалал чухал: холболт ICD-г шалгах бөгөөд илрүүлсэн зүйл нь дараагийн бүх алхмыг өөрчилнө.' },
  'plat.road.demo': { en: 'This demo — simulated, offline, no backend', mn: 'Энэ демо — загварчилсан, офлайн, сервергүй' },
  'plat.road.connector': { en: 'One real connector (AVL / T-Box) to validate the ICD — weeks', mn: 'ICD-г шалгах нэг бодит холболт (AVL / T-Box) — хэдэн долоо хоног' },
  'plat.road.auth': { en: 'Authentication and server-side RBAC — 1–2 weeks', mn: 'Нэвтрэлт ба серверийн талын эрхийн хяналт — 1–2 долоо хоног' },
  'plat.road.rest': { en: 'Remaining feeds, retention policy, deployment', mn: 'Үлдсэн холболтууд, хадгалалтын журам, суурилуулалт' },

  'plat.rbacTitle': { en: 'The honest security limitation', mn: 'Аюулгүй байдлын шударга хязгаарлалт' },
  'plat.rbacBody': {
    en: 'Hiding a module removes it from the navigation only — every URL still resolves. The role switcher is not authentication and says so on screen. For production, roles must be enforced server-side.',
    mn: 'Модулийг нуух нь зөвхөн цэснээс хасна — бүх URL ажилласаар байна. Дүр солигч нь нэвтрэлт биш бөгөөд үүнийгээ дэлгэц дээр бичсэн. Бодит ашиглалтад эрхийг серверийн талд хэрэгжүүлэх ёстой.',
  },

  'plat.stackTitle': { en: 'How the demo is put together', mn: 'Демогийн бүтэц' },
  'plat.stackSub': { en: 'One direction of flow, no backend, and vehicle positions deliberately never enter React state.', mn: 'Өгөгдөл нэг чиглэлд урсана, сервер байхгүй, тээврийн хэрэгслийн байршил React-ийн төлөвт зориуд ордоггүй.' },
  'plat.l.sim': { en: 'sim/ — seeded engine, 5 s tick, geometry, synthetic timetable, scenarios', mn: 'sim/ — тогтмол үртэй загварчлагч, 5 сек мөчлөг, геометр, зохиомол хуваарь, хувилбарууд' },
  'plat.l.data': { en: 'data/ — 36-node corridor graph, routes, stops, fleet, depots', mn: 'data/ — 36 зангилаатай коридорын сүлжээ, чиглэл, буудал, парк, бааз' },
  'plat.l.rules': { en: 'rules/ — regularity maths, thresholds, the Tier-1 rule engine, four playbooks', mn: 'rules/ — тогтмол байдлын тооцоо, босго, 1-р шатны дүрмийн систем, дөрвөн арга хэмжээний заавар' },
  'plat.l.store': { en: 'store/ — Zustand stores and the engine bridge, one set per store per tick', mn: 'store/ — Zustand төлөвийн сан ба загварчлагчийн холбоос, мөчлөг бүрт сан тус бүр нэг шинэчлэлт' },
  'plat.l.agent': { en: 'agent/ — intent routing over the existing rules. No model, no new intelligence', mn: 'agent/ — одоо байгаа дүрмүүд дээр хүсэлт чиглүүлэх. Загвар ч үгүй, шинэ оюун ухаан ч үгүй' },
  'plat.l.modules': { en: 'modules/ — one folder per screen, composed from shared primitives', mn: 'modules/ — дэлгэц бүрт нэг хавтас, нийтлэг суурь элементээс бүрдсэн' },

  'plat.notBuiltTitle': { en: 'Deliberately not built', mn: 'Зориуд хийгээгүй' },
  'plat.notBuiltSub': { en: 'This list is a feature, not a gap. Each line is a boundary we chose and can defend — several of them because the source places the capability outside PTCC.', mn: 'Энэ жагсаалт дутагдал биш, давуу тал. Мөр бүр бидний сонгож, үндэслэлтэй хамгаалж чадах хил хязгаар — заримыг нь эх сурвалж өөрөө PTCC-ийн хүрээнээс гадуур гэж заасан.' },
} as const satisfies Record<string, Entry>;
