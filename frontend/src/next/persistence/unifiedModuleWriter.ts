/**
 * F-2: Unified PDC module writing for complete projects.
 *
 * Writes a lane-owned document into the PDC module slot following the
 * canonical module-record shape ({ state, data, validation }). The document
 * is serialized for persistence (transient derived arrays stripped) and the
 * resulting module data is validated fail-closed before being stored.
 *
 * This is the production-consistent way to populate a Project before
 * Save/Close/Reopen; it mirrors writeSuperstructureDocument /
 * writeSubstructureDocument (module adapters) but operates directly on a
 * Project object (no ProjectManager required).
 */

import type { Project, ProjectModule } from "../project/schema";
import type { ModuleDataRecord } from "../modules/contract";
import { createInitialModuleData } from "../modules/contract";
import { serializeSuperstructureDocumentForPersistence } from "../modules/superstructure/superstructurePersistence";
import type { SuperstructureDocument } from "../modules/superstructure/superstructureTypes";
import { validateSuperstructureData } from "../modules/superstructure/superstructureValidation";
import { serializeSubstructureDocumentForPersistence } from "../modules/substructure/substructurePersistence";
import type { SubstructureDocument } from "../modules/substructure/substructureTypes";
import { validateSubstructureData } from "../modules/substructure/substructureValidation";
import { serializeAnalysisDocumentForPersistence } from "../modules/analysis/analysisPersistence";
import type { AnalysisDocument } from "../modules/analysis/analysisDocumentTypes";
import type { BridgeLayoutDocument } from "../modules/bridgeLayout/bridgeLayoutTypes";
import { validateBridgeLayoutData } from "../modules/bridgeLayout/bridgeLayoutValidation";

export type WriteModuleDocumentResult =
  | { ok: true; project: Project }
  | { ok: false; issues: readonly { path: string; message: string }[] };

function writeModuleRecord(
  project: Project,
  moduleId: keyof Project["modules"],
  record: ModuleDataRecord,
): Project {
  return {
    ...project,
    updatedAt: new Date().toISOString(),
    modules: {
      ...project.modules,
      [moduleId]: record as unknown as ProjectModule,
    },
  };
}

/**
 * Write the superstructure document into the project module slot (fail-closed).
 * The derived handoff arrays are serialized as null (regenerated on restore).
 */
export function writeSuperstructureModuleToProject(
  project: Project,
  document: SuperstructureDocument,
): WriteModuleDocumentResult {
  const persisted = serializeSuperstructureDocumentForPersistence(document);
  const data: Record<string, unknown> = {
    ...createInitialModuleData().data,
    superstructureDocument: persisted,
  };
  const issues = validateSuperstructureData(data);
  if (issues.length > 0) {
    return { ok: false, issues };
  }
  const record: ModuleDataRecord = {
    ...createInitialModuleData(),
    data,
  };
  return { ok: true, project: writeModuleRecord(project, "superstructure", record) };
}

/**
 * Write the substructure document into the project module slot (fail-closed).
 */
export function writeSubstructureModuleToProject(
  project: Project,
  document: SubstructureDocument,
): WriteModuleDocumentResult {
  const persisted = serializeSubstructureDocumentForPersistence(document);
  const data: Record<string, unknown> = {
    ...createInitialModuleData().data,
    substructureDocument: persisted,
  };
  const issues = validateSubstructureData(data);
  if (issues.length > 0) {
    return { ok: false, issues };
  }
  const record: ModuleDataRecord = {
    ...createInitialModuleData(),
    data,
  };
  return { ok: true, project: writeModuleRecord(project, "substructure", record) };
}

/**
 * Write the analysis document into the project module slot.
 *
 * The AnalysisDocument is persisted as-is (serialized DTO). Its own
 * validation state (validation.ok / issues) and analysisStatus (e.g. NOT_RUN)
 * are part of the document, so a NOT_RUN / fail-closed document round-trips
 * without being dropped. Runtime consumers (readAnalysisDocument / CIM) keep
 * their fail-closed behaviour: an invalid document is never used as if it
 * were an authoritative result.
 */
export function writeAnalysisModuleToProject(
  project: Project,
  document: AnalysisDocument,
): WriteModuleDocumentResult {
  const persisted = serializeAnalysisDocumentForPersistence(document);
  const data: Record<string, unknown> = {
    ...createInitialModuleData().data,
    analysisDocument: persisted,
  };
  const record: ModuleDataRecord = {
    ...createInitialModuleData(),
    data,
  };
  return { ok: true, project: writeModuleRecord(project, "analysis", record) };
}

/**
 * Write the bridge layout document into the project module slot (fail-closed).
 * BridgeLayoutDocument is plain persisted DTO (no transient derived arrays).
 */
export function writeBridgeLayoutModuleToProject(
  project: Project,
  document: BridgeLayoutDocument,
): WriteModuleDocumentResult {
  const data: Record<string, unknown> = {
    ...createInitialModuleData().data,
    bridgeLayoutDocument: document,
  };
  const issues = validateBridgeLayoutData(data);
  if (issues.length > 0) {
    return { ok: false, issues };
  }
  const record: ModuleDataRecord = {
    ...createInitialModuleData(),
    data,
  };
  return { ok: true, project: writeModuleRecord(project, "bridgeLayout", record) };
}