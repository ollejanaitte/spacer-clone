import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ProjectModel, TimeHistoryResult } from "../types";
import {
  ALLOWED_TIME_HISTORY_ANIMATION_SPEEDS,
  DEFAULT_TIME_HISTORY_ANIMATION_SCALE,
  DEFAULT_TIME_HISTORY_ANIMATION_SPEED,
  DEFAULT_TIME_HISTORY_DISPLACEMENT_MODE,
  clampTimeIndex,
  computeAutoDisplacementScale,
  computeMaxAbsDisplacement,
  computeModelSize,
  computeTimeHistoryNodeOverride,
  findMaxAbsTimeIndex,
  type TimeHistoryAnimationOverride,
  type TimeHistoryDisplacementMode,
} from "./timeHistoryAnimation";

export type TimeHistorySeriesKind = "displacement" | "velocity" | "acceleration";

export type TimeHistoryAnimationStateBundle = {
  state: {
    currentTimeIndex: number;
    isPlaying: boolean;
    playbackSpeed: number;
    displacementScale: number;
    displacementMode: TimeHistoryDisplacementMode;
    loop: boolean;
  };
  setters: {
    setCurrentTimeIndex: (index: number) => void;
    setIsPlaying: (playing: boolean) => void;
    setPlaybackSpeed: (speed: number) => void;
    setDisplacementScale: (scale: number) => void;
    setDisplacementMode: (mode: TimeHistoryDisplacementMode) => void;
  };
  override: TimeHistoryAnimationOverride | null;
  sampleCount: number;
  enabled: boolean;
  reset: () => void;
  jumpToMax: (selectedKey: string | null, seriesKind: TimeHistorySeriesKind) => void;
  currentTimeSeconds: number;
  currentValue: number;
  maxAbsValue: number;
  maxAbsTimeSeconds: number;
  largeScaleWarning: boolean;
};

/**
 * Hook that owns the Time History animation state. The hook:
 *   - tracks the active time index, the play/pause flag, the playback
 *     speed, and the displacement scale;
 *   - drives the time index forward when `isPlaying` is true;
 *   - computes the per-node override map consumed by the 3D viewer.
 *
 * The hook never mutates the project payload, the analysis result, or
 * the API contract. The override is recomputed whenever the active
 * time index, the displacement scale, or the result changes.
 */
export function useTimeHistoryAnimationState(args: {
  project: ProjectModel | null;
  result: TimeHistoryResult | null | undefined;
  selectedKey?: string | null;
  seriesKind?: TimeHistorySeriesKind;
}): TimeHistoryAnimationStateBundle {
  const { project, result } = args;
  const meta = result?.meta;
  const sampleCount = typeof meta?.sampleCount === "number" && Number.isFinite(meta.sampleCount)
    ? Math.max(0, Math.floor(meta.sampleCount))
    : 0;

  const [currentTimeIndex, setCurrentTimeIndexRaw] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeedRaw] = useState<number>(DEFAULT_TIME_HISTORY_ANIMATION_SPEED);
  const [displacementScale, setDisplacementScaleRaw] = useState<number>(DEFAULT_TIME_HISTORY_ANIMATION_SCALE);
  const [displacementMode, setDisplacementModeRaw] = useState<TimeHistoryDisplacementMode>(DEFAULT_TIME_HISTORY_DISPLACEMENT_MODE);
  const [hasAppliedAutoScale, setHasAppliedAutoScale] = useState(false);
  const loop = true;

  // Reset the active time index whenever a new result arrives. We
  // compare by reference so two equal results do not reset the index.
  const lastResultRef = useRef<TimeHistoryResult | null | undefined>(result);
  useEffect(() => {
    if (lastResultRef.current !== result) {
      lastResultRef.current = result;
      setCurrentTimeIndexRaw(0);
      setIsPlaying(false);
    }
  }, [result]);

  const setCurrentTimeIndex = useCallback(
    (index: number) => {
      setCurrentTimeIndexRaw(clampTimeIndex(index, sampleCount));
    },
    [sampleCount],
  );

  const setPlaybackSpeed = useCallback((speed: number) => {
    if (!Number.isFinite(speed) || speed <= 0) return;
    if (ALLOWED_TIME_HISTORY_ANIMATION_SPEEDS.includes(speed)) {
      setPlaybackSpeedRaw(speed);
    } else {
      // Pick the closest allowed value.
      let closest = ALLOWED_TIME_HISTORY_ANIMATION_SPEEDS[0];
      let minDiff = Math.abs(speed - closest);
      for (const candidate of ALLOWED_TIME_HISTORY_ANIMATION_SPEEDS) {
        const diff = Math.abs(speed - candidate);
        if (diff < minDiff) {
          minDiff = diff;
          closest = candidate;
        }
      }
      setPlaybackSpeedRaw(closest);
    }
  }, []);

  const setDisplacementScale = useCallback((scale: number) => {
    if (!Number.isFinite(scale) || scale <= 0) return;
    setDisplacementScaleRaw(scale);
    setHasAppliedAutoScale(true);
  }, []);

  const setDisplacementMode = useCallback((mode: TimeHistoryDisplacementMode) => {
    if (mode !== "x" && mode !== "y" && mode !== "z" && mode !== "xyz") return;
    setDisplacementModeRaw(mode);
  }, []);

  const reset = useCallback(() => {
    setCurrentTimeIndexRaw(0);
    setIsPlaying(false);
    setPlaybackSpeedRaw(DEFAULT_TIME_HISTORY_ANIMATION_SPEED);
    setDisplacementScaleRaw(DEFAULT_TIME_HISTORY_ANIMATION_SCALE);
    setDisplacementModeRaw(DEFAULT_TIME_HISTORY_DISPLACEMENT_MODE);
    setHasAppliedAutoScale(false);
  }, []);

  // Playback clock. We tick via `setInterval` so we do not depend on
  // the `requestAnimationFrame` loop. The interval is paused when the
  // sample count is zero.
  useEffect(() => {
    if (!isPlaying) return undefined;
    if (sampleCount === 0) return undefined;
    let lastTick = performance.now();
    const intervalId = window.setInterval(() => {
      const now = performance.now();
      const deltaSeconds = (now - lastTick) / 1000;
      lastTick = now;
      // One tick advances the index by `playbackSpeed` samples per
      // second, sampled at the active interval. We keep the
      // implementation simple: one sample per tick at the current
      // speed, with no sub-sample interpolation. The result is good
      // enough for the MVP.
      setCurrentTimeIndexRaw((current) => {
        const next = current + Math.max(1, Math.round(playbackSpeed * deltaSeconds * 4));
        if (next >= sampleCount - 1) {
          if (loop) return 0;
          setIsPlaying(false);
          return sampleCount - 1;
        }
        return next;
      });
    }, 50);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [isPlaying, playbackSpeed, sampleCount, loop]);

  const override = useMemo(
    () =>
      project
        ? computeTimeHistoryNodeOverride({
            project,
            result,
            timeIndex: clampTimeIndex(currentTimeIndex, sampleCount),
            displacementScale,
            displacementMode,
          })
        : null,
    [project, result, currentTimeIndex, displacementScale, displacementMode, sampleCount],
  );

  const hasDisplacementData = Boolean(
    result && result.displacements && Object.keys(result.displacements).length > 0,
  );
  const enabled = Boolean(result && hasDisplacementData && sampleCount > 0);

  // Auto-scale: when a fresh result arrives, compute a sensible
  // default scale from the model size and the max absolute
  // displacement, unless the user has already provided an override.
  const modelSize = computeModelSize(project);
  const maxAbsDisplacement = computeMaxAbsDisplacement(result);
  const autoScale = computeAutoDisplacementScale({ modelSize, maxAbsDisplacement });
  useEffect(() => {
    if (hasAppliedAutoScale) return;
    if (!result) return;
    if (sampleCount === 0) return;
    setDisplacementScaleRaw(autoScale);
  }, [autoScale, hasAppliedAutoScale, result, sampleCount]);

  const selectedKey = typeof args.selectedKey === "string" ? args.selectedKey : null;
  const seriesKind: TimeHistorySeriesKind = args.seriesKind ?? "displacement";

  const jumpToMax = useCallback(
    (keyArg: string | null, kindArg: TimeHistorySeriesKind) => {
      const index = findMaxAbsTimeIndex({
        result,
        selectedKey: keyArg,
        seriesKind: kindArg,
        sampleCount,
        fallback: currentTimeIndex,
      });
      setCurrentTimeIndexRaw(index);
      setIsPlaying(false);
    },
    [result, sampleCount, currentTimeIndex],
  );

  const timeStep = typeof result?.meta?.timeStep === "number" && Number.isFinite(result.meta.timeStep)
    ? result.meta.timeStep
    : 0;
  const currentTimeSeconds = clampTimeIndex(currentTimeIndex, sampleCount) * timeStep;
  const maxAbsIndex = findMaxAbsTimeIndex({
    result,
    selectedKey,
    seriesKind,
    sampleCount,
    fallback: 0,
  });
  const maxAbsTimeSeconds = maxAbsIndex * timeStep;
  const activeSeriesTable = seriesKind === "velocity"
    ? result?.velocities
    : seriesKind === "acceleration"
      ? result?.accelerations
      : result?.displacements;
  let maxAbsValue = 0;
  if (activeSeriesTable && selectedKey && Array.isArray(activeSeriesTable[selectedKey])) {
    const series = activeSeriesTable[selectedKey];
    for (const value of series) {
      if (typeof value === "number" && Number.isFinite(value)) {
        const abs = Math.abs(value);
        if (abs > maxAbsValue) maxAbsValue = abs;
      }
    }
  } else if (activeSeriesTable) {
    for (const key of Object.keys(activeSeriesTable)) {
      if (
        !key.endsWith("_ux") &&
        !key.endsWith("_uy") &&
        !key.endsWith("_uz") &&
        key.includes("_")
      ) {
        continue;
      }
      const series = activeSeriesTable[key];
      if (!Array.isArray(series)) continue;
      for (const value of series) {
        if (typeof value === "number" && Number.isFinite(value)) {
          const abs = Math.abs(value);
          if (abs > maxAbsValue) maxAbsValue = abs;
        }
      }
    }
  }
  let currentValue = 0;
  if (activeSeriesTable && selectedKey && Array.isArray(activeSeriesTable[selectedKey])) {
    const series = activeSeriesTable[selectedKey];
    const clamped = clampTimeIndex(currentTimeIndex, sampleCount);
    const value = series[clamped];
    if (typeof value === "number" && Number.isFinite(value)) currentValue = value;
  }
  const largeScaleWarning = displacementScale > 5000;

  return {
    state: { currentTimeIndex, isPlaying, playbackSpeed, displacementScale, displacementMode, loop },
    setters: { setCurrentTimeIndex, setIsPlaying, setPlaybackSpeed, setDisplacementScale, setDisplacementMode },
    override,
    sampleCount,
    enabled,
    reset,
    jumpToMax,
    currentTimeSeconds,
    currentValue,
    maxAbsValue,
    maxAbsTimeSeconds,
    largeScaleWarning,
  };
}
