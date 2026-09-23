import { dict, type I18nKey } from './dict';
import type { Lang } from '../sim/types';
import { useSettings } from '../store';
import { localizeValue } from './codes';

export type { I18nKey };

export function t(key: I18nKey, lang: Lang, params?: Record<string, string | number>): string {
  const e = dict[key];
  // An unknown key used to throw a TypeError here. Every module, the map popups and the
  // activity feed build keys by template (`ag.act.${stage}`), so one unhandled stage
  // took the whole app down - and overlay bodies render outside the route boundary, so
  // there was nowhere for it to be caught. Degrade to the key: visible in DEV, survivable
  // in front of a client.
  if (!e) {
    if (import.meta.env.DEV) console.warn('[i18n] missing key:', key);
    return String(key);
  }
  let s: string = (lang === 'mn' ? e.mn : e.en) || e.en;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      // `undefined`, `null` and NaN/Infinity used to reach the screen as the literal
      // strings "undefined" / "NaN" / "Infinity". A dash is the honest rendering of a
      // value we do not have.
      const safe = v === null || v === undefined || (typeof v === 'number' && !Number.isFinite(v)) ? '—' : String(v);
      // codes, units and place names inside the sentence follow the language (i18n/codes.ts)
      const shown = typeof v === 'string' ? localizeValue(safe, lang) : safe;
      s = s.replaceAll(`{${k}}`, shown);
    }
  }
  return s;
}

export function useT() {
  const lang = useSettings((s) => s.lang);
  return (key: I18nKey, params?: Record<string, string | number>) => t(key, lang, params);
}

/** For raw data shown outside a sentence (a table cell, an actor name): same rules as t() params. */
export function useTx() {
  const lang = useSettings((s) => s.lang);
  return (v: string) => localizeValue(v, lang);
}

export function useLang(): Lang {
  return useSettings((s) => s.lang);
}

/** Both languages, for the video wall (the deck's tiles are stacked EN over MN). */
export function both(key: I18nKey, params?: Record<string, string | number>): { en: string; mn: string } {
  return { en: t(key, 'en', params), mn: t(key, 'mn', params) };
}

export function unreviewedKeys(): I18nKey[] {
  return (Object.keys(dict) as I18nKey[]).filter((k) => !dict[k].r);
}
