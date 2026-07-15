import type { ContentChecksum } from "./contentChecksum";
import {
  contentChecksumsEqual,
  validateContentChecksum,
} from "./contentChecksum";
import {
  ENGINEERING_PROJECT_SCHEMA_ID,
  validateSupportedContractVersion,
} from "./contractVersionRegistry";
import {
  validateDocumentReference,
  validateDocumentReferenceCollection,
  type DocumentReference,
} from "./documentReference";
import type { Extensions } from "./extensions";
import type { Provenance } from "./provenance";
import {
  validateRevisionMetadata,
  type RevisionId,
  type RevisionMetadata,
} from "./revision";
import type { SchemaId, SchemaVersion } from "./schemaIdentity";
import type { UuidString } from "./uuid";
import { isValidUuid } from "./uuid";
import { validateExtensions } from "./extensions";
import { validateProvenance } from "./provenance";
import { isPositiveRevisionId } from "./revision";
import {
  createValidationIssue,
  createValidationResult,
  mergeValidationResults,
  type ValidationResult,
} from "./validation";

export const ENGINEERING_PROJECT_DOCUMENT_KIND = "engineering-project" as const;

export interface EngineeringProject {
  readonly schemaId: SchemaId;
  readonly schemaVersion: SchemaVersion;
  readonly documentKind: typeof ENGINEERING_PROJECT_DOCUMENT_KIND;
  readonly projectId: UuidString;
  readonly revisionId: RevisionId;
  readonly contentChecksum: ContentChecksum;
  readonly provenance: Provenance;
  readonly name: string;
  readonly roadDesignRef: DocumentReference | null;
  readonly frameAnalysisRefs: readonly DocumentReference[];
  readonly transferRecordRefs: readonly DocumentReference[];
  readonly projectRevisionMetadata: RevisionMetadata;
  readonly extensions?: Extensions;
  readonly unknownFieldStoreRef?: DocumentReference;
  readonly migrationProvenanceRef?: DocumentReference;
}

const FORBIDDEN_EMBEDDED_PAYLOAD_KEYS = [
  "roadDesign",
  "frameAnalysis",
  "frameAnalyses",
  "transferRecord",
  "transferRecords",
  "transferPackage",
  "viewerState",
  "solverResult",
  "solverResults",
  "analysisResult",
  "analysisResults",
  "model",
  "structuralModel",
  "alignments",
  "loadCases",
] as const;

export function detectForbiddenEmbeddedPayloadKeys(value: unknown): readonly string[] {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return [];
  }

  const record = value as Record<string, unknown>;
  return FORBIDDEN_EMBEDDED_PAYLOAD_KEYS.filter((key) => key in record);
}

function validateProjectRevisionMetadataConsistency(
  project: Partial<EngineeringProject>,
  basePath: string,
): ValidationResult {
  const metadata = project.projectRevisionMetadata;
  if (metadata === undefined) {
    return createValidationResult([]);
  }

  const issues = [];

  if (
    project.projectId !== undefined &&
    metadata.documentId !== undefined &&
    project.projectId !== metadata.documentId
  ) {
    issues.push(
      createValidationIssue({
        code: "ENGINEERING_PROJECT_REVISION_DOCUMENT_ID_MISMATCH",
        severity: "error",
        message: "projectId must match projectRevisionMetadata.documentId.",
        path: `${basePath}/projectRevisionMetadata/documentId`,
      }),
    );
  }

  if (
    project.revisionId !== undefined &&
    metadata.revisionId !== undefined &&
    project.revisionId !== metadata.revisionId
  ) {
    issues.push(
      createValidationIssue({
        code: "ENGINEERING_PROJECT_REVISION_ID_MISMATCH",
        severity: "error",
        message: "revisionId must match projectRevisionMetadata.revisionId.",
        path: `${basePath}/projectRevisionMetadata/revisionId`,
      }),
    );
  }

  if (
    project.contentChecksum !== undefined &&
    metadata.contentChecksum !== undefined &&
    !contentChecksumsEqual(project.contentChecksum, metadata.contentChecksum)
  ) {
    issues.push(
      createValidationIssue({
        code: "ENGINEERING_PROJECT_REVISION_CHECKSUM_MISMATCH",
        severity: "error",
        message: "contentChecksum must match projectRevisionMetadata.contentChecksum.",
        path: `${basePath}/projectRevisionMetadata/contentChecksum`,
      }),
    );
  }

  return createValidationResult(issues);
}

export function validateEngineeringProject(
  project: Partial<EngineeringProject> | undefined,
  path = "",
): ValidationResult {
  const basePath = path.length > 0 ? path : "";

  if (project === undefined) {
    return createValidationResult([
      createValidationIssue({
        code: "ENGINEERING_PROJECT_MISSING",
        severity: "error",
        message: "EngineeringProject is required.",
        path: basePath,
      }),
    ]);
  }

  const issues = [];

  if (project.schemaId !== ENGINEERING_PROJECT_SCHEMA_ID) {
    issues.push(
      createValidationIssue({
        code: "ENGINEERING_PROJECT_SCHEMA_ID_INVALID",
        severity: "error",
        message: `schemaId must be "${ENGINEERING_PROJECT_SCHEMA_ID}".`,
        path: `${basePath}/schemaId`,
      }),
    );
  }

  if (project.documentKind !== ENGINEERING_PROJECT_DOCUMENT_KIND) {
    issues.push(
      createValidationIssue({
        code: "ENGINEERING_PROJECT_DOCUMENT_KIND_INVALID",
        severity: "error",
        message: `documentKind must be "${ENGINEERING_PROJECT_DOCUMENT_KIND}".`,
        path: `${basePath}/documentKind`,
      }),
    );
  }

  if (typeof project.projectId !== "string" || !isValidUuid(project.projectId)) {
    issues.push(
      createValidationIssue({
        code: "ENGINEERING_PROJECT_ID_INVALID",
        severity: "error",
        message: "projectId must be a valid UUID.",
        path: `${basePath}/projectId`,
      }),
    );
  }

  if (typeof project.name !== "string" || project.name.trim().length === 0) {
    issues.push(
      createValidationIssue({
        code: "ENGINEERING_PROJECT_NAME_INVALID",
        severity: "error",
        message: "name must be a non-empty string.",
        path: `${basePath}/name`,
      }),
    );
  }

  if (!isPositiveRevisionId(project.revisionId)) {
    issues.push(
      createValidationIssue({
        code: "ENGINEERING_PROJECT_REVISION_INVALID",
        severity: "error",
        message: "revisionId must be a positive integer.",
        path: `${basePath}/revisionId`,
      }),
    );
  }

  const forbiddenKeys = detectForbiddenEmbeddedPayloadKeys(project);
  forbiddenKeys.forEach((key) => {
    issues.push(
      createValidationIssue({
        code: "ENGINEERING_PROJECT_EMBEDDED_PAYLOAD_FORBIDDEN",
        severity: "error",
        message: `Embedded domain payload field "${key}" is prohibited on EngineeringProject.`,
        path: `${basePath}/${key}`,
      }),
    );
  });

  return mergeValidationResults(
    createValidationResult(issues),
    validateSupportedContractVersion(
      ENGINEERING_PROJECT_SCHEMA_ID,
      project.schemaVersion,
      basePath,
    ),
    validateContentChecksum(project.contentChecksum, `${basePath}/contentChecksum`),
    validateProvenance(project.provenance, `${basePath}/provenance`),
    validateExtensions(project.extensions, `${basePath}/extensions`),
    validateRevisionMetadata(project.projectRevisionMetadata, `${basePath}/projectRevisionMetadata`),
    validateProjectRevisionMetadataConsistency(project, basePath),
    validateDocumentReferenceCollection(
      project.frameAnalysisRefs,
      `${basePath}/frameAnalysisRefs`,
      "bridge-frame-analysis",
    ),
    validateDocumentReferenceCollection(
      project.transferRecordRefs,
      `${basePath}/transferRecordRefs`,
      "transfer-record",
    ),
    project.roadDesignRef === null
      ? createValidationResult([])
      : project.roadDesignRef === undefined
        ? createValidationResult([
            createValidationIssue({
              code: "ENGINEERING_PROJECT_ROAD_DESIGN_REF_MISSING",
              severity: "error",
              message: "roadDesignRef must be present and nullable.",
              path: `${basePath}/roadDesignRef`,
            }),
          ])
        : validateDocumentReference(
            project.roadDesignRef,
            `${basePath}/roadDesignRef`,
            "road-design",
          ),
    project.unknownFieldStoreRef === undefined
      ? createValidationResult([])
      : validateDocumentReference(
          project.unknownFieldStoreRef,
          `${basePath}/unknownFieldStoreRef`,
          "unknown-field-store",
        ),
    project.migrationProvenanceRef === undefined
      ? createValidationResult([])
      : validateDocumentReference(
          project.migrationProvenanceRef,
          `${basePath}/migrationProvenanceRef`,
          "migration-record",
        ),
  );
}
