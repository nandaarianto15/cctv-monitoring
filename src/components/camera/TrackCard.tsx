import type { Employee, Id, TrackView } from '../../types';
import { useVision } from '../../state/VisionContext';
import { Button, SelectInput, StateBadge } from '../ui/primitives';
import { shortTrackId } from '../../utils/format';
import { UserCheck } from '../icons';

export function TrackCard({
  track,
  employees,
  employeeNames,
}: {
  track: TrackView;
  employees: Employee[];
  employeeNames: Map<Id, string>;
}) {
  const { controller } = useVision();
  const assigned = track.employeeId !== null;
  const employeeLabel = track.employeeId ? employeeNames.get(track.employeeId) ?? 'Unknown' : null;

  return (
    <div className="flex flex-col justify-between rounded-lg border border-saas-border bg-white p-3.5 shadow-subtle">
      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-saas-primary">
              ID #{shortTrackId(track.trackId)}
            </span>
            <StateBadge state={track.status} />
          </div>
          <span className="text-[11px] font-medium text-saas-secondary">
            {(track.confidence * 100).toFixed(0)}% conf
          </span>
        </div>

        {/* State Badges Grid */}
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <StateBadge state={track.state.occupancy} />
          <StateBadge state={track.state.posture} />
          <StateBadge state={track.state.activity} />
        </div>

        {track.zone.zoneName && (
          <p className="mt-2 text-xs font-medium text-saas-primary">
            Zone: <span className="font-semibold text-saas-accent">{track.zone.zoneName}</span>
          </p>
        )}
      </div>

      {/* Manual Identification Assignment */}
      <div className="mt-3 border-t border-saas-border pt-2.5">
        {assigned ? (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 truncate">
              <UserCheck size={14} className="text-saas-success shrink-0" />
              <span className="text-xs font-semibold text-saas-primary truncate">
                {employeeLabel}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => controller.unassignTrack(track.trackId)}
            >
              Unassign
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <SelectInput
                aria-label="Assign employee"
                defaultValue=""
                onChange={(e) => {
                  const empId = e.target.value;
                  if (empId) controller.assignTrack(track.cameraId, track.trackId, empId);
                }}
              >
                <option value="">Assign employee…</option>
                {employees
                  .filter((e) => e.active)
                  .map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
              </SelectInput>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
