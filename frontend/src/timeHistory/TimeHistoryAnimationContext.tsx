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
  clampTimeIndex,
  computeTimeHistoryNodeOverride,
  type TimeHistoryAnimationOverride,
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
};

export type TimeHistoryAnimationController = {
  setCurrentTimeIndex: (index: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setPlaybackSpeed: (speed: number) => void;
  setDisplacementScale: (scale: number) => void;
  reset: () => void;
};

export type TimeHistoryAnimationContextValue = TimeHistoryAnimationState & TimeHistoryAnimationController;

const noop = () => undefined;

const DISABLED_STATE: TimeHistoryAnimationState = {
  enabled: false,
  currentTimeIndex: 0,
  isPlaying: false,
  playbackSpeed: DEFAULT_TIME_HISTORY_ANIMATION_SPEED,
  displacementScale: DEFAULT_TIME_HISTORY_ANIMATION_SCALE,
  loop: true,
  sampleCount: 0,
  sampleMismatch: false,
  hasNonFiniteDisplacement: false,
  override: null,
};

export const TimeHistoryAnimationContext = createContext<TimeHistoryAnimationContextValue>({
  ...DISABLED_STATE,
  setCurrentTimeIndex: noop,
  setIsPlaying: noop,
  setPlaybackSpeed: noop,
  setDisplacementScale: noop,
  reset: noop,
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
    loop: boolean;
  };
  setters: {
    setCurrentTimeIndex: (index: number) => void;
    setIsPlaying: (playing: boolean) => void;
    setPlaybackSpeed: (speed: number) => void;
    setDisplacementScale: (scale: number) => void;
  };
  reset: () => void;
};

/**
 * Provider for the Time History animation context. The provider is
 * intentionally thin: it does not own state. The state lives in the
 * parent (typically the App component) and the provider merely
 * recomputes the derived values (enabled, sampleCount, override,
 * ...).
 */
export function TimeHistoryAnimationProvider(props: TimeHistoryAnimationProviderProps) {
  const { project, result, state, setters, reset } = props;
  const { currentTimeIndex, isPlaying, playbackSpeed, displacementScale, loop } = state;

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
      })
    : null;

  const value: TimeHistoryAnimationContextValue = {
    enabled,
    currentTimeIndex: clampedIndex,
    isPlaying,
    playbackSpeed,
    displacementScale,
    loop,
    sampleCount,
    sampleMismatch,
    hasNonFiniteDisplacement,
    override,
    setCurrentTimeIndex: setters.setCurrentTimeIndex,
    setIsPlaying: setters.setIsPlaying,
    setPlaybackSpeed: setters.setPlaybackSpeed,
    setDisplacementScale: setters.setDisplacementScale,
    reset,
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
