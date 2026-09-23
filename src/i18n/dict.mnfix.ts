/** Mongolian-completeness pass (Sept 2026): units and labels that were hard-coded English. Ours: `r` unset. */
import type { Entry } from './dict';

export const mnfixDict = {
  // ---- units appended to numbers outside a sentence ("31.4 min")
  'unit.min': { en: 'min', mn: 'мин' },
  'unit.s': { en: 's', mn: 'сек' },
  'unit.km': { en: 'km', mn: 'км' },
  'unit.kmh': { en: 'km/h', mn: 'км/ц' },
  /** alert age on the worklist row ("5m") */
  'unit.ageMin': { en: '{n}m', mn: '{n} мин' },
  // ---- shell
  'app.loading': { en: 'Loading…', mn: 'Ачааллаж байна…' },
  // ---- Operators: fare assumption
  'op.farePerBoarding': { en: '{fare} ₮ / boarding', mn: '{fare} ₮ / суулт' },
  'trip.shiftAm': { en: 'AM', mn: 'өглөөний' },
  'trip.shiftPm': { en: 'PM', mn: 'оройн' },
} satisfies Record<string, Entry>;
