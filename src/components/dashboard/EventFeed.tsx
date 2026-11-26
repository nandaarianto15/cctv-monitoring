/**
 * Telemetry event stream with camera/category/text filters.
 * Vyra dark treatment (self-contained): dark badge, select, search, list in-file.
 */
import { useMemo, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import type { Camera, EventField, Id, VisionEvent } from '../../types';
import { formatDateTime, shortTrackId } from '../../utils/format';
import { History, ArrowRight } from '../icons';

const FIELD_LABELS: Record<EventField, string> = {
  occupancy: 'Occupancy',
  posture: 'Posture',
  activity: 'Activity',
  deskState: 'Desk State',
  assignment: 'Assignment',
};

type Tone = 'zinc' | 'green' | 'amber' | 'rose' | 'blue';

const FIELD_TONES: Record<EventField, Tone> = {
  occupancy: 'green',
  posture: 'blue',
  activity: 'zinc',
  deskState: 'amber',
  assignment: 'blue',
};

const TONE_CLASSES: Record<Tone, string> = {
  zinc: 'border-white/[0.08] bg-white/[0.03] text-[#96A0B0]',
  green: 'border-[#4ADE80]/25 bg-[#4ADE80]/[0.08] text-[#4ADE80]',
  amber: 'border-[#F0B26B]/25 bg-[#F0B26B]/[0.08] text-[#F0B26B]',
  rose: 'border-rose-400/25 bg-rose-400/[0.08] text-rose-300',
  blue: 'border-[#7AA2F7]/25 bg-[#7AA2F7]/[0.08] text-[#7AA2F7]',
};

const INPUT_CLASS =
  'w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-[12px] font-medium text-[#E8ECF4] placeholder:text-[#5A6474] outline-none transition-colors hover:border-white/[0.16] focus:border-[#7AA2F7]/40 focus:bg-[#7AA2F7]/[0.05] [&>option]:bg-[#0D1119] [&>option]:text-[#E8ECF4]';

/** Dark pill badge. */
function DarkBadge({ tone = 'zinc', className = '', children }: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] ${TONE_CLASSES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/** Dark native <select> — full-width, inline chevron. */
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

/** Dark search input with inline magnifier glyph. */
function DarkSearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <svg
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#5A6474]"
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`${INPUT_CLASS} pl-9`}
      />
    </div>
  );
}

/** Dark-themed empty state — no gray boxes, stays on the dark canvas. */
function DarkEmptyState({
  icon,
  title,
  hint,
}: {
  icon: ReactNode;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03] text-[#5A6474]">
        {icon}
      </div>
      <p className="text-[13px] font-semibold text-[#96A0B0]">{title}</p>
      {hint && <p className="max-w-xs text-[11.5px] leading-relaxed text-[#5A6474]">{hint}</p>}
    </div>
  );
}

interface EventFeedProps {
  events: VisionEvent[];
  cameras: Camera[];
  employeeNames: Map<Id, string>;
  showFilters?: boolean;
  emptyHint?: string;
  limit?: number;
}

export function EventFeed({
  events,
  cameras,
  employeeNames,
  showFilters = false,
  emptyHint,
  limit,
}: EventFeedProps) {
  const [cameraFilter, setCameraFilter] = useState('');
  const [fieldFilter, setFieldFilter] = useState('');
  const [query, setQuery] = useState('');

  const cameraName = (cameraId: string): string =>
    cameras.find((c) => c.id === cameraId)?.label ?? shortTrackId(cameraId);

  const rows = useMemo(() => {
    const newestFirst = [...events].reverse();
    const q = query.trim().toLowerCase();
    const filtered = newestFirst.filter((e) => {
      if (cameraFilter !== '' && e.cameraId !== cameraFilter) return false;
      if (fieldFilter !== '' && e.field !== fieldFilter) return false;
      if (q === '') return true;
      const subject =
        e.field === 'assignment' && e.subjectId ? e.subjectId : shortTrackId(e.subjectId);
      const haystack = [
        cameraName(e.cameraId),
        FIELD_LABELS[e.field],
        subject,
        e.from ?? '',
        e.to ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });

    return limit ? filtered.slice(0, limit) : filtered;
  }, [events, cameraFilter, fieldFilter, query, cameras, limit]);

  return (
    <div className="flex flex-col gap-3">
      {showFilters && (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          <DarkSelect
            value={cameraFilter}
            onChange={(e) => setCameraFilter(e.target.value)}
            ariaLabel="Filter by camera"
          >
            <option value="">All cameras</option>
            {cameras.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </DarkSelect>
          <DarkSelect
            value={fieldFilter}
            onChange={(e) => setFieldFilter(e.target.value)}
            ariaLabel="Filter by event category"
          >
            <option value="">All event categories</option>
            {(Object.keys(FIELD_LABELS) as EventField[]).map((f) => (
              <option key={f} value={f}>
                {FIELD_LABELS[f]}
              </option>
            ))}
          </DarkSelect>
          <DarkSearchInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search event subject or status…"
          />
        </div>
      )}

      {rows.length === 0 ? (
        <DarkEmptyState
          icon={<History size={18} />}
          title="No events recorded"
          hint={emptyHint ?? 'State transitions appear here once a camera runs and persons are tracked.'}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02]">
          <ul className="flex max-h-[30rem] flex-col divide-y divide-white/[0.05] overflow-y-auto">
            {rows.map((event) => {
              const isEmployeeValue = event.field === 'assignment';
              const from = formatValue(event.from, isEmployeeValue, employeeNames);
              const to = formatValue(event.to, isEmployeeValue, employeeNames);
              return (
                <li
                  key={event.id}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 px-4 py-3 text-[12px] transition-colors hover:bg-white/[0.03]"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] font-medium text-[#5A6474]">
                      {formatDateTime(event.ts)}
                    </span>
                    <DarkBadge tone={FIELD_TONES[event.field]}>{FIELD_LABELS[event.field]}</DarkBadge>
                    <span className="font-medium text-[#E8ECF4]">
                      {event.field === 'assignment'
                        ? 'Track ' + shortTrackId(event.subjectId)
                        : event.field === 'deskState'
                        ? 'Zone ' + event.subjectId
                        : 'Track ' + shortTrackId(event.subjectId)}
                    </span>
                    <span className="text-[#3A424E]">·</span>
                    <span className="inline-flex items-center gap-1.5 font-medium">
                      <span className="text-[#5A6474] line-through">{from}</span>
                      <ArrowRight size={12} className="text-[#5A6474]" />
                      <span className="font-semibold text-[#7AA2F7]">{to}</span>
                    </span>
                  </div>
                  <span className="text-[11px] font-medium text-[#5A6474]">
                    {cameraName(event.cameraId)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function formatValue(
  value: string | null,
  isEmployee: boolean,
  employeeNames: Map<Id, string>
): string {
  if (value === null || value === '') return 'none';
  if (isEmployee) return employeeNames.get(value) ?? shortTrackId(value);
  return value;
}