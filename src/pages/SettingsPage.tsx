import { useEffect, useState } from 'react';
import type { AppConfig } from '../config';
import { useVision } from '../state/VisionContext';
import { Button, Card, NumberInput } from '../components/ui/primitives';
import { Check, Shield } from '../components/icons';

export function SettingsPage(): JSX.Element {
  const { config, updateConfig, resetConfig } = useVision();
  const [draft, setDraft] = useState<AppConfig>(() => config);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    setDraft(config);
  }, [config]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(config);

  const setNumber = (section: keyof AppConfig, field: string, value: number): void => {
    setDraft((prev) => ({
      ...prev,
      [section]: { ...(prev[section] as Record<string, unknown>), [field]: value },
    }) as AppConfig);
  };

  const handleSave = () => {
    updateConfig(draft);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  const numberRow = (
    label: string,
    section: keyof AppConfig,
    field: string,
    opts: { unit?: string; min?: number; max?: number; step?: number; hint?: string } = {}
  ): JSX.Element => (
    <div className="flex items-center justify-between gap-4 border-b border-saas-border/60 py-2.5 last:border-b-0">
      <div>
        <span className="text-xs font-semibold text-saas-primary block">{label}</span>
        {opts.hint && <span className="text-[11px] text-saas-secondary">{opts.hint}</span>}
      </div>
      <NumberInput
        value={String((draft[section] as Record<string, unknown>)[field])}
        unit={opts.unit}
        min={opts.min}
        max={opts.max}
        step={opts.step}
        onChange={(e) => {
          const v = e.target.valueAsNumber;
          if (Number.isFinite(v)) setNumber(section, field, v);
        }}
      />
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-saas-border pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-saas-primary">System Settings</h1>
          <p className="text-xs text-saas-secondary mt-0.5">
            Configure detection confidence, temporal smoothing thresholds, camera capture, and repository retention.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {savedNotice && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-saas-success">
              <Check size={14} />
              Saved successfully
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={resetConfig}
            disabled={!dirty && JSON.stringify(config) === JSON.stringify(draft)}
          >
            Restore Defaults
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={!dirty}
            onClick={handleSave}
          >
            Save Changes
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Inference Budget */}
        <Card
          title="Inference Engine Budget"
          subtitle="Frame processing rate and model confidence thresholds"
        >
          {numberRow('Max Inference Frame Rate', 'inference', 'maxFps', {
            unit: 'fps',
            min: 1,
            max: 30,
            step: 1,
            hint: 'Cap inference to conserve battery and CPU/GPU resources',
          })}
          {numberRow('Frame Scale Max Width', 'inference', 'frameMaxWidth', {
            unit: 'px',
            min: 320,
            max: 1280,
            step: 32,
            hint: 'Downscaled input dimension before feeding detector',
          })}
          {numberRow('Min Person Confidence', 'inference', 'minPersonConfidence', {
            min: 0.1,
            max: 0.95,
            step: 0.05,
            hint: 'COCO-SSD score required to register a detection',
          })}
          {numberRow('Max Persons Handled', 'inference', 'maxPersons', {
            min: 1,
            max: 20,
            step: 1,
            hint: 'Maximum concurrent detected persons per frame',
          })}
          {numberRow('Simultaneous Pose Estimations', 'inference', 'maxPoses', {
            min: 1,
            max: 4,
            step: 1,
            hint: 'MediaPipe PoseLandmarker concurrent pose instances',
          })}
        </Card>

        {/* Tracking & Continuity */}
        <Card
          title="Tracking & Occlusion Grace"
          subtitle="IoU spatial associations and track confirmation"
        >
          {numberRow('IoU Matching Threshold', 'tracking', 'iouThreshold', {
            min: 0.05,
            max: 0.9,
            step: 0.05,
            hint: 'Minimum bounding box overlap for track continuity',
          })}
          {numberRow('Pose Matching IoU', 'tracking', 'poseMatchIouThreshold', {
            min: 0.05,
            max: 0.9,
            step: 0.05,
            hint: 'Overlap between person box and pose landmark bounds',
          })}
          {numberRow('Frames to Confirm Track', 'tracking', 'confirmFrames', {
            min: 1,
            max: 10,
            step: 1,
            hint: 'Consecutive detections before status transitions to CONFIRMED',
          })}
          {numberRow('Lost Track Grace Window', 'tracking', 'lostGraceMs', {
            unit: 'ms',
            min: 500,
            max: 10000,
            step: 250,
            hint: 'Duration a track survives brief camera occlusion',
          })}
          {numberRow('Track Expiry Timeout', 'tracking', 'expiryMs', {
            unit: 'ms',
            min: 2000,
            max: 60000,
            step: 1000,
            hint: 'When expired, manual staff assignment is safely unlinked',
          })}
          {numberRow('Bounding Box Smoothing EMA', 'tracking', 'bboxSmoothing', {
            min: 0.1,
            max: 1.0,
            step: 0.05,
            hint: 'Exponential moving average: 0.1 = heavy filter, 1.0 = raw',
          })}
        </Card>

        {/* Temporal Smoothing */}
        <Card
          title="Temporal State Smoothing"
          subtitle="Debouncing and dwell times to prevent state flicker"
        >
          {numberRow('State Dwell Time', 'temporal', 'dwellMs', {
            unit: 'ms',
            min: 250,
            max: 10000,
            step: 250,
            hint: 'Continuous observation required before updating state display',
          })}
          {numberRow('Away Hold Duration', 'temporal', 'awayMs', {
            unit: 'ms',
            min: 1000,
            max: 60000,
            step: 1000,
            hint: 'Grace period before missing observation reverts to UNKNOWN',
          })}
        </Card>

        {/* Activity & Posture Heuristics */}
        <Card
          title="Posture & Activity Heuristics"
          subtitle="Geometric angle thresholds and wrist proximity constraints"
        >
          {numberRow('Min Landmark Visibility', 'posture', 'minVisibility', {
            min: 0.1,
            max: 0.95,
            step: 0.05,
            hint: 'MediaPipe landmark visibility threshold',
          })}
          {numberRow('Sitting Knee Angle Limit', 'posture', 'sittingKneeAngleDeg', {
            unit: 'deg',
            min: 60,
            max: 130,
            step: 5,
            hint: 'Angles below this contribute to SITTING state',
          })}
          {numberRow('Standing Knee Angle Limit', 'posture', 'standingKneeAngleDeg', {
            unit: 'deg',
            min: 130,
            max: 180,
            step: 5,
            hint: 'Angles above this contribute to STANDING state',
          })}
          {numberRow('Wrist Proximity Distance', 'activity', 'wristNearZoneDistance', {
            min: 0.01,
            max: 0.3,
            step: 0.01,
            hint: 'Max fraction of frame width for wrist to count as near desk',
          })}
        </Card>

        {/* Data Retention & Privacy */}
        <Card
          title="Data Retention & Privacy"
          subtitle="Local storage repository buffer size"
        >
          {numberRow('Telemetry Event Retention Limit', 'events', 'retentionLimit', {
            min: 100,
            max: 10000,
            step: 100,
            hint: 'FIFO maximum event records retained in LocalStorage',
          })}
          <div className="mt-4 rounded-lg border border-saas-border bg-saas-bg/60 p-3 text-xs text-saas-secondary">
            <div className="flex items-center gap-2 font-semibold text-saas-primary mb-1">
              <Shield size={14} className="text-saas-accent" />
              <span>Zero Video Storage Guarantee</span>
            </div>
            Frames from getUserMedia are processed transiently in WebGL memory. No images or video streams are ever stored or uploaded.
          </div>
        </Card>
      </div>
    </div>
  );
}
