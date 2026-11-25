/**
 * Pose landmark indices (MediaPipe Pose topology, 33 landmarks) and small
 * helpers shared by the pose service and activity engine.
 */
import type { NormalizedBBox } from '../../types';

export interface PoseLandmark {
  x: number;
  y: number;
  z: number;
  /** 0..1; lower values mean the joint was not reliably observed. */
  visibility: number;
}

export interface PoseFrame {
  landmarks: PoseLandmark[];
}

export const POSE_LANDMARK = {
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
} as const;

/** Bounding box over the landmarks visible enough to trust; null when unusable. */
export function poseBBox(frame: PoseFrame, minVisibility: number): NormalizedBBox | null {
  const visible = frame.landmarks.filter((l) => l.visibility >= minVisibility);
  if (visible.length < 3) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of visible) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}
