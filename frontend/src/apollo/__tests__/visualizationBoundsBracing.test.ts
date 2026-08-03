import { describe, expect, it } from "vitest";
import { createDefaultProject } from "../../data/defaultProject";
import { createApollo200mContinuousBridgeSample } from "../sampleProjects";
import {
  CONTINUOUS_GIRDER_SAMPLE_SPANS,
  applyContinuousGirderSampleInput,
  generateBridgeStructureFromInput,
  getBridgeStructureInputDraft,
  withBridgeStructureBooleanField,
  withBridgeStructureField,
} from "../bridgeStructure";
import { buildContinuousLayout, sumSpanLengths } from "../contracts";
import {
  fillContinuousBridgeStructureInput,
  fillSimpleSingleBridgeStructureInput,
} from "../testing/bridgeStructureFixtures";
import { buildApolloVisualizationModelOrThrow } from "../visualization";
import {
  DEFAULT_ANIMATION_OPTIONS,
  computeDemoModeShape,
  withNodeDisplacement,
} from "../../viewer/animation";
import {
  exportApolloProjectToText,
  importApolloProjectFromText,
} from "../importExport";
import { exportApolloBinaryStl, parseBinaryStl } from "../export";

const EPSILON = 1e-6;

function generateWithSway(
  project: ReturnType<typeof createDefaultProject>,
  spanLengths: readonly number[],
) {
  const layout = buildContinuousLayout(spanLengths);
  let next = fillSimpleSingleBridgeStructureInput(project);
  next = withBridgeStructureField(next, "swayBracingInterval", 1);
  next = withBridgeStructureBooleanField(next, "lateralBracingEnabled", false);
  next = applyContinuousGirderSampleInput(next);
  // Re-apply requested spans after sample defaults.
  next = {
    ...next,
    apolloBridgeStructureInput: {
      ...getBridgeStructureInputDraft(next),
      bridgeLength: sumSpanLengths(layout.spans),
      spans: layout.spans,
      supports: layout.supports,
      swayBracingInterval: 1,
      generatedAt: null,
    },
  };
  const generated = generateBridgeStructureFromInput(next, getBridgeStructureInputDraft(next));
  expect(generated.ok).toBe(true);
  if (!generated.ok) {
    throw new Error(generated.diagnostics.join("; "));
  }
  return generated.project;
}

function girderOffsets(project: ReturnType<typeof createDefaultProject>): number[] {
  return (project.apolloBsdd?.bridge.girderLines ?? [])
    .map((line) => line.offsetFromCenterline.value)
    .filter((value): value is number => typeof value === "number")
    .sort((left, right) => left - right);
}

function structuralXBounds(project: ReturnType<typeof createDefaultProject>): {
  xStart: number;
  xEnd: number;
} {
  const draft = getBridgeStructureInputDraft(project);
  const stations = draft.supports.map((support) => support.station).sort((a, b) => a - b);
  return { xStart: stations[0] ?? 0, xEnd: stations[stations.length - 1] ?? 0 };
}

describe("apollo visualization bounds and bracing alignment", () => {
  it.each([
    { label: "3-span", spans: [...CONTINUOUS_GIRDER_SAMPLE_SPANS] },
    { label: "5-span", spans: [40, 40, 40, 40, 40] },
  ])("$label: sway bracing stays within adjacent girder centers and girder web height", ({ spans }) => {
    const project = generateWithSway(createDefaultProject(), spans);
    const model = buildApolloVisualizationModelOrThrow({ project });
    const offsets = girderOffsets(project);
    const outerMin = Math.min(...offsets);
    const outerMax = Math.max(...offsets);
    const draft = getBridgeStructureInputDraft(project);
    const girderDepth = draft.girderDepth ?? 0;
    const girderCenterZ = -girderDepth / 2;
    const topConnectionZ =
      girderCenterZ + girderDepth / 2 - (draft.topFlangeThickness ?? 0) / 2;
    const bottomConnectionZ =
      girderCenterZ - girderDepth / 2 + (draft.bottomFlangeThickness ?? 0) / 2;

    const sway = model.solidGeometryParameters.filter(
      (solid) => solid.kind === "bracing" && (solid.displayLabel.includes("Sway") || solid.displayLabel.includes("対傾構")),
    );
    expect(sway.length).toBeGreaterThan(0);

    for (const solid of sway) {
      expect(solid.designEntityId).toBeTruthy();
      expect(solid.path?.length).toBe(2);
      const [start, end] = solid.path!;
      for (const point of [start, end]) {
        expect(Number.isFinite(point![0])).toBe(true);
        expect(Number.isFinite(point![1])).toBe(true);
        expect(Number.isFinite(point![2])).toBe(true);
        expect(point![1]).toBeGreaterThanOrEqual(outerMin - EPSILON);
        expect(point![1]).toBeLessThanOrEqual(outerMax + EPSILON);
      }
      expect(start![0]).toBeCloseTo(end![0]!, 6);
      const zs = [start![2]!, end![2]!].sort((a, b) => a - b);
      expect(zs[0]).toBeCloseTo(bottomConnectionZ, 6);
      expect(zs[1]).toBeCloseTo(topConnectionZ, 6);
      const bayHalf = Math.abs(start![1]! - end![1]!);
      expect(bayHalf).toBeCloseTo((draft.girderSpacing ?? 0) / 2, 6);
      const length = Math.hypot(
        end![0]! - start![0]!,
        end![1]! - start![1]!,
        end![2]! - start![2]!,
      );
      const expected = Math.hypot((draft.girderSpacing ?? 0) / 2, topConnectionZ - bottomConnectionZ);
      expect(length).toBeCloseTo(expected, 6);
    }

    // Bay count principle: girderCount - 1 adjacent pairs only (no outer-side bay).
    expect(offsets).toHaveLength(draft.girderCount ?? 0);
  });

  it("aligns frame overlay X bounds with girder solids after continuous sample on 200m project", () => {
    const filled = applyContinuousGirderSampleInput(createApollo200mContinuousBridgeSample());
    const generated = generateBridgeStructureFromInput(filled, getBridgeStructureInputDraft(filled));
    expect(generated.ok).toBe(true);
    if (!generated.ok) return;
    const project = generated.project;
    const { xStart, xEnd } = structuralXBounds(project);
    const expectedLength = sumSpanLengths(
      CONTINUOUS_GIRDER_SAMPLE_SPANS.map((length, index) => ({ id: `span-${index}`, length })),
    );
    expect(xEnd - xStart).toBeCloseTo(expectedLength, 6);

    const frameXs = project.nodes.map((node) => node.x);
    expect(Math.min(...frameXs)).toBeCloseTo(xStart, 6);
    expect(Math.max(...frameXs)).toBeCloseTo(xEnd, 6);
    expect(project.nodes).toHaveLength(CONTINUOUS_GIRDER_SAMPLE_SPANS.length + 1);
    expect(project.members).toHaveLength(CONTINUOUS_GIRDER_SAMPLE_SPANS.length);

    const model = buildApolloVisualizationModelOrThrow({ project });
    const girderXs = model.solidGeometryParameters
      .filter((solid) => solid.kind === "girder")
      .flatMap((solid) => {
        const start = solid.dimensionsM.segmentStart ?? 0;
        return [start, start + (solid.dimensionsM.length ?? 0)];
      });
    expect(Math.min(...girderXs)).toBeCloseTo(xStart, 6);
    expect(Math.max(...girderXs)).toBeCloseTo(xEnd, 6);
  });

  it("aligns frame and solid X bounds for 5-span 200m continuous fill", () => {
    const filled = fillContinuousBridgeStructureInput(createApollo200mContinuousBridgeSample());
    const generated = generateBridgeStructureFromInput(filled, getBridgeStructureInputDraft(filled));
    expect(generated.ok).toBe(true);
    if (!generated.ok) return;
    const project = generated.project;
    const { xStart, xEnd } = structuralXBounds(project);
    expect(xStart).toBeCloseTo(0, 6);
    expect(xEnd).toBeCloseTo(200, 6);
    expect(Math.min(...project.nodes.map((node) => node.x))).toBeCloseTo(0, 6);
    expect(Math.max(...project.nodes.map((node) => node.x))).toBeCloseTo(200, 6);
    // Former sample stations (35/75/...) must not remain after generate.
    expect(project.nodes.some((node) => Math.abs(node.x - 35) < EPSILON)).toBe(false);
  });

  it("keeps SIMPLE_SINGLE frame and girder solids on the same structural length", () => {
    const filled = fillSimpleSingleBridgeStructureInput(createDefaultProject());
    const generated = generateBridgeStructureFromInput(filled, getBridgeStructureInputDraft(filled));
    expect(generated.ok).toBe(true);
    if (!generated.ok) return;
    const project = generated.project;
    const length = getBridgeStructureInputDraft(project).bridgeLength ?? 0;
    expect(Math.min(...project.nodes.map((node) => node.x))).toBeCloseTo(0, 6);
    expect(Math.max(...project.nodes.map((node) => node.x))).toBeCloseTo(length, 6);
    const model = buildApolloVisualizationModelOrThrow({ project });
    const girder = model.solidGeometryParameters.find((solid) => solid.kind === "girder");
    expect(girder?.dimensionsM.length).toBeCloseTo(length, 6);
  });

  it("Demo Shape OFF leaves base coordinates; ON uses in-bound Apollo node map without double length", () => {
    const filled = applyContinuousGirderSampleInput(createApollo200mContinuousBridgeSample());
    const generated = generateBridgeStructureFromInput(filled, getBridgeStructureInputDraft(filled));
    expect(generated.ok).toBe(true);
    if (!generated.ok) return;
    const project = generated.project;
    const { xStart, xEnd } = structuralXBounds(project);

    const off = withNodeDisplacement(
      project,
      { ...DEFAULT_ANIMATION_OPTIONS, enabled: false, useDemo: true, scale: 5 },
      0.25,
    );
    for (const node of project.nodes) {
      expect(off.get(node.id)?.x).toBeCloseTo(node.x, 6);
    }

    const demo = computeDemoModeShape(project);
    expect(demo.size).toBe(project.nodes.length);

    const on = withNodeDisplacement(
      project,
      { ...DEFAULT_ANIMATION_OPTIONS, enabled: true, useDemo: true, scale: 5 },
      0.25,
    );
    const animatedXs = [...on.values()].map((point) => point.x);
    // Displacement is display-only and finite; nodes remain near structural range (scale 5, unit amp).
    expect(Math.min(...animatedXs)).toBeGreaterThan(xStart - 20);
    expect(Math.max(...animatedXs)).toBeLessThan(xEnd + 20);
  });

  it("round-trips save/reload and STL after bounds-aligned generation", () => {
    const filled = applyContinuousGirderSampleInput(createApollo200mContinuousBridgeSample());
    const generated = generateBridgeStructureFromInput(filled, getBridgeStructureInputDraft(filled));
    expect(generated.ok).toBe(true);
    if (!generated.ok) return;

    const exported = exportApolloProjectToText(generated.project);
    expect(exported.ok).toBe(true);
    if (!exported.ok) return;
    const imported = importApolloProjectFromText(exported.content);
    expect(imported.ok).toBe(true);
    if (!imported.ok) return;

    expect(Math.max(...imported.project.nodes.map((node) => node.x))).toBeCloseTo(
      sumSpanLengths(
        CONTINUOUS_GIRDER_SAMPLE_SPANS.map((length, index) => ({ id: `span-${index}`, length })),
      ),
      6,
    );

    const model = buildApolloVisualizationModelOrThrow({ project: imported.project });
    const stl = exportApolloBinaryStl(model);
    const parsed = parseBinaryStl(stl.bytes);
    expect(parsed.triangleCount).toBeGreaterThan(0);
  });
});
