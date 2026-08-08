// Phase C1 (A-03) Test Calculation Engine テスト
import { describe, it, expect } from "vitest";
import {
  calculateTest,
  buildCalculationId,
  TEST_ENGINE_TYPE,
} from "../design/testCalculationEngine";
import { mapSupportToAdapterInput } from "../design/adapterMapper";
import { validateAdapterResult } from "../design/calculationAdapter";
import { generateCombo, generateSample } from "../planning/samples/sampleGenerator";
import type { Support } from "../model";

function adapterFor(support: Support) {
  const result = mapSupportToAdapterInput(support);
  if (!result.ok || !result.value) throw new Error("mapper failed");
  return result.value;
}

describe("calculateTest (deterministic)", () => {
  const p1 = generateCombo("combo-standard")[1];
  const input = adapterFor(p1);

  it("returns TEST_PASS for a valid pier with geometric checks", () => {
    const result = calculateTest(input);
    expect(result.status).toBe("TEST_PASS");
    expect(result.engineType).toBe(TEST_ENGINE_TYPE);
    expect(result.engineLabel).toBe("TEST");
    expect(result.isFormalDesign).toBe(false);
    expect(result.supportId).toBe("P1");
    expect(result.checks.some((c) => c.checkId === "TEST-FOOTING-VOLUME")).toBe(true);
  });

  it("same input -> same result (deterministic)", () => {
    const a = calculateTest(input);
    const b = calculateTest(input);
    expect(a.calculationId).toBe(b.calculationId);
    expect(a.status).toBe(b.status);
    expect(a.checks).toEqual(b.checks);
  });

  it("calculationId changes when geometry changes", () => {
    const a = calculateTest(input);
    const changed = JSON.parse(JSON.stringify(input));
    changed.geometry.footing.thickness = 2.5;
    const b = calculateTest(changed);
    expect(a.calculationId).not.toBe(b.calculationId);
  });

  it("generates a stable calculationId for identical input", () => {
    expect(buildCalculationId(input)).toBe(buildCalculationId(input));
  });
});

describe("calculateTest (piles / abutment)", () => {
  const bored = generateSample("foundation_bored", "S1", 0);

  it("reports pile length TEST check for bored pile", () => {
    const result = calculateTest(adapterFor(bored));
    expect(result.status).toBe("TEST_PASS");
    const pile = result.checks.find((c) => c.checkId === "TEST-PILE-LENGTH")!;
    expect(pile.status).toBe("TEST_PASS");
    expect(Number(pile.value)).toBeGreaterThan(0);
  });

  it("does not claim formal safety", () => {
    const result = calculateTest(adapterFor(bored));
    expect(result.warnings.join("")).toContain("正式な設計判定ではない");
  });
});

describe("calculateTest (fail-closed)", () => {
  it("returns ERROR for an invalid input without running checks", () => {
    const input = adapterFor(generateCombo("combo-standard")[1]);
    const bad = { ...input, supportId: "" } as never;
    const result = calculateTest(bad);
    expect(result.status).toBe("ERROR");
    expect(result.errors.join("")).toContain("supportId");
    expect(result.checks).toHaveLength(0);
  });

  it("returns ERROR when engine is unavailable", () => {
    const input = adapterFor(generateCombo("combo-standard")[1]);
    const result = calculateTest(input, { simulateUnavailable: true });
    expect(result.status).toBe("ERROR");
    expect(result.errors.join("")).toContain("利用できません");
  });
});

describe("validate result contract", () => {
  it("test result passes the adapter result validation", () => {
    const input = adapterFor(generateCombo("combo-standard")[1]);
    const result = calculateTest(input);
    expect(validateAdapterResult(result)).toEqual([]);
  });
});
