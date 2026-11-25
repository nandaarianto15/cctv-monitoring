import { useCameras, useEmployeeNames, useEmployees, useEvents, useVisionSnapshot } from '../hooks/useVision';
import { EventFeed } from '../components/dashboard/EventFeed';
import { StatCard } from '../components/dashboard/StatCard';
import { CameraStatusBadge } from '../components/camera/CameraPanel';
import { Badge, Button, Card, EmptyState } from '../components/ui/primitives';
import { Video, Users, Layers, Activity, Shield, Camera } from '../components/icons';
import type { PageId } from '../components/navigation/Sidebar';

const RECENT_EVENTS = 15;

export function OverviewPage({ navigate }: { navigate: (page: PageId) => void }): JSX.Element {
  const snapshot = useVisionSnapshot();
  const cameras = useCameras();
  const employees = useEmployees();
  const employeeNames = useEmployeeNames();
  const events = useEvents();

  const liveCameras = snapshot.cameras.filter((c) => c.status === 'running');
  const confirmedPersons = snapshot.cameras
    .flatMap((c) => c.tracks)
    .filter((t) => t.status === 'CONFIRMED');
  const desks = snapshot.cameras.flatMap((c) => c.desks);
  const occupiedDesks = desks.filter((d) => d.state === 'OCCUPIED');
  const identifiedPersons = confirmedPersons.filter((t) => t.employeeId !== null);

  return (
    <div className="flex flex-col gap-6">
      {/* Page Title & Operational Status Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-saas-border pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-saas-primary">System Overview</h1>
          <p className="text-xs text-saas-secondary mt-0.5">
            Real-time workplace occupancy, tracking, and operational camera telemetry.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {snapshot.modelsReady && (
            <Badge tone="green" dot>
              AI Engine Ready
            </Badge>
          )}
          {snapshot.modelsLoading && (
            <Badge tone="amber" dot>
              Loading Models…
            </Badge>
          )}
          <Badge tone={liveCameras.length > 0 ? 'green' : 'zinc'}>
            {liveCameras.length} of {cameras.length} cameras active
          </Badge>
        </div>
      </div>

      {/* Quick Setup Card if no cameras configured */}
      {cameras.length === 0 && (
        <Card
          title="Initial Setup Guide"
          subtitle="Follow these steps to initialize AI vision monitoring"
          actions={
            <Button
              variant="primary"
              size="sm"
              icon={<Camera size={14} />}
              onClick={() => navigate('cameras')}
            >
              Configure Camera
            </Button>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-saas-border bg-saas-bg p-3.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-saas-accent text-xs font-bold text-white mb-2">
                1
              </span>
              <p className="text-xs font-semibold text-saas-primary">Connect Camera</p>
              <p className="text-[11px] text-saas-secondary mt-1">
                Add your integrated webcam, USB camera, or mobile device.
              </p>
            </div>
            <div className="rounded-lg border border-saas-border bg-saas-bg p-3.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-saas-accent text-xs font-bold text-white mb-2">
                2
              </span>
              <p className="text-xs font-semibold text-saas-primary">Start AI Stream</p>
              <p className="text-[11px] text-saas-secondary mt-1">
                COCO-SSD and MediaPipe Pose initialize lazily in-browser.
              </p>
            </div>
            <div className="rounded-lg border border-saas-border bg-saas-bg p-3.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-saas-accent text-xs font-bold text-white mb-2">
                3
              </span>
              <p className="text-xs font-semibold text-saas-primary">Map Desks</p>
              <p className="text-[11px] text-saas-secondary mt-1">
                Draw normalized polygon boundaries for workspace desks.
              </p>
            </div>
            <div className="rounded-lg border border-saas-border bg-saas-bg p-3.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-saas-accent text-xs font-bold text-white mb-2">
                4
              </span>
              <p className="text-xs font-semibold text-saas-primary">Assign & Monitor</p>
              <p className="text-[11px] text-saas-secondary mt-1">
                Manually identify employees to confirmed person tracks.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard
          label="Active Cameras"
          value={liveCameras.length}
          sub={`${cameras.length} configured`}
          icon={<Video size={18} />}
        />
        <StatCard
          label="Persons Tracked"
          value={confirmedPersons.length}
          sub={`${identifiedPersons.length} identified`}
          icon={<Users size={18} />}
        />
        <StatCard
          label="Desks Occupied"
          value={`${occupiedDesks.length} / ${desks.length}`}
          sub={desks.length === 0 ? 'No zones mapped' : `${desks.length - occupiedDesks.length} unoccupied`}
          icon={<Layers size={18} />}
        />
        <StatCard
          label="Employees"
          value={employees.length}
          sub={`${identifiedPersons.length} active on-site`}
          icon={<Shield size={18} />}
        />
        <StatCard
          label="Telemetry Events"
          value={events.length}
          sub="FIFO repository buffer"
          icon={<Activity size={18} />}
        />
      </div>

      {/* Operational Overview Grid */}
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1.6fr]">
        {/* Camera Health & Status */}
        <Card
          title="Camera Feeds & Telemetry"
          subtitle="Live operational status per video source"
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('cameras')}
            >
              Manage
            </Button>
          }
        >
          {cameras.length === 0 ? (
            <EmptyState
              title="No camera sources registered"
              hint="Add a camera in Camera Management to start receiving vision telemetry."
            />
          ) : (
            <ul className="flex flex-col divide-y divide-saas-border">
              {cameras.map((camera) => {
                const cam = snapshot.cameras.find((c) => c.cameraId === camera.id);
                const status = cam?.status ?? 'idle';
                const camZones = cam?.desks ?? [];
                const occupied = camZones.filter((d) => d.state === 'OCCUPIED').length;
                return (
                  <li
                    key={camera.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-saas-bg text-saas-secondary">
                        <Video size={16} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-saas-primary">
                            {camera.label}
                          </span>
                          <CameraStatusBadge status={status} />
                        </div>
                        <p className="text-xs text-saas-secondary">
                          {status === 'running' && cam
                            ? `${cam.tracks.length} tracked · ${occupied}/${camZones.length} desks occupied · ${cam.stats.inferenceFps.toFixed(1)} FPS`
                            : status === 'error' && cam?.error
                            ? cam.error
                            : 'Camera offline'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {status === 'running' && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => navigate('live')}
                        >
                          View Feed
                        </Button>
                      )}
                      {camZones.length === 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate('workspace')}
                        >
                          Map Desks →
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Recent Activity Log */}
        <Card
          title="Recent Activity Log"
          subtitle="Real-time occupancy and posture transitions"
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('activity')}
            >
              Full History
            </Button>
          }
        >
          <EventFeed
            events={events}
            cameras={cameras}
            employeeNames={employeeNames}
            limit={RECENT_EVENTS}
          />
        </Card>
      </div>
    </div>
  );
}
