/** Human-readable messages for getUserMedia/camera failures. */

export function describeCameraError(err: unknown): string {
  if (err instanceof DOMException) {
    switch (err.name) {
      case 'NotAllowedError':
        return 'Camera permission was denied. Allow camera access in the browser, then reconnect.';
      case 'NotFoundError':
        return 'No camera was found. Connect a camera, then reconnect.';
      case 'NotReadableError':
        return 'The camera is in use by another application. Close it and reconnect.';
      case 'OverconstrainedError':
        return 'The camera does not support the requested settings. Try another device.';
      case 'SecurityError':
        return 'Camera access was blocked by the security policy (HTTPS is required). See the README.';
      default:
        return `Camera error: ${err.name}`;
    }
  }
  if (err instanceof TypeError) {
    return 'Camera API unavailable: getUserMedia requires HTTPS (or localhost). See the README.';
  }
  if (err instanceof Error) {
    return err.message;
  }
  return 'Unexpected camera error.';
}
