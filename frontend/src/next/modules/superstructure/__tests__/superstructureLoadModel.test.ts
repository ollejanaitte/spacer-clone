import { describe, expect, it } from "vitest";
import type { BridgeLayoutReference, RoadReference, SuperstructureDocument } from "../superstructureTypes";
import { buildSuperstructureDocument, attachSuperstructureHandoffs } from "../superstructureDocumentDomain";
import {
  buildDeadLoads,
  buildLoadModel,
  comboOneTotalKN,
  STEEL_UNIT_WEIGHT_KN_M3,
} from "../superstructureLoadModel";

function makeDocument(sectionOverrides: Record<string, unknown> = {}, deckOverrides: Record<string, unknown> = {}): SuperstructureDocument {
  const built = buildSuperstructureDocument({
    projectId: "PROJ-1",
    bridgeLayoutReference: { bridgeId: "BR-900", moduleId: "bridgeLayout", documentVersion: "0.1.0", layoutFingerprint: "fp" } as BridgeLayoutReference,
    roadReference: { moduleId: "road", alignmentId: "ALN", stationReferenceId: null, coordinatePolicyId: null } as RoadReference,
    structuralSystem: { spanSystem: "continuous", bridgeSystem: "CONTINUOUS" },
    girderConfiguration: {
      girderCount: 2,
      girderSpacingM: 8,
      girderLines: [] as never[],
      girderSectionModel: {
        depthM: 2.0,
        webThicknessM: 0.012,
        topFlange: { widthM: 0.5, thicknessM: 0.03 },
        bottomFlange: { widthM: 0.6, thicknessM: 0.04 },
        areaM2: null,
        unitWeightPerM: null,
        ...sectionOverrides,
      },
    },
    deckConfiguration: {
      deckId: "DECK-1",
      deckKind: "rc_non_composite",
      thicknessM: 0.24,
      unitWeight: 24.5,
      overhangLeftM: 0.5,
      overhangRightM: 0.5,
      resolvedWidthM: 12.0,
      ...deckOverrides,
    },
  });
  if (!built.ok) throw new Error("build failed");
  return attachSuperstructureHandoffs(built.document, {
    handoffId: "SH-1",
    schemaVersion: "1.0.0",
    generatedAt: "2026-08-12T00:00:00.000Z",
    spans: [
      { spanId: "S1", index: 0, startSupportId: "A1", endSupportId: "P1", startStation: 0, endStation: 40, spanLength: 40, startSupportSkew: null, endSupportSkew: null },
      { spanId: "S2", index: 1, startSupportId: "P1", endSupportId: "A2", startStation: 40, endStation: 80, spanLength: 40, startSupportSkew: null, endSupportSkew: null },
    ],
  }, {
    handoffId: "SH-2",
    schemaVersion: "1.0.0",
    generatedAt: "2026-08-12T00:00:00.000Z",
    supports: [
      { supportId: "A1", supportType: "abutment", label: "A1", station: 0, position: { domainX: 0, domainY: 0, elevation: 100 }, tangentAzimuthRad: 0, skewAngleRad: null, terrainElevation: 98, roadReferenceId: "r", coordinateContextId: null },
      { supportId: "P1", supportType: "pier", label: "P1", station: 40, position: { domainX: 40, domainY: 0, elevation: 101 }, tangentAzimuthRad: 0, skewAngleRad: null, terrainElevation: 97, roadReferenceId: "r", coordinateContextId: null },
      { supportId: "A2", supportType: "abutment", label: "A2", station: 80, position: { domainX: 80, domainY: 0, elevation: 100 }, tangentAzimuthRad: 0, skewAngleRad: null, terrainElevation: 98, roadReferenceId: "r", coordinateContextId: null },
    ],
  });
}

describe("Superstructure load model (WP-E)", () => {
  it("derives DL-DECK and DL-STRUCTURAL (girder) from declared values", () => {
    const doc = makeDocument();
    const loads = buildDeadLoads(doc);
    // deck: 0.24 x 24.5 x 12 x 80 = 564.48 kN
    expect(loads.deck.state).toBe("DERIVED");
    expect(loads.deck.valueKN).toBeCloseTo(0.24 * 24.5 * 12.0 * 80, 6);
    // girder: section area derived -> unitWeight = area x 77
    expect(loads.structuralGirder.state).toBe("DERIVED");
    expect(loads.structuralGirder.valueKN).toBeGreaterThan(0);
    // secondary: MISSING (dimensions DEFER -> not invented)
    expect(loads.structuralSecondary.state).toBe("MISSING");
    expect(loads.structuralSecondary.valueKN).toBeNull();
    // pavement / appurtenances: input boundary
    expect(loads.pavement.state).toBe("MISSING");
    expect(loads.appurtenances.state).toBe("MISSING");
  });

  it("uses CONFIRMED unitWeightPerM when declared", () => {
    const doc = makeDocument({ unitWeightPerM: 10.0 });
    const loads = buildDeadLoads(doc);
    expect(loads.structuralGirder.state).toBe("CONFIRMED");
    expect(loads.structuralGirder.valueKN).toBeCloseTo(10.0 * 80 * 2, 6);
  });

  it("keeps DL-DECK MISSING when deck thickness is not declared (never invents)", () => {
    const doc = makeDocument({}, { thicknessM: null });
    const loads = buildDeadLoads(doc);
    expect(loads.deck.state).toBe("MISSING");
    expect(loads.deck.valueKN).toBeNull();
  });

  it("keeps girder MISSING when section is fully undeclared", () => {
    const doc = makeDocument({
      depthM: null,
      webThicknessM: null,
      topFlange: null,
      bottomFlange: null,
    });
    const loads = buildDeadLoads(doc);
    expect(loads.structuralGirder.state).toBe("MISSING");
  });

  it("builds the LoadModel container with live load input boundary null", () => {
    const model = buildLoadModel(makeDocument());
    expect(model.liveLoadReference).toBeNull();
    expect(model.deadLoads.structuralGirder.valueKN).not.toBeNull();
  });

  it("computes COMBO-1 total (DL-STRUCTURAL + DL-DECK)", () => {
    const loads = buildDeadLoads(makeDocument());
    const total = comboOneTotalKN(loads);
    expect(total).not.toBeNull();
    expect(total).toBeGreaterThan(0);
  });

  it("STEEL_UNIT_WEIGHT is the documented constant", () => {
    expect(STEEL_UNIT_WEIGHT_KN_M3).toBe(77.0);
  });
});
