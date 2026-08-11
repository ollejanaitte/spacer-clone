import type { ProjectManager } from "../project/projectManager";
import type { Project } from "../project/schema";
import { validateExistingConditionsData } from "./existingConditions";
import type { ExistingConditionsDocument } from "./existingConditions";

export const EXISTING_CONDITIONS_METADATA_KEY = "existingConditions" as const;

export type ExistingConditionsAdapterResult =
  | { ok: true; document: ExistingConditionsDocument | undefined }
  | { ok: false; reason: "project-not-found" | "invalid-existing-data" };

function readFromProject(project: Project): ExistingConditionsDocument | undefined {
  const raw = project.metadata?.[EXISTING_CONDITIONS_METADATA_KEY];
  return raw && typeof raw === "object" ? (raw as ExistingConditionsDocument) : undefined;
}

export function readExistingConditions(
  manager: ProjectManager,
  projectId: string,
): ExistingConditionsDocument | undefined {
  const project = manager.getProject(projectId);
  if (!project) return undefined;
  return readFromProject(project);
}

export function writeExistingConditions(
  manager: ProjectManager,
  projectId: string,
  document: ExistingConditionsDocument | undefined,
): ExistingConditionsAdapterResult {
  const project = manager.getProject(projectId);
  if (!project) {
    return { ok: false, reason: "project-not-found" };
  }
  const nextData: Record<string, unknown> = {
    ...(document !== undefined ? { existingConditionsDocument: document } : {}),
  };
  const issues = validateExistingConditionsData(nextData);
  if (issues.length > 0) {
    return { ok: false, reason: "invalid-existing-data" };
  }
  const merged: Record<string, unknown> = {
    ...(document !== undefined
      ? { [EXISTING_CONDITIONS_METADATA_KEY]: document }
      : {}),
  };
  const result = manager.updateProjectMetadata(projectId, merged);
  if (!result.ok) {
    return { ok: false, reason: result.reason === "not-found" ? "project-not-found" : "invalid-existing-data" };
  }
  return { ok: true, document };
}

export function hasExistingConditions(manager: ProjectManager, projectId: string): boolean {
  return readExistingConditions(manager, projectId) !== undefined;
}
