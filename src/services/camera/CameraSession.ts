/**
 * CameraSession: owns one detached <video> element and the lifecycle of one
 * live stream. Sessions are strictly per-camera and fully cleaned up on stop
 * (track listeners, srcObject, source).
 */
import type { CameraSource } from './CameraSource';

export interface CameraSessionStartOptions {
  /** Fired when the underlying track ends (device unplugged, permission revoked). */
  onEnded: () => void;
  /** Timeout waiting for the first video metadata (ms). */
  startTimeoutMs: number;
}

export class CameraSession {
  private readonly video: HTMLVideoElement;
  private source: CameraSource | null = null;
  private endedHandler: (() => void) | null = null;

  constructor() {
    this.video = document.createElement('video');
    this.video.muted = true;
    // iOS Safari requires playsInline to avoid fullscreen takeover.
    this.video.playsInline = true;
  }

  get videoElement(): HTMLVideoElement {
    return this.video;
  }

  get videoSize(): { width: number; height: number } | null {
    return this.video.videoWidth > 0 && this.video.videoHeight > 0
      ? { width: this.video.videoWidth, height: this.video.videoHeight }
      : null;
  }

  async start(source: CameraSource, opts: CameraSessionStartOptions): Promise<void> {
    // Full cleanup of any previous source keeps sessions isolated.
    this.stop();
    const stream = await source.start();
    this.source = source;
    const endedHandler = () => opts.onEnded();
    this.endedHandler = endedHandler;
    stream.getVideoTracks().forEach((track) => track.addEventListener('ended', endedHandler));

    this.video.srcObject = stream;
    try {
      await waitForVideoReady(this.video, opts.startTimeoutMs);
      await safePlay(this.video);
    } catch (err) {
      this.stop();
      throw err;
    }
  }

  stop(): void {
    const handler = this.endedHandler;
    if (handler && this.video.srcObject instanceof MediaStream) {
      this.video.srcObject.getVideoTracks().forEach((track) => track.removeEventListener('ended', handler));
    }
    this.endedHandler = null;
    this.video.pause();
    this.video.srcObject = null;
    this.source?.stop();
    this.source = null;
  }
}

function waitForVideoReady(video: HTMLVideoElement, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    if (video.readyState >= HTMLMediaElement.HAVE_METADATA && video.videoWidth > 0) {
      resolve();
      return;
    }
    const onReady = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error('Video stream failed to start.'));
    };
    const onTimeout = () => {
      cleanup();
      reject(new Error('Timed out waiting for camera frames.'));
    };
    const timeout = setTimeout(onTimeout, timeoutMs);
    function cleanup(): void {
      clearTimeout(timeout);
      video.removeEventListener('loadedmetadata', onReady);
      video.removeEventListener('error', onError);
    }
    video.addEventListener('loadedmetadata', onReady);
    video.addEventListener('error', onError);
  });
}

async function safePlay(video: HTMLVideoElement): Promise<void> {
  try {
    await video.play();
  } catch (err) {
    // Chrome occasionally rejects play() with AbortError during setup; other
    // failures (autoplay policy) mean no frames will flow — surface them.
    if (err instanceof DOMException && err.name === 'AbortError') return;
    throw err;
  }
}
