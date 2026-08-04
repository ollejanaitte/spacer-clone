/**
 * Step 4-A aggregated diagnostics helpers.
 */

import type { WorkflowDiagnostic, WorkflowStateModel, WorkflowStatus } from "./types";
import { getStatusLabel } from "../i18n";

export function blockingDiagnostics(model: WorkflowStateModel): readonly WorkflowDiagnostic[] {
  return model.diagnostics.filter((entry) => entry.blocking);
}

export function errorDiagnostics(model: WorkflowStateModel): readonly WorkflowDiagnostic[] {
  return model.diagnostics.filter((entry) => entry.severity === "error");
}

export function warningDiagnostics(model: WorkflowStateModel): readonly WorkflowDiagnostic[] {
  return model.diagnostics.filter((entry) => entry.severity === "warning");
}

export function diagnosticsForStep(
  model: WorkflowStateModel,
  stepId: WorkflowStateModel["steps"][number]["workflowStepId"],
): readonly WorkflowDiagnostic[] {
  return model.steps.find((step) => step.workflowStepId === stepId)?.diagnostics ?? [];
}

/** JP1-B glossary labels via centralized catalog (Step 5-JP2). */
export const STATUS_GROUP_LABELS: Record<WorkflowStatus, string> = {
  NOT_STARTED: getStatusLabel("NOT_STARTED"),
  AVAILABLE: getStatusLabel("AVAILABLE"),
  RECOMMENDED: getStatusLabel("RECOMMENDED"),
  INCOMPLETE: getStatusLabel("INCOMPLETE"),
  BLOCKED: getStatusLabel("BLOCKED"),
  READY: getStatusLabel("READY"),
  STALE: getStatusLabel("STALE"),
  WARNING: getStatusLabel("WARNING"),
  ERROR: getStatusLabel("ERROR"),
  COMPLETE: getStatusLabel("COMPLETE"),
  NOT_AUTHORIZED: getStatusLabel("NOT_AUTHORIZED"),
  OUT_OF_SCOPE: getStatusLabel("OUT_OF_SCOPE"),
};
