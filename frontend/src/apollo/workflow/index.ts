/**
 * Apollo Step 4-A workflow control — public API.
 *
 * WorkflowStateModel is fully DERIVED from current project data + canonical
 * artifact models. Nothing except the WF-15 acknowledgment is persisted.
 */

import type { ProjectModel } from "../../types";
import { topologicalOrder, activePrerequisitesOf } from "./dependencies";
import { evaluateStep, isActionableBaseStatus } from "./evaluators";
import { getWorkflowStepDefinition } from "./registry";
import { resolveRecommendedStep, recommendedActionText } from "./recommendedAction";
import { getStepEvidenceWithWarnings } from "./selectors";
import { WORKFLOW_REVISION, WORKFLOW_STATE_SCHEMA_VERSION, WORKFLOW_STEP_IDS, type WorkflowStepId, type WorkflowStateModel, type WorkflowStatus } from "./types";

const PREREQ_SATISFIED_STATUSES: ReadonlySet<WorkflowStatus> = new Set<WorkflowStatus>([
  "INCOMPLETE",
  "READY",
  "STALE",
  "WARNING",
  "COMPLETE",
  "NOT_AUTHORIZED",
]);

export function buildWorkflowStateModel(project: ProjectModel): WorkflowStateModel {
  const evaluatedAt = new Date().toISOString();
  const order = topologicalOrder();
  const statusByStep = new Map<WorkflowStepId, WorkflowStatus>();
  const prereqSatisfiedByStep = new Map<WorkflowStepId, boolean>();
  const diagnosticsByStep = new Map<WorkflowStepId, WorkflowStateModel["steps"][number]>();

  for (const stepId of order) {
    const evidence = getStepEvidenceWithWarnings(project, stepId);
    const activePrereqs = activePrerequisitesOf(stepId);
    const prerequisitesSatisfied = activePrereqs.every((prereq) =>
      PREREQ_SATISFIED_STATUSES.has(statusByStep.get(prereq) ?? "NOT_STARTED"),
    );
    const result = evaluateStep({ stepId, evidence, prerequisitesSatisfied });
    statusByStep.set(stepId, result.status);
    prereqSatisfiedByStep.set(stepId, prerequisitesSatisfied);
    diagnosticsByStep.set(stepId, {
      workflowStepId: stepId,
      status: result.status,
      badges: result.badges,
      capabilityStatus: evidence.capability,
      prerequisitesSatisfied,
      completionSatisfied: evidence.complete,
      isRecommended: false,
      currentRevision: evidence.currentRevision,
      generatedRevision: evidence.generatedRevision,
      currentChecksum: evidence.currentChecksum,
      generatedChecksum: evidence.generatedChecksum,
      diagnostics: result.diagnostics,
      warnings: result.warnings,
      definition: getWorkflowStepDefinition(stepId),
      recommendedAction: null,
      evaluatedAt,
    });
  }

  const recommendedId = resolveRecommendedStep(
    order.map((stepId) => ({
      workflowStepId: stepId,
      status: statusByStep.get(stepId) ?? "NOT_STARTED",
    })),
  );

  const steps = WORKFLOW_STEP_IDS.map((stepId): WorkflowStateModel["steps"][number] => {
    const entry = diagnosticsByStep.get(stepId);
    if (!entry) throw new Error(`Missing evaluation for ${stepId}`);
    const baseStatus = entry.status;
    const isRecommended = stepId === recommendedId;
    let status = baseStatus;
    if (isRecommended && isActionableBaseStatus(baseStatus) && baseStatus !== "STALE") {
      status = "RECOMMENDED";
    }
    return {
      ...entry,
      status,
      isRecommended,
      recommendedAction: isRecommended ? recommendedActionText(stepId, baseStatus) : null,
    };
  });

  const progress = computeProgress(steps);
  const diagnostics = steps.flatMap((step) => [...step.diagnostics, ...step.warnings]);

  return {
    schemaVersion: WORKFLOW_STATE_SCHEMA_VERSION,
    workflowRevision: WORKFLOW_REVISION,
    projectId: project.project.id,
    evaluatedAt,
    steps,
    currentRecommendedStepId: recommendedId,
    progress,
    diagnostics,
    authorizationSummary: {
      numericDesignAuthorization: "NOT_GRANTED",
      formalReleaseReadiness: "NO_GO_PENDING_HUMAN_VALIDATION",
      designOrConstructionUse: "PROHIBITED",
    },
  };
}

function computeProgress(steps: WorkflowStateModel["steps"]): WorkflowStateModel["progress"] {
  const count = (predicate: (status: WorkflowStatus) => boolean): number =>
    steps.filter((step) => predicate(step.status)).length;
  const withBadge = (badge: string): number =>
    steps.filter((step) => step.badges.includes(badge as never)).length;
  return {
    total: steps.length,
    complete: count((status) => status === "COMPLETE"),
    actionable: count((status) =>
      status === "AVAILABLE" || status === "READY" || status === "RECOMMENDED" || status === "INCOMPLETE" || status === "STALE",
    ),
    blocked: count((status) => status === "BLOCKED"),
    stale: count((status) => status === "STALE"),
    error: count((status) => status === "ERROR"),
    notAuthorized: withBadge("NOT_AUTHORIZED"),
    notStarted: count((status) => status === "NOT_STARTED"),
    ready: count((status) => status === "READY" || status === "RECOMMENDED"),
    outOfScope: count((status) => status === "OUT_OF_SCOPE"),
  };
}
