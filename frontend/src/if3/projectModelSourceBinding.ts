import { buildBackendProject } from "../api/buildBackendProject";
import { computeContentChecksum } from "../contracts/legacy/checksum";
import { deriveStableUuid } from "../contracts/legacy/idStability";
import { parseUuid, type UuidString } from "../contracts/uuid";
import type { ContentChecksum } from "../contracts/contentChecksum";
import type { ProjectModel } from "../types";

export const INTERIM_PROJECT_MODEL_BFAD_NAMESPACE = "project-model.interim-bfad";
export const INTERIM_SOURCE_DOCUMENT_REVISION = 1;
export const IF3_SOLVER_NAME = "scipy_sparse";
export const IF3_SOLVER_VERSION = "0.3.0";

export type ProjectModelSourceDocument = {
  readonly documentId: UuidString;
  readonly revisionId: number;
  readonly contentChecksum: ContentChecksum;
};

export function resolveProjectModelSourceDocument(project: ProjectModel): ProjectModelSourceDocument {
  const parsedId = parseUuid(project.project.id);
  const documentId =
    parsedId ?? deriveStableUuid(INTERIM_PROJECT_MODEL_BFAD_NAMESPACE, project.project.id);

  return {
    documentId,
    revisionId: INTERIM_SOURCE_DOCUMENT_REVISION,
    contentChecksum: computeContentChecksum(buildBackendProject(project)),
  };
}
