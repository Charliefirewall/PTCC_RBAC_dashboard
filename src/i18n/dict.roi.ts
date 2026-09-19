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
  'roi.viewAuthority': { en: 'PTPD / authority', mn: 'НТГ / захиргаа' },
  'roi.viewOperator': { en: 'Per operator', mn: 'Оператор тус бүрээр' },
  'roi.viewPerBus': { en: 'Per bus', mn: 'Автобус тутамд' },

  // ---------------------------------------------------------------- honesty surfaces
  'roi.scenarioNotice': {
    en: 'Every figure on this screen is a scenario computed from the assumptions on the left, not a measurement. The client stated they do not hold this cost data. Change any input and every output below moves.',
    mn: 'Энэ дэлгэц дээрх бүх тоо нь зүүн талын таамаглалаас тооцоолсон хувилбар бөгөөд хэмжилт биш. Үйлчлүүлэгч эдгээр зардлын өгөгдөлгүй гэдгээ хэлсэн. Аль ч оролтыг өөрчлөхөд доорх бүх үр дүн өөрчлөгдөнө.',
  },
  'roi.citeNoData': {
    en: 'no client cost data exists (client conversation)',
    mn: 'үйлчлүүлэгчийн зардлын өгөгдөл байхгүй (уулзалтын тэмдэглэл)',
  },
  'roi.inputsLink': { en: 'Open provenance', mn: 'Эх сурвалж харах' },
  'roi.inputsSub': {
    en: 'Until PTPD supplies these, no figure on this screen can be promoted above ASSUMPTION.',
    mn: 'НТГ эдгээрийг өгөх хүртэл энэ дэлгэцийн аль ч тоог ТААМАГ-аас дээш ангилах боломжгүй.',
  },
  'roi.failureSource': { en: 'Failure count from', mn: 'Эвдрэлийн тооны эх үүсвэр' },
  'roi.srcPredicted': { en: 'Prediction layer', mn: 'Таамаглалын давхарга' },
  'roi.srcAssumed': { en: 'Rate assumption below', mn: 'Доорх түвшингийн таамаглал' },
  'roi.predBand': {
    en: 'of {lo}–{hi} predicted interventions per year',
    mn: 'жилд таамагласан {lo}–{hi} арга хэмжээнээс',
  },
  'roi.predictionInput': {
    en: 'Failure count comes from the breakdown-rate assumption above. Nothing sources that rate.',
    mn: 'Эвдрэлийн тоо нь дээрх түвшингийн таамаглалаас авагдаж байна. Тэр түвшинг баталгаажуулах эх сурвалж байхгүй.',
  },
  'roi.predictionLive': {
    en: 'Failure count comes from the fleet forecast in the prediction layer, annualised. That forecast is itself a model, not a record.',
    mn: 'Эвдрэлийн тоо нь таамаглалын давхаргын паркийн урьдчилсан тооцооноос жилээр тооцогдож байна. Тэр тооцоо нь өөрөө загвар бөгөөд бүртгэл биш.',
  },

  // ---------------------------------------------------------------- assumptions panel
  'roi.assumptions': { en: 'Assumptions', mn: 'Таамаглал' },
  'roi.assumptionsSub': {
    en: 'Every input is editable. Nothing here is sourced; these are starting points for the conversation with PTPD.',
    mn: 'Бүх оролт засварлагдана. Эдгээрийн аль нь ч эх сурвалжтай биш; НТГ-тай ярилцах эхлэлийн цэг юм.',
  },
  'roi.scenario': { en: 'Scenario', mn: 'Хувилбар' },
  'roi.scConservative': { en: 'Conservative', mn: 'Болгоомжтой' },
  'roi.scBase': { en: 'Base', mn: 'Суурь' },
  'roi.scOptimistic': { en: 'Optimistic', mn: 'Өөдрөг' },
  'roi.scCustom': { en: 'Custom', mn: 'Өөрчилсөн' },
  'roi.scenarioHint': {
    en: 'A preset writes the four effectiveness levers and nothing else. Touch any input and this reads "Custom" — a moved slider is never a preset.',
    mn: 'Урьдчилсан тохиргоо нь зөвхөн дөрвөн үр нөлөөний тохируулгыг бичнэ. Аль нэг оролтыг хөдөлгөвөл энэ нь "Өөрчилсөн" болно.',
  },
  'roi.groupFleet': { en: 'Fleet', mn: 'Парк' },
  'roi.groupSpend': { en: 'Spend per bus per year', mn: 'Автобус тутмын жилийн зардал' },
  'roi.groupReliability': { en: 'Reliability', mn: 'Найдвартай байдал' },
  'roi.groupLevers': { en: 'Effectiveness levers', mn: 'Үр нөлөөний тохируулга' },
  'roi.reset': { en: 'Reset to defaults', mn: 'Анхны утгад буцаах' },

  // ---------------------------------------------------------------- input labels
  'roi.inFleet': { en: 'Fleet size', mn: 'Паркийн хэмжээ' },
  'roi.inKm': { en: 'Km per bus per year', mn: 'Автобус тутмын жилийн км' },
  'roi.inMaint': { en: 'Maintenance per bus', mn: 'Автобус тутмын засвар үйлчилгээ' },
  'roi.inEnergy': { en: 'Fuel or electricity per km', mn: 'Түлш эсвэл цахилгаан, км тутамд' },
  'roi.inDriver': { en: 'Driver salary per bus', mn: 'Жолоочийн цалин, автобус тутамд' },
  'roi.inInsurance': { en: 'Insurance per bus', mn: 'Даатгал, автобус тутамд' },
  'roi.inAccident': { en: 'Accident / incident cost per bus', mn: 'Осол, зөрчлийн зардал, автобус тутамд' },
  'roi.inConsumables': { en: 'Tyres, brakes, clutch per bus', mn: 'Дугуй, тормоз, шүүрэг, автобус тутамд' },
  'roi.inBreakdowns': { en: 'Unplanned failures per 100 buses per year', mn: 'Төлөвлөгөөгүй эвдрэл, 100 автобус тутамд жилд' },
  'roi.inDowntimeValue': { en: 'Value of one bus-day out of service', mn: 'Нэг автобусын зогсолтын өдрийн үнэ цэн' },
  'roi.inDowntimeDays': { en: 'Days out of service per failure', mn: 'Эвдрэл тутамд зогссон өдөр' },
  'roi.inPlatform': { en: 'Platform cost per bus per year', mn: 'Платформын зардал, автобус тутамд жилд' },
  'roi.inPrevented': { en: 'Unplanned failures avoided', mn: 'Сэргийлсэн төлөвлөгөөгүй эвдрэл' },
  'roi.inPlannedMaint': { en: 'Servicing and consumables reduced', mn: 'Засвар, сэлбэгийн бууралт' },
  'roi.inEnergyRed': { en: 'Energy per km reduced', mn: 'Км тутмын эрчим хүчний бууралт' },
  'roi.inAccidentRed': { en: 'Accident and insurance cost reduced', mn: 'Осол, даатгалын зардлын бууралт' },

  // ---------------------------------------------------------------- outputs
  'roi.outGross': { en: 'Gross annual benefit', mn: 'Жилийн нийт өгөөж' },
  'roi.outPlatform': { en: 'Platform cost', mn: 'Платформын зардал' },
  'roi.outNet': { en: 'Net annual benefit', mn: 'Жилийн цэвэр өгөөж' },
  'roi.outPayback': { en: 'Payback', mn: 'Нөхөгдөх хугацаа' },
  'roi.outBaseline': { en: 'Baseline annual spend', mn: 'Суурь жилийн зардал' },
  'roi.months': { en: 'months', mn: 'сар' },
  'roi.never': { en: 'never', mn: 'хэзээ ч үгүй' },
  'roi.perBusYear': { en: 'per bus per year', mn: 'автобус тутамд жилд' },
  'roi.ofSpend': { en: '{p} of baseline spend', mn: 'суурь зардлын {p}' },
  'roi.netPerPlatform': { en: '{x}× platform cost', mn: 'платформын зардлаас {x} дахин' },
  'roi.failuresAvoided': { en: 'Unplanned failures avoided per year', mn: 'Жилд сэргийлсэн төлөвлөгөөгүй эвдрэл' },
  'roi.ofFailures': { en: 'of {n} assumed', mn: 'таамагласан {n}-аас' },
  'roi.breakdown': { en: 'Where the value comes from', mn: 'Өгөөж хаанаас гарч байна' },
  'roi.breakdownChart': { en: 'Annual benefit by source', mn: 'Эх үүсвэрээр жилийн өгөөж' },
  'roi.termFailures': { en: 'Avoided unplanned failures', mn: 'Сэргийлсэн төлөвлөгөөгүй эвдрэл' },
  'roi.termMaint': { en: 'Condition-based servicing', mn: 'Нөхцөлд суурилсан засвар' },
  'roi.termEnergy': { en: 'Energy per km', mn: 'Км тутмын эрчим хүч' },
  'roi.termSafety': { en: 'Accidents and insurance', mn: 'Осол ба даатгал' },
  'roi.colSource': { en: 'Source of value', mn: 'Өгөөжийн эх үүсвэр' },
  'roi.colAnnual': { en: 'Per year', mn: 'Жилд' },
  'roi.colShare': { en: 'Share', mn: 'Эзлэх хувь' },
  'roi.colBuses': { en: 'Buses', mn: 'Автобус' },
  'roi.perKmBefore': { en: 'Operating cost per km', mn: 'Км тутмын үйл ажиллагааны зардал' },
  'roi.perKmAfter': { en: 'Per km on this scenario', mn: 'Энэ хувилбар дахь км тутмын зардал' },
  'roi.onTheseAssumptions': { en: 'on these assumptions', mn: 'эдгээр таамаглалын дагуу' },
  'roi.perBusSub': {
    en: 'The same model divided by one bus. Useful because it is the unit PTPD negotiates in.',
    mn: 'Ижил загварыг нэг автобусаар. НТГ энэ нэгжээр хэлэлцдэг тул хэрэгтэй.',
  },
  'roi.operatorSub': {
    en: 'Bus counts are real — they come from the live simulated fleet. Every ₮ figure beside them is a scenario.',
    mn: 'Автобусны тоо нь бодит — шууд загварчилсан парк дээрээс авсан. Хажуугийн бүх ₮ тоо нь хувилбар юм.',
  },
  // ---------------------------------------------------------------- empty states
  // Two lines each: what the panel will show, and what makes it appear. A bare label or
  // a bare em dash tells an operator nothing — not whether it is loading, broken, or
  // genuinely empty. Nothing on this page loads: the model is synchronous arithmetic.
  'roi.emptyTitle': { en: 'The cost model has no fleet to size itself against', mn: 'Зардлын загварт хэмжих парк алга' },
  'roi.emptyText': {
    en: 'Gross benefit, platform cost, payback and cost per km appear as soon as the simulation produces its first fleet snapshot. Start or resume the simulation from the top bar.',
    mn: 'Нийт өгөөж, платформын зардал, нөхөгдөх хугацаа, км тутмын зардал нь загварчлал анхны паркийн төлөвөө гаргамагц харагдана. Дээд талын самбараас загварчлалыг эхлүүлэх буюу үргэлжлүүлнэ үү.',
  },
  'roi.breakdownEmpty': { en: 'No benefit to attribute', mn: 'Хуваарилах өгөөж алга' },
  'roi.breakdownEmptyText': {
    en: 'This table splits the gross annual benefit across its four sources. Raise any effectiveness lever above zero on the left and the lines appear.',
    mn: 'Энэ хүснэгт жилийн нийт өгөөжийг дөрвөн эх үүсвэрт хуваана. Зүүн талын аль нэг үр нөлөөний тохируулгыг тэгээс дээш болговол мөрүүд гарч ирнэ.',
  },
  'roi.operatorEmpty': { en: 'No operator has a bus in this snapshot', mn: 'Энэ төлөвт автобустай оператор алга' },
  'roi.operatorEmptyText': {
    en: 'One row per operator, with the model scaled to the buses that operator actually runs. Rows appear once the simulated fleet carries a bus for at least one operator.',
    mn: 'Оператор тус бүрд нэг мөр, загварыг тухайн операторын жинхэнэ автобусны тоогоор хэмжинэ. Загварчилсан парк дор хаяж нэг операторт автобустай болмогц мөр гарна.',
  },
  'roi.sizingEmpty': { en: 'No route is carrying a bus', mn: 'Автобус явуулж буй чиглэл алга' },
  'roi.sizingEmptyText': {
    en: 'Each row compares the buses a route needs at the peak speed above with the buses it has. Routes appear once the simulation puts a bus on one.',
    mn: 'Мөр бүр дээрх оргил хурд дээр чиглэлд шаардагдах автобусыг одоогийн тоотой харьцуулна. Загварчлал чиглэлд автобус гаргамагц мөр гарна.',
  },

  'roi.authoritySub': {
    en: 'Whole-network view. Gross benefit less platform cost gives net; payback is the months of gross benefit that cover one year of platform cost.',
    mn: 'Сүлжээний бүхэлд нь харах. Нийт өгөөжөөс платформын зардлыг хасвал цэвэр өгөөж; нөхөгдөх хугацаа нь нэг жилийн платформын зардлыг нөхөх өгөөжийн сарын тоо.',
  },
} as const satisfies Record<string, Entry>;
