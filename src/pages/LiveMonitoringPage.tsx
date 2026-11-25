import { useState } from 'react';
import { useCameras, useEmployees } from '../hooks/useVision';
import { CameraPanel } from '../components/camera/CameraPanel';
import { Button, Card, EmptyState, SelectInput } from '../components/ui/primitives';
import { Video } from '../components/icons';
import type { PageId } from '../components/navigation/Sidebar';

export function LiveMonitoringPage({ navigate }: { navigate: (page: PageId) => void }): JSX.Element {
  const cameras = useCameras();
  const employees = useEmployees();
  const [selectedCameraId, setSelectedCameraId] = useState<string>('all');

  const filteredCameras =
    selectedCameraId === 'all'
      ? cameras
      : cameras.filter((c) => c.id === selectedCameraId);

  return (
    <div className="flex flex-col gap-6">
      {/* Header with Camera Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-saas-border pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-saas-primary">Live Monitoring</h1>
          <p className="text-xs text-saas-secondary mt-0.5">
            Real-time multi-camera detection feeds, person tracking bounding boxes, and workspace occupancy.
          </p>
        </div>

        {cameras.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-saas-secondary">Select Camera:</span>
            <div className="w-48">
              <SelectInput
                value={selectedCameraId}
                onChange={(e) => setSelectedCameraId(e.target.value)}
              >
                <option value="all">All Cameras ({cameras.length})</option>
                {cameras.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </SelectInput>
            </div>
          </div>
        )}
      </div>

      {cameras.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Video size={32} />}
            title="No Cameras Registered"
            hint="Register your laptop, USB, or mobile camera to begin live edge inference."
            action={
              <Button
                variant="primary"
                onClick={() => navigate('cameras')}
              >
                Go to Camera Management
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-6 2xl:grid-cols-2">
          {filteredCameras.map((camera) => (
            <CameraPanel
              key={camera.id}
              camera={camera}
              employees={employees}
              isLiveMonitoring
            />
          ))}
        </div>
      )}
    </div>
  );
}
