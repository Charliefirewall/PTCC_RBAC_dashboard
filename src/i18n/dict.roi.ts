/**
 * Bilingual strings owned by the ROI workstream (plan §9.1(b), §9.2 class A, §9.3,
 * §17 Phase 5 item 5.6, §21, backlog 19).
 *
 * Split out of dict.ts so parallel work cannot clobber a shared file. Merged by dict.ts;
 * keys must stay globally unique - these all sit under `roi.` but none of them collide
 * with the `roi.*` keys already in dict.ts (banner, tabCost, tabFleet, baseline,
 * projected, annualSaving, sliderNote, perOperator, fleetTotal, peakRequirement,
 * currentFleet, gap, speedSlider, speedNote, fleetFormula, fleetRefusal, title,
 * spendPerKm, savings, slider).
 *
 * Mongolian here is NOT from the client's deck - `r` is deliberately unset so
 * unreviewedKeys() keeps reporting it for native review (plan risk R11).
 */
import type { Entry } from './dict';

export const roiDict = {
  // ---------------------------------------------------------------- ₮ scale units
  'roi.unitBn': { en: 'bn', mn: 'тэрбум' },
  'roi.unitMn': { en: 'm', mn: 'сая' },
  'roi.unitNone': { en: '', mn: '' },

  // ---------------------------------------------------------------- views
  'roi.viewAuthority': { en: 'PTPD / authority', mn: 'НТГ / эрх бүхий байгууллага' },
  'roi.viewOperator': { en: 'Per operator', mn: 'Оператор тус бүрээр' },
  'roi.viewPerBus': { en: 'Per bus', mn: 'Автобус тус бүрээр' },

  // ---------------------------------------------------------------- honesty surfaces
  'roi.scenarioNotice': {
    en: 'Every figure on this screen is a scenario computed from the assumptions on the left, not a measurement. The client stated they do not hold this cost data. Change any input and every output below moves.',
    mn: 'Энэ дэлгэцийн бүх тоо зүүн талын таамаглалаас тооцсон хувилбар бөгөөд хэмжилт биш. Захиалагч энэ зардлын өгөгдөл өөрт нь байхгүй гэдгийг хэлсэн. Аль нэг оролтыг өөрчлөхөд доорх бүх үр дүн өөрчлөгдөнө.',
  },
  'roi.citeNoData': {
    en: 'no client cost data exists (client conversation)',
    mn: 'захиалагчид зардлын өгөгдөл байхгүй (захиалагчтай хийсэн яриа)',
  },
  'roi.inputsLink': { en: 'Open provenance', mn: 'Эх сурвалжийг нээх' },
  'roi.inputsSub': {
    en: 'Until PTPD supplies these, no figure on this screen can be promoted above ASSUMPTION.',
    mn: 'НТГ эдгээрийг өгөх хүртэл энэ дэлгэцийн аль ч тоог ТААМАГ түвшнээс дээш ангилах боломжгүй.',
  },
  'roi.failureSource': { en: 'Failure count from', mn: 'Эвдрэлийн тооны эх сурвалж' },
  'roi.srcPredicted': { en: 'Prediction layer', mn: 'Таамаглалын давхарга' },
  'roi.srcAssumed': { en: 'Rate assumption below', mn: 'Доорх эвдрэлийн түвшний таамаг' },
  'roi.predBand': {
    en: 'of {lo}–{hi} predicted interventions per year',
    mn: 'жилд таамагласан {lo}–{hi} засвараас',
  },
  'roi.predictionInput': {
    en: 'Failure count comes from the breakdown-rate assumption above. Nothing sources that rate.',
    mn: 'Эвдрэлийн тоог дээрх эвдрэлийн түвшний таамгаас авсан. Энэ түвшинг ямар ч эх сурвалж батлаагүй.',
  },
  'roi.predictionLive': {
    en: 'Failure count comes from the fleet forecast in the prediction layer, annualised. That forecast is itself a model, not a record.',
    mn: 'Эвдрэлийн тоог таамаглалын давхаргын паркийн таамаглалаас жилээр тооцож авсан. Тэр таамаглал өөрөө загвар болохоос бүртгэл биш.',
  },

  // ---------------------------------------------------------------- assumptions panel
  'roi.assumptions': { en: 'Assumptions', mn: 'Таамаглал' },
  'roi.assumptionsSub': {
    en: 'Every input is editable. Nothing here is sourced; these are starting points for the conversation with PTPD.',
    mn: 'Бүх оролтыг засах боломжтой. Энд эх сурвалжтай утга алга; эдгээр нь НТГ-тай ярилцах эхлэлийн утгууд.',
  },
  'roi.scenario': { en: 'Scenario', mn: 'Хувилбар' },
  'roi.scConservative': { en: 'Conservative', mn: 'Болгоомжтой' },
  'roi.scBase': { en: 'Base', mn: 'Үндсэн' },
  'roi.scOptimistic': { en: 'Optimistic', mn: 'Өөдрөг' },
  'roi.scCustom': { en: 'Custom', mn: 'Гараар тохируулсан' },
  'roi.scenarioHint': {
    en: 'A preset writes the four effectiveness levers and nothing else. Touch any input and this reads "Custom" — a moved slider is never a preset.',
    mn: 'Бэлэн хувилбар зөвхөн үр нөлөөний дөрвөн тохируулгыг өөрчилнө. Аль нэг оролтыг өөрчилбөл энд "Гараар тохируулсан" гэж гарна — хөдөлгөсөн гулсуур хэзээ ч бэлэн хувилбар биш.',
  },
  'roi.groupFleet': { en: 'Fleet', mn: 'Парк' },
  'roi.groupSpend': { en: 'Spend per bus per year', mn: 'Автобус тутмын жилийн зардал' },
  'roi.groupReliability': { en: 'Reliability', mn: 'Найдвартай байдал' },
  'roi.groupLevers': { en: 'Effectiveness levers', mn: 'Үр нөлөөний тохируулга' },
  'roi.reset': { en: 'Reset to defaults', mn: 'Анхны утгад буцаах' },

  // ---------------------------------------------------------------- input labels
  'roi.inFleet': { en: 'Fleet size', mn: 'Паркийн хэмжээ' },
  'roi.inKm': { en: 'Km per bus per year', mn: 'Автобус тутмын жилийн гүйлт, км' },
  'roi.inMaint': { en: 'Maintenance per bus', mn: 'Автобус тутмын засвар үйлчилгээ' },
  'roi.inEnergy': { en: 'Fuel or electricity per km', mn: 'Км тутмын түлш эсвэл цахилгаан' },
  'roi.inDriver': { en: 'Driver salary per bus', mn: 'Автобус тутмын жолоочийн цалин' },
  'roi.inInsurance': { en: 'Insurance per bus', mn: 'Автобус тутмын даатгал' },
  'roi.inAccident': { en: 'Accident / incident cost per bus', mn: 'Автобус тутмын осол, зөрчлийн зардал' },
  'roi.inConsumables': { en: 'Tyres, brakes, clutch per bus', mn: 'Автобус тутмын дугуй, тоормос, шүүрэлт' },
  'roi.inBreakdowns': { en: 'Unplanned failures per 100 buses per year', mn: '100 автобуст ногдох жилийн төлөвлөгдөөгүй эвдрэл' },
  'roi.inDowntimeValue': { en: 'Value of one bus-day out of service', mn: 'Автобус нэг өдөр зогсохын үнэ цэнэ' },
  'roi.inDowntimeDays': { en: 'Days out of service per failure', mn: 'Нэг эвдрэлээр зогсох өдөр' },
  'roi.inPlatform': { en: 'Platform cost per bus per year', mn: 'Автобус тутмын жилийн платформын зардал' },
  'roi.inPrevented': { en: 'Unplanned failures avoided', mn: 'Сэргийлсэн төлөвлөгдөөгүй эвдрэл' },
  'roi.inPlannedMaint': { en: 'Servicing and consumables reduced', mn: 'Засвар үйлчилгээ, сэлбэгийн зардлын бууралт' },
  'roi.inEnergyRed': { en: 'Energy per km reduced', mn: 'Км тутмын эрчим хүчний бууралт' },
  'roi.inAccidentRed': { en: 'Accident and insurance cost reduced', mn: 'Осол, даатгалын зардлын бууралт' },

  // ---------------------------------------------------------------- outputs
  'roi.outGross': { en: 'Gross annual benefit', mn: 'Жилийн нийт өгөөж' },
  'roi.outPlatform': { en: 'Platform cost', mn: 'Платформын зардал' },
  'roi.outNet': { en: 'Net annual benefit', mn: 'Жилийн цэвэр өгөөж' },
  'roi.outPayback': { en: 'Payback', mn: 'Өртөг нөхөгдөх хугацаа' },
  'roi.outBaseline': { en: 'Baseline annual spend', mn: 'Жилийн суурь зардал' },
  'roi.months': { en: 'months', mn: 'сар' },
  'roi.never': { en: 'never', mn: 'нөхөгдөхгүй' },
  'roi.perBusYear': { en: 'per bus per year', mn: 'автобус тутамд жилд' },
  'roi.ofSpend': { en: '{p} of baseline spend', mn: 'суурь зардлын {p}' },
  'roi.netPerPlatform': { en: '{x}× platform cost', mn: 'платформын зардлын {x} дахин' },
  'roi.failuresAvoided': { en: 'Unplanned failures avoided per year', mn: 'Жилд сэргийлсэн төлөвлөгдөөгүй эвдрэл' },
  'roi.ofFailures': { en: 'of {n} assumed', mn: 'таамагласан {n} эвдрэлээс' },
  'roi.breakdown': { en: 'Where the value comes from', mn: 'Өгөөж юунаас бүрдэж байна' },
  'roi.breakdownChart': { en: 'Annual benefit by source', mn: 'Жилийн өгөөж, эх үүсвэрээр' },
  'roi.termFailures': { en: 'Avoided unplanned failures', mn: 'Сэргийлсэн төлөвлөгдөөгүй эвдрэл' },
  'roi.termMaint': { en: 'Condition-based servicing', mn: 'Техникийн төлөвт суурилсан засвар үйлчилгээ' },
  'roi.termEnergy': { en: 'Energy per km', mn: 'Км тутмын эрчим хүч' },
  'roi.termSafety': { en: 'Accidents and insurance', mn: 'Осол ба даатгал' },
  'roi.colSource': { en: 'Source of value', mn: 'Өгөөжийн эх үүсвэр' },
  'roi.colAnnual': { en: 'Per year', mn: 'Жилд' },
  'roi.colShare': { en: 'Share', mn: 'Эзлэх хувь' },
  'roi.colBuses': { en: 'Buses', mn: 'Автобус' },
  'roi.perKmBefore': { en: 'Operating cost per km', mn: 'Км тутмын үйл ажиллагааны зардал' },
  'roi.perKmAfter': { en: 'Per km on this scenario', mn: 'Энэ хувилбараар км тутмын зардал' },
  'roi.onTheseAssumptions': { en: 'on these assumptions', mn: 'эдгээр таамаглалаар' },
  'roi.perBusSub': {
    en: 'The same model divided by one bus. Useful because it is the unit PTPD negotiates in.',
    mn: 'Ижил загварыг нэг автобусанд ногдуулсан. НТГ яг энэ нэгжээр хэлэлцээ хийдэг тул хэрэгтэй.',
  },
  'roi.operatorSub': {
    en: 'Bus counts are real — they come from the live simulated fleet. Every ₮ figure beside them is a scenario.',
    mn: 'Автобусны тоо бодит — загварчилсан паркаас шууд авсан. Хажууд нь буй бүх ₮ дүн хувилбар юм.',
  },
  // ---------------------------------------------------------------- empty states
  // Two lines each: what the panel will show, and what makes it appear. A bare label or
  // a bare em dash tells an operator nothing — not whether it is loading, broken, or
  // genuinely empty. Nothing on this page loads: the model is synchronous arithmetic.
  'roi.emptyTitle': { en: 'The cost model has no fleet to size itself against', mn: 'Зардлын загварт тооцох парк алга' },
  'roi.emptyText': {
    en: 'Gross benefit, platform cost, payback and cost per km appear as soon as the simulation produces its first fleet snapshot. Start or resume the simulation from the top bar.',
    mn: 'Нийт өгөөж, платформын зардал, өртөг нөхөгдөх хугацаа, км тутмын зардал загварчлал паркийн анхны төлөвийг гаргамагц харагдана. Дээд самбараас загварчлалыг эхлүүлэх эсвэл үргэлжлүүлнэ үү.',
  },
  'roi.breakdownEmpty': { en: 'No benefit to attribute', mn: 'Хуваарилах өгөөж алга' },
  'roi.breakdownEmptyText': {
    en: 'This table splits the gross annual benefit across its four sources. Raise any effectiveness lever above zero on the left and the lines appear.',
    mn: 'Энэ хүснэгт жилийн нийт өгөөжийг дөрвөн эх үүсвэрт хуваана. Зүүн талын аль нэг үр нөлөөний тохируулгыг тэгээс их болговол мөрүүд гарч ирнэ.',
  },
  'roi.operatorEmpty': { en: 'No operator has a bus in this snapshot', mn: 'Одоогийн мэдээлэлд автобустай оператор алга' },
  'roi.operatorEmptyText': {
    en: 'One row per operator, with the model scaled to the buses that operator actually runs. Rows appear once the simulated fleet carries a bus for at least one operator.',
    mn: 'Оператор бүрт нэг мөр; загварыг тухайн операторын бодит ажиллуулж буй автобусны тоогоор тооцно. Загварчилсан паркт дор хаяж нэг операторын автобус гармагц мөрүүд гарч ирнэ.',
  },
  'roi.sizingEmpty': { en: 'No route is carrying a bus', mn: 'Автобус ажиллаж буй чиглэл алга' },
  'roi.sizingEmptyText': {
    en: 'Each row compares the buses a route needs at the peak speed above with the buses it has. Routes appear once the simulation puts a bus on one.',
    mn: 'Мөр бүр дээрх оргил цагийн хурдаар чиглэлд шаардагдах автобусыг одоо байгаа автобустай харьцуулна. Загварчлал чиглэлд автобус гаргамагц чиглэлүүд гарч ирнэ.',
  },

  'roi.authoritySub': {
    en: 'Whole-network view. Gross benefit less platform cost gives net; payback is the months of gross benefit that cover one year of platform cost.',
    mn: 'Сүлжээг бүхэлд нь харах. Нийт өгөөжөөс платформын зардлыг хасвал цэвэр өгөөж; өртөг нөхөгдөх хугацаа нь платформын нэг жилийн зардлыг нөхөх нийт өгөөжийн сарын тоо.',
  },
} as const satisfies Record<string, Entry>;
