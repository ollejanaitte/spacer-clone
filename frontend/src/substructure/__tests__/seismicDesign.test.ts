// Phase C1 (M3-04) 耐震設計 フレームワーク テスト
import { describe, it, expect } from "vitest";
import {
  extractSeismicCases,
  buildSeismicCheck,
  summarizeSeismicInput,
} from "../design/seismicDesign";
import { generateCombo } from "../planning/samples/sampleGenerator";
import type { ReactionCaseData } from "../design/designTypes";

const CASES: ReactionCaseData[] = [
  { caseId: "DL", caseKind: "permanent", force: { x: 0, y: 0, z: -3325.5 } },
  { caseId: "LL", caseKind: "liveLoad", force: { x: 0, y: 0, z: -1378.9 } },
  { caseId: "EQ1", caseKind: "seismicLevel1", force: { x: 0, y: -1824.37, z: 0 } },
  { caseId: "EQ2", caseKind: "seismicLevel2", force: { x: 0, y: -2500, z: 0 } },
];

describe("extractSeismicCases", () => {
  it("separates seismic L1 input from normal design input", () => {
    const l1 = extractSeismicCases(CASES, "level1");
    expect(l1).toHaveLength(1);
    expect(l1[0].caseId).toBe("EQ1");
    expect(l1[0].force?.y).toBe(-1824.37);
  });

  it("separates seismic L2 input", () => {
    const l2 = extractSeismicCases(CASES, "level2");
    expect(l2).toHaveLength(1);
    expect(l2[0].caseId).toBe("EQ2");
  });

  it("returns empty when no seismic case present", () => {
    const normal = CASES.filter((c) => c.caseKind === "permanent");
    expect(extractSeismicCases(normal, "level1")).toEqual([]);
  });
});

describe("buildSeismicCheck", () => {
  it("returns HOLD_NOT_AVAILABLE with evidence for L1", () => {
    const support = generateCombo("combo-standard")[1];
    const result = buildSeismicCheck(support, "level1");
    expect(result.status).toBe("hold_not_available");
    expect(result.checkId).toBe("M3-CHK-SEISMIC-L1");
    expect(result.requiredEvidence.decisionId).toBe("未発行");
  });

  it("returns HOLD_NOT_AVAILABLE with evidence for L2", () => {
    const support = generateCombo("combo-standard")[1];
    const result = buildSeismicCheck(support, "level2");
    expect(result.checkId).toBe("M3-CHK-SEISMIC-L2");
    expect(result.status).toBe("hold_not_available");
  });
});

describe("summarizeSeismicInput", () => {
  it("summarizes the separated seismic input", () => {
    const summary = summarizeSeismicInput({
      supportId: "PR1",
      level: "level1",
      reactions: extractSeismicCases(CASES, "level1"),
    });
    expect(summary.caseCount).toBe(1);
    expect(summary.hasForce).toBe(true);
  });
});
