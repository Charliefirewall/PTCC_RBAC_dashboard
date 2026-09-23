/** UX pass (Sept 2026) strings. Ours, not the deck's: `r` unset, on the native-review list. */
import type { Entry } from './dict';

export const uxccDict = {
  // Command Centre "Next hour" strip: the legend that says what each chip's number is.
  'uxcc.nextHourLegend': { en: 'delayed routes · top SOP level', mn: 'хоцрох чиглэл · журмын дээд түвшин' },
  'uxcc.forecastExpected': { en: 'Expected {min} min · {chance}% chance', mn: 'Хүлээгдэж буй {min} мин · {chance}% магадлал' },
  'uxcc.forecastImpact': { en: '{pax} passengers · confidence {confidence}%', mn: '{pax} зорчигч · итгэлцэл {confidence}%' },
  'uxcc.forecastReview': { en: 'Review forecast and recommended action', mn: 'Таамаглал, санал болгосон арга хэмжээг харах' },
  'uxcc.brief.title': { en: 'Operational brief', mn: 'Үйл ажиллагааны товч' },
  'uxcc.brief.now': { en: 'Now', mn: 'Одоо' },
  'uxcc.brief.nowValue': { en: '{critical} critical alerts across {routes} routes', mn: '{routes} чиглэлд {critical} ноцтой сэрэмжлүүлэг' },
  'uxcc.brief.next': { en: 'Next hour', mn: 'Дараагийн цаг' },
  'uxcc.brief.nextValue': { en: '{routes} route forecasts above the configured threshold', mn: 'Тохируулсан босгоос дээш {routes} чиглэлийн таамаг' },
  'uxcc.brief.action': { en: 'Operator focus', mn: 'Операторын анхаарал' },
  'uxcc.brief.actionCritical': { en: 'Review escalation evidence and priority alerts', mn: 'Шатлан мэдэгдэх нотолгоо, тэргүүлэх сэрэмжлүүлгийг шалгах' },
  'uxcc.brief.actionNormal': { en: 'Monitor forecast changes and agent recommendations', mn: 'Таамгийн өөрчлөлт, агентын зөвлөмжийг хянах' },
} satisfies Record<string, Entry>;
