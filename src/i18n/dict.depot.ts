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
  'nav.depot': { en: 'Depot Capacity', mn: 'Депогийн багтаамж' },
  'nav.platform': { en: 'Architecture & Data', mn: 'Архитектур ба өгөгдөл' },

  // ---------------------------------------------------------------- thresholds (Settings + provenance)
  'th.depot_horizon_weeks': { en: 'Planning horizon', mn: 'Төлөвлөлтийн хугацаа' },
  'th.depot_capacity_warn_pct': { en: 'Depot utilisation — attention', mn: 'Депогийн ачаалал — анхаарал' },
  'th.depot_capacity_over_pct': { en: 'Depot utilisation — over capacity', mn: 'Депогийн ачаалал — багтаамжаас хэтэрсэн' },
  'th.depot_hours_per_intervention': { en: 'Workshop hours per intervention', mn: 'Нэг засварт шаардагдах цаг' },
  'th.depot_routine_hours_per_bus_week': { en: 'Routine hours per bus per week', mn: 'Автобус тутамд долоо хоногт ногдох тогтмол цаг' },
  'th.consumable_cover_weeks': { en: 'Minimum stock cover', mn: 'Нөөцийн доод хангамж' },
  'th.interval_km_brakes': { en: 'Brake service interval', mn: 'Тормосны засварын интервал' },
  'th.interval_km_tyres': { en: 'Tyre replacement interval', mn: 'Дугуй солих интервал' },
  'th.interval_km_clutch': { en: 'Clutch service interval', mn: 'Шүүрэгний засварын интервал' },
  'th.interval_km_battery': { en: 'Battery replacement interval', mn: 'Батерей солих интервал' },

  // ---------------------------------------------------------------- depot page
  'dep.title': { en: 'Depot capacity & consumables', mn: 'Депогийн багтаамж ба сэлбэг хэрэглээ' },
  'dep.lede': {
    en: 'An oversight view: which depot is heading over its workshop capacity, and which consumable will run short — far enough ahead to raise it with the operator. PTCC does not schedule the work.',
    mn: 'Хяналтын харагдац: аль депо засварын багтаамжаасаа хэтрэх гэж байна, аль сэлбэг дуусах гэж байна — операторт цаг алдалгүй мэдэгдэх боломжтой. PTCC засварын ажлыг товлохгүй.',
  },
  'dep.notOps': {
    en: 'Not a workshop scheduler. No bay assignment, no slot booking, no technician rostering and no purchase orders — those belong to the operators. PTPD oversees the KPI; this page shows the risk, not the job card.',
    mn: 'Энэ бол засварын товлогч биш. Зогсоол хуваарилах, цаг захиалах, техникч томилох, худалдан авалт хийхгүй — эдгээр нь операторын ажил. PTPD нь KPI-г хянадаг; энэ хуудас эрсдэлийг харуулна, ажлын даалгаврыг биш.',
  },
  'dep.kpiOver': { en: 'Depot-weeks over capacity', mn: 'Багтаамж хэтэрсэн депо-долоо хоног' },
  'dep.kpiPeak': { en: 'Peak depot utilisation', mn: 'Депогийн дээд ачаалал' },
  'dep.kpiBuses': { en: 'Buses with a depot', mn: 'Депотой автобус' },
  'dep.kpiShortfall': { en: 'Earliest consumable shortfall', mn: 'Хамгийн эрт гарах сэлбэгийн дутагдал' },
  'dep.kpiShortfallNone': { en: 'none in horizon', mn: 'хугацаанд байхгүй' },

  'dep.heatTitle': { en: 'Workshop-hour utilisation by depot and week', mn: 'Депо, долоо хоногоор засварын цагийн ачаалал' },
  'dep.heatSub': {
    en: 'Forecast workshop hours as a share of each depot\'s weekly capacity. A red cell is a week the depot cannot absorb without help. Click a depot to see what is driving it.',
    mn: 'Долоо хоног тутмын багтаамжид эзлэх таамаглалт засварын цаг. Улаан нүд нь депо өөрөө даахгүй долоо хоногийг илэрхийлнэ. Ачааллын шалтгааныг харахын тулд депог сонгоно уу.',
  },
  'dep.heatHint': { en: 'Each cell is one depot-week; colour is utilisation against capacity.', mn: 'Нүд бүр нэг депогийн нэг долоо хоног; өнгө нь багтаамжид харьцуулсан ачаалал.' },
  'dep.week': { en: 'Week', mn: 'Долоо хоног' },
  'dep.weekShort': { en: 'W{n}', mn: '{n}-р д/х' },
  'dep.depot': { en: 'Depot', mn: 'Депо' },
  'dep.capacity': { en: 'Capacity', mn: 'Багтаамж' },
  'dep.util': { en: 'Utilisation', mn: 'Ачаалал' },
  'dep.hours': { en: 'h', mn: 'ц' },
  'dep.routineH': { en: 'Routine hours', mn: 'Тогтмол цаг' },
  'dep.interventionH': { en: 'Intervention hours', mn: 'Засварын цаг' },
  'dep.totalH': { en: 'Total hours', mn: 'Нийт цаг' },
  'dep.interventions': { en: 'Interventions', mn: 'Засвар' },
  'dep.state.ok': { en: 'Within capacity', mn: 'Багтаамжид багтана' },
  'dep.state.warn': { en: 'Approaching capacity', mn: 'Багтаамжид ойртож байна' },
  'dep.state.over': { en: 'Over capacity', mn: 'Багтаамж хэтэрсэн' },
  'dep.buses': { en: 'Buses based here', mn: 'Энд байрлах автобус' },
  'dep.peak': { en: 'Peak', mn: 'Дээд' },
  'dep.overWeeks': { en: 'Weeks over capacity', mn: 'Багтаамж хэтэрсэн долоо хоног' },

  'dep.detailTitle': { en: 'What is driving the load — {depot}', mn: 'Ачааллын шалтгаан — {depot}' },
  'dep.detailSub': {
    en: 'The weeks this depot is forecast to carry, and the buses behind them. Read-only: PTPD raises the exposure with the operator, the operator decides the work.',
    mn: 'Энэ депогийн таамаглалт долоо хоног бүрийн ачаалал, түүнийг үүсгэж буй автобуснууд. Зөвхөн харах: PTPD эрсдэлийг операторт мэдэгдэнэ, шийдвэрийг оператор гаргана.',
  },
  'dep.selectDepot': { en: 'Select a depot', mn: 'Депо сонгоно уу' },
  'dep.selectDepotText': { en: 'Click a depot row in the heatmap above to see its weeks, its buses and its consumables.', mn: 'Дээрх хүснэгтээс депог сонгоход түүний долоо хоног, автобус, сэлбэгийн мэдээлэл харагдана.' },
  'dep.bus': { en: 'Bus', mn: 'Автобус' },
  'dep.dueWeek': { en: 'Due week', mn: 'Хугацаа болох долоо хоног' },
  'dep.component': { en: 'Component', mn: 'Эд анги' },
  'dep.earliest': { en: 'Earliest', mn: 'Хамгийн эрт' },
  'dep.confidence': { en: 'Model confidence', mn: 'Загварын итгэл' },
  'dep.rangeNote': {
    en: 'Every due week is a median with an earliest plausible week beside it. Model confidence is capped at 60 % while the client holds no maintenance history — plan the capacity against the earliest week, not the median.',
    mn: 'Хугацаа бүр нь дундаж утга бөгөөд хажууд нь хамгийн эрт болох долоо хоног бичигдсэн. Засварын түүх байхгүй тул загварын итгэлцэл 60 %-аар хязгаарлагдсан — багтаамжийг дунджаар биш, хамгийн эрт хугацаагаар төлөвлө.',
  },
  'dep.nonStocked': {
    en: 'Doors, heating, driveline and on-board devices load the workshop but are not stocked consumables, so they appear in the hours and not in the parts forecast.',
    mn: 'Хаалга, халаалт, хүчний дамжуулга, бортын төхөөрөмж нь засварын цагийг эзэлнэ, харин нөөцлөгддөг сэлбэг биш тул зөвхөн цагийн тооцоонд орно.',
  },

  'dep.consTitle': { en: 'Consumables demand and cover', mn: 'Сэлбэгийн эрэлт ба хангамж' },
  'dep.consSub': {
    en: 'Forecast demand netted against a notional stock level, so a shortfall shows up before it stops a bus. Forecasting only — no supplier, no order, no transfer.',
    mn: 'Таамаглалт эрэлтийг нөөцийн түвшинтэй тулгасан байдал — дутагдал автобус зогсохоос өмнө харагдана. Зөвхөн таамаглал — нийлүүлэгч, захиалга, шилжүүлэг байхгүй.',
  },
  'dep.consumable': { en: 'Consumable', mn: 'Сэлбэг' },
  'dep.cons.brakes': { en: 'Brakes', mn: 'Тормос' },
  'dep.cons.tyres': { en: 'Tyres', mn: 'Дугуй' },
  'dep.cons.clutch': { en: 'Clutch', mn: 'Шүүрэг' },
  'dep.cons.battery': { en: 'Battery', mn: 'Батерей' },
  'dep.cmp.doors': { en: 'Doors', mn: 'Хаалга' },
  'dep.cmp.hvac': { en: 'Heating / air conditioning', mn: 'Халаалт, агааржуулалт' },
  'dep.cmp.driveline': { en: 'Engine / driveline', mn: 'Хөдөлгүүр, хүчний дамжуулга' },
  'dep.cmp.devices': { en: 'On-board devices', mn: 'Бортын төхөөрөмж' },
  'dep.stock': { en: 'Stock on hand', mn: 'Одоогийн нөөц' },
  'dep.demand': { en: 'Demand over horizon', mn: 'Хугацааны нийт эрэлт' },
  'dep.cover': { en: 'Cover', mn: 'Хангамж' },
  'dep.coverWeeks': { en: '{n} wk', mn: '{n} д/х' },
  'dep.shortfall': { en: 'Shortfall', mn: 'Дутагдал' },
  'dep.shortfallAt': { en: 'from week {n}', mn: '{n}-р долоо хоногоос' },
  'dep.noShortfall': { en: 'covered', mn: 'хангагдсан' },
  'dep.consEmpty': { en: 'No consumable demand forecast', mn: 'Сэлбэгийн эрэлт таамаглагдаагүй' },
  'dep.consEmptyText': { en: 'No bus based at this depot reaches a service interval inside the planning horizon.', mn: 'Энэ депод харьяалагдах нэг ч автобус төлөвлөлтийн хугацаанд засварын интервалд хүрэхгүй байна.' },
  // The forecast divides stock by a consumption rate. A rate of zero has no quotient, and
  // "∞ weeks of cover" would be a claim about a store room nobody has data on.
  'dep.coverNone': { en: 'no consumption forecast', mn: 'хэрэглээ таамаглагдаагүй' },
  'dep.dueEmpty': { en: 'Nothing due at this depot in the horizon', mn: 'Энэ депод тухайн хугацаанд хийх засвар алга' },
  'dep.dueEmptyText': {
    en: 'This table lists each bus, the component the model expects to reach end of life, and the week. Rows appear when a component falls due inside the planning horizon — lengthen the horizon in Settings to look further out.',
    mn: 'Энэ хүснэгтэд автобус бүр, нөөцөө барах гэж буй эд анги, ямар долоо хоногт болохыг харуулна. Эд анги төлөвлөлтийн хугацаанд хүрэхэд мөр гарна — илүү холыг харахын тулд Тохиргооноос хугацааг уртасгана уу.',
  },
  'dep.noBuses': { en: 'No bus is based at this depot', mn: 'Энэ депод харьяалагдах автобус алга' },
  'dep.noBusesText': {
    en: 'Workshop load and parts demand are both driven by the buses assigned here. Pick another depot in the heatmap above, or wait for the simulation to place a bus at this one.',
    mn: 'Засварын ачаалал болон сэлбэгийн эрэлт хоёулаа энд харьяалагдах автобуснаас хамаарна. Дээрх хүснэгтээс өөр депо сонгох, эсвэл загварчлал энэ депод автобус хуваарилахыг хүлээнэ үү.',
  },

  'dep.inputsTitle': { en: 'Inputs required from PTPD', mn: 'PTPD-с шаардагдах өгөгдөл' },
  'dep.in.depots': { en: 'The real depot list: how many, where, and which operator runs each.', mn: 'Бодит депогийн жагсаалт: хэд, хаана, аль оператор эрхэлдэг.' },
  'dep.in.capacity': { en: 'Workshop capacity per depot — bays, shifts or technician hours per week.', mn: 'Депо тутмын засварын багтаамж — зогсоол, ээлж эсвэл долоо хоногийн техникчийн цаг.' },
  'dep.in.assignment': { en: 'The real bus→depot assignment. Ours is seeded from the vehicle id.', mn: 'Автобус→депо бодит хуваарилалт. Манайх тээврийн хэрэгслийн дугаараар үүсгэгдсэн.' },
  'dep.in.intervals': { en: 'Service intervals for brakes, tyres, clutch and battery, and the labour hours each takes.', mn: 'Тормос, дугуй, шүүрэг, батерейны засварын интервал болон шаардагдах ажлын цаг.' },
  'dep.in.history': { en: 'Maintenance history. Without it the remaining-life model cannot exceed 60 % confidence, by design.', mn: 'Засвар үйлчилгээний түүх. Үүнгүйгээр үлдэгдэл нөөцийн загварын итгэлцэл 60 %-аас хэтрэхгүй.' },
  'dep.in.stock': { en: 'Whether PTPD can see operator stock at all — if not, the netting half of this page cannot be built.', mn: 'PTPD операторын нөөцийг харах боломжтой эсэх — үгүй бол энэ хуудасны тулгалтын хэсгийг хийх боломжгүй.' },
  'dep.in.odometer': { en: 'Odometer or cumulative km per bus. The ICD carries position, not distance.', mn: 'Автобус тутмын гүйлтийн тоолуур буюу нийт км. ICD-д байршил бий, зам туулсан зай алга.' },
  'dep.openQuestions': { en: 'All open questions', mn: 'Бүх нээлттэй асуулт' },

  'dep.noDepotEntity': {
    en: 'No depot exists in the client\'s data model. The five depots, their capacities and every bus→depot assignment are ours — invented so this view can be discussed at all. Nothing here is CONFIRMED.',
    mn: 'Захиалагчийн өгөгдлийн загварт депо гэсэн ойлголт огт байхгүй. Таван депо, тэдгээрийн багтаамж, автобус→депо хуваарилалт бүр нь манай зохиосон зүйл — зөвхөн хэлэлцэх боломж олгох зорилготой. Энд БАТАЛГААЖСАН зүйл байхгүй.',
  },
  'dep.empty': { en: 'Waiting for the simulation', mn: 'Загварчлалыг хүлээж байна' },
  'dep.emptyText': { en: 'The depot forecast needs a fleet snapshot. It will appear on the first tick.', mn: 'Депогийн таамаглалд флотын төлөв шаардлагатай. Эхний мөчлөгт харагдана.' },

  // ---------------------------------------------------------------- architecture & data page
  'plat.title': { en: 'Architecture & data', mn: 'Архитектур ба өгөгдөл' },
  'plat.lede': {
    en: 'What this demo simulates, what a production PTCC would connect to instead, who owns each feed, and what we already know is wrong with the interface specification.',
    mn: 'Энэ демо юуг загварчилж байгаа, бодит PTCC юунд холбогдох ёстой, өгөгдөл бүрийг хэн эзэмшдэг, интерфейсийн тодорхойлолтод ямар алдаа илэрснийг харуулна.',
  },
  'plat.feedsTitle': { en: 'Simulated today · real connector tomorrow', mn: 'Өнөөдөр загварчилсан · маргааш бодит холболт' },
  'plat.feedsSub': {
    en: 'Every number in this build comes from an in-process simulation. Nothing leaves the browser and there is no backend. This table is the honest map from each simulated feed to the system that would replace it.',
    mn: 'Энэ хувилбарын бүх тоо нь дотоод загварчлалаас гаралтай. Юу ч хөтчөөс гарахгүй, backend байхгүй. Энэ хүснэгт нь загварчилсан өгөгдөл бүрийг орлох бодит системийг харуулна.',
  },
  'plat.colFeed': { en: 'Feed', mn: 'Өгөгдлийн урсгал' },
  'plat.colToday': { en: 'In this demo', mn: 'Энэ демод' },
  'plat.colReal': { en: 'Real connector', mn: 'Бодит холболт' },
  'plat.colOwner': { en: 'Owner', mn: 'Эзэмшигч' },

  'plat.f.tbox': { en: 'Vehicle telemetry (T-Box / AVL)', mn: 'Тээврийн хэрэгслийн телеметр (T-Box / AVL)' },
  'plat.f.tbox.sim': { en: 'Seeded engine, 5 s tick, 1,100 buses on a 36-node corridor graph', mn: '5 сек тутам ажиллах загварчлагч, 36 зангилаат сүлжээн дэх 1,100 автобус' },
  'plat.f.tbox.real': { en: 'The ICD feed itself — position, speed, deviation, load, device status. The first connector worth building (§14.4)', mn: 'ICD-ийн өгөгдөл — байршил, хурд, хазайлт, ачаалал, төхөөрөмжийн төлөв. Эхлээд хийх ёстой холболт (§14.4)' },
  'plat.f.tbox.owner': { en: 'Operators / vehicle OEM', mn: 'Операторууд / үйлдвэрлэгч' },

  'plat.f.afc': { en: 'Fare collection (UB Card AFC)', mn: 'Тариф хураалт (UB Card AFC)' },
  'plat.f.afc.sim': { en: 'Boardings derived from the demand model; revenue derived from boardings', mn: 'Эрэлтийн загвараас гаргасан суулт; суултаас гаргасан орлого' },
  'plat.f.afc.real': { en: 'UB Card transaction feed. Fare products, payments and settlement stay out of scope', mn: 'UB Card-ын гүйлгээний холболт. Тариф, төлбөр, тооцоо нь хамрах хүрээнд ороогүй' },
  'plat.f.afc.owner': { en: 'UB Card operator', mn: 'UB Card оператор' },

  'plat.f.cctv': { en: 'On-board CCTV', mn: 'Тээврийн хэрэгслийн камер' },
  'plat.f.cctv.sim': { en: 'A captioned placeholder tile. No video of any kind is played', mn: 'Тайлбартай орлуулагч цонх. Ямар ч бичлэг тоглуулахгүй' },
  'plat.f.cctv.real': { en: 'Event-triggered streams, 8–24 concurrent (L540–L549). Retention and privacy must be decided first', mn: 'Үйл явдлаар өдөөгдсөн урсгал, зэрэг 8–24 (L540–L549). Хадгалах хугацаа, нууцлалыг эхлээд шийднэ' },
  'plat.f.cctv.owner': { en: 'Operators · PTPD policy', mn: 'Операторууд · PTPD-ийн журам' },

  'plat.f.tcc': { en: 'Traffic Control Centre (TCC)', mn: 'Замын хөдөлгөөний удирдлагын төв (TCC)' },
  'plat.f.tcc.sim': { en: 'Congestion is an emergent property of the speed profile — no TCC data is read', mn: 'Түгжрэл нь хурдны загвараас үүсэх үр дүн — TCC-ийн өгөгдөл ашиглаагүй' },
  'plat.f.tcc.real': { en: 'Signal state and incident feed, monitoring only. PTCC is not a command authority (L718)', mn: 'Гэрлэн дохио, ослын мэдээлэл, зөвхөн хяналт. PTCC нь тушаал өгөх эрх бүхий байгууллага биш (L718)' },
  'plat.f.tcc.owner': { en: 'Traffic authority', mn: 'Замын хөдөлгөөний байгууллага' },

  'plat.f.timetable': { en: 'Timetable / planned service', mn: 'Хуваарь / төлөвлөсөн үйлчилгээ' },
  'plat.f.timetable.sim': { en: 'Synthesised — no timetable exists in any client source, yet planned-vs-actual is required', mn: 'Зохиомлоор үүсгэсэн — эх сурвалжид хуваарь байхгүй хэдий ч төлөвлөгөө/гүйцэтгэлийн харьцуулалт шаардлагатай' },
  'plat.f.timetable.real': { en: 'The scheduling system of record, whichever that turns out to be. PTCC reads it; it never writes one', mn: 'Хуваарийн албан ёсны систем, тэр нь юу ч байлаа гэсэн. PTCC түүнийг уншина, хэзээ ч бичихгүй' },
  'plat.f.timetable.owner': { en: 'PTPD / operators — undecided', mn: 'PTPD / операторууд — шийдэгдээгүй' },

  'plat.f.depot': { en: 'Depots, workshops, consumables', mn: 'Депо, засвар, сэлбэг' },
  'plat.f.depot.sim': { en: 'Five invented depots, invented capacities, a seeded bus→depot assignment', mn: 'Таван зохиомол депо, зохиомол багтаамж, үүсгэсэн автобус→депо хуваарилалт' },
  'plat.f.depot.real': { en: 'Operator maintenance systems. There is no depot entity in the ICD at all', mn: 'Операторын засвар үйлчилгээний систем. ICD-д депо гэсэн бүтэц огт байхгүй' },
  'plat.f.depot.owner': { en: 'Operators', mn: 'Операторууд' },

  'plat.icdTitle': { en: 'A defect in the interface specification', mn: 'Интерфейсийн тодорхойлолтын алдаа' },
  'plat.icdBody': {
    en: 'The source specifies the coordinate reference system as EPSG:4326/3857 (R1035) and gives latitude and longitude in decimal degrees. EPSG:3857 is Web Mercator, whose units are metres — the two cannot both describe the same field. A connector written to this line will either reject valid data or silently misplace every bus. One CRS must be named, and for a GPS feed it is 4326; 3857 is a map-rendering projection, not a transport format.',
    mn: 'Эх баримт координатын системийг EPSG:4326/3857 (R1035) гэж заасан бөгөөд өргөрөг, уртрагийг аравтын градусаар өгсөн. EPSG:3857 нь Web Mercator бөгөөд нэгж нь метр — хоёулаа нэг талбарыг зэрэг тодорхойлж чадахгүй. Энэ мөрийн дагуу бичсэн холболт нь зөв өгөгдлийг татгалзах эсвэл автобус бүрийг чимээгүйхэн буруу байрлуулна. Нэг л систем зааx ёстой, GPS-ийн хувьд энэ нь 4326; 3857 нь зураг дүрслэх проекц болохоос дамжуулах формат биш.',
  },
  'plat.icdFound': { en: 'Found by reading the specification, not by running it. It is the reason §14.4 says "expect one real connector not to be sufficient".', mn: 'Ажиллуулж биш, тодорхойлолтыг уншиж илрүүлсэн. §14.4-д "нэг бодит холболт хангалттай биш байх магадлалтай" гэсний шалтгаан нь энэ.' },

  'plat.roadTitle': { en: 'Production path', mn: 'Үйлдвэрлэлийн зам' },
  'plat.roadSub': { en: 'Outside demo scope by design. The order matters: the connector validates the ICD, and what it finds changes everything after it.', mn: 'Демогийн хамрах хүрээнээс зориудаар гадуур. Дараалал чухал: холболт ICD-г шалгана, илрүүлсэн зүйл нь дараагийн бүхнийг өөрчилнө.' },
  'plat.road.demo': { en: 'This demo — simulated, offline, no backend', mn: 'Энэ демо — загварчилсан, офлайн, backend-гүй' },
  'plat.road.connector': { en: 'One real connector (AVL / T-Box) to validate the ICD — weeks', mn: 'ICD-г шалгах нэг бодит холболт (AVL / T-Box) — хэдэн долоо хоног' },
  'plat.road.auth': { en: 'Authentication and server-side RBAC — 1–2 weeks', mn: 'Нэвтрэлт ба серверийн талын эрхийн хяналт — 1–2 долоо хоног' },
  'plat.road.rest': { en: 'Remaining feeds, retention policy, deployment', mn: 'Үлдсэн холболтууд, хадгалалтын журам, нэвтрүүлэлт' },

  'plat.rbacTitle': { en: 'The honest security limitation', mn: 'Аюулгүй байдлын илэн далангүй хязгаарлалт' },
  'plat.rbacBody': {
    en: 'Hiding a module removes it from the navigation only — every URL still resolves. The role switcher is not authentication and says so on screen. For production, roles must be enforced server-side.',
    mn: 'Модулийг нуух нь зөвхөн цэснээс хасна — бүх URL ажилласан хэвээр. Дүр солигч нь нэвтрэлт биш бөгөөд үүнийгээ дэлгэцэн дээр хэлдэг. Бодит ажиллагаанд эрхийг серверийн талд хэрэгжүүлэх ёстой.',
  },

  'plat.stackTitle': { en: 'How the demo is put together', mn: 'Демо хэрхэн бүтсэн' },
  'plat.stackSub': { en: 'One direction of flow, no backend, and vehicle positions deliberately never enter React state.', mn: 'Нэг чиглэлийн урсгал, backend байхгүй, тээврийн хэрэгслийн байршил React-ийн төлөвт зориудаар ордоггүй.' },
  'plat.l.sim': { en: 'sim/ — seeded engine, 5 s tick, geometry, synthetic timetable, scenarios', mn: 'sim/ — үүсгэсэн загварчлагч, 5 сек мөчлөг, геометр, зохиомол хуваарь, хувилбарууд' },
  'plat.l.data': { en: 'data/ — 36-node corridor graph, routes, stops, fleet, depots', mn: 'data/ — 36 зангилаат сүлжээ, чиглэл, буудал, флот, депо' },
  'plat.l.rules': { en: 'rules/ — regularity maths, thresholds, the Tier-1 rule engine, four playbooks', mn: 'rules/ — тогтмол байдлын тооцоо, босго, дүрмийн систем, дөрвөн журам' },
  'plat.l.store': { en: 'store/ — Zustand stores and the engine bridge, one set per store per tick', mn: 'store/ — Zustand хадгалалт ба загварчлагчийн холбоос, мөчлөг тутам нэг удаа' },
  'plat.l.agent': { en: 'agent/ — intent routing over the existing rules. No model, no new intelligence', mn: 'agent/ — одоо байгаа дүрмийн дээрх чиглүүлэлт. Загвар ч үгүй, шинэ ухаан ч үгүй' },
  'plat.l.modules': { en: 'modules/ — one folder per screen, composed from shared primitives', mn: 'modules/ — дэлгэц тутамд нэг хавтас, нийтлэг элементээс бүрдсэн' },

  'plat.notBuiltTitle': { en: 'Deliberately not built', mn: 'Зориудаар хийгээгүй' },
  'plat.notBuiltSub': { en: 'This list is a feature, not a gap. Each line is a boundary we chose and can defend — several of them because the source places the capability outside PTCC.', mn: 'Энэ жагсаалт нь дутагдал биш, давуу тал. Мөр бүр нь бидний сонгосон, хамгаалж чадах хил хязгаар — хэд нь эх сурвалж өөрөө PTCC-ийн гадна гэж заасан учраас.' },
} as const satisfies Record<string, Entry>;
