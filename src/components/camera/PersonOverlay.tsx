/**
 * Live overlay: draws desk zones (colored by desk state) and person boxes with
 * their smoothed states. Read-only - the stage is not interactive here.
 */
import { Circle, Group, Layer, Line, Rect, Stage, Text } from 'react-konva';
import type { ActivityState, DeskZone, DeskZoneView, Id, NormalizedPoint, TrackView } from '../../types';
import { shortTrackId } from '../../utils/format';

const ACTIVITY_COLORS: Record<ActivityState, string> = {
  WORKING: '#22c55e',
  NOT_WORKING: '#fb7185',
  UNKNOWN: '#a1a1aa',
};

const ZONE_STROKE = '#38bdf8';
const ZONE_LABEL_COLOR = '#7dd3fc';
const DESK_FILL: Record<DeskZoneView['state'], string> = {
  OCCUPIED: 'rgba(34,197,94,0.10)',
  UNOCCUPIED: 'rgba(161,161,170,0.05)',
  UNKNOWN: 'rgba(161,161,170,0.02)',
};

const LABEL_WIDTH = 200;
const LABEL_FONT_SIZE = 11;
const LABEL_LINE_HEIGHT = 1.3;
const LABEL_PADDING = 6;
const BOX_STROKE_WIDTH = 1.8;
const FOOT_MARKER_RADIUS = 4;

interface PersonOverlayProps {
  width: number;
  height: number;
  tracks: TrackView[];
  zones: DeskZone[];
  desks: DeskZoneView[];
  employeeNames: Map<Id, string>;
}

export function PersonOverlay({ width, height, tracks, zones, desks, employeeNames }: PersonOverlayProps) {
  const deskStateById = new Map(desks.map((d) => [d.zoneId, d.state]));
  return (
    <Stage width={width} height={height} listening={false} className="pointer-events-none absolute inset-0">
      <Layer>
        {zones.map((zone) => {
          const first = zone.points[0];
          return (
            <Group key={`zone-${zone.id}`}>
              <Line
                points={toStagePoints(zone.points, width, height)}
                closed
                fill={DESK_FILL[deskStateById.get(zone.id) ?? 'UNKNOWN']}
                stroke={ZONE_STROKE}
                strokeWidth={1.2}
                opacity={0.9}
              />
              <Text
                x={(first?.x ?? 0.03) * width + 4}
                y={(first?.y ?? 0.03) * height + 4}
                text={zone.name}
                fontSize={LABEL_FONT_SIZE}
                fill={ZONE_LABEL_COLOR}
              />
            </Group>
          );
        })}
        {tracks.map((track) => (
          <PersonBox key={track.trackId} track={track} width={width} height={height} employeeNames={employeeNames} />
        ))}
      </Layer>
    </Stage>
  );
}

function PersonBox({
  track,
  width,
  height,
  employeeNames,
}: {
  track: TrackView;
  width: number;
  height: number;
  employeeNames: Map<Id, string>;
}) {
  const x = track.bbox.x * width;
  const y = track.bbox.y * height;
  const w = track.bbox.width * width;
  const h = track.bbox.height * height;
  const color = ACTIVITY_COLORS[track.state.activity];
  const label =
    track.employeeId !== null
      ? (employeeNames.get(track.employeeId) ?? shortTrackId(track.trackId))
      : shortTrackId(track.trackId);
  const statusNote =
    track.status === 'TENTATIVE' ? ' (unconfirmed)' : track.status === 'LOST' ? ' (lost)' : '';
  const zoneNote = track.zone.ambiguous
    ? 'Zone: AMBIGUOUS'
    : track.zone.zoneName
      ? `Zone: ${track.zone.zoneName}`
      : 'Zone: -';
  const lines = [
    `${label}${statusNote} · ${Math.round(track.confidence * 100)}%`,
    `${track.state.occupancy} · ${track.state.posture} · ${track.state.activity}`,
    zoneNote,
  ];
  const labelHeight = lines.length * LABEL_FONT_SIZE * LABEL_LINE_HEIGHT + LABEL_PADDING * 2;
  const labelY = Math.max(0, y - labelHeight);
  const opacity = track.status === 'LOST' ? 0.35 : 1;

  return (
    <Group opacity={opacity}>
      <Rect
        x={x}
        y={y}
        width={w}
        height={h}
        stroke={color}
        strokeWidth={BOX_STROKE_WIDTH}
        dash={track.status === 'TENTATIVE' ? [6, 4] : undefined}
        cornerRadius={4}
      />
      <Circle x={x + w / 2} y={y + h} radius={FOOT_MARKER_RADIUS} fill={color} />
      <Group x={x} y={labelY}>
        <Rect width={LABEL_WIDTH} height={labelHeight} fill="rgba(9,9,11,0.78)" cornerRadius={4} />
        <Text
          x={LABEL_PADDING}
          y={LABEL_PADDING}
          width={LABEL_WIDTH - LABEL_PADDING * 2}
          text={lines.join('\n')}
          fontSize={LABEL_FONT_SIZE}
          lineHeight={LABEL_LINE_HEIGHT}
          fill="#f4f4f5"
        />
      </Group>
    </Group>
  );
}

function toStagePoints(points: NormalizedPoint[], width: number, height: number): number[] {
  return points.flatMap((p) => [p.x * width, p.y * height]);
}
