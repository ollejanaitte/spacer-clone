import { describe, expect, it } from "vitest";
import { buildRb001Analysis, describeRb001Analysis } from "../analysis";
import { buildRb001Superstructure } from "../superstructure";
import { buildRb001Substructure } from "../substructure";
import { RB001_BRIDGE_ID } from "../bridgeArrangement";

describe("S-7 Analysis Sample (RB001-ANL-1)", () => {
  it("builds an analysis document through the existing engine (NOT_RUN, no fabricated results)", () => {
    const result = buildRb001Analysis();
    expect(result.document.analysisStatus).toBe("NOT_RUN");
    expect(result.document.loadCases).toHaveLength(0);
    expect(result.document.loadCombinations).toHaveLength(0);
  });

  it("has nodes, members, supports and bearings matching the 6-span bridge", () => {
    const summary = describeRb001Analysis();
    expect(summary.documentId).toMatch(/^[0-9a-f]{8}-/);
    expect(summary.supportCount).toBeGreaterThanOrEqual(7);
    expect(summary.bearingCount).toBeGreaterThanOrEqual(7);
    expect(summary.nodeCount).toBeGreaterThan(0);
    expect(summary.memberCount).toBeGreaterThan(0);
  });

  it("is aligned with the superstructure / substructure / bridge layout", () => {
    const result = buildRb001Analysis();
    const superDoc = buildRb001Superstructure();
    const subDoc = buildRb001Substructure();

    expect(superDoc.bridgeLayoutReference?.bridgeId).toBe(RB001_BRIDGE_ID);
    expect(subDoc.bridgeLayoutReference?.bridgeId).toBe(RB001_BRIDGE_ID);
    expect(subDoc.superstructureReference?.superstructureDocumentId).toBe("RB001-SUPER-1");
    // analysis は同一 RB001 bridge を sourceReferences で参照
    expect(result.document.sourceReferences.bridgeLayout?.bridgeId).toBe(RB001_BRIDGE_ID);
  });

  it("does not fabricate analysis results (analysisStatus stays NOT_RUN)", () => {
    const { document } = buildRb001Analysis();
    expect(document.analysisStatus).toBe("NOT_RUN");
    expect(document.resultReferences).toEqual([]);
    expect(document.resultDigest).toBeNull();
  });

  it("fails closed on undeclared girder section (NOT_AVAILABLE, no fabricated analysis)", () => {
    // RB001 superstructure の girder section は未宣言 (null)。分析実行は不可能であり、
    // 既存 engine が fail-closed で NOT_AVAILABLE を報告する (架空数値を作らない)。
    const result = buildRb001Analysis();
    expect(result.ok).toBe(false);
    expect(
      result.issues.some((i) => i.message.includes("NOT_AVAILABLE")),
    ).toBe(true);
    expect(result.document.validation.ok).toBe(false);
    expect(
      result.document.validation.issues.some((i) => i.path === "sections[SECTION-GIRDER]"),
    ).toBe(true);
  });
});