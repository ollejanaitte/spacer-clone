import type { Project } from "../project/schema";
import type { ProjectModuleKey } from "../project/schema";
import type { ProjectManager } from "../project/projectManager";
import type { ModuleDataRecord } from "./contract";
import { createInitialModuleData, isValidModuleKey } from "./contract";
import type { ModuleValidationIssue } from "./contract";

export type ModuleAdapterResult =
  | { ok: true; moduleData: ModuleDataRecord }
  | { ok: false; reason: "project-not-found" | "invalid-module" | "invalid-data" };

function isModuleDataRecord(value: unknown): value is ModuleDataRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.state === "object" &&
    record.state !== null &&
    typeof record.data === "object" &&
    record.data !== null
  );
}

export function readModuleFromProject(project: Project, moduleId: ProjectModuleKey): ModuleDataRecord {
  const raw = project.modules?.[moduleId];
  if (isModuleDataRecord(raw)) {
    return raw;
  }
  return createInitialModuleData();
}

export function readModuleFromManager(
  manager: ProjectManager,
  projectId: string,
  moduleId: ProjectModuleKey,
): ModuleDataRecord | undefined {
  const project = manager.getProject(projectId);
  if (!project) return undefined;
  return readModuleFromProject(project, moduleId);
}

export function writeModuleToProject(
  project: Project,
  moduleId: ProjectModuleKey,
  moduleData: ModuleDataRecord,
): Project | undefined {
  if (!isValidModuleKey(moduleId)) return undefined;
  return {
    ...project,
    modules: {
      ...project.modules,
      [moduleId]: moduleData,
    },
  };
}

export function writeModuleToManager(
  manager: ProjectManager,
  projectId: string,
  moduleId: ProjectModuleKey,
  moduleData: ModuleDataRecord,
): ModuleAdapterResult {
  if (!isValidModuleKey(moduleId)) {
    return { ok: false, reason: "invalid-module" };
  }
  const result = manager.updateProjectModule(projectId, moduleId, moduleData as unknown as Record<string, unknown>);
  if (!result.ok) {
    return { ok: false, reason: result.reason === "not-found" ? "project-not-found" : "invalid-data" };
  }
  const readBack = readModuleFromProject(result.project, moduleId);
  return { ok: true, moduleData: readBack };
}

export type { ModuleValidationIssue };
