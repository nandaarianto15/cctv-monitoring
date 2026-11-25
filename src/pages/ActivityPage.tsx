import { useVision } from '../state/VisionContext';
import { useCameras, useEmployeeNames, useEvents, useVisionSnapshot } from '../hooks/useVision';
import { EventFeed } from '../components/dashboard/EventFeed';
import { EventHistogram } from '../components/dashboard/EventHistogram';
import { Card, ConfirmButton, EmptyState, StateBadge } from '../components/ui/primitives';
import { Trash2, Users } from '../components/icons';

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
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-saas-border pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-saas-primary">Activity History</h1>
          <p className="text-xs text-saas-secondary mt-0.5">
            Audit trail of occupancy transitions, posture state estimations, and staff assignments.
          </p>
        </div>

        {events.length > 0 && (
          <ConfirmButton
            label="Clear Event Buffer"
            confirmLabel="Confirm Clear?"
            size="sm"
            icon={<Trash2 size={13} />}
            onConfirm={() => controller.clearEvents()}
          />
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        {/* Main Event Timeline & Feed */}
        <div className="flex flex-col gap-6">
          <Card
            title="Observation Activity Timeline"
            subtitle="Frequency histogram of recorded state changes"
          >
            <div className="overflow-x-auto py-2">
              <EventHistogram events={events} />
            </div>
          </Card>

          <Card
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
          </Card>
        </div>

        {/* Live Status & Methodology Sidebar */}
        <div className="flex flex-col gap-6">
          {/* Active Identified Persons */}
          <Card
            title="Live Identified Personnel"
            subtitle={`${identifiedPersons.length} staff currently confirmed in view`}
          >
            {identifiedPersons.length === 0 ? (
              <EmptyState
                icon={<Users size={24} />}
                title="No Active Staff Assigned"
                hint="Manually assign employees to confirmed tracks in Live Monitoring to observe active states."
              />
            ) : (
              <ul className="flex flex-col gap-2.5">
                {identifiedPersons.map((track) => (
                  <li
                    key={track.trackId}
                    className="flex flex-col gap-2 rounded-lg border border-saas-border bg-saas-bg/50 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-saas-primary">
                        {track.employeeId ? employeeNames.get(track.employeeId) : '—'}
                      </span>
                      <span className="text-[11px] font-medium text-saas-secondary">
                        {cameraLabel(track.cameraId)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <StateBadge state={track.state.occupancy} />
                      <StateBadge state={track.state.posture} />
                      <StateBadge state={track.state.activity} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* AI Inference Architecture Card */}
          <Card
            title="State Derivation Architecture"
            subtitle="Independent temporal estimation rules"
          >
            <div className="space-y-3 text-xs leading-relaxed text-saas-secondary">
              <div className="rounded-md border border-saas-border bg-saas-bg/60 p-2.5">
                <span className="font-semibold text-saas-primary">WORKING</span>
                <p className="mt-0.5 text-[11px]">
                  Requires conjunction of <span className="font-medium text-saas-primary">IN_ZONE</span>,{' '}
                  <span className="font-medium text-saas-primary">SITTING</span>, and verified observable wrist proximity to the calibrated desk polygon.
                </p>
              </div>

              <div className="rounded-md border border-saas-border bg-saas-bg/60 p-2.5">
                <span className="font-semibold text-saas-primary">NOT_WORKING</span>
                <p className="mt-0.5 text-[11px]">
                  Explicit contrary observation (outside desk zone, or seated with wrists clearly positioned away from desk boundary).
                </p>
              </div>

              <div className="rounded-md border border-saas-border bg-saas-bg/60 p-2.5">
                <span className="font-semibold text-saas-primary">UNKNOWN</span>
                <p className="mt-0.5 text-[11px]">
                  Default fall-through state whenever landmarks are occluded, standing at desk, or evidence is partial. States are never fabricated.
                </p>
              </div>

              <div className="rounded-md border border-saas-border bg-saas-bg/60 p-2.5">
                <span className="font-semibold text-saas-primary">Zero Video Persistence</span>
                <p className="mt-0.5 text-[11px]">
                  Only anonymous metadata events are persisted. Raw camera frames never leave browser memory.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
