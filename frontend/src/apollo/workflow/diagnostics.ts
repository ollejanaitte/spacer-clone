/**
 * Step 4-A aggregated diagnostics helpers.
 */

import type { WorkflowDiagnostic, WorkflowStateModel, WorkflowStatus } from "./types";

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

export const STATUS_GROUP_LABELS: Record<WorkflowStatus, string> = {
  NOT_STARTED: "未着手",
  AVAILABLE: "開始可能",
  RECOMMENDED: "推奨",
  INCOMPLETE: "入力途中",
  BLOCKED: "中断",
  READY: "実行可能",
  STALE: "要再生成",
  WARNING: "警告あり",
  ERROR: "エラー",
  COMPLETE: "完了",
  NOT_AUTHORIZED: "未認可",
  OUT_OF_SCOPE: "範囲外",
};
