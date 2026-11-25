import { useCallback, useEffect, useState } from 'react';
import { useVision } from '../state/VisionContext';
import { useCameras, useEmployees } from '../hooks/useVision';
import { listVideoInputDevices, type VideoDeviceInfo } from '../services/camera/devices';
import { CameraPanel } from '../components/camera/CameraPanel';
import { Button, Card, EmptyState, Field, SelectInput, TextInput } from '../components/ui/primitives';

export function CamerasPage(): JSX.Element {
  const { controller } = useVision();
  const cameras = useCameras();
  const employees = useEmployees();

  const [devices, setDevices] = useState<VideoDeviceInfo[]>([]);
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState('');
  const [label, setLabel] = useState('');
  const [facingMode, setFacingMode] = useState<'user' | 'environment' | ''>('');

  const refreshDevices = useCallback(async () => {
    try {
      const list = await listVideoInputDevices();
      setDevices(list);
      setDeviceError(null);
    } catch {
      setDeviceError('Could not enumerate camera devices — camera APIs require HTTPS (or localhost).');
    }
  }, []);

  useEffect(() => {
    void refreshDevices();
  }, [refreshDevices]);

  const usingDefaultDevice = deviceId === '';

  const addCamera = (): void => {
    const device = devices.find((d) => d.deviceId === deviceId);
    const name = label.trim() || device?.label || 'Camera';
    controller.addCamera({ label: name, deviceId: deviceId || null, facingMode: facingMode || null });
    setLabel('');
  };

  return (
    <div className="flex flex-col gap-6">
      <Card
        title="Camera management"
        actions={
          <Button variant="secondary" onClick={() => void refreshDevices()}>
            Refresh devices
          </Button>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Device" hint="Labels appear after camera permission is granted once.">
            <SelectInput value={deviceId} onChange={(e) => setDeviceId(e.target.value)}>
              <option value="">Default camera</option>
              {devices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Label (optional)">
            <TextInput value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Office front" />
          </Field>
          {usingDefaultDevice && (
            <Field label="Facing mode (phones)" hint="Only used when no specific device is selected.">
              <SelectInput
                value={facingMode}
                onChange={(e) => setFacingMode(e.target.value as 'user' | 'environment' | '')}
              >
                <option value="">Auto</option>
                <option value="user">Front (user)</option>
                <option value="environment">Rear (environment)</option>
              </SelectInput>
            </Field>
          )}
        </div>
        {deviceError && <p className="mt-2 text-xs text-rose-300">{deviceError}</p>}
        <div className="mt-3">
          <Button variant="primary" onClick={addCamera}>
            Add camera
          </Button>
        </div>
      </Card>

      {cameras.length === 0 ? (
        <EmptyState
          title="No cameras configured"
          hint="Add your laptop/USB camera, or a phone camera. Phones require HTTPS — see the README (ngrok / Vercel)."
        />
      ) : (
        <div className="grid gap-6 2xl:grid-cols-2">
          {cameras.map((camera) => (
            <CameraPanel key={camera.id} camera={camera} employees={employees} />
          ))}
        </div>
      )}
    </div>
  );
}
