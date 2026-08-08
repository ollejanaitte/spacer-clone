// Phase C1 (A-05) Adapter Save/Load Round Trip テスト
import { describe, it, expect } from "vitest";
import {
  serializeAdapterEnvelope,
  deserializeAdapterEnvelope,
  isAdapterResultStale,
} from "../design/adapterPersistence";
import { mapSupportToAdapterInput, modelRevisionOf } from "../design/adapterMapper";
import { calculateTest } from "../design/testCalculationEngine";
import { generateCombo } from "../planning/samples/sampleGenerator";
import type { Support } from "../model";
import type { AdapterCalculationState } from "../design/adapterPersistence";

function clone(support: Support): Support {
  return JSON.parse(JSON.stringify(support)) as Support;
}

function buildCalculation(supports: readonly Support[]): AdapterCalculationState {
  const inputs: AdapterCalculationState["inputs"] = {};
  const results: AdapterCalculationState["results"] = {};
  for (const s of supports) {
    const mapped = mapSupportToAdapterInput(s);
    if (!mapped.ok || !mapped.value) throw new Error("mapper failed");
    inputs[s.supportId] = mapped.value;
    results[s.supportId] = calculateTest(mapped.value);
  }
  return { inputs, results, engineType: "test-mock", engineVersion: "0.1.0" };
}

describe("serializeAdapterEnvelope", () => {
  it("wraps supports and calculation state", () => {
    const supports = generateCombo("combo-standard");
    const calc = buildCalculation(supports);
    const result = serializeAdapterEnvelope({ supports, calculation: calc });
    expect(result.ok).toBe(true);
    const envelope = result.value!.envelope;
    expect(envelope.schemaVersion).toBe("0.1.0");
    expect(envelope.project.supports.map((s) => s.supportId)).toEqual(["A1", "P1", "P2", "A2"]);
    expect(envelope.calculation!.engineType).toBe("test-mock");
    expect(Object.keys(envelope.calculation!.results)).toContain("P1");
  });

  it("rejects result supportId mismatch (fail-closed)", () => {
    const supports = generateCombo("combo-standard");
    const calc = buildCalculation(supports);
    const bad = JSON.parse(JSON.stringify(calc));
    const result = bad.results.P1;
    result.supportId = "OTHER";
    bad.results.P1 = result;
    const result2 = serializeAdapterEnvelope({ supports, calculation: bad });
    expect(result2.ok).toBe(false);
    expect(result2.diagnostics.join("")).toContain("supportId mismatch");
  });

  it("rejects invalid saved result (fail-closed)", () => {
    const supports = generateCombo("combo-standard");
    const calc = buildCalculation(supports);
    const bad = JSON.parse(JSON.stringify(calc));
    bad.results.P1.status = "ok";
    const result = serializeAdapterEnvelope({ supports, calculation: bad });
    expect(result.ok).toBe(false);
  });
});

describe("deserializeAdapterEnvelope (round trip)", () => {
  it("restores supports, inputs and results identically", () => {
    const supports = generateCombo("combo-standard");
    const calc = buildCalculation(supports);
    const serialized = serializeAdapterEnvelope({ supports, calculation: calc });
    const loaded = deserializeAdapterEnvelope(serialized.value!.json);
    expect(loaded.ok).toBe(true);
    expect(loaded.value!.supports).toEqual(supports);
    expect(loaded.value!.calculation!.engineType).toBe("test-mock");
    const p1 = loaded.value!.calculation!.results.P1;
    expect(p1.supportId).toBe("P1");
    expect(p1.status).toBe("TEST_PASS");
    expect(loaded.value!.calculation!.inputs.P1.modelRevision).toBe(modelRevisionOf(supports[1]));
    expect(loaded.value!.staleSupportIds).toEqual([]);
  });

  it("restores calculationId identically", () => {
    const supports = generateCombo("combo-standard");
    const calc = buildCalculation(supports);
    const before = calc.results.P1.calculationId;
    const serialized = serializeAdapterEnvelope({ supports, calculation: calc });
    const loaded = deserializeAdapterEnvelope(serialized.value!.json);
    expect(loaded.value!.calculation!.results.P1.calculationId).toBe(before);
  });

  it("loads legacy plain project format (backward compat)", () => {
    const supports = generateCombo("combo-standard");
    const legacy = JSON.stringify({
      schemaVersion: "0.2.0",
      projectId: "legacy",
      source: "c1",
      coordinateSystem: "x-longitudinal-y-transverse-z-up",
      unitSystem: "si",
      alignmentRefs: [],
      supports,
      metadata: { sourceApplication: "x", sourceVersion: "1", sourceRevision: "1", createdAt: "", updatedAt: "" },
    });
    const loaded = deserializeAdapterEnvelope(legacy);
    expect(loaded.ok).toBe(true);
    expect(loaded.value!.supports).toHaveLength(4);
    expect(loaded.value!.calculation).toBeNull();
  });
});

describe("stale detection", () => {
  it("flags stale result when the model changed after calculation", () => {
    const supports = generateCombo("combo-standard");
    const calc = buildCalculation(supports);
    const serialized = serializeAdapterEnvelope({ supports, calculation: calc });
    // モデルを変更してから Load
    const changed = supports.map((s) => (s.supportId === "P1" ? clone(s) : s));
    const p1 = changed[1];
    p1.pier!.footing.thickness = 3.0;
    const loaded = deserializeAdapterEnvelope(serialized.value!.json);
    // loaded supports は保存時モデル。changed と比較すると stale になる
    const stale = loaded.value!.supports.some(
      (s, i) => isAdapterResultStale(loaded.value!.calculation!.inputs[s.supportId], s) && s.supportId === "P1",
    );
    // 保存時の supports は計算時と一致 → 本来 stale ではない
    expect(stale).toBe(false);
    // changed モデルに対しては stale
    expect(isAdapterResultStale(loaded.value!.calculation!.inputs.P1, p1)).toBe(true);
  });
});
