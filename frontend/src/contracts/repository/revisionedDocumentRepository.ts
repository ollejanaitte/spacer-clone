import {
  createValidationIssue,
  createValidationResult,
  type ValidationResult,
} from "../validation";
import {
  createRepositoryAlreadyExistsError,
  createRepositoryNotFoundError,
  createRepositoryRevisionConflictError,
  createRepositoryValidationFailedError,
} from "./errors";
import { runRepositoryFaultInjection, type RepositoryFaultInjection } from "./faultInjection";
import { cloneArtifact } from "./isolation";
import { repositoryFailure, repositorySuccess, type RepositoryResult } from "./result";
import type { UuidString } from "../uuid";

export interface ReadDocumentRevisionRequest {
  readonly documentId: UuidString;
  readonly revisionId: number;
}

export interface AppendDocumentRevisionRequest<TDocument> {
  readonly document: TDocument;
  readonly expectedCurrentRevision: number;
}

/**
 * Revisioned domain documents: create initial revision, read by revision, append next revision only.
 * Optimistic concurrency via expectedCurrentRevision is mandatory on append.
 */
export interface RevisionedDocumentRepository<TDocument extends RevisionedDocumentEnvelope> {
  create(document: TDocument): RepositoryResult<TDocument>;
  read(request: ReadDocumentRevisionRequest): RepositoryResult<TDocument>;
  readLatest(documentId: UuidString): RepositoryResult<TDocument>;
  appendRevision(request: AppendDocumentRevisionRequest<TDocument>): RepositoryResult<TDocument>;
}

export interface RevisionedDocumentEnvelope {
  readonly documentId: UuidString;
  readonly revisionId: number;
}

export type RepositoryValidateOutcome<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly validation: ValidationResult };

export interface RevisionedDocumentRepositoryOptions<TDocument extends RevisionedDocumentEnvelope> {
  readonly resourceKind: string;
  readonly validate: (value: unknown) => RepositoryValidateOutcome<TDocument>;
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

function initialRevisionInvalidFailure(): RepositoryResult<never> {
  return repositoryFailure(
    createRepositoryValidationFailedError(
      createValidationResult([
        createValidationIssue({
          code: "REPOSITORY_INITIAL_REVISION_INVALID",
          severity: "error",
          message: "Initial document revision must be 1.",
          path: "/revisionId",
        }),
      ]),
    ),
  );
}

export function createRevisionedDocumentRepository<TDocument extends RevisionedDocumentEnvelope>(
  options: RevisionedDocumentRepositoryOptions<TDocument>,
): RevisionedDocumentRepository<TDocument> {
  const revisionsByDocument = new Map<UuidString, Map<number, TDocument>>();
  const latestRevisionByDocument = new Map<UuidString, number>();
  let commitAttempt = 0;

  function readStored(
    documentId: UuidString,
    revisionId: number,
  ): RepositoryResult<TDocument> {
    const revisions = revisionsByDocument.get(documentId);
    const stored = revisions?.get(revisionId);
    if (stored === undefined) {
      return repositoryFailure(
        createRepositoryNotFoundError(
          options.resourceKind,
          `${documentId}@${revisionId}`,
        ),
      );
    }

    return repositorySuccess(cloneArtifact(stored));
  }

  return {
    create(document: TDocument): RepositoryResult<TDocument> {
      const validated = options.validate(document);
      if (!validated.ok) {
        return repositoryFailure(createRepositoryValidationFailedError(validated.validation));
      }

      const parsed = validated.value;
      if (revisionsByDocument.has(parsed.documentId)) {
        return repositoryFailure(
          createRepositoryAlreadyExistsError(options.resourceKind, parsed.documentId),
        );
      }

      if (parsed.revisionId !== 1) {
        return initialRevisionInvalidFailure();
      }

      try {
        commitAttempt += 1;
        runRepositoryFaultInjection(options.faultInjection, commitAttempt);
      } catch (error) {
        commitAttempt -= 1;
        const message =
          error instanceof Error ? error.message : "Repository fault injection aborted write.";
        return faultInjectionFailure(message);
      }

      const stored = cloneArtifact(parsed);
      revisionsByDocument.set(parsed.documentId, new Map([[parsed.revisionId, stored]]));
      latestRevisionByDocument.set(parsed.documentId, parsed.revisionId);

      return repositorySuccess(cloneArtifact(stored));
    },

    read(request: ReadDocumentRevisionRequest): RepositoryResult<TDocument> {
      return readStored(request.documentId, request.revisionId);
    },

    readLatest(documentId: UuidString): RepositoryResult<TDocument> {
      const latestRevision = latestRevisionByDocument.get(documentId);
      if (latestRevision === undefined) {
        return repositoryFailure(
          createRepositoryNotFoundError(options.resourceKind, documentId),
        );
      }

      return readStored(documentId, latestRevision);
    },

    appendRevision(request: AppendDocumentRevisionRequest<TDocument>): RepositoryResult<TDocument> {
      const validated = options.validate(request.document);
      if (!validated.ok) {
        return repositoryFailure(createRepositoryValidationFailedError(validated.validation));
      }

      const parsed = validated.value;
      const revisions = revisionsByDocument.get(parsed.documentId);
      if (revisions === undefined) {
        return repositoryFailure(
          createRepositoryNotFoundError(options.resourceKind, parsed.documentId),
        );
      }

      const actualRevision = latestRevisionByDocument.get(parsed.documentId);
      if (actualRevision === undefined) {
        return repositoryFailure(
          createRepositoryNotFoundError(options.resourceKind, parsed.documentId),
        );
      }

      if (request.expectedCurrentRevision !== actualRevision) {
        return repositoryFailure(
          createRepositoryRevisionConflictError(
            parsed.documentId,
            request.expectedCurrentRevision,
            actualRevision,
          ),
        );
      }

      const expectedNextRevision = actualRevision + 1;
      if (parsed.revisionId !== expectedNextRevision) {
        return repositoryFailure(
          createRepositoryRevisionConflictError(
            parsed.documentId,
            expectedNextRevision,
            parsed.revisionId,
            `Revision ${parsed.revisionId} is not the valid next revision for document "${parsed.documentId}".`,
          ),
        );
      }

      if (revisions.has(parsed.revisionId)) {
        return repositoryFailure(
          createRepositoryAlreadyExistsError(
            options.resourceKind,
            `${parsed.documentId}@${parsed.revisionId}`,
            `Revision ${parsed.revisionId} already exists for document "${parsed.documentId}".`,
          ),
        );
      }

      const nextRevisions = new Map(revisions);
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

      nextRevisions.set(parsed.revisionId, stored);
      revisionsByDocument.set(parsed.documentId, nextRevisions);
      latestRevisionByDocument.set(parsed.documentId, parsed.revisionId);

      return repositorySuccess(cloneArtifact(stored));
    },
  };
}
