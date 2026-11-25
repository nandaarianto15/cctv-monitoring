/**
 * Raw activity classification (before temporal smoothing).
 *
 * WORKING requires all of: IN_ZONE, SITTING, and a positive observable work
 * indicator. Insufficient evidence yields UNKNOWN — posture and occupancy
 * alone never prove productivity.
 */
import type { ActivityState, OccupancyState, PostureState } from '../../types';
import type { WorkIndicators } from './indicators';

export function computeRawActivity(
  occupancy: OccupancyState,
  posture: PostureState,
  indicators: WorkIndicators,
  useHeadOrientation: boolean,
): ActivityState {
  if (occupancy === 'OUT_ZONE') return 'NOT_WORKING';

  // IN_ZONE from here on.
  if (posture !== 'SITTING') {
    // Standing or unknown posture at a desk: not enough evidence either way.
    return 'UNKNOWN';
  }

  const wrist = indicators.wristNearDesk;
  const head = useHeadOrientation ? indicators.headTowardDesk : null;

  if (wrist === true) return 'WORKING';
  if (wrist === false) return 'NOT_WORKING';
  // Wrists unobservable: the optional head indicator may still provide evidence.
  if (head === true) return 'WORKING';
  return 'UNKNOWN';
}
