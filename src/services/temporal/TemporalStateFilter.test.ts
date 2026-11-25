import { describe, expect, it } from 'vitest';
import { TemporalStateFilter } from './TemporalStateFilter';

const OPTS = { dwellMs: 1500, awayMs: 10000 };

describe('TemporalStateFilter', () => {
  it('holds the initial state until the new state has been observed for dwellMs', () => {
    const filter = new TemporalStateFilter<'A' | 'B'>('A', OPTS);
    expect(filter.observe('B', 0)).toBe('A');
    expect(filter.observe('B', 1000)).toBe('A');
    expect(filter.observe('B', 1600)).toBe('B');
  });

  it('does not switch on alternating noise (anti-flicker)', () => {
    const filter = new TemporalStateFilter<'A' | 'B'>('A', OPTS);
    let t = 0;
    for (let i = 0; i < 50; i += 1) {
      t += 200;
      filter.observe(i % 2 === 0 ? 'B' : 'A', t);
    }
    expect(filter.value).toBe('A');
  });

  it('resets candidacy when a different state intervenes', () => {
    const filter = new TemporalStateFilter<'A' | 'B' | 'C'>('A', OPTS);
    filter.observe('B', 0);
    filter.observe('B', 1000); // 1s toward dwell
    filter.observe('A', 1100); // interruption resets the candidate
    filter.observe('B', 1200); // fresh candidacy
    expect(filter.observe('B', 2600)).toBe('A'); // only 1.4s accumulated
    expect(filter.observe('B', 2800)).toBe('B'); // 1.6s continuous → switch
  });

  it('holds the last displayed state while observations are missing (occlusion)', () => {
    const filter = new TemporalStateFilter<'A' | 'B' | 'UNKNOWN'>('A', OPTS, 'UNKNOWN');
    filter.observe('B', 0);
    filter.observe('B', 1600);
    expect(filter.value).toBe('B');
    expect(filter.missing(5000)).toBe('B');
  });

  it('falls back to UNKNOWN after awayMs without observations', () => {
    const filter = new TemporalStateFilter<'A' | 'B' | 'UNKNOWN'>('A', OPTS, 'UNKNOWN');
    filter.observe('B', 0);
    filter.observe('B', 1600);
    expect(filter.missing(11600)).toBe('B'); // exactly awayMs → not yet
    expect(filter.missing(11700)).toBe('UNKNOWN');
  });

  it('keeps the last state when no UNKNOWN value is configured (occupancy)', () => {
    const filter = new TemporalStateFilter<'IN_ZONE' | 'OUT_ZONE'>('IN_ZONE', OPTS);
    filter.observe('OUT_ZONE', 0);
    filter.observe('OUT_ZONE', 1600);
    expect(filter.missing(100000)).toBe('OUT_ZONE');
  });

  it('applies live threshold changes', () => {
    const filter = new TemporalStateFilter<'A' | 'B'>('A', OPTS);
    filter.configure({ dwellMs: 100, awayMs: 1000 });
    filter.observe('B', 0);
    expect(filter.observe('B', 150)).toBe('B');
  });
});
