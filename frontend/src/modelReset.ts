import type { ProjectModel } from "./types";

export function resetProjectModelContents(project: ProjectModel): ProjectModel {
  const {
    analysisResults: _analysisResults,
    liner: _liner,
    ...projectWithoutOptionalResults
  } = project;
  const {
    eigen: _eigen,
    responseSpectrum: _responseSpectrum,
    influence: _influence,
    timeHistory: _timeHistory,
    ...analysisSettings
  } = project.analysisSettings;

  return {
    ...projectWithoutOptionalResults,
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
    analysisSettings,
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
