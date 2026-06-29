import type { ProjectModel } from "./types";
import { createDefaultLinerDraft } from "./liner/adapters/linerUiAdapter";
import { withProjectLinerDraft } from "./liner/adapters/linerProjectDraft";

export function resetProjectModelContents(project: ProjectModel): ProjectModel {
  const resetProject: ProjectModel = {
    ...project,
    nodes: [],
    materials: [],
    sections: [],
    members: [],
    supports: [],
    loadCases: [],
    nodalLoads: [],
    memberLoads: [],
    massCases: [],
    groundMotions: [],
    analysisSettings: {
      ...project.analysisSettings,
      eigen: undefined,
      responseSpectrum: undefined,
      influence: undefined,
      timeHistory: undefined,
    },
    analysisResults: undefined,
    liner: undefined,
    linerTrace: [],
  };

  return withProjectLinerDraft(resetProject, createDefaultLinerDraft());
}

export function resetProjectModelContentsIfConfirmed(
  project: ProjectModel,
  confirmReset: () => boolean,
): ProjectModel {
  if (!confirmReset()) {
    return project;
  }

  return resetProjectModelContents(project);
}
