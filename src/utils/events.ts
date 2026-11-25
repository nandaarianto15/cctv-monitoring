/**
 * Event factory: constructs the discriminated VisionEvent union safely.
 */
import type { EventField, Id, VisionEvent } from '../types';
import { createId } from './id';

export interface EventSeed {
  /** Epoch milliseconds. */
  ts: number;
  cameraId: Id;
  subjectId: Id;
  from: string | null;
  to: string | null;
}

export function makeVisionEvent(field: EventField, seed: EventSeed): VisionEvent {
  const base = { id: createId('e'), ...seed };
  switch (field) {
    case 'occupancy':
      return { ...base, field };
    case 'posture':
      return { ...base, field };
    case 'activity':
      return { ...base, field };
    case 'deskState':
      return { ...base, field };
    case 'assignment':
      return { ...base, field };
  }
}
