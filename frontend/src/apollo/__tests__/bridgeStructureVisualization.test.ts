import { describe, expect, it } from "vitest";
import { createDefaultProject } from "../../data/defaultProject";
import {
  generateBridgeStructureFromInput,
  getBridgeStructureInputDraft,
  isBridgeStructureGenerationCurrent,
  withBridgeStructureBooleanField,
  withBridgeStructureField,
} from "../bridgeStructure";
import {
  exportApolloProjectToText,
  importApolloProjectFromText,
} from "../importExport";
import { createApollo200mContinuousBridgeSample } from "../sampleProjects";
import {
  buildApolloVisualizationModel,
  buildApolloVisualizationModelOrThrow,
  buildBridgeStructureSolidGeometryParameters,
  hasBridgeStructureVisualizationSource,
} from "../visualization";
import { fillContinuousBridgeStructureInput } from "../testing/bridgeStructureFixtures";

function fillValidInput(project: ReturnType<typeof createDefaultProject>) {
  return fillContinuousBridgeStructureInput(project);
}

function generateStructure(project: ReturnType<typeof createDefaultProject>) {
  const filled = fillValidInput(project);
  const input = getBridgeStructureInputDraft(filled);
  const result = generateBridgeStructureFromInput(filled, input);
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error("generation failed");
  }
  return result.project;
}

describe("bridge structure visualization (Block C)", () => {
  it("renders BSDD-driven girders, deck, and cross-beams after structure generation", () => {
    const project = generateStructure(createDefaultProject());
    expect(hasBridgeStructureVisualizationSource(project)).toBe(true);

    const model = buildApolloVisualizationModelOrThrow({ project });
    const girders = model.solidGeometryParameters.filter((entry) => entry.kind === "girder");
    const decks = model.solidGeometryParameters.filter((entry) => entry.kind === "deck");
    const crossBeams = model.solidGeometryParameters
      .filter((entry) => entry.kind === "cross_beam")
      .sort((left, right) => left.dimensionsM.station - right.dimensionsM.station);

    expect(girders).toHaveLength(20);
    expect(decks).toHaveLength(1);
    expect(crossBeams).toHaveLength(41);
    expect(girders.every((entry) => entry.designEntityKind === "MainGirder")).toBe(true);
    expect(new Set(girders.map((entry) => entry.designEntityId)).size).toBe(4);
    expect(decks.every((entry) => entry.designEntityKind === "RcDeck")).toBe(true);
    expect(crossBeams.every((entry) => entry.designEntityKind === "CrossBeam")).toBe(true);
    expect(model.assumptions.some((entry) => entry.code === "bsdd-bridge-structure-solids")).toBe(true);
  });

  it("reflects girder count, spacing, depth, deck thickness, and cross-beam spacing", () => {
    const project = generateStructure(createDefaultProject());
    const model = buildApolloVisualizationModelOrThrow({ project });
    const girders = model.solidGeometryParameters.filter((entry) => entry.kind === "girder");
    const deck = model.solidGeometryParameters.find((entry) => entry.kind === "deck");
    const crossBeams = model.solidGeometryParameters
      .filter((entry) => entry.kind === "cross_beam")
      .sort((left, right) => left.dimensionsM.station - right.dimensionsM.station);

    expect([...new Set(girders.map((entry) => entry.dimensionsM.offset))].sort((a, b) => a - b)).toEqual(
      [-4.5, -1.5, 1.5, 4.5],
    );
    expect(girders[0]?.dimensionsM.depth).toBe(2.5);
    expect(girders[0]?.dimensionsM.length).toBe(40);
    expect(deck?.dimensionsM.thickness).toBe(0.25);
    expect(deck?.dimensionsM.width).toBe(12);
    expect(crossBeams[1]?.dimensionsM.station).toBe(5);
    expect(crossBeams[0]?.dimensionsM.length).toBe(9);
  });

  it("updates 3D solids when input changes and structure is regenerated", () => {
    let project = generateStructure(createDefaultProject());
    const first = buildApolloVisualizationModelOrThrow({ project });
    expect(first.solidGeometryParameters.filter((entry) => entry.kind === "girder")).toHaveLength(20);

    project = withBridgeStructureField(project, "girderCount", 2);
    project = withBridgeStructureField(project, "girderSpacing", 4);
    const regen = generateBridgeStructureFromInput(project, getBridgeStructureInputDraft(project));
    expect(regen.ok).toBe(true);
    if (!regen.ok) return;

    const second = buildApolloVisualizationModelOrThrow({ project: regen.project });
    const girders = second.solidGeometryParameters.filter((entry) => entry.kind === "girder");
    expect(girders).toHaveLength(10);
    expect([...new Set(girders.map((entry) => entry.dimensionsM.offset))].sort((a, b) => a - b)).toEqual([-2, 2]);
  });

  it("preserves stable design entity IDs on solids across regeneration", () => {
    const project = generateStructure(createDefaultProject());
    const first = buildApolloVisualizationModelOrThrow({ project });
    const regen = generateBridgeStructureFromInput(project, getBridgeStructureInputDraft(project));
    expect(regen.ok).toBe(true);
    if (!regen.ok) return;
    const second = buildApolloVisualizationModelOrThrow({ project: regen.project });

    const firstIds = first.solidGeometryParameters
      .filter((entry) => entry.designEntityId)
      .map((entry) => entry.designEntityId)
      .sort();
    const secondIds = second.solidGeometryParameters
      .filter((entry) => entry.designEntityId)
      .map((entry) => entry.designEntityId)
      .sort();
    expect(secondIds).toEqual(firstIds);
  });

  it("round-trips save/reload and rebuilds BSDD-driven visualization", () => {
    const project = generateStructure(createDefaultProject());
    const exported = exportApolloProjectToText(project);
    expect(exported.ok).toBe(true);
    if (!exported.ok) return;

    const imported = importApolloProjectFromText(exported.content);
    expect(imported.ok).toBe(true);
    if (!imported.ok) return;

    expect(hasBridgeStructureVisualizationSource(imported.project)).toBe(true);
    const model = buildApolloVisualizationModelOrThrow({ project: imported.project });
    expect(model.solidGeometryParameters.filter((entry) => entry.kind === "girder")).toHaveLength(20);
    expect(model.solidGeometryParameters.filter((entry) => entry.kind === "deck")).toHaveLength(1);
  });

  it("renders stiffener, sway-bracing, and lateral-bracing solids when configured", () => {
    let project = generateStructure(createDefaultProject());
    project = withBridgeStructureField(project, "stiffenerSpacing", 25);
    project = withBridgeStructureField(project, "swayBracingInterval", 2);
    project = withBridgeStructureBooleanField(project, "lateralBracingEnabled", true);
    const regen = generateBridgeStructureFromInput(project, getBridgeStructureInputDraft(project));
    expect(regen.ok).toBe(true);
    if (!regen.ok) return;

    const model = buildApolloVisualizationModelOrThrow({ project: regen.project });
    const stiffeners = model.solidGeometryParameters.filter((entry) => entry.kind === "stiffener");
    const swayMembers = model.solidGeometryParameters.filter(
      (entry) => entry.kind === "bracing" && entry.displayLabel.startsWith("Sway "),
    );
    const lateralMembers = model.solidGeometryParameters.filter(
      (entry) => entry.kind === "bracing" && entry.displayLabel.startsWith("Lateral "),
    );

    expect(stiffeners).toHaveLength(4 * 9);
    expect(stiffeners.every((entry) => entry.designEntityKind === "Stiffener")).toBe(true);
    expect(stiffeners.every((entry) => entry.visibilityGroup === "girders")).toBe(true);
    expect(swayMembers).toHaveLength(19 * 3 * 2);
    expect(lateralMembers).toHaveLength(1 * 3 * 40 * 2);
    expect(swayMembers.every((entry) => entry.designEntityKind === "BraceMember")).toBe(true);
    expect(swayMembers.every((entry) => entry.visibilityGroup === "bracings")).toBe(true);
    expect(
      model.solidGeometryParameters.filter((entry) => entry.kind === "stiffener").every((entry) => entry.path == null),
    ).toBe(true);
  });

  it("omits secondary-member solids when their inputs are unset or disabled", () => {
    const project = generateStructure(createDefaultProject());
    const model = buildApolloVisualizationModelOrThrow({ project });
    expect(model.solidGeometryParameters.some((entry) => entry.kind === "stiffener")).toBe(false);
    expect(model.solidGeometryParameters.filter((entry) => entry.kind === "bracing")).toHaveLength(0);
    expect(model.solidGeometryParameters.some((entry) => entry.designEntityKind === "Stiffener")).toBe(false);
  });

  it("keeps sway-bracing and lateral-bracing solid IDs stable across regeneration", () => {
    let project = generateStructure(createDefaultProject());
    project = withBridgeStructureField(project, "stiffenerSpacing", 25);
    project = withBridgeStructureField(project, "swayBracingInterval", 2);
    project = withBridgeStructureBooleanField(project, "lateralBracingEnabled", true);
    const regen = generateBridgeStructureFromInput(project, getBridgeStructureInputDraft(project));
    expect(regen.ok).toBe(true);
    if (!regen.ok) return;

    const first = buildApolloVisualizationModelOrThrow({ project: regen.project });
    const secondRegen = generateBridgeStructureFromInput(regen.project, getBridgeStructureInputDraft(regen.project));
    expect(secondRegen.ok).toBe(true);
    if (!secondRegen.ok) return;
    const second = buildApolloVisualizationModelOrThrow({ project: secondRegen.project });

    const bracingIds = (model: ReturnType<typeof buildApolloVisualizationModelOrThrow>) =>
      model.solidGeometryParameters
        .filter((entry) => entry.kind === "bracing" || entry.kind === "stiffener")
        .map((entry) => entry.id)
        .sort();
    expect(bracingIds(second)).toEqual(bracingIds(first));
  });

  it("does not regress the Apollo sample bridge without BSDD", () => {
    const model = buildApolloVisualizationModelOrThrow({
      project: createApollo200mContinuousBridgeSample(),
    });
    expect(model.solidGeometryParameters.filter((entry) => entry.kind === "girder")).toHaveLength(20);
    expect(model.solidGeometryParameters.filter((entry) => entry.kind === "cross_beam")).toHaveLength(15);
    expect(model.assumptions.some((entry) => entry.code === "bsdd-bridge-structure-solids")).toBe(false);
  });

  it("expands bounding box for BSDD-driven bridge structure solids", () => {
    const project = generateStructure(createDefaultProject());
    const model = buildApolloVisualizationModelOrThrow({ project });
    const bsddSolids = model.solidGeometryParameters.filter((entry) => entry.id.startsWith("solid:bsdd:"));
    expect(bsddSolids.length).toBeGreaterThan(0);

    const girder = bsddSolids
      .filter((entry) => entry.kind === "girder" && entry.dimensionsM.segmentIndex === 0)
      .sort((left, right) => left.dimensionsM.offset - right.dimensionsM.offset)[0];
    const deck = bsddSolids.find((entry) => entry.kind === "deck");
    expect(girder?.dimensionsM.length).toBe(40);
    expect(girder?.localFrame.origin[0]).toBeCloseTo(20, 3);
    expect(girder?.dimensionsM.offset).toBe(-4.5);
    expect(deck?.dimensionsM.thickness).toBe(0.25);
    expect(deck?.localFrame.origin[2]).toBeCloseTo(0.125, 3);
  });

  it("omits BSDD-driven 3D solids when input is stale after post-generate edit", () => {
    let project = generateStructure(createDefaultProject());
    expect(hasBridgeStructureVisualizationSource(project)).toBe(true);

    project = withBridgeStructureField(project, "girderCount", 2);
    expect(isBridgeStructureGenerationCurrent(project)).toBe(false);
    expect(hasBridgeStructureVisualizationSource(project)).toBe(false);

    const model = buildApolloVisualizationModelOrThrow({ project });
    expect(model.solidGeometryParameters.filter((entry) => entry.id.startsWith("solid:bsdd:"))).toHaveLength(0);
  });

  it("restores BSDD-driven 3D solids after stale input is regenerated", () => {
    let project = generateStructure(createDefaultProject());
    project = withBridgeStructureField(project, "girderCount", 2);
    project = withBridgeStructureField(project, "girderSpacing", 4);

    const regen = generateBridgeStructureFromInput(project, getBridgeStructureInputDraft(project));
    expect(regen.ok).toBe(true);
    if (!regen.ok) return;

    const model = buildApolloVisualizationModelOrThrow({ project: regen.project });
    const girders = model.solidGeometryParameters.filter((entry) => entry.kind === "girder");
    expect(girders).toHaveLength(10);
    expect(model.solidGeometryParameters.some((entry) => entry.id.startsWith("solid:bsdd:"))).toBe(true);
  });

  it("returns no BSDD solids when structure input is incomplete", () => {
    const warnings: import("../visualization/types").ApolloVisualizationWarning[] = [];
    const assumptions: import("../visualization/types").ApolloVisualizationAssumption[] = [];
    const project = createDefaultProject();
    const solids = buildBridgeStructureSolidGeometryParameters(project, warnings, assumptions);
    expect(solids).toHaveLength(0);
    const result = buildApolloVisualizationModel({ project });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.model.solidGeometryParameters.some((entry) => entry.id.startsWith("solid:bsdd:"))).toBe(false);
  });
});
