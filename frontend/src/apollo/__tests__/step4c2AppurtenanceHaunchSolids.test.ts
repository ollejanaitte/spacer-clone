import { describe, expect, it } from "vitest";
import { createDefaultProject } from "../../data/defaultProject";
import {
  APPURTENANCE_SLOTS,
  PRESENCE_STATUS,
  applyHaunchToAllGirders,
  generateBridgeStructureFromInput,
  getBridgeStructureInputDraft,
  stableAppurtenanceId,
  withAppurtenanceConfiguration,
  withAppurtenanceSlotItem,
  withAppurtenanceSlotPresence,
  withHaunchConfiguration,
} from "../bridgeStructure";
import { exportApolloBinaryStl, parseBinaryStl, validateApolloBinaryStlTriangles } from "../export";
import { fillSimpleSingleBridgeStructureInput } from "../testing/bridgeStructureFixtures";
import { buildApolloVisualizationModelOrThrow } from "../visualization";

function projectWithProvidedAppurtenanceAndHaunch() {
  let project = fillSimpleSingleBridgeStructureInput(createDefaultProject());
  const scopeId = project.project.id;
  let configuration = getBridgeStructureInputDraft(project).appurtenanceConfiguration;
  for (const slot of APPURTENANCE_SLOTS) {
    if (slot === "LEFT_CURB" || slot === "RIGHT_CURB") {
      configuration = withAppurtenanceSlotPresence(
        configuration,
        slot,
        PRESENCE_STATUS.PROVIDED,
        scopeId,
      );
      configuration = withAppurtenanceSlotItem(configuration, slot, {
        appurtenanceId: stableAppurtenanceId(scopeId, slot),
        startStation: 0,
        endStation: 40,
        transverseOffset: slot === "LEFT_CURB" ? -5 : 5,
        crossSectionShape: "RECT",
        width: 0.5,
        height: 0.25,
        materialRef: null,
        unitWeight: 24.5,
      });
    } else {
      configuration = withAppurtenanceSlotPresence(
        configuration,
        slot,
        PRESENCE_STATUS.EXPLICIT_NONE,
        scopeId,
      );
    }
  }
  project = withAppurtenanceConfiguration(project, configuration);
  project = withHaunchConfiguration(
    project,
    applyHaunchToAllGirders(4, scopeId, {
      startStation: 5,
      endStation: 35,
      shapeType: "RECT",
      topWidth: 0.4,
      bottomWidth: 0.4,
      height: 0.15,
      materialRef: null,
    }),
  );
  const draft = getBridgeStructureInputDraft(project);
  const generated = generateBridgeStructureFromInput(project, draft);
  expect(generated.ok).toBe(true);
  if (!generated.ok) throw new Error("generation failed");
  return generated.project;
}

describe("Step 4-C2 appurtenance and haunch solids / STL", () => {
  it("builds PROVIDED appurtenance and haunch solids from the C1 kernel", () => {
    const project = projectWithProvidedAppurtenanceAndHaunch();
    const model = buildApolloVisualizationModelOrThrow({ project });
    const apps = model.solidGeometryParameters.filter((s) => s.kind === "appurtenance");
    const haunches = model.solidGeometryParameters.filter((s) => s.kind === "haunch");
    expect(apps).toHaveLength(2);
    expect(haunches).toHaveLength(4);
    expect(apps.every((s) => s.visibilityGroup === "appurtenances")).toBe(true);
    expect(haunches.every((s) => s.visibilityGroup === "rc-deck-haunches")).toBe(true);
    expect(apps.every((s) => s.designEntityKind === "BridgeAppurtenance")).toBe(true);
    expect(haunches.every((s) => s.designEntityKind === "Haunch")).toBe(true);
    expect(apps[0]!.dimensionsM.length).toBe(40);
    expect(apps[0]!.dimensionsM.width).toBe(0.5);
    expect(apps[0]!.dimensionsM.height).toBe(0.25);
    expect(haunches[0]!.dimensionsM.startStation).toBe(5);
    expect(haunches[0]!.dimensionsM.endStation).toBe(35);
    expect(haunches[0]!.dimensionsM.length).toBe(30);
    expect(model.assumptions.some((a) => a.code === "appurtenance-solids-local-crs")).toBe(true);
    expect(model.assumptions.some((a) => a.code === "haunch-solids-datum")).toBe(true);
  });

  it("does not invent solids for EXPLICIT_NONE slots", () => {
    const project = fillSimpleSingleBridgeStructureInput(createDefaultProject());
    const generated = generateBridgeStructureFromInput(project, getBridgeStructureInputDraft(project));
    expect(generated.ok).toBe(true);
    if (!generated.ok) throw new Error("generation failed");
    const model = buildApolloVisualizationModelOrThrow({ project: generated.project });
    expect(model.solidGeometryParameters.filter((s) => s.kind === "appurtenance")).toHaveLength(0);
    expect(model.solidGeometryParameters.filter((s) => s.kind === "haunch")).toHaveLength(0);
  });

  it("exports STL with finite triangles and entity parity", () => {
    const project = projectWithProvidedAppurtenanceAndHaunch();
    const model = buildApolloVisualizationModelOrThrow({ project });
    const result = exportApolloBinaryStl(model);
    const parsed = parseBinaryStl(result.bytes);
    expect(parsed.triangleCount).toBeGreaterThan(0);
    expect(validateApolloBinaryStlTriangles(parsed.triangles)).toEqual({
      invalidCoordinateCount: 0,
      zeroAreaCount: 0,
    });
    expect(result.manifest.entityCounts.appurtenances).toBe(2);
    expect(result.manifest.entityCounts.haunches).toBe(4);
    expect(result.manifest.includedGroups).toContain("appurtenances");
    expect(result.manifest.includedGroups).toContain("rc-deck-haunches");
    expect(Number.isFinite(result.boundingBoxMm.min[0])).toBe(true);
    expect(Number.isFinite(result.boundingBoxMm.max[2])).toBe(true);
    // Appurtenance sits on deck top (0.25) with height 0.25 → top Z ≈ 0.5 m = 500 mm
    expect(result.boundingBoxMm.max[2]).toBeGreaterThan(240);
  });

  it("keeps TRAPEZOID haunch display as average-width box with development assumption", () => {
    let project = fillSimpleSingleBridgeStructureInput(createDefaultProject());
    const scopeId = project.project.id;
    let configuration = getBridgeStructureInputDraft(project).appurtenanceConfiguration;
    for (const slot of APPURTENANCE_SLOTS) {
      configuration = withAppurtenanceSlotPresence(
        configuration,
        slot,
        PRESENCE_STATUS.EXPLICIT_NONE,
        scopeId,
      );
    }
    project = withAppurtenanceConfiguration(project, configuration);
    project = withHaunchConfiguration(
      project,
      applyHaunchToAllGirders(4, scopeId, {
        startStation: 0,
        endStation: 40,
        shapeType: "TRAPEZOID",
        topWidth: 0.3,
        bottomWidth: 0.5,
        height: 0.2,
        materialRef: null,
      }),
    );
    const generated = generateBridgeStructureFromInput(project, getBridgeStructureInputDraft(project));
    expect(generated.ok).toBe(true);
    if (!generated.ok) throw new Error("generation failed");
    const model = buildApolloVisualizationModelOrThrow({ project: generated.project });
    const haunches = model.solidGeometryParameters.filter((s) => s.kind === "haunch");
    expect(haunches).toHaveLength(4);
    expect(haunches[0]!.dimensionsM.width).toBeCloseTo(0.4);
    expect(haunches[0]!.dimensionsM.shapeRect).toBe(0);
    expect(
      model.assumptions.some((a) => a.code === "haunch-trapezoid-display-average-width"),
    ).toBe(true);
  });
});
