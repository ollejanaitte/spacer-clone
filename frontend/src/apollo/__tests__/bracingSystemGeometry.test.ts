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
import { fillSimpleSingleBridgeStructureInput } from "../testing/bridgeStructureFixtures";
import { buildApolloVisualizationModelOrThrow } from "../visualization";
import {
  exportApolloProjectToText,
  importApolloProjectFromText,
} from "../importExport";

const EPSILON = 1e-6;
const BRACING_SYSTEM_SWAY = 1;
const BRACING_SYSTEM_UPPER_LATERAL = 2;
const BRACING_SYSTEM_LOWER_LATERAL = 3;

function generateUserModel(options?: {
  readonly upper?: boolean;
  readonly lower?: boolean;
  readonly swayInterval?: number | null;
}) {
  const spans = [...CONTINUOUS_GIRDER_SAMPLE_SPANS];
  const layout = buildContinuousLayout(spans);
  let project = fillSimpleSingleBridgeStructureInput(createDefaultProject());
  project = applyContinuousGirderSampleInput(project);
  project = {
    ...project,
    apolloBridgeStructureInput: {
      ...getBridgeStructureInputDraft(project),
      bridgeLength: sumSpanLengths(layout.spans),
      spans: layout.spans,
      supports: layout.supports,
      width: 10.5,
      girderCount: 4,
      girderSpacing: 3,
      girderDepth: 2,
      crossBeamSpacing: 5,
      stiffenerSpacing: 2.5,
      swayBracingInterval: options?.swayInterval === undefined ? 1 : options.swayInterval,
      lateralBracingEnabled: options?.lower ?? true,
      upperLateralBracingEnabled: options?.upper ?? true,
      generatedAt: null,
    },
  };
  const generated = generateBridgeStructureFromInput(project, getBridgeStructureInputDraft(project));
  expect(generated.ok).toBe(true);
  if (!generated.ok) {
    throw new Error(generated.diagnostics.join("; "));
  }
  return generated.project;
}

function connectionZs(project: ReturnType<typeof generateUserModel>) {
  const draft = getBridgeStructureInputDraft(project);
  const girderDepth = draft.girderDepth!;
  const girderCenterZ = -girderDepth / 2;
  return {
    girderCenterZ,
    topConnectionZ: girderCenterZ + girderDepth / 2 - draft.topFlangeThickness! / 2,
    bottomConnectionZ: girderCenterZ - girderDepth / 2 + draft.bottomFlangeThickness! / 2,
  };
}

function girderOffsets(project: ReturnType<typeof generateUserModel>): number[] {
  return (project.apolloBsdd?.bridge.girderLines ?? [])
    .map((line) => line.offsetFromCenterline.value)
    .filter((value): value is number => typeof value === "number")
    .sort((a, b) => a - b);
}

describe("apollo sway / upper / lower lateral bracing geometry", () => {
  it("places V-type sway bracing in a constant-X transverse vertical plane", () => {
    const project = generateUserModel({ upper: false, lower: false, swayInterval: 1 });
    const model = buildApolloVisualizationModelOrThrow({ project });
    const offsets = girderOffsets(project);
    const { topConnectionZ, bottomConnectionZ } = connectionZs(project);
    const sway = model.solidGeometryParameters.filter(
      (solid) => solid.dimensionsM.bracingSystem === BRACING_SYSTEM_SWAY,
    );

    // stations: crossBeamCount = floor(95/5)+1 = 20; indices 1..18 step 1 → 18 sites
    // bays = 3; 2 members each → 18 * 3 * 2 = 108
    expect(sway).toHaveLength(18 * 3 * 2);

    for (const solid of sway) {
      const [start, end] = solid.path!;
      expect(start![0]).toBeCloseTo(end![0]!, 6); // same X plane
      expect(Math.abs(start![2]! - end![2]!)).toBeGreaterThan(EPSILON); // Z differs
      const zs = [start![2]!, end![2]!].sort((a, b) => a - b);
      expect(zs[0]).toBeCloseTo(bottomConnectionZ, 6);
      expect(zs[1]).toBeCloseTo(topConnectionZ, 6);
      expect(Math.min(start![1]!, end![1]!)).toBeGreaterThanOrEqual(Math.min(...offsets) - EPSILON);
      expect(Math.max(start![1]!, end![1]!)).toBeLessThanOrEqual(Math.max(...offsets) + EPSILON);
    }

    // Each bay forms a V: two members share the same midBottom point.
    const midBottoms = new Map<string, number>();
    for (const solid of sway) {
      const bottom = solid.path!.find((point) => Math.abs(point[2]! - bottomConnectionZ) < EPSILON);
      expect(bottom).toBeTruthy();
      const key = `${solid.path![0]![0]!.toFixed(6)}:${bottom![1]!.toFixed(6)}`;
      midBottoms.set(key, (midBottoms.get(key) ?? 0) + 1);
    }
    for (const count of midBottoms.values()) {
      expect(count).toBe(2);
    }
  });

  it("places lower lateral bracing on the bottom flange horizontal plane", () => {
    const project = generateUserModel({ upper: false, lower: true, swayInterval: null });
    const model = buildApolloVisualizationModelOrThrow({ project });
    const { bottomConnectionZ } = connectionZs(project);
    const offsets = girderOffsets(project);
    const lower = model.solidGeometryParameters.filter(
      (solid) => solid.dimensionsM.bracingSystem === BRACING_SYSTEM_LOWER_LATERAL,
    );
    expect(lower.length).toBeGreaterThan(0);
    expect(
      model.solidGeometryParameters.some(
        (solid) => solid.dimensionsM.bracingSystem === BRACING_SYSTEM_UPPER_LATERAL,
      ),
    ).toBe(false);

    for (const solid of lower) {
      for (const point of solid.path!) {
        expect(point[2]).toBeCloseTo(bottomConnectionZ, 6);
        expect(point[1]).toBeGreaterThanOrEqual(Math.min(...offsets) - EPSILON);
        expect(point[1]).toBeLessThanOrEqual(Math.max(...offsets) + EPSILON);
        expect(point[0]).toBeGreaterThanOrEqual(0 - EPSILON);
        expect(point[0]).toBeLessThanOrEqual(95 + EPSILON);
      }
      expect(solid.displayLabel.startsWith("Lower Lateral")).toBe(true);
    }
  });

  it("places upper lateral bracing on the top flange horizontal plane", () => {
    const project = generateUserModel({ upper: true, lower: false, swayInterval: null });
    const model = buildApolloVisualizationModelOrThrow({ project });
    const { topConnectionZ } = connectionZs(project);
    const offsets = girderOffsets(project);
    const upper = model.solidGeometryParameters.filter(
      (solid) => solid.dimensionsM.bracingSystem === BRACING_SYSTEM_UPPER_LATERAL,
    );
    expect(upper.length).toBeGreaterThan(0);
    for (const solid of upper) {
      for (const point of solid.path!) {
        expect(point[2]).toBeCloseTo(topConnectionZ, 6);
        expect(point[1]).toBeGreaterThanOrEqual(Math.min(...offsets) - EPSILON);
        expect(point[1]).toBeLessThanOrEqual(Math.max(...offsets) + EPSILON);
      }
      expect(solid.displayLabel.startsWith("Upper Lateral")).toBe(true);
    }
  });

  it("keeps sway / upper / lower as separate entities and planes", () => {
    const project = generateUserModel({ upper: true, lower: true, swayInterval: 1 });
    const model = buildApolloVisualizationModelOrThrow({ project });
    const sway = model.solidGeometryParameters.filter(
      (solid) => solid.dimensionsM.bracingSystem === BRACING_SYSTEM_SWAY,
    );
    const upper = model.solidGeometryParameters.filter(
      (solid) => solid.dimensionsM.bracingSystem === BRACING_SYSTEM_UPPER_LATERAL,
    );
    const lower = model.solidGeometryParameters.filter(
      (solid) => solid.dimensionsM.bracingSystem === BRACING_SYSTEM_LOWER_LATERAL,
    );
    expect(sway.length).toBeGreaterThan(0);
    expect(upper.length).toBeGreaterThan(0);
    expect(lower.length).toBeGreaterThan(0);
    expect(project.apolloBsdd?.structuralDesignModel?.lateralBracings).toHaveLength(2);

    const swayIds = new Set(sway.map((solid) => solid.designEntityId));
    const upperIds = new Set(upper.map((solid) => solid.designEntityId));
    const lowerIds = new Set(lower.map((solid) => solid.designEntityId));
    for (const id of swayIds) {
      expect(upperIds.has(id)).toBe(false);
      expect(lowerIds.has(id)).toBe(false);
    }
  });

  it("preserves legacy lower-only meaning of lateralBracingEnabled", () => {
    let project = applyContinuousGirderSampleInput(createApollo200mContinuousBridgeSample());
    project = withBridgeStructureBooleanField(project, "lateralBracingEnabled", true);
    project = withBridgeStructureBooleanField(project, "upperLateralBracingEnabled", false);
    project = withBridgeStructureField(project, "swayBracingInterval", null);
    const generated = generateBridgeStructureFromInput(project, getBridgeStructureInputDraft(project));
    expect(generated.ok).toBe(true);
    if (!generated.ok) return;
    expect(getBridgeStructureInputDraft(generated.project).upperLateralBracingEnabled).toBe(false);
    expect(generated.project.apolloBsdd?.structuralDesignModel?.lateralBracings).toHaveLength(1);
    const model = buildApolloVisualizationModelOrThrow({ project: generated.project });
    expect(
      model.solidGeometryParameters.every(
        (solid) =>
          solid.kind !== "bracing" ||
          solid.dimensionsM.bracingSystem === BRACING_SYSTEM_LOWER_LATERAL,
      ),
    ).toBe(true);
  });

  it("round-trips upper/lower flags through save/reload", () => {
    const project = generateUserModel({ upper: true, lower: true });
    const exported = exportApolloProjectToText(project);
    expect(exported.ok).toBe(true);
    if (!exported.ok) return;
    const imported = importApolloProjectFromText(exported.content);
    expect(imported.ok).toBe(true);
    if (!imported.ok) return;
    const draft = getBridgeStructureInputDraft(imported.project);
    expect(draft.lateralBracingEnabled).toBe(true);
    expect(draft.upperLateralBracingEnabled).toBe(true);
    expect(imported.project.apolloBsdd?.structuralDesignModel?.lateralBracings).toHaveLength(2);
  });
});
