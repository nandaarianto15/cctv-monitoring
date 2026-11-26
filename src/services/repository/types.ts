/**
 * Persistence boundary. The UI and services depend on this interface only, so
 * localStorage can later be replaced by a PostgreSQL/API adapter without UI
 * changes.
 */
import type { ConfigOverrides } from '../../config';
import type { Camera, DeskZone, Employee, TrackAssignment, VisionEvent } from '../../types';

export interface VisionRepository {
  // Cameras
  listCameras(): Camera[];
  saveCamera(camera: Camera): void;
  deleteCamera(cameraId: string): void;

  // Employees
  listEmployees(): Employee[];
  saveEmployee(employee: Employee): void;
  deleteEmployee(employeeId: string): void;

  // Desk zones (optionally scoped to one camera)
  listZones(cameraId?: string): DeskZone[];
  saveZone(zone: DeskZone): void;
  deleteZone(zoneId: string): void;

  // Track ↔ employee assignments
  listAssignments(): TrackAssignment[];
  saveAssignment(assignment: TrackAssignment): void;
  deleteAssignment(trackId: string): void;

  // Events - chronological (oldest first), FIFO-capped at retentionLimit
  listEvents(limit?: number): VisionEvent[];
  addEvent(event: VisionEvent): void;
  clearEvents(): void;
  /** Live-updates the FIFO retention limit (from config). */
  setEventRetentionLimit(limit: number): void;

  // Config overrides
  getConfigOverrides(): ConfigOverrides;
  saveConfigOverrides(overrides: ConfigOverrides): void;
}
