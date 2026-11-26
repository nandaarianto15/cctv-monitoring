/**
 * Central configuration. Every tunable threshold lives here (or in persisted
 * user overrides of this shape) - there are no magic numbers in business logic.
 */

export interface AppConfig {
  inference: {
    /** Hard cap on the inference rate (frames per second). */
    maxFps: number;
    /** Frames are downscaled to at most this width before inference. */
    frameMaxWidth: number;
    /** Minimum detector confidence for a `person` box to be accepted. */
    minPersonConfidence: number;
    /** Maximum persons handed to the detector per frame. */
    maxPersons: number;
    /** PoseLandmarker simultaneous poses (spec: 4). */
    maxPoses: number;
  };
  tracking: {
    /** Greedy IoU threshold for detection→track matching. */
    iouThreshold: number;
    /** IoU threshold for matching a pose to a track. */
    poseMatchIouThreshold: number;
    /** Consecutive hits required before a track becomes CONFIRMED. */
    confirmFrames: number;
    /** A track survives unmatched this long before becoming LOST (occlusion grace). */
    lostGraceMs: number;
    /** After this long without a match the track expires and its assignment is invalidated. */
    expiryMs: number;
    /** Bounding box EMA smoothing: 0 = frozen, 1 = raw detection. */
    bboxSmoothing: number;
  };
  temporal: {
    /** A new state must be observed continuously for this long before it is displayed. */
    dwellMs: number;
    /** Missing observations hold the last displayed state this long before reverting to UNKNOWN. */
    awayMs: number;
  };
  activity: {
    /** Max distance (fraction of frame width) for a wrist to count as near a desk zone. */
    wristNearZoneDistance: number;
    /** Landmark visibility below this counts as "wrist not observable". */
    wristMinVisibility: number;
    /** Optional secondary indicator; never sufficient on its own (WORKING also needs IN_ZONE + SITTING). */
    useHeadOrientation: boolean;
  };
  posture: {
    /** Landmark visibility below this counts as "not observed". */
    minVisibility: number;
    /** Knee angle at or below this (degrees) votes SITTING. */
    sittingKneeAngleDeg: number;
    /** Knee angle at or above this (degrees) votes STANDING. */
    standingKneeAngleDeg: number;
    /** |hipY - ankleY| / torsoLength at or below this votes SITTING (seated drop ≈ seat height ≈ 1×torso). */
    sittingHipAnkleRatio: number;
    /** |hipY - ankleY| / torsoLength at or above this votes STANDING (standing drop ≈ leg length ≈ 1.4×torso). */
    standingHipAnkleRatio: number;
    /** bboxHeight / torsoLength at or below this votes SITTING (ankle-independent signal). */
    sittingBodyCompactness: number;
    /** bboxHeight / torsoLength at or above this votes STANDING. */
    standingBodyCompactness: number;
  };
  events: {
    /** FIFO retention limit for persisted events. */
    retentionLimit: number;
  };
  camera: {
    /** Requested capture resolution (getUserMedia ideals). */
    idealCaptureWidth: number;
    idealCaptureHeight: number;
    /** Timeout while waiting for a camera stream to produce frames. */
    startTimeoutMs: number;
  };
  ui: {
    /** Interval for pushing pipeline snapshots to the UI (ms). */
    snapshotIntervalMs: number;
  };
  models: {
    /** coco-ssd model base. */
    personDetectorBase: 'lite_mobilenet_v2' | 'mobilenet_v2';
    /** Optional self-hosted coco-ssd model.json URL (offline hosting; null = CDN default). */
    personDetectorModelUrl: string | null;
    /** CDN root for MediaPipe wasm assets. */
    poseWasmBasePath: string;
    /** URL of the .task pose model. */
    poseModelUrl: string;
  };
}

export const DEFAULT_CONFIG: AppConfig = {
  inference: { maxFps: 10, frameMaxWidth: 640, minPersonConfidence: 0.5, maxPersons: 10, maxPoses: 4 },
  tracking: {
    iouThreshold: 0.3,
    poseMatchIouThreshold: 0.25,
    confirmFrames: 3,
    lostGraceMs: 2000,
    expiryMs: 8000,
    bboxSmoothing: 0.6,
  },
  temporal: { dwellMs: 1500, awayMs: 10000 },
  activity: { wristNearZoneDistance: 0.08, wristMinVisibility: 0.5, useHeadOrientation: false },
  posture: {
    minVisibility: 0.5,
    sittingKneeAngleDeg: 110,
    standingKneeAngleDeg: 155,
    sittingHipAnkleRatio: 1.0,
    standingHipAnkleRatio: 1.4,
    sittingBodyCompactness: 2.0,
    standingBodyCompactness: 2.6,
  },
  events: { retentionLimit: 1000 },
  camera: { idealCaptureWidth: 1280, idealCaptureHeight: 720, startTimeoutMs: 10000 },
  ui: { snapshotIntervalMs: 250 },
  models: {
    personDetectorBase: 'lite_mobilenet_v2',
    personDetectorModelUrl: null,
    poseWasmBasePath: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm',
    poseModelUrl:
      'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
  },
};

/** One-level-deep partial override of {@link AppConfig}. */
export type ConfigOverrides = {
  [K in keyof AppConfig]?: Partial<AppConfig[K]>;
};

/** Deep-merges overrides onto defaults; invalid entries are ignored (values keep defaults). */
export function mergeConfig(base: AppConfig, overrides: ConfigOverrides | null | undefined): AppConfig {
  const merged: AppConfig = JSON.parse(JSON.stringify(base)) as AppConfig;
  if (!overrides) return merged;
  for (const key of Object.keys(overrides) as Array<keyof AppConfig>) {
    const section = overrides[key];
    if (!section || typeof section !== 'object') continue;
    Object.assign(merged[key] as Record<string, unknown>, section);
  }
  return merged;
}
