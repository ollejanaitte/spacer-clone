import { parseSchemaId, requireSchemaVersion, type SchemaId, type SchemaVersion } from "./schemaIdentity";
import {
  createValidationIssue,
  createValidationResult,
  type ValidationIssue,
  type ValidationResult,
} from "./validation";

export const ENGINEERING_PROJECT_SCHEMA_ID = "spacer.contracts.engineering-project" as SchemaId;
export const UNKNOWN_FIELD_STORE_SCHEMA_ID = "spacer.contracts.unknown-field-store" as SchemaId;
export const MIGRATION_RECORD_SCHEMA_ID = "spacer.contracts.migration-record" as SchemaId;
export const DOCUMENT_REFERENCE_SCHEMA_ID = "spacer.contracts.document-reference" as SchemaId;

/** Reusable envelope shape identifier for JSON Schema metadata; not a standalone document family. */
export const COMMON_ENVELOPE_SHAPE_ID = "spacer.contracts.common-envelope-shape" as SchemaId;

export const ENGINEERING_PROJECT_SCHEMA_VERSION = requireSchemaVersion("0.1.0");
export const UNKNOWN_FIELD_STORE_SCHEMA_VERSION = requireSchemaVersion("0.1.0");
export const MIGRATION_RECORD_SCHEMA_VERSION = requireSchemaVersion("0.1.0");

export interface ContractVersionSupport {
  readonly schemaId: SchemaId;
  readonly supportedVersions: readonly SchemaVersion[];
  readonly currentVersion: SchemaVersion;
}

function parseSemVerMajor(version: string): number | undefined {
  const match = /^(0|[1-9]\d*)\./.exec(version);
  if (match === null) {
    return undefined;
  }
  return Number.parseInt(match[1]!, 10);
}

export const CONTRACT_VERSION_SUPPORT_MATRIX: Readonly<
  Record<string, ContractVersionSupport>
> = {
  [ENGINEERING_PROJECT_SCHEMA_ID]: {
    schemaId: ENGINEERING_PROJECT_SCHEMA_ID,
    supportedVersions: [ENGINEERING_PROJECT_SCHEMA_VERSION],
    currentVersion: ENGINEERING_PROJECT_SCHEMA_VERSION,
  },
  [UNKNOWN_FIELD_STORE_SCHEMA_ID]: {
    schemaId: UNKNOWN_FIELD_STORE_SCHEMA_ID,
    supportedVersions: [UNKNOWN_FIELD_STORE_SCHEMA_VERSION],
    currentVersion: UNKNOWN_FIELD_STORE_SCHEMA_VERSION,
  },
  [MIGRATION_RECORD_SCHEMA_ID]: {
    schemaId: MIGRATION_RECORD_SCHEMA_ID,
    supportedVersions: [MIGRATION_RECORD_SCHEMA_VERSION],
    currentVersion: MIGRATION_RECORD_SCHEMA_VERSION,
  },
};

export function getContractVersionSupport(schemaId: SchemaId): ContractVersionSupport | undefined {
  return CONTRACT_VERSION_SUPPORT_MATRIX[schemaId];
}

export function isSupportedContractVersion(
  schemaId: SchemaId,
  schemaVersion: SchemaVersion,
): boolean {
  const support = getContractVersionSupport(schemaId);
  if (support === undefined) {
    return false;
  }
  return support.supportedVersions.includes(schemaVersion);
}

export function validateSupportedContractVersion(
  schemaId: SchemaId | undefined,
  schemaVersion: SchemaVersion | undefined,
  path = "",
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const basePath = path.length > 0 ? path : "";

  if (schemaId === undefined || typeof schemaId !== "string" || schemaId.trim().length === 0) {
    issues.push(
      createValidationIssue({
        code: "CONTRACT_SCHEMA_ID_MISSING",
        severity: "error",
        message: "schemaId is required for contract version validation.",
        path: `${basePath}/schemaId`,
      }),
    );
    return createValidationResult(issues);
  }

  if (schemaVersion === undefined) {
    issues.push(
      createValidationIssue({
        code: "CONTRACT_SCHEMA_VERSION_MISSING",
        severity: "error",
        message: "schemaVersion is required for contract version validation.",
        path: `${basePath}/schemaVersion`,
      }),
    );
    return createValidationResult(issues);
  }

  const parsedSchemaId = parseSchemaId(schemaId);
  if (parsedSchemaId === undefined) {
    issues.push(
      createValidationIssue({
        code: "CONTRACT_SCHEMA_ID_INVALID",
        severity: "error",
        message: "schemaId must be a non-empty string.",
        path: `${basePath}/schemaId`,
      }),
    );
    return createValidationResult(issues);
  }

  const support = getContractVersionSupport(parsedSchemaId);
  if (support === undefined) {
    issues.push(
      createValidationIssue({
        code: "CONTRACT_SCHEMA_ID_UNKNOWN",
        severity: "error",
        message: "schemaId is not registered in the contract version support matrix.",
        path: `${basePath}/schemaId`,
      }),
    );
    return createValidationResult(issues);
  }

  if (support.supportedVersions.includes(schemaVersion)) {
    return createValidationResult(issues);
  }

  const requestedMajor = parseSemVerMajor(schemaVersion);
  const supportedMajors = new Set(
    support.supportedVersions
      .map((version) => parseSemVerMajor(version))
      .filter((major): major is number => major !== undefined),
  );

  if (requestedMajor !== undefined && !supportedMajors.has(requestedMajor)) {
    issues.push(
      createValidationIssue({
        code: "CONTRACT_SCHEMA_VERSION_MAJOR_UNSUPPORTED",
        severity: "error",
        message: "Unsupported schema major version; input must be quarantined rather than defaulted.",
        path: `${basePath}/schemaVersion`,
      }),
    );
    return createValidationResult(issues);
  }

  issues.push(
    createValidationIssue({
      code: "CONTRACT_SCHEMA_VERSION_UNSUPPORTED",
      severity: "error",
      message: "schemaVersion is not in the supported version matrix for this contract.",
      path: `${basePath}/schemaVersion`,
    }),
  );

  return createValidationResult(issues);
}
