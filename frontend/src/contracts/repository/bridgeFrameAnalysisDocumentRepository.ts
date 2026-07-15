import type { BridgeFrameAnalysisDocument } from "../bridgeFrameAnalysisDocument";
import { parseBridgeFrameAnalysisDocumentValue } from "../runtime";
import {
  createRevisionedDocumentRepository,
  type AppendDocumentRevisionRequest,
  type ReadDocumentRevisionRequest,
  type RepositoryValidateOutcome,
  type RevisionedDocumentRepository,
  type RevisionedDocumentRepositoryOptions,
} from "./revisionedDocumentRepository";
import type { RepositoryFaultInjection } from "./faultInjection";

export type BridgeFrameAnalysisDocumentRepository =
  RevisionedDocumentRepository<BridgeFrameAnalysisDocument>;

export type {
  AppendDocumentRevisionRequest as AppendBridgeFrameAnalysisDocumentRevisionRequest,
  ReadDocumentRevisionRequest as ReadBridgeFrameAnalysisDocumentRevisionRequest,
};

function validateBridgeFrameAnalysisDocument(
  value: unknown,
): RepositoryValidateOutcome<BridgeFrameAnalysisDocument> {
  const parsed = parseBridgeFrameAnalysisDocumentValue(value);
  if (!parsed.success) {
    return { ok: false, validation: parsed.validation };
  }
  return { ok: true, value: parsed.data };
}

export function createBridgeFrameAnalysisDocumentRepository(
  options: { readonly faultInjection?: RepositoryFaultInjection } = {},
): BridgeFrameAnalysisDocumentRepository {
  const repositoryOptions: RevisionedDocumentRepositoryOptions<BridgeFrameAnalysisDocument> = {
    resourceKind: "BridgeFrameAnalysisDocument",
    validate: validateBridgeFrameAnalysisDocument,
    faultInjection: options.faultInjection,
  };
  return createRevisionedDocumentRepository(repositoryOptions);
}

export function createInMemoryBridgeFrameAnalysisDocumentRepository(
  options: { readonly faultInjection?: RepositoryFaultInjection } = {},
): BridgeFrameAnalysisDocumentRepository {
  return createBridgeFrameAnalysisDocumentRepository(options);
}
