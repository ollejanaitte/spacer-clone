// Ground motion preview and sample-count validation helpers.
//
// The helpers in this module are display-only and never mutate the
// project payload. They are used by the Ground Motion Manager panel
// to surface useful information about the active ground motion and
// to flag mismatches between `samples.length` and
// `duration / timeStep + 1` before the user runs the analysis.

export type GroundMotionSampleStatus =
  | { kind: "ok"; expected: number; actual: number }
  | { kind: "short"; expected: number; actual: number }
  | { kind: "long"; expected: number; actual: number }
  | { kind: "unknown" };

/**
 * Compare the current sample count to the value expected from
 * `duration / timeStep + 1`. Returns `kind: "unknown"` when either
 * `duration` or `timeStep` is non-positive or non-finite, so the UI
 * can render a "cannot verify" hint rather than a wrong verdict.
 */
export function computeGroundMotionSampleStatus(args: {
  duration: number;
  timeStep: number;
  sampleCount: number;
}): GroundMotionSampleStatus {
  const { duration, timeStep, sampleCount } = args;
  if (!Number.isFinite(duration) || duration <= 0) return { kind: "unknown" };
  if (!Number.isFinite(timeStep) || timeStep <= 0) return { kind: "unknown" };
  if (!Number.isFinite(sampleCount) || sampleCount < 0) return { kind: "unknown" };
  const expected = Math.round(duration / timeStep) + 1;
  if (sampleCount === expected) return { kind: "ok", expected, actual: sampleCount };
  if (sampleCount < expected) return { kind: "short", expected, actual: sampleCount };
  return { kind: "long", expected, actual: sampleCount };
}

export type GroundMotionPreview = {
  sampleCount: number;
  timeStep: number;
  duration: number;
  max: number;
  min: number;
  absMax: number;
};

/**
 * Compute a small preview summary for a ground motion record. The
 * preview is intentionally cheap: a single pass over the samples.
 * Non-finite values are ignored; an empty / all-non-finite series
 * returns `max = 0` and `min = 0`.
 */
export function computeGroundMotionPreview(args: {
  samples: number[];
  timeStep: number;
  duration: number;
}): GroundMotionPreview {
  const samples = Array.isArray(args.samples) ? args.samples : [];
  let max = -Infinity;
  let min = Infinity;
  for (const value of samples) {
    if (!Number.isFinite(value)) continue;
    if (value > max) max = value;
    if (value < min) min = value;
  }
  if (!Number.isFinite(max)) max = 0;
  if (!Number.isFinite(min)) min = 0;
  return {
    sampleCount: samples.length,
    timeStep: args.timeStep,
    duration: args.duration,
    max,
    min,
    absMax: Math.max(Math.abs(max), Math.abs(min)),
  };
}
