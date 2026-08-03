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
  withBridgeStructureField,
  withHaunchConfiguration,
} from "../bridgeStructure";
import { fillSimpleSingleBridgeStructureInput } from "../testing/bridgeStructureFixtures";
import {
  QUANTITY_MODEL_SCHEMA_VERSION,
  assertQuantityModelExportable,
  buildQuantityModel,
  findQuantityValue,
  quantityModelToCsv,
  quantityModelToJson,
} from "../quantity/quantityModel";

function generateOrThrow(project: ReturnType<typeof createDefaultProject>) {
  const generated = generateBridgeStructureFromInput(project, getBridgeStructureInputDraft(project));
  if (!generated.ok) throw new Error(generated.diagnostics.join("; "));
  return generated.project;
}

function projectWithAppAndHaunch(options?: { unitWeight: number | null; rcUnitWeight: number | null }) {
  let project = fillSimpleSingleBridgeStructureInput(createDefaultProject());
  const rcUnitWeight = options && "rcUnitWeight" in options ? options.rcUnitWeight : 24.5;
  project = withBridgeStructureField(project, "rcUnitWeight", rcUnitWeight);
  const scopeId = project.project.id;
  let configuration = getBridgeStructureInputDraft(project).appurtenanceConfiguration;
  for (const slot of APPURTENANCE_SLOTS) {
    if (slot === "LEFT_CURB") {
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
        transverseOffset: -5,
        crossSectionShape: "RECT",
        width: 0.5,
        height: 0.25,
        materialRef: null,
        unitWeight: options?.unitWeight === undefined ? 24.5 : options.unitWeight,
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
      startStation: 0,
      endStation: 40,
      shapeType: "RECT",
      topWidth: 0.4,
      bottomWidth: 0.4,
      height: 0.15,
      materialRef: null,
    }),
  );
  return generateOrThrow(project);
}

describe("Step 4-C3 appurtenance and haunch quantities", () => {
  it("bumps QuantityModel schema to 1.1.0-development", () => {
    expect(QUANTITY_MODEL_SCHEMA_VERSION).toBe("1.1.0-development");
    const model = buildQuantityModel(projectWithAppAndHaunch());
    expect(model.schemaVersion).toBe("1.1.0-development");
  });

  it("derives length/area/volume/weight from C1 kernel with formula parity", () => {
    const model = buildQuantityModel(projectWithAppAndHaunch());
    // L=40, A=0.5*0.25=0.125, V=5, W=5*24.5=122.5
    near(findQuantityValue(model, "QTY-APP-LEFT_CURB-L"), 40);
    near(findQuantityValue(model, "QTY-APP-LEFT_CURB-A"), 0.125);
    near(findQuantityValue(model, "QTY-APP-LEFT_CURB-V"), 5);
    near(findQuantityValue(model, "QTY-APP-LEFT_CURB-W"), 122.5);
    expect(model.items.find((i) => i.quantityId === "QTY-APP-LEFT_CURB-V")?.formulaId).toBe(
      "F-S4C-APP-VOLUME",
    );
    expect(model.items.find((i) => i.quantityId === "QTY-APP-LEFT_CURB-W")?.formulaId).toBe(
      "F-S4C-APP-TOTAL-WEIGHT",
    );
    // Haunch RECT: A=0.4*0.15=0.06, V=2.4, W=2.4*24.5=58.8 per girder; 4 girders
    near(findQuantityValue(model, "QTY-HAUNCH-girder-0-V"), 2.4);
    near(findQuantityValue(model, "QTY-HAUNCH-TOTAL-V"), 9.6);
    near(findQuantityValue(model, "QTY-HAUNCH-TOTAL-W"), 9.6 * 24.5);
    expect(model.items.find((i) => i.quantityId === "QTY-HAUNCH-girder-0-A")?.formulaId).toBe(
      "F-S4C-HAUNCH-RECT-AREA",
    );
  });

  it("marks weight NOT_AVAILABLE when unit weight missing; volume still available", () => {
    const model = buildQuantityModel(
      projectWithAppAndHaunch({ unitWeight: null, rcUnitWeight: null }),
    );
    near(findQuantityValue(model, "QTY-APP-LEFT_CURB-V"), 5);
    expect(findQuantityValue(model, "QTY-APP-LEFT_CURB-W")).toBeNull();
    expect(model.items.find((i) => i.quantityId === "QTY-APP-LEFT_CURB-W")?.status).toBe(
      "NOT_AVAILABLE",
    );
    near(findQuantityValue(model, "QTY-HAUNCH-TOTAL-V"), 9.6);
    expect(findQuantityValue(model, "QTY-HAUNCH-TOTAL-W")).toBeNull();
  });

  it("does not invent EXPLICIT_NONE entities and does not double-count haunch into RC deck", () => {
    const withHaunch = buildQuantityModel(projectWithAppAndHaunch());
    const deckVol = findQuantityValue(withHaunch, "QTY-DK-VOL");
    const haunchVol = findQuantityValue(withHaunch, "QTY-HAUNCH-TOTAL-V");
    expect(deckVol).not.toBeNull();
    expect(haunchVol).not.toBeNull();
    // Deck body volume unchanged by haunch (width*L*deckThickness)
    near(deckVol, 12 * 40 * 0.25);
    expect(withHaunch.items.filter((i) => i.category === "APPURTENANCE" && i.quantityId.includes("RIGHT_CURB"))).toHaveLength(
      0,
    );

    const explicitNone = generateOrThrow(fillSimpleSingleBridgeStructureInput(createDefaultProject()));
    const noneModel = buildQuantityModel(explicitNone);
    expect(noneModel.items.filter((i) => i.category === "APPURTENANCE")).toHaveLength(0);
    expect(noneModel.items.filter((i) => i.category === "RC_HAUNCH")).toHaveLength(0);
  });

  it("exports CSV/JSON with source entity categories and rejects STALE export", () => {
    const project = projectWithAppAndHaunch();
    const model = buildQuantityModel(project);
    expect(quantityModelToJson(model)).toContain("APPURTENANCE");
    expect(quantityModelToCsv(model)).toContain("RC_HAUNCH");
    assertQuantityModelExportable(model);

    const stale = buildQuantityModel(withBridgeStructureField(project, "girderCount", 5));
    expect(stale.stale).toBe(true);
    expect(() => assertQuantityModelExportable(stale)).toThrow(/STALE/);
  });
});

function near(actual: number | null, expected: number) {
  expect(actual).not.toBeNull();
  expect(Math.abs(actual! - expected)).toBeLessThanOrEqual(Math.max(1e-9, 1e-12 * Math.abs(expected)));
}
