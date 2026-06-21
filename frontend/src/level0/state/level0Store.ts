import type { ProjectModel } from "../../types";
import type { TimeHistoryResult } from "../../types";

export type Level0Step = "home" | "picker" | "running" | "animation" | "result" | "error";

export type EarthquakePresetId = "weak" | "medium" | "strong";

export interface Level0State {
  step: Level0Step;
  templateId: string | null;
  project: ProjectModel | null;
  preset: EarthquakePresetId | null;
  timeHistoryResult: TimeHistoryResult | null;
  maxDisplacement: { nodeId: string; valueCm: number; timeSec: number } | null;
  judgement: "small" | "medium" | "large" | null;
  errorCode: string | null;
  autosaveAt: number | null;
}

export const ALLOWED_TRANSITIONS: Record<Level0Step, Level0Step[]> = {
  home: ["picker"],
  picker: ["running", "home"],
  running: ["animation", "error"],
  animation: ["result", "picker"],
  result: ["picker", "home"],
  error: ["home", "picker"],
};

export type Level0Store = {
  getState: () => Level0State;
  goto: (step: Level0Step) => void;
  setProject: (project: ProjectModel) => void;
  setPreset: (preset: EarthquakePresetId) => void;
  setResult: (
    timeHistoryResult: TimeHistoryResult,
    maxDisplacement: { nodeId: string; valueCm: number; timeSec: number },
    judgement: "small" | "medium" | "large",
  ) => void;
  setError: (errorCode: string) => void;
  reset: () => void;
};

const INITIAL_STATE: Level0State = {
  step: "home",
  templateId: null,
  project: null,
  preset: null,
  timeHistoryResult: null,
  maxDisplacement: null,
  judgement: null,
  errorCode: null,
  autosaveAt: null,
};

export function createLevel0Store(): Level0Store {
  let state: Level0State = { ...INITIAL_STATE };

  const goto = (step: Level0Step) => {
    const allowed = ALLOWED_TRANSITIONS[state.step];
    if (!allowed.includes(step)) {
      throw new Error(`Invalid transition: ${state.step} -> ${step}`);
    }
    state = { ...state, step };
  };

  const setProject = (project: ProjectModel) => {
    state = { ...state, project };
  };

  const setPreset = (preset: EarthquakePresetId) => {
    state = { ...state, preset };
  };

  const setResult = (
    timeHistoryResult: TimeHistoryResult,
    maxDisplacement: { nodeId: string; valueCm: number; timeSec: number },
    judgement: "small" | "medium" | "large",
  ) => {
    state = { ...state, timeHistoryResult, maxDisplacement, judgement };
  };

  const setError = (errorCode: string) => {
    state = { ...state, errorCode };
  };

  const reset = () => {
    state = { ...INITIAL_STATE };
  };

  return {
    getState: () => state,
    goto,
    setProject,
    setPreset,
    setResult,
    setError,
    reset,
  };
}
