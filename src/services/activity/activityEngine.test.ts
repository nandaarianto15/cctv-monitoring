import { describe, expect, it } from 'vitest';
import { computeRawActivity } from './activityEngine';
import type { WorkIndicators } from './indicators';

describe('computeRawActivity', () => {
  it('WORKING requires IN_ZONE + SITTING + a positive indicator', () => {
    const indicators: WorkIndicators = { wristNearDesk: true, headTowardDesk: null };
    expect(computeRawActivity('IN_ZONE', 'SITTING', indicators, false)).toBe('WORKING');
  });

  it('is NOT_WORKING when out of the zone, regardless of posture', () => {
    const indicators: WorkIndicators = { wristNearDesk: true, headTowardDesk: null };
    expect(computeRawActivity('OUT_ZONE', 'SITTING', indicators, false)).toBe('NOT_WORKING');
    expect(computeRawActivity('OUT_ZONE', 'STANDING', indicators, false)).toBe('NOT_WORKING');
  });

  it('is NOT_WORKING when seated in-zone with wrists observable but away from the desk', () => {
    const indicators: WorkIndicators = { wristNearDesk: false, headTowardDesk: null };
    expect(computeRawActivity('IN_ZONE', 'SITTING', indicators, false)).toBe('NOT_WORKING');
  });

  it('is UNKNOWN when wrists are not observable and head orientation is disabled', () => {
    const indicators: WorkIndicators = { wristNearDesk: null, headTowardDesk: true };
    expect(computeRawActivity('IN_ZONE', 'SITTING', indicators, false)).toBe('UNKNOWN');
  });

  it('the optional head indicator contributes evidence only when enabled', () => {
    const indicators: WorkIndicators = { wristNearDesk: null, headTowardDesk: true };
    expect(computeRawActivity('IN_ZONE', 'SITTING', indicators, true)).toBe('WORKING');
  });

  it('standing at a desk is UNKNOWN (insufficient evidence, standing desks exist)', () => {
    const indicators: WorkIndicators = { wristNearDesk: true, headTowardDesk: true };
    expect(computeRawActivity('IN_ZONE', 'STANDING', indicators, true)).toBe('UNKNOWN');
    expect(computeRawActivity('IN_ZONE', 'UNKNOWN', indicators, true)).toBe('UNKNOWN');
  });
});
