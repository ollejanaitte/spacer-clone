import type { ProjectModel } from "../types";

/**
 * Strip frontend-only analysis settings before sending ProjectModel to the backend.
 */
export function buildBackendProject(project: ProjectModel): ProjectModel {
  const { responseSpectrum: _responseSpectrum, ...analysisSettings } =
    project.analysisSettings;
  return {
    ...project,
    analysisSettings,
  };
}
