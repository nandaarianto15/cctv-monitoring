import { useState } from 'react';
import type { Id } from '../types';
import { useVision } from '../state/VisionContext';
import { useCameraSnapshot, useCameras } from '../hooks/useVision';
import { WorkspaceEditor } from '../components/workspace/WorkspaceEditor';
import { Button, Card, EmptyState, SelectInput } from '../components/ui/primitives';
import { Layers } from '../components/icons';
import type { PageId } from '../components/navigation/Sidebar';

export function WorkspacePage({ navigate }: { navigate: (page: PageId) => void }): JSX.Element {
  const { controller } = useVision();
  const cameras = useCameras();
  const [cameraId, setCameraId] = useState<Id | null>(null);

  const selected = cameras.find((c) => c.id === cameraId) ?? cameras[0] ?? null;
  const snapshot = useCameraSnapshot(selected?.id ?? null);
  const running = snapshot?.status === 'running';

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-saas-border pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-saas-primary">Workspace Mapping</h1>
          <p className="text-xs text-saas-secondary mt-0.5">
            Define normalized desk polygons per camera view for precise occupancy observation.
          </p>
        </div>

        {selected && (
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-saas-secondary">Active Camera:</span>
            <div className="w-56">
              <SelectInput
                value={selected.id}
                onChange={(e) => setCameraId(e.target.value)}
                aria-label="Camera selection"
              >
                {cameras.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </SelectInput>
            </div>
            {running ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => controller.stopCamera(selected.id)}
              >
                Stop Feed
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={() => void controller.startCamera(selected.id)}
              >
                Start Feed
              </Button>
            )}
          </div>
        )}
      </div>

      {!selected ? (
        <Card>
          <EmptyState
            icon={<Layers size={32} />}
            title="No Cameras Available"
            hint="Desk zones are calibrated per camera perspective. Add a camera first to draw workspace polygons."
            action={
              <Button variant="primary" onClick={() => navigate('cameras')}>
                Register Camera
              </Button>
            }
          />
        </Card>
      ) : (
        <WorkspaceEditor camera={selected} />
      )}
    </div>
  );
}
