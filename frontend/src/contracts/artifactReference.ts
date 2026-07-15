import type { ContentChecksum } from "./contentChecksum";
import { validateContentChecksum } from "./contentChecksum";
import {
  ROAD_TO_FRAME_TRANSFER_PACKAGE_SCHEMA_ID,
  TRANSFER_RECORD_SCHEMA_ID,
  validateSupportedContractVersion,
} from "./contractVersionRegistry";
import type { SchemaVersion } from "./schemaIdentity";
import { isSemVerString } from "./schemaIdentity";
import { isValidUuid, type UuidString } from "./uuid";
import {
  createValidationIssue,
  createValidationResult,
  mergeValidationResults,
  type ValidationResult,
} from "./validation";

export interface PackageArtifactReference {
  readonly packageId: UuidString;
  readonly schemaVersion: SchemaVersion;
  readonly contentChecksum: ContentChecksum;
}

export interface TransferRecordArtifactReference {
  readonly recordId: UuidString;
  readonly schemaVersion: SchemaVersion;
  readonly contentChecksum: ContentChecksum;
}

export interface PolicyReference {
  readonly policyId: string;
  readonly schemaVersion: SchemaVersion;
  readonly contentChecksum: ContentChecksum;
}

function validateSchemaVersionField(
  schemaVersion: SchemaVersion | undefined,
  path: string,
): ValidationResult {
  if (schemaVersion === undefined || !isSemVerString(schemaVersion)) {
    return createValidationResult([
      createValidationIssue({
        code: "ARTIFACT_REFERENCE_SCHEMA_VERSION_INVALID",
        severity: "error",
        message: "schemaVersion must be a valid SemVer string.",
        path,
      }),
    ]);
  }
  return createValidationResult([]);
}

export function validatePackageArtifactReference(
  reference: Partial<PackageArtifactReference> | undefined,
  path = "",
): ValidationResult {
  const basePath = path.length > 0 ? path : "";
  const issues = [];

  if (reference === undefined) {
    issues.push(
      createValidationIssue({
        code: "PACKAGE_ARTIFACT_REFERENCE_MISSING",
        severity: "error",
        message: "Package artifact reference is required.",
        path: basePath,
      }),
    );
    return createValidationResult(issues);
  }

  if (typeof reference.packageId !== "string" || !isValidUuid(reference.packageId)) {
    issues.push(
      createValidationIssue({
        code: "PACKAGE_ARTIFACT_REFERENCE_ID_INVALID",
        severity: "error",
        message: "packageId must be a valid UUID.",
        path: `${basePath}/packageId`,
      }),
    );
  }

  return mergeValidationResults(
    createValidationResult(issues),
    validateSchemaVersionField(reference.schemaVersion, `${basePath}/schemaVersion`),
    validateSupportedContractVersion(
      ROAD_TO_FRAME_TRANSFER_PACKAGE_SCHEMA_ID,
      reference.schemaVersion,
      basePath,
    ),
    validateContentChecksum(reference.contentChecksum, `${basePath}/contentChecksum`),
  );
}

export function validateTransferRecordArtifactReference(
  reference: Partial<TransferRecordArtifactReference> | undefined,
  path = "",
): ValidationResult {
  const basePath = path.length > 0 ? path : "";
  const issues = [];

  if (reference === undefined) {
    issues.push(
      createValidationIssue({
        code: "TRANSFER_RECORD_ARTIFACT_REFERENCE_MISSING",
        severity: "error",
        message: "Transfer record artifact reference is required.",
        path: basePath,
      }),
    );
    return createValidationResult(issues);
  }

  if (typeof reference.recordId !== "string" || !isValidUuid(reference.recordId)) {
    issues.push(
      createValidationIssue({
        code: "TRANSFER_RECORD_ARTIFACT_REFERENCE_ID_INVALID",
        severity: "error",
        message: "recordId must be a valid UUID.",
        path: `${basePath}/recordId`,
      }),
    );
  }

  return mergeValidationResults(
    createValidationResult(issues),
    validateSchemaVersionField(reference.schemaVersion, `${basePath}/schemaVersion`),
    validateSupportedContractVersion(
      TRANSFER_RECORD_SCHEMA_ID,
      reference.schemaVersion,
      basePath,
    ),
    validateContentChecksum(reference.contentChecksum, `${basePath}/contentChecksum`),
  );
}

export function validatePolicyReference(
  reference: Partial<PolicyReference> | undefined,
  path = "",
): ValidationResult {
  const basePath = path.length > 0 ? path : "";
  const issues = [];

  if (reference === undefined) {
    issues.push(
      createValidationIssue({
        code: "POLICY_REFERENCE_MISSING",
        severity: "error",
        message: "Policy reference is required.",
        path: basePath,
      }),
    );
    return createValidationResult(issues);
  }

  if (typeof reference.policyId !== "string" || reference.policyId.trim().length === 0) {
    issues.push(
      createValidationIssue({
        code: "POLICY_REFERENCE_ID_INVALID",
        severity: "error",
        message: "policyId must be a non-empty string.",
        path: `${basePath}/policyId`,
      }),
    );
  }

  return mergeValidationResults(
    createValidationResult(issues),
    validateSchemaVersionField(reference.schemaVersion, `${basePath}/schemaVersion`),
    validateContentChecksum(reference.contentChecksum, `${basePath}/contentChecksum`),
  );
}
