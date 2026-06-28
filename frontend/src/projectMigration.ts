import type { ProjectModel } from "./types";

export const CURRENT_PROJECT_SCHEMA_VERSION = 1;

export type LegacyProjectModel = Omit<ProjectModel, "schemaVersion"> & {
  schemaVersion?: number;
};

export function migrateProject(rawProject: unknown): ProjectModel {
  const project = rawProject as LegacyProjectModel;

  return {
    ...project,
    schemaVersion: project.schemaVersion ?? CURRENT_PROJECT_SCHEMA_VERSION,
  };
}
