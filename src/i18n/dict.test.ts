import { describe, expect, it } from 'vitest';
import { agenticDict } from './dict.agentic';
import { copilotDict } from './dict.copilot';
import { dashDict } from './dict.dash';
import { depotDict } from './dict.depot';
import { kitDict } from './dict.kit';
import { mapDict } from './dict.map';
import { modulesDict } from './dict.modules';
import { overlayDict } from './dict.overlay';
import { predictDict } from './dict.predict';
import { roiDict } from './dict.roi';
import { rolesDict } from './dict.roles';
import { sopDict } from './dict.sop';
import { dict } from './dict';
import { t } from './t';
import type { I18nKey } from './dict';

/*
 * The dictionary is assembled from 11 area files by spread-merge. dict.ts claims a
 * duplicate key would be "a compile error below" - it would not: a spread merge is
 * silent and last-wins. Eleven files written by parallel workstreams got away with it
 * by luck. A silently shadowed key is the worst kind of i18n bug, because the wrong
 * string renders correctly in one language and nobody looks again.
 */
const AREAS: [string, Record<string, unknown>][] = [
  ['agentic', agenticDict], ['roles', rolesDict], ['map', mapDict], ['modules', modulesDict],
  ['overlay', overlayDict], ['dash', dashDict], ['copilot', copilotDict], ['kit', kitDict],
  ['roi', roiDict], ['predict', predictDict], ['depot', depotDict], ['sop', sopDict],
];

describe('dictionary integrity', () => {
  it('has no key defined in two area files', () => {
    const owner = new Map<string, string>();
    const clashes: string[] = [];
    for (const [area, d] of AREAS) {
      for (const k of Object.keys(d)) {
        const prev = owner.get(k);
        if (prev) clashes.push(`"${k}" in both ${prev} and ${area}`);
        else owner.set(k, area);
      }
    }
    expect(clashes, clashes.join('; ')).toEqual([]);
  });

  it('gives every key both languages', () => {
    // A deliberately blank entry is allowed (e.g. a "no unit suffix" marker) but it must
    // be blank in BOTH languages. One side filled and the other empty is the real bug:
    // it renders correctly in English and silently drops the word in Mongolian.
    const bad = Object.entries(dict)
      .filter(([, v]) => !v || typeof v.en !== 'string' || typeof v.mn !== 'string' || !v.en.trim() !== !v.mn.trim())
      .map(([k, v]) => `${k} (en:${JSON.stringify(v?.en)} mn:${JSON.stringify(v?.mn)})`);
    expect(bad, `asymmetric or missing en/mn: ${bad.slice(0, 10).join(', ')}`).toEqual([]);
  });

  it('uses the same interpolation placeholders in both languages', () => {
    const ph = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
    const bad = Object.entries(dict)
      .filter(([, v]) => ph(v.en) !== ph(v.mn))
      .map(([k, v]) => `${k}: en(${ph(v.en)}) vs mn(${ph(v.mn)})`);
    expect(bad, bad.slice(0, 8).join(' | ')).toEqual([]);
  });
});

describe('t() is survivable', () => {
  it('degrades an unknown key instead of throwing', () => {
    // Keys are built by template in several places (`ag.act.${stage}`, popup fields), and
    // overlay bodies render outside the route error boundary - a throw here blanked the app.
    expect(() => t('definitely.not.a.key' as never, 'en')).not.toThrow();
    expect(t('definitely.not.a.key' as never, 'en')).toBe('definitely.not.a.key');
  });

  it('renders a dash for a missing or non-finite parameter', () => {
    const entries = Object.entries(dict) as [I18nKey, { en: string; mn: string }][];
    const [key, entry] = entries.find(([, v]) => /\{\w+\}/.test(v.en))!;
    const name = /\{(\w+)\}/.exec(entry.en)![1]!;
    for (const bad of [undefined, null, NaN, Infinity]) {
      const out = t(key, 'en', { [name]: bad } as never);
      expect(out, `param ${String(bad)} leaked`).not.toMatch(/undefined|NaN|Infinity/);
    }
  });
});
