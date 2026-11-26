/**
 * Vyra - Workspace Mapping Page.
 * Premium dark theme applied in-place (self-contained - no shared kit needed):
 * - Full-bleed aurora canvas + blueprint grid, identical to Live Monitoring.
 * - Overline header with feed meta (pulse dot) + dark camera switcher.
 * - Dark native select, dark empty state, gradient CTA - identical recipes.
 * - Staggered vyra-rise entrance.
 */
import { useState } from 'react';
import type { ReactNode, ChangeEvent } from 'react';
import type { Id } from '../types';
import { useVision } from '../state/VisionContext';
import { useCameraSnapshot, useCameras } from '../hooks/useVision';
import { WorkspaceEditor } from '../components/workspace/WorkspaceEditor';
import { Layers, Camera } from '../components/icons';
import type { PageId } from '../components/navigation/Sidebar';

/* ---------------- Local primitives (Vyra recipes, kept in-file) ---------------- */

/** Primary CTA - gradient blue with glow, same recipe as the Live Monitoring header button. */
function PrimaryButton({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#5D87E8] to-[#7AA2F7] px-3.5 py-2 text-[12px] font-semibold text-white shadow-[0_10px_28px_-10px_rgba(122,162,247,0.65)] transition-all duration-200 hover:brightness-110"
    >
      {children}
    </button>
  );
}

/** Secondary dark action - bordered ghost button (used for "Stop Feed"). */
function GhostButton({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2 text-[12px] font-semibold text-[#E8ECF4] transition-all duration-200 hover:border-white/[0.16] hover:bg-white/[0.05]"
    >
      {children}
    </button>
  );
}

/** Dependency-free glyphs for the feed controls - no icon-set dependency. */
function PlayGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M7 4.8v14.4a1 1 0 0 0 1.52.85l11.2-7.2a1 1 0 0 0 0-1.7L8.52 3.95A1 1 0 0 0 7 4.8Z" />
    </svg>
  );
}

function StopGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

/** Dark-themed empty state - no gray boxes, stays on the dark canvas. */
function EmptyBlock({
  icon,
  title,
  hint,
  action,
}: {
  icon: ReactNode;
  title: string;
  hint: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03] text-[#5A6474]">
        {icon}
      </div>
      <p className="text-[13px] font-semibold text-[#96A0B0]">{title}</p>
      <p className="max-w-xs text-[11.5px] leading-relaxed text-[#5A6474]">{hint}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/** Dark native <select> - appearance-none, inline chevron, themed option list. */
function VyraSelect({
  value,
  onChange,
  children,
  label,
  ariaLabel,
}: {
  value: string;
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  children: ReactNode;
  label?: string;
  ariaLabel?: string;
}) {
  return (
    <label className="flex items-center gap-2.5">
      {label && (
        <span className="hidden text-[10px] font-semibold uppercase tracking-[0.12em] text-[#5A6474] sm:block">
          {label}
        </span>
      )}
      <div className="relative w-52">
        <select
          value={value}
          onChange={onChange}
          aria-label={ariaLabel}
          className="w-full cursor-pointer appearance-none rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2 pr-9 text-[12px] font-medium text-[#E8ECF4] outline-none transition-colors hover:border-white/[0.16] focus:border-[#7AA2F7]/40 focus:bg-[#7AA2F7]/[0.05] [&>option]:bg-[#0D1119] [&>option]:text-[#E8ECF4]"
        >
          {children}
        </select>
        {/* Inline chevron - no dependency on the icon set */}
        <svg
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#7E8899]"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
    </label>
  );
}

export function WorkspacePage({ navigate }: { navigate: (page: PageId) => void }): JSX.Element {
  const { controller } = useVision();
  const cameras = useCameras();
  const [cameraId, setCameraId] = useState<Id | null>(null);

  const selected = cameras.find((c) => c.id === cameraId) ?? cameras[0] ?? null;
  const snapshot = useCameraSnapshot(selected?.id ?? null);
  const running = snapshot?.status === 'running';

  return (
    <div className="relative min-h-full bg-gradient-to-b from-[#0D1119] via-[#0A0D13] to-[#090C11] text-[#96A0B0]">
      <style>{`
        @keyframes vyraRise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .vyra-rise { animation: vyraRise 0.55s cubic-bezier(0.22, 1, 0.36, 1) both; }
        @media (prefers-reduced-motion: reduce) { .vyra-rise { animation: none; } }
      `}</style>

      {/* Ambient depth: aurora glow + faint blueprint grid, fading downward - identical to Live Monitoring */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(60%_45%_at_50%_-12%,rgba(122,162,247,0.12),transparent_70%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 opacity-60 [mask-image:radial-gradient(70%_60%_at_50%_0%,black,transparent)] [background-image:linear-gradient(rgba(148,163,198,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,198,0.05)_1px,transparent_1px)] [background-size:40px_40px]" />

      <div className="relative flex flex-col gap-6 p-5 md:p-7 lg:p-8">
        {/* Header - overline, title, feed meta, dark camera switcher */}
        <header className="vyra-rise flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#5A6474]">
              Spatial Calibration
            </p>
            <h1 className="mt-2 text-[26px] font-semibold leading-tight tracking-[-0.02em] text-[#E8ECF4] md:text-[30px]">
              Workspace Mapping
            </h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-[#67717F]">
              <span className="inline-flex items-center gap-1.5">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    running ? 'animate-pulse bg-[#4ADE80]' : 'bg-[#5A6474]'
                  }`}
                />
                {running
                  ? 'Feed live - zones reflect occupancy in real time'
                  : 'Feed idle - start the camera to draw zones'}
              </span>
              <span className="text-[#3A424E]">·</span>
              <span>Define normalized desk polygons per camera view</span>
            </p>
          </div>

          {selected && (
            <div className="flex flex-wrap items-center gap-3">
              <VyraSelect
                label="Camera"
                ariaLabel="Camera selection"
                value={selected.id}
                onChange={(e) => setCameraId(e.target.value)}
              >
                {cameras.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </VyraSelect>
              {running ? (
                <GhostButton onClick={() => controller.stopCamera(selected.id)}>
                  <StopGlyph />
                  Stop Feed
                </GhostButton>
              ) : (
                <PrimaryButton onClick={() => void controller.startCamera(selected.id)}>
                  <PlayGlyph />
                  Start Feed
                </PrimaryButton>
              )}
            </div>
          )}
        </header>

        {!selected ? (
          /* Dark empty state - shown when no camera source exists */
          <section
            className="vyra-rise rounded-2xl border border-white/[0.06] bg-white/[0.02]"
            style={{ animationDelay: '60ms' }}
          >
            <EmptyBlock
              icon={<Layers size={18} />}
              title="No camera sources yet"
              hint="Desk zones are calibrated per camera perspective. Register a camera first to draw workspace polygons."
              action={
                <PrimaryButton onClick={() => navigate('cameras')}>
                  <Camera size={14} />
                  Go to Camera Management
                </PrimaryButton>
              }
            />
          </section>
        ) : (
          /* Editor - TS narrows `selected` to Camera in this branch */
          <div className="vyra-rise" style={{ animationDelay: '60ms' }}>
            <WorkspaceEditor camera={selected} />
          </div>
        )}
      </div>
    </div>
  );
}