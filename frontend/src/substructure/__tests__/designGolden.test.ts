// Phase C1 (M3-03) 設計エンジン golden 照合（reference validation）
// evidence/m3-03/design-result-P1.json の出力を再現できることを検証する。

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { runDesign } from "../design/designEngine";
import { generateCombo } from "../planning/samples/sampleGenerator";

const GOLDEN = join(
  __dirname,
  "../../../../substructure-planning/verification/evidence/m3-03/design-result-P1.json",
);

describe("designEngine golden reference", () => {
  it("reproduces the committed golden result for P1 (portal pier)", () => {
    const golden = JSON.parse(readFileSync(GOLDEN, "utf8"));
    const p1 = generateCombo("combo-standard")[1];
    const result = runDesign({ support: p1, projectId: "evidence" });
    expect(result.status).toBe(golden.status);
    expect(result.supportId).toBe(golden.supportId);
    expect(result.inputTrace).toEqual(golden.inputTrace);
    expect(result.geometric.totalConcreteVolume).toBeCloseTo(golden.geometric.totalConcreteVolume, 6);
    expect(result.geometric.columnVolume).toBeCloseTo(golden.geometric.columnVolume, 6);
    expect(result.diagnostics).toEqual(golden.diagnostics);
  });

  it("golden check set matches the HOLD register expectation (12 checks, all HOLD)", () => {
    const p1 = generateCombo("combo-standard")[1];
    const result = runDesign({ support: p1 });
    expect(result.checks).toHaveLength(12);
    for (const c of result.checks) {
      expect(c.status).toBe("hold_not_available");
      expect(c.requiredEvidence?.sourceDocId).toBeTruthy();
    }
  });
});
