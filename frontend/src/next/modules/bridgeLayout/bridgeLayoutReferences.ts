import type { ProjectManager } from "../../project/projectManager";
import type { BridgeLayoutDocument, BridgeLayoutIssue } from "./bridgeLayoutTypes";
import { readRoadInputs } from "../roadModuleAdapter";
import { readTerrainDocument } from "../terrainModuleAdapter";
import { readExistingConditions } from "../existingConditionsAdapter";

export interface BridgeLayoutReferenceResolution {
  readonly ok: boolean;
  readonly issues: readonly BridgeLayoutIssue[];
  readonly resolved: {
    readonly roadAlignmentResolved: boolean;
    readonly terrainResolved: boolean;
    readonly existingResolved: boolean;
  };
}

/**
 * Reference boundary resolution (Phase 4-01).
 *
 * Bridge Layout never duplicates Road / Terrain / Existing source of truth;
 * it references them by ID. This resolver verifies those references actually
 * resolve against the current project (broken/dangling reference detection).
 *
 * Responsibilities:
 *   - roadReference.alignmentId must match an existing Road alignment id
 *   - terrainReference must match an existing Terrain surface reference
 *   - existingConditionsReference must match the existing conditions document
 */
export function resolveBridgeLayoutReferences(
  manager: ProjectManager,
  projectId: string,
  document: BridgeLayoutDocument,
): BridgeLayoutReferenceResolution {
  const issues: BridgeLayoutIssue[] = [];
  const resolved = {
    roadAlignmentResolved: false,
    terrainResolved: false,
    existingResolved: false,
  };

  const roadInputs = readRoadInputs(manager, projectId);
  const horizontal = roadInputs?.horizontal as { readonly id?: string } | undefined;
  const roadAlignmentId = horizontal?.id ?? null;
  if (document.roadReference.alignmentId === null) {
    issues.push({ path: "bridgeLayoutDocument.roadReference.alignmentId", message: "road reference is empty" });
  } else if (roadAlignmentId === null) {
    issues.push({ path: "bridgeLayoutDocument.roadReference.alignmentId", message: `road module has no alignment; reference ${document.roadReference.alignmentId} is dangling` });
  } else if (roadAlignmentId !== document.roadReference.alignmentId) {
    issues.push({ path: "bridgeLayoutDocument.roadReference.alignmentId", message: `road alignment mismatch: reference ${document.roadReference.alignmentId} but road module has ${roadAlignmentId}` });
  } else {
    resolved.roadAlignmentResolved = true;
  }

  const terrainDoc = readTerrainDocument(manager, projectId);
  if (!terrainDoc) {
    issues.push({ path: "bridgeLayoutDocument.terrainReference", message: "terrain module has no document; terrain reference is dangling" });
  } else if (document.terrainReference.surfaceReference !== null
    && document.terrainReference.surfaceReference !== terrainDoc.surfaceReference
    && terrainDoc.surfaceReference !== null) {
    issues.push({ path: "bridgeLayoutDocument.terrainReference.surfaceReference", message: "terrain surface reference mismatch" });
  } else {
    resolved.terrainResolved = true;
  }

  const existingDoc = readExistingConditions(manager, projectId);
  if (!existingDoc) {
    issues.push({ path: "bridgeLayoutDocument.existingConditionsReference", message: "existing conditions document is missing; reference is dangling" });
  } else if (document.existingConditionsReference.documentReferenceId !== null
    && document.existingConditionsReference.documentReferenceId !== existingDoc.schemaVersion
    && existingDoc.schemaVersion !== null) {
    issues.push({ path: "bridgeLayoutDocument.existingConditionsReference.documentReferenceId", message: "existing conditions reference mismatch" });
  } else {
    resolved.existingResolved = true;
  }

  return { ok: issues.length === 0, issues, resolved };
}
