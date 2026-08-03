/**
 * Step 4-A recommended-action evaluator.
 *
 * 1. Evaluate in registry order.
 * 2. Never recommend ERROR / BLOCKED / OUT_OF_SCOPE / NOT_STARTED / COMPLETE.
 * 3. Prefer STALE upstream regeneration over new downstream work.
 * 4. First actionable among AVAILABLE / READY / INCOMPLETE otherwise.
 * 5. Exactly one `currentRecommendedStepId` (max 1).
 * 6. Never recommend formal authorization actions.
 */

import { WORKFLOW_STEP_DEFINITIONS } from "./registry";
import { isActionableBaseStatus } from "./evaluators";
import type { WorkflowStepId, WorkflowStatus } from "./types";

export type RecommendedStepInput = {
  readonly workflowStepId: WorkflowStepId;
  readonly status: WorkflowStatus;
};

const RECOMMENDABLE_STATUSES: readonly WorkflowStatus[] = [
  "STALE",
  "AVAILABLE",
  "READY",
  "INCOMPLETE",
];

/**
 * Returns at most one recommended step id.
 * STALE producers are preferred (upstream regeneration before downstream export).
 */
export function resolveRecommendedStep(steps: readonly RecommendedStepInput[]): WorkflowStepId | null {
  const byId = new Map(steps.map((step) => [step.workflowStepId, step]));

  const staleCandidates = WORKFLOW_STEP_DEFINITIONS.filter((def) => {
    const step = byId.get(def.workflowStepId);
    return step !== undefined && step.status === "STALE";
  });
  if (staleCandidates.length > 0) {
    return staleCandidates[0].workflowStepId;
  }

  const actionable = WORKFLOW_STEP_DEFINITIONS.filter((def) => {
    const step = byId.get(def.workflowStepId);
    return step !== undefined && RECOMMENDABLE_STATUSES.includes(step.status);
  });
  if (actionable.length === 0) {
    return null;
  }
  return actionable[0].workflowStepId;
}

export function recommendedActionText(stepId: WorkflowStepId, status: WorkflowStatus): string {
  if (status === "STALE") return "再生成を推奨（上流の再生成が最優先）";
  if (status === "READY") return "primary action を実行してください。";
  if (status === "INCOMPLETE") return "不足項目を入力・確認してください。";
  if (status === "AVAILABLE") return "工程を開いて進めてください。";
  return "次の工程へ進んでください。";
}

export { isActionableBaseStatus };
