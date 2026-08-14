import { describe, expect, it } from "vitest";
import { extractLinearStaticResultFromIf3 } from "../resultAdapter";
import type { FrameAnalysisResultResource } from "../../../../contracts/frameAnalysisResultResource";

const LC1_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const COMBO_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

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
    loadContext: {
      entries: [
        { kind: "loadCase", id: LC1_ID, label: "LC1" },
        { kind: "combination", id: COMBO_ID, label: "COMBO-1" },
      ],
    },
    payload: {
      nodeDisplacement: {
        schemaVersion: "0.1.0",
        rows: [
          { rowId: "11111111-1111-4111-8111-111111111101", entityKind: "node", entityId: "n1", quantity: "displacement", unit: "m/rad", values: { ux: 0, uy: 0, uz: -1 }, loadContextId: LC1_ID },
          { rowId: "11111111-1111-4111-8111-111111111102", entityKind: "node", entityId: "n1", quantity: "displacement", unit: "m/rad", values: { ux: 0, uy: 0, uz: -3 }, loadContextId: COMBO_ID },
        ],
      },
      supportReaction: {
        schemaVersion: "0.1.0",
        rows: [
          { rowId: "11111111-1111-4111-8111-111111111103", entityKind: "support", entityId: "n1", quantity: "reaction", unit: "kN/kN_m", values: { fx: 0, fy: 0, fz: 10, mx: 0, my: 0, mz: 0 }, loadContextId: LC1_ID },
          { rowId: "11111111-1111-4111-8111-111111111104", entityKind: "support", entityId: "n1", quantity: "reaction", unit: "kN/kN_m", values: { fx: 0, fy: 0, fz: 30, mx: 0, my: 0, mz: 0 }, loadContextId: COMBO_ID },
        ],
      },
      memberForce: {
        schemaVersion: "0.1.0",
        rows: [
          { rowId: "11111111-1111-4111-8111-111111111105", entityKind: "member", entityId: "m1", quantity: "memberEndForce", unit: "kN/kN_m", values: { "i.fx": 1, "i.fy": 0, "i.fz": 0, "i.mx": 0, "i.my": 0, "i.mz": 0, "j.fx": -1, "j.fy": 0, "j.fz": 0, "j.mx": 0, "j.my": 0, "j.mz": 0 }, loadContextId: LC1_ID },
          { rowId: "11111111-1111-4111-8111-111111111106", entityKind: "member", entityId: "m1", quantity: "memberEndForce", unit: "kN/kN_m", values: { "i.fx": 3, "i.fy": 0, "i.fz": 0, "i.mx": 0, "i.my": 0, "i.mz": 0, "j.fx": -3, "j.fy": 0, "j.fz": 0, "j.mx": 0, "j.my": 0, "j.mz": 0 }, loadContextId: COMBO_ID },
        ],
      },
    },
  } as unknown as FrameAnalysisResultResource;
}

describe("resultAdapter (Phase 7-01 D FROZEN / WP-H)", () => {
  it("extracts reactions via fz directly (R10: no rz alias)", () => {
    const view = extractLinearStaticResultFromIf3(makeResource());
    const reaction = view.reactions.find((r) => r.loadCaseId === "LC1");
    expect(reaction).toBeDefined();
    expect(reaction!.fz).toBe(10);
  });

  it("exposes COMBO-1 rows via loadContext label", () => {
    const view = extractLinearStaticResultFromIf3(makeResource());
    const combo = view.combinations.find((c) => c.caseId === "COMBO-1");
    expect(combo!.displacements).toBe(1);
    expect(combo!.reactions).toBe(1);
    expect(combo!.memberForces).toBe(1);
    const comboReaction = view.reactions.find((r) => r.loadCaseId === "COMBO-1");
    expect(comboReaction!.fz).toBe(30);
  });

  it("extracts member force i/j components from flat keys", () => {
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
