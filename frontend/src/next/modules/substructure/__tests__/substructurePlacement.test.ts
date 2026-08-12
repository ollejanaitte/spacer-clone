import { describe, expect, it } from "vitest";
import type { LinearAlignment } from "../../../../liner/core/types";
import type { VerticalElement } from "../../../../liner/core/geometry/vertical";
import { buildLinerIntermediateFromRoad } from "../../superstructure/superstructureGeometry";
import { buildSupportPlacementFromHandoff } from "../substructurePhase4Adapter";
import { buildBearingReactionFromHandoff } from "../substructurePhase5Adapter";
import { buildSubstructurePlacement } from "../substructurePlacement";
import type { SuperstructureHandoff } from "../../superstructure/superstructureHandoff";
import { buildSubstructureDocument, attachSubstructureHandoffs } from "../substructureDocumentDomain";
import type { SubstructureDocument } from "../substructureTypes";

function straightRoad() {
  const horizontal: LinearAlignment = {
    id: "RB-STRAIGHT",
    linerModelId: "MODEL-RB",
    coordinatePolicyId: "COORD-RB",
    elements: [{ id: "L1", type: "straight", start: { x: 0, y: 0 }, azimuth: 0, length: 600 }],
  };
  const vertical: VerticalElement[] = [
    { type: "grade", id: "G1", startPhysicalDistance: 0, startElevation: 100, grade: 0.0, length: 600 },
  ];
  return { horizontal, vertical };
}

import type { SupportReferences } from "../substructureTypes";

function handoff(): SupportReferences {
  return {
    handoffId: "SH-1",
    schemaVersion: "1.0.0",
    generatedAt: "2026-08-12T00:00:00.000Z",
    supports: [
      { supportId: "A1", supportType: "abutment", label: "A1", station: 100, position: { domainX: 100, domainY: 0, elevation: 100 }, tangentAzimuthRad: 0, skewAngleRad: null, terrainElevation: 98, roadReferenceId: "RB-STRAIGHT", coordinateContextId: null },
      { supportId: "P1", supportType: "pier", label: "P1", station: 300, position: { domainX: 300, domainY: 0, elevation: 100 }, tangentAzimuthRad: 0, skewAngleRad: 0.1, terrainElevation: 95, roadReferenceId: "RB-STRAIGHT", coordinateContextId: null },
      { supportId: "A2", supportType: "abutment", label: "A2", station: 500, position: { domainX: 500, domainY: 0, elevation: 100 }, tangentAzimuthRad: 0, skewAngleRad: null, terrainElevation: 97, roadReferenceId: "RB-STRAIGHT", coordinateContextId: null },
    ],
  };
}

function phase5Handoff(): SuperstructureHandoff {
  return {
    handoffKind: "superstructure-handoff",
    schemaVersion: "1.0.0",
    handoffId: "SH-RB",
    bridgeId: "BR-900",
    documentReference: "SS-1",
    generatedAt: "2026-08-12T00:00:00.000Z",
    coordinateContext: { coordinatePolicyId: null, axisConvention: "x-along/y-transverse/z-up", unitSystem: "metric", signConvention: { reactionZ: "up-positive", skew: "counterclockwise-positive" }, positionConvention: "project-global-XYZ" },
    superstructureType: "plate_girder_rc_slab_non_composite",
    structuralSystem: { spanSystem: "continuous", bridgeSystem: "CONTINUOUS" },
    supports: [
      {
        supportId: "P1",
        supportType: "pier",
        station: 300,
        position: { x: 300, y: 0, z: 100 },
        tangentAzimuthRad: 0,
        skewAngleRad: 0.1,
        localFrame: { tangent: { x: 1, y: 0, z: 0 }, transverse: { x: 0, y: 1, z: 0 }, vertical: { x: 0, y: 0, z: 1 } },
        bearingSeats: [
          { seatId: "BRG-P1-G1", girderId: "G1", position: { x: 300, y: -4, z: 108 }, elevation: 108, localOffset: { longitudinalM: 0, transverseM: -4 }, orientation: { longitudinalAxis: { x: 1, y: 0, z: 0 }, transverseAxis: { x: 0, y: 1, z: 0 }, verticalAxis: { x: 0, y: 0, z: 1 } }, bearingType: "rubber", fixedOrMovable: "MOVABLE", longitudinalDirection: "+station", transverseDirection: "L" },
        ],
        reactionCases: [
          { caseId: "RC-DL-1", combinationId: "DL-STRUCTURAL", seatId: "BRG-P1-G1", supportId: "P1", girderId: "G1", Fx: 0, Fy: 0, Fz: 150, Mx: 0, My: 0, Mz: 0, unit: "kN", momentUnit: "kNm", signConvention: { force: "up-positive", moment: "right-hand-rule" } },
        ],
      },
    ],
    girderBottomElevation: { P1: 8.4 },
    deckElevation: { P1: null },
    superstructureEnvelope: { minX: 0, maxX: 100, minY: -4, maxY: 4, minZ: 100, maxZ: 108 },
    selfWeight: { structuralGirderKN: 1000, structuralSecondaryKN: null, deckKN: 500, totalKN: 1500 },
    validation: { ok: true, issues: [] },
  };
}

function makeDocument(): SubstructureDocument {
  const phase4 = buildSupportPlacementFromHandoff(handoff(), { alignmentId: "RB-STRAIGHT" });
  const phase5 = buildBearingReactionFromHandoff(phase5Handoff());
  const built = buildSubstructureDocument({
    projectId: "PROJ-1",
    bridgeLayoutReference: { bridgeId: "BR-900", moduleId: "bridgeLayout", documentVersion: "0.1.0", layoutFingerprint: "fp" },
    superstructureReference: { bridgeId: "BR-900", moduleId: "superstructure", documentVersion: "0.1.0", superstructureDocumentId: "SS-1", handoffSchemaVersion: "1.0.0" },
    roadReference: { moduleId: "road", alignmentId: "RB-STRAIGHT", stationReferenceId: null, coordinatePolicyId: null },
    supports: phase4.supports,
  });
  if (!built.ok) throw new Error("build failed");
  return attachSubstructureHandoffs(built.document, phase4.supportReferences, phase5.bearingReactionReferences);
}

describe("Substructure placement (WP-D)", () => {
  it("computes real placement snapshots via LINER + attaches bearing seats (T6-GEO-001/002)", () => {
    const road = straightRoad();
    const intermediate = buildLinerIntermediateFromRoad({ horizontal: road.horizontal, vertical: road.vertical, crossSections: [] });
    if (!intermediate) throw new Error("no intermediate");
    const doc = makeDocument();
    // attach phase5 bearing seats
    const docWithSeats = { ...doc, bearingSeatReferences: doc.bearingReactionReferences!.bearingSeats };
    const result = buildSubstructurePlacement(docWithSeats, intermediate);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.supports).toHaveLength(3);
    // real snapshots from LINER (straight road: tangent +X, transverse +Y, vertical +Z)
    const p1 = result.supports.find((s) => s.supportId === "P1")!;
    expect(p1.placementSnapshot?.position.z).toBeCloseTo(100, 3);
    expect(p1.placementSnapshot?.tangent.x).toBe(1);
    // bearing seat attached
    expect(p1.bearingSeats).toHaveLength(1);
    expect(p1.bearingSeats[0].seatId).toBe("BRG-P1-G1");
    // skew preserved
    expect(p1.skewRad).toBeCloseTo(0.1, 6);
  });

  it("fails closed when LINER placement is fatal (invalid station)", () => {
    const road = straightRoad();
    const intermediate = buildLinerIntermediateFromRoad({ horizontal: road.horizontal, vertical: road.vertical, crossSections: [] });
    if (!intermediate) throw new Error("no intermediate");
    const doc = makeDocument();
    // station outside alignment (700 > 600)
    const bad = {
      ...doc,
      supports: doc.supports.map((s, i) => (i === 2 ? { ...s, placement: { ...s.placement, station: 700 } } : s)),
    };
    const result = buildSubstructurePlacement(bad, intermediate);
    if (result.ok) {
      throw new Error("fatal placement was not detected");
    }
    expect(result.diagnostics.length).toBeGreaterThan(0);
  });
});
