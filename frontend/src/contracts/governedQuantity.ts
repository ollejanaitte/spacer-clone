import {
  NumericAuthority,
  TargetStandardStatus,
  type NumericAuthorityContext,
  type NumericValueRecord,
} from "../apollo/types";
import {
  isTreatableAsAdopted,
  validateNumericAuthority,
} from "../apollo/numericAuthorityGuard";
import {
  createValidationIssue,
  createValidationResult,
  type ValidationIssue,
  type ValidationResult,
} from "./validation";

export const GOVERNED_QUANTITY_ADOPTION_STATUSES = [
  "PENDING",
  "PLACEHOLDER",
  "UNKNOWN",
  "ADOPTED",
] as const;

export type GovernedQuantityAdoptionStatus =
  (typeof GOVERNED_QUANTITY_ADOPTION_STATUSES)[number];

export interface GovernedQuantity {
  readonly value: number | null;
  readonly units: string;
  readonly adoptionStatus: GovernedQuantityAdoptionStatus;
  readonly sourceLocator: string | null;
  readonly decisionId?: string | null;
}

export interface ValidateGovernedQuantityOptions {
  readonly numericAuthorityContext?: NumericAuthorityContext;
}

const DEFAULT_NUMERIC_AUTHORITY_CONTEXT: NumericAuthorityContext = {
  targetStandardStatus: TargetStandardStatus.NOT_SELECTED,
};

const ADOPTION_STATUS_SET = new Set<string>(GOVERNED_QUANTITY_ADOPTION_STATUSES);

export function isGovernedQuantityAdoptionStatus(
  value: string,
): value is GovernedQuantityAdoptionStatus {
  return ADOPTION_STATUS_SET.has(value);
}

export function adoptionStatusToNumericAuthority(
  status: GovernedQuantityAdoptionStatus,
): NumericAuthority {
  switch (status) {
    case "ADOPTED":
      return NumericAuthority.ADOPTED;
    case "PLACEHOLDER":
      return NumericAuthority.PLACEHOLDER;
    case "PENDING":
    case "UNKNOWN":
      return NumericAuthority.USER_PROVIDED_UNVERIFIED;
  }
}

export function governedQuantityToNumericRecord(quantity: GovernedQuantity): NumericValueRecord {
  return {
    value: quantity.value,
    authority: adoptionStatusToNumericAuthority(quantity.adoptionStatus),
    sourceLocator: quantity.sourceLocator,
    decisionId: quantity.decisionId,
  };
}

function mapGuardIssuesToValidationIssues(
  guardIssues: readonly { code: string; message: string; path?: string }[],
): ValidationIssue[] {
  return guardIssues.map((issue) =>
    createValidationIssue({
      code: issue.code,
      severity: "error",
      message: issue.message,
      path: issue.path ?? "",
    }),
  );
}

export function validateGovernedQuantity(
  quantity: Partial<GovernedQuantity> | undefined,
  path = "",
  options: ValidateGovernedQuantityOptions = {},
): ValidationResult {
  const basePath = path.length > 0 ? path : "";
  const context = options.numericAuthorityContext ?? DEFAULT_NUMERIC_AUTHORITY_CONTEXT;

  if (quantity === undefined) {
    return createValidationResult([
      createValidationIssue({
        code: "GOVERNED_QUANTITY_MISSING",
        severity: "error",
        message: "GovernedQuantity is required.",
        path: basePath,
      }),
    ]);
  }

  const issues: ValidationIssue[] = [];

  if (quantity.value !== null && quantity.value !== undefined && typeof quantity.value !== "number") {
    issues.push(
      createValidationIssue({
        code: "GOVERNED_QUANTITY_VALUE_INVALID",
        severity: "error",
        message: "value must be a number or null.",
        path: `${basePath}/value`,
      }),
    );
  }

  if (typeof quantity.units !== "string" || quantity.units.trim().length === 0) {
    issues.push(
      createValidationIssue({
        code: "GOVERNED_QUANTITY_UNITS_MISSING",
        severity: "error",
        message: "units must be a non-empty string.",
        path: `${basePath}/units`,
      }),
    );
  }

  if (
    typeof quantity.adoptionStatus !== "string" ||
    !isGovernedQuantityAdoptionStatus(quantity.adoptionStatus)
  ) {
    issues.push(
      createValidationIssue({
        code: "GOVERNED_QUANTITY_ADOPTION_STATUS_INVALID",
        severity: "error",
        message: "adoptionStatus must be PENDING, PLACEHOLDER, UNKNOWN, or ADOPTED.",
        path: `${basePath}/adoptionStatus`,
      }),
    );
    return createValidationResult(issues);
  }

  if (quantity.sourceLocator !== null && typeof quantity.sourceLocator !== "string") {
    issues.push(
      createValidationIssue({
        code: "GOVERNED_QUANTITY_SOURCE_LOCATOR_INVALID",
        severity: "error",
        message: "sourceLocator must be a string or null.",
        path: `${basePath}/sourceLocator`,
      }),
    );
  }

  const authority = adoptionStatusToNumericAuthority(quantity.adoptionStatus);

  if (isTreatableAsAdopted(authority)) {
    const numericRecord = governedQuantityToNumericRecord(quantity as GovernedQuantity);
    issues.push(
      ...mapGuardIssuesToValidationIssues(
        validateNumericAuthority(numericRecord, context, basePath).issues,
      ),
    );
  }

  return createValidationResult(issues);
}
