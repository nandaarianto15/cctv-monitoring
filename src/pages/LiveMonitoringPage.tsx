/**
 * Vyra - Live Monitoring Page.
 * Premium dark theme applied in-place (self-contained - no shared kit needed):
 * - Full-bleed aurora canvas + blueprint grid, identical to Overview.
 * - Overline header with live streaming meta (pulse dot).
 * - Dark native camera switcher, dark empty state, gradient CTA.
 * - Staggered vyra-rise entrance for camera panels.
 */
import { useState } from 'react';
import type { ReactNode, ChangeEvent } from 'react';
import { useCameras, useEmployees, useVisionSnapshot } from '../hooks/useVision';
import { CameraPanel } from '../components/camera/CameraPanel';
import { Video, Camera } from '../components/icons';
import type { PageId } from '../components/navigation/Sidebar';

/* ---------------- Local primitives (Vyra recipes, kept in-file) ---------------- */

/** Primary CTA - gradient blue with glow, same recipe as the Overview header button. */
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
}: {
  value: string;
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  children: ReactNode;
  label?: string;
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

export function LiveMonitoringPage({ navigate }: { navigate: (page: PageId) => void }): JSX.Element {
  const cameras = useCameras();
  const employees = useEmployees();
  const snapshot = useVisionSnapshot();
  const [selectedCameraId, setSelectedCameraId] = useState<string>('all');

  const filteredCameras =
    selectedCameraId === 'all'
      ? cameras
      : cameras.filter((c) => c.id === selectedCameraId);

  const liveCount = snapshot.cameras.filter((c) => c.status === 'running').length;

  return (
    <div className="relative min-h-full bg-gradient-to-b from-[#0D1119] via-[#0A0D13] to-[#090C11] text-[#96A0B0]">
      <style>{`
        @keyframes vyraRise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .vyra-rise { animation: vyraRise 0.55s cubic-bezier(0.22, 1, 0.36, 1) both; }
        @media (prefers-reduced-motion: reduce) { .vyra-rise { animation: none; } }
      `}</style>

      {/* Ambient depth: aurora glow + faint blueprint grid, fading downward */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(60%_45%_at_50%_-12%,rgba(122,162,247,0.12),transparent_70%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 opacity-60 [mask-image:radial-gradient(70%_60%_at_50%_0%,black,transparent)] [background-image:linear-gradient(rgba(148,163,198,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,198,0.05)_1px,transparent_1px)] [background-size:40px_40px]" />

      <div className="relative flex flex-col gap-6 p-5 md:p-7 lg:p-8">
        {/* Header - overline, title, live meta, dark camera switcher */}
        <header className="vyra-rise flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#5A6474]">
              Workspace Surveillance
            </p>
            <h1 className="mt-2 text-[26px] font-semibold leading-tight tracking-[-0.02em] text-[#E8ECF4] md:text-[30px]">
              Live Monitoring
            </h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-[#67717F]">
              <span className="inline-flex items-center gap-1.5">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    liveCount > 0 ? 'animate-pulse bg-[#4ADE80]' : 'bg-[#5A6474]'
                  }`}
                />
                {liveCount > 0
                  ? `${liveCount} of ${cameras.length} cameras streaming`
                  : `${cameras.length} sources idle`}
              </span>
              <span className="text-[#3A424E]">·</span>
              <span>{employees.length} employees on-site</span>
            </p>
          </div>

          {cameras.length > 0 && (
            <VyraSelect
              label="Source"
              value={selectedCameraId}
              onChange={(e) => setSelectedCameraId(e.target.value)}
            >
              <option value="all">All Cameras ({cameras.length})</option>
              {cameras.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </VyraSelect>
          )}
        </header>

        {cameras.length === 0 ? (
          /* Dark empty state - panel surface, no gray card */
          <section
            className="vyra-rise rounded-2xl border border-white/[0.06] bg-white/[0.02]"
            style={{ animationDelay: '60ms' }}
          >
            <EmptyBlock
              icon={<Video size={18} />}
              title="No camera sources yet"
              hint="Register your laptop, USB, or mobile camera to begin live edge inference."
              action={
                <PrimaryButton onClick={() => navigate('cameras')}>
                  <Camera size={14} />
                  Go to Camera Management
                </PrimaryButton>
              }
            />
          </section>
        ) : (
          <div className="grid gap-5 2xl:grid-cols-2">
            {filteredCameras.map((camera, i) => (
              <div key={camera.id} className="vyra-rise" style={{ animationDelay: `${120 + i * 70}ms` }}>
                <CameraPanel camera={camera} employees={employees} isLiveMonitoring />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}