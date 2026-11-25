/**
 * Person detection via coco-ssd (TensorFlow.js). Returns only `person` boxes,
 * normalized to 0..1 relative to the input canvas. Confidence filtering is
 * configurable per call so thresholds stay live-editable.
 *
 * TensorFlow.js and coco-ssd are imported dynamically: the heavy ML code is
 * only downloaded when models are actually needed (first camera start).
 */
import type { ObjectDetection } from '@tensorflow-models/coco-ssd';
import type { AppConfig } from '../../config';
import type { PersonDetection } from '../../types';

export interface PersonDetector {
  detect(input: HTMLCanvasElement, minConfidence: number, maxPersons: number): Promise<PersonDetection[]>;
  dispose(): void;
}

export class CocoSsdPersonDetector implements PersonDetector {
  private constructor(private readonly model: ObjectDetection) {}

  static async load(
    base: AppConfig['models']['personDetectorBase'],
    modelUrl: string | null,
  ): Promise<CocoSsdPersonDetector> {
    const tf = await import('@tensorflow/tfjs');
    const cocoSsd = await import('@tensorflow-models/coco-ssd');
    await tf.ready();
    const model = await cocoSsd.load(modelUrl ? { base, modelUrl } : { base });
    return new CocoSsdPersonDetector(model);
  }

  async detect(
    input: HTMLCanvasElement,
    minConfidence: number,
    maxPersons: number,
  ): Promise<PersonDetection[]> {
    const predictions = await this.model.detect(input, maxPersons, minConfidence);
    return predictions
      .filter((p) => p.class === 'person' && p.score >= minConfidence)
      .map((p) => {
        const [x, y, w, h] = p.bbox;
        return {
          score: p.score,
          bbox: {
            x: x / input.width,
            y: y / input.height,
            width: w / input.width,
            height: h / input.height,
          },
        };
      });
  }

  dispose(): void {
    this.model.dispose();
  }
}
