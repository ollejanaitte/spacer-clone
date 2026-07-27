import { describe, expect, it } from "vitest";
import { buildBackendProject } from "../../api/buildBackendProject";
import { computeContentChecksum } from "../../contracts/legacy/checksum";
import { deriveStableUuid } from "../../contracts/legacy/idStability";
import { createDefaultProject } from "../../data/defaultProject";
import {
  INTERIM_PROJECT_MODEL_BFAD_NAMESPACE,
  INTERIM_SOURCE_DOCUMENT_REVISION,
  resolveProjectModelSourceDocument,
} from "../projectModelSourceBinding";

describe("resolveProjectModelSourceDocument", () => {
  it("derives a stable documentId for non-UUID project ids", () => {
    const project = createDefaultProject();
    const first = resolveProjectModelSourceDocument(project);
    const second = resolveProjectModelSourceDocument(project);

    expect(first.documentId).toBe(
      deriveStableUuid(INTERIM_PROJECT_MODEL_BFAD_NAMESPACE, project.project.id),
    );
    expect(second.documentId).toBe(first.documentId);
    expect(first.revisionId).toBe(INTERIM_SOURCE_DOCUMENT_REVISION);
  });

  it("passes through UUID project ids", () => {
    const project = createDefaultProject();
    const uuid = "550e8400-e29b-41d4-a716-446655440099";
    project.project = { ...project.project, id: uuid };

    const binding = resolveProjectModelSourceDocument(project);
    expect(binding.documentId).toBe(uuid);
  });

  it("computes checksum from the backend-compatible project payload", () => {
    const project = createDefaultProject();
    const binding = resolveProjectModelSourceDocument(project);

    expect(binding.contentChecksum).toEqual(
      computeContentChecksum(buildBackendProject(project)),
    );
  });

  it("changes checksum when project content changes", () => {
    const project = createDefaultProject();
    const before = resolveProjectModelSourceDocument(project);

    project.project = {
      ...project.project,
      name: `${project.project.name} (edited)`,
    };
    const after = resolveProjectModelSourceDocument(project);

    expect(after.contentChecksum.hexDigest).not.toBe(before.contentChecksum.hexDigest);
    expect(after.documentId).toBe(before.documentId);
  });
});
