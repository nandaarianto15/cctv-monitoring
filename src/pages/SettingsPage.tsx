/**
 * Vyra - System Settings Page.
 * Premium dark theme applied in-place (self-contained - no shared kit needed):
 * - Full-bleed aurora canvas + blueprint grid, identical to Live Monitoring.
 * - Overline header with config sync meta + Save/Restore actions.
 * - Dark setting rows with unit-suffixed numeric steppers.
 * - Dark privacy guarantee callout; staggered vyra-rise panels.
 */
import { useEffect, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import type { AppConfig } from '../config';
import { useVision } from '../state/VisionContext';
import { Check, Shield } from '../components/icons';

/* ---------------- Local primitives (Vyra recipes, kept in-file) ---------------- */

/** Dark panel - Card replacement: soft header strip + padded body. */
function DarkPanel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] bg-white/[0.015] px-5 py-3.5">
        <div className="min-w-0">
          <h3 className="truncate text-[13px] font-semibold text-[#E8ECF4]">{title}</h3>
          {subtitle && <p className="mt-0.5 text-[11.5px] text-[#5A6474]">{subtitle}</p>}
        </div>
      </header>
      <div className="p-4 md:p-5">{children}</div>
    </section>
  );
}

/** Dark button - gradient primary / ghost. */
function DarkButton({
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
  children,
}: {
  variant?: 'primary' | 'ghost';
  size?: 'sm' | 'md';
  disabled?: boolean;
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
  } as const;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40 ${sizes[size]} ${variants[variant]}`}
    >
      {children}
    </button>
  );
}

/** Dark numeric stepper with unit suffix - mirrors the NumberInput primitive API. */
function DarkNumberInput({
  value,
  unit,
  min,
  max,
  step,
  onChange,
}: {
  value: string;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="relative w-32 shrink-0">
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={onChange}
        className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2 pr-11 text-[12px] font-medium text-[#E8ECF4] outline-none transition-colors hover:border-white/[0.16] focus:border-[#7AA2F7]/40 focus:bg-[#7AA2F7]/[0.05]"
      />
      {unit && (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#5A6474]">
          {unit}
        </span>
      )}
    </div>
  );
}

export function SettingsPage(): JSX.Element {
  const { config, updateConfig, resetConfig } = useVision();
  const [draft, setDraft] = useState<AppConfig>(() => config);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    setDraft(config);
  }, [config]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(config);

  const setNumber = (section: keyof AppConfig, field: string, value: number): void => {
    setDraft((prev) => ({
      ...prev,
      [section]: { ...(prev[section] as Record<string, unknown>), [field]: value },
    }) as AppConfig);
  };

  const handleSave = () => {
    updateConfig(draft);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  const numberRow = (
    label: string,
    section: keyof AppConfig,
    field: string,
    opts: { unit?: string; min?: number; max?: number; step?: number; hint?: string } = {}
  ): JSX.Element => (
    <div className="flex items-center justify-between gap-4 border-b border-white/[0.05] py-3 last:border-b-0">
      <div className="min-w-0">
        <span className="block text-[12px] font-semibold text-[#E8ECF4]">{label}</span>
        {opts.hint && <span className="text-[11px] leading-relaxed text-[#5A6474]">{opts.hint}</span>}
      </div>
      <DarkNumberInput
        value={String((draft[section] as Record<string, unknown>)[field])}
        unit={opts.unit}
        min={opts.min}
        max={opts.max}
        step={opts.step}
        onChange={(e) => {
          const v = e.target.valueAsNumber;
          if (Number.isFinite(v)) setNumber(section, field, v);
        }}
      />
    </div>
  );

  return (
    <div className="relative min-h-full [color-scheme:dark] bg-gradient-to-b from-[#0D1119] via-[#0A0D13] to-[#090C11] text-[#96A0B0]">
      <style>{`
        @keyframes vyraRise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .vyra-rise { animation: vyraRise 0.55s cubic-bezier(0.22, 1, 0.36, 1) both; }
        @media (prefers-reduced-motion: reduce) { .vyra-rise { animation: none; } }
      `}</style>

      {/* Ambient depth: aurora glow + faint blueprint grid, fading downward - identical to Live Monitoring */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(60%_45%_at_50%_-12%,rgba(122,162,247,0.12),transparent_70%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 opacity-60 [mask-image:radial-gradient(70%_60%_at_50%_0%,black,transparent)] [background-image:linear-gradient(rgba(148,163,198,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,198,0.05)_1px,transparent_1px)] [background-size:40px_40px]" />

      <div className="relative flex flex-col gap-6 p-5 md:p-7 lg:p-8">
        {/* Header - overline, title, config sync meta, actions */}
        <header className="vyra-rise flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#5A6474]">
              Engine Configuration
            </p>
            <h1 className="mt-2 text-[26px] font-semibold leading-tight tracking-[-0.02em] text-[#E8ECF4] md:text-[30px]">
              System Settings
            </h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-[#67717F]">
              <span className="inline-flex items-center gap-1.5">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    dirty ? 'animate-pulse bg-[#F0B26B]' : 'bg-[#4ADE80]'
                  }`}
                />
                {dirty ? 'Unsaved changes pending' : 'Configuration in sync'}
              </span>
              <span className="text-[#3A424E]">·</span>
              <span>
                Detection confidence, temporal smoothing, capture, and repository retention
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {savedNotice && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#4ADE80]/25 bg-[#4ADE80]/[0.08] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#4ADE80]">
                <Check size={12} />
                Saved successfully
              </span>
            )}
            <DarkButton variant="ghost" size="sm" onClick={resetConfig}>
              Restore Defaults
            </DarkButton>
            <DarkButton variant="primary" size="sm" disabled={!dirty} onClick={handleSave}>
              Save Changes
            </DarkButton>
          </div>
        </header>

        <div className="grid gap-5 lg:grid-cols-2">
          {/* Inference Budget */}
          <div className="vyra-rise" style={{ animationDelay: '60ms' }}>
            <DarkPanel
              title="Inference Engine Budget"
              subtitle="Frame processing rate and model confidence thresholds"
            >
              {numberRow('Max Inference Frame Rate', 'inference', 'maxFps', {
                unit: 'fps',
                min: 1,
                max: 30,
                step: 1,
                hint: 'Cap inference to conserve battery and CPU/GPU resources',
              })}
              {numberRow('Frame Scale Max Width', 'inference', 'frameMaxWidth', {
                unit: 'px',
                min: 320,
                max: 1280,
                step: 32,
                hint: 'Downscaled input dimension before feeding detector',
              })}
              {numberRow('Min Person Confidence', 'inference', 'minPersonConfidence', {
                min: 0.1,
                max: 0.95,
                step: 0.05,
                hint: 'COCO-SSD score required to register a detection',
              })}
              {numberRow('Max Persons Handled', 'inference', 'maxPersons', {
                min: 1,
                max: 20,
                step: 1,
                hint: 'Maximum concurrent detected persons per frame',
              })}
              {numberRow('Simultaneous Pose Estimations', 'inference', 'maxPoses', {
                min: 1,
                max: 4,
                step: 1,
                hint: 'MediaPipe PoseLandmarker concurrent pose instances',
              })}
            </DarkPanel>
          </div>

          {/* Tracking & Continuity */}
          <div className="vyra-rise" style={{ animationDelay: '120ms' }}>
            <DarkPanel
              title="Tracking & Occlusion Grace"
              subtitle="IoU spatial associations and track confirmation"
            >
              {numberRow('IoU Matching Threshold', 'tracking', 'iouThreshold', {
                min: 0.05,
                max: 0.9,
                step: 0.05,
                hint: 'Minimum bounding box overlap for track continuity',
              })}
              {numberRow('Pose Matching IoU', 'tracking', 'poseMatchIouThreshold', {
                min: 0.05,
                max: 0.9,
                step: 0.05,
                hint: 'Overlap between person box and pose landmark bounds',
              })}
              {numberRow('Frames to Confirm Track', 'tracking', 'confirmFrames', {
                min: 1,
                max: 10,
                step: 1,
                hint: 'Consecutive detections before status transitions to CONFIRMED',
              })}
              {numberRow('Lost Track Grace Window', 'tracking', 'lostGraceMs', {
                unit: 'ms',
                min: 500,
                max: 10000,
                step: 250,
                hint: 'Duration a track survives brief camera occlusion',
              })}
              {numberRow('Track Expiry Timeout', 'tracking', 'expiryMs', {
                unit: 'ms',
                min: 2000,
                max: 60000,
                step: 1000,
                hint: 'When expired, manual staff assignment is safely unlinked',
              })}
              {numberRow('Bounding Box Smoothing EMA', 'tracking', 'bboxSmoothing', {
                min: 0.1,
                max: 1.0,
                step: 0.05,
                hint: 'Exponential moving average: 0.1 = heavy filter, 1.0 = raw',
              })}
            </DarkPanel>
          </div>

          {/* Temporal Smoothing */}
          <div className="vyra-rise" style={{ animationDelay: '180ms' }}>
            <DarkPanel
              title="Temporal State Smoothing"
              subtitle="Debouncing and dwell times to prevent state flicker"
            >
              {numberRow('State Dwell Time', 'temporal', 'dwellMs', {
                unit: 'ms',
                min: 250,
                max: 10000,
                step: 250,
                hint: 'Continuous observation required before updating state display',
              })}
              {numberRow('Away Hold Duration', 'temporal', 'awayMs', {
                unit: 'ms',
                min: 1000,
                max: 60000,
                step: 1000,
                hint: 'Grace period before missing observation reverts to UNKNOWN',
              })}
            </DarkPanel>
          </div>

          {/* Activity & Posture Heuristics */}
          <div className="vyra-rise" style={{ animationDelay: '240ms' }}>
            <DarkPanel
              title="Posture & Activity Heuristics"
              subtitle="Geometric angle thresholds and wrist proximity constraints"
            >
              {numberRow('Min Landmark Visibility', 'posture', 'minVisibility', {
                min: 0.1,
                max: 0.95,
                step: 0.05,
                hint: 'MediaPipe landmark visibility threshold',
              })}
              {numberRow('Sitting Knee Angle Limit', 'posture', 'sittingKneeAngleDeg', {
                unit: 'deg',
                min: 60,
                max: 130,
                step: 5,
                hint: 'Angles below this contribute to SITTING state',
              })}
              {numberRow('Standing Knee Angle Limit', 'posture', 'standingKneeAngleDeg', {
                unit: 'deg',
                min: 130,
                max: 180,
                step: 5,
                hint: 'Angles above this contribute to STANDING state',
              })}
              {numberRow('Wrist Proximity Distance', 'activity', 'wristNearZoneDistance', {
                min: 0.01,
                max: 0.3,
                step: 0.01,
                hint: 'Max fraction of frame width for wrist to count as near desk',
              })}
            </DarkPanel>
          </div>

          {/* Data Retention & Privacy */}
          <div className="vyra-rise lg:col-span-2" style={{ animationDelay: '300ms' }}>
            <DarkPanel
              title="Data Retention & Privacy"
              subtitle="Local storage repository buffer size"
            >
              {numberRow('Telemetry Event Retention Limit', 'events', 'retentionLimit', {
                min: 100,
                max: 10000,
                step: 100,
                hint: 'FIFO maximum event records retained in LocalStorage',
              })}
              <div className="mt-4 rounded-xl border border-[#7AA2F7]/25 bg-[#7AA2F7]/[0.06] p-3.5 text-[12px] leading-relaxed text-[#96A0B0]">
                <div className="mb-1 flex items-center gap-2 text-[12px] font-semibold text-[#E8ECF4]">
                  <Shield size={14} className="text-[#7AA2F7]" />
                  <span>Zero Video Storage Guarantee</span>
                </div>
                Frames from getUserMedia are processed transiently in WebGL memory. No images or
                video streams are ever stored or uploaded.
              </div>
            </DarkPanel>
          </div>
        </div>
      </div>
    </div>
  );
}