/**
 * CameraPanel: one configured camera with its live stage, stats, tracked
 * persons and desk summary. Start/stop drives the isolated per-camera
 * pipeline; errors surface with a reconnect action.
 */
import { useMemo } from 'react';
import type { Camera, CameraRunStatus, Employee } from '../../types';
import { useVision } from '../../state/VisionContext';
import { useEmployeeNames, useVisionSnapshot, useZones } from '../../hooks/useVision';
import { Badge, Button, ConfirmButton, LoadingState, StateBadge, type BadgeTone } from '../ui/primitives';
import { CameraStage } from './CameraStage';
import { PersonOverlay } from './PersonOverlay';
import { TrackCard } from './TrackCard';
import { Video, AlertCircle, Layers, Users } from '../icons';

const CAMERA_STATUS_TONE: Record<CameraRunStatus, BadgeTone> = {
  idle: 'zinc',
  starting: 'amber',
  running: 'green',
  error: 'rose',
};

const CAMERA_STATUS_LABEL: Record<CameraRunStatus, string> = {
  idle: 'Offline',
  starting: 'Starting…',
  running: 'Live Feed',
  error: 'Error',
};

/** Camera pipeline status (offline / starting / live / error). */
export function CameraStatusBadge({ status }: { status: CameraRunStatus }) {
  return (
    <Badge tone={CAMERA_STATUS_TONE[status]} dot>
      {CAMERA_STATUS_LABEL[status]}
    </Badge>
  );
}

export function CameraPanel({
  camera,
  employees,
  isLiveMonitoring = false,
}: {
  camera: Camera;
  employees: Employee[];
  isLiveMonitoring?: boolean;
}) {
  const { controller } = useVision();
  const snapshot = useVisionSnapshot();
  const employeeNames = useEmployeeNames();
  const zones = useZones(camera.id);
  const camSnapshot = useMemo(
    () => snapshot.cameras.find((c) => c.cameraId === camera.id) ?? null,
    [snapshot, camera.id],
  );

  const status: CameraRunStatus = camSnapshot?.status ?? 'idle';
  const running = status === 'running';
  const starting = status === 'starting';
  const tracks = camSnapshot?.tracks ?? [];
  const desks = camSnapshot?.desks ?? [];
  const stats = camSnapshot?.stats;

  const placeholder =
    snapshot.modelsError && status !== 'running' ? (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center bg-saas-bg">
        <AlertCircle size={28} className="text-saas-error" />
        <p className="text-xs font-medium text-saas-error">{snapshot.modelsError}</p>
        <Button variant="secondary" size="sm" onClick={() => void controller.startCamera(camera.id)}>
          Retry Model Load
        </Button>
      </div>
    ) : snapshot.modelsLoading || starting ? (
      <div className="absolute inset-0 flex items-center justify-center bg-saas-bg">
        <LoadingState label={snapshot.modelsLoading ? 'Loading AI Vision Models…' : 'Initializing Camera Feed…'} />
      </div>
    ) : camSnapshot?.error ? (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center bg-saas-bg">
        <AlertCircle size={28} className="text-saas-error" />
        <p className="text-xs font-medium text-saas-error">{camSnapshot.error}</p>
        <Button variant="secondary" size="sm" onClick={() => void controller.startCamera(camera.id)}>
          Reconnect Stream
        </Button>
      </div>
    ) : undefined;

  return (
    <div className="flex flex-col rounded-xl border border-saas-border bg-white shadow-subtle overflow-hidden">
      {/* Header bar */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-saas-border bg-white px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-saas-bg text-saas-secondary">
            <Video size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-tight text-saas-primary">{camera.label}</h2>
              <CameraStatusBadge status={status} />
            </div>
            {running && stats && (
              <span className="text-[11px] font-medium text-saas-secondary">
                {stats.inferenceFps.toFixed(1)} FPS · {stats.lastInferenceMs.toFixed(0)} ms latency
                {camSnapshot?.videoSize ? ` · ${camSnapshot.videoSize.width}×${camSnapshot.videoSize.height}` : ''}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {running ? (
            <Button variant="secondary" size="sm" onClick={() => controller.stopCamera(camera.id)}>
              Stop Stream
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              disabled={snapshot.modelsLoading || starting}
              onClick={() => void controller.startCamera(camera.id)}
            >
              {status === 'error' ? 'Reconnect' : 'Start Feed'}
            </Button>
          )}
          {!isLiveMonitoring && (
            <ConfirmButton
              label="Delete"
              confirmLabel="Delete camera?"
              variant="ghost"
              size="sm"
              onConfirm={() => controller.deleteCamera(camera.id)}
            />
          )}
        </div>
      </header>

      {/* Video & detection stage */}
      <div className="bg-slate-900 p-2 sm:p-4">
        <CameraStage
          cameraId={camera.id}
          videoSize={camSnapshot?.videoSize ?? null}
          placeholder={placeholder}
        >
          {(dims) =>
            dims && running ? (
              <PersonOverlay
                width={dims.width}
                height={dims.height}
                tracks={tracks}
                zones={zones}
                desks={desks}
                employeeNames={employeeNames}
              />
            ) : null
          }
        </CameraStage>
      </div>

      {/* Live Information & Tracked Person Assignment Panel */}
      <div className="flex flex-col gap-4 border-t border-saas-border bg-saas-bg/40 p-5">
        {/* Desks occupancy summary */}
        {desks.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-saas-secondary uppercase tracking-wider mb-2">
              <Layers size={14} />
              <span>Workspace Desk Zones ({desks.length})</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
              {desks.map((d) => (
                <div
                  key={d.zoneId}
                  className="flex items-center justify-between rounded-lg border border-saas-border bg-white px-3 py-2 shadow-subtle"
                >
                  <span className="text-xs font-semibold text-saas-primary">{d.name}</span>
                  <StateBadge state={d.state} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tracked persons */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-saas-secondary uppercase tracking-wider">
              <Users size={14} />
              <span>Active Person Tracks ({tracks.length})</span>
            </span>
            <span className="text-[11px] text-saas-secondary">
              Temporary tracking IDs · Manual identification
            </span>
          </div>

          {tracks.length === 0 ? (
            <p className="rounded-lg border border-dashed border-saas-border bg-white/50 px-4 py-3 text-xs text-saas-secondary text-center">
              {running
                ? 'No persons currently detected in frame.'
                : 'Start the camera stream to detect persons and derive telemetry.'}
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {tracks.map((track) => (
                <TrackCard
                  key={track.trackId}
                  track={track}
                  employees={employees}
                  employeeNames={employeeNames}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
