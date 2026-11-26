/**
 * Person tracker: converts per-frame detections into temporary tracks with
 * stable short-lived ids. Greedy IoU matching, confirmation after N hits,
 * an occlusion grace window and hard expiry. Track ids are NOT identities:
 * they are never equated with employees.
 */
import type { Id, NormalizedBBox, PersonDetection, TrackStatus } from '../../types';
import { iou } from '../../utils/geometry';
import { createId } from '../../utils/id';

export interface TrackerOptions {
  iouThreshold: number;
  confirmFrames: number;
  lostGraceMs: number;
  expiryMs: number;
  bboxSmoothing: number;
}

export interface TrackedPerson {
  trackId: Id;
  bbox: NormalizedBBox;
  score: number;
  hits: number;
  misses: number;
  firstSeen: number;
  lastSeen: number;
  status: TrackStatus;
}

export interface TrackerUpdateResult {
  /** All live tracks (TENTATIVE, CONFIRMED and LOST within expiry), in creation order. */
  tracks: TrackedPerson[];
  /** Tracks removed this update - their assignments must be invalidated. */
  expired: TrackedPerson[];
  /** Tracks that became CONFIRMED on this update. */
  confirmedNow: Id[];
}

export class PersonTracker {
  private readonly people = new Map<Id, TrackedPerson>();
  private order: Id[] = [];
  private opts: TrackerOptions;

  constructor(opts: TrackerOptions) {
    this.opts = opts;
  }

  configure(opts: TrackerOptions): void {
    this.opts = opts;
  }

  reset(): void {
    this.people.clear();
    this.order = [];
  }

  update(detections: PersonDetection[], now: number): TrackerUpdateResult {
    const opts = this.opts;
    const trackIds = [...this.people.keys()];

    // Greedy IoU matching, best overlap first.
    const pairs: Array<{ trackId: Id; detIdx: number; overlap: number }> = [];
    detections.forEach((det, detIdx) => {
      for (const trackId of trackIds) {
        const track = this.people.get(trackId);
        if (!track) continue;
        const overlap = iou(track.bbox, det.bbox);
        if (overlap >= opts.iouThreshold) {
          pairs.push({ trackId, detIdx, overlap });
        }
      }
    });
    pairs.sort((a, b) => b.overlap - a.overlap);

    const detUsed = new Set<number>();
    const matchedTracks = new Set<Id>();
    for (const pair of pairs) {
      if (detUsed.has(pair.detIdx) || matchedTracks.has(pair.trackId)) continue;
      const track = this.people.get(pair.trackId);
      const det = detections[pair.detIdx];
      if (!track || !det) continue;
      track.bbox = smoothBBox(track.bbox, det.bbox, opts.bboxSmoothing);
      track.score = det.score;
      track.hits += 1;
      track.misses = 0;
      track.lastSeen = now;
      detUsed.add(pair.detIdx);
      matchedTracks.add(pair.trackId);
    }

    // Unmatched detections spawn tentative tracks.
    detections.forEach((det, detIdx) => {
      if (detUsed.has(detIdx)) return;
      const trackId = createId('t');
      this.people.set(trackId, {
        trackId,
        bbox: det.bbox,
        score: det.score,
        hits: 1,
        misses: 0,
        firstSeen: now,
        lastSeen: now,
        status: 'TENTATIVE',
      });
      this.order.push(trackId);
    });

    // Unmatched tracks decay; past expiry they are removed for good.
    const expired: TrackedPerson[] = [];
    for (const trackId of trackIds) {
      if (matchedTracks.has(trackId)) continue;
      const track = this.people.get(trackId);
      if (!track) continue;
      track.misses += 1;
      if (now - track.lastSeen > opts.expiryMs) {
        expired.push(track);
        this.people.delete(trackId);
        this.order = this.order.filter((id) => id !== trackId);
      }
    }

    // Status transitions.
    const confirmedNow: Id[] = [];
    for (const track of this.people.values()) {
      const confirmed = track.hits >= opts.confirmFrames;
      if (confirmed && track.status === 'TENTATIVE') {
        track.status = 'CONFIRMED';
        confirmedNow.push(track.trackId);
      }
      if (matchedTracks.has(track.trackId)) {
        track.status = confirmed ? 'CONFIRMED' : 'TENTATIVE';
      } else if (now - track.lastSeen > opts.lostGraceMs) {
        track.status = 'LOST';
      }
    }

    const tracks = this.order.map((id) => this.people.get(id)).filter((t): t is TrackedPerson => !!t);
    return { tracks, expired, confirmedNow };
  }
}

function smoothBBox(prev: NormalizedBBox, next: NormalizedBBox, alpha: number): NormalizedBBox {
  const lerp = (a: number, b: number): number => a * (1 - alpha) + b * alpha;
  return {
    x: lerp(prev.x, next.x),
    y: lerp(prev.y, next.y),
    width: lerp(prev.width, next.width),
    height: lerp(prev.height, next.height),
  };
}
