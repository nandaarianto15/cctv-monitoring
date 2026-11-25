/**
 * Per-camera vision pipeline.
 *
 * Owns one isolated camera session plus all processing state for that camera:
 * frame grabbing (≤ maxFps, downscaled to ≤ frameMaxWidth), person detection,
 * tracking, pose, occupancy/posture/activity classification with temporal
 * smoothing, desk-state derivation and event emission. Detection and pose
 * models are shared; every other piece of state is strictly per-camera.
 */
import { DEFAULT_CONFIG, type AppConfig } from '../../config';
import type {
  ActivityState,
  Camera,
  CameraRunStatus,
  CameraRuntimeStats,
  CameraSnapshot,
  DeskOccupant,
  DeskState,
  DeskZone,
  DeskZoneView,
  Id,
  NormalizedBBox,
  OccupancyState,
  PostureState,
  TrackAssignment,
  TrackView,
  VisionEvent,
  ZoneMatch,
} from '../../types';
import { footPoint, iou } from '../../utils/geometry';
import { makeVisionEvent } from '../../utils/events';
import { computeRawActivity } from '../activity/activityEngine';
import { evaluateWorkIndicators } from '../activity/indicators';
import { estimatePosture } from '../activity/posture';
import { CameraSession } from '../camera/CameraSession';
import { describeCameraError } from '../camera/cameraErrors';
import type { CameraSource } from '../camera/CameraSource';
import type { PersonDetector } from '../detection/personDetector';
import { poseBBox, type PoseFrame } from '../pose/landmarks';
import type { PoseDetector } from '../pose/poseLandmarker';
import { TemporalStateFilter } from '../temporal/TemporalStateFilter';
import { PersonTracker, type TrackerOptions, type TrackedPerson } from '../tracking/PersonTracker';
import { matchZoneAtPoint } from '../workspace/zoneMatcher';

export interface CameraPipelineCallbacks {
  getZones(cameraId: Id): DeskZone[];
  getConfig(): AppConfig;
  getAssignment(trackId: Id): TrackAssignment | null;
  onEvent(event: VisionEvent): void;
  /** A track expired — its assignment (if any) must be invalidated. */
  onTrackExpired(cameraId: Id, trackId: Id): void;
  onSnapshot(): void;
  now(): number;
}

interface TrackProcessing {
  track: TrackedPerson;
  occupancy: TemporalStateFilter<OccupancyState>;
  posture: TemporalStateFilter<PostureState>;
  activity: TemporalStateFilter<ActivityState>;
  /** Last resolved zone match (kept while LOST for desk hold logic). */
  zoneMatch: ZoneMatch | null;
  poseDetected: boolean;
}

interface DeskProcessing {
  zone: DeskZone;
  filter: TemporalStateFilter<DeskState>;
}

function trackerOptionsFromConfig(cfg: AppConfig): TrackerOptions {
  return {
    iouThreshold: cfg.tracking.iouThreshold,
    confirmFrames: cfg.tracking.confirmFrames,
    lostGraceMs: cfg.tracking.lostGraceMs,
    expiryMs: cfg.tracking.expiryMs,
    bboxSmoothing: cfg.tracking.bboxSmoothing,
  };
}

export class CameraPipeline {
  private readonly session = new CameraSession();
  private readonly tracker = new PersonTracker(trackerOptionsFromConfig(DEFAULT_CONFIG));
  private readonly trackProcessing = new Map<Id, TrackProcessing>();
  private readonly deskProcessing = new Map<Id, DeskProcessing>();
  private status: CameraRunStatus = 'idle';
  private error: string | null = null;
  private stats: CameraRuntimeStats = { inferenceFps: 0, lastInferenceMs: 0, framesProcessed: 0 };
  private rafId: number | null = null;
  private busy = false;
  private lastFrameAt = 0;
  private lastVideoTs = 0;
  private workCanvas: HTMLCanvasElement | null = null;
  private lastSnapshotEmit = 0;
  private disposed = false;
  /** Incremented on stop: in-flight frames from an older generation are dropped. */
  private generation = 0;

  constructor(
    private readonly camera: Camera,
    private readonly detector: PersonDetector,
    private readonly pose: PoseDetector,
    private readonly cb: CameraPipelineCallbacks,
  ) {}

  async start(source: CameraSource): Promise<void> {
    if (this.disposed) return;
    this.status = 'starting';
    this.error = null;
    this.busy = false;
    this.cb.onSnapshot();
    try {
      const cfg = this.cb.getConfig();
      await this.session.start(source, {
        onEnded: () => this.handleStreamEnded(),
        startTimeoutMs: cfg.camera.startTimeoutMs,
      });
    } catch (err) {
      this.status = 'error';
      this.error = describeCameraError(err);
      this.cb.onSnapshot();
      return;
    }
    this.status = 'running';
    this.resetProcessing();
    this.lastFrameAt = 0;
    this.lastSnapshotEmit = 0;
    this.loop();
    this.cb.onSnapshot();
  }

  stop(): void {
    this.generation += 1;
    this.cancelLoop();
    this.session.stop();
    this.resetProcessing();
    this.status = 'idle';
    this.error = null;
    this.busy = false;
    this.stats = { inferenceFps: 0, lastInferenceMs: 0, framesProcessed: 0 };
    this.workCanvas = null;
    this.lastFrameAt = 0;
    this.cb.onSnapshot();
  }

  dispose(): void {
    this.stop();
    this.disposed = true;
  }

  /** The live video element, used by the UI to render the camera feed. */
  getVideoElement(): HTMLVideoElement | null {
    return this.status === 'running' ? this.session.videoElement : null;
  }

  getView(): CameraSnapshot {
    const zones = this.cb.getZones(this.camera.id);
    const tracks: TrackView[] = [];
    for (const proc of this.trackProcessing.values()) {
      const t = proc.track;
      const assignment = this.cb.getAssignment(t.trackId);
      tracks.push({
        trackId: t.trackId,
        cameraId: this.camera.id,
        bbox: t.bbox,
        confidence: t.score,
        status: t.status,
        firstSeen: t.firstSeen,
        lastSeen: t.lastSeen,
        state: {
          occupancy: proc.occupancy.value,
          posture: proc.posture.value,
          activity: proc.activity.value,
        },
        zone: proc.zoneMatch ?? { zoneId: null, zoneName: null, ambiguous: false, matchedZoneIds: [] },
        poseDetected: proc.poseDetected,
        employeeId: assignment?.employeeId ?? null,
      });
    }

    const desks: DeskZoneView[] = zones.map((zone) => {
      const proc = this.deskProcessing.get(zone.id);
      const occupants: DeskOccupant[] = [];
      if (proc) {
        for (const tp of this.trackProcessing.values()) {
          if (
            tp.track.status === 'CONFIRMED' &&
            tp.occupancy.value === 'IN_ZONE' &&
            tp.zoneMatch?.zoneId === zone.id
          ) {
            occupants.push({
              trackId: tp.track.trackId,
              employeeId: this.cb.getAssignment(tp.track.trackId)?.employeeId ?? null,
            });
          }
        }
      }
      return {
        zoneId: zone.id,
        cameraId: zone.cameraId,
        name: zone.name,
        state: proc?.filter.value ?? 'UNKNOWN',
        occupants,
      };
    });

    return {
      cameraId: this.camera.id,
      status: this.status,
      error: this.error,
      videoSize: this.session.videoSize,
      stats: this.stats,
      tracks,
      desks,
    };
  }

  // --- internals ------------------------------------------------------------

  private handleStreamEnded(): void {
    if (this.disposed || this.status !== 'running') return;
    this.status = 'error';
    this.error = 'Camera stream ended (device unplugged or permission revoked).';
    this.generation += 1;
    this.cancelLoop();
    this.resetProcessing();
    this.cb.onSnapshot();
  }

  private resetProcessing(): void {
    this.tracker.reset();
    this.trackProcessing.clear();
    this.deskProcessing.clear();
  }

  private cancelLoop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private loop = (): void => {
    if (this.disposed || this.status !== 'running') return;
    this.rafId = requestAnimationFrame(this.loop);
    const cfg = this.cb.getConfig();
    const now = this.cb.now();
    const minIntervalMs = 1000 / cfg.inference.maxFps;
    if (this.busy || now - this.lastFrameAt < minIntervalMs) return;
    this.busy = true;
    const gen = this.generation;
    void this.processFrame(now, gen)
      .catch((err) => {
        console.error('[pipeline] frame processing failed', err);
      })
      .finally(() => {
        if (gen === this.generation) this.busy = false;
      });
  };

  private async processFrame(now: number, gen: number): Promise<void> {
    if (gen !== this.generation) return;
    const cfg = this.cb.getConfig();
    this.tracker.configure(trackerOptionsFromConfig(cfg));

    const canvas = this.grabFrame(cfg.inference.frameMaxWidth);
    if (!canvas) return;

    const t0 = performance.now();
    const persons = await this.detector.detect(
      canvas,
      cfg.inference.minPersonConfidence,
      cfg.inference.maxPersons,
    );
    if (gen !== this.generation) return;

    const trackResult = this.tracker.update(persons, now);
    for (const expiredTrack of trackResult.expired) {
      this.trackProcessing.delete(expiredTrack.trackId);
      this.cb.onTrackExpired(this.camera.id, expiredTrack.trackId);
    }

    // Pose only runs when there is someone to analyze (VIDEO mode needs
    // strictly increasing timestamps across calls).
    let poses: PoseFrame[] = [];
    if (trackResult.tracks.length > 0) {
      this.lastVideoTs = Math.max(now, this.lastVideoTs + 1);
      poses = this.pose.detectForVideo(canvas, this.lastVideoTs);
    }
    if (gen !== this.generation) return;

    const aspect = canvas.width / canvas.height;
    const zones = this.cb.getZones(this.camera.id);
    const poseByTrack = matchPosesToTracks(
      poses,
      trackResult.tracks,
      cfg.tracking.poseMatchIouThreshold,
      cfg.posture.minVisibility,
    );
    const newlyConfirmed = new Set<Id>(trackResult.confirmedNow);

    for (const track of trackResult.tracks) {
      this.processTrack(track, poseByTrack.get(track.trackId) ?? null, newlyConfirmed.has(track.trackId), zones, aspect, cfg, now);
    }
    // Drop processing state for tracks that vanished this update.
    for (const trackId of [...this.trackProcessing.keys()]) {
      if (!trackResult.tracks.some((t) => t.trackId === trackId)) {
        this.trackProcessing.delete(trackId);
      }
    }

    this.processDesks(trackResult.tracks, zones, cfg, now);

    // Stats.
    const elapsed = performance.now() - t0;
    const interval = now - this.lastFrameAt;
    if (this.lastFrameAt > 0 && interval > 0) {
      const fps = 1000 / interval;
      this.stats.inferenceFps = this.stats.inferenceFps === 0 ? fps : this.stats.inferenceFps * 0.9 + fps * 0.1;
    }
    this.lastFrameAt = now;
    this.stats.lastInferenceMs = elapsed;
    this.stats.framesProcessed += 1;

    if (now - this.lastSnapshotEmit >= cfg.ui.snapshotIntervalMs) {
      this.lastSnapshotEmit = now;
      this.cb.onSnapshot();
    }
  }

  private processTrack(
    track: TrackedPerson,
    pose: PoseFrame | null,
    newlyConfirmed: boolean,
    zones: DeskZone[],
    aspect: number,
    cfg: AppConfig,
    now: number,
  ): void {
    const temporalOpts = cfg.temporal;
    let proc = this.trackProcessing.get(track.trackId);
    if (!proc) {
      proc = {
        track,
        occupancy: new TemporalStateFilter<OccupancyState>('OUT_ZONE', temporalOpts),
        posture: new TemporalStateFilter<PostureState>('UNKNOWN', temporalOpts, 'UNKNOWN'),
        activity: new TemporalStateFilter<ActivityState>('UNKNOWN', temporalOpts, 'UNKNOWN'),
        zoneMatch: null,
        poseDetected: false,
      };
      this.trackProcessing.set(track.trackId, proc);
    }
    proc.track = track;
    proc.poseDetected = pose !== null;
    proc.occupancy.configure(temporalOpts);
    proc.posture.configure(temporalOpts);
    proc.activity.configure(temporalOpts);

    if (track.status === 'LOST') {
      // Occlusion: hold states, never invent evidence.
      proc.occupancy.missing(now);
      proc.posture.missing(now);
      proc.activity.missing(now);
      return;
    }

    const foot = footPoint(track.bbox);
    const zoneMatch = matchZoneAtPoint(foot, zones);
    proc.zoneMatch = zoneMatch;

    const prevOccupancy = proc.occupancy.value;
    const occupancy = proc.occupancy.observe(
      zoneMatch.matchedZoneIds.length > 0 ? 'IN_ZONE' : 'OUT_ZONE',
      now,
    );

    const prevPosture = proc.posture.value;
    const posture = pose
      ? proc.posture.observe(estimatePosture(pose, track.bbox, aspect, cfg.posture).state, now)
      : proc.posture.missing(now);

    const prevActivity = proc.activity.value;
    const activity = pose
      ? proc.activity.observe(
          computeRawActivity(
            occupancy,
            posture,
            evaluateWorkIndicators(
              pose,
              zones.filter((z) => zoneMatch.matchedZoneIds.includes(z.id)),
              aspect,
              cfg.activity,
            ),
            cfg.activity.useHeadOrientation,
          ),
          now,
        )
      : proc.activity.missing(now);

    // Events are emitted for confirmed tracks only (tentative tracks are noise).
    if (track.status === 'CONFIRMED') {
      if (newlyConfirmed) {
        // Initial state record for the newly confirmed track.
        this.emitEvent('occupancy', track.trackId, null, occupancy, now);
        if (posture !== 'UNKNOWN') {
          this.emitEvent('posture', track.trackId, null, posture, now);
        }
        if (activity !== 'UNKNOWN') {
          this.emitEvent('activity', track.trackId, null, activity, now);
        }
        return;
      }
      if (occupancy !== prevOccupancy) {
        this.emitEvent('occupancy', track.trackId, prevOccupancy, occupancy, now);
      }
      if (posture !== prevPosture) {
        this.emitEvent('posture', track.trackId, prevPosture, posture, now);
      }
      if (activity !== prevActivity) {
        this.emitEvent('activity', track.trackId, prevActivity, activity, now);
      }
    }
  }

  private processDesks(tracks: TrackedPerson[], zones: DeskZone[], cfg: AppConfig, now: number): void {
    for (const zone of zones) {
      let desk = this.deskProcessing.get(zone.id);
      if (!desk) {
        desk = { zone, filter: new TemporalStateFilter<DeskState>('UNKNOWN', cfg.temporal, 'UNKNOWN') };
        this.deskProcessing.set(zone.id, desk);
      }
      desk.zone = zone;
      desk.filter.configure(cfg.temporal);

      const occupied = tracks.some((t) => {
        const proc = this.trackProcessing.get(t.trackId);
        return (
          t.status === 'CONFIRMED' &&
          proc !== undefined &&
          proc.occupancy.value === 'IN_ZONE' &&
          proc.zoneMatch?.zoneId === zone.id
        );
      });
      // A LOST track whose last match was this zone means "occluded, maybe
      // still there" — hold (null) instead of reporting the desk empty.
      const lostInZone = tracks.some((t) => {
        const proc = this.trackProcessing.get(t.trackId);
        return (
          t.status === 'LOST' &&
          proc !== undefined &&
          proc.zoneMatch !== null &&
          proc.zoneMatch.matchedZoneIds.includes(zone.id)
        );
      });

      const prev = desk.filter.value;
      const next = occupied
        ? desk.filter.observe('OCCUPIED', now)
        : lostInZone
          ? desk.filter.missing(now)
          : desk.filter.observe('UNOCCUPIED', now);
      if (next !== prev) {
        this.emitEvent('deskState', zone.id, prev, next, now);
      }
    }
    // Drop desk state for zones deleted at runtime.
    for (const zoneId of [...this.deskProcessing.keys()]) {
      if (!zones.some((z) => z.id === zoneId)) {
        this.deskProcessing.delete(zoneId);
      }
    }
  }

  private emitEvent(
    field: 'occupancy' | 'posture' | 'activity' | 'deskState',
    subjectId: Id,
    from: string | null,
    to: string | null,
    now: number,
  ): void {
    this.cb.onEvent(
      makeVisionEvent(field, { ts: now, cameraId: this.camera.id, subjectId, from, to }),
    );
  }

  /** Draws the current video frame onto a reused canvas at ≤ maxWidth. */
  private grabFrame(maxWidth: number): HTMLCanvasElement | null {
    const video = this.session.videoElement;
    if (video.videoWidth <= 0 || video.videoHeight <= 0) return null;
    const width = Math.min(video.videoWidth, maxWidth);
    const height = Math.max(1, Math.round(video.videoHeight * (width / video.videoWidth)));
    if (!this.workCanvas) {
      this.workCanvas = document.createElement('canvas');
    }
    if (this.workCanvas.width !== width || this.workCanvas.height !== height) {
      this.workCanvas.width = width;
      this.workCanvas.height = height;
    }
    const ctx = this.workCanvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, width, height);
    return this.workCanvas;
  }
}

/** Greedy pose→track matching by bbox overlap. */
function matchPosesToTracks(
  poses: PoseFrame[],
  tracks: TrackedPerson[],
  iouThreshold: number,
  minVisibility: number,
): Map<Id, PoseFrame> {
  const result = new Map<Id, PoseFrame>();
  const candidates = poses
    .map((pose) => ({ pose, bbox: poseBBox(pose, minVisibility) }))
    .filter((c): c is { pose: PoseFrame; bbox: NormalizedBBox } => c.bbox !== null);
  const taken = new Set<Id>();
  for (const candidate of candidates) {
    let best: TrackedPerson | null = null;
    let bestIou = iouThreshold;
    for (const track of tracks) {
      if (taken.has(track.trackId)) continue;
      const overlap = iou(track.bbox, candidate.bbox);
      if (overlap >= bestIou) {
        best = track;
        bestIou = overlap;
      }
    }
    if (best) {
      taken.add(best.trackId);
      result.set(best.trackId, candidate.pose);
    }
  }
  return result;
}
