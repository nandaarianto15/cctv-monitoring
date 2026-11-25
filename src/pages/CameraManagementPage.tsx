import { useCallback, useEffect, useState } from 'react';
import { useVision } from '../state/VisionContext';
import { useCameras, useEmployees } from '../hooks/useVision';
import { listVideoInputDevices, type VideoDeviceInfo } from '../services/camera/devices';
import { CameraPanel } from '../components/camera/CameraPanel';
import { Button, Card, EmptyState, Field, SelectInput, TextInput } from '../components/ui/primitives';
import { Camera, RefreshCw, Plus, AlertCircle } from '../components/icons';

export function CameraManagementPage(): JSX.Element {
  const { controller } = useVision();
  const cameras = useCameras();
  const employees = useEmployees();

  const [devices, setDevices] = useState<VideoDeviceInfo[]>([]);
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState('');
  const [label, setLabel] = useState('');
  const [facingMode, setFacingMode] = useState<'user' | 'environment' | ''>('');
  const [isAdding, setIsAdding] = useState(false);

  const refreshDevices = useCallback(async () => {
    try {
      const list = await listVideoInputDevices();
      setDevices(list);
      setDeviceError(null);
    } catch {
      setDeviceError('Could not enumerate camera devices. Camera APIs require HTTPS or localhost.');
    }
  }, []);

  useEffect(() => {
    void refreshDevices();
  }, [refreshDevices]);

  const usingDefaultDevice = deviceId === '';

  const addCamera = (): void => {
    const device = devices.find((d) => d.deviceId === deviceId);
    const name = label.trim() || device?.label || `Camera ${cameras.length + 1}`;
    controller.addCamera({ label: name, deviceId: deviceId || null, facingMode: facingMode || null });
    setLabel('');
    setIsAdding(false);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-saas-border pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-saas-primary">Camera Management</h1>
          <p className="text-xs text-saas-secondary mt-0.5">
            Configure local webcams, external USB capture devices, and mobile video endpoints.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw size={14} />}
            onClick={() => void refreshDevices()}
          >
            Scan Devices
          </Button>
          {!isAdding && (
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={14} />}
              onClick={() => setIsAdding(true)}
            >
              Add Camera
            </Button>
          )}
        </div>
      </div>

      {/* Add Camera Form Card */}
      {isAdding && (
        <Card
          title="Register New Video Endpoint"
          subtitle="Configure video source parameters for isolated per-camera processing"
          actions={
            <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)}>
              Cancel
            </Button>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Camera Device" hint="Available video devices discovered via WebRTC">
              <SelectInput value={deviceId} onChange={(e) => setDeviceId(e.target.value)}>
                <option value="">Default System Camera</option>
                {devices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label}
                  </option>
                ))}
              </SelectInput>
            </Field>

            <Field label="Camera Name / Label" hint="Human-readable identifier (e.g., Office Desk 1)">
              <TextInput
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Reception Front Desk"
              />
            </Field>

            {usingDefaultDevice && (
              <Field label="Smartphone Facing Mode" hint="Rear camera is ideal for broad room monitoring">
                <SelectInput
                  value={facingMode}
                  onChange={(e) => setFacingMode(e.target.value as 'user' | 'environment' | '')}
                >
                  <option value="">Automatic</option>
                  <option value="user">Front-facing (User)</option>
                  <option value="environment">Rear-facing (Environment)</option>
                </SelectInput>
              </Field>
            )}
          </div>

          {deviceError && (
            <div className="mt-3 flex items-center gap-2 text-xs font-medium text-saas-error">
              <AlertCircle size={14} />
              <span>{deviceError}</span>
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <Button variant="primary" size="sm" onClick={addCamera}>
              Save Camera
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setIsAdding(false)}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* Registered Cameras List / Management Cards */}
      {cameras.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Camera size={32} />}
            title="No Cameras Configured"
            hint="Add your integrated laptop webcam, USB conference cam, or mobile device to start vision observation."
            action={
              <Button
                variant="primary"
                icon={<Plus size={14} />}
                onClick={() => setIsAdding(true)}
              >
                Add Your First Camera
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-6 2xl:grid-cols-2">
          {cameras.map((camera) => (
            <CameraPanel
              key={camera.id}
              camera={camera}
              employees={employees}
              isLiveMonitoring={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}
