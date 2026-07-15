import type { RoadDesignDocument } from "../roadDesignDocument";
import { parseRoadDesignDocumentValue } from "../runtime";
import {
  createRevisionedDocumentRepository,
  type AppendDocumentRevisionRequest,
  type ReadDocumentRevisionRequest,
  type RepositoryValidateOutcome,
  type RevisionedDocumentRepository,
  type RevisionedDocumentRepositoryOptions,
} from "./revisionedDocumentRepository";
import type { RepositoryFaultInjection } from "./faultInjection";

export type RoadDesignDocumentRepository = RevisionedDocumentRepository<RoadDesignDocument>;

export type {
  AppendDocumentRevisionRequest as AppendRoadDesignDocumentRevisionRequest,
  ReadDocumentRevisionRequest as ReadRoadDesignDocumentRevisionRequest,
};

function validateRoadDesignDocument(value: unknown): RepositoryValidateOutcome<RoadDesignDocument> {
  const parsed = parseRoadDesignDocumentValue(value);
  if (!parsed.success) {
    return { ok: false, validation: parsed.validation };
  }
  return { ok: true, value: parsed.data };
}

export function createRoadDesignDocumentRepository(
  options: { readonly faultInjection?: RepositoryFaultInjection } = {},
): RoadDesignDocumentRepository {
  const repositoryOptions: RevisionedDocumentRepositoryOptions<RoadDesignDocument> = {
    resourceKind: "RoadDesignDocument",
    validate: validateRoadDesignDocument,
    faultInjection: options.faultInjection,
  };
  return createRevisionedDocumentRepository(repositoryOptions);
}

export function createInMemoryRoadDesignDocumentRepository(
  options: { readonly faultInjection?: RepositoryFaultInjection } = {},
): RoadDesignDocumentRepository {
  return createRoadDesignDocumentRepository(options);
}
