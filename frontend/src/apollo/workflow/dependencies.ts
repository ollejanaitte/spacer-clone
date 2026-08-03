/**
 * Workflow dependency graph — frozen edges (03_workflow_control_design.md).
 *
 * WF-01→WF-02→{WF-03,WF-04}; WF-04→{WF-05,WF-06};
 * {WF-03,WF-05,WF-06}→WF-07→WF-08→WF-09;
 * {WF-03,WF-04,WF-05,WF-06}→WF-10→{WF-12,WF-13};
 * WF-08→WF-11; {WF-12,WF-13}→WF-14→WF-15.
 *
 * "Active" prerequisites exclude PENDING_FUTURE_STEP capabilities (Step 4-A
 * local-CRS guard): a PLANNED stub must not unconditionally block WF-02..WF-14.
 * Once Step 4-E lands, `isBindingPrerequisiteActive()` flips to ACTIVE and the
 * frozen edges gate normally.
 */

import { WORKFLOW_STEP_DEFINITIONS } from "./registry";
import { WORKFLOW_STEP_IDS, type WorkflowStepId } from "./types";
import { isFutureCapability } from "./capabilityRegistry";

export const WORKFLOW_DEPENDENCY_EDGES: readonly (readonly [WorkflowStepId, WorkflowStepId])[] = [
  ["WF-01", "WF-02"],
  ["WF-02", "WF-03"],
  ["WF-02", "WF-04"],
  ["WF-04", "WF-05"],
  ["WF-04", "WF-06"],
  ["WF-03", "WF-07"],
  ["WF-05", "WF-07"],
  ["WF-06", "WF-07"],
  ["WF-07", "WF-08"],
  ["WF-08", "WF-09"],
  ["WF-03", "WF-10"],
  ["WF-04", "WF-10"],
  ["WF-05", "WF-10"],
  ["WF-06", "WF-10"],
  ["WF-08", "WF-11"],
  ["WF-10", "WF-12"],
  ["WF-10", "WF-13"],
  ["WF-12", "WF-14"],
  ["WF-13", "WF-14"],
  ["WF-14", "WF-15"],
] as const;

export const BINDING_PREREQUISITE_GUARD: "PENDING_STEP_4E" | "ACTIVE" = "PENDING_STEP_4E";

/** True after Step 4-E enables the alignment binding prerequisite. */
export function isBindingPrerequisiteActive(): boolean {
  return BINDING_PREREQUISITE_GUARD === "ACTIVE";
}

/**
 * Prerequisites that actually gate this step in the current stage.
 * PENDING_FUTURE_STEP capabilities are excluded so WF-02+ stay usable while
 * WF-01 (binding) / WF-03 (appurtenance) / WF-05 (haunch) / WF-06 (splice) are
 * still planned stubs. WF-01 binding specifically flips via the 4-E guard.
 */
export function activePrerequisitesOf(stepId: WorkflowStepId): readonly WorkflowStepId[] {
  const def = WORKFLOW_STEP_DEFINITIONS.find((entry) => entry.workflowStepId === stepId);
  if (!def) {
    throw new Error(`Unknown workflow step: ${stepId}`);
  }
  const filtered = def.prerequisites.filter((prereq) => !isFutureCapability(prereq));
  if (stepId === "WF-02" && !isBindingPrerequisiteActive()) {
    return filtered.filter((prereq) => prereq !== "WF-01");
  }
  return filtered;
}

export function assertNoDependencyCycles(): void {
  const states = new Map<WorkflowStepId, 0 | 1 | 2>();
  const visit = (stepId: WorkflowStepId): void => {
    const state = states.get(stepId) ?? 0;
    if (state === 2) return;
    if (state === 1) {
      throw new Error(`Workflow dependency cycle detected at ${stepId}`);
    }
    states.set(stepId, 1);
    for (const [from, to] of WORKFLOW_DEPENDENCY_EDGES) {
      if (to === stepId) {
        visit(from);
      }
    }
    states.set(stepId, 2);
  };
  for (const id of WORKFLOW_STEP_IDS) {
    visit(id);
  }
}

export function assertEdgesMatchRegistry(): void {
  const registryEdges = new Set<string>();
  for (const def of WORKFLOW_STEP_DEFINITIONS) {
    for (const prereq of def.prerequisites) {
      registryEdges.add(`${prereq}->${def.workflowStepId}`);
    }
  }
  for (const [from, to] of WORKFLOW_DEPENDENCY_EDGES) {
    if (!registryEdges.has(`${from}->${to}`)) {
      throw new Error(`Edge ${from}->${to} missing from registry prerequisites`);
    }
  }
  for (const edge of registryEdges) {
    const [from, to] = edge.split("->") as [WorkflowStepId, WorkflowStepId];
    if (!WORKFLOW_DEPENDENCY_EDGES.some(([f, t]) => f === from && t === to)) {
      throw new Error(`Edge ${edge} not declared in WORKFLOW_DEPENDENCY_EDGES`);
    }
  }
}

export function downstreamOf(stepId: WorkflowStepId): readonly WorkflowStepId[] {
  return WORKFLOW_DEPENDENCY_EDGES.filter(([from]) => from === stepId).map(([, to]) => to);
}

export function topologicalOrder(): readonly WorkflowStepId[] {
  const inDegree = new Map<WorkflowStepId, number>();
  const outEdges = new Map<WorkflowStepId, WorkflowStepId[]>();
  for (const id of WORKFLOW_STEP_IDS) {
    inDegree.set(id, 0);
    outEdges.set(id, []);
  }
  for (const [from, to] of WORKFLOW_DEPENDENCY_EDGES) {
    inDegree.set(to, (inDegree.get(to) ?? 0) + 1);
    outEdges.get(from)?.push(to);
  }
  const queue = WORKFLOW_STEP_IDS.filter((id) => (inDegree.get(id) ?? 0) === 0);
  const result: WorkflowStepId[] = [];
  while (queue.length > 0) {
    const current = queue.shift() as WorkflowStepId;
    result.push(current);
    for (const next of outEdges.get(current) ?? []) {
      const degree = (inDegree.get(next) ?? 0) - 1;
      inDegree.set(next, degree);
      if (degree === 0) queue.push(next);
    }
  }
  if (result.length !== WORKFLOW_STEP_IDS.length) {
    throw new Error("Workflow dependency graph is not a DAG");
  }
  return result;
}
