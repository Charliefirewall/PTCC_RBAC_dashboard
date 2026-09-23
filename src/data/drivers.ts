/**
 * Driver details for the drill-down. ASSUMPTION: the source gives a driver id and a
 * driver status on the bus (S5) and nothing more - no roster, no names. These are
 * deterministic placeholders so the panel is populated, and the UI grades them so.
 */

import { mulberry32 } from '../sim/rng';
import type { OperatorId } from '../sim/types';

export interface Driver {
  driver_id: string;
  name_en: string;
  name_mn: string;
  operator_id: OperatorId;
  shift: 'AM' | 'PM';
  radio: string;
  years: number;
}

const NAMES: [string, string][] = [
  ['Bat-Erdene', 'Бат-Эрдэнэ'], ['Ganbold', 'Ганболд'], ['Enkhbayar', 'Энхбаяр'], ['Tömörbaatar', 'Төмөрбаатар'],
  ['Otgonbayar', 'Отгонбаяр'], ['Sükhbat', 'Сүхбат'], ['Munkh-Ochir', 'Мөнх-Очир'], ['Batbayar', 'Батбаяр'],
  ['Altangerel', 'Алтангэрэл'], ['Erdenebat', 'Эрдэнэбат'], ['Ganzorig', 'Ганзориг'], ['Dorjsüren', 'Доржсүрэн'],
  ['Byambaa', 'Бямбаа'], ['Naranbaatar', 'Наранбаатар'], ['Purevdorj', 'Пүрэвдорж'], ['Tsogtbaatar', 'Цогтбаатар'],
  ['Oyunbileg', 'Оюунбилэг'], ['Nyamdorj', 'Нямдорж'], ['Batjargal', 'Батжаргал'], ['Chinbat', 'Чинбат'],
  ['Khurelbaatar', 'Хүрэлбаатар'], ['Sanjaa', 'Санжаа'], ['Davaasüren', 'Даваасүрэн'], ['Gantulga', 'Гантулга'],
];

function fnv(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function driverOf(driver_id: string, operator_id: OperatorId): Driver {
  const r = mulberry32(fnv(driver_id));
  const [en, mn] = NAMES[Math.floor(r.next() * NAMES.length)]!;
  const initial = String.fromCharCode(65 + Math.floor(r.next() * 26));
  return {
    driver_id,
    name_en: `${initial}. ${en}`,
    name_mn: `${initial}. ${mn}`,
    operator_id,
    shift: r.next() < 0.5 ? 'AM' : 'PM',
    radio: `CH-${operator_id}${10 + Math.floor(r.next() * 80)}`,
    years: 1 + Math.floor(r.next() * 20),
  };
}
