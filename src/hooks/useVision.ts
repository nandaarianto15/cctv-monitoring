/**
 * Data hooks: bridge between React and the VisionController store.
 * Snapshot data flows through useSyncExternalStore; repository data is
 * re-read whenever the controller's version counter changes.
 */
import { useCallback, useMemo, useSyncExternalStore } from 'react';
import type { Camera, CameraSnapshot, DeskZone, Employee, Id, TrackAssignment, VisionEvent, VisionSnapshot } from '../types';
import { useVision } from '../state/VisionContext';

export function useVisionSnapshot(): VisionSnapshot {
  const { controller } = useVision();
  const subscribe = useCallback((cb: () => void) => controller.subscribe(cb), [controller]);
  const getSnapshot = useCallback(() => controller.getSnapshot(), [controller]);
  return useSyncExternalStore(subscribe, getSnapshot);
}

function useRepoVersion(): number {
  const { controller } = useVision();
  const subscribe = useCallback((cb: () => void) => controller.subscribe(cb), [controller]);
  const getVersion = useCallback(() => controller.getRepoVersion(), [controller]);
  return useSyncExternalStore(subscribe, getVersion);
}

export function useCameras(): Camera[] {
  const { controller } = useVision();
  const version = useRepoVersion();
  return useMemo(() => controller.listCameras(), [controller, version]);
}

export function useEmployees(): Employee[] {
  const { controller } = useVision();
  const version = useRepoVersion();
  return useMemo(() => controller.listEmployees(), [controller, version]);
}

export function useZones(cameraId?: Id | null): DeskZone[] {
  const { controller } = useVision();
  const version = useRepoVersion();
  return useMemo(
    () => (cameraId ? controller.listZones(cameraId) : controller.listZones()),
    [controller, cameraId, version],
  );
}

export function useEvents(limit?: number): VisionEvent[] {
  const { controller } = useVision();
  const version = useRepoVersion();
  return useMemo(() => controller.listEvents(limit), [controller, limit, version]);
}

export function useAssignments(): TrackAssignment[] {
  const { controller } = useVision();
  const version = useRepoVersion();
  return useMemo(() => controller.listAssignments(), [controller, version]);
}

export function useCameraSnapshot(cameraId: Id | null): CameraSnapshot | null {
  const snapshot = useVisionSnapshot();
  return useMemo(() => snapshot.cameras.find((c) => c.cameraId === cameraId) ?? null, [snapshot, cameraId]);
}

export function useEmployeeNames(): Map<Id, string> {
  const employees = useEmployees();
  return useMemo(() => new Map(employees.map((e) => [e.id, e.name])), [employees]);
}

/** The live <video> element of a running camera (re-evaluated on snapshot changes). */
export function useVideoElement(cameraId: Id | null): HTMLVideoElement | null {
  const { controller } = useVision();
  const snapshot = useVisionSnapshot();
  const camera = snapshot.cameras.find((c) => c.cameraId === cameraId);
  if (camera?.status === 'running' && cameraId) {
    return controller.getVideoElement(cameraId);
  }
  return null;
}
