import type { ValidationResult } from "../validation";

export const REPOSITORY_ERROR_CODES = [
  "not-found",
  "already-exists",
  "revision-conflict",
  "validation-failed",
  "immutable-resource",
  "append-only-violation",
] as const;

export type RepositoryErrorCode = (typeof REPOSITORY_ERROR_CODES)[number];

export interface RepositoryErrorBase<TCode extends RepositoryErrorCode> {
  readonly code: TCode;
  readonly message: string;
}

export interface RepositoryNotFoundError extends RepositoryErrorBase<"not-found"> {
  readonly resourceKind: string;
  readonly resourceId: string;
}

export interface RepositoryAlreadyExistsError extends RepositoryErrorBase<"already-exists"> {
  readonly resourceKind: string;
  readonly resourceId: string;
}

export interface RepositoryRevisionConflictError extends RepositoryErrorBase<"revision-conflict"> {
  readonly documentId: string;
  readonly expectedRevision: number;
  readonly actualRevision: number;
}

export interface RepositoryValidationFailedError extends RepositoryErrorBase<"validation-failed"> {
  readonly validation: ValidationResult;
}

export interface RepositoryImmutableResourceError extends RepositoryErrorBase<"immutable-resource"> {
  readonly resourceKind: string;
  readonly resourceId: string;
}

export interface RepositoryAppendOnlyViolationError
  extends RepositoryErrorBase<"append-only-violation"> {
  readonly resourceKind: string;
  readonly resourceId: string;
}

export type RepositoryError =
  | RepositoryNotFoundError
  | RepositoryAlreadyExistsError
  | RepositoryRevisionConflictError
  | RepositoryValidationFailedError
  | RepositoryImmutableResourceError
  | RepositoryAppendOnlyViolationError;

export function isRepositoryErrorCode(
  value: string,
): value is RepositoryErrorCode {
  return (REPOSITORY_ERROR_CODES as readonly string[]).includes(value);
}

export function isRepositoryNotFoundError(
  error: RepositoryError,
): error is RepositoryNotFoundError {
  return error.code === "not-found";
}

export function isRepositoryAlreadyExistsError(
  error: RepositoryError,
): error is RepositoryAlreadyExistsError {
  return error.code === "already-exists";
}

export function isRepositoryRevisionConflictError(
  error: RepositoryError,
): error is RepositoryRevisionConflictError {
  return error.code === "revision-conflict";
}

export function isRepositoryValidationFailedError(
  error: RepositoryError,
): error is RepositoryValidationFailedError {
  return error.code === "validation-failed";
}

export function isRepositoryImmutableResourceError(
  error: RepositoryError,
): error is RepositoryImmutableResourceError {
  return error.code === "immutable-resource";
}

export function isRepositoryAppendOnlyViolationError(
  error: RepositoryError,
): error is RepositoryAppendOnlyViolationError {
  return error.code === "append-only-violation";
}

export function createRepositoryNotFoundError(
  resourceKind: string,
  resourceId: string,
  message?: string,
): RepositoryNotFoundError {
  return {
    code: "not-found",
    resourceKind,
    resourceId,
    message: message ?? `${resourceKind} "${resourceId}" was not found.`,
  };
}

export function createRepositoryAlreadyExistsError(
  resourceKind: string,
  resourceId: string,
  message?: string,
): RepositoryAlreadyExistsError {
  return {
    code: "already-exists",
    resourceKind,
    resourceId,
    message: message ?? `${resourceKind} "${resourceId}" already exists.`,
  };
}

export function createRepositoryRevisionConflictError(
  documentId: string,
  expectedRevision: number,
  actualRevision: number,
  message?: string,
): RepositoryRevisionConflictError {
  return {
    code: "revision-conflict",
    documentId,
    expectedRevision,
    actualRevision,
    message:
      message ??
      `Revision conflict for document "${documentId}": expected ${expectedRevision}, actual ${actualRevision}.`,
  };
}

export function createRepositoryValidationFailedError(
  validation: ValidationResult,
  message = "Repository write rejected because contract validation failed.",
): RepositoryValidationFailedError {
  return {
    code: "validation-failed",
    validation,
    message,
  };
}

export function createRepositoryImmutableResourceError(
  resourceKind: string,
  resourceId: string,
  message?: string,
): RepositoryImmutableResourceError {
  return {
    code: "immutable-resource",
    resourceKind,
    resourceId,
    message: message ?? `${resourceKind} "${resourceId}" is immutable and cannot be modified.`,
  };
}

export function createRepositoryAppendOnlyViolationError(
  resourceKind: string,
  resourceId: string,
  message?: string,
): RepositoryAppendOnlyViolationError {
  return {
    code: "append-only-violation",
    resourceKind,
    resourceId,
    message:
      message ??
      `${resourceKind} "${resourceId}" violates append-only semantics.`,
  };
}
