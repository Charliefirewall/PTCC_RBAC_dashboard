/**
 * Bilingual strings owned by the component-prediction workstream (predict.ts + the
 * predictive worklist on #/health).
 *
 * Split out of dict.ts so parallel work cannot clobber a shared file. Merged into the
 * main dictionary by dict.ts; keys must stay globally unique.
 *
 * NOTHING here is from the client's deck - the deck contains no component model at all.
 * So `r` is left unset on every entry and `unreviewedKeys()` keeps reporting them for
 * native review (plan risk R11).
 */
import type { Entry } from './dict';

export const predictDict = {
  // ---------------------------------------------------------------- threshold labels
  // Settings and the provenance questionnaire read these through THRESHOLD_META.
  'th.pred_driveline_life_km': { en: 'Engine / driveline life', mn: 'Хөдөлгүүр / хүч дамжуулах системийн ашиглалтын хугацаа' },
  'th.pred_door_life_days': { en: 'Door mechanism life', mn: 'Хаалганы механизмын ашиглалтын хугацаа' },
  'th.pred_hvac_life_days': { en: 'HVAC life', mn: 'Халаалт, агааржуулалтын ашиглалтын хугацаа' },
  'th.pred_device_mtbf_days': { en: 'On-board device mean time between failures', mn: 'Бортын төхөөрөмжийн гэмтэл хоорондын дундаж хугацаа' },
  'th.pred_duty_sensitivity': { en: 'Duty-cycle sensitivity', mn: 'Ашиглалтын ачааллын мэдрэмж' },
  'th.pred_assumed_daily_km': { en: 'Assumed daily km per bus', mn: 'Автобусны өдрийн гүйлт, км (таамаг)' },
  'th.pred_zone_critical_days': { en: 'Zone boundary — Critical (days)', mn: 'Бүсийн хил — Ноцтой (хоног)' },
  'th.pred_zone_high_days': { en: 'Zone boundary — High (days)', mn: 'Бүсийн хил — Өндөр (хоног)' },
  'th.pred_zone_elevated_days': { en: 'Zone boundary — Elevated (days)', mn: 'Бүсийн хил — Ихэссэн (хоног)' },
  'th.pred_interval_spread_pct': { en: 'RUL interval half-width', mn: 'RUL-ийн мужийн хагас өргөн' },

  // ---------------------------------------------------------------- components
  'pred.cmp.brakes': { en: 'Brakes', mn: 'Тоормос' },
  'pred.cmp.tyres': { en: 'Tyres', mn: 'Дугуй' },
  'pred.cmp.clutch': { en: 'Clutch', mn: 'Шүүрэлт' },
  'pred.cmp.battery': { en: 'Battery', mn: 'Аккумлятор' },
  'pred.cmp.doors': { en: 'Doors', mn: 'Хаалга' },
  'pred.cmp.hvac': { en: 'Heating / air conditioning', mn: 'Халаалт / агааржуулалт' },
  'pred.cmp.driveline': { en: 'Engine / driveline', mn: 'Хөдөлгүүр / хүч дамжуулах систем' },
  'pred.cmp.devices': { en: 'On-board devices (AFC / CCTV / T-Box)', mn: 'Бортын төхөөрөмж (AFC / CCTV / T-Box)' },

  // ---------------------------------------------------------------- duty signals
  'pred.sig.city': { en: 'City stop-start duty', mn: 'Хотын зогсох-хөдлөх горим' },
  'pred.sig.load': { en: 'Passenger load', mn: 'Зорчигчийн ачаалал' },
  'pred.sig.central': { en: 'Corridor centrality', mn: 'Коридорын төвлөрөл' },
  'pred.sig.age': { en: 'Vehicle age (assumed)', mn: 'Тээврийн хэрэгслийн нас (таамаг)' },
  'pred.sig.boarding': { en: 'Boardings per km', mn: 'Км тутамд суусан зорчигч' },
  'pred.sig.devicesOff': { en: 'Devices offline now', mn: 'Одоо офлайн төхөөрөмж' },
  'pred.sig.phase': { en: 'Life already consumed (no service history)', mn: 'Аль хэдийн ашигласан хугацаа (засварын түүхгүй)' },
  'pred.raises': { en: 'shortens life', mn: 'хугацааг богиносгоно' },
  'pred.lowers': { en: 'extends life', mn: 'хугацааг уртасгана' },

  // ---------------------------------------------------------------- actions per zone
  // Our operational-state wording (§13.2) — deliberately not the reference product's.
  'pred.act.critical': { en: 'Withdraw at end of trip; book the work now', mn: 'Рейсийн төгсгөлд шугамаас гаргаж, засварыг одоо захиалах' },
  'pred.act.high': { en: 'Book into the next depot slot; avoid peak assignment', mn: 'Баазын дараагийн чөлөөт цагт оруулах; оргил цагт гаргахгүй байх' },
  'pred.act.elevated': { en: 'Inspect at the next routine service', mn: 'Дараагийн ээлжит үйлчилгээгээр шалгах' },
  'pred.act.low': { en: 'Routine — no action', mn: 'Хэвийн — арга хэмжээ шаардлагагүй' },

  // ---------------------------------------------------------------- worklist surface
  'pred.worklist': { en: 'Predictive worklist — component life', mn: 'Таамаглалд суурилсан ажлын жагсаалт — эд ангийн ашиглалтын хугацаа' },
  'pred.worklistSub': {
    en: 'Ranked by zone, then by due date, then by passengers on board. Passenger exposure is our value at risk — PTPD oversees service, not a truck fleet.',
    mn: 'Бүсээр, дараа нь хугацаагаар, дараа нь автобус дахь зорчигчийн тоогоор эрэмбэлсэн. Эрсдэлд буй үнэ цэнийг бид зорчигчоор хэмждэг — НТГ ачааны парк биш, үйлчилгээг хянадаг.',
  },
  'pred.worklistNote': {
    en: 'Every row is model output, not an observation. No component replacement history exists for any bus in this fleet.',
    mn: 'Мөр бүр загварын гаралт болохоос ажиглалт биш. Энэ паркийн аль ч автобусанд эд анги солисон түүх байхгүй.',
  },
  'pred.detail': { en: 'Component life — {bus}', mn: 'Эд ангийн ашиглалтын хугацаа — {bus}' },
  'pred.forecast': { en: 'Fleet intervention forecast', mn: 'Паркийн засварын таамаглал' },
  'pred.forecastSub': {
    en: 'Interventions the model expects within the horizon, with the count taken at both ends of the interval. This is the failure side of the ROI argument; the cost side is the spend model above.',
    mn: 'Тухайн хугацаанд загварын хүлээж буй засварын ажил, мужийн хоёр захаар тоолсон. Энэ нь ROI-ийн гэмтлийн тал; зардлын тал нь дээрх зардлын загварт бий.',
  },

  // ---------------------------------------------------------------- columns / labels
  'pred.component': { en: 'Component', mn: 'Эд анги' },
  'pred.rul': { en: 'Remaining life (median)', mn: 'Үлдэгдэл ашиглалтын хугацаа (медиан)' },
  'pred.rulKm': { en: 'Median, km', mn: 'Медиан, км' },
  'pred.interval': { en: 'p10–p90 range', mn: 'p10–p90 муж' },
  'pred.confidence': { en: 'Confidence', mn: 'Итгэлийн түвшин' },
  'pred.zone': { en: 'Zone', mn: 'Бүс' },
  'pred.action': { en: 'Recommended action', mn: 'Зөвлөмж болгосон арга хэмжээ' },
  'pred.window': { en: 'Service window', mn: 'Засвар хийх хугацаа' },
  'pred.factors': { en: 'Why', mn: 'Шалтгаан' },
  'pred.due': { en: 'Earliest due', mn: 'Хамгийн эрт хугацаа' },
  'pred.worst': { en: 'Driving component', mn: 'Тодорхойлогч эд анги' },
  'pred.days': { en: 'd', mn: 'хоног' },
  'pred.dailyKm': { en: 'Modelled daily km', mn: 'Загварчилсан өдрийн км' },
  'pred.horizon': { en: 'Horizon', mn: 'Хугацаа' },
  'pred.dueIn': { en: 'Due in horizon', mn: 'Хугацаанд хийгдэх' },
  'pred.annualised': { en: 'Annualised', mn: 'Жилээр тооцсон' },
  'pred.range': { en: 'Range', mn: 'Муж' },

  // ---------------------------------------------------------------- tiles
  'pred.kpiCritical': { en: 'Buses in Critical zone', mn: 'Ноцтой бүсийн автобус' },
  'pred.kpiHigh': { en: 'Buses in High zone', mn: 'Өндөр бүсийн автобус' },
  'pred.kpiDue': { en: 'Interventions in horizon', mn: 'Хугацаанд хийгдэх засвар' },
  'pred.kpiExposure': { en: 'Passengers on at-risk buses', mn: 'Эрсдэлтэй автобусны зорчигч' },

  // ---------------------------------------------------------------- model explanation
  'pred.model': {
    en: 'effective life = base life ÷ duty · duty = 1 + sensitivity × Σ(weight × signal) · remaining = effective life × (1 − life already consumed)',
    mn: 'бодит хугацаа = суурь хугацаа ÷ ачаалал · ачаалал = 1 + мэдрэмж × Σ(жин × дохио) · үлдэгдэл = бодит хугацаа × (1 − ашигласан хэсэг)',
  },
  'pred.notML': {
    en: 'This is a deterministic duty-cycle model, not machine learning. It has no trained parameters and was fitted to nothing, because there is no maintenance data to fit it to. Confidence is therefore capped at {cap} %.',
    mn: 'Энэ бол машин сургалт биш, детерминист ачааллын загвар. Сургасан параметргүй, юунд ч тааруулаагүй, учир нь тааруулах засвар үйлчилгээний өгөгдөл байхгүй. Тиймээс итгэлийн түвшинг {cap} %-иар хязгаарласан.',
  },
  'pred.step.signals': { en: 'Duty signals', mn: 'Ачааллын дохио' },
  'pred.step.duty': { en: 'Duty factor', mn: 'Ачааллын коэффициент' },
  'pred.step.life': { en: 'Remaining life + range', mn: 'Үлдэгдэл хугацаа ба муж' },
  'pred.step.zone': { en: 'Zone + action', mn: 'Бүс ба арга хэмжээ' },

  // ---------------------------------------------------------------- tooltips
  'pred.tip.rul': {
    en: 'Median remaining life. Never read it alone — the p10–p90 range beside it is the honest figure.',
    mn: 'Үлдэгдэл ашиглалтын хугацааны медиан. Дангаар нь бүү уншаарай — хажууд нь буй p10–p90 муж бодит дүр зургийг харуулна.',
  },
  'pred.tip.confidence': {
    en: 'Share of the duty factor that rests on observed rather than invented inputs, capped at {cap} % while no service history exists.',
    mn: 'Ачааллын коэффициентийн зохиомол биш, ажигласан оролтод тулгуурласан хэсэг. Засвар үйлчилгээний түүх байхгүй үед {cap} %-иар хязгаарлана.',
  },
  'pred.tip.window': {
    en: 'Book the work before the earliest plausible failure — the window ends at the p10 bound, not at the median.',
    mn: 'Хамгийн эрт гэмтэж болох хугацаанаас өмнө засварыг захиална уу — хугацаа медианаар биш, p10 хязгаараар дуусна.',
  },
  'pred.tip.zone': {
    en: 'Our four operational states (§13.2) — the same words and colours the alerts use. Not a fifth colour language.',
    mn: 'Бидний үйл ажиллагааны дөрвөн төлөв (§13.2) — сэрэмжлүүлэгтэй ижил үг, өнгө. Шинэ өнгөний тэмдэглэгээ биш.',
  },

  // ---------------------------------------------------------------- absences
  'pred.inputsTitle': { en: 'Additional inputs required from PTPD for the RUL model', mn: 'RUL загварт НТГ-аас нэмж шаардагдах мэдээлэл' },
  'pred.input1': { en: 'Component replacement history per bus — the model has no service record at all', mn: 'Автобус тус бүрийн эд анги солисон түүх — загварт засварын бүртгэл огт байхгүй' },
  'pred.input2': { en: 'Fleet register: build year, make, model, capacity class', mn: 'Паркийн бүртгэл: үйлдвэрлэсэн он, марк, загвар, багтаамжийн ангилал' },
  'pred.input3': { en: 'Odometer per bus, or confirmation that the T-Box KM-Hour figure (R958) can supply it', mn: 'Автобус тус бүрийн гүйлтийн тоолуур, эсвэл T-Box-ын KM-Hour утгыг (R958) ашиглаж болохыг батлах' },
  'pred.input4': { en: 'Manufacturer or operator replacement intervals for each of the eight components', mn: 'Найман эд анги тус бүрийн үйлдвэрлэгч эсвэл операторын тогтоосон солих интервал' },
  'pred.input5': { en: 'Which failures actually caused a service withdrawal last year, and how many', mn: 'Өнгөрсөн жил ямар гэмтлээс болж автобус шугамаас гарсан, хэдэн удаа' },
  'pred.noRisk': { en: 'No bus is outside the routine zone.', mn: 'Хэвийн бүсээс гарсан автобус алга.' },
  'pred.selectBus': { en: 'Select a bus in the worklist to see its eight components.', mn: 'Найман эд ангийг харахын тулд жагсаалтаас автобус сонгоно уу.' },

  // ---------------------------------------------------------------- empty states
  /*
   * Three shapes, and the distinction between them is the honest part:
   *   - nothing to show because the model found nothing wrong  → reassurance
   *   - nothing to show because nothing is selected            → an instruction
   *   - nothing to show because there is no fleet at all       → neither of the above,
   *     and it must never borrow the reassuring wording of the first.
   * None of these is a loading state: every figure here is computed synchronously.
   */
  'pred.noRiskText': {
    en: 'The worklist lists buses whose modelled component life falls inside the planning horizon. An empty list is the result, not a gap: every bus is in the routine zone on today\'s duty cycle.',
    mn: 'Ажлын жагсаалтад эд ангийн загварчилсан ашиглалтын хугацаа нь төлөвлөлтийн хугацаанд дуусах автобусууд ордог. Хоосон жагсаалт бол дутагдал биш, үр дүн: өнөөдрийн ачааллаар бүх автобус хэвийн бүсэд байна.',
  },
  'pred.selectBusText': {
    en: 'Each row is one of the eight modelled components, with its remaining life and the p10–p90 range beside it. Click a bus in the worklist above to fill this panel.',
    mn: 'Мөр бүр загварчилсан найман эд ангийн нэг бөгөөд үлдэгдэл хугацаа, p10–p90 мужтайгаа харагдана. Энэ самбарыг дүүргэхийн тулд дээрх жагсаалтаас автобус дарна уу.',
  },
  'pred.noFleet': { en: 'No bus in the snapshot to model', mn: 'Паркийн мэдээлэлд загварчлах автобус алга' },
  'pred.noFleetText': {
    en: 'This is not a result — the prediction layer has received no vehicles at all. Zones, remaining life and the intervention forecast appear once the simulation is running.',
    mn: 'Энэ бол үр дүн биш — таамаглалын давхаргад нэг ч тээврийн хэрэгсэл ирээгүй. Бүс, үлдэгдэл хугацаа, засварын таамаглал загварчлал ажиллаж эхлэхэд гарч ирнэ.',
  },

  // ---------------------------------------------------------------- fleet health empty states
  // Health strings live in this file because the health module shares its workstream
  // with the prediction layer and the other dictionaries belong to other workstreams.
  'health.emptyTitle': { en: 'No fleet snapshot to read device status from', mn: 'Төхөөрөмжийн төлөв унших паркийн мэдээлэл алга' },
  'health.emptyText': {
    en: 'Offline AFC, T-Box and CCTV counts, the health score and the cost model all read from the live fleet. Start or resume the simulation from the top bar and this page fills immediately.',
    mn: 'Офлайн AFC, T-Box, хяналтын камерын тоо, найдвартай байдлын оноо, зардлын загвар бүгд паркийн шууд мэдээллээс уншдаг. Дээд самбараас загварчлалыг эхлүүлэх эсвэл үргэлжлүүлбэл энэ хуудас шууд дүүрнэ.',
  },
  'health.devicesOkText': {
    en: 'Every AFC, T-Box and CCTV unit on this list is reporting. An empty list here is the fleet working, not missing data.',
    mn: 'Энэ жагсаалтын бүх AFC, T-Box, хяналтын камер мэдээлэл дамжуулж байна. Энд хоосон байх нь өгөгдөл дутуу биш, парк хэвийн ажиллаж байгааг илтгэнэ.',
  },
  'health.noRepeatText': {
    en: 'No operator has three or more buses with a device down at once — the threshold at which a fault stops looking like bad luck.',
    mn: 'Нэг ч операторын гурав буюу түүнээс дээш автобусны төхөөрөмж нэгэн зэрэг тасраагүй байна — энэ нь гэмтлийг санамсаргүй гэж үзэхээ болих босго.',
  },
  'health.noBusTitle': { en: 'No bus selected', mn: 'Автобус сонгоогүй байна' },
  'health.noBusText': {
    en: 'These figures are per bus. Click a row in the offline list or the priority queue to choose one, and the simulated cost lines and component split appear here.',
    mn: 'Эдгээр тоо автобус тус бүрийнх. Офлайн жагсаалт эсвэл тэргүүлэх дарааллаас мөр дарж автобус сонговол загварчилсан зардал, эд ангиар задаргаа энд гарна.',
  },
  'health.queueEmpty': { en: 'No bus is below the attention score', mn: 'Анхаарлын босгоос доогуур оноотой автобус алга' },
  'health.queueEmptyText': {
    en: 'The queue ranks buses that score under 80 by passenger exposure. An empty queue is a result: no bus in the fleet currently scores low enough to be worth an inspection slot.',
    mn: 'Дараалалд 80-аас доош оноотой автобусыг зорчигчдод үзүүлэх нөлөөгөөр эрэмбэлнэ. Хоосон дараалал бол үр дүн: одоогоор үзлэгт оруулах хэмжээний бага оноотой автобус паркт алга.',
  },
} as const satisfies Record<string, Entry>;
