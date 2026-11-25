/**
 * Id generation. Uses crypto.randomUUID when available; falls back to a
 * time+counter scheme (unique within a session).
 */

let fallbackCounter = 0;

export function createId(prefix: string): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return `${prefix}_${cryptoApi.randomUUID().slice(0, 8)}`;
  }
  fallbackCounter += 1;
  return `${prefix}_${Date.now().toString(36)}${fallbackCounter.toString(36)}`;
}
