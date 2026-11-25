/**
 * Zone matching: foot-point containment against desk polygons, with priority
 * resolution and explicit AMBIGUOUS results.
 */
import type { DeskZone, NormalizedPoint, ZoneMatch } from '../../types';
import { pointInPolygon, pointToPolygonDistance } from '../../utils/geometry';

/**
 * Match a point (typically a foot point) against the zones of one camera.
 * Multiple matches with a unique highest priority resolve to that zone; ties
 * (or no priority configured) are AMBIGUOUS.
 */
export function matchZoneAtPoint(point: NormalizedPoint, zones: DeskZone[]): ZoneMatch {
  const matched = zones.filter((z) => pointInPolygon(point, z.points));
  if (matched.length === 0) {
    return { zoneId: null, zoneName: null, ambiguous: false, matchedZoneIds: [] };
  }
  const matchedZoneIds = matched.map((z) => z.id);
  const maxPriority = Math.max(...matched.map((z) => z.priority));
  const winners = matched.filter((z) => z.priority === maxPriority);
  if (winners.length === 1) {
    return { zoneId: winners[0]!.id, zoneName: winners[0]!.name, ambiguous: false, matchedZoneIds };
  }
  return { zoneId: null, zoneName: null, ambiguous: true, matchedZoneIds };
}

/**
 * True when the point lies inside any of the zones or within `maxDistance`
 * (a fraction of frame width) of one. Used for the "wrist near desk" indicator.
 */
export function pointNearZones(
  point: NormalizedPoint,
  zones: DeskZone[],
  aspect: number,
  maxDistance: number,
): boolean {
  return zones.some((z) => pointToPolygonDistance(point, z.points, aspect) <= maxDistance);
}
