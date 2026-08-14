import { describe, expect, it } from "vitest";
import { buildSuperstructureAnalysisFragment, buildMemberLocalFrame, deriveRectangularSection, DEFAULT_STEEL_MATERIAL } from "../superstructureAdapter";
import { deriveAnalysisEntityId } from "../analysisId";
import { TEST_GEOMETRY_SNAPSHOT, TEST_SUPERSTRUCTURE_DOCUMENT } from "./superstructureFixtures";

describe("superstructureAdapter (Phase 7-01 B FROZEN / WP-B)", () => {
  it("builds a valid fragment for a 2-span 2-girder bridge", () => {
    const fragment = buildSuperstructureAnalysisFragment(TEST_SUPERSTRUCTURE_DOCUMENT, TEST_GEOMETRY_SNAPSHOT);
    expect(fragment.issues).toHaveLength(0);
    // 6 support points
    expect(fragment.nodes.filter((n) => n.sourceKind === "supportPoint")).toHaveLength(6);
    // main girder members: 2 girders x 2 spans, subdivided through an
    // intermediate girderPanel node per span (Sol #4) => 2 spans x 2 members
    // per girder x 2 girders = 8 members
    expect(fragment.members.filter((m) => m.memberKind === "mainGirder")).toHaveLength(8);
    // intermediate girderPanel nodes exist so distributed dead load acts on the girders
    expect(fragment.nodes.filter((n) => n.sourceKind === "girderPanel")).toHaveLength(4);
    // cross beam members: 3 stations x 1 (between 2 girders)
    expect(fragment.members.filter((m) => m.memberKind === "crossBeam")).toHaveLength(3);
    // sections: 1 girder + 3 cross beams
    expect(fragment.sections).toHaveLength(4);
    // bearings: 6 seats
    expect(fragment.bearings).toHaveLength(6);
  });

  it("entity IDs are deterministic (D-11)", () => {
    const a = buildSuperstructureAnalysisFragment(TEST_SUPERSTRUCTURE_DOCUMENT, TEST_GEOMETRY_SNAPSHOT);
    const b = buildSuperstructureAnalysisFragment(TEST_SUPERSTRUCTURE_DOCUMENT, TEST_GEOMETRY_SNAPSHOT);
    expect(a.nodes.map((n) => n.entityId)).toEqual(b.nodes.map((n) => n.entityId));
    expect(a.members.map((m) => m.entityId)).toEqual(b.members.map((m) => m.entityId));
    expect(a.nodes[0].entityId).toBe(deriveAnalysisEntityId("node", a.nodes[0].sourceEntityId));
  });

  it("all entities carry sourceEntityId + sourceKind", () => {
    const fragment = buildSuperstructureAnalysisFragment(TEST_SUPERSTRUCTURE_DOCUMENT, TEST_GEOMETRY_SNAPSHOT);
    for (const n of fragment.nodes) {
      expect(n.sourceEntityId.length).toBeGreaterThan(0);
      expect(n.sourceKind.length).toBeGreaterThan(0);
    }
    for (const m of fragment.members) {
      expect(m.sourceEntityId.length).toBeGreaterThan(0);
    }
  });

  it("member orientation vector is orthogonal to the member axis and up", () => {
    const fragment = buildSuperstructureAnalysisFragment(TEST_SUPERSTRUCTURE_DOCUMENT, TEST_GEOMETRY_SNAPSHOT);
    for (const member of fragment.members) {
      const nodeI = fragment.nodes.find((n) => n.entityId === member.nodeIId)!;
      const nodeJ = fragment.nodes.find((n) => n.entityId === member.nodeJId)!;
      const axis = {
        x: nodeJ.x - nodeI.x,
        y: nodeJ.y - nodeI.y,
        z: nodeJ.z - nodeI.z,
      };
      const dot = axis.x * member.orientationVector.x + axis.y * member.orientationVector.y + axis.z * member.orientationVector.z;
      expect(Math.abs(dot)).toBeLessThan(1e-9);
      expect(member.orientationVector.z).toBeGreaterThanOrEqual(0);
    }
  });

  it("main girder section comes from the SuperstructureDocument (R7)", () => {
    const fragment = buildSuperstructureAnalysisFragment(TEST_SUPERSTRUCTURE_DOCUMENT, TEST_GEOMETRY_SNAPSHOT);
    const girderSection = fragment.sections.find((s) => s.sourceEntityId === "SECTION-GIRDER");
    expect(girderSection).toBeDefined();
    expect(girderSection!.derivation).toBe("COMPUTED");
    expect(girderSection!.area).toBeGreaterThan(0);
    expect(girderSection!.iy).toBeGreaterThan(0);
    expect(girderSection!.depthM).toBe(1.2);
  });

  it("cross beam sections use rectangular derivation (FROZEN §7.1)", () => {
    const fragment = buildSuperstructureAnalysisFragment(TEST_SUPERSTRUCTURE_DOCUMENT, TEST_GEOMETRY_SNAPSHOT);
    const cbSection = fragment.sections.find((s) => s.sourceEntityId === "X-SEC-CB-P1");
    expect(cbSection).toBeDefined();
    const expected = deriveRectangularSection(0.3, 1.0);
    expect(cbSection!.area).toBeCloseTo(expected.area, 12);
    expect(cbSection!.iy).toBeCloseTo(expected.iy, 12);
    expect(cbSection!.iz).toBeCloseTo(expected.iz, 12);
  });

  it("reports NOT_AVAILABLE when girder section is missing (fail-closed)", () => {
    const doc = {
      ...TEST_SUPERSTRUCTURE_DOCUMENT,
      girderConfiguration: {
        ...TEST_SUPERSTRUCTURE_DOCUMENT.girderConfiguration,
        girderSectionModel: {
          depthM: null,
          webThicknessM: null,
          topFlange: null,
          bottomFlange: null,
          areaM2: null,
          unitWeightPerM: null,
        },
      },
    };
    const fragment = buildSuperstructureAnalysisFragment(doc, TEST_GEOMETRY_SNAPSHOT);
    expect(fragment.issues.some((i) => i.message.includes("NOT_AVAILABLE"))).toBe(true);
  });

  it("buildMemberLocalFrame produces a right-handed frame with localZ up", () => {
    const { frame } = buildMemberLocalFrame({ x: 0, y: -2, z: 0 }, { x: 10, y: -2, z: 0 });
    expect(frame.x.x).toBeCloseTo(1, 12);
    expect(frame.y.y).toBeCloseTo(1, 12);
    expect(frame.z.z).toBeCloseTo(1, 12);
    // right-handed: z = x cross y
    const crossXY = {
      x: frame.x.y * frame.y.z - frame.x.z * frame.y.y,
      y: frame.x.z * frame.y.x - frame.x.x * frame.y.z,
      z: frame.x.x * frame.y.y - frame.x.y * frame.y.x,
    };
    expect(crossXY.x).toBeCloseTo(frame.z.x, 12);
    expect(crossXY.y).toBeCloseTo(frame.z.y, 12);
    expect(crossXY.z).toBeCloseTo(frame.z.z, 12);
  });

  it("material is the declared default steel (DERIVED)", () => {
    expect(DEFAULT_STEEL_MATERIAL.source).toBe("DERIVED");
    expect(DEFAULT_STEEL_MATERIAL.elasticModulus).toBe(205000000);
  });
});
