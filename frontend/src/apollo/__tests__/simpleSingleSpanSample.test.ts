import { describe, expect, it } from "vitest";
import { createDefaultProject } from "../../data/defaultProject";
import {
  SIMPLE_SINGLE_SPAN_SAMPLE_INPUT,
  applySimpleSingleSpanSampleInput,
  clearBridgeStructureInput,
  deriveSingleSpanModelLength,
  generateBridgeStructureFromInput,
  getBridgeStructureInputDraft,
  validateBridgeStructureInputDraft,
  withBridgeStructureField,
} from "../bridgeStructure";

describe("simple single-span sample input", () => {
  it("validates and generates from the sample", () => {
    const p = applySimpleSingleSpanSampleInput(createDefaultProject());
    const draft = getBridgeStructureInputDraft(p);
    const v = validateBridgeStructureInputDraft(draft);
    const g = generateBridgeStructureFromInput(p, draft);
    expect(v.complete).toBe(true);
    expect(g.ok).toBe(true);
  });

  it("fills all fields with the sample values and marks the structure STALE", () => {
    const project = applySimpleSingleSpanSampleInput(createDefaultProject());
    const draft = getBridgeStructureInputDraft(project);
    expect(draft.spanLength).toBe(30.0);
    expect(draft.bridgeLength).toBe(30.0);
    expect(draft.width).toBe(10.5);
    expect(draft.girderCount).toBe(4);
    expect(draft.girderSpacing).toBe(3.0);
    expect(draft.girderDepth).toBe(2.0);
    expect(draft.topFlangeWidth).toBe(0.45);
    expect(draft.topFlangeThickness).toBe(0.025);
    expect(draft.bottomFlangeWidth).toBe(0.55);
    expect(draft.bottomFlangeThickness).toBe(0.03);
    expect(draft.webThickness).toBe(0.012);
    expect(draft.deckThickness).toBe(0.22);
    expect(draft.crossBeamSpacing).toBe(5.0);
    expect(draft.stiffenerSpacing).toBe(2.5);
    expect(draft.swayBracingInterval).toBe(1);
    expect(draft.steelUnitWeight).toBe(77.0);
    expect(draft.rcUnitWeight).toBe(24.5);
    expect(draft.lateralBracingEnabled).toBe(false);
    expect(draft.generatedAt).toBeNull();
    expect(draft.schemaVersion).toBe("1.0.0");
  });

  it("does not auto-generate a StructuralDesignModel", () => {
    const project = applySimpleSingleSpanSampleInput(createDefaultProject());
    expect(project.apolloBsdd?.structuralDesignModel).toBeUndefined();
  });

  it("clears all fields and marks the structure STALE", () => {
    const project = applySimpleSingleSpanSampleInput(createDefaultProject());
    const cleared = clearBridgeStructureInput(project);
    const draft = getBridgeStructureInputDraft(cleared);
    expect(draft.spanLength).toBeNull();
    expect(draft.bridgeLength).toBeNull();
    expect(draft.width).toBeNull();
    expect(draft.girderCount).toBeNull();
    expect(draft.girderSpacing).toBeNull();
    expect(draft.girderDepth).toBeNull();
    expect(draft.topFlangeWidth).toBeNull();
    expect(draft.topFlangeThickness).toBeNull();
    expect(draft.bottomFlangeWidth).toBeNull();
    expect(draft.bottomFlangeThickness).toBeNull();
    expect(draft.webThickness).toBeNull();
    expect(draft.deckThickness).toBeNull();
    expect(draft.crossBeamSpacing).toBeNull();
    expect(draft.stiffenerSpacing).toBeNull();
    expect(draft.swayBracingInterval).toBeNull();
    expect(draft.steelUnitWeight).toBeNull();
    expect(draft.rcUnitWeight).toBeNull();
    expect(draft.lateralBracingEnabled).toBe(false);
    expect(draft.generatedAt).toBeNull();
  });

  it("keeps unit weights as USER_PROVIDED_UNVERIFIED semantics (not adopted)", () => {
    const project = applySimpleSingleSpanSampleInput(createDefaultProject());
    const draft = getBridgeStructureInputDraft(project);
    expect(draft.steelUnitWeight).toBe(77.0);
    expect(draft.rcUnitWeight).toBe(24.5);
    expect(project.apolloBsdd?.materialDefinitions).toBeUndefined();
    expect(project.apolloBsdd?.structuralDesignModel).toBeUndefined();
  });

  it("exposes the sample values through the sample input constant", () => {
    expect(SIMPLE_SINGLE_SPAN_SAMPLE_INPUT.spanLength).toBe(30.0);
    expect(SIMPLE_SINGLE_SPAN_SAMPLE_INPUT.bridgeLength).toBe(30.0);
    expect(SIMPLE_SINGLE_SPAN_SAMPLE_INPUT.schemaVersion).toBe("1.0.0");
  });
});

describe("deriveSingleSpanModelLength", () => {
  it("derives the structural model length from the span length when unset", () => {
    const project = withBridgeStructureField(createDefaultProject(), "spanLength", 30.0);
    const draft = getBridgeStructureInputDraft(project);
    expect(deriveSingleSpanModelLength(draft)).toBe(30.0);
  });

  it("returns null when the span length is not set", () => {
    const draft = getBridgeStructureInputDraft(createDefaultProject());
    expect(deriveSingleSpanModelLength(draft)).toBeNull();
  });

  it("returns null when the structural model length is already set (no silent overwrite)", () => {
    const project = withBridgeStructureField(createDefaultProject(), "spanLength", 30.0);
    const withBoth = withBridgeStructureField(project, "bridgeLength", 95.0);
    const draft = getBridgeStructureInputDraft(withBoth);
    expect(draft.bridgeLength).toBe(95.0);
    expect(deriveSingleSpanModelLength(draft)).toBeNull();
  });
});
