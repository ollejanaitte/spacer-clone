// Phase C1 (M3-04) 配筋設計 フレームワーク テスト
import { describe, it, expect } from "vitest";
import {
  buildReinforcementRequirement,
  buildReinforcementArrangements,
  candidateReinforcementLocations,
} from "../design/reinforcementDesign";
import { generateCombo, generateSample } from "../planning/samples/sampleGenerator";

describe("candidateReinforcementLocations", () => {
  it("lists pier locations for a pier", () => {
    const pier = generateCombo("combo-standard")[1];
    const locs = candidateReinforcementLocations(pier);
    expect(locs).toContain("pier_column");
    expect(locs).toContain("pier_cap");
    expect(locs).toContain("footing");
  });

  it("lists abutment locations for an abutment", () => {
    const abut = generateCombo("combo-standard")[0];
    const locs = candidateReinforcementLocations(abut);
    expect(locs).toContain("abutment_backwall");
    expect(locs).toContain("abutment_wing");
  });

  it("includes pile location when pile group exists", () => {
    const bored = generateSample("foundation_bored", "S1", 0);
    const locs = candidateReinforcementLocations(bored);
    expect(locs).toContain("pile");
  });
});

describe("buildReinforcementRequirement", () => {
  it("returns HOLD_NOT_AVAILABLE with evidence and no invented values", () => {
    const support = generateCombo("combo-standard")[1];
    const req = buildReinforcementRequirement(support);
    expect(req.status).toBe("hold_not_available");
    expect(req.requiredEvidence.decisionId).toBe("未発行");
    expect(req.locations.length).toBeGreaterThan(0);
  });
});

describe("buildReinforcementArrangements", () => {
  it("produces structural placeholders without numeric values", () => {
    const support = generateSample("foundation_bored", "S1", 0);
    const arrangements = buildReinforcementArrangements(support);
    expect(arrangements.length).toBeGreaterThan(0);
    for (const a of arrangements) {
      expect(a.status).toBe("hold_not_available");
      expect(a.barDiameter).toBeNull();
      expect(a.spacing).toBeNull();
      expect(a.cover).toBeNull();
    }
  });
});
