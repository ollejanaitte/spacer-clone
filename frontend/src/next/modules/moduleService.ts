import type { ProjectManager } from "../project/projectManager";
import type { ModuleDataRecord } from "./contract";
import { readModuleFromManager, writeModuleToManager } from "./adapter";
import { validateModuleData } from "./validation";
import { markModuleDirty } from "./state";
import type { ProjectModuleKey } from "../project/schema";

export type ModuleUpdateResult =
  | { ok: true; moduleData: ModuleDataRecord }
  | { ok: false; reason: "project-not-found" | "invalid-module" | "validation-failed" };

export interface UpdateModuleDataInput {
  readonly projectId: string;
  readonly moduleId: ProjectModuleKey;
  readonly patch: Record<string, unknown>;
  readonly validator?: (data: Record<string, unknown>) => readonly { path: string; message: string }[];
  readonly keepDirty?: boolean;
}

/**
 * Module change -> mark dirty -> validate -> Project Data Core update (via
 * manager which triggers R1-04 auto-save). The module never mutates the
 * Project JSON directly.
 */
export function updateModuleData(manager: ProjectManager, input: UpdateModuleDataInput): ModuleUpdateResult {
  const existing = readModuleFromManager(manager, input.projectId, input.moduleId);
  if (!existing) {
    return { ok: false, reason: "project-not-found" };
  }
  const dirtyRecord: ModuleDataRecord = {
    ...existing,
    data: {
      ...existing.data,
      ...input.patch,
    },
  };
  const dirty = markModuleDirty(dirtyRecord);
  const validated = validateModuleData(input.moduleId, dirty, input.validator);
  if (!validated.ok && input.keepDirty !== true) {
    // validation failed: do not write a broken module into the source of truth
    return { ok: false, reason: "validation-failed" };
  }
  const writeResult = writeModuleToManager(manager, input.projectId, input.moduleId, validated.moduleData);
  if (!writeResult.ok) {
    return { ok: false, reason: writeResult.reason === "invalid-module" ? "invalid-module" : "project-not-found" };
  }
  return { ok: true, moduleData: writeResult.moduleData };
}

export function getModuleData(manager: ProjectManager, projectId: string, moduleId: ProjectModuleKey): ModuleDataRecord | undefined {
  return readModuleFromManager(manager, projectId, moduleId);
}
