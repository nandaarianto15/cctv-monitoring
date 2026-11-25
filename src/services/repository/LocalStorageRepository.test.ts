import { describe, expect, it } from 'vitest';
import { makeVisionEvent } from '../../utils/events';
import type { Camera, DeskZone, Employee } from '../../types';
import { LocalStorageRepository, type KVStorage } from './LocalStorageRepository';

class MemoryStorage implements KVStorage {
  private readonly map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
}

function makeCamera(id: string): Camera {
  return { id, label: `Camera ${id}`, kind: 'usermedia', deviceId: null, facingMode: null, createdAt: 1 };
}

function makeEmployee(id: string): Employee {
  return { id, name: `Employee ${id}`, role: '', notes: '', active: true, createdAt: 1 };
}

function makeZone(id: string, cameraId: string): DeskZone {
  return {
    id,
    cameraId,
    name: `Zone ${id}`,
    points: [
      { x: 0.1, y: 0.5 },
      { x: 0.4, y: 0.5 },
      { x: 0.4, y: 0.9 },
      { x: 0.1, y: 0.9 },
    ],
    priority: 0,
    createdAt: 1,
  };
}

describe('LocalStorageRepository', () => {
  it('round-trips cameras, employees, zones and assignments', () => {
    const repo = new LocalStorageRepository(new MemoryStorage(), 1000);
    repo.saveCamera(makeCamera('cam1'));
    repo.saveEmployee(makeEmployee('emp1'));
    repo.saveZone(makeZone('z1', 'cam1'));
    repo.saveZone(makeZone('z2', 'cam2'));
    repo.saveAssignment({ trackId: 't1', cameraId: 'cam1', employeeId: 'emp1', assignedAt: 5 });

    expect(repo.listCameras().map((c) => c.id)).toEqual(['cam1']);
    expect(repo.listEmployees().map((e) => e.id)).toEqual(['emp1']);
    expect(repo.listZones().map((z) => z.id).sort()).toEqual(['z1', 'z2']);
    expect(repo.listZones('cam1').map((z) => z.id)).toEqual(['z1']);
    expect(repo.listAssignments()).toEqual([{ trackId: 't1', cameraId: 'cam1', employeeId: 'emp1', assignedAt: 5 }]);
  });

  it('updates entities by id instead of duplicating', () => {
    const repo = new LocalStorageRepository(new MemoryStorage(), 1000);
    repo.saveCamera(makeCamera('cam1'));
    const renamed = { ...makeCamera('cam1'), label: 'Desk cam' };
    repo.saveCamera(renamed);
    expect(repo.listCameras()).toHaveLength(1);
    expect(repo.listCameras()[0]!.label).toBe('Desk cam');

    repo.saveAssignment({ trackId: 't1', cameraId: 'cam1', employeeId: 'emp1', assignedAt: 5 });
    repo.saveAssignment({ trackId: 't1', cameraId: 'cam1', employeeId: 'emp2', assignedAt: 6 });
    expect(repo.listAssignments()).toHaveLength(1);
    expect(repo.listAssignments()[0]!.employeeId).toBe('emp2');
  });

  it('deletes entities', () => {
    const repo = new LocalStorageRepository(new MemoryStorage(), 1000);
    repo.saveCamera(makeCamera('cam1'));
    repo.saveEmployee(makeEmployee('emp1'));
    repo.saveZone(makeZone('z1', 'cam1'));
    repo.deleteCamera('cam1');
    repo.deleteEmployee('emp1');
    repo.deleteZone('z1');
    expect(repo.listCameras()).toHaveLength(0);
    expect(repo.listEmployees()).toHaveLength(0);
    expect(repo.listZones()).toHaveLength(0);
  });

  it('applies FIFO retention to events', () => {
    const repo = new LocalStorageRepository(new MemoryStorage(), 5);
    for (let i = 0; i < 8; i += 1) {
      repo.addEvent(makeVisionEvent('activity', { ts: i, cameraId: 'cam1', subjectId: 't1', from: null, to: 'WORKING' }));
    }
    const events = repo.listEvents();
    expect(events).toHaveLength(5);
    expect(events[0]!.ts).toBe(3);
    expect(events[4]!.ts).toBe(7);
    expect(repo.listEvents(2).map((e) => e.ts)).toEqual([6, 7]);
  });

  it('supports live changes of the retention limit', () => {
    const repo = new LocalStorageRepository(new MemoryStorage(), 10);
    for (let i = 0; i < 10; i += 1) {
      repo.addEvent(makeVisionEvent('activity', { ts: i, cameraId: 'cam1', subjectId: 't1', from: null, to: 'WORKING' }));
    }
    repo.setEventRetentionLimit(3);
    repo.addEvent(makeVisionEvent('activity', { ts: 99, cameraId: 'cam1', subjectId: 't1', from: null, to: 'WORKING' }));
    expect(repo.listEvents().map((e) => e.ts)).toEqual([8, 9, 99]);
  });

  it('clears events and round-trips config overrides', () => {
    const repo = new LocalStorageRepository(new MemoryStorage(), 10);
    repo.addEvent(makeVisionEvent('deskState', { ts: 1, cameraId: 'cam1', subjectId: 'z1', from: null, to: 'OCCUPIED' }));
    repo.clearEvents();
    expect(repo.listEvents()).toHaveLength(0);

    repo.saveConfigOverrides({ temporal: { dwellMs: 2500 } });
    expect(repo.getConfigOverrides()).toEqual({ temporal: { dwellMs: 2500 } });
  });

  it('starts empty on a fresh storage', () => {
    const repo = new LocalStorageRepository(new MemoryStorage(), 10);
    expect(repo.listCameras()).toEqual([]);
    expect(repo.listEmployees()).toEqual([]);
    expect(repo.listZones()).toEqual([]);
    expect(repo.listAssignments()).toEqual([]);
    expect(repo.listEvents()).toEqual([]);
    expect(repo.getConfigOverrides()).toEqual({});
  });
});
