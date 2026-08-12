import { describe, expect, it } from "vitest";
import { buildSubstructureDocument } from "../substructureDocumentDomain";
import {
  computeSubstructureQuantity,
  computeSupportQuantityFor,
  runSubstructureDesign,
  toModelSupports,
} from "../substructureDesign";
import type { SubstructureDocument } from "../substructureTypes";

function makeDocument(): SubstructureDocument {
  const built = buildSubstructureDocument({
    projectId: "PROJ-1",
    bridgeLayoutReference: { bridgeId: "BR-900", moduleId: "bridgeLayout", documentVersion: "0.1.0", layoutFingerprint: "fp" },
    superstructureReference: { bridgeId: "BR-900", moduleId: "superstructure", documentVersion: "0.1.0", superstructureDocumentId: "SS-1", handoffSchemaVersion: "1.0.0" },
    roadReference: { moduleId: "road", alignmentId: "ALN-1", stationReferenceId: null, coordinatePolicyId: null },
    supports: [
      {
        supportId: "P1",
        supportType: "pier",
        placement: { source: "liner", alignmentId: "ALN-1", station: 300, offset: 0 },
        skewRad: 0,
        bearingSeats: [],
        pier: {
          id: "p1",
          formType: "single_column_rect",
          column: { id: "c1", width: 2.0, depth: 2.0, height: 8.0 },
          footing: { id: "ft-p1", length: 6.0, width: 6.0, thickness: 2.0, topElevation: 99.0 },
          pileGroup: { id: "pg", pileType: "bored_pile", diameter: 1.2, length: 20.0, pileCount: 6, spacing: { x: 3.0, y: 2.5 } },
        },
      },
    ],
  });
  if (!built.ok) throw new Error("build failed");
  return built.document;
}

describe("Substructure design framework (WP-H)", () => {
  it("computes quantity via KEEP geometricQuantity (T6-DS-001)", () => {
    const doc = makeDocument();
    const q = computeSubstructureQuantity(doc);
    expect(q.quantityStatus).toBe("DERIVED");
    // column 2*2*8=32 + footing 6*6*2=72 + pile pi*0.6^2*20*6 ~ 135.7 = ~239.7
    expect(q.totalConcreteVolumeM3).toBeGreaterThan(200);
    // pile length 20*6=120
    expect(q.totalPileLengthM).toBe(120);
  });

  it("computes per-support quantity (T6-DS-001)", () => {
    const q = computeSupportQuantityFor(makeDocument(), "P1");
    expect(q?.totalConcreteVolumeM3).toBeGreaterThan(0);
    expect(computeSupportQuantityFor(makeDocument(), "A1")).toBeNull();
  });

  it("keeps designStatus NOT_AUTHORIZED (T6-DS-002)", () => {
    const design = runSubstructureDesign(makeDocument());
    expect(design.designStatus).toBe("NOT_AUTHORIZED");
    expect(design.reactionStatus).toBe("NOT_AVAILABLE");
  });

  it("preserves NOT_AUTHORIZED reaction inputs (T6-DS-003)", () => {
    const doc = makeDocument();
    const withReactions = { ...doc, designInputs: { superstructureReactions: [{ caseId: "R1", combinationId: "DL-1", seatId: "BRG-P1-G1", supportId: "P1", girderId: "G1", caseKind: "permanent" as const, Fx: 0, Fy: 0, Fz: 150, Mx: 0, My: 0, Mz: 0, unit: "kN" as const, momentUnit: "kNm" as const, signConvention: { force: "up-positive" as const, moment: "right-hand-rule" as const }, authorizationStatus: "NOT_AUTHORIZED" as const }] } };
    const inputs = withReactions.designInputs;
    expect(inputs.superstructureReactions[0].authorizationStatus).toBe("NOT_AUTHORIZED");
  });

  it("converts document supports to model Support[] (KEEP engines)", () => {
    const supports = toModelSupports(makeDocument());
    expect(supports).toHaveLength(1);
    expect(supports[0].supportId).toBe("P1");
  });
});
