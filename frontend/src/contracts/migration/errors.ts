import type { SchemaId, SchemaVersion } from "../schemaIdentity";
import type { ValidationResult } from "../validation";
import type { MigrationStepId } from "./types";

export const MIGRATION_ERROR_CODES = [
  "duplicate-step",
  "unknown-source-version",
  "unknown-target-version",
  "path-not-found",
  "ambiguous-path",
  "step-failed",
  "validation-failed",
] as const;

export type MigrationErrorCode = (typeof MIGRATION_ERROR_CODES)[number];

export interface MigrationErrorBase<TCode extends MigrationErrorCode> {
  readonly code: TCode;
  readonly message: string;
}

export interface MigrationDuplicateStepError extends MigrationErrorBase<"duplicate-step"> {
  readonly schemaId: SchemaId;
  readonly fromVersion: SchemaVersion;
  readonly toVersion: SchemaVersion;
  readonly existingStepId: MigrationStepId;
}

export interface MigrationUnknownSourceVersionError
  extends MigrationErrorBase<"unknown-source-version"> {
  readonly schemaId: SchemaId;
  readonly sourceVersion: SchemaVersion;
  readonly knownVersions: readonly SchemaVersion[];
}

export interface MigrationUnknownTargetVersionError
  extends MigrationErrorBase<"unknown-target-version"> {
  readonly schemaId: SchemaId;
  readonly targetVersion: SchemaVersion;
  readonly knownVersions: readonly SchemaVersion[];
}

export interface MigrationPathNotFoundError extends MigrationErrorBase<"path-not-found"> {
  readonly schemaId: SchemaId;
  readonly sourceVersion: SchemaVersion;
  readonly targetVersion: SchemaVersion;
}

export interface MigrationAmbiguousPathError extends MigrationErrorBase<"ambiguous-path"> {
  readonly schemaId: SchemaId;
  readonly sourceVersion: SchemaVersion;
  readonly targetVersion: SchemaVersion;
  readonly pathCount: number;
}

export interface MigrationStepFailedError extends MigrationErrorBase<"step-failed"> {
  readonly stepId: MigrationStepId;
  readonly fromVersion: SchemaVersion;
  readonly toVersion: SchemaVersion;
  readonly causeMessage: string;
}

export interface MigrationValidationFailedError extends MigrationErrorBase<"validation-failed"> {
  readonly validation: ValidationResult;
}

export type MigrationError =
  | MigrationDuplicateStepError
  | MigrationUnknownSourceVersionError
  | MigrationUnknownTargetVersionError
  | MigrationPathNotFoundError
  | MigrationAmbiguousPathError
  | MigrationStepFailedError
  | MigrationValidationFailedError;

export type MigrationPathError =
  | MigrationUnknownSourceVersionError
  | MigrationUnknownTargetVersionError
  | MigrationPathNotFoundError
  | MigrationAmbiguousPathError;

export function isMigrationErrorCode(value: string): value is MigrationErrorCode {
  return (MIGRATION_ERROR_CODES as readonly string[]).includes(value);
}

export function isMigrationDuplicateStepError(
  error: MigrationError,
): error is MigrationDuplicateStepError {
  return error.code === "duplicate-step";
}

export function isMigrationPathNotFoundError(
  error: MigrationError,
): error is MigrationPathNotFoundError {
  return error.code === "path-not-found";
}

export function isMigrationAmbiguousPathError(
  error: MigrationError,
): error is MigrationAmbiguousPathError {
  return error.code === "ambiguous-path";
}

export function isMigrationStepFailedError(
  error: MigrationError,
): error is MigrationStepFailedError {
  return error.code === "step-failed";
}

export function isMigrationValidationFailedError(
  error: MigrationError,
): error is MigrationValidationFailedError {
  return error.code === "validation-failed";
}

export function createMigrationDuplicateStepError(
  schemaId: SchemaId,
  fromVersion: SchemaVersion,
  toVersion: SchemaVersion,
  existingStepId: MigrationStepId,
): MigrationDuplicateStepError {
  return {
    code: "duplicate-step",
    schemaId,
    fromVersion,
    toVersion,
    existingStepId,
    message:
      `Duplicate migration step for ${schemaId} ${fromVersion} -> ${toVersion} ` +
      `(existing stepId: ${existingStepId}).`,
  };
}

export function createMigrationUnknownSourceVersionError(
  schemaId: SchemaId,
  sourceVersion: SchemaVersion,
  knownVersions: readonly SchemaVersion[],
): MigrationUnknownSourceVersionError {
  return {
    code: "unknown-source-version",
    schemaId,
    sourceVersion,
    knownVersions,
    message:
      `Unknown source schema version "${sourceVersion}" for ${schemaId}. ` +
      `Known versions: ${knownVersions.join(", ") || "(none)"}.`,
  };
}

export function createMigrationUnknownTargetVersionError(
  schemaId: SchemaId,
  targetVersion: SchemaVersion,
  knownVersions: readonly SchemaVersion[],
): MigrationUnknownTargetVersionError {
  return {
    code: "unknown-target-version",
    schemaId,
    targetVersion,
    knownVersions,
    message:
      `Unknown target schema version "${targetVersion}" for ${schemaId}. ` +
      `Known versions: ${knownVersions.join(", ") || "(none)"}.`,
  };
}

export function createMigrationPathNotFoundError(
  schemaId: SchemaId,
  sourceVersion: SchemaVersion,
  targetVersion: SchemaVersion,
): MigrationPathNotFoundError {
  return {
    code: "path-not-found",
    schemaId,
    sourceVersion,
    targetVersion,
    message:
      `No migration path exists for ${schemaId} from ${sourceVersion} to ${targetVersion}.`,
  };
}

export function createMigrationAmbiguousPathError(
  schemaId: SchemaId,
  sourceVersion: SchemaVersion,
  targetVersion: SchemaVersion,
  pathCount: number,
): MigrationAmbiguousPathError {
  return {
    code: "ambiguous-path",
    schemaId,
    sourceVersion,
    targetVersion,
    pathCount,
    message:
      `Ambiguous migration path for ${schemaId} from ${sourceVersion} to ${targetVersion}: ` +
      `${pathCount} shortest paths found.`,
  };
}

export function createMigrationStepFailedError(
  stepId: MigrationStepId,
  fromVersion: SchemaVersion,
  toVersion: SchemaVersion,
  causeMessage: string,
): MigrationStepFailedError {
  return {
    code: "step-failed",
    stepId,
    fromVersion,
    toVersion,
    causeMessage,
    message:
      `Migration step "${stepId}" (${fromVersion} -> ${toVersion}) failed: ${causeMessage}`,
  };
}

export function createMigrationValidationFailedError(
  validation: ValidationResult,
): MigrationValidationFailedError {
  return {
    code: "validation-failed",
    validation,
    message: "Target validation failed after migration.",
  };
}
