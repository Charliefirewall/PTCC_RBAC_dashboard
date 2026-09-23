/** UX pass (Sept 2026) strings. Ours, not the deck's: `r` unset, on the native-review list. */
import type { Entry } from './dict';

export const uxvehDict = {
  'uxveh.axisStop': { en: 'Stop (travel order)', mn: 'Буудал (явах дарааллаар)' },
  'uxveh.axisDev': { en: 'Deviation (min)', mn: 'Зөрүү (мин)' },
  'uxveh.now': { en: 'Now', mn: 'Одоо' },
  'uxveh.routeAlert': { en: 'Route {route} alert, opened from the feed', mn: '{route} чиглэлийн сэрэмжлүүлэг, сэрэмжлүүлгийн жагсаалтаас нээсэн' },
  'uxveh.loadSummary': { en: 'Current {current}% · recorded trip peak {peak}%', mn: 'Одоо {current}% · бүртгэгдсэн рейсийн оргил {peak}%' },
  'uxveh.minimapLabel': { en: 'Route {route}, {from} to {to}; vehicle {bus} current position', mn: '{route} чиглэл, {from}-с {to}; {bus} автобусны одоогийн байршил' },
  'uxveh.actualAlert': { en: 'Actual alert', mn: 'Бодит сэрэмжлүүлэг' },
  'uxveh.openedFromAlert': { en: 'Opened from alert {id}; live vehicle context is retained.', mn: '{id} сэрэмжлүүлгээс нээсэн; тээврийн хэрэгслийн шууд нөхцөлийг хадгалав.' },
  'uxveh.openedFromForecast': { en: 'Opened from the +{horizon} min forecast ({chance}% chance); current telemetry is shown beside prediction context.', mn: '+{horizon} минутын таамаглалаас ({chance}% магадлал) нээсэн; одоогийн телеметрийг таамаглалын нөхцөлтэй хамт харуулж байна.' },
  'uxveh.returnSource': { en: 'Return to source', mn: 'Эх сурвалж руу буцах' },
  'uxveh.forecastNotActual': { en: 'Prediction only — this is not an actual vehicle alert.', mn: 'Зөвхөн таамаглал — энэ бол тээврийн хэрэгслийн бодит сэрэмжлүүлэг биш.' },
  'uxveh.reviewPreparation': { en: 'Review forecast preparation', mn: 'Таамаглалын бэлтгэлийг хянах' },
  'uxveh.forecastResponseNote': { en: 'Monitor or prepare only; no SOP action is executed from a forecast.', mn: 'Зөвхөн хянах эсвэл бэлтгэх; таамаглалаас журмын арга хэмжээ гүйцэтгэхгүй.' },
} satisfies Record<string, Entry>;
