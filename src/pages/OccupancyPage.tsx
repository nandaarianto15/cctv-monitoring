import { useCameras, useEmployeeNames, useVisionSnapshot, useZones } from '../hooks/useVision';
import { StatCard } from '../components/dashboard/StatCard';
import { CameraStatusBadge } from '../components/camera/CameraPanel';
import { Button, Card, EmptyState, StateBadge } from '../components/ui/primitives';
import { shortTrackId } from '../utils/format';
import type { PageId } from '../components/navigation/Sidebar';

export function OccupancyPage({ navigate }: { navigate: (page: PageId) => void }): JSX.Element {
  const cameras = useCameras();
  const zones = useZones();
  const snapshot = useVisionSnapshot();
  const employeeNames = useEmployeeNames();

  const desks = snapshot.cameras.flatMap((c) => c.desks);
  const occupied = desks.filter((d) => d.state === 'OCCUPIED').length;
  const unoccupied = desks.filter((d) => d.state === 'UNOCCUPIED').length;
  const unknown = desks.length - occupied - unoccupied;
  const liveCameras = snapshot.cameras.filter((c) => c.status === 'running').length;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Desks occupied" value={occupied} sub={`${desks.length} zones defined`} />
        <StatCard label="Desks free" value={unoccupied} />
        <StatCard label="Desk state unknown" value={unknown} sub="occlusion / no evidence" />
        <StatCard label="Cameras live" value={`${liveCameras}/${cameras.length}`} />
      </div>

      {cameras.length === 0 ? (
        <Card title="Occupancy">
          <EmptyState
            title="No cameras configured"
            hint="Add a camera and draw desk zones to derive occupancy."
            action={
              <Button variant="primary" onClick={() => navigate('cameras')}>
                Go to cameras
              </Button>
            }
          />
        </Card>
      ) : (
        cameras.map((camera) => {
          const camSnapshot = snapshot.cameras.find((c) => c.cameraId === camera.id);
          const cameraZones = zones.filter((z) => z.cameraId === camera.id);
          const deskViews = camSnapshot?.desks ?? [];
          const running = camSnapshot?.status === 'running';
          return (
            <Card
              key={camera.id}
              title={
                <span className="flex items-center gap-2">
                  {camera.label}
                  <CameraStatusBadge status={camSnapshot?.status ?? 'idle'} />
                </span>
              }
            >
              {cameraZones.length === 0 ? (
                <EmptyState
                  title="No zones for this camera"
                  hint="Draw desk polygons in the Workspace tab to derive occupancy."
                  action={
                    <Button variant="primary" onClick={() => navigate('workspace')}>
                      Go to workspace
                    </Button>
                  }
                />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {cameraZones.map((zone) => {
                    const desk = deskViews.find((d) => d.zoneId === zone.id);
                    const state = desk?.state ?? 'UNKNOWN';
                    const occupants = desk?.occupants ?? [];
                    const occupantLabel =
                      occupants.length === 0
                        ? 'No occupants'
                        : occupants
                            .map((o) => (o.employeeId ? (employeeNames.get(o.employeeId) ?? shortTrackId(o.employeeId)) : shortTrackId(o.trackId)))
                            .join(', ');
                    return (
                      <div key={zone.id} className="rounded-lg border border-saas-border bg-white p-3 shadow-subtle">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-saas-primary">{zone.name}</span>
                          <StateBadge state={state} />
                        </div>
                        <p className="mt-1 text-xs text-saas-secondary">
                          {occupantLabel}
                          {zone.priority !== 0 && ` · priority ${zone.priority}`}
                        </p>
                        {!running && (
                          <p className="mt-1 text-xs text-saas-secondary">
                            Camera offline - desk state requires a running camera.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })
      )}
    </div>
  );
}
