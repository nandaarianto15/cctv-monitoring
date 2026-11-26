/**
 * CameraPanel: one configured camera with its live stage, stats, tracked
 * persons and desk summary - Vyra dark theme, self-contained primitives.
 * Start/stop drives the isolated per-camera pipeline; errors surface with
 * a reconnect action.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Camera, CameraRunStatus, Employee } from '../../types';
import { useVision } from '../../state/VisionContext';
import { useEmployeeNames, useVisionSnapshot, useZones } from '../../hooks/useVision';
import { CameraStage } from './CameraStage';
import { PersonOverlay } from './PersonOverlay';
import { TrackCard } from './TrackCard';
import { Video, AlertCircle, Layers, Users } from '../icons';

/* ---------------- Local Vyra primitives (kept in-file) ---------------- */

type PillTone = 'green' | 'amber' | 'red' | 'neutral' | 'accent';

const PILL_TONES = {
  green: { cls: 'border-[#4ADE80]/20 bg-[#4ADE80]/[0.08] text-[#6EE7A0]', dot: 'bg-[#4ADE80]' },
  amber: { cls: 'border-[#E8A33D]/25 bg-[#E8A33D]/[0.08] text-[#E8B25C]', dot: 'bg-[#E8A33D]' },
  red: { cls: 'border-[#F87171]/20 bg-[#F87171]/[0.08] text-[#F8A5A5]', dot: 'bg-[#F87171]' },
  neutral: { cls: 'border-white/[0.08] bg-white/[0.03] text-[#96A0B0]', dot: 'bg-[#7E8899]' },
  accent: { cls: 'border-[#7AA2F7]/25 bg-[#7AA2F7]/[0.10] text-[#A8C4FF]', dot: 'bg-[#7AA2F7]' },
} as const;

/** Small status pill - pulse only for transient states (live/starting/error). */
function Pill({
  tone,
  dot = false,
  children,
}: {
  tone: PillTone;
  dot?: boolean;
  children: ReactNode;
}) {
  const t = PILL_TONES[tone];
  const pulse = tone === 'green' || tone === 'amber' || tone === 'red';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${t.cls}`}>
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${t.dot} ${pulse ? 'animate-pulse' : ''}`} />}
      {children}
    </span>
  );
}

function GhostButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-2.5 py-1.5 text-[11px] font-medium text-[#96A0B0] transition-colors hover:border-white/[0.16] hover:text-[#E8ECF4] disabled:pointer-events-none disabled:opacity-40"
    >
      {children}
    </button>
  );
}

/** Per-card primary action - accent tint, no gradient (gradient stays page-level). */
function SoftButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg border border-[#7AA2F7]/25 bg-[#7AA2F7]/10 px-2.5 py-1.5 text-[11px] font-semibold text-[#A8C4FF] transition-colors hover:border-[#7AA2F7]/40 hover:bg-[#7AA2F7]/20 disabled:pointer-events-none disabled:opacity-40"
    >
      {children}
    </button>
  );
}

/** Two-step destructive action: click once to arm, again to confirm. */
function ConfirmButton({
  label,
  confirmLabel,
  onConfirm,
}: {
  label: string;
  confirmLabel: string;
  onConfirm: () => void;
}) {
  const [arming, setArming] = useState(false);
  const timer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );
  const handleClick = () => {
    if (!arming) {
      setArming(true);
      timer.current = window.setTimeout(() => setArming(false), 3000);
      return;
    }
    if (timer.current !== null) window.clearTimeout(timer.current);
    setArming(false);
    onConfirm();
  };
  return (
    <button
      onClick={handleClick}
      className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
        arming
          ? 'border-[#F87171]/40 bg-[#F87171]/10 text-[#F8A5A5] hover:bg-[#F87171]/20'
          : 'border-white/[0.08] bg-white/[0.02] text-[#96A0B0] hover:border-white/[0.16] hover:text-[#E8ECF4]'
      }`}
    >
      {arming ? confirmLabel : label}
    </button>
  );
}

/** Dark spinner + label, replaces the old LoadingState primitive. */
function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-2.5">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/[0.08] border-t-[#7AA2F7]" />
      <p className="text-[11px] font-medium text-[#67717F]">{label}</p>
    </div>
  );
}

/* ---------------- Status mapping ---------------- */

const CAMERA_STATUS: Record<CameraRunStatus, { label: string; tone: PillTone }> = {
  idle: { label: 'Offline', tone: 'neutral' },
  starting: { label: 'Starting…', tone: 'amber' },
  running: { label: 'Live Feed', tone: 'green' },
  error: { label: 'Error', tone: 'red' },
};

/** Camera pipeline status (offline / starting / live / error). */
export function CameraStatusBadge({ status }: { status: CameraRunStatus }) {
  const s = CAMERA_STATUS[status];
  return (
    <Pill tone={s.tone} dot>
      {s.label}
    </Pill>
  );
}

/** Desk occupancy state - occupied earns the blue accent, everything else neutral. */
function DeskStatePill({ state }: { state: string }) {
  if (state === 'OCCUPIED') return <Pill tone="accent">Occupied</Pill>;
  if (state === 'VACANT' || state === 'FREE') return <Pill tone="neutral">Vacant</Pill>;
  return <Pill tone="neutral">{state}</Pill>;
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
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center bg-[#0A0D13]/95">
        <AlertCircle size={28} className="text-[#F87171]" />
        <p className="text-xs font-medium text-[#F8A5A5]">{snapshot.modelsError}</p>
        <GhostButton onClick={() => void controller.startCamera(camera.id)}>Retry Model Load</GhostButton>
      </div>
    ) : snapshot.modelsLoading || starting ? (
      <div className="absolute inset-0 flex items-center justify-center bg-[#0A0D13]/95">
        <LoadingState label={snapshot.modelsLoading ? 'Loading AI Vision Models…' : 'Initializing Camera Feed…'} />
      </div>
    ) : camSnapshot?.error ? (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center bg-[#0A0D13]/95">
        <AlertCircle size={28} className="text-[#F87171]" />
        <p className="text-xs font-medium text-[#F8A5A5]">{camSnapshot.error}</p>
        <GhostButton onClick={() => void controller.startCamera(camera.id)}>Reconnect Stream</GhostButton>
      </div>
    ) : undefined;

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]">
      {/* Header bar */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.05] bg-white/[0.01] px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.04]">
            <Video size={15} className={running ? 'text-[#9DB9FF]' : 'text-[#5A6474]'} />
            {running && (
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 animate-pulse rounded-full bg-[#4ADE80] ring-2 ring-[#10141C]" />
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[13.5px] font-semibold tracking-[-0.01em] text-[#E8ECF4]">{camera.label}</h2>
              <CameraStatusBadge status={status} />
            </div>
            {running && stats && (
              <span className="text-[11px] font-medium tabular-nums text-[#67717F]">
                {stats.inferenceFps.toFixed(1)} FPS · {stats.lastInferenceMs.toFixed(0)} ms latency
                {camSnapshot?.videoSize ? ` · ${camSnapshot.videoSize.width}×${camSnapshot.videoSize.height}` : ''}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {running ? (
            <GhostButton onClick={() => controller.stopCamera(camera.id)}>Stop Stream</GhostButton>
          ) : (
            <SoftButton
              disabled={snapshot.modelsLoading || starting}
              onClick={() => void controller.startCamera(camera.id)}
            >
              {status === 'error' ? 'Reconnect' : 'Start Feed'}
            </SoftButton>
          )}
          {!isLiveMonitoring && (
            <ConfirmButton
              label="Delete"
              confirmLabel="Delete camera?"
              onConfirm={() => controller.deleteCamera(camera.id)}
            />
          )}
        </div>
      </header>

      {/* Video & detection stage - deep inset canvas */}
      <div className="bg-[#05070B] p-2 sm:p-4">
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

      {/* Live information & tracked person assignment */}
      <div className="flex flex-col gap-4 border-t border-white/[0.05] bg-white/[0.01] p-5">
        {/* Desks occupancy summary */}
        {desks.length > 0 && (
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#5A6474]">
              <Layers size={12} />
              <span>Workspace Desk Zones ({desks.length})</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
              {desks.map((d) => (
                <div
                  key={d.zoneId}
                  className="flex items-center justify-between gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 transition-colors hover:bg-white/[0.04]"
                >
                  <span className="truncate text-[12px] font-semibold text-[#E8ECF4]">{d.name}</span>
                  <DeskStatePill state={d.state} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tracked persons */}
        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#5A6474]">
              <Users size={12} />
              <span>Active Person Tracks ({tracks.length})</span>
            </span>
            <span className="text-[11px] text-[#5A6474]">Temporary tracking IDs · Manual identification</span>
          </div>

          {tracks.length === 0 ? (
            <p className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-center text-[11.5px] text-[#5A6474]">
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