import { buildBackendProject } from "../api/buildBackendProject";
import type { ContentChecksum } from "../contracts/contentChecksum";
import type { UuidString } from "../contracts/uuid";
import type { LoadCase, ProjectModel } from "../types";
import {
  IF3_SOLVER_NAME,
  IF3_SOLVER_VERSION,
  resolveProjectModelSourceDocument,
} from "./projectModelSourceBinding";

export type RunAnalysisIf3LoadContextEntry = {
  readonly kind: "loadCase";
  readonly sourceId: string;
  readonly label: string;
  readonly definition: LoadCase;
};

export type RunAnalysisIf3LoadContext = {
  readonly entries: readonly RunAnalysisIf3LoadContextEntry[];
};

export type RunAnalysisIf3Metadata = {
  readonly sourceDocumentId: UuidString;
  readonly sourceDocumentVersion: number;
  readonly sourceContentChecksum: ContentChecksum;
  readonly analysisSettings: ReturnType<typeof buildBackendProject>["analysisSettings"];
  readonly loadContext: RunAnalysisIf3LoadContext;
  readonly solverName: string;
  readonly solverVersion: string;
  readonly authoritative?: boolean;
};

export function buildRunAnalysisIf3Metadata(
  project: ProjectModel,
  options?: { authoritative?: boolean },
): RunAnalysisIf3Metadata {
  const sourceDocument = resolveProjectModelSourceDocument(project);
  const backendProject = buildBackendProject(project);

  return {
    sourceDocumentId: sourceDocument.documentId,
    sourceDocumentVersion: sourceDocument.revisionId,
    sourceContentChecksum: sourceDocument.contentChecksum,
    analysisSettings: backendProject.analysisSettings,
    loadContext: {
      entries: project.loadCases.map((loadCase) => ({
        kind: "loadCase",
        sourceId: loadCase.id,
        label: loadCase.name,
        definition: loadCase,
      })),
    },
    solverName: IF3_SOLVER_NAME,
    solverVersion: IF3_SOLVER_VERSION,
    ...(options?.authoritative === true ? { authoritative: true } : {}),
  };
}
