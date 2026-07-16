import type { RoadDesignDocument } from "../roadDesignDocument";
import { createPersistenceAdapterFailedError } from "./errors";
import type { DocumentLoadResult } from "./types";
import type { LinerDomainDraftVNext } from "../../liner/schema/types";
import {
  domainDraftToRoadDesignDocument,
  type LinerDomainDraftRoadDesignMapperOptions,
} from "../../liner/adapters/linerDomainDraftRoadDesignMapper";

export function projectLinerDomainDraftToRoadDesignDocument(
  domainDraft: LinerDomainDraftVNext,
  options: LinerDomainDraftRoadDesignMapperOptions = {},
): DocumentLoadResult<RoadDesignDocument> {
  const mapped = domainDraftToRoadDesignDocument(domainDraft, options);
  if (!mapped.ok) {
    return {
      ok: false,
      error: createPersistenceAdapterFailedError(
        "liner-domain-draft-map-failed",
        mapped.diagnostics.join("; "),
      ),
    };
  }

  return {
    ok: true,
    document: mapped.document,
    sourceKind: "target",
    sourceFormatId: "liner-domain-draft-vnext",
    sourceVersion: "0.3.0",
  };
}
