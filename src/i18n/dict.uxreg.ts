/** UX pass (Sept 2026) strings. Ours, not the deck's: `r` unset, on the native-review list. */
import type { Entry } from './dict';

export const uxregDict = {
  // --- Regularity: headway analysis chart
  'uxreg.hw.sub': {
    en: 'Live largest gap between buses on {route} vs. planned {planned} min; over {gap} min = service gap.',
    mn: '{route} чиглэлийн автобусуудын хоорондох хамгийн том завсар (шууд), төлөвлөсөн {planned} мин; {gap} минутаас их = үйлчилгээний завсар.',
  },
  'uxreg.axis.time': { en: 'Time (sim, HH:MM:SS)', mn: 'Цаг (симуляц, ЦЦ:ММ:СС)' },
  'uxreg.hw.plannedMark': { en: 'Planned {min} min', mn: 'Төлөвлөсөн {min} мин' },
  'uxreg.hw.gapMark': { en: 'Service-gap threshold {min} min', mn: 'Үйлчилгээний завсрын босго {min} мин' },
  'uxreg.hw.diff': { en: 'Difference', mn: 'Зөрүү' },
  // --- Analytics: service reliability impact
  'uxreg.imp.yAxis': { en: 'Largest headway gap (min)', mn: 'Хамгийн том завсар (мин)' },
  'uxreg.imp.before': { en: 'Before', mn: 'Өмнө' },
  'uxreg.imp.during': { en: 'During event', mn: 'Үйл явдлын үед' },
  'uxreg.imp.after': { en: 'After', mn: 'Дараа' },
  'uxreg.imp.threshold': { en: 'Gap threshold {min} min', mn: 'Завсрын босго {min} мин' },
  'uxreg.imp.series': { en: 'Largest gap', mn: 'Хамгийн том завсар' },
  'uxreg.imp.mean': { en: 'Mean gap {phase}', mn: 'Дундаж завсар — {phase}' },
  'uxreg.imp.peak': { en: 'Peak gap', mn: 'Оргил завсар' },
  'uxreg.imp.peakAt': { en: 'at {at}', mn: '{at}-д' },
  'uxreg.imp.change': { en: 'During vs before', mn: 'Үед / өмнө' },
  'uxreg.imp.recovery': { en: 'Recovery', mn: 'Сэргэлт' },
  'uxreg.imp.recAfter': { en: '{min} min after', mn: '{min} минутын дараа' },
  'uxreg.imp.recNotYet': { en: 'Not yet', mn: 'Хараахан үгүй' },
  'uxreg.imp.recOpen': { en: 'Event ongoing', mn: 'Үйл явдал үргэлжилж байна' },
  'uxreg.imp.noBase': { en: 'No baseline', mn: 'Суурь өгөгдөлгүй' },
  'uxreg.imp.sumRose': {
    en: 'Gap rose {x}× during the event ({before} → {during} min)',
    mn: 'Үйл явдлын үед завсар {x}× өссөн ({before} → {during} мин)',
  },
  'uxreg.imp.sumFell': {
    en: 'Gap fell to {x}× of its pre-event level ({before} → {during} min)',
    mn: 'Завсар үйл явдлын өмнөх түвшний {x}× болж буурсан ({before} → {during} мин)',
  },
  'uxreg.imp.sumPeak': {
    en: 'Peak gap {peak} min at {at}',
    mn: 'Оргил завсар {peak} мин, {at}',
  },
  'uxreg.imp.sumBack': {
    en: 'back under {thr} min {min} min after the event window',
    mn: 'үйл явдлын цонхноос {min} минутын дараа {thr} минутаас доош буцсан',
  },
  'uxreg.imp.sumNot': {
    en: 'has not yet recovered below {thr} min',
    mn: '{thr} минутаас доош хараахан сэргээгүй',
  },
  'uxreg.imp.sumOpen': { en: 'the event is still in progress', mn: 'үйл явдал үргэлжилж байна' },
  'uxreg.imp.approx': {
    en: 'Event window approximated (middle third of the record): the event began before the recorded headway history.',
    mn: 'Үйл явдлын цонхыг ойролцоогоор (бичлэгийн дунд гуравны нэг) авсан: үйл явдал давтамжийн бичлэгээс өмнө эхэлсэн.',
  },
} satisfies Record<string, Entry>;
