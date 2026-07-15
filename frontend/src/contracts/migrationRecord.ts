import type { ContentChecksum } from "./contentChecksum";
import { validateContentChecksum } from "./contentChecksum";
import {
  MIGRATION_RECORD_SCHEMA_ID,
  validateSupportedContractVersion,
} from "./contractVersionRegistry";
import {
  validateDocumentReferenceCollection,
  type DocumentReference,
} from "./documentReference";
import type { ActorRef } from "./provenance";
import type { SchemaId, SchemaVersion } from "./schemaIdentity";
import { isValidUuid, type UuidString } from "./uuid";
import { isIso8601UtcTimestamp } from "./isoTimestamp";
import {
  createValidationIssue,
  createValidationResult,
  mergeValidationResults,
  type ValidationIssue,
  type ValidationResult,
} from "./validation";

export const MIGRATION_RECORD_DOCUMENT_KIND = "migration-record" as const;

export type MigrationStatus = "dry_run" | "committed";

export type MappingDisposition = "committed" | "quarantined" | "unmapped";

export interface MigrationIdMapping {
  readonly sourceId: string;
  readonly disposition: MappingDisposition;
  readonly targetId?: UuidString;
  readonly entityKind?: string;
}

export interface MigrationRecord {
  readonly schemaId: SchemaId;
  readonly schemaVersion: SchemaVersion;
  readonly documentKind: typeof MIGRATION_RECORD_DOCUMENT_KIND;
  readonly migrationId: UuidString;
  readonly adapterId: string;
  readonly adapterVersion: string;
  readonly sourceRawChecksum: ContentChecksum;
  readonly sourceContentChecksum: ContentChecksum;
  readonly sourceVersion: string;
  readonly targetVersion: string;
  readonly targetRefs?: readonly DocumentReference[];
  readonly candidateTargetRefs?: readonly DocumentReference[];
  readonly diagnostics: readonly ValidationIssue[];
  readonly recordedAt: string;
  readonly idMappings: readonly MigrationIdMapping[];
  readonly status: MigrationStatus;
  readonly operator?: ActorRef;
}

function validateIdMapping(
  mapping: Partial<MigrationIdMapping> | undefined,
  mappingPath: string,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (mapping === undefined) {
    issues.push(
      createValidationIssue({
        code: "MIGRATION_RECORD_ID_MAPPING_MISSING",
        severity: "error",
        message: "idMappings entry is required.",
        path: mappingPath,
      }),
    );
    return issues;
  }

  if (typeof mapping.sourceId !== "string" || mapping.sourceId.trim().length === 0) {
    issues.push(
      createValidationIssue({
        code: "MIGRATION_RECORD_SOURCE_ID_INVALID",
        severity: "error",
        message: "idMappings.sourceId must be a non-empty string.",
        path: `${mappingPath}/sourceId`,
      }),
    );
  }

  if (
    mapping.disposition !== "committed" &&
    mapping.disposition !== "quarantined" &&
    mapping.disposition !== "unmapped"
  ) {
    issues.push(
      createValidationIssue({
        code: "MIGRATION_RECORD_MAPPING_DISPOSITION_INVALID",
        severity: "error",
        message: "idMappings.disposition must be committed, quarantined, or unmapped.",
        path: `${mappingPath}/disposition`,
      }),
    );
    return issues;
  }

  if (mapping.disposition === "committed") {
    if (typeof mapping.targetId !== "string" || !isValidUuid(mapping.targetId)) {
      issues.push(
        createValidationIssue({
          code: "MIGRATION_RECORD_TARGET_ID_REQUIRED",
          severity: "error",
          message: "Committed mappings require targetId to be a valid UUID.",
          path: `${mappingPath}/targetId`,
        }),
      );
    }
  } else if (mapping.targetId !== undefined) {
    issues.push(
      createValidationIssue({
        code: "MIGRATION_RECORD_TARGET_ID_FORBIDDEN",
        severity: "error",
        message: "Quarantined and unmapped mappings must not include targetId.",
        path: `${mappingPath}/targetId`,
      }),
    );
  }

  return issues;
}

export function validateMigrationRecord(
  record: Partial<MigrationRecord> | undefined,
  path = "",
): ValidationResult {
  const basePath = path.length > 0 ? path : "";

  if (record === undefined) {
    return createValidationResult([
      createValidationIssue({
        code: "MIGRATION_RECORD_MISSING",
        severity: "error",
        message: "MigrationRecord is required.",
        path: basePath,
      }),
    ]);
  }

  const issues: ValidationIssue[] = [];

  if (record.schemaId !== MIGRATION_RECORD_SCHEMA_ID) {
    issues.push(
      createValidationIssue({
        code: "MIGRATION_RECORD_SCHEMA_ID_INVALID",
        severity: "error",
        message: `schemaId must be "${MIGRATION_RECORD_SCHEMA_ID}".`,
        path: `${basePath}/schemaId`,
      }),
    );
  }

  if (record.documentKind !== MIGRATION_RECORD_DOCUMENT_KIND) {
    issues.push(
      createValidationIssue({
        code: "MIGRATION_RECORD_DOCUMENT_KIND_INVALID",
        severity: "error",
        message: `documentKind must be "${MIGRATION_RECORD_DOCUMENT_KIND}".`,
        path: `${basePath}/documentKind`,
      }),
    );
  }

  if (typeof record.migrationId !== "string" || !isValidUuid(record.migrationId)) {
    issues.push(
      createValidationIssue({
        code: "MIGRATION_RECORD_ID_INVALID",
        severity: "error",
        message: "migrationId must be a valid UUID.",
        path: `${basePath}/migrationId`,
      }),
    );
  }

  if (typeof record.adapterId !== "string" || record.adapterId.trim().length === 0) {
    issues.push(
      createValidationIssue({
        code: "MIGRATION_RECORD_ADAPTER_ID_INVALID",
        severity: "error",
        message: "adapterId must be a non-empty string.",
        path: `${basePath}/adapterId`,
      }),
    );
  }

  if (typeof record.adapterVersion !== "string" || record.adapterVersion.trim().length === 0) {
    issues.push(
      createValidationIssue({
        code: "MIGRATION_RECORD_ADAPTER_VERSION_INVALID",
        severity: "error",
        message: "adapterVersion must be a non-empty string.",
        path: `${basePath}/adapterVersion`,
      }),
    );
  }

  if (typeof record.sourceVersion !== "string" || record.sourceVersion.trim().length === 0) {
    issues.push(
      createValidationIssue({
        code: "MIGRATION_RECORD_SOURCE_VERSION_INVALID",
        severity: "error",
        message: "sourceVersion must be a non-empty string.",
        path: `${basePath}/sourceVersion`,
      }),
    );
  }

  if (typeof record.targetVersion !== "string" || record.targetVersion.trim().length === 0) {
    issues.push(
      createValidationIssue({
        code: "MIGRATION_RECORD_TARGET_VERSION_INVALID",
        severity: "error",
        message: "targetVersion must be a non-empty string.",
        path: `${basePath}/targetVersion`,
      }),
    );
  }

  if (typeof record.recordedAt !== "string" || !isIso8601UtcTimestamp(record.recordedAt)) {
    issues.push(
      createValidationIssue({
        code: "MIGRATION_RECORD_RECORDED_AT_INVALID",
        severity: "error",
        message: "recordedAt must be an ISO-8601 UTC timestamp.",
        path: `${basePath}/recordedAt`,
      }),
    );
  }

  if (record.status !== "dry_run" && record.status !== "committed") {
    issues.push(
      createValidationIssue({
        code: "MIGRATION_RECORD_STATUS_INVALID",
        severity: "error",
        message: "status must be dry_run or committed.",
        path: `${basePath}/status`,
      }),
    );
  }

  if (!Array.isArray(record.diagnostics)) {
    issues.push(
      createValidationIssue({
        code: "MIGRATION_RECORD_DIAGNOSTICS_INVALID",
        severity: "error",
        message: "diagnostics must be an array.",
        path: `${basePath}/diagnostics`,
      }),
    );
  }

  if (!Array.isArray(record.idMappings)) {
    issues.push(
      createValidationIssue({
        code: "MIGRATION_RECORD_ID_MAPPINGS_INVALID",
        severity: "error",
        message: "idMappings must be an array.",
        path: `${basePath}/idMappings`,
      }),
    );
  } else {
    record.idMappings.forEach((mapping, index) => {
      issues.push(...validateIdMapping(mapping, `${basePath}/idMappings/${index}`));
    });
  }

  if (record.status === "committed") {
    if (!Array.isArray(record.targetRefs) || record.targetRefs.length === 0) {
      issues.push(
        createValidationIssue({
          code: "MIGRATION_RECORD_TARGET_REFS_REQUIRED",
          severity: "error",
          message: "Committed migration records require a non-empty targetRefs array.",
          path: `${basePath}/targetRefs`,
        }),
      );
    }
  }

  const targetRefResults =
    record.targetRefs === undefined
      ? createValidationResult([])
      : validateDocumentReferenceCollection(
          record.targetRefs,
          `${basePath}/targetRefs`,
          "engineering-project",
        );

  const candidateRefResults =
    record.candidateTargetRefs === undefined
      ? createValidationResult([])
      : validateDocumentReferenceCollection(
          record.candidateTargetRefs,
          `${basePath}/candidateTargetRefs`,
          "engineering-project",
        );

  return mergeValidationResults(
    createValidationResult(issues),
    validateSupportedContractVersion(MIGRATION_RECORD_SCHEMA_ID, record.schemaVersion, basePath),
    validateContentChecksum(record.sourceRawChecksum, `${basePath}/sourceRawChecksum`),
    validateContentChecksum(record.sourceContentChecksum, `${basePath}/sourceContentChecksum`),
    targetRefResults,
    candidateRefResults,
  );
}
