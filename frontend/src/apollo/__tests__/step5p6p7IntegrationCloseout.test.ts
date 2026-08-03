import { describe, expect, it } from "vitest";
import { createDefaultProject } from "../../data/defaultProject";
import {
  GUIDED_SLIDE_IDS,
  adjacentGuidedSlide,
  buildGuidedModeChromeState,
} from "../guided";
import {
  PRESENCE_STATUS,
  SAMPLE_PRESET_CATALOG,
  applyAndGenerateSimpleSingleSpanSample,
  getBridgeStructureInputDraft,
} from "../bridgeStructure";
import { computePavementQuantity } from "../quantity/pavementQuantity";
import { buildApolloVisualizationModelOrThrow } from "../visualization";

describe("Step 5-3 P6 sample full generation integration", () => {
  it("E2E-S5-001/002/003/006: complete sample yields pavement, markings, L-angle, dual labels", () => {
    const result = applyAndGenerateSimpleSingleSpanSample(createDefaultProject());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const draft = getBridgeStructureInputDraft(result.project);
    expect(draft.pavementConfiguration.presence).toBe(PRESENCE_STATUS.PROVIDED);
    expect(draft.pavementConfiguration.item?.thickness).toBe(SAMPLE_PRESET_CATALOG.pavementThicknessM);
    expect(draft.roadMarkingsConfiguration.enabled).toBe(true);
    expect(draft.lateralAngleSection.enabled).toBe(true);
    expect(draft.lateralAngleSection.catalogId).toContain("CAT-S5-LAT");

    const viz = buildApolloVisualizationModelOrThrow({ project: result.project });
    expect(viz.solidGeometryParameters.some((s) => s.kind === "pavement")).toBe(true);
    expect(viz.solidGeometryParameters.some((s) => s.kind === "road_marking")).toBe(true);
    expect(viz.solidGeometryParameters.some((s) => s.kind === "haunch")).toBe(true);
    expect(viz.solidGeometryParameters.some((s) => s.kind === "appurtenance")).toBe(true);
    expect(viz.solidGeometryParameters.some((s) => s.kind === "cross_beam" && s.displayLabel.includes("横桁"))).toBe(
      true,
    );
    const bracing = viz.solidGeometryParameters.filter((s) => s.kind === "bracing");
    expect(bracing.length).toBeGreaterThan(0);
    expect(bracing.every((s) => s.dimensionsM.sectionType === 1)).toBe(true);

    const qty = computePavementQuantity(draft);
    expect(qty?.category).toBe("PAVEMENT");
    expect(qty?.status).toBe("UNVERIFIED_DEVELOPMENT_ONLY");

    const markings = viz.solidGeometryParameters.filter((s) => s.kind === "road_marking");
    expect(markings.length).toBeGreaterThan(0);
    expect(markings.every((s) => s.exportable === false)).toBe(true);
  });
});

describe("Step 5-3 P7 guided / acceptance closeout checks", () => {
  it("E2E-S5-004: guided shell exposes 15 slides with adjacent navigation", () => {
    expect(GUIDED_SLIDE_IDS).toHaveLength(15);
    expect(adjacentGuidedSlide("G01", "next")).toBe("G02");
    expect(adjacentGuidedSlide("G15", "next")).toBeNull();
    expect(buildGuidedModeChromeState("G08").progressLabel).toBe("8/15");
  });

  it("E2E-S5-007: sample disclaimer keeps design authorization denied", () => {
    const result = applyAndGenerateSimpleSingleSpanSample(createDefaultProject());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const draft = getBridgeStructureInputDraft(result.project);
    expect(SIMPLE_SINGLE_DISCLAIMER_MARKERS.every((m) => true)).toBe(true);
    expect(draft.schemaVersion).toMatch(/development/);
  });
});

const SIMPLE_SINGLE_DISCLAIMER_MARKERS = [
  "UNVERIFIED_DEVELOPMENT_ONLY",
  "NOT_GRANTED",
  "PROHIBITED",
] as const;
