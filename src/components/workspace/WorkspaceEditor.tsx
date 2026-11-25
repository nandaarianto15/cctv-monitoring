/**
 * Workspace editor: draw/edit/delete desk polygons per camera on a live (or
 * offline) stage. Coordinates are normalized (0..1) and persisted per cameraId
 * through the repository. Foot-point containment + zone priority drive
 * occupancy matching (see services/workspace/zoneMatcher).
 */
import { useEffect, useState } from 'react';
import { Circle, Group, Layer, Line, Stage, Text } from 'react-konva';
import type { Camera, DeskZone, Id, NormalizedPoint } from '../../types';
import { useVision } from '../../state/VisionContext';
import { useCameraSnapshot, useZones } from '../../hooks/useVision';
import { Badge, Button, Card, ConfirmButton, EmptyState, Field, NumberInput, TextInput } from '../ui/primitives';
import { CameraStage } from '../camera/CameraStage';
import { clamp01, isValidZonePolygon } from '../../utils/geometry';
import { createId } from '../../utils/id';
import { Layers, Plus } from '../icons';

const VERTEX_RADIUS = 6;
const ZONE_STROKE = '#5277A8';
const ZONE_FILL = 'rgba(82, 119, 168, 0.14)';
const SELECTED_STROKE = '#2F8A65';
const SELECTED_FILL = 'rgba(47, 138, 101, 0.18)';
const DRAFT_STROKE = '#C18A3C';
const STROKE_WIDTH = 2;
const SELECTED_STROKE_WIDTH = 2.5;
const LABEL_FONT_SIZE = 12;
const VERTEX_OFFSET = 8;

export function WorkspaceEditor({ camera }: { camera: Camera }): JSX.Element {
  const { controller } = useVision();
  const zones = useZones(camera.id);
  const snapshot = useCameraSnapshot(camera.id);
  const running = snapshot?.status === 'running';

  const [drawing, setDrawing] = useState(false);
  const [draftPoints, setDraftPoints] = useState<NormalizedPoint[]>([]);
  const [draftName, setDraftName] = useState('');
  const [draftPriority, setDraftPriority] = useState(0);
  const [selectedZoneId, setSelectedZoneId] = useState<Id | null>(null);
  /** Live vertex-drag state per zone; committed to the repository on drag end. */
  const [pointOverrides, setPointOverrides] = useState<Map<Id, NormalizedPoint[]>>(new Map());
  const [nameEdit, setNameEdit] = useState('');

  const selectedZone = zones.find((z) => z.id === selectedZoneId) ?? null;

  useEffect(() => {
    setNameEdit(selectedZone?.name ?? '');
  }, [selectedZone]);

  const effectivePoints = (zone: DeskZone): NormalizedPoint[] =>
    pointOverrides.get(zone.id) ?? zone.points;

  const finishDraft = (): void => {
    if (!isValidZonePolygon(draftPoints) || draftName.trim() === '') return;
    controller.saveZone({
      id: createId('zone'),
      cameraId: camera.id,
      name: draftName.trim(),
      points: draftPoints,
      priority: Math.round(draftPriority),
      createdAt: Date.now(),
    });
    setDrawing(false);
    setDraftPoints([]);
    setDraftName('');
    setDraftPriority(0);
  };

  const cancelDraft = (): void => {
    setDrawing(false);
    setDraftPoints([]);
  };

  const persistZonePoints = (zone: DeskZone): void => {
    const points = pointOverrides.get(zone.id);
    if (!points) return;
    controller.saveZone({ ...zone, points });
    setPointOverrides((prev) => {
      const next = new Map(prev);
      next.delete(zone.id);
      return next;
    });
  };

  const updateSelectedZone = (patch: Partial<DeskZone>): void => {
    if (!selectedZone) return;
    controller.saveZone({
      ...selectedZone,
      ...patch,
      points: pointOverrides.get(selectedZone.id) ?? selectedZone.points,
    });
  };

  return (
    <Card
      title={`Desk Calibration — ${camera.label}`}
      subtitle="Click on the video canvas to plot normalized polygon boundary points for workspace desk zones"
      actions={<Badge tone={running ? 'green' : 'zinc'} dot>{running ? 'Camera Live' : 'Camera Offline'}</Badge>}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Visual Stage Container */}
        <div className="flex flex-col">
          <div className="rounded-xl overflow-hidden border border-saas-border bg-slate-900 p-2 sm:p-4">
            <CameraStage cameraId={camera.id} videoSize={snapshot?.videoSize ?? null}>
              {(dims) =>
                dims && dims.width > 0 ? (
                  <Stage
                    width={dims.width}
                    height={dims.height}
                    className="absolute inset-0 cursor-crosshair"
                    onClick={(e) => {
                      if (!drawing) return;
                      const stage = e.target.getStage();
                      const pos = stage?.getPointerPosition();
                      if (!stage || !pos) return;
                      setDraftPoints((prev) => [
                        ...prev,
                        { x: clamp01(pos.x / stage.width()), y: clamp01(pos.y / stage.height()) },
                      ]);
                    }}
                    onContextMenu={(e) => {
                      if (!drawing) return;
                      e.evt.preventDefault();
                      setDraftPoints((prev) => prev.slice(0, -1));
                    }}
                  >
                    <Layer>
                      {zones.map((zone) => {
                        const selected = zone.id === selectedZoneId;
                        const points = effectivePoints(zone);
                        const flat = toStagePoints(points, dims);
                        const labelX = (points[0]?.x ?? 0) * dims.width + VERTEX_OFFSET;
                        const labelY = (points[0]?.y ?? 0) * dims.height + VERTEX_OFFSET;
                        return (
                          <Group key={zone.id}>
                            <Line
                              points={flat}
                              closed
                              stroke={selected ? SELECTED_STROKE : ZONE_STROKE}
                              strokeWidth={selected ? SELECTED_STROKE_WIDTH : STROKE_WIDTH}
                              fill={selected ? SELECTED_FILL : ZONE_FILL}
                              onClick={() => {
                                if (!drawing) setSelectedZoneId(zone.id);
                              }}
                            />
                            <Text
                              x={labelX}
                              y={labelY}
                              text={zone.name}
                              fontSize={LABEL_FONT_SIZE}
                              fontStyle="bold"
                              fill="#ffffff"
                            />
                            {selected &&
                              points.map((p, i) => (
                                <Circle
                                  key={`${zone.id}-v${i}`}
                                  x={p.x * dims.width}
                                  y={p.y * dims.height}
                                  radius={VERTEX_RADIUS}
                                  fill={SELECTED_STROKE}
                                  stroke="#ffffff"
                                  strokeWidth={1.5}
                                  draggable
                                  onDragMove={(e) => {
                                    const stage = e.target.getStage();
                                    if (!stage) return;
                                    const pos = e.target.position();
                                    const next = effectivePoints(zone).map((q, j) =>
                                      j === i
                                        ? {
                                            x: clamp01(pos.x / stage.width()),
                                            y: clamp01(pos.y / stage.height()),
                                          }
                                        : q,
                                    );
                                    setPointOverrides((prev) => new Map(prev).set(zone.id, next));
                                  }}
                                  onDragEnd={() => persistZonePoints(zone)}
                                />
                              ))}
                          </Group>
                        );
                      })}
                      {drawing && draftPoints.length > 0 && (
                        <Group>
                          <Line
                            points={toStagePoints(draftPoints, dims)}
                            closed={draftPoints.length >= 3}
                            stroke={DRAFT_STROKE}
                            strokeWidth={SELECTED_STROKE_WIDTH}
                            dash={[6, 4]}
                          />
                          {draftPoints.map((p, i) => (
                            <Circle
                              key={`draft-v${i}`}
                              x={p.x * dims.width}
                              y={p.y * dims.height}
                              radius={VERTEX_RADIUS}
                              fill={DRAFT_STROKE}
                              stroke="#ffffff"
                              strokeWidth={1.5}
                            />
                          ))}
                        </Group>
                      )}
                    </Layer>
                  </Stage>
                ) : null
              }
            </CameraStage>
          </div>
          {!running && (
            <p className="mt-2 text-xs text-saas-secondary">
              Camera is currently stopped. Start the camera feed to calibrate desk boundaries over real-time video frames.
            </p>
          )}
        </div>

        {/* Action & Zones Aside Panel */}
        <aside className="flex flex-col gap-4">
          {drawing ? (
            <Card
              title="Draw Polygon Boundary"
              subtitle="Left click to place vertex, right click to undo"
            >
              <div className="flex flex-col gap-3">
                <Field label="Desk Zone Name">
                  <TextInput
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    placeholder="e.g. Desk A1"
                    autoFocus
                  />
                </Field>
                <Field
                  label="Zone Priority"
                  hint="Higher priority resolves ties when tracks intersect multiple overlapping desks"
                >
                  <NumberInput
                    value={draftPriority}
                    onChange={(e) => {
                      const v = e.target.valueAsNumber;
                      if (Number.isFinite(v)) setDraftPriority(v);
                    }}
                  />
                </Field>
                <p className="text-xs font-medium text-saas-secondary">
                  {draftPoints.length} vertices placed (minimum 3 required)
                </p>
                <div className="flex gap-2 pt-1">
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={!isValidZonePolygon(draftPoints) || draftName.trim() === ''}
                    onClick={finishDraft}
                  >
                    Finish Zone
                  </Button>
                  <Button variant="ghost" size="sm" onClick={cancelDraft}>
                    Cancel
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <Card
              title="Zone Calibration"
              subtitle="Map desks in normalized frame coordinates"
              actions={
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Plus size={14} />}
                  onClick={() => {
                    setDrawing(true);
                    setSelectedZoneId(null);
                  }}
                >
                  Draw New Zone
                </Button>
              }
            >
              <p className="text-xs leading-relaxed text-saas-secondary">
                Click "Draw New Zone" and click vertices around desks. Coordinates automatically scale across resolutions.
              </p>
            </Card>
          )}

          {/* Existing Zones List */}
          <Card
            title={`Configured Zones (${zones.length})`}
            subtitle="Click zone to inspect or drag vertices to modify"
          >
            {zones.length === 0 ? (
              <EmptyState
                icon={<Layers size={24} />}
                title="No zones mapped yet"
                hint="Draw a desk zone polygon above to derive desk occupancy."
              />
            ) : (
              <ul className="flex flex-col gap-2.5">
                {zones.map((zone) => {
                  const selected = zone.id === selectedZoneId;
                  return (
                    <li
                      key={zone.id}
                      className={`rounded-lg border p-3 transition-colors ${
                        selected
                          ? 'border-saas-success bg-saas-success-light/40 shadow-subtle'
                          : 'border-saas-border bg-white hover:border-gray-300'
                      }`}
                    >
                      <button
                        className="flex w-full items-center justify-between gap-2 text-left"
                        onClick={() => setSelectedZoneId(selected ? null : zone.id)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-saas-primary">{zone.name}</span>
                          <Badge tone="zinc">P{zone.priority}</Badge>
                        </div>
                        <span className="text-[11px] text-saas-secondary font-medium">
                          {zone.points.length} vertices
                        </span>
                      </button>

                      {selected && (
                        <div className="mt-3 flex flex-col gap-2.5 border-t border-saas-border pt-3">
                          <Field label="Rename Zone">
                            <TextInput
                              value={nameEdit}
                              onChange={(e) => setNameEdit(e.target.value)}
                              onBlur={() => {
                                if (nameEdit.trim() !== '') updateSelectedZone({ name: nameEdit.trim() });
                              }}
                            />
                          </Field>
                          <Field label="Priority Level">
                            <NumberInput
                              value={zone.priority}
                              onChange={(e) => {
                                const v = e.target.valueAsNumber;
                                if (Number.isFinite(v)) updateSelectedZone({ priority: Math.round(v) });
                              }}
                            />
                          </Field>
                          <p className="text-[11px] text-saas-secondary font-medium">
                            Drag the green vertices on the camera canvas to reshape.
                          </p>
                          <div className="pt-1">
                            <ConfirmButton
                              label="Delete Desk Zone"
                              confirmLabel="Confirm Delete?"
                              size="sm"
                              onConfirm={() => {
                                controller.deleteZone(zone.id);
                                setSelectedZoneId(null);
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </aside>
      </div>
    </Card>
  );
}

function toStagePoints(points: NormalizedPoint[], dims: { width: number; height: number }): number[] {
  return points.flatMap((p) => [p.x * dims.width, p.y * dims.height]);
}
