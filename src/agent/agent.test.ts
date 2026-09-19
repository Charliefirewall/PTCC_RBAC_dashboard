/**
 * The agent's contract, tested.
 *
 * The interesting assertions are the last two: every number in an answer's prose
 * must also be in `facts` (nothing is invented in the wording), and no reply object
 * may contain a function-valued field anywhere - the Tier-5 guard. The agent
 * proposes; the operator disposes (L1235, L718).
 */

import { describe, expect, it, beforeAll } from 'vitest';

// The store reads `location.search` at module load (seed / start-time overrides).
// Vitest runs in the `node` environment here, so stub it before importing.
(globalThis as unknown as { location: { search: string; hash: string } }).location ??= {
  search: '',
  hash: '',
};

const { routeIntent, answer, answerWith, snapshot, SUGGESTED } = await import('./index');
const { engine, useSim, reevaluate } = await import('../store');

describe('intent router - English', () => {
  const cases: [string, string][] = [
    ['Which buses require immediate attention?', 'look_first'],
    ['what should I look at first', 'look_first'],
    ['Why is R7 late?', 'why_delayed'],
    ['why is route 12 delayed', 'why_delayed'],
    ['Where is bus 3-015?', 'where_bus'],
    ['Which routes are overcrowded?', 'overcrowded'],
    ['show me open events', 'open_events'],
    ['Anything wrong with the equipment?', 'device_health'],
    ['compare operators on-time performance', 'operator_compare'],
    ['what response is required', 'recommend_actions'],
    ['give me the shift handover brief', 'shift_brief'],
    ['what is the service gap threshold', 'threshold_lookup'],
  ];
  for (const [text, name] of cases) {
    it(`${text} -> ${name}`, () => {
      expect(routeIntent(text).name).toBe(name);
    });
  }
});

describe('intent router - Mongolian', () => {
  it('routes the deck\'s own "why" phrasing', () => {
    expect(routeIntent('R7 яагаад хоцорч байна вэ?').name).toBe('why_delayed');
  });
  it('routes the deck\'s own "overcrowded" phrasing', () => {
    expect(routeIntent('Аль чиглэл хэт ачаалалтай вэ?').name).toBe('overcrowded');
  });
  it('routes the equipment phrasing', () => {
    expect(routeIntent('Тоног төхөөрөмжид асуудал байна уу?').name).toBe('device_health');
  });
});

describe('slot extraction', () => {
  it('pulls the route id out of "why is R7 late"', () => {
    const i = routeIntent('why is R7 late');
    expect(i.name).toBe('why_delayed');
    expect(i.slots.route_id).toBe('R7');
  });
  it('pulls a bus id', () => {
    expect(routeIntent('where is bus #3-015').slots.vehicle_id).toBe('3-015');
  });
  it('pulls an operator id', () => {
    expect(routeIntent('how is operator B doing').slots.operator_id).toBe('B');
  });
});

describe('unknown', () => {
  it('gibberish routes to unknown and still answers', () => {
    const i = routeIntent('qwertyuiop zxcv');
    expect(i.name).toBe('unknown');
    expect(() => answer(i)).not.toThrow();
    expect(answer(i).text.length).toBeGreaterThan(0);
  });
});

describe('answers', () => {
  it('never throws on the cold, un-ticked state', () => {
    for (const name of [
      'look_first', 'why_delayed', 'where_bus', 'overcrowded', 'open_events', 'device_health',
      'operator_compare', 'recommend_actions', 'shift_brief', 'threshold_lookup', 'unknown',
    ] as const) {
      expect(() => answer({ name, slots: {}, via: 'pattern' })).not.toThrow();
    }
  });

  it('every suggested question resolves', () => {
    for (const q of SUGGESTED) {
      const r = answer({ name: q.intent, slots: {}, via: 'canned' });
      expect(r.provenance).toBe('canned');
      expect(r.text.length).toBeGreaterThan(0);
    }
  });
});

// --------------------------------------------------------------- live-state tests

const NUM = /\d+(?:[.,]\d+)?/g;
function numbers(s: string): string[] {
  return (s.match(NUM) ?? []).map((x) => x.replace(/,/g, ''));
}

describe('with a warmed-up simulation', () => {
  beforeAll(() => {
    for (let i = 0; i < 120; i++) engine.tick();
    useSim.setState({ snap: engine.snapshot(), tick: 1 });
    reevaluate();
  });

  it('produces alerts to talk about', () => {
    expect(snapshot().alerts.length).toBeGreaterThan(0);
  });

  it('every numeric token in the prose also appears in the facts', () => {
    const s = snapshot();
    for (const name of [
      'look_first', 'why_delayed', 'where_bus', 'overcrowded', 'open_events', 'device_health',
      'operator_compare', 'recommend_actions', 'shift_brief', 'threshold_lookup', 'unknown',
    ] as const) {
      const slots = name === 'where_bus' ? { vehicle_id: '3-015' } : {};
      const r = answerWith({ name, slots, via: 'pattern' }, s);
      const inFacts = new Set(r.facts.flatMap((f) => numbers(String(f.v))));
      for (const tok of numbers(r.text)) {
        expect(inFacts.has(tok), `${name}: "${tok}" is in the text but not in facts: ${r.text}`).toBe(true);
      }
    }
  });

  it('no reply carries a function-valued field - Tier 5 is not representable', () => {
    const s = snapshot();
    for (const name of [
      'look_first', 'why_delayed', 'where_bus', 'overcrowded', 'open_events', 'device_health',
      'operator_compare', 'recommend_actions', 'shift_brief', 'threshold_lookup', 'unknown',
    ] as const) {
      const r = answerWith({ name, slots: {}, via: 'pattern' }, s);
      const seen = new Set<unknown>();
      const walk = (v: unknown, path: string): void => {
        if (typeof v === 'function') throw new Error(`callable at ${path}`);
        if (v && typeof v === 'object') {
          if (seen.has(v)) return;
          seen.add(v);
          for (const [k, val] of Object.entries(v)) walk(val, `${path}.${k}`);
        }
      };
      expect(() => walk(r, name)).not.toThrow();
      for (const p of r.proposals) {
        expect(Object.keys(p).sort()).toEqual(['href', 'label']);
        expect(p.href.startsWith('#/')).toBe(true);
      }
    }
  });
});

/*
 * Mongolian slot extraction.
 *
 * `\b` is ASCII-only, so the original /\bчиглэл\s*(\d+)/ never matched: a Mongolian
 * question naming a route or bus extracted no slot, and the resolver then answered
 * about a substituted subject - confidently, with citations and a stated cause. Half
 * the audience reads Mongolian, so this was half the copilot silently wrong.
 */
describe('slot extraction is language-symmetric', () => {
  const cases: [string, string, string][] = [
    ['route', 'why is route 7 delayed?', 'чиглэл 7 яагаад хоцорч байна вэ?'],
    ['route short', 'R7 delayed?', 'R7 яагаад хоцорч байна вэ?'],
    ['bus', 'where is bus 3-015?', 'автобус 3-015 хаана байна вэ?'],
  ];

  for (const [what, en, mn] of cases) {
    it(`extracts the same ${what} slot from either language`, () => {
      const a = routeIntent(en).slots;
      const b = routeIntent(mn).slots;
      expect(a.route_id ?? a.vehicle_id, `EN "${en}" extracted nothing`).toBeTruthy();
      expect(b.route_id ?? b.vehicle_id, `MN "${mn}" extracted nothing`).toBe(a.route_id ?? a.vehicle_id);
    });
  }

  it('does not match a number embedded mid-word', () => {
    expect(routeIntent('car7 is fine').slots.route_id).toBeUndefined();
  });
});
