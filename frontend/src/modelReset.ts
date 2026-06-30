import type { ProjectModel } from "./types";

export function resetProjectModelContents(project: ProjectModel): ProjectModel {
  return {
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
