import { useMemo, useState } from 'react';
import type { Camera, EventField, Id, VisionEvent } from '../../types';
import { Badge, EmptyState, SelectInput, TextInput } from '../ui/primitives';
import { formatDateTime, shortTrackId } from '../../utils/format';
import { History } from '../icons';

const FIELD_LABELS: Record<EventField, string> = {
  occupancy: 'Occupancy',
  posture: 'Posture',
  activity: 'Activity',
  deskState: 'Desk State',
  assignment: 'Assignment',
};

const FIELD_TONES: Record<EventField, 'zinc' | 'green' | 'amber' | 'rose' | 'blue'> = {
  occupancy: 'green',
  posture: 'blue',
  activity: 'zinc',
  deskState: 'amber',
  assignment: 'blue',
};

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
          <div>
            <SelectInput value={cameraFilter} onChange={(e) => setCameraFilter(e.target.value)}>
              <option value="">All cameras</option>
              {cameras.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </SelectInput>
          </div>
          <div>
            <SelectInput value={fieldFilter} onChange={(e) => setFieldFilter(e.target.value)}>
              <option value="">All event categories</option>
              {(Object.keys(FIELD_LABELS) as EventField[]).map((f) => (
                <option key={f} value={f}>
                  {FIELD_LABELS[f]}
                </option>
              ))}
            </SelectInput>
          </div>
          <div className="relative">
            <TextInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search event subject or status…"
            />
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState
          icon={<History size={24} />}
          title="No events recorded"
          hint={emptyHint ?? 'State transitions appear here once a camera runs and persons are tracked.'}
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-saas-border bg-white shadow-subtle">
          <ul className="flex max-h-[30rem] flex-col divide-y divide-saas-border overflow-y-auto">
            {rows.map((event) => {
              const isEmployeeValue = event.field === 'assignment';
              const from = formatValue(event.from, isEmployeeValue, employeeNames);
              const to = formatValue(event.to, isEmployeeValue, employeeNames);
              return (
                <li
                  key={event.id}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 px-4 py-3 text-xs transition-colors hover:bg-saas-bg/50"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] font-medium text-saas-secondary">
                      {formatDateTime(event.ts)}
                    </span>
                    <Badge tone={FIELD_TONES[event.field]} className="uppercase text-[10px]">
                      {FIELD_LABELS[event.field]}
                    </Badge>
                    <span className="font-medium text-saas-primary">
                      {event.field === 'assignment'
                        ? 'Track ' + shortTrackId(event.subjectId)
                        : event.field === 'deskState'
                        ? 'Zone ' + event.subjectId
                        : 'Track ' + shortTrackId(event.subjectId)}
                    </span>
                    <span className="text-saas-secondary">·</span>
                    <span className="inline-flex items-center gap-1.5 font-medium text-saas-primary">
                      <span className="text-saas-secondary line-through">{from}</span>
                      <span className="text-saas-secondary">→</span>
                      <span className="font-semibold text-saas-accent">{to}</span>
                    </span>
                  </div>
                  <span className="text-[11px] font-medium text-saas-secondary">
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
