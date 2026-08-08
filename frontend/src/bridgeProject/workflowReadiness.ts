/**
 * Phase 3-7: 最小 Workflow Readiness（次に実行可能な正規アクションの判定）。
 *
 * From the BridgeProject manifest + CBDM, evaluates what is CONFIRMED / INFERRED /
 * MISSING / NOT_AUTHORIZED and the next actionable step. This is a light
 * readiness signal for the future Workflow Engine — NOT a workflow engine itself.
 */

import type { BridgeProject } from "../contracts/bridgeProject";
import type { CommonBridgeDataModelValue } from "../contracts/runtime/schemas/commonBridgeDataModel";

export interface WorkflowReadiness {
  readonly nextAction:
    | "road-alignment"
    | "superstructure"
    | "substructure"
    | "review"
    | "blocked";
  readonly confirmed: readonly string[];
  readonly inferred: readonly string[];
  readonly missing: readonly string[];
  readonly deferred: readonly string[];
  readonly notAuthorized: readonly string[];
  readonly needsUserConfirmation: boolean;
  readonly stateReason: string;
}

/**
 * Evaluate the current BridgeProject readiness from the manifest + CBDM.
 * Grounded entirely in existing status vocabulary.
 */
export function evaluateBridgeProjectReadiness(
  manifest: BridgeProject,
  commonModel: CommonBridgeDataModelValue,
): WorkflowReadiness {
  const sections = manifest.status.sections;
  const confirmed: string[] = [];
  const inferred: string[] = [];
  const missing: string[] = [];
  const deferred: string[] = [];
  const notAuthorized: string[] = [];

  // Section-level statuses.
  const alignment = sections.alignment?.state;
  const superstructure = sections.superstructure?.state;
  const substructure = sections.substructure?.state;
  const analysis = sections.analysis?.state;

  // Reconstruction entries (CASE B) carry value-level statuses.
  for (const entry of manifest.reconstruction?.entries ?? []) {
    switch (entry.status) {
      case "CONFIRMED":
        confirmed.push(entry.fieldKey);
        break;
      case "INFERRED":
        inferred.push(entry.fieldKey);
        break;
      case "MISSING":
        missing.push(entry.fieldKey);
        break;
      case "DEFERRED":
        deferred.push(entry.fieldKey);
        break;
      case "NOT_AUTHORIZED":
        notAuthorized.push(entry.fieldKey);
        break;
    }
  }

  // Authorization state.
  if (commonModel.metadata.numericDesignAuthorization === "NOT_GRANTED") {
    notAuthorized.push("numericDesignAuthorization");
  }
  if (analysis === "NOT_AUTHORIZED") {
    notAuthorized.push("analysis");
  }

  // User-confirmation need comes from RECONSTRUCTED estimates (CASE B) — not the
  // permanent analysis gate (which is a NOT_AUTHORIZED block, not a user input).
  const needsUserConfirmation = inferred.length > 0 || missing.length > 0;
  const needsSuperstructure = alignment === "COMPLETE" && superstructure !== "COMPLETE";
  const needsSubstructure = superstructure === "COMPLETE" && substructure !== "COMPLETE";
  const alignmentNotReady = alignment !== "COMPLETE" && alignment !== "PARTIAL";

  let nextAction: WorkflowReadiness["nextAction"];
  let stateReason: string;
  if (notAuthorized.length > 0 && superstructure !== "COMPLETE" && substructure !== "COMPLETE") {
    nextAction = "superstructure";
    stateReason = "superstructure is the next step; analysis/reactions remain NOT_AUTHORIZED";
  } else if (alignmentNotReady) {
    nextAction = "road-alignment";
    stateReason = "alignment not established (CASE A entry point)";
  } else if (needsSuperstructure) {
    nextAction = "superstructure";
    stateReason = "alignment complete; run superstructure (②)";
  } else if (needsSubstructure) {
    nextAction = "substructure";
    stateReason = "superstructure complete; bind substructure (③)";
  } else {
    nextAction = "review";
    stateReason = "①→②→③ chain complete; review INFERRED/MISSING/NOT_AUTHORIZED items";
  }

  return {
    nextAction,
    confirmed,
    inferred,
    missing,
    deferred,
    notAuthorized,
    needsUserConfirmation,
    stateReason,
  };
}
