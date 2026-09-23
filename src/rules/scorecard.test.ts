import { describe, expect, it } from 'vitest';
import { emptyScorecard, recordForecasts, scoreDue } from './scorecard';

const fc = (route_id: string, h: number, level: 1 | 2 | 3, probability = 0.8) => ({ route_id, horizon_min: h, level, probability });

describe('forecast-vs-actual scorecard (E7)', () => {
  it('checks each forecast when its time arrives: reached the level, lower, or nothing', () => {
    let s = emptyScorecard();
    s = recordForecasts(s, [fc('R7', 15, 2), fc('R5', 15, 2), fc('R3', 15, 1)], 1000);
    // not due yet: nothing scored
    s = scoreDue(s, 1000 + 15 * 60 - 1, new Map([['R7', 2]]));
    expect(s.resolved).toHaveLength(0);

    s = scoreDue(s, 1000 + 15 * 60, new Map<string, number>([['R7', 3], ['R5', 1]]));
    const by = Object.fromEntries(s.resolved.map((r) => [r.route_id, r.outcome]));
    expect(by).toEqual({ R7: 'hit', R5: 'lower', R3: 'miss' });
    expect(s.pending).toHaveLength(0);
    expect(s.stats[15]).toEqual({ n: 3, hits: 1 });
  });

  it('keeps one pending forecast per route and horizon (no double counting)', () => {
    let s = emptyScorecard();
    s = recordForecasts(s, [fc('R7', 30, 2)], 1000);
    s = recordForecasts(s, [fc('R7', 30, 3)], 1030);
    expect(s.pending).toHaveLength(1);
    expect(s.pending[0]!.level).toBe(2);
  });

  it('keeps the resolved list bounded', () => {
    let s = emptyScorecard();
    for (let i = 0; i < 300; i++) {
      s = recordForecasts(s, [fc(`R${i}`, 15, 1)], i);
      s = scoreDue(s, i + 900, new Map());
    }
    expect(s.resolved.length).toBeLessThanOrEqual(100);
    expect(s.stats[15]!.n).toBe(300);
  });
});
