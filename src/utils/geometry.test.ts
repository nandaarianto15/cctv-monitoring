import { describe, expect, it } from 'vitest';
import {
  footPoint,
  iou,
  isValidZonePolygon,
  pointInPolygon,
  pointToPolygonDistance,
} from './geometry';

const square = [
  { x: 0.25, y: 0.25 },
  { x: 0.75, y: 0.25 },
  { x: 0.75, y: 0.75 },
  { x: 0.25, y: 0.75 },
];

describe('footPoint', () => {
  it('returns the bottom-center of a bbox', () => {
    const point = footPoint({ x: 0.1, y: 0.2, width: 0.4, height: 0.3 });
    expect(point.x).toBeCloseTo(0.3);
    expect(point.y).toBeCloseTo(0.5);
  });
});

describe('pointInPolygon', () => {
  it('contains interior points', () => {
    expect(pointInPolygon({ x: 0.5, y: 0.5 }, square)).toBe(true);
  });

  it('excludes exterior points', () => {
    expect(pointInPolygon({ x: 0.1, y: 0.5 }, square)).toBe(false);
    expect(pointInPolygon({ x: 0.9, y: 0.9 }, square)).toBe(false);
  });

  it('rejects degenerate polygons', () => {
    expect(pointInPolygon({ x: 0.5, y: 0.5 }, square.slice(0, 2))).toBe(false);
  });

  it('handles non-convex (L-shaped) polygons', () => {
    const lShape = [
      { x: 0, y: 0 },
      { x: 0.4, y: 0 },
      { x: 0.4, y: 0.5 },
      { x: 0.8, y: 0.5 },
      { x: 0.8, y: 1 },
      { x: 0, y: 1 },
    ];
    expect(pointInPolygon({ x: 0.2, y: 0.8 }, lShape)).toBe(true);
    expect(pointInPolygon({ x: 0.6, y: 0.2 }, lShape)).toBe(false);
    expect(pointInPolygon({ x: 0.6, y: 0.8 }, lShape)).toBe(true);
  });
});

describe('iou', () => {
  it('is 1 for identical boxes', () => {
    const a = { x: 0, y: 0, width: 0.5, height: 0.5 };
    expect(iou(a, { ...a })).toBe(1);
  });

  it('is 0 for disjoint boxes', () => {
    expect(iou({ x: 0, y: 0, width: 0.2, height: 0.2 }, { x: 0.5, y: 0.5, width: 0.2, height: 0.2 })).toBe(0);
  });

  it('computes the overlap ratio', () => {
    const a = { x: 0, y: 0, width: 0.4, height: 0.4 };
    const b = { x: 0.2, y: 0.2, width: 0.4, height: 0.4 };
    expect(iou(a, b)).toBeCloseTo(0.04 / 0.28);
  });
});

describe('pointToPolygonDistance', () => {
  it('is 0 when inside', () => {
    expect(pointToPolygonDistance({ x: 0.5, y: 0.5 }, square, 1)).toBe(0);
  });

  it('measures the distance to the nearest edge (aspect 1)', () => {
    expect(pointToPolygonDistance({ x: 0.5, y: 0.15 }, square, 1)).toBeCloseTo(0.1);
  });

  it('scales y by the aspect ratio (width units)', () => {
    expect(pointToPolygonDistance({ x: 0.5, y: 0.15 }, square, 2)).toBeCloseTo(0.2);
  });

  it('is Infinity for degenerate polygons', () => {
    expect(pointToPolygonDistance({ x: 0.5, y: 0.5 }, square.slice(0, 2), 1)).toBe(Infinity);
  });
});

describe('isValidZonePolygon', () => {
  it('requires at least 3 distinct points', () => {
    expect(isValidZonePolygon(square)).toBe(true);
    expect(isValidZonePolygon(square.slice(0, 2))).toBe(false);
    expect(isValidZonePolygon([{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 1 }])).toBe(false);
  });
});
