// Shared state for the Time History deformation animation.
//
// The animation is driven by a small piece of UI state (the active
// time index, the play/pause flag, the playback speed, and the
// displacement scale) that needs to be shared between the controls
// (which sit in the Time History Result Viewer) and the 3D viewer
// (which renders the deformed geometry).
//
// We expose a React context so the controls and the viewer can stay
// decoupled. The context value is always defined: the default
// implementation returns `enabled === false` and a no-op setter.

import { createContext, useContext, type ReactNode } from "react";
import type { ProjectModel, TimeHistoryResult } from "../types";
import {
  DEFAULT_TIME_HISTORY_ANIMATION_SCALE,
  DEFAULT_TIME_HISTORY_ANIMATION_SPEED,
  DEFAULT_TIME_HISTORY_DISPLACEMENT_MODE,
  clampTimeIndex,
  computeTimeHistoryNodeOverride,
  type TimeHistoryAnimationOverride,
  type TimeHistoryDisplacementMode,
} from "./timeHistoryAnimation";

export type TimeHistoryAnimationState = {
  /** True when the controls should be interactive. */
  enabled: boolean;
  /** Current sample index in [0, sampleCount - 1]. */
  currentTimeIndex: number;
  /** True when playback is running. */
  isPlaying: boolean;
  /** Multiplier on the real-time playback rate. */
  playbackSpeed: number;
  /** Display multiplier applied to the displacement vector. */
  displacementScale: number;
  /** Active displacement mode (x / y / z / xyz). */
  displacementMode: TimeHistoryDisplacementMode;
  /** True when playback loops from the last sample back to zero. */
  loop: boolean;
  /** Sample count derived from the active result, or 0. */
  sampleCount: number;
  /** True when the active time axis disagrees with `sampleCount`. */
  sampleMismatch: boolean;
  /** True when at least one displacement value was non-finite. */
  hasNonFiniteDisplacement: boolean;
  /** Per-node override map consumed by the 3D viewer. */
  override: TimeHistoryAnimationOverride | null;
  /** Current time in seconds, derived from the index and dt. */
  currentTimeSeconds: number;
  /** Current value of the active selected key at the active time. */
  currentValue: number;
  /** Max absolute value of the active selected key (or all). */
  maxAbsValue: number;
  /** Time in seconds of the max abs value. */
  maxAbsTimeSeconds: number;
  /** True when the displacement scale is unusually large. */
  largeScaleWarning: boolean;
};

export type TimeHistoryAnimationController = {
  setCurrentTimeIndex: (index: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setPlaybackSpeed: (speed: number) => void;
  setDisplacementScale: (scale: number) => void;
  setDisplacementMode: (mode: TimeHistoryDisplacementMode) => void;
  reset: () => void;
  jumpToMax: (selectedKey: string | null, seriesKind: "displacement" | "velocity" | "acceleration") => void;
};

export type TimeHistoryAnimationContextValue = TimeHistoryAnimationState & TimeHistoryAnimationController;

const noop = () => undefined;

const DISABLED_STATE: TimeHistoryAnimationState = {
  enabled: false,
  currentTimeIndex: 0,
  isPlaying: false,
  playbackSpeed: DEFAULT_TIME_HISTORY_ANIMATION_SPEED,
  displacementScale: DEFAULT_TIME_HISTORY_ANIMATION_SCALE,
  displacementMode: DEFAULT_TIME_HISTORY_DISPLACEMENT_MODE,
  loop: true,
  sampleCount: 0,
  sampleMismatch: false,
  hasNonFiniteDisplacement: false,
  override: null,
  currentTimeSeconds: 0,
  currentValue: 0,
  maxAbsValue: 0,
  maxAbsTimeSeconds: 0,
  largeScaleWarning: false,
};

export const TimeHistoryAnimationContext = createContext<TimeHistoryAnimationContextValue>({
  ...DISABLED_STATE,
  setCurrentTimeIndex: noop,
  setIsPlaying: noop,
  setPlaybackSpeed: noop,
  setDisplacementScale: noop,
  setDisplacementMode: noop,
  reset: noop,
  jumpToMax: noop,
});

export function useTimeHistoryAnimation(): TimeHistoryAnimationContextValue {
  return useContext(TimeHistoryAnimationContext);
}

export type TimeHistoryAnimationProviderProps = {
  project: ProjectModel | null;
  result: TimeHistoryResult | null | undefined;
  children: ReactNode;
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
  reset: () => void;
  jumpToMax: (selectedKey: string | null, seriesKind: "displacement" | "velocity" | "acceleration") => void;
  currentTimeSeconds: number;
  currentValue: number;
  maxAbsValue: number;
  maxAbsTimeSeconds: number;
  largeScaleWarning: boolean;
};

/**
 * Provider for the Time History animation context. The provider is
 * intentionally thin: it does not own state. The state lives in the
 * parent (typically the App component) and the provider merely
 * recomputes the derived values (enabled, sampleCount, override,
 * ...).
 */
export function TimeHistoryAnimationProvider(props: TimeHistoryAnimationProviderProps) {
  const { project, result, state, setters, reset, jumpToMax, currentTimeSeconds, currentValue, maxAbsValue, maxAbsTimeSeconds, largeScaleWarning } = props;
  const { currentTimeIndex, isPlaying, playbackSpeed, displacementScale, displacementMode, loop } = state;

  const sampleCount = typeof result?.meta?.sampleCount === "number" && Number.isFinite(result.meta.sampleCount)
    ? result.meta.sampleCount
    : 0;
  const time = result?.time;
  const sampleMismatch = Array.isArray(time) && time.length !== sampleCount;
  const hasNonFiniteDisplacement = containsNonFiniteDisplacement(result);
  const clampedIndex = clampTimeIndex(currentTimeIndex, sampleCount);
  const hasDisplacementData = Boolean(
    result && result.displacements && Object.keys(result.displacements).length > 0,
  );
  const enabled = Boolean(result && hasDisplacementData && sampleCount > 0);
  const override = enabled && project
    ? computeTimeHistoryNodeOverride({
        project,
        result,
        timeIndex: clampedIndex,
        displacementScale,
        displacementMode,
      })
    : null;

  const value: TimeHistoryAnimationContextValue = {
    enabled,
    currentTimeIndex: clampedIndex,
    isPlaying,
    playbackSpeed,
    displacementScale,
    displacementMode,
    loop,
    sampleCount,
    sampleMismatch,
    hasNonFiniteDisplacement,
    override,
    currentTimeSeconds,
    currentValue,
    maxAbsValue,
    maxAbsTimeSeconds,
    largeScaleWarning,
    setCurrentTimeIndex: setters.setCurrentTimeIndex,
    setIsPlaying: setters.setIsPlaying,
    setPlaybackSpeed: setters.setPlaybackSpeed,
    setDisplacementScale: setters.setDisplacementScale,
    setDisplacementMode: setters.setDisplacementMode,
    reset,
    jumpToMax,
  };

  return (
    <TimeHistoryAnimationContext.Provider value={value}>
      {props.children}
    </TimeHistoryAnimationContext.Provider>
  );
}

function containsNonFiniteDisplacement(result: TimeHistoryResult | null | undefined): boolean {
  if (!result) return false;
  const displacements = result.displacements;
  if (!displacements) return false;
  for (const key of Object.keys(displacements)) {
    const series = displacements[key];
    if (!Array.isArray(series)) continue;
    for (const value of series) {
      if (typeof value === "number" && !Number.isFinite(value)) return true;
    }
  }
  return false;
}
