import {
  validateContentChecksum,
  type ContentChecksum,
} from "./contentChecksum";
import {
  createValidationIssue,
  createValidationResult,
  mergeValidationResults,
  type ValidationResult,
} from "./validation";

export interface ImmutableResourceReference {
  readonly uri: string;
  readonly contentChecksum: ContentChecksum;
  readonly mediaType?: string;
}

export function validateImmutableResourceReference(
  reference: Partial<ImmutableResourceReference> | undefined,
  path = "",
): ValidationResult {
  const issues = [];
  const basePath = path.length > 0 ? path : "";

  if (reference === undefined) {
    issues.push(
      createValidationIssue({
        code: "IMMUTABLE_RESOURCE_REFERENCE_MISSING",
        severity: "error",
        message: "Immutable resource reference is required.",
        path: basePath,
      }),
    );
    return createValidationResult(issues);
  }

  if (typeof reference.uri !== "string" || reference.uri.trim().length === 0) {
    issues.push(
      createValidationIssue({
        code: "IMMUTABLE_RESOURCE_REFERENCE_URI_INVALID",
        severity: "error",
        message: "uri must be a non-empty string.",
        path: `${basePath}/uri`,
      }),
    );
  }

  if (
    reference.mediaType !== undefined &&
    (typeof reference.mediaType !== "string" || reference.mediaType.trim().length === 0)
  ) {
    issues.push(
      createValidationIssue({
        code: "IMMUTABLE_RESOURCE_REFERENCE_MEDIA_TYPE_INVALID",
        severity: "error",
        message: "mediaType must be a non-empty string when provided.",
        path: `${basePath}/mediaType`,
      }),
    );
  }

  return mergeValidationResults(
    createValidationResult(issues),
    validateContentChecksum(reference.contentChecksum, `${basePath}/contentChecksum`),
  );
}
