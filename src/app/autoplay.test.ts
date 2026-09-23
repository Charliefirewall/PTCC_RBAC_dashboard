import { afterEach, describe, expect, it, vi } from 'vitest';

(globalThis as unknown as { location: { search: string; hash: string } }).location ??= { search: '', hash: '' };

const { useRunner, AUTOPLAY_MS } = await import('./hotkeys');

describe('presenter auto-play (E15)', () => {
  afterEach(() => {
    useRunner.getState().stop();
    vi.useRealTimers();
  });

  it('steps D10 through every level on its own, then stops advancing', () => {
    vi.useFakeTimers();
    useRunner.getState().start('D10', true);
    expect(useRunner.getState().step).toBe(0);
    expect(useRunner.getState().autoplay).toBe(true);
    vi.advanceTimersByTime(AUTOPLAY_MS);
    expect(useRunner.getState().step).toBe(1);
    vi.advanceTimersByTime(AUTOPLAY_MS);
    expect(useRunner.getState().step).toBe(2);
    vi.advanceTimersByTime(AUTOPLAY_MS * 3);
    expect(useRunner.getState().step).toBe(2);
    expect(useRunner.getState().autoplay).toBe(false);
  });

  it('pausing auto-play leaves the scenario where it is', () => {
    vi.useFakeTimers();
    useRunner.getState().start('D10', true);
    useRunner.getState().pauseAuto();
    vi.advanceTimersByTime(AUTOPLAY_MS * 2);
    expect(useRunner.getState().step).toBe(0);
    expect(useRunner.getState().active).toBe('D10');
  });
});
