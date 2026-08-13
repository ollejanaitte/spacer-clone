import { describe, expect, it } from "vitest";
import { buildViewerAnalysisModel, buildViewerResultRows } from "../analysisViewerModel";
import type { AnalysisDocument } from "../analysisDocumentTypes";
import type { FrameAnalysisResultResource } from "../../../../contracts/frameAnalysisResultResource";
import { TEST_GEOMETRY_SNAPSHOT, TEST_SUPERSTRUCTURE_DOCUMENT } from "./superstructureFixtures";
import { TEST_SUBSTRUCTURE_DOCUMENT } from "./substructureFixtures";
import { buildAnalysisModel } from "../analysisModel";

function makeDoc(): AnalysisDocument {
  const result = buildAnalysisModel({
    projectId: "p-1",
    createdBy: "test",
    superstructure: TEST_SUPERSTRUCTURE_DOCUMENT,
    substructure: TEST_SUBSTRUCTURE_DOCUMENT,
    snapshot: TEST_GEOMETRY_SNAPSHOT,
    sourceReferences: {
      bridgeLayout: { bridgeId: "B-1", documentVersion: "1", layoutFingerprint: "f" },
      superstructure: {
        superstructureDocumentId: "11111111-1111-4111-8111-111111111111",
        documentVersion: "1",
        dataFingerprint: "f",
        geometrySnapshotFingerprint: "f",
      },
      substructure: {
        substructureDocumentId: "22222222-2222-4222-8222-222222222222",
        documentVersion: "1",
        dataFingerprint: "f",
      },
      loadFingerprint: "f",
      solverSettingsFingerprint: "f",
    },
  });
  return result.document;
}

function makeIf3(status = "SUCCEEDED"): FrameAnalysisResultResource {
  return {
    status,
    payload: {
      nodeDisplacement: [
        { loadCaseId: "DL-STRUCTURAL", entityId: "n1", values: { uz: -1 } },
        { loadCaseId: "COMBO-1", entityId: "n1", values: { uz: -3 } },
      ],
      supportReaction: [
        { loadCaseId: "DL-STRUCTURAL", nodeId: "n1", supportId: "s1", values: { fz: 10 } },
      ],
      memberForce: [],
    },
  } as unknown as FrameAnalysisResultResource;
}

describe("analysisViewerModel (Phase 7-01 D FROZEN / WP-J)", () => {
  it("maps AnalysisDocument to a display model without mutation", () => {
    const doc = makeDoc();
    const before = JSON.stringify(doc);
    const model = buildViewerAnalysisModel(doc, makeIf3());
    expect(JSON.stringify(doc)).toBe(before); // display-only, no mutation
    expect(model.nodes).toHaveLength(6);
    expect(model.members.length).toBeGreaterThan(0);
    expect(model.supports).toHaveLength(6);
    expect(model.bearings).toHaveLength(6);
    expect(model.springs).toHaveLength(3); // foundation springs SOURCE_NOT_AVAILABLE
    expect(model.analysisStatus).toBe("NOT_RUN");
    expect(model.resultStatus).toBe("SUCCEEDED");
  });

  it("surfaces result status when no IF3 resource exists", () => {
    const doc = makeDoc();
    const model = buildViewerAnalysisModel(doc, null);
    expect(model.resultStatus).toBe("NOT_RUN");
  });

  it("builds per-case result rows including COMBO-1", () => {
    const rows = buildViewerResultRows(makeIf3());
    expect(rows.caseIds).toContain("DL-STRUCTURAL");
    expect(rows.caseIds).toContain("COMBO-1");
    expect(rows.reactions[0].fz).toBe(10);
  });

  it("keeps sourceEntityId for traceability (R12)", () => {
    const doc = makeDoc();
    const model = buildViewerAnalysisModel(doc, null);
    for (const node of model.nodes) {
      expect(node.sourceEntityId.length).toBeGreaterThan(0);
    }
  });
});
