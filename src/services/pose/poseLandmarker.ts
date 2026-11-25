/**
 * MediaPipe PoseLandmarker adapter (VIDEO running mode, numPoses from config).
 * Landmarks are normalized 0..1 relative to the input frame — the same basis
 * as our bounding boxes. Visibility defaults to 0 when MediaPipe omits it:
 * missing evidence is treated as "not observed", never as a positive signal.
 *
 * tasks-vision is imported dynamically — the wasm/model assets are only
 * fetched when pose estimation is actually needed.
 */
import type { PoseLandmarker } from '@mediapipe/tasks-vision';
import type { AppConfig } from '../../config';
import type { PoseFrame } from './landmarks';

export interface PoseDetector {
  /** Timestamps must be strictly increasing across calls (VIDEO mode). */
  detectForVideo(input: HTMLCanvasElement, timestampMs: number): PoseFrame[];
  close(): void;
}

export class MediaPipePoseDetector implements PoseDetector {
  private constructor(private readonly landmarker: PoseLandmarker) {}

  static async load(cfg: AppConfig['models'], maxPoses: number): Promise<MediaPipePoseDetector> {
    const { FilesetResolver, PoseLandmarker } = await import('@mediapipe/tasks-vision');
    const fileset = await FilesetResolver.forVisionTasks(cfg.poseWasmBasePath);
    const options = {
      baseOptions: { modelAssetPath: cfg.poseModelUrl },
      runningMode: 'VIDEO' as const,
      numPoses: maxPoses,
    };
    let landmarker: PoseLandmarker;
    try {
      landmarker = await PoseLandmarker.createFromOptions(fileset, {
        ...options,
        baseOptions: { ...options.baseOptions, delegate: 'GPU' },
      });
    } catch {
      // Some devices/drivers reject the GPU delegate — fall back to CPU.
      landmarker = await PoseLandmarker.createFromOptions(fileset, {
        ...options,
        baseOptions: { ...options.baseOptions, delegate: 'CPU' },
      });
    }
    return new MediaPipePoseDetector(landmarker);
  }

  detectForVideo(input: HTMLCanvasElement, timestampMs: number): PoseFrame[] {
    const result = this.landmarker.detectForVideo(input, timestampMs);
    const landmarkGroups = result.landmarks ?? [];
    return landmarkGroups.map((group) => ({
      landmarks: group.map((lm) => ({
        x: lm.x,
        y: lm.y,
        z: lm.z ?? 0,
        visibility: lm.visibility ?? 0,
      })),
    }));
  }

  close(): void {
    this.landmarker.close();
  }
}
