import {
  createValidationIssue,
  createValidationResult,
  type ValidationIssue,
  type ValidationResult,
} from "./validation";
import type { UuidString } from "./uuid";

export interface EntityIdRef {
  readonly id: UuidString;
  readonly path: string;
}

export function findCrossCollectionDuplicateEntityIds(
  entryGroups: readonly (readonly EntityIdRef[])[],
  duplicateCode: string,
  message: string,
): readonly ValidationIssue[] {
  const combined: EntityIdRef[] = [];
  for (const group of entryGroups) {
    combined.push(...group);
  }
  return findDuplicateEntityIds(combined, duplicateCode, message);
}

export function findDuplicateEntityIds(
  entries: readonly EntityIdRef[],
  duplicateCode: string,
  message: string,
): readonly ValidationIssue[] {
  const seen = new Map<string, string>();
  const issues: ValidationIssue[] = [];

  for (const entry of entries) {
    const priorPath = seen.get(entry.id);
    if (priorPath !== undefined) {
      issues.push(
        createValidationIssue({
          code: duplicateCode,
          severity: "error",
          message,
          path: entry.path,
          entityId: entry.id,
        }),
      );
      continue;
    }
    seen.set(entry.id, entry.path);
  }

  return issues;
}

export function validateEntityIdReference(
  entityId: UuidString | undefined,
  knownIds: ReadonlySet<UuidString>,
  path: string,
  unresolvedCode: string,
  message: string,
): ValidationIssue | undefined {
  if (entityId === undefined) {
    return undefined;
  }

  if (!knownIds.has(entityId)) {
    return createValidationIssue({
      code: unresolvedCode,
      severity: "error",
      message,
      path,
      entityId,
    });
  }

  return undefined;
}

export function collectEntityIdIssues(
  issues: ValidationIssue[],
  candidate: ValidationIssue | undefined,
): void {
  if (candidate !== undefined) {
    issues.push(candidate);
  }
}

export function mergeEntityIdIssues(
  issues: readonly ValidationIssue[],
): ValidationResult {
  return createValidationResult(issues);
}
