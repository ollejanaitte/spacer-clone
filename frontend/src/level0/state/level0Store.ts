export type Level0Step = "home" | "picker" | "running" | "animation" | "result" | "error";
export type EarthquakePresetId = "weak" | "medium" | "strong";

export interface Level0State {
  step: Level0Step;
  templateId: string | null;
  project: unknown | null;
  preset: EarthquakePresetId | null;
  timeHistoryResult: unknown | null;
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
  setProject: (project: unknown) => void;
  setPreset: (preset: EarthquakePresetId) => void;
  setResult: (
    timeHistoryResult: unknown,
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

  return {
    getState: () => state,
    goto,
    setProject: (project: unknown) => { state = { ...state, project }; },
    setPreset: (preset: EarthquakePresetId) => { state = { ...state, preset }; },
    setResult: (timeHistoryResult: unknown, maxDisplacement: { nodeId: string; valueCm: number; timeSec: number }, judgement: "small" | "medium" | "large") => {
      state = { ...state, timeHistoryResult, maxDisplacement, judgement };
    },
    setError: (errorCode: string) => { state = { ...state, errorCode }; },
    reset: () => { state = { ...INITIAL_STATE }; },
  };
}
