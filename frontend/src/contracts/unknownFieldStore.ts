import type { ContentChecksum } from "./contentChecksum";
import { validateContentChecksum } from "./contentChecksum";
import type { ImmutableResourceReference } from "./immutableResourceReference";
import { validateImmutableResourceReference } from "./immutableResourceReference";
import {
  UNKNOWN_FIELD_STORE_SCHEMA_ID,
  validateSupportedContractVersion,
} from "./contractVersionRegistry";
import type { SchemaId, SchemaVersion } from "./schemaIdentity";
import { isValidUuid, type UuidString } from "./uuid";
import {
  createValidationIssue,
  createValidationResult,
  mergeValidationResults,
  type ValidationIssue,
  type ValidationResult,
} from "./validation";

export const UNKNOWN_FIELD_STORE_DOCUMENT_KIND = "unknown-field-store" as const;

export type UnknownFieldCriticality = "critical" | "optional" | "informational";

export type SourceVersionClassification =
  | "exact_supported"
  | "same_major_future_minor"
  | "supported_older"
  | "supported_legacy"
  | "unsupported_future_major"
  | "missing_or_invalid";

const SOURCE_VERSION_CLASSIFICATIONS: readonly SourceVersionClassification[] = [
  "exact_supported",
  "same_major_future_minor",
  "supported_older",
  "supported_legacy",
  "unsupported_future_major",
  "missing_or_invalid",
];

const SOURCE_VERSION_REQUIRED_CLASSIFICATIONS: readonly SourceVersionClassification[] = [
  "exact_supported",
  "same_major_future_minor",
  "supported_older",
  "supported_legacy",
];

export interface UnknownFieldEntry {
  readonly jsonPointer: string;
  readonly sourcePointer?: string;
  readonly criticality: UnknownFieldCriticality;
  readonly rawPayloadRef: ImmutableResourceReference;
}

export interface UnknownFieldCollisionRecord {
  readonly jsonPointer: string;
  readonly knownFieldPath: string;
  readonly rawPayloadRef: ImmutableResourceReference;
}

export interface UnknownFieldStore {
  readonly schemaId: SchemaId;
  readonly schemaVersion: SchemaVersion;
  readonly documentKind: typeof UNKNOWN_FIELD_STORE_DOCUMENT_KIND;
  readonly storeId: UuidString;
  readonly sourceRawChecksum: ContentChecksum;
  readonly sourceVersionClassification: SourceVersionClassification;
  readonly sourceVersion?: string;
  readonly entries: readonly UnknownFieldEntry[];
  readonly rawPayloadRef?: ImmutableResourceReference;
  readonly collisionRecords?: readonly UnknownFieldCollisionRecord[];
}

const JSON_POINTER_PATTERN = /^(\/([^/~]|~0|~1)*)*$/;

function isValidJsonPointer(value: string): boolean {
  return JSON_POINTER_PATTERN.test(value);
}

function isSourceVersionClassification(
  value: unknown,
): value is SourceVersionClassification {
  return (
    typeof value === "string" &&
    SOURCE_VERSION_CLASSIFICATIONS.includes(value as SourceVersionClassification)
  );
}

function validateUnknownFieldEntry(
  entry: Partial<UnknownFieldEntry> | undefined,
  entryPath: string,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (entry === undefined) {
    issues.push(
      createValidationIssue({
        code: "UNKNOWN_FIELD_ENTRY_MISSING",
        severity: "error",
        message: "Unknown field entry is required.",
        path: entryPath,
      }),
    );
    return issues;
  }

  if (typeof entry.jsonPointer !== "string" || !isValidJsonPointer(entry.jsonPointer)) {
    issues.push(
      createValidationIssue({
        code: "UNKNOWN_FIELD_ENTRY_POINTER_INVALID",
        severity: "error",
        message: "jsonPointer must be a valid JSON Pointer.",
        path: `${entryPath}/jsonPointer`,
      }),
    );
  }

  if (
    entry.sourcePointer !== undefined &&
    (typeof entry.sourcePointer !== "string" || !isValidJsonPointer(entry.sourcePointer))
  ) {
    issues.push(
      createValidationIssue({
        code: "UNKNOWN_FIELD_ENTRY_SOURCE_POINTER_INVALID",
        severity: "error",
        message: "sourcePointer must be a valid JSON Pointer when provided.",
        path: `${entryPath}/sourcePointer`,
      }),
    );
  }

  if (
    entry.criticality !== "critical" &&
    entry.criticality !== "optional" &&
    entry.criticality !== "informational"
  ) {
    issues.push(
      createValidationIssue({
        code: "UNKNOWN_FIELD_ENTRY_CRITICALITY_INVALID",
        severity: "error",
        message: "criticality must be critical, optional, or informational.",
        path: `${entryPath}/criticality`,
      }),
    );
  }

  issues.push(
    ...validateImmutableResourceReference(entry.rawPayloadRef, `${entryPath}/rawPayloadRef`).issues,
  );

  return issues;
}

function validateCollisionRecord(
  record: Partial<UnknownFieldCollisionRecord> | undefined,
  recordPath: string,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (record === undefined) {
    issues.push(
      createValidationIssue({
        code: "UNKNOWN_FIELD_COLLISION_RECORD_MISSING",
        severity: "error",
        message: "Collision record is required.",
        path: recordPath,
      }),
    );
    return issues;
  }

  if (typeof record.jsonPointer !== "string" || !isValidJsonPointer(record.jsonPointer)) {
    issues.push(
      createValidationIssue({
        code: "UNKNOWN_FIELD_COLLISION_POINTER_INVALID",
        severity: "error",
        message: "jsonPointer must be a valid JSON Pointer.",
        path: `${recordPath}/jsonPointer`,
      }),
    );
  }

  if (typeof record.knownFieldPath !== "string" || record.knownFieldPath.trim().length === 0) {
    issues.push(
      createValidationIssue({
        code: "UNKNOWN_FIELD_COLLISION_KNOWN_PATH_INVALID",
        severity: "error",
        message: "knownFieldPath must be a non-empty string.",
        path: `${recordPath}/knownFieldPath`,
      }),
    );
  }

  issues.push(
    ...validateImmutableResourceReference(record.rawPayloadRef, `${recordPath}/rawPayloadRef`).issues,
  );

  return issues;
}

export function validateUnknownFieldStore(
  store: Partial<UnknownFieldStore> | undefined,
  path = "",
): ValidationResult {
  const basePath = path.length > 0 ? path : "";

  if (store === undefined) {
    return createValidationResult([
      createValidationIssue({
        code: "UNKNOWN_FIELD_STORE_MISSING",
        severity: "error",
        message: "UnknownFieldStore is required.",
        path: basePath,
      }),
    ]);
  }

  const issues: ValidationIssue[] = [];

  if (store.schemaId !== UNKNOWN_FIELD_STORE_SCHEMA_ID) {
    issues.push(
      createValidationIssue({
        code: "UNKNOWN_FIELD_STORE_SCHEMA_ID_INVALID",
        severity: "error",
        message: `schemaId must be "${UNKNOWN_FIELD_STORE_SCHEMA_ID}".`,
        path: `${basePath}/schemaId`,
      }),
    );
  }

  if (store.documentKind !== UNKNOWN_FIELD_STORE_DOCUMENT_KIND) {
    issues.push(
      createValidationIssue({
        code: "UNKNOWN_FIELD_STORE_DOCUMENT_KIND_INVALID",
        severity: "error",
        message: `documentKind must be "${UNKNOWN_FIELD_STORE_DOCUMENT_KIND}".`,
        path: `${basePath}/documentKind`,
      }),
    );
  }

  if (typeof store.storeId !== "string" || !isValidUuid(store.storeId)) {
    issues.push(
      createValidationIssue({
        code: "UNKNOWN_FIELD_STORE_ID_INVALID",
        severity: "error",
        message: "storeId must be a valid UUID.",
        path: `${basePath}/storeId`,
      }),
    );
  }

  if (!isSourceVersionClassification(store.sourceVersionClassification)) {
    issues.push(
      createValidationIssue({
        code: "UNKNOWN_FIELD_STORE_SOURCE_VERSION_CLASSIFICATION_INVALID",
        severity: "error",
        message: "sourceVersionClassification must be a supported classification value.",
        path: `${basePath}/sourceVersionClassification`,
      }),
    );
  } else if (
    SOURCE_VERSION_REQUIRED_CLASSIFICATIONS.includes(store.sourceVersionClassification) &&
    (typeof store.sourceVersion !== "string" || store.sourceVersion.trim().length === 0)
  ) {
    issues.push(
      createValidationIssue({
        code: "UNKNOWN_FIELD_STORE_SOURCE_VERSION_REQUIRED",
        severity: "error",
        message: "sourceVersion is required for the selected sourceVersionClassification.",
        path: `${basePath}/sourceVersion`,
      }),
    );
  }

  if (!Array.isArray(store.entries)) {
    issues.push(
      createValidationIssue({
        code: "UNKNOWN_FIELD_STORE_ENTRIES_INVALID",
        severity: "error",
        message: "entries must be an array.",
        path: `${basePath}/entries`,
      }),
    );
  } else {
    const seenPointers = new Set<string>();
    let hasCriticalEntry = false;

    store.entries.forEach((entry, index) => {
      const entryPath = `${basePath}/entries/${index}`;
      issues.push(...validateUnknownFieldEntry(entry, entryPath));

      if (typeof entry.jsonPointer === "string" && isValidJsonPointer(entry.jsonPointer)) {
        if (seenPointers.has(entry.jsonPointer)) {
          issues.push(
            createValidationIssue({
              code: "UNKNOWN_FIELD_ENTRY_POINTER_DUPLICATE",
              severity: "error",
              message: "Duplicate jsonPointer values in entries are prohibited.",
              path: `${entryPath}/jsonPointer`,
            }),
          );
        } else {
          seenPointers.add(entry.jsonPointer);
        }
      }

      if (entry.criticality === "critical") {
        hasCriticalEntry = true;
      }
    });

    if (Array.isArray(store.collisionRecords)) {
      const seenCollisionPointers = new Set<string>();
      store.collisionRecords.forEach((record, index) => {
        const recordPath = `${basePath}/collisionRecords/${index}`;
        issues.push(...validateCollisionRecord(record, recordPath));

        if (typeof record.jsonPointer === "string" && isValidJsonPointer(record.jsonPointer)) {
          if (seenCollisionPointers.has(record.jsonPointer)) {
            issues.push(
              createValidationIssue({
                code: "UNKNOWN_FIELD_COLLISION_POINTER_DUPLICATE",
                severity: "error",
                message: "Duplicate jsonPointer values in collisionRecords are prohibited.",
                path: `${recordPath}/jsonPointer`,
              }),
            );
          } else {
            seenCollisionPointers.add(record.jsonPointer);
          }

          if (hasCriticalEntry && seenPointers.has(record.jsonPointer)) {
            issues.push(
              createValidationIssue({
                code: "UNKNOWN_FIELD_CRITICAL_COLLISION_BLOCKS_APPLY",
                severity: "error",
                message:
                  "Critical unknown fields with collision records block apply until resolved.",
                path: recordPath,
              }),
            );
          }
        }
      });
    }
  }

  if (store.rawPayloadRef !== undefined) {
    issues.push(
      ...validateImmutableResourceReference(store.rawPayloadRef, `${basePath}/rawPayloadRef`).issues,
    );
  }

  return mergeValidationResults(
    createValidationResult(issues),
    validateSupportedContractVersion(
      UNKNOWN_FIELD_STORE_SCHEMA_ID,
      store.schemaVersion,
      basePath,
    ),
    validateContentChecksum(store.sourceRawChecksum, `${basePath}/sourceRawChecksum`),
  );
}
