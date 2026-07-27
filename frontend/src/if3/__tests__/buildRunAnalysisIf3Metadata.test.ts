import { describe, expect, it } from "vitest";
import { buildBackendProject } from "../../api/buildBackendProject";
import { CONTENT_CHECKSUM_ALGORITHM } from "../../contracts";
import { createDefaultProject } from "../../data/defaultProject";
import { buildRunAnalysisIf3Metadata } from "../buildRunAnalysisIf3Metadata";
import {
  IF3_SOLVER_NAME,
  IF3_SOLVER_VERSION,
  resolveProjectModelSourceDocument,
} from "../projectModelSourceBinding";

describe("buildRunAnalysisIf3Metadata", () => {
  it("includes all required IF3 metadata fields for a sample project", () => {
    const project = createDefaultProject();
    const sourceDocument = resolveProjectModelSourceDocument(project);
    const metadata = buildRunAnalysisIf3Metadata(project, { authoritative: true });

    expect(metadata).toMatchObject({
      sourceDocumentId: sourceDocument.documentId,
      sourceDocumentVersion: sourceDocument.revisionId,
      sourceContentChecksum: sourceDocument.contentChecksum,
      analysisSettings: buildBackendProject(project).analysisSettings,
      solverName: IF3_SOLVER_NAME,
      solverVersion: IF3_SOLVER_VERSION,
      authoritative: true,
    });
    expect(metadata.sourceContentChecksum.algorithm).toBe(CONTENT_CHECKSUM_ALGORITHM);
    expect(metadata.loadContext.entries).toHaveLength(project.loadCases.length);
    expect(metadata.loadContext.entries[0]).toMatchObject({
      kind: "loadCase",
      sourceId: project.loadCases[0]!.id,
      label: project.loadCases[0]!.name,
      definition: project.loadCases[0],
    });
  });

  it("omits authoritative when not requested", () => {
    const project = createDefaultProject();
    const metadata = buildRunAnalysisIf3Metadata(project);
    expect(metadata.authoritative).toBeUndefined();
  });
});
