/**
 * Superstructure module adapter (Phase 5-02 WP-A).
 *
 * read/write/has for the SuperstructureDocument in the Project Data Core.
 * Write is fail-closed: invalid data is never persisted.
 */

import type { ProjectManager } from "../project/projectManager";
import { readModuleFromManager, writeModuleToManager } from "./adapter";
import type { ModuleDataRecord } from "./contract";
import { SUPERSTRUCTURE_MODULE_ID, createSuperstructureModuleRecord, validateSuperstructureData } from "./superstructureModule";
import type { SuperstructureDocument } from "./superstructure/superstructureTypes";
import { serializeSuperstructureDocumentForPersistence } from "./superstructure/superstructurePersistence";

export type SuperstructureModuleAdapterResult =
  | { ok: true; superstructureDocument: SuperstructureDocument | undefined }
  | { ok: false; reason: "project-not-found" | "invalid-superstructure-data" };

export function readSuperstructureDocument(
  manager: ProjectManager,
  projectId: string,
): SuperstructureDocument | undefined {
  const moduleData = readModuleFromManager(manager, projectId, SUPERSTRUCTURE_MODULE_ID);
  const doc = moduleData?.data?.superstructureDocument;
  return doc && typeof doc === "object" ? (doc as SuperstructureDocument) : undefined;
}

export function writeSuperstructureDocument(
  manager: ProjectManager,
  projectId: string,
  document: SuperstructureDocument | undefined,
): SuperstructureModuleAdapterResult {
  const existing = readModuleFromManager(manager, projectId, SUPERSTRUCTURE_MODULE_ID);
  if (!existing) {
    return { ok: false, reason: "project-not-found" };
  }
  const base: ModuleDataRecord = existing ?? createSuperstructureModuleRecord();
  // Persist the canonical form (derived arrays are transient, per E-01).
  const persisted = document !== undefined
    ? serializeSuperstructureDocumentForPersistence(document)
    : undefined;
  const nextData: Record<string, unknown> = {
    ...base.data,
    ...(persisted !== undefined ? { superstructureDocument: persisted } : {}),
  };
  const issues = validateSuperstructureData(nextData);
  if (issues.length > 0) {
    return { ok: false, reason: "invalid-superstructure-data" };
  }
  const nextRecord: ModuleDataRecord = {
    ...base,
    data: nextData,
  };
  const result = writeModuleToManager(manager, projectId, SUPERSTRUCTURE_MODULE_ID, nextRecord);
  if (!result.ok) {
    return {
      ok: false,
      reason: result.reason === "project-not-found" ? "project-not-found" : "invalid-superstructure-data",
    };
  }
  return { ok: true, superstructureDocument: document };
}

export function hasSuperstructureDocument(manager: ProjectManager, projectId: string): boolean {
  return readSuperstructureDocument(manager, projectId) !== undefined;
}
