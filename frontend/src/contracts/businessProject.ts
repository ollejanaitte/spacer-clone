import type { ContentChecksum } from "./contentChecksum";
import { contentChecksumsEqual } from "./contentChecksum";
import {
  ENGINEERING_PROJECT_SCHEMA_ID,
} from "./contractVersionRegistry";
import type { DocumentReference } from "./documentReference";
import { validateDocumentReference } from "./documentReference";
import { validateDocumentReferenceCollection } from "./documentReference";
import type { Extensions } from "./extensions";
import { validateExtensions } from "./extensions";
import type { Provenance } from "./provenance";
import { validateProvenance } from "./provenance";
import type { RevisionId, RevisionMetadata } from "./revision";
import { isPositiveRevisionId, validateRevisionMetadata } from "./revision";
import type { SchemaId, SchemaVersion } from "./schemaIdentity";
import { isSemVerString, requireSchemaVersion } from "./schemaIdentity";
import type { UuidString } from "./uuid";
import { isValidUuid } from "./uuid";
import {
  createValidationIssue,
  createValidationResult,
  mergeValidationResults,
  type ValidationResult,
} from "./validation";

export const BUSINESS_PROJECT_DOCUMENT_KIND = "engineering-project" as const;

export const BUSINESS_PROJECT_DESIGN_STAGES = [
  "road_design",
  "superstructure",
  "substructure",
  "analysis",
  "complete",
] as const;

export type BusinessProjectDesignStage = (typeof BUSINESS_PROJECT_DESIGN_STAGES)[number];

export const BUSINESS_PROJECT_STATUSES = ["active", "sealed", "archived", "draft"] as const;

export type BusinessProjectStatus = (typeof BUSINESS_PROJECT_STATUSES)[number];

export interface BusinessProjectRef extends DocumentReference {
  readonly uri: string;
}

export interface BusinessProjectManifest {
  readonly schemaId: SchemaId;
  readonly schemaVersion: SchemaVersion;
  readonly documentKind: typeof BUSINESS_PROJECT_DOCUMENT_KIND;
  readonly documentId: UuidString;
  readonly revisionId: RevisionId;
  readonly contentChecksum: ContentChecksum;
  readonly provenance: Provenance;
  readonly projectId: UuidString;
  readonly projectNumber: string;
  readonly projectName: string;
  readonly designStage: BusinessProjectDesignStage;
  readonly projectStatus: BusinessProjectStatus;
  readonly coordinateReference: DocumentReference | null;
  readonly roadRefs: readonly BusinessProjectRef[];
  readonly bridgeProjectRefs: readonly BusinessProjectRef[];
  readonly analysisRefs: readonly BusinessProjectRef[];
  readonly sharedDatasetRefs: readonly BusinessProjectRef[];
  readonly deliverableRefs: readonly BusinessProjectRef[];
  readonly projectRevisionMetadata: RevisionMetadata;
  readonly status: {
    readonly phase: string;
    readonly sections: Readonly<Record<string, string>>;
  };
  readonly migrationProvenanceRef: DocumentReference | null;
  readonly extensions?: Extensions;
  readonly unknownFieldStoreRef?: DocumentReference;
}

export function isBusinessProjectDesignStage(value: string): value is BusinessProjectDesignStage {
  return (BUSINESS_PROJECT_DESIGN_STAGES as readonly string[]).includes(value);
}

export function isBusinessProjectStatus(value: string): value is BusinessProjectStatus {
  return (BUSINESS_PROJECT_STATUSES as readonly string[]).includes(value);
}

function validateBusinessProjectRefCollection(
  refs: readonly BusinessProjectRef[] | undefined,
  path: string,
): ValidationResult {
  if (refs === undefined) {
    return createValidationResult([
      createValidationIssue({
        code: "BUSINESS_PROJECT_REFS_MISSING",
        severity: "error",
        message: "BusinessProject refs array is required.",
        path,
      }),
    ]);
  }
  const issues = [];
  for (let index = 0; index < refs.length; index += 1) {
    const ref = refs[index]!;
    if (typeof ref.uri !== "string" || ref.uri.trim().length === 0) {
      issues.push(
        createValidationIssue({
          code: "BUSINESS_PROJECT_REF_URI_INVALID",
          severity: "error",
          message: "BusinessProject child ref uri must be a non-empty relative path.",
          path: `${path}/${index}/uri`,
        }),
      );
    }
  }
  return createValidationResult(issues);
}

function validateBusinessProjectRevisionConsistency(
  manifest: Partial<BusinessProjectManifest>,
  basePath: string,
): ValidationResult {
  const issues = [];
  if (
    manifest.documentId !== undefined &&
    manifest.projectId !== undefined &&
    manifest.documentId !== manifest.projectId
  ) {
    issues.push(
      createValidationIssue({
        code: "BUSINESS_PROJECT_DOCUMENT_ID_PROJECT_ID_MISMATCH",
        severity: "error",
        message: "documentId must equal projectId.",
        path: `${basePath}/documentId`,
      }),
    );
  }
  if (
    manifest.revisionId !== undefined &&
    manifest.projectRevisionMetadata !== undefined &&
    manifest.projectRevisionMetadata.revisionId !== undefined &&
    manifest.revisionId !== manifest.projectRevisionMetadata.revisionId
  ) {
    issues.push(
      createValidationIssue({
        code: "BUSINESS_PROJECT_REVISION_ID_MISMATCH",
        severity: "error",
        message: "revisionId must match projectRevisionMetadata.revisionId.",
        path: `${basePath}/projectRevisionMetadata/revisionId`,
      }),
    );
  }
  if (
    manifest.contentChecksum !== undefined &&
    manifest.projectRevisionMetadata !== undefined &&
    manifest.projectRevisionMetadata.contentChecksum !== undefined &&
    !contentChecksumsEqual(manifest.contentChecksum, manifest.projectRevisionMetadata.contentChecksum)
  ) {
    issues.push(
      createValidationIssue({
        code: "BUSINESS_PROJECT_REVISION_CHECKSUM_MISMATCH",
        severity: "error",
        message: "contentChecksum must match projectRevisionMetadata.contentChecksum.",
        path: `${basePath}/projectRevisionMetadata/contentChecksum`,
      }),
    );
  }
  return createValidationResult(issues);
}

export function validateBusinessProjectManifest(
  manifest: Partial<BusinessProjectManifest> | undefined,
  path = "",
): ValidationResult {
  const basePath = path.length > 0 ? path : "";

  if (manifest === undefined) {
    return createValidationResult([
      createValidationIssue({
        code: "BUSINESS_PROJECT_MANIFEST_MISSING",
        severity: "error",
        message: "BusinessProject manifest is required.",
        path: basePath,
      }),
    ]);
  }

  const issues = [];

  if (manifest.schemaId !== ENGINEERING_PROJECT_SCHEMA_ID) {
    issues.push(
      createValidationIssue({
        code: "BUSINESS_PROJECT_SCHEMA_ID_INVALID",
        severity: "error",
        message: `schemaId must be "${ENGINEERING_PROJECT_SCHEMA_ID}".`,
        path: `${basePath}/schemaId`,
      }),
    );
  }

  if (manifest.schemaVersion === undefined || !isSemVerString(manifest.schemaVersion)) {
    issues.push(
      createValidationIssue({
        code: "BUSINESS_PROJECT_SCHEMA_VERSION_INVALID",
        severity: "error",
        message: "schemaVersion must be a valid SemVer string.",
        path: `${basePath}/schemaVersion`,
      }),
    );
  } else if (manifest.schemaVersion !== BUSINESS_PROJECT_SCHEMA_VERSION) {
    issues.push(
      createValidationIssue({
        code: "BUSINESS_PROJECT_SCHEMA_VERSION_UNSUPPORTED",
        severity: "error",
        message: `BusinessProject manifest requires schemaVersion "${BUSINESS_PROJECT_SCHEMA_VERSION}".`,
        path: `${basePath}/schemaVersion`,
      }),
    );
  }

  if (manifest.documentKind !== BUSINESS_PROJECT_DOCUMENT_KIND) {
    issues.push(
      createValidationIssue({
        code: "BUSINESS_PROJECT_DOCUMENT_KIND_INVALID",
        severity: "error",
        message: `documentKind must be "${BUSINESS_PROJECT_DOCUMENT_KIND}".`,
        path: `${basePath}/documentKind`,
      }),
    );
  }

  if (typeof manifest.documentId !== "string" || !isValidUuid(manifest.documentId)) {
    issues.push(
      createValidationIssue({
        code: "BUSINESS_PROJECT_DOCUMENT_ID_INVALID",
        severity: "error",
        message: "documentId must be a valid UUID.",
        path: `${basePath}/documentId`,
      }),
    );
  }

  if (typeof manifest.projectId !== "string" || !isValidUuid(manifest.projectId)) {
    issues.push(
      createValidationIssue({
        code: "BUSINESS_PROJECT_PROJECT_ID_INVALID",
        severity: "error",
        message: "projectId must be a valid UUID.",
        path: `${basePath}/projectId`,
      }),
    );
  }

  if (!isPositiveRevisionId(manifest.revisionId)) {
    issues.push(
      createValidationIssue({
        code: "BUSINESS_PROJECT_REVISION_INVALID",
        severity: "error",
        message: "revisionId must be a positive integer.",
        path: `${basePath}/revisionId`,
      }),
    );
  }

  if (typeof manifest.projectNumber !== "string" || manifest.projectNumber.trim().length === 0) {
    issues.push(
      createValidationIssue({
        code: "BUSINESS_PROJECT_NUMBER_INVALID",
        severity: "error",
        message: "projectNumber must be a non-empty string.",
        path: `${basePath}/projectNumber`,
      }),
    );
  }

  if (typeof manifest.projectName !== "string" || manifest.projectName.trim().length === 0) {
    issues.push(
      createValidationIssue({
        code: "BUSINESS_PROJECT_NAME_INVALID",
        severity: "error",
        message: "projectName must be a non-empty string.",
        path: `${basePath}/projectName`,
      }),
    );
  }

  if (manifest.designStage === undefined || !isBusinessProjectDesignStage(manifest.designStage)) {
    issues.push(
      createValidationIssue({
        code: "BUSINESS_PROJECT_DESIGN_STAGE_INVALID",
        severity: "error",
        message: "designStage must be one of the allowed BusinessProject stages.",
        path: `${basePath}/designStage`,
      }),
    );
  }

  if (manifest.projectStatus === undefined || !isBusinessProjectStatus(manifest.projectStatus)) {
    issues.push(
      createValidationIssue({
        code: "BUSINESS_PROJECT_STATUS_INVALID",
        severity: "error",
        message: "projectStatus must be one of the allowed BusinessProject statuses.",
        path: `${basePath}/projectStatus`,
      }),
    );
  }

  if (manifest.status === undefined || typeof manifest.status.phase !== "string") {
    issues.push(
      createValidationIssue({
        code: "BUSINESS_PROJECT_STATUS_SECTIONS_INVALID",
        severity: "error",
        message: "status.phase must be a string.",
        path: `${basePath}/status`,
      }),
    );
  }

  return mergeValidationResults(
    createValidationResult(issues),
    validateBusinessProjectRefCollection(manifest.roadRefs, `${basePath}/roadRefs`),
    validateBusinessProjectRefCollection(manifest.bridgeProjectRefs, `${basePath}/bridgeProjectRefs`),
    validateBusinessProjectRefCollection(manifest.analysisRefs, `${basePath}/analysisRefs`),
    validateBusinessProjectRefCollection(manifest.sharedDatasetRefs, `${basePath}/sharedDatasetRefs`),
    validateBusinessProjectRefCollection(manifest.deliverableRefs, `${basePath}/deliverableRefs`),
    validateDocumentReferenceCollection(
      manifest.roadRefs as readonly DocumentReference[] | undefined,
      `${basePath}/roadRefs`,
      "road-design",
    ),
    validateDocumentReferenceCollection(
      manifest.bridgeProjectRefs as readonly DocumentReference[] | undefined,
      `${basePath}/bridgeProjectRefs`,
      "bridge-project",
    ),
    validateDocumentReferenceCollection(
      manifest.analysisRefs as readonly DocumentReference[] | undefined,
      `${basePath}/analysisRefs`,
      "bridge-frame-analysis",
    ),
    manifest.coordinateReference === null || manifest.coordinateReference === undefined
      ? createValidationResult([])
      : validateDocumentReference(
          manifest.coordinateReference,
          `${basePath}/coordinateReference`,
          "coordinate-context",
        ),
    manifest.migrationProvenanceRef === null || manifest.migrationProvenanceRef === undefined
      ? createValidationResult([])
      : validateDocumentReference(
          manifest.migrationProvenanceRef,
          `${basePath}/migrationProvenanceRef`,
          "migration-record",
        ),
    validateProvenance(manifest.provenance, `${basePath}/provenance`),
    validateRevisionMetadata(manifest.projectRevisionMetadata, `${basePath}/projectRevisionMetadata`),
    validateExtensions(manifest.extensions, `${basePath}/extensions`),
    validateBusinessProjectRevisionConsistency(manifest, basePath),
  );
}

export function createEmptyBusinessProjectRefs(): {
  readonly roadRefs: readonly BusinessProjectRef[];
  readonly bridgeProjectRefs: readonly BusinessProjectRef[];
  readonly analysisRefs: readonly BusinessProjectRef[];
  readonly sharedDatasetRefs: readonly BusinessProjectRef[];
  readonly deliverableRefs: readonly BusinessProjectRef[];
} {
  return {
    roadRefs: [],
    bridgeProjectRefs: [],
    analysisRefs: [],
    sharedDatasetRefs: [],
    deliverableRefs: [],
  };
}

export const BUSINESS_PROJECT_SCHEMA_VERSION = requireSchemaVersion("0.2.0");
