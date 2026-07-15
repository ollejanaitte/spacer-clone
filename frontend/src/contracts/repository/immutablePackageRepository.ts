import type { SchemaVersion } from "../schemaIdentity";
import type { UuidString } from "../uuid";
import {
  createValidationIssue,
  createValidationResult,
  type ValidationResult,
} from "../validation";
import {
  createRepositoryAlreadyExistsError,
  createRepositoryImmutableResourceError,
  createRepositoryNotFoundError,
  createRepositoryValidationFailedError,
} from "./errors";
import { runRepositoryFaultInjection, type RepositoryFaultInjection } from "./faultInjection";
import { cloneArtifact } from "./isolation";
import { repositoryFailure, repositorySuccess, type RepositoryResult } from "./result";

export interface PackageIdentity {
  readonly packageId: UuidString;
  readonly schemaVersion: SchemaVersion;
}

export interface ImmutablePackageEnvelope {
  readonly packageId: UuidString;
  readonly schemaVersion: SchemaVersion;
}

/**
 * Immutable transfer packages: create once, read by package/version identity, no mutation API.
 */
export interface ImmutablePackageRepository<TPackage extends ImmutablePackageEnvelope> {
  create(pkg: TPackage): RepositoryResult<TPackage>;
  read(identity: PackageIdentity): RepositoryResult<TPackage>;
}

export type ImmutablePackageValidateOutcome<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly validation: ValidationResult };

export interface ImmutablePackageRepositoryOptions<TPackage extends ImmutablePackageEnvelope> {
  readonly resourceKind: string;
  readonly validate: (value: unknown) => ImmutablePackageValidateOutcome<TPackage>;
  readonly faultInjection?: RepositoryFaultInjection;
}

function packageIdentityKey(identity: PackageIdentity): string {
  return `${identity.packageId}:${identity.schemaVersion}`;
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

export function createImmutablePackageRepository<TPackage extends ImmutablePackageEnvelope>(
  options: ImmutablePackageRepositoryOptions<TPackage>,
): ImmutablePackageRepository<TPackage> {
  const packagesByIdentity = new Map<string, TPackage>();
  let commitAttempt = 0;

  return {
    create(pkg: TPackage): RepositoryResult<TPackage> {
      const validated = options.validate(pkg);
      if (!validated.ok) {
        return repositoryFailure(createRepositoryValidationFailedError(validated.validation));
      }

      const parsed = validated.value;
      const identity: PackageIdentity = {
        packageId: parsed.packageId,
        schemaVersion: parsed.schemaVersion,
      };
      const key = packageIdentityKey(identity);

      if (packagesByIdentity.has(key)) {
        return repositoryFailure(
          createRepositoryImmutableResourceError(
            options.resourceKind,
            key,
            `${options.resourceKind} identity ${key} already exists and is immutable.`,
          ),
        );
      }

      const duplicatePackageId = [...packagesByIdentity.values()].some(
        (existing) => existing.packageId === parsed.packageId,
      );
      if (duplicatePackageId) {
        return repositoryFailure(
          createRepositoryAlreadyExistsError(
            options.resourceKind,
            parsed.packageId,
            `packageId "${parsed.packageId}" is already stored with a different schemaVersion.`,
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

      packagesByIdentity.set(key, stored);
      return repositorySuccess(cloneArtifact(stored));
    },

    read(identity: PackageIdentity): RepositoryResult<TPackage> {
      const key = packageIdentityKey(identity);
      const stored = packagesByIdentity.get(key);
      if (stored === undefined) {
        return repositoryFailure(
          createRepositoryNotFoundError(options.resourceKind, key),
        );
      }

      return repositorySuccess(cloneArtifact(stored));
    },
  };
}
