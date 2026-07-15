import type { SchemaVersion } from "./schemaIdentity";

export const VALIDATION_RESULT_SCHEMA_VERSION = "0.1.0" as SchemaVersion;

export type ValidationSeverity = "error" | "warning" | "info";

export type ValidationStatus = "valid" | "invalid" | "warning";

export interface ValidationIssue {
  readonly code: string;
  readonly severity: ValidationSeverity;
  readonly message: string;
  readonly path: string;
  readonly entityKind?: string;
  readonly entityId?: string;
}

export interface ValidationResult {
  readonly schemaVersion: SchemaVersion;
  readonly status: ValidationStatus;
  readonly issues: readonly ValidationIssue[];
  readonly evaluatedRevision?: number;
  readonly evaluatedChecksum?: string;
  readonly ruleSetVersion?: string;
}

export interface CreateValidationIssueInput {
  code: string;
  severity: ValidationSeverity;
  message: string;
  path: string;
  entityKind?: string;
  entityId?: string;
}

export function createValidationIssue(input: CreateValidationIssueInput): ValidationIssue {
  return {
    code: input.code,
    severity: input.severity,
    message: input.message,
    path: input.path,
    ...(input.entityKind !== undefined ? { entityKind: input.entityKind } : {}),
    ...(input.entityId !== undefined ? { entityId: input.entityId } : {}),
  };
}

export function deriveValidationStatus(issues: readonly ValidationIssue[]): ValidationStatus {
  if (issues.some((issue) => issue.severity === "error")) {
    return "invalid";
  }
  if (issues.some((issue) => issue.severity === "warning")) {
    return "warning";
  }
  return "valid";
}

export function createValidationResult(
  issues: readonly ValidationIssue[],
  metadata?: Pick<ValidationResult, "evaluatedRevision" | "evaluatedChecksum" | "ruleSetVersion">,
): ValidationResult {
  return {
    schemaVersion: VALIDATION_RESULT_SCHEMA_VERSION,
    status: deriveValidationStatus(issues),
    issues,
    ...(metadata?.evaluatedRevision !== undefined
      ? { evaluatedRevision: metadata.evaluatedRevision }
      : {}),
    ...(metadata?.evaluatedChecksum !== undefined
      ? { evaluatedChecksum: metadata.evaluatedChecksum }
      : {}),
    ...(metadata?.ruleSetVersion !== undefined ? { ruleSetVersion: metadata.ruleSetVersion } : {}),
  };
}

type ValidationMetadataField = "evaluatedRevision" | "evaluatedChecksum" | "ruleSetVersion";

function collectMetadataConflictIssues(
  results: readonly ValidationResult[],
  field: ValidationMetadataField,
): ValidationIssue[] {
  const values = results
    .map((result) => result[field])
    .filter((value): value is NonNullable<ValidationResult[ValidationMetadataField]> => value !== undefined);

  if (values.length <= 1) {
    return [];
  }

  const uniqueValues = new Set(values.map((value) => JSON.stringify(value)));
  if (uniqueValues.size <= 1) {
    return [];
  }

  return [
    createValidationIssue({
      code: "VALIDATION_METADATA_CONFLICT",
      severity: "error",
      message: `Conflicting ${field} values cannot be merged silently.`,
      path: `/${field}`,
    }),
  ];
}

function resolveSharedMetadataValue<T>(
  results: readonly ValidationResult[],
  field: ValidationMetadataField,
  hasConflict: boolean,
): T | undefined {
  if (hasConflict) {
    return undefined;
  }

  const values = results
    .map((result) => result[field])
    .filter((value): value is NonNullable<ValidationResult[ValidationMetadataField]> => value !== undefined);

  if (values.length === 0) {
    return undefined;
  }

  const first = values[0];
  const allMatch = values.every((value) => JSON.stringify(value) === JSON.stringify(first));
  return allMatch ? (first as T) : undefined;
}

export function mergeValidationResults(
  ...results: readonly ValidationResult[]
): ValidationResult {
  const issues = results.flatMap((result) => result.issues);
  const evaluatedRevisionConflicts = collectMetadataConflictIssues(results, "evaluatedRevision");
  const evaluatedChecksumConflicts = collectMetadataConflictIssues(results, "evaluatedChecksum");
  const ruleSetVersionConflicts = collectMetadataConflictIssues(results, "ruleSetVersion");
  const metadataConflicts = [
    ...evaluatedRevisionConflicts,
    ...evaluatedChecksumConflicts,
    ...ruleSetVersionConflicts,
  ];

  const evaluatedRevision = resolveSharedMetadataValue<number>(
    results,
    "evaluatedRevision",
    evaluatedRevisionConflicts.length > 0,
  );
  const evaluatedChecksum = resolveSharedMetadataValue<string>(
    results,
    "evaluatedChecksum",
    evaluatedChecksumConflicts.length > 0,
  );
  const ruleSetVersion = resolveSharedMetadataValue<string>(
    results,
    "ruleSetVersion",
    ruleSetVersionConflicts.length > 0,
  );

  return createValidationResult([...issues, ...metadataConflicts], {
    ...(evaluatedRevision !== undefined ? { evaluatedRevision } : {}),
    ...(evaluatedChecksum !== undefined ? { evaluatedChecksum } : {}),
    ...(ruleSetVersion !== undefined ? { ruleSetVersion } : {}),
  });
}

export function hasValidationErrors(result: ValidationResult): boolean {
  return result.status === "invalid";
}
