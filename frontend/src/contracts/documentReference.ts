import type { DocumentKind } from "./documentKind";
import { isDocumentKind } from "./documentKind";
import type { RevisionId } from "./revision";
import { isPositiveRevisionId } from "./revision";
import type { UuidString } from "./uuid";
import { isValidUuid } from "./uuid";
import {
  validateContentChecksum,
  type ContentChecksum,
} from "./contentChecksum";
import {
  createValidationIssue,
  createValidationResult,
  type ValidationIssue,
  type ValidationResult,
} from "./validation";

export interface DocumentReference {
  readonly documentKind: DocumentKind;
  readonly documentId: UuidString;
  readonly revisionId: RevisionId;
  readonly contentChecksum: ContentChecksum;
  readonly uri?: string;
  readonly embeddedResourceKey?: string;
  readonly mediaType?: string;
}

export type DocumentReferenceIdentity = `${DocumentKind}:${UuidString}:${number}`;

export function documentReferenceIdentity(ref: DocumentReference): DocumentReferenceIdentity {
  return `${ref.documentKind}:${ref.documentId}:${ref.revisionId}`;
}

export function validateDocumentReference(
  reference: Partial<DocumentReference> | undefined,
  path = "",
  expectedKind?: DocumentKind,
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const basePath = path.length > 0 ? path : "";

  if (reference === undefined) {
    issues.push(
      createValidationIssue({
        code: "DOCUMENT_REFERENCE_MISSING",
        severity: "error",
        message: "Document reference is required.",
        path: basePath,
      }),
    );
    return createValidationResult(issues);
  }

  if (
    typeof reference.documentKind !== "string" ||
    !isDocumentKind(reference.documentKind)
  ) {
    issues.push(
      createValidationIssue({
        code: "DOCUMENT_REFERENCE_KIND_INVALID",
        severity: "error",
        message: "documentKind must be a supported document kind.",
        path: `${basePath}/documentKind`,
      }),
    );
  } else if (expectedKind !== undefined && reference.documentKind !== expectedKind) {
    issues.push(
      createValidationIssue({
        code: "DOCUMENT_REFERENCE_KIND_MISMATCH",
        severity: "error",
        message: `documentKind must be "${expectedKind}" for this reference.`,
        path: `${basePath}/documentKind`,
      }),
    );
  }

  if (typeof reference.documentId !== "string" || !isValidUuid(reference.documentId)) {
    issues.push(
      createValidationIssue({
        code: "DOCUMENT_REFERENCE_ID_INVALID",
        severity: "error",
        message: "documentId must be a valid UUID.",
        path: `${basePath}/documentId`,
      }),
    );
  }

  if (!isPositiveRevisionId(reference.revisionId)) {
    issues.push(
      createValidationIssue({
        code: "DOCUMENT_REFERENCE_REVISION_INVALID",
        severity: "error",
        message: "revisionId must be a positive integer; floating latest references are prohibited.",
        path: `${basePath}/revisionId`,
      }),
    );
  }

  const checksumResult = validateContentChecksum(
    reference.contentChecksum,
    `${basePath}/contentChecksum`,
  );
  issues.push(...checksumResult.issues);

  return createValidationResult(issues);
}

export function validateDocumentReferenceCollection(
  references: readonly DocumentReference[] | undefined,
  path: string,
  expectedKind: DocumentKind,
): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (references === undefined) {
    issues.push(
      createValidationIssue({
        code: "DOCUMENT_REFERENCE_COLLECTION_MISSING",
        severity: "error",
        message: "Document reference collection is required.",
        path,
      }),
    );
    return createValidationResult(issues);
  }

  if (!Array.isArray(references)) {
    issues.push(
      createValidationIssue({
        code: "DOCUMENT_REFERENCE_COLLECTION_INVALID",
        severity: "error",
        message: "Document reference collection must be an array.",
        path,
      }),
    );
    return createValidationResult(issues);
  }

  const seen = new Set<DocumentReferenceIdentity>();

  references.forEach((reference, index) => {
    const itemPath = `${path}/${index}`;
    const itemResult = validateDocumentReference(reference, itemPath, expectedKind);
    issues.push(...itemResult.issues);

    if (
      reference.documentKind !== undefined &&
      reference.documentId !== undefined &&
      reference.revisionId !== undefined &&
      isDocumentKind(reference.documentKind) &&
      isValidUuid(reference.documentId) &&
      isPositiveRevisionId(reference.revisionId)
    ) {
      const identity =
        `${reference.documentKind}:${reference.documentId}:${reference.revisionId}` as DocumentReferenceIdentity;
      if (seen.has(identity)) {
        issues.push(
          createValidationIssue({
            code: "DOCUMENT_REFERENCE_DUPLICATE",
            severity: "error",
            message: "Duplicate document references are prohibited.",
            path: itemPath,
          }),
        );
      } else {
        seen.add(identity);
      }
    }
  });

  return createValidationResult(issues);
}
