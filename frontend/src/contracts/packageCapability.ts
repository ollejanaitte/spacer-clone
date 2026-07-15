import type { CoordinateContext } from "./coordinateContext";
import {
  createValidationIssue,
  createValidationResult,
  type ValidationIssue,
  type ValidationResult,
} from "./validation";

export const PACKAGE_CAPABILITY_STATES = [
  "supported",
  "unsupported",
  "absent",
  "deferred",
  "unknown",
] as const;

export type PackageCapabilityState = (typeof PACKAGE_CAPABILITY_STATES)[number];

const PACKAGE_CAPABILITY_STATE_SET = new Set<string>(PACKAGE_CAPABILITY_STATES);

export function isPackageCapabilityState(value: string): value is PackageCapabilityState {
  return PACKAGE_CAPABILITY_STATE_SET.has(value);
}

export interface PackageCapabilityEntry {
  readonly capabilityId: string;
  readonly status: PackageCapabilityState;
  readonly critical?: boolean;
}

export interface CapabilityAssessmentSummary {
  readonly mutationBlocked: boolean;
  readonly blockedCapabilityIds?: readonly string[];
}

export function validatePackageCapabilityEntry(
  entry: Partial<PackageCapabilityEntry> | undefined,
  path: string,
): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (entry === undefined) {
    issues.push(
      createValidationIssue({
        code: "PACKAGE_CAPABILITY_ENTRY_MISSING",
        severity: "error",
        message: "Capability entry is required.",
        path,
      }),
    );
    return createValidationResult(issues);
  }

  if (typeof entry.capabilityId !== "string" || entry.capabilityId.trim().length === 0) {
    issues.push(
      createValidationIssue({
        code: "PACKAGE_CAPABILITY_ID_INVALID",
        severity: "error",
        message: "capabilityId must be a non-empty string.",
        path: `${path}/capabilityId`,
      }),
    );
  }

  if (
    entry.status === undefined ||
    typeof entry.status !== "string" ||
    !isPackageCapabilityState(entry.status)
  ) {
    issues.push(
      createValidationIssue({
        code: "PACKAGE_CAPABILITY_STATUS_INVALID",
        severity: "error",
        message: `status must be one of: ${PACKAGE_CAPABILITY_STATES.join(", ")}.`,
        path: `${path}/status`,
      }),
    );
  }

  return createValidationResult(issues);
}

export function validatePackageCapabilityCollection(
  capabilities: readonly PackageCapabilityEntry[] | undefined,
  path: string,
): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (capabilities === undefined) {
    issues.push(
      createValidationIssue({
        code: "PACKAGE_CAPABILITY_COLLECTION_MISSING",
        severity: "error",
        message: "capabilities collection is required.",
        path,
      }),
    );
    return createValidationResult(issues);
  }

  const seen = new Set<string>();
  capabilities.forEach((entry, index) => {
    const itemPath = `${path}/${index}`;
    const itemResult = validatePackageCapabilityEntry(entry, itemPath);
    issues.push(...itemResult.issues);

    if (typeof entry.capabilityId === "string" && entry.capabilityId.trim().length > 0) {
      if (seen.has(entry.capabilityId)) {
        issues.push(
          createValidationIssue({
            code: "PACKAGE_CAPABILITY_ID_DUPLICATE",
            severity: "error",
            message: "capabilityId values must be unique within the collection.",
            path: `${itemPath}/capabilityId`,
          }),
        );
      } else {
        seen.add(entry.capabilityId);
      }
    }
  });

  return createValidationResult(issues);
}

export function validateCapabilityAssessmentSummary(
  summary: Partial<CapabilityAssessmentSummary> | undefined,
  path: string,
  capabilities?: readonly PackageCapabilityEntry[],
  coordinateContext?: Partial<CoordinateContext>,
): ValidationResult {
  if (summary === undefined) {
    return createValidationResult([]);
  }

  const issues: ValidationIssue[] = [];

  if (typeof summary.mutationBlocked !== "boolean") {
    issues.push(
      createValidationIssue({
        code: "CAPABILITY_ASSESSMENT_MUTATION_BLOCKED_INVALID",
        severity: "error",
        message: "mutationBlocked must be a boolean when capabilityAssessmentSummary is present.",
        path: `${path}/mutationBlocked`,
      }),
    );
  }

  if (capabilities !== undefined) {
    const capabilityIds = new Set<string>();
    for (const entry of capabilities) {
      if (typeof entry.capabilityId === "string" && entry.capabilityId.trim().length > 0) {
        capabilityIds.add(entry.capabilityId);
      }
    }

    const blockingCapabilityIds = capabilities
      .filter(
        (entry) =>
          entry.critical === true &&
          entry.status !== undefined &&
          isApplyBlockingCapabilityState(entry.status),
      )
      .map((entry) => entry.capabilityId);

    const blockedIds = summary.blockedCapabilityIds ?? [];
    const seenBlockedIds = new Set<string>();

    blockedIds.forEach((capabilityId, index) => {
      if (typeof capabilityId !== "string" || capabilityId.trim().length === 0) {
        return;
      }

      if (seenBlockedIds.has(capabilityId)) {
        issues.push(
          createValidationIssue({
            code: "CAPABILITY_ASSESSMENT_BLOCKED_ID_DUPLICATE",
            severity: "error",
            message: "blockedCapabilityIds must not contain duplicate entries.",
            path: `${path}/blockedCapabilityIds/${index}`,
          }),
        );
        return;
      }
      seenBlockedIds.add(capabilityId);

      if (!capabilityIds.has(capabilityId)) {
        issues.push(
          createValidationIssue({
            code: "CAPABILITY_ASSESSMENT_BLOCKED_ID_UNKNOWN",
            severity: "error",
            message: "blockedCapabilityIds must reference declared capabilityId values.",
            path: `${path}/blockedCapabilityIds/${index}`,
          }),
        );
        return;
      }

      if (!blockingCapabilityIds.includes(capabilityId)) {
        issues.push(
          createValidationIssue({
            code: "CAPABILITY_ASSESSMENT_BLOCKED_ID_NOT_BLOCKING",
            severity: "error",
            message:
              "blockedCapabilityIds must only reference capabilities that are actually blocking.",
            path: `${path}/blockedCapabilityIds/${index}`,
          }),
        );
      }
    });

    for (const blockingId of blockingCapabilityIds) {
      if (!seenBlockedIds.has(blockingId)) {
        issues.push(
          createValidationIssue({
            code: "CAPABILITY_ASSESSMENT_BLOCKED_ID_INCOMPLETE",
            severity: "error",
            message:
              "blockedCapabilityIds must include every critical capability blocked by unknown or unsupported status.",
            path: `${path}/blockedCapabilityIds`,
          }),
        );
        break;
      }
    }

    if (blockingCapabilityIds.length > 0 && summary.mutationBlocked === false) {
      issues.push(
        createValidationIssue({
          code: "CAPABILITY_ASSESSMENT_MUTATION_NOT_BLOCKED",
          severity: "error",
          message:
            "mutationBlocked must be true when critical capabilities are blocked by unknown or unsupported status.",
          path: `${path}/mutationBlocked`,
        }),
      );
    }
  }

  if (summary.mutationBlocked === false && coordinateContext !== undefined) {
    const confidenceStatus = coordinateContext.confidenceStatus;
    if (confidenceStatus === "unknown" || confidenceStatus === "conflicted") {
      issues.push(
        createValidationIssue({
          code: "CAPABILITY_ASSESSMENT_COORDINATE_CONFIDENCE_NOT_BLOCKED",
          severity: "error",
          message:
            "mutationBlocked must be true when coordinateContext confidenceStatus is unknown or conflicted.",
          path: `${path}/mutationBlocked`,
        }),
      );
    }

    const transformStatus = coordinateContext.transformToCanonical?.status;
    if (transformStatus === "unknown" || transformStatus === "conflicted") {
      issues.push(
        createValidationIssue({
          code: "CAPABILITY_ASSESSMENT_COORDINATE_TRANSFORM_NOT_BLOCKED",
          severity: "error",
          message:
            "mutationBlocked must be true when coordinateContext transformToCanonical status is unknown or conflicted.",
          path: `${path}/mutationBlocked`,
        }),
      );
    }
  }

  return createValidationResult(issues);
}

export function isApplyBlockingCapabilityState(status: PackageCapabilityState): boolean {
  return status === "unknown" || status === "unsupported";
}
