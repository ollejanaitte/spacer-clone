import {
  createValidationIssue,
  createValidationResult,
  type ValidationResult,
} from "./validation";

export const CONTENT_CHECKSUM_ALGORITHM = "sha256" as const;

export type ContentChecksumAlgorithm = typeof CONTENT_CHECKSUM_ALGORITHM;

/** Lowercase hexadecimal SHA-256 digest (64 characters). */
export const SHA256_HEX_LOWERCASE_PATTERN = /^[0-9a-f]{64}$/;

export interface ContentChecksum {
  readonly algorithm: ContentChecksumAlgorithm;
  readonly hexDigest: string;
}

export function isSha256HexDigest(value: string): boolean {
  return SHA256_HEX_LOWERCASE_PATTERN.test(value);
}

export function parseContentChecksum(value: {
  readonly algorithm: string;
  readonly hexDigest: string;
}): ContentChecksum | undefined {
  if (value.algorithm !== CONTENT_CHECKSUM_ALGORITHM) {
    return undefined;
  }
  if (!isSha256HexDigest(value.hexDigest)) {
    return undefined;
  }
  return {
    algorithm: CONTENT_CHECKSUM_ALGORITHM,
    hexDigest: value.hexDigest,
  };
}

export function contentChecksumsEqual(
  left: ContentChecksum,
  right: ContentChecksum,
): boolean {
  return left.algorithm === right.algorithm && left.hexDigest === right.hexDigest;
}

export function validateContentChecksum(
  checksum: Partial<ContentChecksum> | undefined,
  path = "",
): ValidationResult {
  const issues = [];
  const basePath = path.length > 0 ? path : "";

  if (checksum === undefined) {
    issues.push(
      createValidationIssue({
        code: "CONTENT_CHECKSUM_MISSING",
        severity: "error",
        message: "Content checksum is required.",
        path: basePath,
      }),
    );
    return createValidationResult(issues);
  }

  if (checksum.algorithm !== CONTENT_CHECKSUM_ALGORITHM) {
    issues.push(
      createValidationIssue({
        code: "CONTENT_CHECKSUM_ALGORITHM_INVALID",
        severity: "error",
        message: `Checksum algorithm must be "${CONTENT_CHECKSUM_ALGORITHM}".`,
        path: `${basePath}/algorithm`,
      }),
    );
  }

  if (typeof checksum.hexDigest !== "string" || !isSha256HexDigest(checksum.hexDigest)) {
    issues.push(
      createValidationIssue({
        code: "CONTENT_CHECKSUM_HEX_INVALID",
        severity: "error",
        message: "hexDigest must be a 64-character lowercase hexadecimal SHA-256 digest.",
        path: `${basePath}/hexDigest`,
      }),
    );
  }

  return createValidationResult(issues);
}
