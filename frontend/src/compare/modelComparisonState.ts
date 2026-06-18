import type { ProjectModel } from "../types";

export type ModelComparisonState = {
  modelA: ProjectModel;
  modelB: ProjectModel | null;
};

/** Deep-copy a project without sharing nested arrays or records. */
export function cloneComparisonModel(project: ProjectModel): ProjectModel {
  if (typeof structuredClone === "function") return structuredClone(project);
  return JSON.parse(JSON.stringify(project)) as ProjectModel;
}

/** Create the initial A/B namespace while keeping B empty until explicit copy. */
export function createModelComparisonState(modelA: ProjectModel): ModelComparisonState {
  return { modelA, modelB: null };
}

/** Replace B with a deep copy of the current A model. */
export function copyModelAToB(state: ModelComparisonState): ModelComparisonState {
  return { ...state, modelB: cloneComparisonModel(state.modelA) };
}
