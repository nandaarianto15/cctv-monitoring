/**
 * VisionController: the single orchestration point between the UI and the
 * services. Owns the repository, live config, model lifecycle and the map of
 * per-camera pipelines. The UI never touches services directly.
 */
import { DEFAULT_CONFIG, mergeConfig, type AppConfig, type ConfigOverrides } from '../../config';
import type { Camera, DeskZone, Employee, Id, TrackAssignment, VisionEvent, VisionSnapshot } from '../../types';
import { createId } from '../../utils/id';
import { makeVisionEvent } from '../../utils/events';
import { createCameraSource } from '../camera/CameraSource';
import { CocoSsdPersonDetector, type PersonDetector } from '../detection/personDetector';
import { CameraPipeline } from '../pipeline/CameraPipeline';
import { MediaPipePoseDetector, type PoseDetector } from '../pose/poseLandmarker';
import type { VisionRepository } from '../repository/types';

export interface AddCameraInput {
  label: string;
  deviceId: string | null;
  facingMode: 'user' | 'environment' | null;
}

export class VisionController {
  private config: AppConfig;
  private readonly pipelines = new Map<Id, CameraPipeline>();
  private models: { detector: PersonDetector; pose: PoseDetector } | null = null;
  private modelsLoading = false;
  private modelsError: string | null = null;
  private snapshot: VisionSnapshot;
  private readonly listeners = new Set<() => void>();
  /** Bumped on every mutation — lets React re-read repository data. */
  private version = 0;

  constructor(
    private readonly repository: VisionRepository,
    overrides: ConfigOverrides | null,
  ) {
    this.config = mergeConfig(DEFAULT_CONFIG, overrides);
    this.repository.setEventRetentionLimit(this.config.events.retentionLimit);
    this.snapshot = { cameras: [], modelsLoading: false, modelsError: null, modelsReady: false };
  }

  // --- store (useSyncExternalStore-compatible) -------------------------------

  getSnapshot(): VisionSnapshot {
    return this.snapshot;
  }

  /** Incremented whenever repository data or the snapshot changes. */
  getRepoVersion(): number {
    return this.version;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // --- repository read accessors (for UI hooks) -------------------------------

  listCameras(): Camera[] {
    return this.repository.listCameras();
  }

  listEmployees(): Employee[] {
    return this.repository.listEmployees();
  }

  listZones(cameraId?: Id): DeskZone[] {
    return this.repository.listZones(cameraId);
  }

  listEvents(limit?: number): VisionEvent[] {
    return this.repository.listEvents(limit);
  }

  listAssignments(): TrackAssignment[] {
    return this.repository.listAssignments();
  }

  // --- config -----------------------------------------------------------------

  get currentConfig(): AppConfig {
    return this.config;
  }

  updateConfig(overrides: ConfigOverrides): void {
    this.config = mergeConfig(DEFAULT_CONFIG, overrides);
    this.repository.saveConfigOverrides(overrides);
    this.repository.setEventRetentionLimit(this.config.events.retentionLimit);
    this.notify();
  }

  resetConfig(): void {
    this.updateConfig({});
  }

  // --- models -------------------------------------------------------------------

  async ensureModels(): Promise<boolean> {
    if (this.models) return true;
    if (this.modelsLoading) return false;
    this.modelsLoading = true;
    this.modelsError = null;
    this.notify();
    try {
      const [detector, pose] = await Promise.all([
        CocoSsdPersonDetector.load(
          this.config.models.personDetectorBase,
          this.config.models.personDetectorModelUrl,
        ),
        MediaPipePoseDetector.load(this.config.models, this.config.inference.maxPoses),
      ]);
      this.models = { detector, pose };
      return true;
    } catch (err) {
      this.modelsError =
        err instanceof Error
          ? `Failed to load AI models: ${err.message}`
          : 'Failed to load AI models.';
      return false;
    } finally {
      this.modelsLoading = false;
      this.notify();
    }
  }

  // --- cameras --------------------------------------------------------------------

  getVideoElement(cameraId: Id): HTMLVideoElement | null {
    return this.pipelines.get(cameraId)?.getVideoElement() ?? null;
  }

  async startCamera(cameraId: Id): Promise<void> {
    const camera = this.repository.listCameras().find((c) => c.id === cameraId);
    if (!camera) return;
    const loaded = await this.ensureModels();
    if (!loaded || !this.models) return;
    // Restarting always creates a fresh pipeline with clean per-camera state.
    const existing = this.pipelines.get(cameraId);
    if (existing) {
      existing.dispose();
      this.pipelines.delete(cameraId);
    }
    const pipeline = new CameraPipeline(camera, this.models.detector, this.models.pose, {
      getZones: (cid) => this.repository.listZones(cid),
      getConfig: () => this.config,
      getAssignment: (tid) => this.repository.listAssignments().find((a) => a.trackId === tid) ?? null,
      onEvent: (event) => {
        this.repository.addEvent(event);
        this.notify();
      },
      onTrackExpired: (cid, tid) => this.invalidateAssignment(cid, tid),
      onSnapshot: () => this.notify(),
      now: () => Date.now(),
    });
    this.pipelines.set(cameraId, pipeline);
    await pipeline.start(
      createCameraSource(camera, {
        idealWidth: this.config.camera.idealCaptureWidth,
        idealHeight: this.config.camera.idealCaptureHeight,
      }),
    );
  }

  stopCamera(cameraId: Id): void {
    const pipeline = this.pipelines.get(cameraId);
    if (!pipeline) return;
    pipeline.dispose();
    this.pipelines.delete(cameraId);
    this.notify();
  }

  stopAllCameras(): void {
    for (const cameraId of [...this.pipelines.keys()]) {
      this.stopCamera(cameraId);
    }
  }

  addCamera(input: AddCameraInput): Camera {
    const camera: Camera = {
      id: createId('cam'),
      label: input.label,
      kind: 'usermedia',
      deviceId: input.deviceId || null,
      facingMode: input.facingMode,
      createdAt: Date.now(),
    };
    this.repository.saveCamera(camera);
    this.notify();
    return camera;
  }

  saveCamera(camera: Camera): void {
    this.repository.saveCamera(camera);
    this.notify();
  }

  deleteCamera(cameraId: Id): void {
    this.stopCamera(cameraId);
    this.repository.deleteCamera(cameraId);
    for (const zone of this.repository.listZones(cameraId)) {
      this.repository.deleteZone(zone.id);
    }
    for (const assignment of this.repository.listAssignments().filter((a) => a.cameraId === cameraId)) {
      this.repository.deleteAssignment(assignment.trackId);
    }
    this.notify();
  }

  // --- employees --------------------------------------------------------------------

  addEmployee(input: { name: string; role: string; notes: string }): Employee {
    const employee: Employee = {
      id: createId('emp'),
      name: input.name,
      role: input.role,
      notes: input.notes,
      active: true,
      createdAt: Date.now(),
    };
    this.repository.saveEmployee(employee);
    this.notify();
    return employee;
  }

  saveEmployee(employee: Employee): void {
    this.repository.saveEmployee(employee);
    this.notify();
  }

  deleteEmployee(employeeId: Id): void {
    this.repository.deleteEmployee(employeeId);
    for (const assignment of this.repository.listAssignments().filter((a) => a.employeeId === employeeId)) {
      this.repository.deleteAssignment(assignment.trackId);
      this.repository.addEvent(
        makeVisionEvent('assignment', {
          ts: Date.now(),
          cameraId: assignment.cameraId,
          subjectId: assignment.trackId,
          from: employeeId,
          to: null,
        }),
      );
    }
    this.notify();
  }

  // --- zones ---------------------------------------------------------------------------

  saveZone(zone: DeskZone): void {
    this.repository.saveZone(zone);
    this.notify();
  }

  deleteZone(zoneId: Id): void {
    this.repository.deleteZone(zoneId);
    this.notify();
  }

  // --- assignments (manual only) ---------------------------------------------------------

  /** Assign (or reassign) an employee to a track. Requires a CONFIRMED track. */
  assignTrack(cameraId: Id, trackId: Id, employeeId: Id): void {
    const snapshotCamera = this.snapshot.cameras.find((c) => c.cameraId === cameraId);
    const track = snapshotCamera?.tracks.find((t) => t.trackId === trackId);
    if (!track || track.status !== 'CONFIRMED') return;
    const existing = this.repository.listAssignments().find((a) => a.trackId === trackId);
    this.repository.saveAssignment({ trackId, cameraId, employeeId, assignedAt: Date.now() });
    this.repository.addEvent(
      makeVisionEvent('assignment', {
        ts: Date.now(),
        cameraId,
        subjectId: trackId,
        from: existing?.employeeId ?? null,
        to: employeeId,
      }),
    );
    this.notify();
  }

  unassignTrack(trackId: Id): void {
    const existing = this.repository.listAssignments().find((a) => a.trackId === trackId);
    if (!existing) return;
    this.repository.deleteAssignment(trackId);
    this.repository.addEvent(
      makeVisionEvent('assignment', {
        ts: Date.now(),
        cameraId: existing.cameraId,
        subjectId: trackId,
        from: existing.employeeId,
        to: null,
      }),
    );
    this.notify();
  }

  clearEvents(): void {
    this.repository.clearEvents();
    this.notify();
  }

  dispose(): void {
    this.stopAllCameras();
    this.models?.detector.dispose();
    this.models?.pose.close();
    this.models = null;
  }

  // --- internals ---------------------------------------------------------------------------

  private invalidateAssignment(cameraId: Id, trackId: Id): void {
    const existing = this.repository.listAssignments().find((a) => a.trackId === trackId);
    if (!existing) return;
    this.repository.deleteAssignment(trackId);
    this.repository.addEvent(
      makeVisionEvent('assignment', {
        ts: Date.now(),
        cameraId,
        subjectId: trackId,
        from: existing.employeeId,
        to: null,
      }),
    );
    this.notify();
  }

  private notify(): void {
    this.version += 1;
    this.rebuildSnapshot();
    for (const listener of this.listeners) {
      listener();
    }
  }

  private rebuildSnapshot(): void {
    this.snapshot = {
      cameras: [...this.pipelines.values()].map((p) => p.getView()),
      modelsLoading: this.modelsLoading,
      modelsError: this.modelsError,
      modelsReady: this.models !== null,
    };
  }
}
