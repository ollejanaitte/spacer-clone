import { describe, expect, it } from "vitest";
import type { SuperstructureHandoff } from "../../superstructure/superstructureHandoff";
import {
  buildBearingReactionFromHandoff,
  mapCombinationToCaseKind,
  normalizeSeatId,
} from "../substructurePhase5Adapter";

function makeHandoff(): SuperstructureHandoff {
  return {
    handoffKind: "superstructure-handoff",
    schemaVersion: "1.0.0",
    handoffId: "SH-RB",
    bridgeId: "BR-900",
    documentReference: "SS-1",
    generatedAt: "2026-08-12T00:00:00.000Z",
    coordinateContext: {
      coordinatePolicyId: null,
      axisConvention: "x-along/y-transverse/z-up",
      unitSystem: "metric",
      signConvention: { reactionZ: "up-positive", skew: "counterclockwise-positive" },
      positionConvention: "project-global-XYZ",
    },
    superstructureType: "plate_girder_rc_slab_non_composite",
    structuralSystem: { spanSystem: "continuous", bridgeSystem: "CONTINUOUS" },
    supports: [
      {
        supportId: "P1",
        supportType: "pier",
        station: 300,
        position: { x: 300, y: 0, z: 101 },
        tangentAzimuthRad: 0,
        skewAngleRad: 0.1,
        localFrame: {
          tangent: { x: 1, y: 0, z: 0 },
          transverse: { x: 0, y: 1, z: 0 },
          vertical: { x: 0, y: 0, z: 1 },
        },
        bearingSeats: [
          {
            seatId: "BRG-P1-G1",
            girderId: "G1",
            position: { x: 300, y: -4, z: 108 },
            elevation: 108,
            localOffset: { longitudinalM: 0, transverseM: -4 },
            orientation: {
              longitudinalAxis: { x: 1, y: 0, z: 0 },
              transverseAxis: { x: 0, y: 1, z: 0 },
              verticalAxis: { x: 0, y: 0, z: 1 },
            },
            bearingType: "rubber",
            fixedOrMovable: "MOVABLE",
            longitudinalDirection: "+station",
            transverseDirection: "L",
          },
        ],
        reactionCases: [
          {
            caseId: "RC-DL-STRUCTURAL-BRG-P1-G1",
            combinationId: "DL-STRUCTURAL",
            seatId: "BRG-P1-G1",
            supportId: "P1",
            girderId: "G1",
            Fx: 0,
            Fy: 0,
            Fz: 150,
            Mx: 0,
            My: 0,
            Mz: 0,
            unit: "kN",
            momentUnit: "kNm",
            signConvention: { force: "up-positive", moment: "right-hand-rule" },
          },
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

describe("Phase 5 Bearing/Reaction Handoff Adapter (WP-C)", () => {
  it("maps bearingSeats with canonical BRG seatId + axis (T6-BRG-001/002)", () => {
    const result = buildBearingReactionFromHandoff(makeHandoff());
    expect(result.bearingSeatReferences).toHaveLength(1);
    const seat = result.bearingSeatReferences[0];
    expect(seat.seatId).toBe("BRG-P1-G1");
    expect(seat.localOffset.transverseM).toBe(-4); // y = transverse
    expect(seat.localOffset.longitudinalM).toBe(0); // x = longitudinal
    // bearingType rubber -> elastomeric (model.ts enum)
    expect(seat.bearingType).toBe("elastomeric");
  });

  it("reaction up-positive + caseKind enum + combinationId separate (T6-RXN-001/002)", () => {
    const result = buildBearingReactionFromHandoff(makeHandoff());
    const reaction = result.reactionCases[0];
    expect(reaction.Fz).toBe(150); // up-positive canonical
    expect(reaction.caseKind).toBe("permanent"); // DL- -> permanent
    expect(reaction.combinationId).toBe("DL-STRUCTURAL");
    expect(reaction.authorizationStatus).toBe("NOT_AUTHORIZED"); // status preserved
  });

  it("maps unknown combination to UNKNOWN/NOT_AVAILABLE (T6-RXN-003)", () => {
    const h = makeHandoff();
    const bad = { ...h, supports: [{ ...h.supports[0], reactionCases: [{ ...h.supports[0].reactionCases[0], combinationId: "WEIRD-X" }] }] };
    const result = buildBearingReactionFromHandoff(bad);
    expect(result.reactionCases[0].caseKind).toBe("UNKNOWN");
  });

  it("normalizes legacy seat IDs with girderId generation (T6-BRG-011/012)", () => {
    const n1 = normalizeSeatId("P1-BRG-01", "P1", null, 1);
    expect(n1.canonical).toBe("BRG-P1-G1");
    expect(n1.legacySeatId).toBe("P1-BRG-01");
    const n2 = normalizeSeatId("P1-SEAT-G2", "P1", "G2", 2);
    expect(n2.canonical).toBe("BRG-P1-G2");
  });

  it("preserves elevations as Record with NOT_AVAILABLE for null (T6-ELE-001/002)", () => {
    const result = buildBearingReactionFromHandoff(makeHandoff());
    expect(result.bearingReactionReferences.girderBottomElevation).toEqual({ P1: 8.4 });
    expect(result.bearingReactionReferences.deckElevation).toEqual({ P1: null });
  });

  it("carries real localFrame from handoff (no identity fabrication) (T6-LOC-001)", () => {
    const result = buildBearingReactionFromHandoff(makeHandoff());
    expect(result.bearingSeatReferences[0].orientation.transverseAxis).toEqual({ x: 0, y: 1, z: 0 });
  });

  it("mapCombinationToCaseKind covers all FROZEN mappings", () => {
    expect(mapCombinationToCaseKind("DL-STRUCTURAL")).toBe("permanent");
    expect(mapCombinationToCaseKind("COMBO-1")).toBe("permanent");
    expect(mapCombinationToCaseKind("LL-MAX")).toBe("liveLoad");
    expect(mapCombinationToCaseKind("BRK-1")).toBe("braking");
    expect(mapCombinationToCaseKind("WIND")).toBe("wind");
    expect(mapCombinationToCaseKind("SEISMIC-L1")).toBe("seismicLevel1");
    expect(mapCombinationToCaseKind("SEISMIC-L2")).toBe("seismicLevel2");
  });
});
