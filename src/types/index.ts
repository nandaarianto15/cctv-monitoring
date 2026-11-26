/**
 * Domain types - the single source of truth for data shapes shared between
 * services, persistence and UI.
 */

export type Id = string;

/** Point in normalized frame coordinates (0..1, origin top-left). */
export interface NormalizedPoint {
  x: number;
  y: number;
}

/** Bounding box in normalized frame coordinates (0..1). */
export interface NormalizedBBox {
  /** Left edge. */
  x: number;
  /** Top edge. */
  y: number;
  width: number;
  height: number;
}

// ---------------------------------------------------------------------------
// Cameras
// ---------------------------------------------------------------------------

/** Camera sources. `rtsp-webrtc` is reserved for a future adapter; only getUserMedia is implemented. */
export type CameraSourceKind = 'usermedia' | 'rtsp-webrtc';

export interface Camera {
  id: Id;
  label: string;
  kind: CameraSourceKind;
  /** getUserMedia deviceId; null = system default camera. */
  deviceId: string | null;
  /** Preferred facing mode (relevant on phones). */
  facingMode: 'user' | 'environment' | null;
  createdAt: number;
}

// ---------------------------------------------------------------------------
// Employees
// ---------------------------------------------------------------------------

export interface Employee {
  id: Id;
  name: string;
  role: string;
  notes: string;
  active: boolean;
  createdAt: number;
}

// ---------------------------------------------------------------------------
// Workspace zones
// ---------------------------------------------------------------------------

export interface DeskZone {
  id: Id;
  cameraId: Id;
  name: string;
  /** Polygon vertices in normalized frame coordinates (0..1). */
  points: NormalizedPoint[];
  /** Higher priority wins when a foot point matches several zones; ties stay AMBIGUOUS. */
  priority: number;
  createdAt: number;
}

// ---------------------------------------------------------------------------
// States (independent dimensions; UNKNOWN whenever evidence is insufficient)
// ---------------------------------------------------------------------------

export type OccupancyState = 'IN_ZONE' | 'OUT_ZONE';
export type PostureState = 'SITTING' | 'STANDING' | 'UNKNOWN';
export type ActivityState = 'WORKING' | 'NOT_WORKING' | 'UNKNOWN';
export type DeskState = 'OCCUPIED' | 'UNOCCUPIED' | 'UNKNOWN';
export type TrackStatus = 'TENTATIVE' | 'CONFIRMED' | 'LOST';

// ---------------------------------------------------------------------------
// Tracking
// ---------------------------------------------------------------------------

export interface PersonDetection {
  /** Normalized bounding box (0..1). */
  bbox: NormalizedBBox;
  /** Detector confidence (0..1). */
  score: number;
}

export interface TrackStateSnapshot {
  occupancy: OccupancyState;
  posture: PostureState;
  activity: ActivityState;
}

/** Result of matching a foot point against the zones of one camera. */
export interface ZoneMatch {
  /** Resolved zone id, or null when absent or ambiguous. */
  zoneId: Id | null;
  zoneName: string | null;
  /** True when multiple zones matched with no unique priority winner. */
  ambiguous: boolean;
  /** All matching zone ids before priority resolution. */
  matchedZoneIds: Id[];
}

export interface TrackView {
  trackId: Id;
  cameraId: Id;
  bbox: NormalizedBBox;
  confidence: number;
  status: TrackStatus;
  firstSeen: number;
  lastSeen: number;
  state: TrackStateSnapshot;
  zone: ZoneMatch;
  /** True when a pose was matched to this track in the last processed frame. */
  poseDetected: boolean;
  employeeId: Id | null;
}

// ---------------------------------------------------------------------------
// Desk occupancy views
// ---------------------------------------------------------------------------

export interface DeskOccupant {
  trackId: Id;
  employeeId: Id | null;
}

export interface DeskZoneView {
  zoneId: Id;
  cameraId: Id;
  name: string;
  state: DeskState;
  occupants: DeskOccupant[];
}

// ---------------------------------------------------------------------------
// Track <-> employee assignment (manual only; never derived automatically)
// ---------------------------------------------------------------------------

export interface TrackAssignment {
  trackId: Id;
  cameraId: Id;
  employeeId: Id;
  assignedAt: number;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export type EventField = 'occupancy' | 'posture' | 'activity' | 'deskState' | 'assignment';

export interface VisionEventBase {
  id: Id;
  /** Epoch milliseconds. */
  ts: number;
  cameraId: Id;
  /** Track id for occupancy/posture/activity/assignment; zone id for deskState. */
  subjectId: Id;
  field: EventField;
  /** Previous value (state name or employee id), null when none. */
  from: string | null;
  /** New value, null when the subject disappeared (e.g. assignment invalidated). */
  to: string | null;
}

export interface OccupancyEvent extends VisionEventBase {
  field: 'occupancy';
}
export interface PostureEvent extends VisionEventBase {
  field: 'posture';
}
export interface ActivityEvent extends VisionEventBase {
  field: 'activity';
}
export interface DeskStateEvent extends VisionEventBase {
  field: 'deskState';
}
export interface AssignmentEvent extends VisionEventBase {
  field: 'assignment';
}

export type VisionEvent =
  | OccupancyEvent
  | PostureEvent
  | ActivityEvent
  | DeskStateEvent
  | AssignmentEvent;

// ---------------------------------------------------------------------------
// Camera runtime (UI-facing pipeline snapshot)
// ---------------------------------------------------------------------------

export type CameraRunStatus = 'idle' | 'starting' | 'running' | 'error';

export interface CameraRuntimeStats {
  /** Inference rate over the recent window (EMA). */
  inferenceFps: number;
  /** Latency of the most recent inference pass (ms). */
  lastInferenceMs: number;
  framesProcessed: number;
}

export interface CameraSnapshot {
  cameraId: Id;
  status: CameraRunStatus;
  error: string | null;
  /** Resolution of the active stream, if known. */
  videoSize: { width: number; height: number } | null;
  stats: CameraRuntimeStats;
  tracks: TrackView[];
  desks: DeskZoneView[];
}

export interface VisionSnapshot {
  cameras: CameraSnapshot[];
  /** True while AI models are downloading/initializing. */
  modelsLoading: boolean;
  modelsError: string | null;
  /** True once the detection + pose models are loaded (models load lazily). */
  modelsReady: boolean;
}
