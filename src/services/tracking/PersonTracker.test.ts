import { describe, expect, it } from 'vitest';
import { PersonTracker } from './PersonTracker';
import type { PersonDetection } from '../../types';

const OPTS = {
  iouThreshold: 0.3,
  confirmFrames: 3,
  lostGraceMs: 2000,
  expiryMs: 8000,
  bboxSmoothing: 1,
};

function det(x: number, y: number, w = 0.2, h = 0.4, score = 0.9): PersonDetection {
  return { bbox: { x, y, width: w, height: h }, score };
}

describe('PersonTracker', () => {
  it('creates tentative tracks and confirms them after confirmFrames hits', () => {
    const tracker = new PersonTracker(OPTS);
    const r1 = tracker.update([det(0.1, 0.1)], 1000);
    expect(r1.tracks).toHaveLength(1);
    expect(r1.tracks[0]!.status).toBe('TENTATIVE');
    const r2 = tracker.update([det(0.1, 0.1)], 1100);
    expect(r2.confirmedNow).toHaveLength(0);
    const r3 = tracker.update([det(0.1, 0.1)], 1200);
    expect(r3.tracks[0]!.status).toBe('CONFIRMED');
    expect(r3.confirmedNow).toHaveLength(1);
  });

  it('reuses the same track id across frames via IoU matching', () => {
    const tracker = new PersonTracker(OPTS);
    const r1 = tracker.update([det(0.1, 0.1)], 1000);
    const id1 = r1.tracks[0]!.trackId;
    const r2 = tracker.update([det(0.12, 0.12)], 1200);
    expect(r2.tracks.map((t) => t.trackId)).toEqual([id1]);
    expect(r2.tracks).toHaveLength(1);
  });

  it('spawns separate tracks for non-overlapping persons', () => {
    const tracker = new PersonTracker(OPTS);
    tracker.update([det(0.1, 0.1)], 1000);
    const result = tracker.update([det(0.1, 0.1), det(0.7, 0.1)], 1200);
    expect(result.tracks).toHaveLength(2);
    expect(new Set(result.tracks.map((t) => t.trackId)).size).toBe(2);
  });

  it('marks tracks LOST after the grace window and expires after expiryMs', () => {
    const tracker = new PersonTracker(OPTS);
    tracker.update([det(0.1, 0.1)], 1000);
    tracker.update([det(0.1, 0.1)], 1100);
    tracker.update([det(0.1, 0.1)], 1200); // confirmed, lastSeen = 1200
    const rLost = tracker.update([], 3500); // 2300ms > lostGraceMs
    expect(rLost.tracks[0]!.status).toBe('LOST');
    const rExpired = tracker.update([], 9500); // 8300ms > expiryMs
    expect(rExpired.tracks).toHaveLength(0);
    expect(rExpired.expired).toHaveLength(1);
    expect(rExpired.expired[0]!.trackId).toBe(rLost.tracks[0]!.trackId);
  });

  it('re-associates a reappearing person within expiry, keeping the id', () => {
    const tracker = new PersonTracker(OPTS);
    tracker.update([det(0.1, 0.1)], 1000);
    tracker.update([det(0.1, 0.1)], 1100);
    const r3 = tracker.update([det(0.1, 0.1)], 1200);
    const id = r3.tracks[0]!.trackId;
    tracker.update([], 2000); // short occlusion, within grace
    const r5 = tracker.update([det(0.1, 0.1)], 3000);
    expect(r5.tracks.map((t) => t.trackId)).toEqual([id]);
    expect(r5.tracks[0]!.status).toBe('CONFIRMED');
    expect(r5.expired).toHaveLength(0);
  });

  it('never reuses ids for genuinely new persons after expiry', () => {
    const tracker = new PersonTracker(OPTS);
    const r1 = tracker.update([det(0.1, 0.1)], 1000);
    const id1 = r1.tracks[0]!.trackId;
    const rExpired = tracker.update([], 20000);
    expect(rExpired.expired[0]!.trackId).toBe(id1);
    const r2 = tracker.update([det(0.1, 0.1)], 21000);
    expect(r2.tracks).toHaveLength(1);
    expect(r2.tracks[0]!.trackId).not.toBe(id1);
  });

  it('smooths bounding boxes with EMA when bboxSmoothing < 1', () => {
    const tracker = new PersonTracker({ ...OPTS, bboxSmoothing: 0.5 });
    tracker.update([det(0.1, 0.1)], 1000);
    const result = tracker.update([det(0.2, 0.1)], 1100);
    // 0.1 * 0.5 + 0.2 * 0.5 — the two boxes overlap enough to match (IoU ≈ 0.33).
    expect(result.tracks[0]!.bbox.x).toBeCloseTo(0.15);
  });

  it('ignores detections below the IoU threshold for matching', () => {
    const tracker = new PersonTracker({ ...OPTS, iouThreshold: 0.6 });
    const r1 = tracker.update([det(0.1, 0.1)], 1000);
    const id1 = r1.tracks[0]!.trackId;
    // Far move → IoU 0 → no match: the old track survives unmatched (within
    // grace) while the detection spawns a *different* track.
    const r2 = tracker.update([det(0.4, 0.1)], 1100);
    expect(r2.tracks).toHaveLength(2);
    const moved = r2.tracks.find((t) => t.bbox.x === 0.4);
    expect(moved).toBeDefined();
    expect(moved!.trackId).not.toBe(id1);
    const stale = r2.tracks.find((t) => t.trackId === id1);
    expect(stale!.bbox.x).toBeCloseTo(0.1); // bbox not updated → no match happened
    expect(stale!.misses).toBe(1);
  });
});
