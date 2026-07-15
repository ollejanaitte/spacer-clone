import { describe, expect, it } from "vitest";
import type { UuidString } from "../../uuid";
import {
  isRepositoryAlreadyExistsError,
  isRepositoryAppendOnlyViolationError,
  isRepositoryImmutableResourceError,
  isRepositoryNotFoundError,
  isRepositoryValidationFailedError,
  type AppendOnlyRecordEnvelope,
  type AppendOnlyRecordRepository,
  type ImmutablePackageEnvelope,
  type ImmutablePackageRepository,
  type PackageIdentity,
  type RepositoryFaultInjection,
} from "../index";

export interface ImmutablePackageConformanceConfig<TPackage extends ImmutablePackageEnvelope> {
  readonly name: string;
  readonly identity: PackageIdentity;
  readonly createRepository: (
    faultInjection?: RepositoryFaultInjection,
  ) => ImmutablePackageRepository<TPackage>;
  readonly createPackage: () => TPackage;
  readonly createInvalidPackage: () => unknown;
  readonly mutateReadValue: (value: TPackage) => void;
}

export function runImmutablePackageConformanceSuite<TPackage extends ImmutablePackageEnvelope>(
  config: ImmutablePackageConformanceConfig<TPackage>,
): void {
  const {
    name,
    identity,
    createRepository,
    createPackage,
    createInvalidPackage,
    mutateReadValue,
  } = config;

  describe(`${name} immutable package repository conformance`, () => {
    it("create/read round-trip", () => {
      const repository = createRepository();
      const pkg = createPackage();
      const created = repository.create(pkg);
      expect(created.ok).toBe(true);
      if (!created.ok) {
        return;
      }

      const read = repository.read(identity);
      expect(read.ok).toBe(true);
      if (read.ok) {
        expect(read.value).toEqual(created.value);
      }
    });

    it("rejects duplicate create", () => {
      const repository = createRepository();
      const pkg = createPackage();
      expect(repository.create(pkg).ok).toBe(true);
      const duplicate = repository.create(pkg);
      expect(duplicate.ok).toBe(false);
      if (!duplicate.ok) {
        expect(
          isRepositoryImmutableResourceError(duplicate.error) ||
            isRepositoryAlreadyExistsError(duplicate.error),
        ).toBe(true);
      }
    });

    it("returns not found for missing package", () => {
      const repository = createRepository();
      const missing = repository.read(identity);
      expect(missing.ok).toBe(false);
      if (!missing.ok) {
        expect(isRepositoryNotFoundError(missing.error)).toBe(true);
      }
    });

    it("leaves state unchanged on validation failure", () => {
      const repository = createRepository();
      const invalid = repository.create(createInvalidPackage() as TPackage);
      expect(invalid.ok).toBe(false);
      if (!invalid.ok) {
        expect(isRepositoryValidationFailedError(invalid.error)).toBe(true);
      }

      const read = repository.read(identity);
      expect(read.ok).toBe(false);
    });

    it("isolates returned values from external mutation", () => {
      const repository = createRepository();
      expect(repository.create(createPackage()).ok).toBe(true);

      const read = repository.read(identity);
      expect(read.ok).toBe(true);
      if (!read.ok) {
        return;
      }

      const beforeMutation = structuredClone(read.value);
      mutateReadValue(read.value);
      const readAgain = repository.read(identity);
      expect(readAgain.ok).toBe(true);
      if (readAgain.ok) {
        expect(readAgain.value).toEqual(beforeMutation);
      }
    });

    it("leaves state unchanged when fault injection aborts create", () => {
      let faultedAttempt = 0;
      const repository = createRepository({
        onBeforeCommit: ({ commitAttempt }) => {
          faultedAttempt = commitAttempt;
          throw new Error("simulated commit failure");
        },
      });
      const failed = repository.create(createPackage());
      expect(failed.ok).toBe(false);
      expect(faultedAttempt).toBe(1);

      const read = repository.read(identity);
      expect(read.ok).toBe(false);
    });
  });
}

export interface AppendOnlyRecordConformanceConfig<TRecord extends AppendOnlyRecordEnvelope> {
  readonly name: string;
  readonly recordId: UuidString;
  readonly createRepository: (
    faultInjection?: RepositoryFaultInjection,
  ) => AppendOnlyRecordRepository<TRecord>;
  readonly createRecord: (recordId?: UuidString) => TRecord;
  readonly createInvalidRecord: () => unknown;
  readonly mutateReadValue: (value: TRecord) => void;
}

export function runAppendOnlyRecordConformanceSuite<TRecord extends AppendOnlyRecordEnvelope>(
  config: AppendOnlyRecordConformanceConfig<TRecord>,
): void {
  const {
    name,
    recordId,
    createRepository,
    createRecord,
    createInvalidRecord,
    mutateReadValue,
  } = config;

  describe(`${name} append-only record repository conformance`, () => {
    it("append/read round-trip", () => {
      const repository = createRepository();
      const record = createRecord();
      const appended = repository.append(record);
      expect(appended.ok).toBe(true);
      if (!appended.ok) {
        return;
      }

      const read = repository.read(recordId);
      expect(read.ok).toBe(true);
      if (read.ok) {
        expect(read.value).toEqual(appended.value);
      }
    });

    it("rejects duplicate append", () => {
      const repository = createRepository();
      const record = createRecord();
      expect(repository.append(record).ok).toBe(true);
      const duplicate = repository.append(record);
      expect(duplicate.ok).toBe(false);
      if (!duplicate.ok) {
        expect(isRepositoryAppendOnlyViolationError(duplicate.error)).toBe(true);
      }
    });

    it("returns not found for missing record", () => {
      const repository = createRepository();
      const missing = repository.read(recordId);
      expect(missing.ok).toBe(false);
      if (!missing.ok) {
        expect(isRepositoryNotFoundError(missing.error)).toBe(true);
      }
    });

    it("leaves state unchanged on validation failure", () => {
      const repository = createRepository();
      const invalid = repository.append(createInvalidRecord() as TRecord);
      expect(invalid.ok).toBe(false);
      if (!invalid.ok) {
        expect(isRepositoryValidationFailedError(invalid.error)).toBe(true);
      }

      const read = repository.read(recordId);
      expect(read.ok).toBe(false);
    });

    it("isolates returned values from external mutation", () => {
      const repository = createRepository();
      expect(repository.append(createRecord()).ok).toBe(true);

      const read = repository.read(recordId);
      expect(read.ok).toBe(true);
      if (!read.ok) {
        return;
      }

      const beforeMutation = structuredClone(read.value);
      mutateReadValue(read.value);
      const readAgain = repository.read(recordId);
      expect(readAgain.ok).toBe(true);
      if (readAgain.ok) {
        expect(readAgain.value).toEqual(beforeMutation);
      }
    });

    it("leaves state unchanged when fault injection aborts append", () => {
      let faultedAttempt = 0;
      const repository = createRepository({
        onBeforeCommit: ({ commitAttempt }) => {
          faultedAttempt = commitAttempt;
          throw new Error("simulated commit failure");
        },
      });
      const failed = repository.append(createRecord());
      expect(failed.ok).toBe(false);
      expect(faultedAttempt).toBe(1);

      const read = repository.read(recordId);
      expect(read.ok).toBe(false);
    });

    it("does not expose update or delete APIs", () => {
      const repository = createRepository();
      expect("update" in repository).toBe(false);
      expect("delete" in repository).toBe(false);
      expect("replace" in repository).toBe(false);
      expect("remove" in repository).toBe(false);
    });
  });
}
