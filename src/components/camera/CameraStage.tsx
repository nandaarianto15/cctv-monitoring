/**
 * CameraStage: positions the pipeline-owned <video> element under a container
 * with the video's exact aspect ratio, and exposes the measured dimensions to
 * overlay children (Konva stages) so normalized coordinates map 1:1.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useVideoElement } from '../../hooks/useVision';
import type { Id } from '../../types';

export interface StageDims {
  width: number;
  height: number;
}

const FALLBACK_ASPECT = 16 / 9;

export function CameraStage({
  cameraId,
  videoSize,
  placeholder,
  children,
}: {
  cameraId: Id | null;
  videoSize: { width: number; height: number } | null;
  placeholder?: ReactNode;
  children?: (dims: StageDims | null) => ReactNode;
}) {
  const video = useVideoElement(cameraId);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState<StageDims | null>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setDims({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const aspect =
    videoSize && videoSize.width > 0 && videoSize.height > 0
      ? videoSize.width / videoSize.height
      : FALLBACK_ASPECT;

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-lg border border-zinc-800 bg-black"
      style={{ aspectRatio: `${aspect}` }}
    >
      {video ? <VideoAttachment video={video} /> : (placeholder ?? <OfflinePlaceholder />)}
      {children ? children(dims) : null}
    </div>
  );
}

/** Mounts the pipeline's detached video element into the stage. */
function VideoAttachment({ video }: { video: HTMLVideoElement }) {
  const hostRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    video.className = 'absolute inset-0 h-full w-full object-contain';
    host.appendChild(video);
    return () => {
      if (video.parentElement === host) {
        host.removeChild(video);
      }
    };
  }, [video]);
  return <div ref={hostRef} className="absolute inset-0" />;
}

function OfflinePlaceholder() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <p className="text-xs text-zinc-600">Camera offline</p>
    </div>
  );
}
