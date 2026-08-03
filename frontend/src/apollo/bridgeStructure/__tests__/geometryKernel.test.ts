import { describe, expect, it } from "vitest";
import {
  deriveAppurtenanceGeometries,
  deriveAppurtenanceGeometry,
} from "../appurtenanceGeometry";
import type { BridgeAppurtenanceModel } from "../appurtenanceTypes";
import {
  GEOMETRY_FORMULA_IDS,
  deriveLengthMeters,
  deriveMainGirderOffsets,
  deriveRectAreaMeters2,
  deriveTotalWeightKN,
  deriveTrapezoidAreaMeters2,
  deriveVolumeMeters3,
} from "../geometryFormulas";
import { deriveHaunchGeometries, deriveHaunchGeometry } from "../haunchGeometry";
import type { RcDeckHaunchModel } from "../haunchTypes";

function appurtenance(
  overrides: Partial<BridgeAppurtenanceModel> & Pick<BridgeAppurtenanceModel, "appurtenanceId" | "slot">,
): BridgeAppurtenanceModel {
  return {
    type: "CURB",
    side: "LEFT",
    startStation: 0,
    endStation: 40,
    transverseOffset: -5,
    crossSection: { shape: "RECT", width: 0.5, height: 0.25 },
    materialRef: null,
    unitWeight: 24.5,
    unitWeightStatus: "USER_PROVIDED_UNVERIFIED",
    status: "UNVERIFIED_DEVELOPMENT_ONLY",
    designAuthorization: "NOT_AUTHORIZED",
    provenance: { source: "user_input", generatedBy: "buildBridgeAppurtenanceModels" },
    ...overrides,
  };
}

function haunch(
  overrides: Partial<RcDeckHaunchModel> &
    Pick<RcDeckHaunchModel, "haunchId" | "mainGirderKey" | "mainGirderRefId">,
): RcDeckHaunchModel {
  return {
    startStation: 0,
    endStation: 40,
    shapeType: "RECT",
    topWidth: 0.4,
    bottomWidth: 0.4,
    height: 0.15,
    materialRef: null,
    status: "UNVERIFIED_DEVELOPMENT_ONLY",
    designAuthorization: "NOT_AUTHORIZED",
    provenance: {
      source: "user_input",
      generatedBy: "buildRcDeckHaunchModels",
      datum: "top_flange_upper_face_to_deck_soffit",
    },
    ...overrides,
  };
}

describe("geometryFormulas", () => {
  it("derives length/area/volume/weight with formula IDs", () => {
    expect(deriveLengthMeters(0, 40, GEOMETRY_FORMULA_IDS.APP_LENGTH)).toEqual({
      ok: true,
      value: 40,
      formulaId: GEOMETRY_FORMULA_IDS.APP_LENGTH,
    });
    expect(deriveRectAreaMeters2(0.5, 0.25)).toEqual({
      ok: true,
      value: 0.125,
      formulaId: GEOMETRY_FORMULA_IDS.APP_RECT_AREA,
    });
    const trap = deriveTrapezoidAreaMeters2(0.3, 0.5, 0.2);
    expect(trap.ok).toBe(true);
    if (!trap.ok) return;
    expect(trap.value).toBeCloseTo(0.08);
    expect(trap.formulaId).toBe(GEOMETRY_FORMULA_IDS.HAUNCH_TRAP_AREA);
    expect(deriveVolumeMeters3(0.125, 40, GEOMETRY_FORMULA_IDS.APP_VOLUME)).toEqual({
      ok: true,
      value: 5,
      formulaId: GEOMETRY_FORMULA_IDS.APP_VOLUME,
    });
    expect(deriveTotalWeightKN(5, 24.5, GEOMETRY_FORMULA_IDS.APP_TOTAL_WEIGHT)).toEqual({
      ok: true,
      value: 122.5,
      formulaId: GEOMETRY_FORMULA_IDS.APP_TOTAL_WEIGHT,
    });
  });

  it("fails closed for invalid values and missing unit weight", () => {
    expect(deriveLengthMeters(10, 5, GEOMETRY_FORMULA_IDS.APP_LENGTH).ok).toBe(false);
    expect(deriveRectAreaMeters2(0, 1).ok).toBe(false);
    expect(deriveTotalWeightKN(1, null, GEOMETRY_FORMULA_IDS.APP_TOTAL_WEIGHT).ok).toBe(false);
  });

  it("derives centered girder offsets", () => {
    expect(deriveMainGirderOffsets(4, 3)).toEqual([-4.5, -1.5, 1.5, 4.5]);
    expect(deriveMainGirderOffsets(1, 3)).toEqual([0]);
    expect(deriveMainGirderOffsets(0, 3)).toBeNull();
  });
});

describe("appurtenanceGeometry", () => {
  it("derives RECT geometry for all slots with deterministic order", () => {
    const models = [
      appurtenance({ appurtenanceId: "b", slot: "RIGHT_CURB", side: "RIGHT", type: "CURB", transverseOffset: 5 }),
      appurtenance({ appurtenanceId: "a", slot: "LEFT_CURB" }),
    ];
    const { geometries, failures } = deriveAppurtenanceGeometries(models, { deckThicknessM: 0.22 });
    expect(failures).toHaveLength(0);
    expect(geometries.map((g) => g.slot)).toEqual(["LEFT_CURB", "RIGHT_CURB"]);
    expect(geometries[0]!.lengthM).toBe(40);
    expect(geometries[0]!.areaM2).toBe(0.125);
    expect(geometries[0]!.volumeM3).toBe(5);
    expect(geometries[0]!.totalWeightKN).toBe(122.5);
    expect(geometries[0]!.placement.deckTopZ).toBe(0.22);
    expect(geometries[0]!.placement.centerZ).toBe(0.22 + 0.125);
    expect(geometries[0]!.designAuthorization).toBe("NOT_AUTHORIZED");
    expect(geometries[0]!.provenance.offsetAnchor).toBe("cross_section_centerline");
  });

  it("keeps volume when unitWeight missing; weight NOT_AVAILABLE", () => {
    const result = deriveAppurtenanceGeometry(
      appurtenance({
        appurtenanceId: "c",
        slot: "MEDIAN",
        type: "MEDIAN",
        side: "CENTER",
        transverseOffset: 0,
        unitWeight: null,
        unitWeightStatus: "NOT_PROVIDED",
      }),
      { deckThicknessM: 0.22 },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.geometry.volumeM3).toBe(5);
    expect(result.geometry.totalWeightKN).toBeNull();
    expect(result.geometry.totalWeightStatus).toBe("NOT_AVAILABLE");
  });

  it("fail-closes invalid stations without inventing dimensions", () => {
    const result = deriveAppurtenanceGeometry(
      appurtenance({ appurtenanceId: "d", slot: "LEFT_CURB", startStation: 20, endStation: 10 }),
      { deckThicknessM: 0.22 },
    );
    expect(result.ok).toBe(false);
  });
});

describe("haunchGeometry", () => {
  it("derives RECT and TRAPEZOID with girder Y from canonical offsets", () => {
    const rect = deriveHaunchGeometry(
      haunch({ haunchId: "h0", mainGirderKey: "girder-0", mainGirderRefId: "mg-0" }),
      { girderCount: 4, girderSpacing: 3, rcUnitWeightKNPerM3: 24.5 },
    );
    expect(rect.ok).toBe(true);
    if (!rect.ok) return;
    expect(rect.geometry.areaM2).toBeCloseTo(0.06);
    expect(rect.geometry.volumeM3).toBeCloseTo(2.4);
    expect(rect.geometry.placement.girderOffsetY).toBe(-4.5);
    expect(rect.geometry.placement.topFlangeUpperFaceZ).toBe(0);
    expect(rect.geometry.placement.deckSoffitZ).toBe(0.15);

    const trap = deriveHaunchGeometry(
      haunch({
        haunchId: "h1",
        mainGirderKey: "girder-1",
        mainGirderRefId: "mg-1",
        shapeType: "TRAPEZOID",
        topWidth: 0.3,
        bottomWidth: 0.5,
        height: 0.2,
      }),
      { girderCount: 4, girderSpacing: 3, rcUnitWeightKNPerM3: null },
    );
    expect(trap.ok).toBe(true);
    if (!trap.ok) return;
    expect(trap.geometry.areaM2).toBeCloseTo(0.08);
    expect(trap.geometry.totalWeightStatus).toBe("NOT_AVAILABLE");
    expect(trap.geometry.placement.girderOffsetY).toBe(-1.5);
  });

  it("sorts by girder key deterministically and rejects bad RECT widths", () => {
    const { geometries } = deriveHaunchGeometries(
      [
        haunch({ haunchId: "h2", mainGirderKey: "girder-2", mainGirderRefId: "mg-2" }),
        haunch({ haunchId: "h0", mainGirderKey: "girder-0", mainGirderRefId: "mg-0" }),
      ],
      { girderCount: 4, girderSpacing: 3, rcUnitWeightKNPerM3: 24 },
    );
    expect(geometries.map((g) => g.mainGirderKey)).toEqual(["girder-0", "girder-2"]);

    const bad = deriveHaunchGeometry(
      haunch({
        haunchId: "bad",
        mainGirderKey: "girder-0",
        mainGirderRefId: "mg-0",
        shapeType: "RECT",
        topWidth: 0.3,
        bottomWidth: 0.5,
      }),
      { girderCount: 4, girderSpacing: 3, rcUnitWeightKNPerM3: 24 },
    );
    expect(bad.ok).toBe(false);
  });
});
