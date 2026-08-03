// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { createDefaultProject } from "../../data/defaultProject";
import {
  APOLLO_BRIDGE_STRUCTURE_INPUT_SCHEMA_VERSION,
  APOLLO_BRIDGE_STRUCTURE_INPUT_SCHEMA_VERSION_1_1,
  createEmptyBridgeStructureInputDraft,
  generateBridgeStructureFromInput,
  getBridgeStructureInputDraft,
  parseBridgeStructureInputDraft,
  PRESENCE_STATUS,
  withPavementConfiguration,
  withPavementPresence,
  withRoadMarkingsConfiguration,
} from "../bridgeStructure";
import { computePavementQuantity } from "../quantity/pavementQuantity";
import { buildApolloVisualizationModel } from "../visualization";
import { fillSimpleSingleBridgeStructureInput } from "../testing/bridgeStructureFixtures";

function generatedBase() {
  let project = fillSimpleSingleBridgeStructureInput(createDefaultProject());
  const result = generateBridgeStructureFromInput(project, getBridgeStructureInputDraft(project));
  if (!result.ok) throw new Error(result.diagnostics.join("; "));
  return result.project;
}

describe("Step 5-3 P3 pavement / markings", () => {
  it("migrates 1.1 drafts to 1.2 with NOT_PROVIDED pavement and disabled markings", () => {
    const empty = createEmptyBridgeStructureInputDraft();
    const legacy = {
      ...empty,
      schemaVersion: APOLLO_BRIDGE_STRUCTURE_INPUT_SCHEMA_VERSION_1_1,
      spanLength: 30,
      bridgeLength: 30,
      width: 10,
      girderCount: 4,
      girderSpacing: 2.5,
      girderDepth: 2,
      topFlangeWidth: 0.4,
      topFlangeThickness: 0.03,
      bottomFlangeWidth: 0.4,
      bottomFlangeThickness: 0.04,
      webThickness: 0.016,
      deckThickness: 0.25,
      crossBeamSpacing: 5,
      stiffenerSpacing: null,
      swayBracingInterval: null,
      generatedAt: "2026-01-01T00:00:00.000Z",
    };
    // strip new fields to simulate 1.1 persistence
    const { pavementConfiguration: _p, roadMarkingsConfiguration: _r, ...raw } = legacy as typeof empty & {
      generatedAt: string;
    };
    const parsed = parseBridgeStructureInputDraft(raw);
    expect(parsed).not.toBeNull();
    expect(parsed?.schemaVersion).toBe(APOLLO_BRIDGE_STRUCTURE_INPUT_SCHEMA_VERSION);
    expect(parsed?.pavementConfiguration.presence).toBe(PRESENCE_STATUS.NOT_PROVIDED);
    expect(parsed?.roadMarkingsConfiguration.enabled).toBe(false);
    expect(parsed?.generatedAt).toBeNull();
  });

  it("invents no pavement solids when NOT_PROVIDED", () => {
    const project = generatedBase();
    const viz = buildApolloVisualizationModel({ project });
    expect(viz.ok).toBe(true);
    if (!viz.ok) return;
    expect(viz.model.solidGeometryParameters.some((s) => s.kind === "pavement")).toBe(false);
    expect(computePavementQuantity(getBridgeStructureInputDraft(project))).toBeNull();
  });

  it("builds pavement solid + quantity when PROVIDED", () => {
    let project = generatedBase();
    project = withPavementConfiguration(
      project,
      withPavementPresence(getBridgeStructureInputDraft(project).pavementConfiguration, PRESENCE_STATUS.PROVIDED),
    );
    project = withPavementConfiguration(project, {
      presence: PRESENCE_STATUS.PROVIDED,
      item: {
        thickness: 0.08,
        unitWeight: 22.5,
        startStation: null,
        endStation: null,
      },
    });
    const draft = getBridgeStructureInputDraft(project);
    const qty = computePavementQuantity(draft);
    expect(qty?.category).toBe("PAVEMENT");
    expect(draft.bridgeLength).not.toBeNull();
    expect(draft.width).not.toBeNull();
    expect(qty?.volumeM3).toBeCloseTo(draft.bridgeLength! * draft.width! * 0.08, 6);

    // regenerate so BSDD+viz path sees draft
    const regenerated = generateBridgeStructureFromInput(project, draft);
    expect(regenerated.ok).toBe(true);
    if (!regenerated.ok) return;
    const viz = buildApolloVisualizationModel({ project: regenerated.project });
    expect(viz.ok).toBe(true);
    if (!viz.ok) return;
    const pavement = viz.model.solidGeometryParameters.filter((s) => s.kind === "pavement");
    expect(pavement).toHaveLength(1);
    expect(pavement[0]?.exportable).toBe(true);
  });

  it("builds viz-only road markings that are not exportable", () => {
    let project = generatedBase();
    project = withPavementConfiguration(project, {
      presence: PRESENCE_STATUS.PROVIDED,
      item: { thickness: 0.05, unitWeight: 22.5, startStation: null, endStation: null },
    });
    project = withRoadMarkingsConfiguration(project, {
      ...getBridgeStructureInputDraft(project).roadMarkingsConfiguration,
      enabled: true,
    });
    const regenerated = generateBridgeStructureFromInput(project, getBridgeStructureInputDraft(project));
    expect(regenerated.ok).toBe(true);
    if (!regenerated.ok) return;
    const viz = buildApolloVisualizationModel({ project: regenerated.project });
    expect(viz.ok).toBe(true);
    if (!viz.ok) return;
    const marks = viz.model.solidGeometryParameters.filter((s) => s.kind === "road_marking");
    expect(marks.length).toBeGreaterThan(0);
    expect(marks.every((s) => s.exportable === false)).toBe(true);
    expect(viz.model.assumptions.some((a) => a.code === "road-markings-viz-only")).toBe(true);
  });
});
