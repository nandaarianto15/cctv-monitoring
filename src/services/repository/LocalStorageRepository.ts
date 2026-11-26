/**
 * localStorage-backed repository. Persists metadata only - video frames are
 * never stored. Events are kept in a FIFO buffer capped at the configured
 * retention limit.
 */
import type { ConfigOverrides } from '../../config';
import type { Camera, DeskZone, Employee, TrackAssignment, VisionEvent } from '../../types';
import type { VisionRepository } from './types';

/** Minimal storage surface (matches localStorage; easy to stub in tests). */
export interface KVStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const KEYS = {
  cameras: 'eva.cameras',
  employees: 'eva.employees',
  zones: 'eva.zones',
  assignments: 'eva.assignments',
  events: 'eva.events',
  config: 'eva.config',
} as const;

export class LocalStorageRepository implements VisionRepository {
  private eventLimit: number;

  /**
   * @param storage storage backend; defaults to the browser localStorage.
   * @param eventLimit initial FIFO retention limit for events (updatable via setEventRetentionLimit).
   */
  constructor(storage: KVStorage = defaultStorage(), eventLimit: number) {
    this.storage = storage;
    this.eventLimit = Math.max(1, Math.floor(eventLimit));
  }

  setEventRetentionLimit(limit: number): void {
    this.eventLimit = Math.max(1, Math.floor(limit));
  }

  // --- Cameras ------------------------------------------------------------

  listCameras(): Camera[] {
    return this.read<Camera[]>(KEYS.cameras) ?? [];
  }

  saveCamera(camera: Camera): void {
    this.upsertByKey<Camera>(KEYS.cameras, camera, (a, b) => a.id === b.id);
  }

  deleteCamera(cameraId: string): void {
    this.write(KEYS.cameras, this.listCameras().filter((c) => c.id !== cameraId));
  }

  // --- Employees ----------------------------------------------------------

  listEmployees(): Employee[] {
    return this.read<Employee[]>(KEYS.employees) ?? [];
  }

  saveEmployee(employee: Employee): void {
    this.upsertByKey<Employee>(KEYS.employees, employee, (a, b) => a.id === b.id);
  }

  deleteEmployee(employeeId: string): void {
    this.write(KEYS.employees, this.listEmployees().filter((e) => e.id !== employeeId));
  }

  // --- Zones ----------------------------------------------------------------

  listZones(cameraId?: string): DeskZone[] {
    const zones = this.read<DeskZone[]>(KEYS.zones) ?? [];
    return cameraId === undefined ? zones : zones.filter((z) => z.cameraId === cameraId);
  }

  saveZone(zone: DeskZone): void {
    this.upsertByKey<DeskZone>(KEYS.zones, zone, (a, b) => a.id === b.id);
  }

  deleteZone(zoneId: string): void {
    this.write(KEYS.zones, this.listZones().filter((z) => z.id !== zoneId));
  }

  // --- Assignments ----------------------------------------------------------

  listAssignments(): TrackAssignment[] {
    return this.read<TrackAssignment[]>(KEYS.assignments) ?? [];
  }

  saveAssignment(assignment: TrackAssignment): void {
    this.upsertByKey<TrackAssignment>(KEYS.assignments, assignment, (a, b) => a.trackId === b.trackId);
  }

  deleteAssignment(trackId: string): void {
    this.write(KEYS.assignments, this.listAssignments().filter((a) => a.trackId !== trackId));
  }

  // --- Events ----------------------------------------------------------------

  listEvents(limit?: number): VisionEvent[] {
    const events = this.read<VisionEvent[]>(KEYS.events) ?? [];
    return limit === undefined ? events : events.slice(Math.max(0, events.length - limit));
  }

  addEvent(event: VisionEvent): void {
    const events = this.read<VisionEvent[]>(KEYS.events) ?? [];
    events.push(event);
    if (events.length > this.eventLimit) {
      events.splice(0, events.length - this.eventLimit);
    }
    this.write(KEYS.events, events);
  }

  clearEvents(): void {
    this.write(KEYS.events, []);
  }

  // --- Config ----------------------------------------------------------------

  getConfigOverrides(): ConfigOverrides {
    return this.read<ConfigOverrides>(KEYS.config) ?? {};
  }

  saveConfigOverrides(overrides: ConfigOverrides): void {
    this.write(KEYS.config, overrides);
  }

  // --- internals -------------------------------------------------------------

  private readonly storage: KVStorage;

  private read<T>(key: string): T | null {
    try {
      const raw = this.storage.getItem(key);
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    } catch (err) {
      console.warn(`[repository] failed to parse "${key}"`, err);
      return null;
    }
  }

  private write(key: string, value: unknown): void {
    try {
      this.storage.setItem(key, JSON.stringify(value));
    } catch (err) {
      // Storage full or unavailable: keep the app running without persistence.
      console.warn(`[repository] failed to persist "${key}"`, err);
    }
  }

  private upsertByKey<T>(key: string, entity: T, sameEntity: (a: T, b: T) => boolean): void {
    const list = this.read<T[]>(key) ?? [];
    const index = list.findIndex((existing) => sameEntity(existing, entity));
    if (index >= 0) {
      list[index] = entity;
    } else {
      list.push(entity);
    }
    this.write(key, list);
  }
}

function defaultStorage(): KVStorage {
  if (typeof localStorage === 'undefined') {
    throw new Error('localStorage is not available in this environment - inject a KVStorage implementation.');
  }
  return localStorage;
}
