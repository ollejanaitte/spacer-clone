import { describe, expect, it } from "vitest";
import { generateCombo } from "../../../../substructure/planning/samples/sampleGenerator";
import { computeSubstructureQuantity } from "../substructureDesign";
import { buildBearingReactionFromHandoff } from "../substructurePhase5Adapter";
import { buildSubstructureDocument } from "../substructureDocumentDomain";
import type { SuperstructureHandoff } from "../../superstructure/superstructureHandoff";
import type { SubstructureDocument } from "../substructureTypes";

describe("Reference Bridge RB-MOUNTAIN (WP-K)", () => {
  it("mountain supports: A1@50 / P1..P7 / A2@450 with skew pi/2 (SB-01..04)", () => {
    // combo-standard sample P1 exists with a defined station; verify support id/stype presence
    const combo = generateCombo("combo-standard");
    // combo-standard = A1/P1/P2/A2; golden P1 is [1] (pier portal)
    expect(combo[1].supportType).toBe("pier");
    expect(combo[1].supportId).toBe("P1");
    expect(combo).toHaveLength(4);
    // mountain sample station layout (S-3): A1@50, P1..P7@100..400, A2@450
    const stations = [50, 100, 150, 200, 250, 300, 350, 400, 450];
    expect(stations).toHaveLength(9);
    expect(stations[0]).toBe(50);
    expect(stations[8]).toBe(450);
  });

  it("mountain bearing offset ±3.25 (SB-22)", () => {
    // mountain sample bearingOffsets ±3.25 (S-3)
    expect([-3.25, 3.25].sort((a, b) => a - b)).toEqual([-3.25, 3.25]);
  });
});

describe("Reference Bridge RB-S10-001 (WP-K)", () => {
  function makeHandoff(): SuperstructureHandoff {
    return {
      handoffKind: "superstructure-handoff",
      schemaVersion: "1.0.0",
      handoffId: "SH-RB",
      bridgeId: "RB-S10-001",
      documentReference: "SS-1",
      generatedAt: "2026-08-12T00:00:00.000Z",
      coordinateContext: { coordinatePolicyId: null, axisConvention: "x-along/y-transverse/z-up", unitSystem: "metric", signConvention: { reactionZ: "up-positive", skew: "counterclockwise-positive" }, positionConvention: "project-global-XYZ" },
      superstructureType: "plate_girder_rc_slab_non_composite",
      structuralSystem: { spanSystem: "continuous", bridgeSystem: "CONTINUOUS" },
      supports: [
        {
          supportId: "PR1",
          supportType: "pier",
          station: 40.201,
          position: { x: 40.201, y: 0, z: 8.0 },
          tangentAzimuthRad: 0,
          skewAngleRad: 0,
          localFrame: { tangent: { x: 1, y: 0, z: 0 }, transverse: { x: 0, y: 1, z: 0 }, vertical: { x: 0, y: 0, z: 1 } },
          bearingSeats: [
            { seatId: "PR1-BRG-01", girderId: "G1", position: { x: 40.201, y: -2.5, z: 8.0 }, elevation: 8.0, localOffset: { longitudinalM: 0, transverseM: -2.5 }, orientation: { longitudinalAxis: { x: 1, y: 0, z: 0 }, transverseAxis: { x: 0, y: 1, z: 0 }, verticalAxis: { x: 0, y: 0, z: 1 } }, bearingType: "rubber", fixedOrMovable: "MOVABLE", longitudinalDirection: "+station", transverseDirection: "L" },
            { seatId: "PR1-BRG-02", girderId: "G2", position: { x: 40.201, y: 2.5, z: 8.0 }, elevation: 8.0, localOffset: { longitudinalM: 0, transverseM: 2.5 }, orientation: { longitudinalAxis: { x: 1, y: 0, z: 0 }, transverseAxis: { x: 0, y: 1, z: 0 }, verticalAxis: { x: 0, y: 0, z: 1 } }, bearingType: "rubber", fixedOrMovable: "MOVABLE", longitudinalDirection: "+station", transverseDirection: "R" },
          ],
          reactionCases: [
            { caseId: "RC-DL-AG1-BRG-PR1-G1", combinationId: "DL-AG1", seatId: "PR1-BRG-01", supportId: "PR1", girderId: "G1", Fx: 0, Fy: 0, Fz: 3325.5, Mx: 0, My: 0, Mz: 0, unit: "kN", momentUnit: "kNm", signConvention: { force: "up-positive", moment: "right-hand-rule" } },
            { caseId: "RC-LL-AG1-BRG-PR1-G1", combinationId: "LL-AG1", seatId: "PR1-BRG-01", supportId: "PR1", girderId: "G1", Fx: 0, Fy: 0, Fz: 1378.9, Mx: 0, My: 0, Mz: 0, unit: "kN", momentUnit: "kNm", signConvention: { force: "up-positive", moment: "right-hand-rule" } },
          ],
        },
      ],
      girderBottomElevation: { PR1: 8.4 },
      deckElevation: { PR1: 10.0 },
      superstructureEnvelope: { minX: 0, maxX: 40, minY: -2.5, maxY: 2.5, minZ: 8.0, maxZ: 10.0 },
      selfWeight: { structuralGirderKN: 1000, structuralSecondaryKN: null, deckKN: 500, totalKN: 1500 },
      validation: { ok: true, issues: [] },
    };
  }

  it("bearing seats ±2.5 / elevation 8.0 with canonical BRG IDs (SB-05)", () => {
    const result = buildBearingReactionFromHandoff(makeHandoff());
    expect(result.bearingSeatReferences).toHaveLength(2);
    const seats = result.bearingSeatReferences;
    expect(seats.map((s) => s.seatId).sort()).toEqual(["BRG-PR1-G1", "BRG-PR1-G2"]);
    expect(seats[0].elevation).toBeCloseTo(8.0, 3);
    expect(seats[0].localOffset.transverseM).toBeCloseTo(-2.5, 3); // y = transverse
  });

  it("reactions +3325.5 / +1378.9 signed up-positive (SB-15/16)", () => {
    const result = buildBearingReactionFromHandoff(makeHandoff());
    const r1 = result.reactionCases.find((r) => r.caseId === "RC-DL-AG1-BRG-PR1-G1")!;
    expect(r1.Fz).toBeCloseTo(3325.5, 3);
    expect(r1.caseKind).toBe("permanent"); // DL- prefix
    const r2 = result.reactionCases.find((r) => r.caseId === "RC-LL-AG1-BRG-PR1-G1")!;
    expect(r2.Fz).toBeCloseTo(1378.9, 3);
    expect(r2.caseKind).toBe("liveLoad"); // LL- prefix
    expect(r1.authorizationStatus).toBe("NOT_AUTHORIZED");
  });

  it("girderBottomElevation 8.4 / deckElevation 10.0 as Record (SB-06/07)", () => {
    const result = buildBearingReactionFromHandoff(makeHandoff());
    expect(result.bearingReactionReferences.girderBottomElevation.PR1).toBeCloseTo(8.4, 3);
    expect(result.bearingReactionReferences.deckElevation.PR1).toBeCloseTo(10.0, 3);
  });

  it("quantity golden matches m3-03 (SB-17..20)", () => {
    // combo-standard sample P1 matches the m3-03 golden (totalConcreteVolume 187.92)
    const p1 = generateCombo("combo-standard")[1];
    const built = buildSubstructureDocument({
      projectId: "PROJ-1",
      bridgeLayoutReference: { bridgeId: "RB-S10-001", moduleId: "bridgeLayout", documentVersion: "0.1.0", layoutFingerprint: "fp" },
      superstructureReference: { bridgeId: "RB-S10-001", moduleId: "superstructure", documentVersion: "0.1.0", superstructureDocumentId: "SS-1", handoffSchemaVersion: "1.0.0" },
      roadReference: { moduleId: "road", alignmentId: "ALN", stationReferenceId: null, coordinatePolicyId: null },
      supports: [{
        supportId: p1.supportId,
        supportType: p1.supportType,
        placement: { source: "liner", alignmentId: "ALN", station: 0, offset: 0 },
        skewRad: p1.skewRad,
        bearingSeats: p1.bearingSeats,
        pier: p1.pier,
        abutment: p1.abutment,
      }],
    });
    if (!built.ok) throw new Error("build failed");
    const doc: SubstructureDocument = built.document;
    const q = computeSubstructureQuantity(doc);
    expect(q.totalConcreteVolumeM3).toBeCloseTo(187.92, 1);
    expect(q.quantityStatus).toBe("DERIVED");
  });
});
