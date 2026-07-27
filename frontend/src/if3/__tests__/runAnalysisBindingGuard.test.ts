import { describe, expect, it } from "vitest";
import { parseUuid } from "../../contracts";
import { createDefaultProject } from "../../data/defaultProject";
import { buildRunAnalysisIf3Metadata } from "../buildRunAnalysisIf3Metadata";
import {
  assertAuthoritativeIf3Binding,
  evaluateBindingAgainstProject,
  RunAnalysisIf3BindingError,
  validateRunAnalysisIf3Metadata,
} from "../runAnalysisBindingGuard";

describe("validateRunAnalysisIf3Metadata", () => {
  it("accepts metadata built from a sample project", () => {
    const metadata = buildRunAnalysisIf3Metadata(createDefaultProject(), { authoritative: true });
    const result = validateRunAnalysisIf3Metadata(metadata);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.solverName).toBe("scipy_sparse");
    }
  });

  it.each([
    null,
    undefined,
    {},
    { sourceDocumentId: "not-a-uuid" },
    {
      sourceDocumentId: "550e8400-e29b-41d4-a716-446655440000",
      sourceDocumentVersion: 0,
      sourceContentChecksum: { algorithm: "sha256", hexDigest: "a".repeat(64) },
      analysisSettings: {},
      loadContext: { entries: [] },
      solverName: "scipy_sparse",
      solverVersion: "0.3.0",
    },
    {
      sourceDocumentId: "550e8400-e29b-41d4-a716-446655440000",
      sourceDocumentVersion: 1,
      sourceContentChecksum: { algorithm: "sha256", hexDigest: "bad" },
      analysisSettings: {},
      loadContext: { entries: [] },
      solverName: "scipy_sparse",
      solverVersion: "0.3.0",
    },
    {
      sourceDocumentId: "550e8400-e29b-41d4-a716-446655440000",
      sourceDocumentVersion: 1,
      sourceContentChecksum: { algorithm: "sha256", hexDigest: "a".repeat(64) },
      analysisSettings: {},
      loadContext: { entries: [] },
      solverName: "",
      solverVersion: "0.3.0",
    },
    {
      sourceDocumentId: "550e8400-e29b-41d4-a716-446655440000",
      sourceDocumentVersion: 1,
      sourceContentChecksum: { algorithm: "sha256", hexDigest: "a".repeat(64) },
      analysisSettings: {},
      loadContext: { entries: [] },
      solverName: "scipy_sparse",
      solverVersion: "not-semver",
    },
  ])("rejects missing or partial metadata %#", (metadata) => {
    expect(validateRunAnalysisIf3Metadata(metadata).ok).toBe(false);
  });

  it("rejects unbound empty metadata with BINDING_UNBOUND", () => {
    const result = validateRunAnalysisIf3Metadata({});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("BINDING_UNBOUND");
    }
  });

  it("throws a typed error from assertAuthoritativeIf3Binding", () => {
    expect(() => assertAuthoritativeIf3Binding({})).toThrow(RunAnalysisIf3BindingError);
  });
});

describe("evaluateBindingAgainstProject", () => {
  it("accepts metadata that matches the current project binding", () => {
    const project = createDefaultProject();
    const metadata = buildRunAnalysisIf3Metadata(project, { authoritative: true });
    expect(evaluateBindingAgainstProject(metadata, project).ok).toBe(true);
  });

  it("rejects unbound metadata", () => {
    const project = createDefaultProject();
    const metadata = buildRunAnalysisIf3Metadata(project);
    const unbound = {
      ...metadata,
      sourceDocumentId: parseUuid("550e8400-e29b-41d4-a716-446655440099")!,
    };
    const result = evaluateBindingAgainstProject(unbound, project);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("BINDING_DOCUMENT_MISMATCH");
    }
  });

  it("rejects version mismatch", () => {
    const project = createDefaultProject();
    const metadata = buildRunAnalysisIf3Metadata(project);
    const staleVersion = { ...metadata, sourceDocumentVersion: 99 };
    const result = evaluateBindingAgainstProject(staleVersion, project);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("BINDING_VERSION_MISMATCH");
    }
  });

  it("rejects stale checksum after project content changes", () => {
    const project = createDefaultProject();
    const metadata = buildRunAnalysisIf3Metadata(project);
    project.project = {
      ...project.project,
      description: "edited",
    };
    const result = evaluateBindingAgainstProject(metadata, project);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("BINDING_CHECKSUM_STALE");
    }
  });
});
