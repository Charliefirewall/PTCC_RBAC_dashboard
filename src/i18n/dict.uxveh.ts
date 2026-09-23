/** UX pass (Sept 2026) strings. Ours, not the deck's: `r` unset, on the native-review list. */
import type { Entry } from './dict';

export const uxvehDict = {
  'uxveh.axisStop': { en: 'Stop (travel order)', mn: 'Буудал (явах дарааллаар)' },
  'uxveh.axisDev': { en: 'Deviation (min)', mn: 'Хазайлт (мин)' },
  'uxveh.now': { en: 'Now', mn: 'Одоо' },
  'uxveh.routeAlert': { en: 'Route {route} alert, opened from the feed', mn: '{route} чиглэлийн сэрэмжлүүлэг, жагсаалтаас нээсэн' },
} satisfies Record<string, Entry>;
