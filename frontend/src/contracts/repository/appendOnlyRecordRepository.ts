import type { UuidString } from "../uuid";
import {
  createValidationIssue,
  createValidationResult,
  type ValidationResult,
} from "../validation";
import {
  createRepositoryAlreadyExistsError,
  createRepositoryAppendOnlyViolationError,
  createRepositoryNotFoundError,
  createRepositoryValidationFailedError,
} from "./errors";
import { runRepositoryFaultInjection, type RepositoryFaultInjection } from "./faultInjection";
import { cloneArtifact } from "./isolation";
import { repositoryFailure, repositorySuccess, type RepositoryResult } from "./result";

export interface AppendOnlyRecordEnvelope {
  readonly recordId: UuidString;
}

/**
 * Append-only transfer records: append new records, read by id, no update or delete API.
 */
export interface AppendOnlyRecordRepository<TRecord extends AppendOnlyRecordEnvelope> {
  append(record: TRecord): RepositoryResult<TRecord>;
  read(recordId: UuidString): RepositoryResult<TRecord>;
}

export type AppendOnlyRecordValidateOutcome<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly validation: ValidationResult };

export interface AppendOnlyRecordRepositoryOptions<TRecord extends AppendOnlyRecordEnvelope> {
  readonly resourceKind: string;
  readonly validate: (value: unknown) => AppendOnlyRecordValidateOutcome<TRecord>;
  readonly faultInjection?: RepositoryFaultInjection;
}

function faultInjectionFailure(message: string): RepositoryResult<never> {
  return repositoryFailure(
    createRepositoryValidationFailedError(
      createValidationResult([
        createValidationIssue({
          code: "REPOSITORY_FAULT_INJECTION_ABORT",
          severity: "error",
          message,
          path: "",
        }),
      ]),
    ),
  );
}

export function createAppendOnlyRecordRepository<TRecord extends AppendOnlyRecordEnvelope>(
  options: AppendOnlyRecordRepositoryOptions<TRecord>,
): AppendOnlyRecordRepository<TRecord> {
  const recordsById = new Map<UuidString, TRecord>();
  let commitAttempt = 0;

  return {
    append(record: TRecord): RepositoryResult<TRecord> {
      const validated = options.validate(record);
      if (!validated.ok) {
        return repositoryFailure(createRepositoryValidationFailedError(validated.validation));
      }

      const parsed = validated.value;
      if (recordsById.has(parsed.recordId)) {
        return repositoryFailure(
          createRepositoryAppendOnlyViolationError(
            options.resourceKind,
            parsed.recordId,
            `Append-only ${options.resourceKind} "${parsed.recordId}" already exists.`,
          ),
        );
      }

      const stored = cloneArtifact(parsed);

      try {
        commitAttempt += 1;
        runRepositoryFaultInjection(options.faultInjection, commitAttempt);
      } catch (error) {
        commitAttempt -= 1;
        const message =
          error instanceof Error ? error.message : "Repository fault injection aborted write.";
        return faultInjectionFailure(message);
      }

      recordsById.set(parsed.recordId, stored);
      return repositorySuccess(cloneArtifact(stored));
    },

    read(recordId: UuidString): RepositoryResult<TRecord> {
      const stored = recordsById.get(recordId);
      if (stored === undefined) {
        return repositoryFailure(
          createRepositoryNotFoundError(options.resourceKind, recordId),
        );
      }

      return repositorySuccess(cloneArtifact(stored));
    },
  };
}

export function assertAppendOnlyRecordRepository<TRecord extends AppendOnlyRecordEnvelope>(
  repository: AppendOnlyRecordRepository<TRecord>,
): void {
  const forbiddenMethods = ["update", "delete", "replace", "remove"] as const;
  for (const method of forbiddenMethods) {
    if (method in repository) {
      throw new Error(`Append-only repository must not expose "${method}".`);
    }
  }
}
