import type { ProjectLinerExtension } from "./types";

type ProjectLike = Record<string, unknown> & Partial<ProjectLinerExtension>;

/**
 * Applies backward-compatible normalization for persisted liner fields.
 * Projects without liner metadata are returned unchanged.
 */
export function migrateProjectLinerExtension<T extends ProjectLike>(project: T): T {
  if (project.liner === undefined && project.linerTrace === undefined) {
    return project;
  }

  if (project.linerTrace === undefined) {
    return project;
  }

  if (!Array.isArray(project.linerTrace)) {
    return project;
  }

  return {
    ...project,
    linerTrace: [...project.linerTrace],
  };
}

/**
 * Ensures linerTrace exists as an empty array when liner metadata is present.
 * Old projects without either field remain unchanged.
 */
export function ensureProjectLinerTraceArray<T extends ProjectLike>(project: T): T {
  if (project.liner === undefined) {
    return project;
  }
  if (project.linerTrace !== undefined) {
    return project;
  }
  return {
    ...project,
    linerTrace: [],
  };
}
