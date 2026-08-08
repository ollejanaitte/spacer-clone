// Phase C1 (M3-03) 設計計算エンジン（フレームワーク）テスト
import { describe, it, expect } from "vitest";
import {
  runDesign,
  aggregateStatus,
  buildHoldChecks,
  type DesignCheckResult,
} from "../design/designEngine";
import { generateCombo, generateSample } from "../planning/samples/sampleGenerator";
import type { SupportReactions } from "../design/designTypes";

describe("aggregateStatus", () => {
  it("returns hold when any check is hold_not_available", () => {
    const checks: DesignCheckResult[] = [
      { checkId: "A", checkName: "a", status: "ok", reason: "" },
      { checkId: "B", checkName: "b", status: "hold_not_available", reason: "x" },
    ];
    expect(aggregateStatus(checks)).toBe("hold_not_available");
  });

  it("returns ng when any check fails", () => {
    const checks: DesignCheckResult[] = [
      { checkId: "A", checkName: "a", status: "ok", reason: "" },
      { checkId: "B", checkName: "b", status: "ng", reason: "x" },
    ];
    expect(aggregateStatus(checks)).toBe("ng");
  });

  it("returns ok when all pass", () => {
    const checks: DesignCheckResult[] = [
      { checkId: "A", checkName: "a", status: "ok", reason: "" },
    ];
    expect(aggregateStatus(checks)).toBe("ok");
  });
});

describe("runDesign", () => {
  it("returns HOLD_NOT_AVAILABLE status for a pier with traceable checks", () => {
    const support = generateCombo("combo-standard")[1]; // P1 portal
    const result = runDesign({ support, projectId: "test" });
    expect(result.status).toBe("hold_not_available");
    expect(result.supportId).toBe("P1");
    expect(result.checks.length).toBeGreaterThan(0);
    for (const c of result.checks) {
      expect(c.status).toBe("hold_not_available");
      expect(c.requiredEvidence?.decisionId).toBe("未発行");
    }
  });

  it("records the input trace (dimensions)", () => {
    const support = generateCombo("combo-standard")[1];
    const result = runDesign({ support });
    expect(result.inputTrace.supportId).toBe("P1");
    expect(result.inputTrace.footing?.length).toBe(10);
  });

  it("carries reactions as input data (not checks)", () => {
    const support = generateCombo("combo-standard")[1];
    const reactions: SupportReactions = {
      supportId: "P1",
      cases: [{ caseId: "DL", caseKind: "permanent", force: { x: 0, y: 0, z: -3325.5 } }],
    };
    const result = runDesign({ support, reactions });
    expect(result.reactions).toHaveLength(1);
    expect(result.reactions[0].force?.z).toBe(-3325.5);
  });

  it("computes geometric quantities within the result", () => {
    const support = generateSample("foundation_bored", "S1", 0);
    const result = runDesign({ support });
    expect(result.geometric.totalPileLength).toBeGreaterThan(0);
    expect(Number.isFinite(result.geometric.totalConcreteVolume)).toBe(true);
  });

  it("produces no NaN/Infinity in diagnostics (finite guards)", () => {
    const support = generateCombo("combo-standard")[1];
    const result = runDesign({ support });
    expect(result.diagnostics).toEqual([]);
  });

  it("is deterministic for the same input", () => {
    const support = generateCombo("combo-standard")[1];
    const a = runDesign({ support });
    const b = runDesign({ support });
    expect(a.status).toBe(b.status);
    expect(a.checks.map((c) => c.checkId)).toEqual(b.checks.map((c) => c.checkId));
  });

  it("includes pier-specific checks for piers and pile checks when piles exist", () => {
    const pier = generateCombo("combo-standard")[1];
    const pierIds = buildHoldChecks(pier).map((c) => c.checkId);
    expect(pierIds).toContain("M3-CHK-MEMBER-PIER-AXIAL");

    const bored = generateSample("foundation_bored", "S1", 0);
    const pileIds = buildHoldChecks(bored).map((c) => c.checkId);
    expect(pileIds).toContain("M3-CHK-PILE-STRUCTURE");
    expect(pileIds).toContain("M3-CHK-PILE-GROUP");
  });
});
