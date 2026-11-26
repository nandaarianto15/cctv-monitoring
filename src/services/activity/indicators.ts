/**
 * Observable work indicators. WORKING is never inferred from posture or
 * inactivity alone - it requires the conjunction of occupancy, posture and at
 * least one *observable* indicator (default: wrist near the desk zone).
 * A `null` indicator means "not observable" and never counts as evidence.
 */
import type { AppConfig } from '../../config';
import type { DeskZone, NormalizedPoint } from '../../types';
import { POSE_LANDMARK, type PoseFrame } from '../pose/landmarks';
import { pointNearZones } from '../workspace/zoneMatcher';

export interface WorkIndicators {
  /** True/false when a wrist was observable; null when not. */
  wristNearDesk: boolean | null;
  /** Optional secondary signal; only used when enabled in config. */
  headTowardDesk: boolean | null;
}

export function evaluateWorkIndicators(
  frame: PoseFrame,
  matchedZones: DeskZone[],
  aspect: number,
  cfg: AppConfig['activity'],
): WorkIndicators {
  if (matchedZones.length === 0) {
    // No zone to be near to → indicators are not observable.
    return { wristNearDesk: null, headTowardDesk: null };
  }

  const wrists = [POSE_LANDMARK.LEFT_WRIST, POSE_LANDMARK.RIGHT_WRIST]
    .map((i) => frame.landmarks[i])
    .filter((l): l is NonNullable<typeof l> => !!l && l.visibility >= cfg.wristMinVisibility)
    .map<NormalizedPoint>((l) => ({ x: l.x, y: l.y }));

  const wristNearDesk =
    wrists.length === 0
      ? null
      : wrists.some((w) => pointNearZones(w, matchedZones, aspect, cfg.wristNearZoneDistance));

  const nose = frame.landmarks[POSE_LANDMARK.NOSE];
  const noseVisible = !!nose && nose.visibility >= cfg.wristMinVisibility;
  const headTowardDesk = noseVisible
    ? pointNearZones({ x: nose!.x, y: nose!.y }, matchedZones, aspect, cfg.wristNearZoneDistance)
    : null;

  return { wristNearDesk, headTowardDesk };
}
