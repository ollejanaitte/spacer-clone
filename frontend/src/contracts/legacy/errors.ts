import type { ValidationResult } from "../validation";

export const LEGACY_ADAPTER_ERROR_CODES = [
  "unsupported-format",
  "unsupported-version",
  "missing-version",
  "invalid-shape",
  "ambiguous-coordinate",
  "ambiguous-unit",
  "unresolved-reference",
  "broken-id",
  "mixed-ownership",
  "validation-failed",
] as const;

export type LegacyAdapterErrorCode = (typeof LEGACY_ADAPTER_ERROR_CODES)[number];

export interface LegacyAdapterErrorBase<TCode extends LegacyAdapterErrorCode> {
  readonly code: TCode;
  readonly message: string;
  readonly path?: string;
}

export interface LegacyUnsupportedFormatError
  extends LegacyAdapterErrorBase<"unsupported-format"> {
  readonly detectedHints: readonly string[];
}

export interface LegacyUnsupportedVersionError
  extends LegacyAdapterErrorBase<"unsupported-version"> {
  readonly formatId: string;
  readonly sourceVersion: string;
  readonly supportedVersions: readonly string[];
}

export interface LegacyMissingVersionError extends LegacyAdapterErrorBase<"missing-version"> {
  readonly formatId: string;
}

export interface LegacyInvalidShapeError extends LegacyAdapterErrorBase<"invalid-shape"> {
  readonly formatId: string;
}

export interface LegacyAmbiguousCoordinateError
  extends LegacyAdapterErrorBase<"ambiguous-coordinate"> {
  readonly formatId: string;
}

export interface LegacyAmbiguousUnitError extends LegacyAdapterErrorBase<"ambiguous-unit"> {
  readonly formatId: string;
  readonly field: string;
  readonly rawValue: string;
}

export interface LegacyUnresolvedReferenceError
  extends LegacyAdapterErrorBase<"unresolved-reference"> {
  readonly formatId: string;
  readonly referencePath: string;
  readonly referenceId: string;
}

export interface LegacyBrokenIdError extends LegacyAdapterErrorBase<"broken-id"> {
  readonly formatId: string;
  readonly fieldPath: string;
}

export interface LegacyMixedOwnershipError extends LegacyAdapterErrorBase<"mixed-ownership"> {
  readonly formatId: string;
  readonly conflictingFields: readonly string[];
}

export interface LegacyValidationFailedError
  extends LegacyAdapterErrorBase<"validation-failed"> {
  readonly validation: ValidationResult;
}

export type LegacyAdapterError =
  | LegacyUnsupportedFormatError
  | LegacyUnsupportedVersionError
  | LegacyMissingVersionError
  | LegacyInvalidShapeError
  | LegacyAmbiguousCoordinateError
  | LegacyAmbiguousUnitError
  | LegacyUnresolvedReferenceError
  | LegacyBrokenIdError
  | LegacyMixedOwnershipError
  | LegacyValidationFailedError;

export function isLegacyAdapterErrorCode(value: string): value is LegacyAdapterErrorCode {
  return (LEGACY_ADAPTER_ERROR_CODES as readonly string[]).includes(value);
}

export function createLegacyUnsupportedFormatError(
  message: string,
  detectedHints: readonly string[] = [],
): LegacyUnsupportedFormatError {
  return { code: "unsupported-format", message, detectedHints };
}

export function createLegacyUnsupportedVersionError(
  formatId: string,
  sourceVersion: string,
  supportedVersions: readonly string[],
  message?: string,
): LegacyUnsupportedVersionError {
  return {
    code: "unsupported-version",
    formatId,
    sourceVersion,
    supportedVersions,
    message:
      message ??
      `Unsupported legacy version "${sourceVersion}" for format "${formatId}".`,
  };
}

export function createLegacyMissingVersionError(
  formatId: string,
  message?: string,
): LegacyMissingVersionError {
  return {
    code: "missing-version",
    formatId,
    message: message ?? `Legacy version is missing for format "${formatId}".`,
  };
}

export function createLegacyInvalidShapeError(
  formatId: string,
  message: string,
  path?: string,
): LegacyInvalidShapeError {
  return { code: "invalid-shape", formatId, message, ...(path !== undefined ? { path } : {}) };
}

export function createLegacyAmbiguousCoordinateError(
  formatId: string,
  message: string,
  path?: string,
): LegacyAmbiguousCoordinateError {
  return {
    code: "ambiguous-coordinate",
    formatId,
    message,
    ...(path !== undefined ? { path } : {}),
  };
}

export function createLegacyAmbiguousUnitError(
  formatId: string,
  field: string,
  rawValue: string,
  message?: string,
): LegacyAmbiguousUnitError {
  return {
    code: "ambiguous-unit",
    formatId,
    field,
    rawValue,
    message:
      message ??
      `Legacy unit "${rawValue}" for field "${field}" cannot be mapped without ambiguity.`,
  };
}

export function createLegacyUnresolvedReferenceError(
  formatId: string,
  referencePath: string,
  referenceId: string,
  message?: string,
): LegacyUnresolvedReferenceError {
  return {
    code: "unresolved-reference",
    formatId,
    referencePath,
    referenceId,
    message:
      message ??
      `Unresolved legacy reference "${referenceId}" at ${referencePath}.`,
    path: referencePath,
  };
}

export function createLegacyBrokenIdError(
  formatId: string,
  fieldPath: string,
  message?: string,
): LegacyBrokenIdError {
  return {
    code: "broken-id",
    formatId,
    fieldPath,
    message: message ?? `Legacy identifier at ${fieldPath} is empty or invalid.`,
    path: fieldPath,
  };
}

export function createLegacyMixedOwnershipError(
  formatId: string,
  conflictingFields: readonly string[],
  message?: string,
): LegacyMixedOwnershipError {
  return {
    code: "mixed-ownership",
    formatId,
    conflictingFields,
    message:
      message ??
      `Legacy input mixes road and frame ownership (${conflictingFields.join(", ")}).`,
  };
}

export function createLegacyValidationFailedError(
  validation: ValidationResult,
  message?: string,
): LegacyValidationFailedError {
  return {
    code: "validation-failed",
    validation,
    message: message ?? "Adapted document failed target contract validation.",
  };
}
