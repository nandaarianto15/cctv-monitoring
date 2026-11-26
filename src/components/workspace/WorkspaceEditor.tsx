/**
 * Workspace editor: draw/edit/delete desk polygons per camera on a live (or
 * offline) stage. Coordinates are normalized (0..1) and persisted per cameraId
 * through the repository. Foot-point containment + zone priority drive
 * occupancy matching (see services/workspace/zoneMatcher).
 *
 * Vyra dark treatment (self-contained): dark panels, inputs, buttons and
 * badges are defined in-file; konva zone palette remapped to Vyra accents.
 */
import { useEffect, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import { Circle, Group, Layer, Line, Stage, Text } from 'react-konva';
import type { Camera, DeskZone, Id, NormalizedPoint } from '../../types';
import { useVision } from '../../state/VisionContext';
import { useCameraSnapshot, useZones } from '../../hooks/useVision';
import { CameraStage } from '../camera/CameraStage';
import { clamp01, isValidZonePolygon } from '../../utils/geometry';
import { createId } from '../../utils/id';
import { Layers, Plus } from '../icons';

/* ---------------- Konva palette - remapped to Vyra accents ---------------- */

const VERTEX_RADIUS = 6;
const ZONE_STROKE = '#7AA2F7'; // Vyra blue
const ZONE_FILL = 'rgba(122, 162, 247, 0.12)';
const SELECTED_STROKE = '#4ADE80'; // Vyra green
const SELECTED_FILL = 'rgba(74, 222, 128, 0.14)';
const DRAFT_STROKE = '#F0B26B'; // warm amber for in-progress draft
const VERTEX_RING = '#F2F5FA';
const STROKE_WIDTH = 2;
const SELECTED_STROKE_WIDTH = 2.5;
const LABEL_FONT_SIZE = 12;
const VERTEX_OFFSET = 8;

/* ---------------- Local dark primitives (Vyra recipes, kept in-file) ---------------- */

const INPUT_CLASS =
  'w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-[12px] font-medium text-[#E8ECF4] placeholder:text-[#5A6474] outline-none transition-colors hover:border-white/[0.16] focus:border-[#7AA2F7]/40 focus:bg-[#7AA2F7]/[0.05]';

/** Dark panel - the Card replacement: soft header strip + body. */
function DarkPanel({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] bg-white/[0.015] px-5 py-3.5">
        <div className="min-w-0">
          <h3 className="truncate text-[13px] font-semibold text-[#E8ECF4]">{title}</h3>
          {subtitle && <p className="mt-0.5 text-[11.5px] text-[#5A6474]">{subtitle}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </header>
      <div className="p-4 md:p-5">{children}</div>
    </section>
  );
}

/** Dark pill badge - zinc (neutral) or green (live). */
function DarkBadge({
  tone = 'zinc',
  dot = false,
  children,
}: {
  tone?: 'zinc' | 'green';
  dot?: boolean;
  children: ReactNode;
}) {
  const tones = {
    zinc: 'border-white/[0.08] bg-white/[0.03] text-[#96A0B0]',
    green: 'border-[#4ADE80]/25 bg-[#4ADE80]/[0.08] text-[#4ADE80]',
  } as const;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${tones[tone]}`}
    >
      {dot && (
        <span className={`h-1.5 w-1.5 rounded-full ${tone === 'green' ? 'animate-pulse bg-[#4ADE80]' : 'bg-[#5A6474]'}`} />
      )}
      {children}
    </span>
  );
}

/** Dark button - gradient primary, ghost secondary, danger for destructive. */
function DarkButton({
  variant = 'primary',
  size = 'md',
  disabled = false,
  icon,
  children,
  onClick,
}: {
  variant?: 'primary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  disabled?: boolean;
  icon?: ReactNode;
  children: ReactNode;
  onClick?: () => void;
}) {
  const sizes = {
    sm: 'px-3 py-1.5 text-[11.5px]',
    md: 'px-3.5 py-2 text-[12px]',
  } as const;
  const variants = {
    primary:
      'bg-gradient-to-r from-[#5D87E8] to-[#7AA2F7] text-white shadow-[0_10px_28px_-10px_rgba(122,162,247,0.65)] hover:brightness-110',
    ghost:
      'border border-white/[0.08] bg-white/[0.02] text-[#E8ECF4] hover:border-white/[0.16] hover:bg-white/[0.05]',
    danger:
      'border border-rose-500/30 bg-rose-500/[0.08] text-rose-300 hover:bg-rose-500/[0.16]',
  } as const;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40 ${sizes[size]} ${variants[variant]}`}
    >
      {icon}
      {children}
    </button>
  );
}

/** Two-step destructive action (dark). Auto-resets after 4s. */
function ConfirmButton({
  label,
  confirmLabel,
  onConfirm,
}: {
  label: string;
  confirmLabel: string;
  onConfirm: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  return (
    <DarkButton
      variant={confirming ? 'danger' : 'ghost'}
      size="sm"
      onClick={() => {
        if (confirming) {
          onConfirm();
          setConfirming(false);
        } else {
          setConfirming(true);
          window.setTimeout(() => setConfirming(false), 4000);
        }
      }}
    >
      {confirming ? confirmLabel : label}
    </DarkButton>
  );
}

/** Dark field wrapper - uppercase micro-label + optional hint. */
function DarkField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#5A6474]">
        {label}
      </span>
      {children}
      {hint && <p className="text-[11px] leading-relaxed text-[#5A6474]">{hint}</p>}
    </div>
  );
}

function DarkTextInput({
  value,
  onChange,
  onBlur,
  placeholder,
  autoFocus,
}: {
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onBlur?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <input
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      placeholder={placeholder}
      autoFocus={autoFocus}
      className={INPUT_CLASS}
    />
  );
}

function DarkNumberInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
  return <input type="number" value={value} onChange={onChange} className={INPUT_CLASS} />;
}

/** Dark empty state - no gray boxes, stays on the dark canvas. */
function DarkEmptyBlock({ icon, title, hint }: { icon: ReactNode; title: string; hint: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03] text-[#5A6474]">
        {icon}
      </div>
      <p className="text-[13px] font-semibold text-[#96A0B0]">{title}</p>
      <p className="max-w-xs text-[11.5px] leading-relaxed text-[#5A6474]">{hint}</p>
    </div>
  );
}

/* ---------------- Editor ---------------- */

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
    <DarkPanel
      title={`Desk Calibration - ${camera.label}`}
      subtitle="Click on the video canvas to plot normalized polygon boundary points for workspace desk zones"
      actions={
        <DarkBadge tone={running ? 'green' : 'zinc'} dot>
          {running ? 'Camera Live' : 'Camera Offline'}
        </DarkBadge>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Visual Stage Container */}
        <div className="flex flex-col">
          <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#04060A] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] sm:p-3">
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
                              fill="#E8ECF4"
                              shadowColor="rgba(0, 0, 0, 0.75)"
                              shadowBlur={4}
                            />
                            {selected &&
                              points.map((p, i) => (
                                <Circle
                                  key={`${zone.id}-v${i}`}
                                  x={p.x * dims.width}
                                  y={p.y * dims.height}
                                  radius={VERTEX_RADIUS}
                                  fill={SELECTED_STROKE}
                                  stroke={VERTEX_RING}
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
                              stroke={VERTEX_RING}
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
            <p className="mt-2.5 flex items-center gap-2 text-[11.5px] text-[#5A6474]">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#F0B26B]" />
              Camera is currently stopped. Start the camera feed to calibrate desk boundaries over real-time video frames.
            </p>
          )}
        </div>

        {/* Action & Zones Aside Panel */}
        <aside className="flex flex-col gap-4">
          {drawing ? (
            <DarkPanel
              title="Draw Polygon Boundary"
              subtitle="Left click to place vertex · right click to undo"
            >
              <div className="flex flex-col gap-3">
                <DarkField label="Desk Zone Name">
                  <DarkTextInput
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    placeholder="e.g. Desk A1"
                    autoFocus
                  />
                </DarkField>
                <DarkField
                  label="Zone Priority"
                  hint="Higher priority resolves ties when tracks intersect multiple overlapping desks"
                >
                  <DarkNumberInput
                    value={draftPriority}
                    onChange={(e) => {
                      const v = e.target.valueAsNumber;
                      if (Number.isFinite(v)) setDraftPriority(v);
                    }}
                  />
                </DarkField>
                <p className="text-[11.5px] font-medium text-[#96A0B0]">
                  {draftPoints.length} vertices placed (minimum 3 required)
                </p>
                <div className="flex gap-2 pt-1">
                  <DarkButton
                    variant="primary"
                    size="sm"
                    disabled={!isValidZonePolygon(draftPoints) || draftName.trim() === ''}
                    onClick={finishDraft}
                  >
                    Finish Zone
                  </DarkButton>
                  <DarkButton variant="ghost" size="sm" onClick={cancelDraft}>
                    Cancel
                  </DarkButton>
                </div>
              </div>
            </DarkPanel>
          ) : (
            <DarkPanel
              title="Zone Calibration"
              subtitle="Map desks in normalized frame coordinates"
              actions={
                <DarkButton
                  variant="primary"
                  size="sm"
                  icon={<Plus size={14} />}
                  onClick={() => {
                    setDrawing(true);
                    setSelectedZoneId(null);
                  }}
                >
                  Draw New Zone
                </DarkButton>
              }
            >
              <p className="text-[11.5px] leading-relaxed text-[#5A6474]">
                Click "Draw New Zone" and click vertices around desks. Coordinates automatically
                scale across resolutions.
              </p>
            </DarkPanel>
          )}

          {/* Existing Zones List */}
          <DarkPanel
            title={`Configured Zones (${zones.length})`}
            subtitle="Click zone to inspect or drag vertices to modify"
          >
            {zones.length === 0 ? (
              <DarkEmptyBlock
                icon={<Layers size={18} />}
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
                      className={`rounded-xl border p-3 transition-all duration-200 ${
                        selected
                          ? 'border-[#4ADE80]/30 bg-[#4ADE80]/[0.06] shadow-[0_8px_24px_-14px_rgba(74,222,128,0.4)]'
                          : 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.18]'
                      }`}
                    >
                      <button
                        className="flex w-full items-center justify-between gap-2 text-left"
                        onClick={() => setSelectedZoneId(selected ? null : zone.id)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-semibold text-[#E8ECF4]">{zone.name}</span>
                          <DarkBadge tone="zinc">P{zone.priority}</DarkBadge>
                        </div>
                        <span className="text-[11px] font-medium text-[#5A6474]">
                          {zone.points.length} vertices
                        </span>
                      </button>

                      {selected && (
                        <div className="mt-3 flex flex-col gap-2.5 border-t border-white/[0.06] pt-3">
                          <DarkField label="Rename Zone">
                            <DarkTextInput
                              value={nameEdit}
                              onChange={(e) => setNameEdit(e.target.value)}
                              onBlur={() => {
                                if (nameEdit.trim() !== '') updateSelectedZone({ name: nameEdit.trim() });
                              }}
                            />
                          </DarkField>
                          <DarkField label="Priority Level">
                            <DarkNumberInput
                              value={zone.priority}
                              onChange={(e) => {
                                const v = e.target.valueAsNumber;
                                if (Number.isFinite(v)) updateSelectedZone({ priority: Math.round(v) });
                              }}
                            />
                          </DarkField>
                          <p className="text-[11px] font-medium text-[#5A6474]">
                            Drag the glowing green vertices on the camera canvas to reshape.
                          </p>
                          <div className="pt-1">
                            <ConfirmButton
                              label="Delete Desk Zone"
                              confirmLabel="Confirm Delete?"
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
          </DarkPanel>
        </aside>
      </div>
    </DarkPanel>
  );
}

function toStagePoints(points: NormalizedPoint[], dims: { width: number; height: number }): number[] {
  return points.flatMap((p) => [p.x * dims.width, p.y * dims.height]);
}