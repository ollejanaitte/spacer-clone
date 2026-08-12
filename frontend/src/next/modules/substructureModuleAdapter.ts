/**
 * Substructure module adapter (Phase 6-02 WP-A).
 *
 * read/write/has for the SubstructureDocument in the Project Data Core.
 * Write persists the canonical form (derived arrays are transient per FROZEN E).
 */

import type { ProjectManager } from "../project/projectManager";
import { readModuleFromManager, writeModuleToManager } from "./adapter";
import type { ModuleDataRecord } from "./contract";
import { SUBSTRUCTURE_MODULE_ID, createSubstructureModuleRecord, validateSubstructureData } from "./substructureModule";
import type { SubstructureDocument } from "./substructure/substructureTypes";
import { serializeSubstructureDocumentForPersistence } from "./substructure/substructurePersistence";

export type SubstructureModuleAdapterResult =
  | { ok: true; substructureDocument: SubstructureDocument | undefined }
  | { ok: false; reason: "project-not-found" | "invalid-substructure-data" };

export function readSubstructureDocument(
  manager: ProjectManager,
  projectId: string,
): SubstructureDocument | undefined {
  const moduleData = readModuleFromManager(manager, projectId, SUBSTRUCTURE_MODULE_ID);
  const doc = moduleData?.data?.substructureDocument;
  return doc && typeof doc === "object" ? (doc as SubstructureDocument) : undefined;
}

export function writeSubstructureDocument(
  manager: ProjectManager,
  projectId: string,
  document: SubstructureDocument | undefined,
): SubstructureModuleAdapterResult {
  const existing = readModuleFromManager(manager, projectId, SUBSTRUCTURE_MODULE_ID);
  if (!existing) {
    return { ok: false, reason: "project-not-found" };
  }
  const base: ModuleDataRecord = existing ?? createSubstructureModuleRecord();
  const persisted = document !== undefined
    ? serializeSubstructureDocumentForPersistence(document)
    : undefined;
  const nextData: Record<string, unknown> = {
    ...base.data,
    ...(persisted !== undefined ? { substructureDocument: persisted } : {}),
  };
  const issues = validateSubstructureData(nextData);
  if (issues.length > 0) {
    return { ok: false, reason: "invalid-substructure-data" };
  }
  const nextRecord: ModuleDataRecord = {
    ...base,
    data: nextData,
  };
  const result = writeModuleToManager(manager, projectId, SUBSTRUCTURE_MODULE_ID, nextRecord);
  if (!result.ok) {
    return {
      ok: false,
      reason: result.reason === "project-not-found" ? "project-not-found" : "invalid-substructure-data",
    };
  }
  return { ok: true, substructureDocument: document };
}

export function hasSubstructureDocument(manager: ProjectManager, projectId: string): boolean {
  return readSubstructureDocument(manager, projectId) !== undefined;
}
