/**
 * Device enumeration. Labels are empty until the user grants camera
 * permission once (browser privacy behavior) - the UI communicates this.
 */
export interface VideoDeviceInfo {
  deviceId: string;
  label: string;
}

export async function listVideoInputDevices(): Promise<VideoDeviceInfo[]> {
  if (!navigator.mediaDevices?.enumerateDevices) return [];
  const devices = await navigator.mediaDevices.enumerateDevices();
  let index = 0;
  return devices
    .filter((d) => d.kind === 'videoinput')
    .map((d) => {
      index += 1;
      return { deviceId: d.deviceId, label: d.label || `Camera ${index}` };
    });
}
