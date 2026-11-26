/**
 * Posture estimation from pose landmarks.
 *
 * Multiple independent geometric signals vote; conflicting or missing signals
 * yield UNKNOWN. Ankle visibility is never the sole basis: knee angle,
 * hip-ankle vertical ratio and an ankle-independent body-compactness signal
 * (bbox height / torso length) are combined.
 */
import type { AppConfig } from '../../config';
import type { NormalizedBBox, NormalizedPoint, PostureState } from '../../types';
import { POSE_LANDMARK, type PoseFrame } from '../pose/landmarks';

export interface PostureSignals {
  kneeAngleDeg: number | null;
  hipAnkleRatio: number | null;
  bodyCompactness: number | null;
}

export interface PostureEstimate {
  state: PostureState;
  signals: PostureSignals;
}

export function estimatePosture(
  frame: PoseFrame,
  trackBBox: NormalizedBBox,
  aspect: number,
  cfg: AppConfig['posture'],
): PostureEstimate {
  const lm = frame.landmarks;
  const landmark = (index: number): PoseLandmarkVisible | null => {
    const l = lm[index];
    if (!l || l.visibility < cfg.minVisibility) return null;
    return { x: l.x, y: l.y };
  };

  // Pick the leg side with more visible joints (hip, knee, ankle).
  const leftCount = [POSE_LANDMARK.LEFT_HIP, POSE_LANDMARK.LEFT_KNEE, POSE_LANDMARK.LEFT_ANKLE].filter(
    (i) => lm[i] && lm[i]!.visibility >= cfg.minVisibility,
  ).length;
  const rightCount = [POSE_LANDMARK.RIGHT_HIP, POSE_LANDMARK.RIGHT_KNEE, POSE_LANDMARK.RIGHT_ANKLE].filter(
    (i) => lm[i] && lm[i]!.visibility >= cfg.minVisibility,
  ).length;
  const useLeft = leftCount >= rightCount;
  const hipIdx = useLeft ? POSE_LANDMARK.LEFT_HIP : POSE_LANDMARK.RIGHT_HIP;
  const kneeIdx = useLeft ? POSE_LANDMARK.LEFT_KNEE : POSE_LANDMARK.RIGHT_KNEE;
  const ankleIdx = useLeft ? POSE_LANDMARK.LEFT_ANKLE : POSE_LANDMARK.RIGHT_ANKLE;
  const shoulderIdx = useLeft ? POSE_LANDMARK.LEFT_SHOULDER : POSE_LANDMARK.RIGHT_SHOULDER;

  const hip = landmark(hipIdx);
  const knee = landmark(kneeIdx);
  const ankle = landmark(ankleIdx);
  const shoulder = landmark(shoulderIdx);

  // Signal 1: knee angle (fully straight legs ≈ 180°, seated ≈ 90°).
  let kneeAngleDeg: number | null = null;
  if (hip && knee && ankle) {
    kneeAngleDeg = angleAtVertex(knee, hip, ankle, aspect);
  }

  // Signal 2: vertical hip↔ankle distance relative to torso length.
  let hipAnkleRatio: number | null = null;
  if (hip && ankle && shoulder) {
    const torso = distance(shoulder, hip, aspect);
    if (torso > 1e-6) {
      hipAnkleRatio = Math.abs(hip.y - ankle.y) / torso;
    }
  }

  // Signal 3: body compactness - independent of ankle visibility. A seated
  // person's bbox is much shorter relative to their torso than a standing one.
  let bodyCompactness: number | null = null;
  if (shoulder && hip && trackBBox.height > 1e-6) {
    const torso = distance(shoulder, hip, aspect);
    if (torso > 1e-6) {
      bodyCompactness = trackBBox.height / torso;
    }
  }

  let sittingVotes = 0;
  let standingVotes = 0;
  if (kneeAngleDeg !== null) {
    if (kneeAngleDeg <= cfg.sittingKneeAngleDeg) sittingVotes += 1;
    else if (kneeAngleDeg >= cfg.standingKneeAngleDeg) standingVotes += 1;
  }
  if (hipAnkleRatio !== null) {
    if (hipAnkleRatio <= cfg.sittingHipAnkleRatio) sittingVotes += 1;
    else if (hipAnkleRatio >= cfg.standingHipAnkleRatio) standingVotes += 1;
  }
  if (bodyCompactness !== null) {
    if (bodyCompactness <= cfg.sittingBodyCompactness) sittingVotes += 1;
    else if (bodyCompactness >= cfg.standingBodyCompactness) standingVotes += 1;
  }

  let state: PostureState = 'UNKNOWN';
  if (sittingVotes > 0 && standingVotes === 0) state = 'SITTING';
  else if (standingVotes > 0 && sittingVotes === 0) state = 'STANDING';
  // Contradictory or absent signals → UNKNOWN (insufficient evidence).

  return { state, signals: { kneeAngleDeg, hipAnkleRatio, bodyCompactness } };
}

interface PoseLandmarkVisible {
  x: number;
  y: number;
}

/** Angle between vertex→a and vertex→b, in degrees, aspect-corrected. */
function angleAtVertex(vertex: NormalizedPoint, a: NormalizedPoint, b: NormalizedPoint, aspect: number): number {
  const v1x = a.x - vertex.x;
  const v1y = (a.y - vertex.y) * aspect;
  const v2x = b.x - vertex.x;
  const v2y = (b.y - vertex.y) * aspect;
  const dot = v1x * v2x + v1y * v2y;
  const mag = Math.hypot(v1x, v1y) * Math.hypot(v2x, v2y);
  if (mag <= 1e-9) return 0;
  const cos = Math.max(-1, Math.min(1, dot / mag));
  return (Math.acos(cos) * 180) / Math.PI;
}

function distance(a: NormalizedPoint, b: NormalizedPoint, aspect: number): number {
  return Math.hypot(a.x - b.x, (a.y - b.y) * aspect);
}
