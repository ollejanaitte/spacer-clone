import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ProjectModel, TimeHistoryResult } from "../types";
import {
  ALLOWED_TIME_HISTORY_ANIMATION_SPEEDS,
  DEFAULT_TIME_HISTORY_ANIMATION_SCALE,
  DEFAULT_TIME_HISTORY_ANIMATION_SPEED,
  clampTimeIndex,
  computeTimeHistoryNodeOverride,
  type TimeHistoryAnimationOverride,
} from "./timeHistoryAnimation";

export type TimeHistoryAnimationStateBundle = {
  state: {
    currentTimeIndex: number;
    isPlaying: boolean;
    playbackSpeed: number;
    displacementScale: number;
    loop: boolean;
  };
  setters: {
    setCurrentTimeIndex: (index: number) => void;
    setIsPlaying: (playing: boolean) => void;
    setPlaybackSpeed: (speed: number) => void;
    setDisplacementScale: (scale: number) => void;
  };
  override: TimeHistoryAnimationOverride | null;
  sampleCount: number;
  enabled: boolean;
  reset: () => void;
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
  }, []);

  const reset = useCallback(() => {
    setCurrentTimeIndexRaw(0);
    setIsPlaying(false);
    setPlaybackSpeedRaw(DEFAULT_TIME_HISTORY_ANIMATION_SPEED);
    setDisplacementScaleRaw(DEFAULT_TIME_HISTORY_ANIMATION_SCALE);
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
          })
        : null,
    [project, result, currentTimeIndex, displacementScale, sampleCount],
  );

  const hasDisplacementData = Boolean(
    result && result.displacements && Object.keys(result.displacements).length > 0,
  );
  const enabled = Boolean(result && hasDisplacementData && sampleCount > 0);

  return {
    state: { currentTimeIndex, isPlaying, playbackSpeed, displacementScale, loop },
    setters: { setCurrentTimeIndex, setIsPlaying, setPlaybackSpeed, setDisplacementScale },
    override,
    sampleCount,
    enabled,
    reset,
  };
}
