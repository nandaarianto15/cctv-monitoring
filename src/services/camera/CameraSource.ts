/**
 * Camera sources. `CameraSource` is the seam for future RTSP/WebRTC adapters;
 * today only getUserMedia (laptop/USB/phone cameras) is implemented.
 */
import type { Camera, CameraSourceKind } from '../../types';

export interface CameraSource {
  readonly kind: CameraSourceKind;
  start(): Promise<MediaStream>;
  /** Must be idempotent. */
  stop(): void;
}

export interface GetUserMediaSourceOptions {
  deviceId: string | null;
  facingMode: 'user' | 'environment' | null;
  idealWidth: number;
  idealHeight: number;
}

export class GetUserMediaCameraSource implements CameraSource {
  readonly kind: CameraSourceKind = 'usermedia';
  private stream: MediaStream | null = null;

  constructor(private readonly opts: GetUserMediaSourceOptions) {}

  async start(): Promise<MediaStream> {
    if (!navigator.mediaDevices?.getUserMedia) {
      // Insecure context (plain HTTP on a non-localhost host) - see README.
      throw new TypeError('getUserMedia is unavailable (requires HTTPS or localhost).');
    }
    const video: MediaTrackConstraints = {
      width: { ideal: this.opts.idealWidth },
      height: { ideal: this.opts.idealHeight },
    };
    if (this.opts.deviceId) {
      video.deviceId = { exact: this.opts.deviceId };
    } else if (this.opts.facingMode) {
      video.facingMode = { ideal: this.opts.facingMode };
    }
    this.stream = await navigator.mediaDevices.getUserMedia({ video, audio: false });
    return this.stream;
  }

  stop(): void {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
  }
}

export function createCameraSource(camera: Camera, cfg: { idealWidth: number; idealHeight: number }): CameraSource {
  switch (camera.kind) {
    case 'usermedia':
      return new GetUserMediaCameraSource({
        deviceId: camera.deviceId,
        facingMode: camera.facingMode,
        idealWidth: cfg.idealWidth,
        idealHeight: cfg.idealHeight,
      });
    default:
      throw new Error(`Camera source kind "${camera.kind}" is not implemented yet.`);
  }
}
