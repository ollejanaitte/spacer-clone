/**
 * Substructure Completion Gate (Phase 6-01 E FROZEN / Phase 6-02 WP-K).
 *
 * Runs the Phase 6 completion integrity checks over the SubstructureDocument:
 *  - document valid (DRAFT-level) + shape valid (Gate-level)
 *  - Phase 4 Support Handoff derived present
 *  - Phase 5 Bearing/Reaction Handoff derived present
 *  - supports / bearing seats / quantity / design status / authorization
 */

import type { ProjectManager } from "../../project/projectManager";
import type { SubstructureDocument } from "./substructureTypes";
import { validateSubstructureDocument } from "./substructureValidation";
import { validateSubstructureShapes } from "./substructureGeometry";
import { regenerateSubstructureDerived } from "./substructurePersistence";
import { readBridgeLayoutDocument } from "../bridgeLayoutModuleAdapter";

export interface SubstructureIntegrityResult {
  readonly ok: boolean;
  readonly issues: readonly { path: string; message: string }[];
  readonly checks: {
    readonly documentValid: boolean;
    readonly shapesValid: boolean;
    readonly bridgeLayoutPresent: boolean;
    readonly phase4HandoffPresent: boolean;
    readonly phase5HandoffPresent: boolean;
    readonly supportsPresent: boolean;
    readonly bearingSeatsPresent: boolean;
    readonly quantityDerived: boolean;
    readonly authorizationPreserved: boolean;
  };
  /** Phase 6 completion readiness. */
  readonly phase6Ready: boolean;
}

/**
 * Run the Phase 6 completion gate. Fail-closed: any failed check -> ok=false.
 */
export function runSubstructureIntegrityGate(
  manager: ProjectManager,
  projectId: string,
  document: SubstructureDocument,
): SubstructureIntegrityResult {
  const issues: { path: string; message: string }[] = [];

  const documentValid = validateSubstructureDocument(document).length === 0;
  if (!documentValid) {
    issues.push(...validateSubstructureDocument(document));
  }
  const shapesValid = validateSubstructureShapes(document).length === 0;
  if (!shapesValid) {
    issues.push(...validateSubstructureShapes(document));
  }
  const bridgeLayoutPresent = readBridgeLayoutDocument(manager, projectId) !== undefined;
  if (!bridgeLayoutPresent) {
    issues.push({ path: "bridgeLayout", message: "Bridge Layout document is required" });
  }
  const phase4HandoffPresent = document.supportReferences !== null;
  if (!phase4HandoffPresent) {
    issues.push({ path: "supportReferences", message: "Phase 4 Support Handoff derived is required" });
  }
  const phase5HandoffPresent = document.bearingReactionReferences !== null;
  if (!phase5HandoffPresent) {
    issues.push({ path: "bearingReactionReferences", message: "Phase 5 Bearing/Reaction Handoff derived is required" });
  }
  const supportsPresent = document.supports.length >= 1;
  if (!supportsPresent) {
    issues.push({ path: "supports", message: "at least one support is required" });
  }
  const bearingSeatsPresent = document.bearingSeatReferences.length >= 1;
  if (!bearingSeatsPresent) {
    issues.push({ path: "bearingSeatReferences", message: "bearing seats are required" });
  }
  const quantityDerived = document.quantityResults.quantityStatus === "DERIVED";
  if (!quantityDerived) {
    issues.push({ path: "quantityResults", message: "quantity must be DERIVED (run design)" });
  }
  const authorizationPreserved =
    document.designResults.reactionStatus === "NOT_AVAILABLE"
    && document.designResults.designStatus === "NOT_AUTHORIZED";
  if (!authorizationPreserved) {
    issues.push({ path: "authorization", message: "NOT_AUTHORIZED status must be preserved (no auto-promotion)" });
  }

  const ok = issues.length === 0;
  return {
    ok,
    issues,
    checks: {
      documentValid,
      shapesValid,
      bridgeLayoutPresent,
      phase4HandoffPresent,
      phase5HandoffPresent,
      supportsPresent,
      bearingSeatsPresent,
      quantityDerived,
      authorizationPreserved,
    },
    phase6Ready: ok,
  };
}

/** Regenerate derived and re-run the gate (post-restore). */
export function runSubstructureIntegrityGateAfterRestore(
  manager: ProjectManager,
  projectId: string,
  document: SubstructureDocument,
): SubstructureIntegrityResult {
  const regenerated = regenerateSubstructureDerived(manager, projectId, document);
  return runSubstructureIntegrityGate(manager, projectId, regenerated);
}
