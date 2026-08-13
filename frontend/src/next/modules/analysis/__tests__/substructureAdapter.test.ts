import { describe, expect, it } from "vitest";
import { buildSubstructureAnalysisFragment } from "../substructureAdapter";
import { deriveAnalysisEntityId } from "../analysisId";
import { TEST_SUBSTRUCTURE_DOCUMENT } from "./substructureFixtures";

describe("substructureAdapter (Phase 7-01 B FROZEN / WP-C)", () => {
  it("builds support placement fragments (3 supports)", () => {
    const fragment = buildSubstructureAnalysisFragment(TEST_SUBSTRUCTURE_DOCUMENT);
    expect(fragment.issues).toHaveLength(0);
    expect(fragment.supports).toHaveLength(3);
    const a1 = fragment.supports.find((s) => s.sourceEntityId === "A1");
    expect(a1).toBeDefined();
    expect(a1!.sourceKind).toBe("bridgeLayoutSupport");
    expect(a1!.source).toBe("FROM_SUPPORT");
    expect(a1!.localFrame).not.toBeNull();
  });

  it("entity IDs are deterministic (D-11)", () => {
    const a = buildSubstructureAnalysisFragment(TEST_SUBSTRUCTURE_DOCUMENT);
    const b = buildSubstructureAnalysisFragment(TEST_SUBSTRUCTURE_DOCUMENT);
    expect(a.supports.map((s) => s.entityId)).toEqual(b.supports.map((s) => s.entityId));
    expect(a.supports[0].entityId).toBe(deriveAnalysisEntityId("support", "A1"));
  });

  it("builds bearing seat fragments (6 seats)", () => {
    const fragment = buildSubstructureAnalysisFragment(TEST_SUBSTRUCTURE_DOCUMENT);
    expect(fragment.bearings).toHaveLength(6);
    const seat = fragment.bearings.find((b) => b.seatId === "BRG-P1-G1");
    expect(seat).toBeDefined();
    expect(seat!.fixedOrMovable).toBe("MOVABLE");
    expect(seat!.bearingType).toBe("rubber"); // elastomeric mapped to rubber
    expect(seat!.position).toEqual({ x: 10, y: -2, z: 0 });
  });

  it("foundation springs are closed as SOURCE_NOT_AVAILABLE (never invented)", () => {
    const fragment = buildSubstructureAnalysisFragment(TEST_SUBSTRUCTURE_DOCUMENT);
    expect(fragment.foundationSprings).toHaveLength(3);
    for (const fs of fragment.foundationSprings) {
      expect(fs.valueState).toBe("SOURCE_NOT_AVAILABLE");
      expect(fs.stiffness).toBeNull();
      expect(fs.sourceKind).toBe("foundationSpring");
    }
  });

  it("fails closed when supportReferences are missing (Sol review #6)", () => {
    const doc = { ...TEST_SUBSTRUCTURE_DOCUMENT, supportReferences: null };
    const fragment = buildSubstructureAnalysisFragment(doc);
    expect(fragment.issues.length).toBeGreaterThan(0);
    expect(fragment.supports).toHaveLength(0);
  });

  it("marks skew supports with globalAxisApproximation (Sol review #9)", () => {
    const skewed = {
      ...TEST_SUBSTRUCTURE_DOCUMENT,
      supportReferences: {
        ...TEST_SUBSTRUCTURE_DOCUMENT.supportReferences!,
        supports: [
          {
            supportId: "P1",
            supportType: "pier",
            label: "P1",
            station: 10,
            position: { domainX: 10, domainY: 0, elevation: 0 },
            tangentAzimuthRad: 0,
            skewAngleRad: 0.1,
            terrainElevation: 0,
            roadReferenceId: "SR-1",
            coordinateContextId: null,
          },
        ],
      },
    };
    const fragment = buildSubstructureAnalysisFragment(skewed as unknown as import("../../substructure/substructureTypes").SubstructureDocument);
    const p1 = fragment.supports.find((s) => s.sourceEntityId === "P1");
    expect(p1!.constraintApproximation).toBe("globalAxisApproximation");
  });
});
