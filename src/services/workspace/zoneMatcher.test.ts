import { describe, expect, it } from 'vitest';
import { matchZoneAtPoint, pointNearZones } from './zoneMatcher';
import type { DeskZone, NormalizedPoint } from '../../types';

function zone(id: string, points: Array<[number, number]>, priority = 0): DeskZone {
  return {
    id,
    cameraId: 'cam1',
    name: `Zone ${id}`,
    priority,
    createdAt: 0,
    points: points.map(([x, y]) => ({ x, y })),
  };
}

const deskA = zone('a', [
  [0.1, 0.5],
  [0.4, 0.5],
  [0.4, 0.9],
  [0.1, 0.9],
]);
const deskB = zone('b', [
  [0.5, 0.5],
  [0.8, 0.5],
  [0.8, 0.9],
  [0.5, 0.9],
]);
// Overlaps deskB in x ∈ [0.5, 0.6].
const deskC = zone('c', [
  [0.3, 0.5],
  [0.6, 0.5],
  [0.6, 0.9],
  [0.3, 0.9],
]);

describe('matchZoneAtPoint (occupancy)', () => {
  it('resolves a foot point inside exactly one zone', () => {
    const match = matchZoneAtPoint({ x: 0.25, y: 0.8 }, [deskA, deskB]);
    expect(match.zoneId).toBe('a');
    expect(match.zoneName).toBe('Zone a');
    expect(match.ambiguous).toBe(false);
    expect(match.matchedZoneIds).toEqual(['a']);
  });

  it('reports no match for a foot point outside every zone (OUT_ZONE)', () => {
    const match = matchZoneAtPoint({ x: 0.45, y: 0.2 }, [deskA, deskB]);
    expect(match.zoneId).toBeNull();
    expect(match.ambiguous).toBe(false);
    expect(match.matchedZoneIds).toEqual([]);
  });

  it('marks multiple matches AMBIGUOUS when no priority is configured', () => {
    const match = matchZoneAtPoint({ x: 0.55, y: 0.7 }, [deskA, deskB, deskC]);
    expect(match.ambiguous).toBe(true);
    expect(match.zoneId).toBeNull();
    expect([...match.matchedZoneIds].sort()).toEqual(['b', 'c']);
  });

  it('resolves ambiguity via explicit priority', () => {
    const prioritized = { ...deskC, priority: 5 };
    const match = matchZoneAtPoint({ x: 0.55, y: 0.7 }, [deskA, deskB, prioritized]);
    expect(match.ambiguous).toBe(false);
    expect(match.zoneId).toBe('c');
  });

  it('stays AMBIGUOUS when priorities are equal', () => {
    const p1 = { ...deskB, priority: 2 };
    const p2 = { ...deskC, priority: 2 };
    const match = matchZoneAtPoint({ x: 0.55, y: 0.7 }, [deskA, p1, p2]);
    expect(match.ambiguous).toBe(true);
    expect(match.zoneId).toBeNull();
  });
});

describe('pointNearZones (wrist indicator)', () => {
  const inside: NormalizedPoint = { x: 0.25, y: 0.8 };
  const justOutside: NormalizedPoint = { x: 0.44, y: 0.7 };
  const farOutside: NormalizedPoint = { x: 0.48, y: 0.7 };

  it('is true for points inside the zone', () => {
    expect(pointNearZones(inside, [deskA], 1, 0.05)).toBe(true);
  });

  it('is true within the distance threshold of the zone', () => {
    expect(pointNearZones(justOutside, [deskA], 1, 0.05)).toBe(true);
  });

  it('is false beyond the distance threshold', () => {
    expect(pointNearZones(farOutside, [deskA], 1, 0.05)).toBe(false);
  });

  it('checks any of several zones', () => {
    expect(pointNearZones({ x: 0.52, y: 0.7 }, [deskA, deskB], 1, 0.05)).toBe(true);
  });
});
