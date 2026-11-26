/**
 * Vyra - Activity History Page.
 * Premium dark theme applied in-place (self-contained - no shared kit needed):
 * - Full-bleed aurora canvas + blueprint grid, identical to Live Monitoring.
 * - Overline header with telemetry meta (pulse dot) + two-step clear-buffer CTA.
 * - Dark panels, dark state chips, color-coded methodology cards.
 * - EventFeed & EventHistogram ship their own dark surfaces.
 * - Staggered vyra-rise entrance.
 */
import { useState } from 'react';
import type { ReactNode } from 'react';
import { useVision } from '../state/VisionContext';
import { useCameras, useEmployeeNames, useEvents, useVisionSnapshot } from '../hooks/useVision';
import { EventFeed } from '../components/dashboard/EventFeed';
import { EventHistogram } from '../components/dashboard/EventHistogram';
import { Trash2, Users } from '../components/icons';

/* ---------------- Local primitives (Vyra recipes, kept in-file) ---------------- */

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

/** Two-step destructive action (dark). Auto-resets after 4s. */
function ConfirmButton({
  label,
  confirmLabel,
  icon,
  onConfirm,
}: {
  label: string;
  confirmLabel: string;
  icon?: ReactNode;
  onConfirm: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  return (
    <DarkButton
      variant={confirming ? 'danger' : 'ghost'}
      size="sm"
      icon={icon}
      onClick={() => {
        if (confirming) {
          onConfirm();
          setConfirming(false);
        } else {
          setConfirming(true);
          window.setTimeout(() => setConfirming(false), 4000);
        }
      }}
    >
      {confirming ? confirmLabel : label}
    </DarkButton>
  );
}

/** State tone mapping - Vyra accents keyed by state keywords. */
function stateTone(state: string): string {
  const s = state.toUpperCase();
  if (s.includes('NOT_WORKING')) return 'border-rose-400/25 bg-rose-400/[0.08] text-rose-300';
  if (s.includes('WORKING')) return 'border-[#4ADE80]/25 bg-[#4ADE80]/[0.08] text-[#4ADE80]';
  if (s.includes('UNKNOWN') || s.includes('NONE')) return 'border-white/[0.08] bg-white/[0.03] text-[#96A0B0]';
  if (s.includes('IN_ZONE') || s.includes('INSIDE') || s.includes('SITTING'))
    return 'border-[#7AA2F7]/25 bg-[#7AA2F7]/[0.08] text-[#7AA2F7]';
  if (s.includes('OUT') || s.includes('STANDING'))
    return 'border-[#F0B26B]/25 bg-[#F0B26B]/[0.08] text-[#F0B26B]';
  return 'border-white/[0.08] bg-white/[0.03] text-[#96A0B0]';
}

/** Dark state chip - replaces the light StateBadge primitive. */
function DarkStateBadge({ state }: { state: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] ${stateTone(state)}`}
    >
      {state.replace(/_/g, ' ')}
    </span>
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

/** Inline emphasis for rule keywords. */
const Em = ({ children }: { children: ReactNode }) => (
  <span className="font-medium text-[#E8ECF4]">{children}</span>
);

/* ---------------- Methodology copy ---------------- */

const ARCH_RULES: Array<{ title: string; titleCls: string; body: ReactNode }> = [
  {
    title: 'WORKING',
    titleCls: 'text-[#4ADE80]',
    body: (
      <>
        Requires conjunction of <Em>IN_ZONE</Em>, <Em>SITTING</Em>, and verified observable wrist
        proximity to the calibrated desk polygon.
      </>
    ),
  },
  {
    title: 'NOT_WORKING',
    titleCls: 'text-rose-300',
    body: (
      <>
        Explicit contrary observation (outside desk zone, or seated with wrists clearly positioned
        away from desk boundary).
      </>
    ),
  },
  {
    title: 'UNKNOWN',
    titleCls: 'text-[#96A0B0]',
    body: (
      <>
        Default fall-through state whenever landmarks are occluded, standing at desk, or evidence is
        partial. States are never fabricated.
      </>
    ),
  },
  {
    title: 'Zero Video Persistence',
    titleCls: 'text-[#7AA2F7]',
    body: (
      <>
        Only anonymous metadata events are persisted. Raw camera frames never leave browser memory.
      </>
    ),
  },
];

export function ActivityPage(): JSX.Element {
  const { controller } = useVision();
  const events = useEvents();
  const cameras = useCameras();
  const employeeNames = useEmployeeNames();
  const snapshot = useVisionSnapshot();

  const identifiedPersons = snapshot.cameras
    .flatMap((c) => c.tracks)
    .filter((t) => t.employeeId !== null);
  const cameraLabel = (cameraId: string): string =>
    cameras.find((c) => c.id === cameraId)?.label ?? 'Unknown Camera';

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
        {/* Header - overline, title, telemetry meta, clear-buffer CTA */}
        <header className="vyra-rise flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#5A6474]">
              Observation Ledger
            </p>
            <h1 className="mt-2 text-[26px] font-semibold leading-tight tracking-[-0.02em] text-[#E8ECF4] md:text-[30px]">
              Activity History
            </h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-[#67717F]">
              <span className="inline-flex items-center gap-1.5">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    identifiedPersons.length > 0 ? 'animate-pulse bg-[#4ADE80]' : 'bg-[#5A6474]'
                  }`}
                />
                {identifiedPersons.length > 0
                  ? `${identifiedPersons.length} staff confirmed in view`
                  : 'No staff confirmed in view'}
              </span>
              <span className="text-[#3A424E]">·</span>
              <span>
                {events.length} buffered event{events.length === 1 ? '' : 's'}
              </span>
            </p>
          </div>

          {events.length > 0 && (
            <ConfirmButton
              label="Clear Event Buffer"
              confirmLabel="Confirm Clear?"
              icon={<Trash2 size={13} />}
              onConfirm={() => controller.clearEvents()}
            />
          )}
        </header>

        <div className="grid gap-5 xl:grid-cols-[2fr_1fr]">
          {/* Main Event Timeline & Feed */}
          <div className="flex flex-col gap-5">
            <div className="vyra-rise" style={{ animationDelay: '60ms' }}>
              <DarkPanel
                title="Observation Activity Timeline"
                subtitle="Frequency histogram of recorded state changes"
              >
                <div className="overflow-x-auto py-1">
                  <EventHistogram events={events} />
                </div>
              </DarkPanel>
            </div>

            <div className="vyra-rise" style={{ animationDelay: '120ms' }}>
              <DarkPanel
                title={`Telemetry Event Log (${events.length})`}
                subtitle="Filtered stream of occupancy, posture, and activity transitions"
              >
                <EventFeed
                  events={events}
                  cameras={cameras}
                  employeeNames={employeeNames}
                  showFilters
                  emptyHint="State transitions appear as tracked persons move between zones, change posture, or trigger activity signals."
                />
              </DarkPanel>
            </div>
          </div>

          {/* Live Status & Methodology Sidebar */}
          <div className="flex flex-col gap-5">
            {/* Active Identified Persons */}
            <div className="vyra-rise" style={{ animationDelay: '180ms' }}>
              <DarkPanel
                title="Live Identified Personnel"
                subtitle={`${identifiedPersons.length} staff currently confirmed in view`}
              >
                {identifiedPersons.length === 0 ? (
                  <EmptyBlock
                    icon={<Users size={18} />}
                    title="No Active Staff Assigned"
                    hint="Manually assign employees to confirmed tracks in Live Monitoring to observe active states."
                  />
                ) : (
                  <ul className="flex flex-col gap-2.5">
                    {identifiedPersons.map((track) => (
                      <li
                        key={track.trackId}
                        className="flex flex-col gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-[12px] font-semibold text-[#E8ECF4]">
                            {track.employeeId ? employeeNames.get(track.employeeId) : '-'}
                          </span>
                          <span className="shrink-0 text-[11px] font-medium text-[#5A6474]">
                            {cameraLabel(track.cameraId)}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <DarkStateBadge state={track.state.occupancy} />
                          <DarkStateBadge state={track.state.posture} />
                          <DarkStateBadge state={track.state.activity} />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </DarkPanel>
            </div>

            {/* AI Inference Architecture */}
            <div className="vyra-rise" style={{ animationDelay: '240ms' }}>
              <DarkPanel title="State Derivation Architecture" subtitle="Independent temporal estimation rules">
                <div className="flex flex-col gap-3 text-[12px] leading-relaxed text-[#96A0B0]">
                  {ARCH_RULES.map((rule) => (
                    <div key={rule.title} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
                      <span className={`text-[11px] font-semibold tracking-[0.08em] ${rule.titleCls}`}>
                        {rule.title}
                      </span>
                      <p className="mt-1 text-[11.5px]">{rule.body}</p>
                    </div>
                  ))}
                </div>
              </DarkPanel>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}