/**
 * Temporal smoothing for displayed states.
 *
 * A displayed state only changes when a different raw state has been observed
 * *continuously* for `dwellMs` (hysteresis — prevents flicker). When
 * observations are missing (occlusion, detector dropout) the last displayed
 * state is held for `awayMs`; after that the filter falls back to its
 * `unknownValue` when one is configured, otherwise it keeps holding.
 */

export interface TemporalFilterOptions {
  dwellMs: number;
  awayMs: number;
}

export class TemporalStateFilter<S extends string> {
  private displayed: S;
  private candidate: S | null = null;
  private candidateObservedMs = 0;
  private lastUpdateAt: number | null = null;
  private lastObservationAt: number | null = null;
  private opts: TemporalFilterOptions;
  /** Value shown when evidence has been missing for longer than awayMs; null = keep last. */
  private readonly unknownValue: S | null;

  constructor(initial: S, opts: TemporalFilterOptions, unknownValue: S | null = null) {
    this.displayed = initial;
    this.opts = opts;
    this.unknownValue = unknownValue;
  }

  get value(): S {
    return this.displayed;
  }

  /** Live configuration updates (thresholds are user-configurable). */
  configure(opts: TemporalFilterOptions): void {
    this.opts = opts;
  }

  /** Record a raw observation at time `now` (epoch ms). Returns the displayed state. */
  observe(raw: S, now: number): S {
    const dt = this.lastUpdateAt === null ? 0 : Math.max(0, now - this.lastUpdateAt);
    this.lastUpdateAt = now;
    this.lastObservationAt = now;

    if (raw === this.displayed) {
      this.candidate = null;
      this.candidateObservedMs = 0;
      return this.displayed;
    }

    if (this.candidate !== raw) {
      this.candidate = raw;
      this.candidateObservedMs = 0;
    } else {
      this.candidateObservedMs += dt;
    }

    if (this.candidate === raw && this.candidateObservedMs >= this.opts.dwellMs) {
      this.displayed = raw;
      this.candidate = null;
      this.candidateObservedMs = 0;
    }
    return this.displayed;
  }

  /** Record "no evidence" at time `now` (track lost, pose missing, inference skipped). */
  missing(now: number): S {
    this.lastUpdateAt = now;
    // An interruption cancels a pending candidate: candidacy requires continuity.
    this.candidate = null;
    this.candidateObservedMs = 0;
    if (
      this.unknownValue !== null &&
      this.lastObservationAt !== null &&
      now - this.lastObservationAt > this.opts.awayMs
    ) {
      this.displayed = this.unknownValue;
    }
    return this.displayed;
  }
}
