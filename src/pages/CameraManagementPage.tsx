/**
 * Vyra - Camera Management Page.
 * Premium dark theme applied in-place (self-contained - no shared kit needed):
 * - Full-bleed aurora canvas + blueprint grid, identical to Live Monitoring.
 * - Overline header with endpoint meta (pulse dot) + scan/register CTAs.
 * - Dark form fields (device select, label input, facing mode), dark error alert.
 * - Dark empty state; CameraPanel grid with staggered vyra-rise entrance.
 */
import { useCallback, useEffect, useState } from 'react';
import type { ReactNode, ChangeEvent } from 'react';
import { useVision } from '../state/VisionContext';
import { useCameras, useEmployees, useVisionSnapshot } from '../hooks/useVision';
import { listVideoInputDevices, type VideoDeviceInfo } from '../services/camera/devices';
import { CameraPanel } from '../components/camera/CameraPanel';
import { Camera, RefreshCw, Plus, AlertCircle } from '../components/icons';

/* ---------------- Local primitives (Vyra recipes, kept in-file) ---------------- */

const INPUT_CLASS =
  'w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-[12px] font-medium text-[#E8ECF4] placeholder:text-[#5A6474] outline-none transition-colors hover:border-white/[0.16] focus:border-[#7AA2F7]/40 focus:bg-[#7AA2F7]/[0.05] [&>option]:bg-[#0D1119] [&>option]:text-[#E8ECF4]';

/** Dark button - gradient primary, ghost secondary, danger for destructive. */
function DarkButton({
  variant = 'primary',
  size = 'md',
  disabled = false,
  icon,
  onClick,
  children,
}: {
  variant?: 'primary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  disabled?: boolean;
  icon?: ReactNode;
  onClick?: () => void;
  children: ReactNode;
}) {
  const sizes = {
    sm: 'px-3 py-1.5 text-[11.5px]',
    md: 'px-3.5 py-2 text-[12px]',
  } as const;
  const variants = {
    primary:
      'bg-gradient-to-r from-[#5D87E8] to-[#7AA2F7] text-white shadow-[0_10px_28px_-10px_rgba(122,162,247,0.65)] hover:brightness-110',
    ghost:
      'border border-white/[0.08] bg-white/[0.02] text-[#E8ECF4] hover:border-white/[0.16] hover:bg-white/[0.05]',
    danger:
      'border border-rose-500/30 bg-rose-500/[0.08] text-rose-300 hover:bg-rose-500/[0.16]',
  } as const;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40 ${sizes[size]} ${variants[variant]}`}
    >
      {icon}
      {children}
    </button>
  );
}

/** Dark panel - Card replacement: soft header strip + padded body. */
function DarkPanel({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] bg-white/[0.015] px-5 py-3.5">
        <div className="min-w-0">
          <h3 className="truncate text-[13px] font-semibold text-[#E8ECF4]">{title}</h3>
          {subtitle && <p className="mt-0.5 text-[11.5px] text-[#5A6474]">{subtitle}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </header>
      <div className="p-4 md:p-5">{children}</div>
    </section>
  );
}

/** Dark field wrapper - uppercase micro-label + optional hint. */
function DarkField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#5A6474]">
        {label}
      </span>
      {children}
      {hint && <p className="text-[11px] leading-relaxed text-[#5A6474]">{hint}</p>}
    </div>
  );
}

/** Dark native <select> - full-width, inline chevron, themed option list. */
function DarkSelect({
  value,
  onChange,
  children,
  ariaLabel,
}: {
  value: string;
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  children: ReactNode;
  ariaLabel?: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={onChange}
        aria-label={ariaLabel}
        className={`${INPUT_CLASS} cursor-pointer appearance-none pr-9`}
      >
        {children}
      </select>
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
        aria-hidden="true"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  );
}

function DarkTextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={INPUT_CLASS}
    />
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

export function CameraManagementPage(): JSX.Element {
  const { controller } = useVision();
  const cameras = useCameras();
  const employees = useEmployees();
  const snapshot = useVisionSnapshot();

  const [devices, setDevices] = useState<VideoDeviceInfo[]>([]);
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState('');
  const [label, setLabel] = useState('');
  const [facingMode, setFacingMode] = useState<'user' | 'environment' | ''>('');
  const [isAdding, setIsAdding] = useState(false);

  const liveCount = snapshot.cameras.filter((c) => c.status === 'running').length;

  const refreshDevices = useCallback(async () => {
    try {
      const list = await listVideoInputDevices();
      setDevices(list);
      setDeviceError(null);
    } catch {
      setDeviceError('Could not enumerate camera devices. Camera APIs require HTTPS or localhost.');
    }
  }, []);

  useEffect(() => {
    void refreshDevices();
  }, [refreshDevices]);

  const usingDefaultDevice = deviceId === '';

  const addCamera = (): void => {
    const device = devices.find((d) => d.deviceId === deviceId);
    const name = label.trim() || device?.label || `Camera ${cameras.length + 1}`;
    controller.addCamera({ label: name, deviceId: deviceId || null, facingMode: facingMode || null });
    setLabel('');
    setIsAdding(false);
  };

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
        {/* Header - overline, title, endpoint meta, scan/register CTAs */}
        <header className="vyra-rise flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#5A6474]">
              Edge Capture Sources
            </p>
            <h1 className="mt-2 text-[26px] font-semibold leading-tight tracking-[-0.02em] text-[#E8ECF4] md:text-[30px]">
              Camera Management
            </h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-[#67717F]">
              <span className="inline-flex items-center gap-1.5">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    liveCount > 0 ? 'animate-pulse bg-[#4ADE80]' : 'bg-[#5A6474]'
                  }`}
                />
                {liveCount > 0
                  ? `${liveCount} of ${cameras.length} endpoints streaming`
                  : cameras.length > 0
                  ? `${cameras.length} endpoints idle`
                  : 'No endpoints registered'}
              </span>
              <span className="text-[#3A424E]">·</span>
              <span>
                {devices.length} device{devices.length === 1 ? '' : 's'} discovered
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <DarkButton
              variant="ghost"
              size="sm"
              icon={<RefreshCw size={14} />}
              onClick={() => void refreshDevices()}
            >
              Scan Devices
            </DarkButton>
            {!isAdding && (
              <DarkButton
                variant="primary"
                size="sm"
                icon={<Plus size={14} />}
                onClick={() => setIsAdding(true)}
              >
                Add Camera
              </DarkButton>
            )}
          </div>
        </header>

        {/* Register New Video Endpoint */}
        {isAdding && (
          <div className="vyra-rise" style={{ animationDelay: '60ms' }}>
            <DarkPanel
              title="Register New Video Endpoint"
              subtitle="Configure video source parameters for isolated per-camera processing"
              actions={
                <DarkButton variant="ghost" size="sm" onClick={() => setIsAdding(false)}>
                  Cancel
                </DarkButton>
              }
            >
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <DarkField label="Camera Device" hint="Available video devices discovered via WebRTC">
                  <DarkSelect
                    value={deviceId}
                    onChange={(e) => setDeviceId(e.target.value)}
                    ariaLabel="Camera device"
                  >
                    <option value="">Default System Camera</option>
                    {devices.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label}
                      </option>
                    ))}
                  </DarkSelect>
                </DarkField>

                <DarkField
                  label="Camera Name / Label"
                  hint="Human-readable identifier (e.g., Office Desk 1)"
                >
                  <DarkTextInput
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="e.g. Reception Front Desk"
                  />
                </DarkField>

                {usingDefaultDevice && (
                  <DarkField
                    label="Smartphone Facing Mode"
                    hint="Rear camera is ideal for broad room monitoring"
                  >
                    <DarkSelect
                      value={facingMode}
                      onChange={(e) => setFacingMode(e.target.value as 'user' | 'environment' | '')}
                      ariaLabel="Smartphone facing mode"
                    >
                      <option value="">Automatic</option>
                      <option value="user">Front-facing (User)</option>
                      <option value="environment">Rear-facing (Environment)</option>
                    </DarkSelect>
                  </DarkField>
                )}
              </div>

              {deviceError && (
                <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-rose-500/25 bg-rose-500/[0.06] px-3.5 py-2.5 text-[11.5px] font-medium text-rose-300">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{deviceError}</span>
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <DarkButton variant="primary" size="sm" onClick={addCamera}>
                  Save Camera
                </DarkButton>
                <DarkButton variant="ghost" size="sm" onClick={() => setIsAdding(false)}>
                  Cancel
                </DarkButton>
              </div>
            </DarkPanel>
          </div>
        )}

        {/* Registered Cameras List / Management Cards */}
        {cameras.length === 0 ? (
          /* Dark empty state - panel surface, no gray card */
          <section
            className="vyra-rise rounded-2xl border border-white/[0.06] bg-white/[0.02]"
            style={{ animationDelay: '120ms' }}
          >
            <EmptyBlock
              icon={<Camera size={18} />}
              title="No Cameras Configured"
              hint="Add your integrated laptop webcam, USB conference cam, or mobile device to start vision observation."
              action={
                <DarkButton
                  variant="primary"
                  icon={<Plus size={14} />}
                  onClick={() => setIsAdding(true)}
                >
                  Add Your First Camera
                </DarkButton>
              }
            />
          </section>
        ) : (
          <div className="grid gap-5 2xl:grid-cols-2">
            {cameras.map((camera, i) => (
              <div key={camera.id} className="vyra-rise" style={{ animationDelay: `${120 + i * 70}ms` }}>
                <CameraPanel camera={camera} employees={employees} isLiveMonitoring={false} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}