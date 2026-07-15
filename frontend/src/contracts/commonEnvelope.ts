import type { ContentChecksum } from "./contentChecksum";
import { validateContentChecksum } from "./contentChecksum";
import type { DocumentKind } from "./documentKind";
import { isDocumentKind } from "./documentKind";
import {
  validateDocumentReference,
  type DocumentReference,
} from "./documentReference";
import type { Extensions } from "./extensions";
import { validateExtensions } from "./extensions";
import {
  getContractVersionSupport,
  validateSupportedContractVersion,
} from "./contractVersionRegistry";
import type { Provenance } from "./provenance";
import { validateProvenance } from "./provenance";
import { isPositiveRevisionId } from "./revision";
import type { SchemaId, SchemaVersion } from "./schemaIdentity";
import { parseSchemaId } from "./schemaIdentity";
import { isValidUuid, type UuidString } from "./uuid";
import {
  createValidationIssue,
  createValidationResult,
  mergeValidationResults,
  type ValidationResult,
} from "./validation";

export interface CommonEnvelope {
  readonly schemaId: SchemaId;
  readonly schemaVersion: SchemaVersion;
  readonly documentId: UuidString;
  readonly documentKind: DocumentKind;
  readonly revisionId: number;
  readonly contentChecksum: ContentChecksum;
  readonly provenance: Provenance;
  readonly extensions?: Extensions;
  readonly unknownFieldStoreRef?: DocumentReference;
  readonly migrationProvenanceRef?: DocumentReference;
}

export interface ValidateCommonEnvelopeOptions {
  readonly fixedSchemaId?: SchemaId;
  readonly fixedDocumentKind?: DocumentKind;
}

export function validateCommonEnvelope(
  envelope: Partial<CommonEnvelope> | undefined,
  path = "",
  options: ValidateCommonEnvelopeOptions = {},
): ValidationResult {
  const basePath = path.length > 0 ? path : "";

  if (envelope === undefined) {
    return createValidationResult([
      createValidationIssue({
        code: "COMMON_ENVELOPE_MISSING",
        severity: "error",
        message: "Common envelope is required.",
        path: basePath,
      }),
    ]);
  }

  const issues = [];

  if (envelope.schemaId === undefined || typeof envelope.schemaId !== "string") {
    issues.push(
      createValidationIssue({
        code: "COMMON_ENVELOPE_SCHEMA_ID_MISSING",
        severity: "error",
        message: "schemaId is required.",
        path: `${basePath}/schemaId`,
      }),
    );
  } else {
    const parsedSchemaId = parseSchemaId(envelope.schemaId);
    if (parsedSchemaId === undefined) {
      issues.push(
        createValidationIssue({
          code: "COMMON_ENVELOPE_SCHEMA_ID_INVALID",
          severity: "error",
          message: "schemaId must be a non-empty string.",
          path: `${basePath}/schemaId`,
        }),
      );
    } else if (options.fixedSchemaId !== undefined && parsedSchemaId !== options.fixedSchemaId) {
      issues.push(
        createValidationIssue({
          code: "COMMON_ENVELOPE_SCHEMA_ID_MISMATCH",
          severity: "error",
          message: `schemaId must be "${options.fixedSchemaId}".`,
          path: `${basePath}/schemaId`,
        }),
      );
    } else if (getContractVersionSupport(parsedSchemaId) === undefined) {
      issues.push(
        createValidationIssue({
          code: "COMMON_ENVELOPE_SCHEMA_ID_UNKNOWN",
          severity: "error",
          message: "schemaId is not registered in the contract version support matrix.",
          path: `${basePath}/schemaId`,
        }),
      );
    }
  }

  if (
    envelope.documentKind === undefined ||
    typeof envelope.documentKind !== "string" ||
    !isDocumentKind(envelope.documentKind)
  ) {
    issues.push(
      createValidationIssue({
        code: "COMMON_ENVELOPE_DOCUMENT_KIND_INVALID",
        severity: "error",
        message: "documentKind must be a supported document kind.",
        path: `${basePath}/documentKind`,
      }),
    );
  } else if (
    options.fixedDocumentKind !== undefined &&
    envelope.documentKind !== options.fixedDocumentKind
  ) {
    issues.push(
      createValidationIssue({
        code: "COMMON_ENVELOPE_DOCUMENT_KIND_MISMATCH",
        severity: "error",
        message: `documentKind must be "${options.fixedDocumentKind}".`,
        path: `${basePath}/documentKind`,
      }),
    );
  }

  if (typeof envelope.documentId !== "string" || !isValidUuid(envelope.documentId)) {
    issues.push(
      createValidationIssue({
        code: "COMMON_ENVELOPE_DOCUMENT_ID_INVALID",
        severity: "error",
        message: "documentId must be a valid UUID.",
        path: `${basePath}/documentId`,
      }),
    );
  }

  return mergeValidationResults(
    createValidationResult(issues),
    validateSupportedContractVersion(envelope.schemaId, envelope.schemaVersion, basePath),
    validateContentChecksum(envelope.contentChecksum, `${basePath}/contentChecksum`),
    validateProvenance(envelope.provenance, `${basePath}/provenance`),
    validateExtensions(envelope.extensions, `${basePath}/extensions`),
    createValidationResult(
      isPositiveRevisionId(envelope.revisionId)
        ? []
        : [
            createValidationIssue({
              code: "COMMON_ENVELOPE_REVISION_INVALID",
              severity: "error",
              message: "revisionId must be a positive integer.",
              path: `${basePath}/revisionId`,
            }),
          ],
    ),
    envelope.unknownFieldStoreRef === undefined
      ? createValidationResult([])
      : validateDocumentReference(
          envelope.unknownFieldStoreRef,
          `${basePath}/unknownFieldStoreRef`,
          "unknown-field-store",
        ),
    envelope.migrationProvenanceRef === undefined
      ? createValidationResult([])
      : validateDocumentReference(
          envelope.migrationProvenanceRef,
          `${basePath}/migrationProvenanceRef`,
          "migration-record",
        ),
  );
}
