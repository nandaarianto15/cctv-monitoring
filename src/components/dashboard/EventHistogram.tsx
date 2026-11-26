/**
 * Small per-minute event histogram (last 15 minutes) - pure SVG, no chart
 * library. Bins by wall-clock minute.
 * Vyra dark treatment: Vyra-blue bars on the dark canvas.
 */
import { useMemo } from 'react';
import type { VisionEvent } from '../../types';

const WINDOW_MINUTES = 15;
const VIEW_WIDTH = 300;
const VIEW_HEIGHT = 60;
const BAR_GAP = 3;
const BAR_FILL = '#7AA2F7'; // Vyra blue
const EMPTY_FILL = 'rgba(148, 163, 198, 0.16)';

export function EventHistogram({ events, now = Date.now() }: { events: VisionEvent[]; now?: number }) {
  const { bins, maxCount } = useMemo(() => {
    const startOfWindow = now - WINDOW_MINUTES * 60_000;
    const counts = new Array<number>(WINDOW_MINUTES).fill(0);
    for (const event of events) {
      if (event.ts < startOfWindow || event.ts > now) continue;
      const index = Math.floor((event.ts - startOfWindow) / 60_000);
      if (index >= 0 && index < WINDOW_MINUTES) counts[index] = (counts[index] ?? 0) + 1;
    }
    return { bins: counts, maxCount: Math.max(1, ...counts) };
  }, [events, now]);

  const barWidth = (VIEW_WIDTH - BAR_GAP * (WINDOW_MINUTES - 1)) / WINDOW_MINUTES;
  const plotHeight = VIEW_HEIGHT - 12;

  return (
    <div className="flex flex-col gap-1.5">
      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        className="h-16 w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label="Events per minute over the last 15 minutes"
      >
        {bins.map((count, i) => {
          const barHeight = count === 0 ? 2 : Math.max(4, (count / maxCount) * plotHeight);
          return (
            <rect
              key={i}
              x={i * (barWidth + BAR_GAP)}
              y={VIEW_HEIGHT - barHeight}
              width={barWidth}
              height={barHeight}
              rx={1.5}
              fill={count === 0 ? EMPTY_FILL : BAR_FILL}
              opacity={count === 0 ? 1 : 0.9}
            />
          );
        })}
      </svg>
      <div className="flex justify-between text-[10px] font-medium text-[#5A6474]">
        <span>-{WINDOW_MINUTES}m</span>
        <span>{maxCount > 1 ? `peak ${maxCount}/min` : 'events/min'}</span>
        <span>now</span>
      </div>
    </div>
  );
}