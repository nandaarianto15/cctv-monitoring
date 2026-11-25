import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../config';
import { POSE_LANDMARK, type PoseFrame, type PoseLandmark } from '../pose/landmarks';
import { estimatePosture } from './posture';

const cfg = DEFAULT_CONFIG.posture;
const ASPECT = 1;

type LandmarkSpec = Partial<Record<number, [number, number, number]>>; // [x, y, visibility]

function frame(spec: LandmarkSpec): PoseFrame {
  const landmarks: PoseLandmark[] = Array.from({ length: 33 }, () => ({
    x: 0.5,
    y: 0.5,
    z: 0,
    visibility: 0, // unobserved by default
  }));
  for (const [index, value] of Object.entries(spec)) {
    const [x, y, visibility] = value as [number, number, number];
    landmarks[Number(index)] = { x, y, z: 0, visibility };
  }
  return { landmarks };
}

// Standing person: vertical leg (knee angle 180°), hip→ankle drop 0.43,
// torso 0.3 → ratio ≈ 1.43; bbox height 0.85 → compactness ≈ 2.83.
const standing = frame({
  [POSE_LANDMARK.LEFT_SHOULDER]: [0.45, 0.15, 0.9],
  [POSE_LANDMARK.LEFT_HIP]: [0.45, 0.45, 0.9],
  [POSE_LANDMARK.LEFT_KNEE]: [0.45, 0.65, 0.9],
  [POSE_LANDMARK.LEFT_ANKLE]: [0.45, 0.88, 0.9],
});
const standingBBox = { x: 0.35, y: 0.05, width: 0.2, height: 0.85 };

// Seated person: thigh horizontal, shin vertical (knee angle 90°),
// hip→ankle drop 0.3, torso 0.35 → ratio ≈ 0.86; bbox height 0.65 → compactness ≈ 1.86.
const sitting = frame({
  [POSE_LANDMARK.LEFT_SHOULDER]: [0.45, 0.2, 0.9],
  [POSE_LANDMARK.LEFT_HIP]: [0.45, 0.55, 0.9],
  [POSE_LANDMARK.LEFT_KNEE]: [0.62, 0.55, 0.9],
  [POSE_LANDMARK.LEFT_ANKLE]: [0.62, 0.85, 0.9],
});
const sittingBBox = { x: 0.35, y: 0.18, width: 0.35, height: 0.65 };

describe('estimatePosture', () => {
  it('classifies a standing person', () => {
    const result = estimatePosture(standing, standingBBox, ASPECT, cfg);
    expect(result.state).toBe('STANDING');
    expect(result.signals.kneeAngleDeg).toBeCloseTo(180, 0);
    expect(result.signals.hipAnkleRatio).toBeGreaterThan(cfg.standingHipAnkleRatio);
    expect(result.signals.bodyCompactness).toBeGreaterThan(cfg.standingBodyCompactness);
  });

  it('classifies a seated person', () => {
    const result = estimatePosture(sitting, sittingBBox, ASPECT, cfg);
    expect(result.state).toBe('SITTING');
    expect(result.signals.kneeAngleDeg).toBeCloseTo(90, 0);
    expect(result.signals.hipAnkleRatio).toBeLessThanOrEqual(cfg.sittingHipAnkleRatio);
    expect(result.signals.bodyCompactness).toBeLessThanOrEqual(cfg.sittingBodyCompactness);
  });

  it('returns UNKNOWN when nothing is visible', () => {
    const result = estimatePosture(frame({}), sittingBBox, ASPECT, cfg);
    expect(result.state).toBe('UNKNOWN');
    expect(result.signals.kneeAngleDeg).toBeNull();
    expect(result.signals.hipAnkleRatio).toBeNull();
    expect(result.signals.bodyCompactness).toBeNull();
  });

  it('never relies on ankle visibility alone: ankle-only landmarks → UNKNOWN', () => {
    const ankleOnly = frame({ [POSE_LANDMARK.LEFT_ANKLE]: [0.45, 0.88, 0.9] });
    const result = estimatePosture(ankleOnly, standingBBox, ASPECT, cfg);
    expect(result.state).toBe('UNKNOWN');
  });

  it('still classifies without ankles using the compactness signal (occluded legs)', () => {
    const noAnkle = frame({
      [POSE_LANDMARK.LEFT_SHOULDER]: [0.45, 0.2, 0.9],
      [POSE_LANDMARK.LEFT_HIP]: [0.45, 0.55, 0.9],
    });
    const result = estimatePosture(noAnkle, sittingBBox, ASPECT, cfg);
    expect(result.signals.kneeAngleDeg).toBeNull();
    expect(result.signals.hipAnkleRatio).toBeNull();
    expect(result.state).toBe('SITTING'); // compactness vote only
  });

  it('returns UNKNOWN for contradictory signals', () => {
    // Sitting knee geometry but a tall bounding box (standing compactness).
    const result = estimatePosture(sitting, { x: 0.35, y: 0.05, width: 0.35, height: 1.0 }, ASPECT, cfg);
    expect(result.state).toBe('UNKNOWN');
  });

  it('uses the leg side with better visibility', () => {
    const mixed = frame({
      [POSE_LANDMARK.LEFT_SHOULDER]: [0.45, 0.15, 0.1], // left barely visible
      [POSE_LANDMARK.LEFT_HIP]: [0.45, 0.45, 0.1],
      [POSE_LANDMARK.LEFT_KNEE]: [0.45, 0.65, 0.1],
      [POSE_LANDMARK.LEFT_ANKLE]: [0.45, 0.88, 0.1],
      [POSE_LANDMARK.RIGHT_SHOULDER]: [0.45, 0.15, 0.9],
      [POSE_LANDMARK.RIGHT_HIP]: [0.45, 0.45, 0.9],
      [POSE_LANDMARK.RIGHT_KNEE]: [0.45, 0.65, 0.9],
      [POSE_LANDMARK.RIGHT_ANKLE]: [0.45, 0.88, 0.9],
    });
    const result = estimatePosture(mixed, standingBBox, ASPECT, cfg);
    expect(result.state).toBe('STANDING');
  });
});
