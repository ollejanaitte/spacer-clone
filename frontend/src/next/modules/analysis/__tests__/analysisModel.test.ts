import { describe, expect, it } from "vitest";
import { buildAnalysisModel } from "../analysisModel";
import type { AnalysisSourceReferences } from "../analysisDocumentTypes";
import { TEST_GEOMETRY_SNAPSHOT, TEST_SUPERSTRUCTURE_DOCUMENT } from "./superstructureFixtures";
import { TEST_SUBSTRUCTURE_DOCUMENT } from "./substructureFixtures";

function refs(): AnalysisSourceReferences {
  return {
    bridgeLayout: { bridgeId: "B-1", documentVersion: "1", layoutFingerprint: "f-layout" },
    superstructure: {
      superstructureDocumentId: "11111111-1111-4111-8111-111111111111",
      documentVersion: "1",
      dataFingerprint: "f-super",
      geometrySnapshotFingerprint: "f-snap",
    },
    substructure: {
      substructureDocumentId: "22222222-2222-4222-8222-222222222222",
      documentVersion: "1",
      dataFingerprint: "f-sub",
    },
    loadFingerprint: "f-load",
    solverSettingsFingerprint: "f-solver",
  };
}

describe("analysisModel (Phase 7-01 C FROZEN / WP-E)", () => {
  it("assembles a complete FEM model from super+sub fragments", () => {
    const result = buildAnalysisModel({
      projectId: "p-1",
      createdBy: "test",
      superstructure: TEST_SUPERSTRUCTURE_DOCUMENT,
      substructure: TEST_SUBSTRUCTURE_DOCUMENT,
      snapshot: TEST_GEOMETRY_SNAPSHOT,
      sourceReferences: refs(),
    });
    expect(result.ok).toBe(true);
    expect(result.document.nodes).toHaveLength(6);
    expect(result.document.members.filter((m) => m.memberKind === "mainGirder")).toHaveLength(4);
    expect(result.document.sections.length).toBeGreaterThanOrEqual(4);
    expect(result.document.materials).toHaveLength(1);
    // supports resolved per bearing seat (6) with no extra placement-only supports
    expect(result.document.supports).toHaveLength(6);
    expect(result.document.bearings).toHaveLength(6);
    // foundation springs closed as SOURCE_NOT_AVAILABLE (3 supports)
    expect(result.document.foundationSprings).toHaveLength(3);
    expect(result.document.validation.ok).toBe(true);
    expect(result.document.modelChecksum).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic (same upstream -> same model checksum)", () => {
    const a = buildAnalysisModel({
      projectId: "p-1",
      createdBy: "test",
      superstructure: TEST_SUPERSTRUCTURE_DOCUMENT,
      substructure: TEST_SUBSTRUCTURE_DOCUMENT,
      snapshot: TEST_GEOMETRY_SNAPSHOT,
      sourceReferences: refs(),
    });
    const b = buildAnalysisModel({
      projectId: "p-1",
      createdBy: "test",
      superstructure: TEST_SUPERSTRUCTURE_DOCUMENT,
      substructure: TEST_SUBSTRUCTURE_DOCUMENT,
      snapshot: TEST_GEOMETRY_SNAPSHOT,
      sourceReferences: refs(),
    });
    expect(a.document.modelChecksum).toBe(b.document.modelChecksum);
    expect(a.document.nodes.map((n) => n.entityId)).toEqual(b.document.nodes.map((n) => n.entityId));
  });

  it("works without a substructure document (superstructure-only support)", () => {
    const result = buildAnalysisModel({
      projectId: "p-1",
      createdBy: "test",
      superstructure: TEST_SUPERSTRUCTURE_DOCUMENT,
      substructure: null,
      snapshot: TEST_GEOMETRY_SNAPSHOT,
      sourceReferences: refs(),
    });
    expect(result.document.nodes).toHaveLength(6);
    expect(result.document.foundationSprings).toHaveLength(0);
    expect(result.document.validation.ok).toBe(true);
  });

  it("surfaces NOT_AVAILABLE when the girder section is missing (fail-closed)", () => {
    const doc = {
      ...TEST_SUPERSTRUCTURE_DOCUMENT,
      girderConfiguration: {
        ...TEST_SUPERSTRUCTURE_DOCUMENT.girderConfiguration,
        girderSectionModel: {
          depthM: null,
          webThicknessM: null,
          topFlange: null,
          bottomFlange: null,
          areaM2: null,
          unitWeightPerM: null,
        },
      },
    };
    const result = buildAnalysisModel({
      projectId: "p-1",
      createdBy: "test",
      superstructure: doc,
      substructure: TEST_SUBSTRUCTURE_DOCUMENT,
      snapshot: TEST_GEOMETRY_SNAPSHOT,
      sourceReferences: refs(),
    });
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.message.includes("NOT_AVAILABLE"))).toBe(true);
  });

  it("keeps analysisStatus NOT_RUN and empty load cases (WP-F fills them)", () => {
    const result = buildAnalysisModel({
      projectId: "p-1",
      createdBy: "test",
      superstructure: TEST_SUPERSTRUCTURE_DOCUMENT,
      substructure: TEST_SUBSTRUCTURE_DOCUMENT,
      snapshot: TEST_GEOMETRY_SNAPSHOT,
      sourceReferences: refs(),
    });
    expect(result.document.analysisStatus).toBe("NOT_RUN");
    expect(result.document.loadCases).toHaveLength(0);
    expect(result.document.loadCombinations).toHaveLength(0);
  });
});
