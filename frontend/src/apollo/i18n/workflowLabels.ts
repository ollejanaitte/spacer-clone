import { MISSING_LABEL_JA, WORKFLOW_GROUP_CATALOG, WORKFLOW_STEP_CATALOG } from "./catalog";

function warnMissing(kind: string, key: string): void {
  if (typeof process !== "undefined" && process.env?.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.warn(`[apollo/i18n] missing ${kind} key: ${key}`);
  }
}

export function getWorkflowStepLabel(stepId: string): string {
  const entry = WORKFLOW_STEP_CATALOG[stepId];
  if (!entry) {
    warnMissing("workflow step", stepId);
    return MISSING_LABEL_JA;
  }
  return entry.primaryJa;
}

export function getWorkflowStepDescription(stepId: string): string {
  const entry = WORKFLOW_STEP_CATALOG[stepId];
  if (!entry) {
    warnMissing("workflow step", stepId);
    return MISSING_LABEL_JA;
  }
  return entry.descriptionJa;
}

export function getWorkflowStepShortLabel(stepId: string): string {
  const entry = WORKFLOW_STEP_CATALOG[stepId];
  if (!entry) {
    warnMissing("workflow step", stepId);
    return MISSING_LABEL_JA;
  }
  return entry.shortJa || entry.primaryJa;
}

export function getWorkflowGroupLabel(group: string): string {
  const entry = WORKFLOW_GROUP_CATALOG[group];
  if (!entry) {
    warnMissing("workflow group", group);
    return MISSING_LABEL_JA;
  }
  return entry.primaryJa;
}
