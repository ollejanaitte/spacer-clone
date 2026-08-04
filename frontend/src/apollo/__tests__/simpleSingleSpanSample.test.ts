import { describe, expect, it } from "vitest";
import { createDefaultProject } from "../../data/defaultProject";
import {
  PRESENCE_STATUS,
  SAMPLE_PRESET_CATALOG,
  SIMPLE_SINGLE_SPAN_SAMPLE_INPUT,
  applyAndGenerateSimpleSingleSpanSample,
  applySimpleSingleSpanSampleInput,
  clearBridgeStructureInput,
  deriveSingleSpanModelLength,
  generateBridgeStructureFromInput,
  getBridgeStructureInputDraft,
  validateBridgeStructureInputDraft,
  withBridgeStructureField,
} from "../bridgeStructure";
import { buildApolloVisualizationModelOrThrow } from "../visualization";

describe("simple single-span complete sample input (Step 5-3 P1)", () => {
  it("validates and generates from the complete sample", () => {
    const p = applySimpleSingleSpanSampleInput(createDefaultProject());
    const draft = getBridgeStructureInputDraft(p);
    const v = validateBridgeStructureInputDraft(draft);
    const g = generateBridgeStructureFromInput(p, draft);
    expect(v.complete).toBe(true);
    expect(g.ok).toBe(true);
  });

  it("fills basics + appurtenances + haunch + laterals and marks STALE", () => {
    const project = applySimpleSingleSpanSampleInput(createDefaultProject());
    const draft = getBridgeStructureInputDraft(project);
    expect(draft.spanLength).toBe(30.0);
    expect(draft.bridgeLength).toBe(30.0);
    expect(draft.width).toBe(10.5);
    expect(draft.girderCount).toBe(4);
    expect(draft.lateralBracingEnabled).toBe(true);
    expect(draft.upperLateralBracingEnabled).toBe(true);
    expect(draft.generatedAt).toBeNull();
    expect(draft.schemaVersion).toBe("1.4.0-development");

    const curbLeft = draft.appurtenanceConfiguration.slots.find((s) => s.slot === "LEFT_CURB");
    expect(curbLeft?.presence).toBe(PRESENCE_STATUS.PROVIDED);
    expect(curbLeft?.item?.height).toBe(SAMPLE_PRESET_CATALOG.curbHeightM);
    const median = draft.appurtenanceConfiguration.slots.find((s) => s.slot === "MEDIAN");
    expect(median?.presence).toBe(PRESENCE_STATUS.EXPLICIT_NONE);

    expect(draft.haunchConfiguration.girders).toHaveLength(4);
    expect(draft.haunchConfiguration.girders.every((g) => g.presence === PRESENCE_STATUS.PROVIDED)).toBe(
      true,
    );
    expect(draft.haunchConfiguration.girders[0]?.item?.height).toBe(SAMPLE_PRESET_CATALOG.haunchHeightM);
  });

  it("does not auto-generate on input-only apply", () => {
    const project = applySimpleSingleSpanSampleInput(createDefaultProject());
    expect(project.apolloBsdd?.structuralDesignModel).toBeUndefined();
  });

  it("apply+generate produces haunch and appurtenance solids", () => {
    const result = applyAndGenerateSimpleSingleSpanSample(createDefaultProject());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.project.apolloBsdd?.structuralDesignModel).toBeDefined();
    const viz = buildApolloVisualizationModelOrThrow({ project: result.project });
    expect(viz.solidGeometryParameters.some((s) => s.kind === "haunch")).toBe(true);
    expect(viz.solidGeometryParameters.some((s) => s.kind === "appurtenance")).toBe(true);
    expect(viz.solidGeometryParameters.some((s) => s.kind === "bracing")).toBe(true);
  });

  it("clears all fields and marks the structure STALE", () => {
    const project = applySimpleSingleSpanSampleInput(createDefaultProject());
    const cleared = clearBridgeStructureInput(project);
    const draft = getBridgeStructureInputDraft(cleared);
    expect(draft.spanLength).toBeNull();
    expect(draft.lateralBracingEnabled).toBe(false);
    expect(draft.generatedAt).toBeNull();
  });

  it("keeps unit weights as USER_PROVIDED_UNVERIFIED semantics (not adopted)", () => {
    const project = applySimpleSingleSpanSampleInput(createDefaultProject());
    const draft = getBridgeStructureInputDraft(project);
    expect(draft.steelUnitWeight).toBe(77.0);
    expect(draft.rcUnitWeight).toBe(24.5);
    expect(project.apolloBsdd?.materialDefinitions).toBeUndefined();
  });

  it("exposes the sample values through the sample input constant", () => {
    expect(SIMPLE_SINGLE_SPAN_SAMPLE_INPUT.spanLength).toBe(30.0);
    expect(SIMPLE_SINGLE_SPAN_SAMPLE_INPUT.bridgeLength).toBe(30.0);
    expect(SIMPLE_SINGLE_SPAN_SAMPLE_INPUT.schemaVersion).toBe("1.4.0-development");
    expect(SIMPLE_SINGLE_SPAN_SAMPLE_INPUT.lateralBracingEnabled).toBe(true);
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
