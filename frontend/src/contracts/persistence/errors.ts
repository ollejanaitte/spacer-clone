import type { ValidationResult } from "../validation";

export const PERSISTENCE_ERROR_CODES = [
  "malformed-json",
  "unsupported-format",
  "missing-version",
  "unsupported-version",
  "legacy-write-forbidden",
  "migration-failed",
  "validation-failed",
  "adapter-failed",
  "store-failed",
] as const;

export type PersistenceErrorCode = (typeof PERSISTENCE_ERROR_CODES)[number];

export interface PersistenceErrorBase<TCode extends PersistenceErrorCode> {
  readonly code: TCode;
  readonly message: string;
}

export interface PersistenceMalformedJsonError extends PersistenceErrorBase<"malformed-json"> {
  readonly causeMessage: string;
}

export interface PersistenceUnsupportedFormatError
  extends PersistenceErrorBase<"unsupported-format"> {
  readonly hints: readonly string[];
}

export interface PersistenceMissingVersionError extends PersistenceErrorBase<"missing-version"> {
  readonly formatId: string;
}

export interface PersistenceUnsupportedVersionError
  extends PersistenceErrorBase<"unsupported-version"> {
  readonly formatId: string;
  readonly sourceVersion: string;
}

export interface PersistenceLegacyWriteForbiddenError
  extends PersistenceErrorBase<"legacy-write-forbidden"> {}

export interface PersistenceMigrationFailedError extends PersistenceErrorBase<"migration-failed"> {
  readonly causeMessage: string;
}

export interface PersistenceValidationFailedError
  extends PersistenceErrorBase<"validation-failed"> {
  readonly validation: ValidationResult;
}

export interface PersistenceAdapterFailedError extends PersistenceErrorBase<"adapter-failed"> {
  readonly causeMessage: string;
  readonly adapterCode: string;
}

export interface PersistenceStoreFailedError extends PersistenceErrorBase<"store-failed"> {
  readonly causeMessage: string;
}

export type PersistenceError =
  | PersistenceMalformedJsonError
  | PersistenceUnsupportedFormatError
  | PersistenceMissingVersionError
  | PersistenceUnsupportedVersionError
  | PersistenceLegacyWriteForbiddenError
  | PersistenceMigrationFailedError
  | PersistenceValidationFailedError
  | PersistenceAdapterFailedError
  | PersistenceStoreFailedError;

export function createPersistenceMalformedJsonError(
  causeMessage: string,
): PersistenceMalformedJsonError {
  return {
    code: "malformed-json",
    message: "Raw input is not valid JSON.",
    causeMessage,
  };
}

export function createPersistenceUnsupportedFormatError(
  message: string,
  hints: readonly string[] = [],
): PersistenceUnsupportedFormatError {
  return { code: "unsupported-format", message, hints };
}

export function createPersistenceMissingVersionError(
  formatId: string,
  message?: string,
): PersistenceMissingVersionError {
  return {
    code: "missing-version",
    formatId,
    message: message ?? `Version is missing for format "${formatId}".`,
  };
}

export function createPersistenceUnsupportedVersionError(
  formatId: string,
  sourceVersion: string,
  message?: string,
): PersistenceUnsupportedVersionError {
  return {
    code: "unsupported-version",
    formatId,
    sourceVersion,
    message:
      message ?? `Unsupported version "${sourceVersion}" for format "${formatId}".`,
  };
}

export function createPersistenceLegacyWriteForbiddenError(
  message = "Saving legacy formats is forbidden; write-target only.",
): PersistenceLegacyWriteForbiddenError {
  return { code: "legacy-write-forbidden", message };
}

export function createPersistenceMigrationFailedError(
  causeMessage: string,
): PersistenceMigrationFailedError {
  return {
    code: "migration-failed",
    message: "Migration to target schema failed.",
    causeMessage,
  };
}

export function createPersistenceValidationFailedError(
  validation: ValidationResult,
): PersistenceValidationFailedError {
  return {
    code: "validation-failed",
    message: "Target document validation failed.",
    validation,
  };
}

export function createPersistenceAdapterFailedError(
  adapterCode: string,
  causeMessage: string,
): PersistenceAdapterFailedError {
  return {
    code: "adapter-failed",
    message: "Legacy adapter failed.",
    adapterCode,
    causeMessage,
  };
}

export function createPersistenceStoreFailedError(
  causeMessage: string,
): PersistenceStoreFailedError {
  return {
    code: "store-failed",
    message: "Atomic store operation failed.",
    causeMessage,
  };
}
