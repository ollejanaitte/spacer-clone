import { describe, expect, it } from "vitest";
import type { UuidString } from "../../uuid";
import {
  isRepositoryAlreadyExistsError,
  isRepositoryNotFoundError,
  isRepositoryRevisionConflictError,
  isRepositoryValidationFailedError,
  type RepositoryFaultInjection,
  type RevisionedDocumentEnvelope,
  type RevisionedDocumentRepository,
} from "../index";

export interface RevisionedDocumentConformanceConfig<
  TDocument extends RevisionedDocumentEnvelope,
> {
  readonly name: string;
  readonly documentId: UuidString;
  readonly createRepository: (
    faultInjection?: RepositoryFaultInjection,
  ) => RevisionedDocumentRepository<TDocument>;
  readonly createInitialDocument: () => TDocument;
  readonly createNextRevision: (current: TDocument, nextRevisionId: number) => TDocument;
  readonly createInvalidDocument: () => unknown;
  readonly mutateReadValue: (value: TDocument) => void;
}

export function runRevisionedDocumentConformanceSuite<
  TDocument extends RevisionedDocumentEnvelope,
>(config: RevisionedDocumentConformanceConfig<TDocument>): void {
  const {
    name,
    documentId,
    createRepository,
    createInitialDocument,
    createNextRevision,
    createInvalidDocument,
    mutateReadValue,
  } = config;

  describe(`${name} revisioned document repository conformance`, () => {
    it("create/read round-trip", () => {
      const repository = createRepository();
      const initial = createInitialDocument();
      const created = repository.create(initial);
      expect(created.ok).toBe(true);
      if (!created.ok) {
        return;
      }

      const read = repository.read({ documentId, revisionId: 1 });
      expect(read.ok).toBe(true);
      if (read.ok) {
        expect(read.value).toEqual(created.value);
      }
    });

    it("rejects duplicate create", () => {
      const repository = createRepository();
      const initial = createInitialDocument();
      expect(repository.create(initial).ok).toBe(true);
      const duplicate = repository.create(initial);
      expect(duplicate.ok).toBe(false);
      if (!duplicate.ok) {
        expect(isRepositoryAlreadyExistsError(duplicate.error)).toBe(true);
      }
    });

    it("returns not found for missing document", () => {
      const repository = createRepository();
      const missing = repository.read({ documentId, revisionId: 1 });
      expect(missing.ok).toBe(false);
      if (!missing.ok) {
        expect(isRepositoryNotFoundError(missing.error)).toBe(true);
      }
    });

    it("appends valid next revision", () => {
      const repository = createRepository();
      const initial = createInitialDocument();
      expect(repository.create(initial).ok).toBe(true);

      const revision2 = createNextRevision(initial, 2);
      const appended = repository.appendRevision({
        document: revision2,
        expectedCurrentRevision: 1,
      });
      expect(appended.ok).toBe(true);
      if (appended.ok) {
        expect(appended.value.revisionId).toBe(2);
      }

      const latest = repository.readLatest(documentId);
      expect(latest.ok).toBe(true);
      if (latest.ok) {
        expect(latest.value.revisionId).toBe(2);
      }
    });

    it("rejects stale expected revision conflict", () => {
      const repository = createRepository();
      const initial = createInitialDocument();
      expect(repository.create(initial).ok).toBe(true);

      const stale = repository.appendRevision({
        document: createNextRevision(initial, 2),
        expectedCurrentRevision: 99,
      });
      expect(stale.ok).toBe(false);
      if (!stale.ok) {
        expect(isRepositoryRevisionConflictError(stale.error)).toBe(true);
        if (isRepositoryRevisionConflictError(stale.error)) {
          expect(stale.error.expectedRevision).toBe(99);
          expect(stale.error.actualRevision).toBe(1);
        }
      }
    });

    it("rejects revision skip and same-revision overwrite", () => {
      const repository = createRepository();
      const initial = createInitialDocument();
      expect(repository.create(initial).ok).toBe(true);

      const skip = repository.appendRevision({
        document: createNextRevision(initial, 3),
        expectedCurrentRevision: 1,
      });
      expect(skip.ok).toBe(false);
      if (!skip.ok) {
        expect(isRepositoryRevisionConflictError(skip.error)).toBe(true);
      }

      const overwrite = repository.appendRevision({
        document: createNextRevision(initial, 1),
        expectedCurrentRevision: 1,
      });
      expect(overwrite.ok).toBe(false);
      if (!overwrite.ok) {
        expect(isRepositoryRevisionConflictError(overwrite.error)).toBe(true);
      }
    });

    it("leaves state unchanged on validation failure", () => {
      const repository = createRepository();
      const initial = createInitialDocument();
      expect(repository.create(initial).ok).toBe(true);

      const invalid = repository.appendRevision({
        document: createInvalidDocument() as TDocument,
        expectedCurrentRevision: 1,
      });
      expect(invalid.ok).toBe(false);
      if (!invalid.ok) {
        expect(isRepositoryValidationFailedError(invalid.error)).toBe(true);
      }

      const latest = repository.readLatest(documentId);
      expect(latest.ok).toBe(true);
      if (latest.ok) {
        expect(latest.value.revisionId).toBe(1);
      }
    });

    it("isolates returned values from external mutation", () => {
      const repository = createRepository();
      const initial = createInitialDocument();
      expect(repository.create(initial).ok).toBe(true);

      const read = repository.readLatest(documentId);
      expect(read.ok).toBe(true);
      if (!read.ok) {
        return;
      }

      const beforeMutation = structuredClone(read.value);
      mutateReadValue(read.value);
      const readAgain = repository.readLatest(documentId);
      expect(readAgain.ok).toBe(true);
      if (readAgain.ok) {
        expect(readAgain.value).toEqual(beforeMutation);
      }
    });

    it("leaves state unchanged when fault injection aborts append", () => {
      let faultedAttempt = 0;
      const repository = createRepository({
        onBeforeCommit: ({ commitAttempt }) => {
          if (commitAttempt > 1) {
            faultedAttempt = commitAttempt;
            throw new Error("simulated commit failure");
          }
        },
      });
      const initial = createInitialDocument();
      expect(repository.create(initial).ok).toBe(true);

      const failedAppend = repository.appendRevision({
        document: createNextRevision(initial, 2),
        expectedCurrentRevision: 1,
      });
      expect(failedAppend.ok).toBe(false);
      expect(faultedAttempt).toBe(2);

      const latest = repository.readLatest(documentId);
      expect(latest.ok).toBe(true);
      if (latest.ok) {
        expect(latest.value.revisionId).toBe(1);
      }
    });
  });
}
