/**
 * A stage transition is idempotent per click.
 *
 * The Advance button is large and the stage it moves to is only visible on the next
 * paint, so a double click used to walk two stages forward and write two audit rows -
 * an operator "skipping" a stage they never saw. advance() drops the repeat.
 */

import { describe, expect, it, beforeAll } from 'vitest';

// The store reads `location.search` at module load (seed / start-time overrides).
(globalThis as unknown as { location: { search: string; hash: string } }).location ??= {
  search: '',
  hash: '',
};

const { useEvents, useSettings } = await import('./index');

let id = '';

describe('advance() double-click protection', () => {
  beforeAll(() => {
    // supervisor holds advance_stage; the store guards on the permission, not the widget.
    useSettings.setState({ role: 'supervisor' });
    id = useEvents.getState().createManual({
      event_type: 'other_system_failure',
      category: 'equipment',
      severity_level: 3,
      description: 'double-click probe',
      detection_source: 'test',
      by: 'tester',
    }).event_id;
  });

  it('advances once and refuses the immediate repeat', () => {
    const before = useEvents.getState().events.find((e) => e.event_id === id)!.stage;
    const first = useEvents.getState().advance(id, 'tester');
    expect(first.ok).toBe(true);
    const after = useEvents.getState().events.find((e) => e.event_id === id)!.stage;
    expect(after).not.toBe(before);

    const second = useEvents.getState().advance(id, 'tester');
    expect(second.ok).toBe(false);
    expect(second.ok === false && second.debounced).toBe(true);
    // the stage the double click would have skipped is still the current one
    expect(useEvents.getState().events.find((e) => e.event_id === id)!.stage).toBe(after);
  });

  it('writes exactly one audit row for the double click', () => {
    const rows = useEvents.getState().audit.filter((a) => a.target === id && a.action.startsWith('advance:'));
    expect(rows).toHaveLength(1);
  });

  it('does not block a different event', () => {
    const other = useEvents.getState().createManual({
      event_type: 'other_system_failure',
      category: 'equipment',
      severity_level: 3,
      description: 'second event',
      detection_source: 'test',
      by: 'tester',
    }).event_id;
    expect(useEvents.getState().advance(other, 'tester').ok).toBe(true);
  });
});
