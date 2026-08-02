import { describe, expect, it } from "vitest";
import { createDefaultProject } from "../../data/defaultProject";
import {
  CONTINUOUS_GIRDER_SAMPLE_SPANS,
  applyContinuousGirderSampleInput,
  generateBridgeStructureFromInput,
  getBridgeStructureInputDraft,
  isBridgeStructureGenerationCurrent,
  withBridgeStructureField,
} from "../bridgeStructure";
import { sumSpanLengths } from "../contracts";
import {
  exportApolloProjectToText,
  importApolloProjectFromText,
} from "../importExport";
import {
  buildApolloVisualizationModelOrThrow,
  hasBridgeStructureVisualizationSource,
} from "../visualization";
import { fillSimpleSingleBridgeStructureInput } from "../testing/bridgeStructureFixtures";
import { exportApolloBinaryStl, parseBinaryStl } from "../export";

function generateContinuousSample(project: ReturnType<typeof createDefaultProject>) {
  const filled = applyContinuousGirderSampleInput(project);
  const input = getBridgeStructureInputDraft(filled);
  const result = generateBridgeStructureFromInput(filled, input);
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error("generation failed");
  }
  return result.project;
}

describe("continuous girder 3D visualization (C3)", () => {
  it("renders girder, deck, pier, abutment, bearing, and cross-beam solids for [30,35,30]", () => {
    const project = generateContinuousSample(createDefaultProject());
    expect(hasBridgeStructureVisualizationSource(project)).toBe(true);

    const model = buildApolloVisualizationModelOrThrow({ project });
    const girders = model.solidGeometryParameters.filter((entry) => entry.kind === "girder");
    const decks = model.solidGeometryParameters.filter((entry) => entry.kind === "deck");
    const crossBeams = model.solidGeometryParameters.filter((entry) => entry.kind === "cross_beam");
    const bearings = model.solidGeometryParameters.filter((entry) => entry.kind === "bearing");
    const piers = model.solidGeometryParameters.filter((entry) => entry.kind === "pier_marker");
    const abutments = model.solidGeometryParameters.filter((entry) => entry.kind === "abutment_marker");

    const girderCount = getBridgeStructureInputDraft(project).girderCount ?? 0;
    const spanCount = CONTINUOUS_GIRDER_SAMPLE_SPANS.length;
    const supportCount = spanCount + 1;

    expect(girders).toHaveLength(girderCount * spanCount);
    expect(decks).toHaveLength(1);
    expect(crossBeams.length).toBeGreaterThan(0);
    expect(bearings).toHaveLength(girderCount * supportCount);
    expect(piers).toHaveLength(spanCount - 1);
    expect(abutments).toHaveLength(2);
    expect(girders.every((entry) => entry.designEntityKind === "MainGirder")).toBe(true);
    expect(crossBeams.some((entry) => entry.dimensionsM.atSupport === 1)).toBe(true);
    expect(crossBeams.some((entry) => entry.dimensionsM.atSupport === 0)).toBe(true);
    expect(model.assumptions.some((entry) => entry.code === "bsdd-continuous-girder-segments")).toBe(true);
  });

  it("keeps continuous girder segments contiguous with no gap at intermediate supports", () => {
    const project = generateContinuousSample(createDefaultProject());
    const model = buildApolloVisualizationModelOrThrow({ project });
    const expectedTotal = sumSpanLengths(
      getBridgeStructureInputDraft(project).spans.map((span) => ({ id: span.id, length: span.length })),
    );

    const girderCount = getBridgeStructureInputDraft(project).girderCount ?? 0;
    for (let girderIndex = 0; girderIndex < girderCount; girderIndex += 1) {
      const segments = model.solidGeometryParameters
        .filter((entry) => entry.kind === "girder" && entry.dimensionsM.offset === (girderIndex - 1.5) * 3)
        .sort((left, right) => left.dimensionsM.segmentStart - right.dimensionsM.segmentStart);
      const totalLength = segments.reduce((sum, entry) => sum + entry.dimensionsM.length, 0);
      expect(totalLength).toBeCloseTo(expectedTotal, 6);

      for (let index = 1; index < segments.length; index += 1) {
        const previous = segments[index - 1]!;
        const current = segments[index]!;
        const previousEnd = previous.dimensionsM.segmentStart + previous.dimensionsM.length;
        expect(current.dimensionsM.segmentStart).toBeCloseTo(previousEnd, 6);
      }
    }
  });

  it("omits BSDD solids when input is STALE after post-generate edit", () => {
    let project = generateContinuousSample(createDefaultProject());
    project = withBridgeStructureField(project, "girderCount", 2);
    expect(isBridgeStructureGenerationCurrent(project)).toBe(false);
    expect(hasBridgeStructureVisualizationSource(project)).toBe(false);

    const model = buildApolloVisualizationModelOrThrow({ project });
    expect(model.solidGeometryParameters.filter((entry) => entry.id.startsWith("solid:bsdd:"))).toHaveLength(0);
  });

  it("round-trips save/reload and rebuilds continuous girder visualization", () => {
    const project = generateContinuousSample(createDefaultProject());
    const exported = exportApolloProjectToText(project);
    expect(exported.ok).toBe(true);
    if (!exported.ok) return;

    const imported = importApolloProjectFromText(exported.content);
    expect(imported.ok).toBe(true);
    if (!imported.ok) return;

    expect(hasBridgeStructureVisualizationSource(imported.project)).toBe(true);
    const model = buildApolloVisualizationModelOrThrow({ project: imported.project });
    expect(model.solidGeometryParameters.filter((entry) => entry.kind === "girder").length).toBeGreaterThan(0);
    expect(model.solidGeometryParameters.filter((entry) => entry.kind === "pier_marker").length).toBe(2);
    expect(model.solidGeometryParameters.filter((entry) => entry.kind === "abutment_marker").length).toBe(2);
  });

  it("exports STL with non-zero triangles for continuous girder sample", () => {
    const project = generateContinuousSample(createDefaultProject());
    const model = buildApolloVisualizationModelOrThrow({ project });
    const result = exportApolloBinaryStl(model);
    const parsed = parseBinaryStl(result.bytes);
    expect(parsed.triangleCount).toBeGreaterThan(0);
  });

  it("does not regress SIMPLE_SINGLE BSDD visualization", () => {
    let project = fillSimpleSingleBridgeStructureInput(createDefaultProject());
    const input = getBridgeStructureInputDraft(project);
    const generated = generateBridgeStructureFromInput(project, input);
    expect(generated.ok).toBe(true);
    if (!generated.ok) return;

    const model = buildApolloVisualizationModelOrThrow({ project: generated.project });
    const girders = model.solidGeometryParameters.filter((entry) => entry.kind === "girder");
    const bearings = model.solidGeometryParameters.filter((entry) => entry.kind === "bearing");
    const abutments = model.solidGeometryParameters.filter((entry) => entry.kind === "abutment_marker");

    expect(girders).toHaveLength(4);
    expect(girders.every((entry) => entry.dimensionsM.length === 40)).toBe(true);
    expect(bearings).toHaveLength(8);
    expect(abutments).toHaveLength(2);
    expect(model.solidGeometryParameters.some((entry) => entry.id.includes(":seg-"))).toBe(false);
    expect(model.assumptions.some((entry) => entry.code === "bsdd-continuous-girder-segments")).toBe(false);
  });
});
