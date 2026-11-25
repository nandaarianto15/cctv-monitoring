/**
 * Geometry helpers. All coordinates are normalized (0..1, origin top-left)
 * unless stated otherwise. Distances are expressed in *frame-width units*:
 * x is already a width fraction, y is scaled by `aspect` (width / height).
 */
import type { NormalizedBBox, NormalizedPoint } from '../types';

/** Bottom-center of a bounding box — the "foot point" used for zone containment. */
export function footPoint(bbox: NormalizedBBox): NormalizedPoint {
  return { x: bbox.x + bbox.width / 2, y: bbox.y + bbox.height };
}

export function bboxCenter(bbox: NormalizedBBox): NormalizedPoint {
  return { x: bbox.x + bbox.width / 2, y: bbox.y + bbox.height / 2 };
}

export function iou(a: NormalizedBBox, b: NormalizedBBox): number {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);
  const interW = x2 - x1;
  const interH = y2 - y1;
  if (interW <= 0 || interH <= 0) return 0;
  const inter = interW * interH;
  const union = a.width * a.height + b.width * b.height - inter;
  if (union <= 0) return 0;
  return inter / union;
}

/** Ray-casting point-in-polygon (even-odd rule). Polygons with < 3 points contain nothing. */
export function pointInPolygon(p: NormalizedPoint, polygon: NormalizedPoint[]): boolean {
  if (polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const pi = polygon[i]!;
    const pj = polygon[j]!;
    const crosses = (pi.y > p.y) !== (pj.y > p.y);
    if (!crosses) continue;
    const xAtY = ((pj.x - pi.x) * (p.y - pi.y)) / (pj.y - pi.y) + pi.x;
    if (p.x < xAtY) inside = !inside;
  }
  return inside;
}

/** Bounding box of a polygon (expects a non-empty array). */
export function polygonBBox(points: NormalizedPoint[]): NormalizedBBox {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/** Shoelace area in normalized squared units (sign reflects winding). */
export function polygonArea(points: NormalizedPoint[]): number {
  let sum = 0;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const pi = points[i]!;
    const pj = points[j]!;
    sum += (pj.x + pi.x) * (pj.y - pi.y);
  }
  return sum / 2;
}

/**
 * Minimum distance from a point to a polygon boundary, in frame-width units.
 * Returns 0 when the point is inside the polygon, Infinity for degenerate polygons.
 */
export function pointToPolygonDistance(
  p: NormalizedPoint,
  polygon: NormalizedPoint[],
  aspect: number,
): number {
  if (polygon.length < 3) return Infinity;
  if (pointInPolygon(p, polygon)) return 0;
  let min = Infinity;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const d = distancePointToSegment(p, polygon[j]!, polygon[i]!, aspect);
    if (d < min) min = d;
  }
  return min;
}

function distancePointToSegment(
  p: NormalizedPoint,
  a: NormalizedPoint,
  b: NormalizedPoint,
  aspect: number,
): number {
  const ax = a.x;
  const ay = a.y * aspect;
  const bx = b.x;
  const by = b.y * aspect;
  const px = p.x;
  const py = p.y * aspect;
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  let t = 0;
  if (lenSq > 0) {
    t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
  }
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

export function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/** A usable desk polygon has at least 3 distinct vertices. */
export function isValidZonePolygon(points: NormalizedPoint[]): boolean {
  if (points.length < 3) return false;
  const seen = new Set<string>();
  for (const p of points) {
    const key = `${p.x.toFixed(4)},${p.y.toFixed(4)}`;
    if (seen.has(key)) return false;
    seen.add(key);
  }
  return true;
}
