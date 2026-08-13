import { describe, expect, it } from "vitest";
import { extractLinearStaticResultFromIf3 } from "../resultAdapter";
import type { FrameAnalysisResultResource } from "../../../../contracts/frameAnalysisResultResource";

function makeResource(): FrameAnalysisResultResource {
  return {
    schemaId: "spacer.contracts.frame-analysis-result-resource",
    schemaVersion: "0.1.0",
    resultId: "11111111-1111-4111-8111-111111111111",
    analysisRunId: "22222222-2222-4222-8222-222222222222",
    sourceDocumentId: "33333333-3333-4333-8333-333333333333",
    sourceDocumentVersion: 1,
    sourceContentChecksum: { algorithm: "sha256", hexDigest: "a".repeat(64) },
    analysisSettingsChecksum: { algorithm: "sha256", hexDigest: "b".repeat(64) },
    solverName: "scipy_sparse",
    solverVersion: "0.3.0",
    status: "SUCCEEDED",
    generatedAt: "2026-08-13T00:00:00.000Z",
    resultChecksum: { algorithm: "sha256", hexDigest: "c".repeat(64) },
    payload: {
      nodeDisplacement: [
        { loadCaseId: "LC1", entityId: "n1", values: { ux: 0, uy: 0, uz: -1 } },
        { loadCaseId: "COMBO-1", entityId: "n1", values: { ux: 0, uy: 0, uz: -3 } },
      ],
      supportReaction: [
        { loadCaseId: "LC1", nodeId: "n1", supportId: "s1", values: { fx: 0, fy: 0, fz: 10, mx: 0, my: 0, mz: 0 } },
        { loadCaseId: "COMBO-1", nodeId: "n1", supportId: "s1", values: { fx: 0, fy: 0, fz: 30, mx: 0, my: 0, mz: 0 } },
      ],
      memberForce: [
        { loadCaseId: "LC1", entityId: "m1", values: { i: { fx: 1, fy: 0, fz: 0, mx: 0, my: 0, mz: 0 }, j: { fx: -1, fy: 0, fz: 0, mx: 0, my: 0, mz: 0 } } },
        { loadCaseId: "COMBO-1", entityId: "m1", values: { i: { fx: 3, fy: 0, fz: 0, mx: 0, my: 0, mz: 0 }, j: { fx: -3, fy: 0, fz: 0, mx: 0, my: 0, mz: 0 } } },
      ],
    },
  } as unknown as FrameAnalysisResultResource;
}

describe("resultAdapter (Phase 7-01 D FROZEN / WP-H)", () => {
  it("extracts reactions via fz directly (R10: no rz alias)", () => {
    const view = extractLinearStaticResultFromIf3(makeResource());
    const reaction = view.reactions.find((r) => r.loadCaseId === "LC1");
    expect(reaction).toBeDefined();
    expect(reaction!.fz).toBe(10);
    expect(reaction!.supportId).toBe("s1");
  });

  it("exposes COMBO-1 rows", () => {
    const view = extractLinearStaticResultFromIf3(makeResource());
    const combo = view.combinations.find((c) => c.caseId === "COMBO-1");
    expect(combo!.displacements).toBe(1);
    expect(combo!.reactions).toBe(1);
    expect(combo!.memberForces).toBe(1);
    const comboReaction = view.reactions.find((r) => r.loadCaseId === "COMBO-1");
    expect(comboReaction!.fz).toBe(30);
  });

  it("extracts member force i/j components", () => {
    const view = extractLinearStaticResultFromIf3(makeResource());
    const member = view.memberForces.find((m) => m.loadCaseId === "LC1");
    expect(member!.i.fx).toBe(1);
    expect(member!.j.fx).toBe(-1);
  });

  it("is deterministic and returns empty views for empty payloads", () => {
    const empty = {
      ...makeResource(),
      payload: {},
    } as unknown as FrameAnalysisResultResource;
    const view = extractLinearStaticResultFromIf3(empty);
    expect(view.displacements).toHaveLength(0);
    expect(view.reactions).toHaveLength(0);
    expect(view.memberForces).toHaveLength(0);
  });
});
