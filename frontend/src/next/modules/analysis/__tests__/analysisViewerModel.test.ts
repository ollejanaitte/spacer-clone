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
  const LC1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const COMBO = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  return {
    schemaId: "spacer.contracts.frame-analysis-result-resource",
    schemaVersion: "0.1.0",
    resultId: "11111111-1111-4111-8111-111111111111",
    analysisRunId: "22222222-2222-4222-8222-222222222222",
    sourceDocumentId: "33333333-3333-4333-8333-333333333333",
    sourceDocumentVersion: 1,
    sourceContentChecksum: { algorithm: "sha256", hexDigest: "a".repeat(64) },
    status,
    generatedAt: "2026-08-13T00:00:00.000Z",
    solverName: "scipy_sparse",
    solverVersion: "0.3.0",
    loadContext: {
      entries: [
        { kind: "loadCase", id: LC1, label: "DL-STRUCTURAL" },
        { kind: "combination", id: COMBO, label: "COMBO-1" },
      ],
    },
    payload: {
      nodeDisplacement: {
        schemaVersion: "0.1.0",
        rows: [
          { rowId: "11111111-1111-4111-8111-111111111101", entityKind: "node", entityId: "n1", quantity: "displacement", unit: "m/rad", values: { uz: -1 }, loadContextId: LC1 },
          { rowId: "11111111-1111-4111-8111-111111111102", entityKind: "node", entityId: "n1", quantity: "displacement", unit: "m/rad", values: { uz: -3 }, loadContextId: COMBO },
        ],
      },
      supportReaction: {
        schemaVersion: "0.1.0",
        rows: [
          { rowId: "11111111-1111-4111-8111-111111111103", entityKind: "support", entityId: "n1", quantity: "reaction", unit: "kN/kN_m", values: { fz: 10 }, loadContextId: LC1 },
        ],
      },
      memberForce: { schemaVersion: "0.1.0", rows: [] },
    },
  } as unknown as FrameAnalysisResultResource;
}

describe("analysisViewerModel (Phase 7-01 D FROZEN / WP-J)", () => {
  it("maps AnalysisDocument to a display model without mutation", () => {
    const doc = makeDoc();
    const before = JSON.stringify(doc);
    const model = buildViewerAnalysisModel(doc, makeIf3());
    expect(JSON.stringify(doc)).toBe(before); // display-only, no mutation
    expect(model.nodes).toHaveLength(10); // 6 supports + 4 intermediate girderPanel (Sol #4)
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
