/** UX pass (Sept 2026) strings. Ours, not the deck's: `r` unset, on the native-review list. */
import type { Entry } from './dict';

export const uxregDict = {
  // --- Regularity: headway analysis chart
  'uxreg.hw.sub': {
    en: 'Live largest gap between buses on {route} vs. planned {planned} min; over {gap} min = service gap.',
    mn: '{route} чиглэлийн автобус хоорондын одоогийн хамгийн их завсар, төлөвлөсөн нь {planned} мин; {gap} минутаас дээш бол үйлчилгээний завсар.',
  },
  'uxreg.axis.time': { en: 'Time (sim, HH:MM:SS)', mn: 'Цаг (загварчлал, ЦЦ:ММ:СС)' },
  'uxreg.hw.plannedMark': { en: 'Planned {min} min', mn: 'Төлөвлөсөн {min} мин' },
  'uxreg.hw.gapMark': { en: 'Service-gap threshold {min} min', mn: 'Үйлчилгээний завсрын босго {min} мин' },
  'uxreg.hw.diff': { en: 'Difference', mn: 'Зөрүү' },
  'uxreg.stripLegend': { en: 'Vehicle delay-state legend', mn: 'Автобусны хоцролтын төлөвийн тайлбар' },
  'uxreg.routeInsight': {
    en: 'Route {route}: largest current gap {gap} min versus {planned} min planned, across {buses} buses. Operational reading: {action}.',
    mn: '{route} чиглэл: одоогийн хамгийн их завсар {gap} мин, төлөвлөсөн {planned} мин, нийт {buses} автобус. Үйл ажиллагааны дүгнэлт: {action}.',
  },
  // --- Analytics: service reliability impact
  'uxreg.imp.yAxis': { en: 'Largest headway gap (min)', mn: 'Хамгийн их завсар (мин)' },
  'uxreg.imp.before': { en: 'Before', mn: 'Өмнө' },
  'uxreg.imp.during': { en: 'During event', mn: 'Үйл явдлын үед' },
  'uxreg.imp.after': { en: 'After', mn: 'Дараа' },
  'uxreg.imp.threshold': { en: 'Gap threshold {min} min', mn: 'Завсрын босго {min} мин' },
  'uxreg.imp.series': { en: 'Largest gap', mn: 'Хамгийн их завсар' },
  'uxreg.imp.mean': { en: 'Mean · {phase}', mn: 'Дундаж · {phase}' },
  'uxreg.imp.peak': { en: 'Peak gap', mn: 'Оргил завсар' },
  'uxreg.imp.peakAt': { en: 'at {at}', mn: '{at}-д' },
  'uxreg.imp.change': { en: 'During vs before', mn: 'Үед / өмнө' },
  'uxreg.imp.recovery': { en: 'Recovery', mn: 'Сэргэлт' },
  'uxreg.imp.recAfter': { en: '{min} min after', mn: '{min} минутын дараа' },
  'uxreg.imp.recNotYet': { en: 'Not yet', mn: 'Хараахан үгүй' },
  'uxreg.imp.recOpen': { en: 'Event ongoing', mn: 'Үйл явдал үргэлжилж байна' },
  'uxreg.imp.noBase': { en: 'No baseline', mn: 'Жишиг өгөгдөлгүй' },
  'uxreg.imp.sumRose': {
    en: 'Gap rose {x}× during the event ({before} → {during} min)',
    mn: 'Үйл явдлын үед завсар {x} дахин өссөн ({before} → {during} мин)',
  },
  'uxreg.imp.sumFell': {
    en: 'Gap fell to {x}× of its pre-event level ({before} → {during} min)',
    mn: 'Завсар үйл явдлын өмнөх түвшнийхээ {x} дахин болж буурсан ({before} → {during} мин)',
  },
  'uxreg.imp.sumPeak': {
    en: 'Peak gap {peak} min at {at}',
    mn: 'Оргил завсар {peak} мин ({at})',
  },
  'uxreg.imp.sumBack': {
    en: 'back under {thr} min {min} min after the event window',
    mn: 'үйл явдлын дараа {min} минутад {thr} минутаас доош буцсан',
  },
  'uxreg.imp.sumNot': {
    en: 'has not yet recovered below {thr} min',
    mn: '{thr} минутаас доош хараахан буураагүй',
  },
  'uxreg.imp.sumOpen': { en: 'the event is still in progress', mn: 'үйл явдал үргэлжилж байна' },
  'uxreg.imp.approx': {
    en: 'Event window approximated (middle third of the record): the event began before the recorded headway history.',
    mn: 'Үйл явдлын хугацааг ойролцоогоор (бүртгэлийн дунд гуравны нэг) тогтоосон: үйл явдал давтамжийн бүртгэл эхлэхээс өмнө эхэлсэн.',
  },
  // --- Shared chart vocabulary. Axis titles include the unit where the scale has one.
  'chart.axis.operator': { en: 'Operator', mn: 'Оператор' },
  'chart.axis.onTimePct': { en: 'On-time performance (%)', mn: 'Цаг баримтлалт (%)' },
  'chart.axis.route': { en: 'Route', mn: 'Чиглэл' },
  'chart.axis.loadPct': { en: 'Average passenger load (%)', mn: 'Зорчигчийн дундаж ачаалал (%)' },
  'chart.axis.rank': { en: 'Historical segment rank', mn: 'Замын хэсгийн түүхэн эрэмбэ' },
  'chart.axis.delayImpact': { en: 'Estimated bus delay (bus-min)', mn: 'Автобусны тооцоолсон саатал (автобус-мин)' },
  'chart.axis.costDriver': { en: 'Cost driver', mn: 'Зардлын хүчин зүйл' },
  'chart.axis.annualCost': { en: 'Annual cost (MNT)', mn: 'Жилийн зардал (MNT)' },
  'chart.axis.startTime': { en: 'Trip start time', mn: 'Аялал эхлэх цаг' },
  'chart.axis.stop': { en: 'Stop (travel order)', mn: 'Буудал (явах дарааллаар)' },
  'chart.series.load': { en: 'Average load', mn: 'Дундаж ачаалал' },
  'chart.series.delayImpact': { en: 'Historical delay impact', mn: 'Түүхэн саатлын нөлөө' },
  'chart.series.annualCost': { en: 'Annual cost', mn: 'Жилийн зардал' },
  'chart.tooltip.operator': { en: 'Operator {operator}', mn: '{operator} оператор' },
  'chart.tooltip.route': { en: 'Route {route}', mn: '{route} чиглэл' },
  'uxreg.paxInsight': {
    en: 'Route {route} has the highest current load at {load}% (overcrowding threshold {threshold}%). Operational reading: {action}.',
    mn: '{route} чиглэл одоогоор хамгийн өндөр {load}% ачаалалтай (хэт ачааллын босго {threshold}%). Үйл ажиллагааны дүгнэлт: {action}.',
  },
  'uxreg.operatorInsight': {
    en: 'Operator {operator} currently has the lowest measured on-time result at {pct}% with {interruptions} service interruptions. Review its routes and active alerts first.',
    mn: '{operator} оператор одоогоор хамгийн бага хэмжигдсэн цаг баримтлалттай ({pct}%), үйлчилгээний тасалдал {interruptions}. Эхлээд тус операторын чиглэл болон идэвхтэй сэрэмжлүүлгийг шалгана уу.',
  },
  'uxreg.year': { en: 'year', mn: 'жил' },
  'uxreg.roiInsight': {
    en: 'Scenario reading: {driver} is the largest annual value driver ({annual}). On the selected assumptions, net value is {net} and payback is {payback} months.',
    mn: 'Сценарийн дүгнэлт: {driver} нь жилийн хамгийн том үнэ цэнийн хүчин зүйл ({annual}). Сонгосон таамаглалаар цэвэр үнэ цэнэ {net}, нөхөгдөх хугацаа {payback} сар.',
  },
  'uxreg.roiInsightEmpty': { en: 'No annual value drivers are available for the selected assumptions.', mn: 'Сонгосон таамаглалд жилийн үнэ цэнийн хүчин зүйл алга.' },
} satisfies Record<string, Entry>;
