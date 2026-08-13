import { describe, expect, it } from "vitest";
import { resolveBearingSupport, resolveBearingDofConstraint } from "../bearingSpring";
import { deriveAnalysisEntityId } from "../analysisId";
import type { AnalysisBearing, AnalysisNode, AnalysisSupport } from "../analysisDocumentTypes";

const NODE_ID = deriveAnalysisEntityId("node", "supportPoint:P1:G1");

function makeNode(sourceEntityId: string, x: number, y: number): AnalysisNode {
  return {
    entityId: deriveAnalysisEntityId("node", sourceEntityId),
    sourceEntityId,
    sourceKind: "supportPoint",
    x,
    y,
    z: 0,
    stationM: null,
    offsetM: null,
  };
}

function makeBearing(seatId: string, supportId: string, girderId: string, fixedOrMovable: "FIXED" | "MOVABLE" | "UNDECIDED", bearingType: "fixed" | "movable" | "rubber" | null): AnalysisBearing {
  return {
    entityId: deriveAnalysisEntityId("bearing", seatId),
    sourceEntityId: seatId,
    sourceKind: "bearingSeat",
    seatId,
    supportId,
    girderId,
    bearingType,
    fixedOrMovable,
    position: { x: 10, y: 0, z: 0 },
    localFrame: {
      tangent: { x: 1, y: 0, z: 0 },
      transverse: { x: 0, y: 1, z: 0 },
      vertical: { x: 0, y: 0, z: 1 },
    },
    dofConstraint: { ux: false, uy: true, uz: true, rx: false, ry: false, rz: false },
    constraintApproximation: null,
    springIds: [],
  };
}

describe("resolveBearingDofConstraint (FROZEN §3.3 unique table)", () => {
  it("maps FIXED to translational-only restraint (rotations released)", () => {
    expect(resolveBearingDofConstraint("FIXED")).toEqual({
      ux: true,
      uy: true,
      uz: true,
      rx: false,
      ry: false,
      rz: false,
    });
  });

  it("maps MOVABLE to longitudinal release (uy+uz)", () => {
    const c = resolveBearingDofConstraint("MOVABLE");
    expect(c.ux).toBe(false);
    expect(c.uy).toBe(true);
    expect(c.uz).toBe(true);
    expect(c.rx || c.ry || c.rz).toBe(false);
  });

  it("maps UNDECIDED to the default (uy+uz)", () => {
    const c = resolveBearingDofConstraint("UNDECIDED");
    expect(c.uy).toBe(true);
    expect(c.uz).toBe(true);
    expect(c.ux).toBe(false);
  });
});

describe("resolveBearingSupport (Sol review #5/#10/#12)", () => {
  it("joins super/sub fragments by seatId and produces supports", () => {
    const nodes = [makeNode("supportPoint:P1:G1", 10, 0)];
    const superBearing = makeBearing("BRG-P1-G1", "P1", "G1", "MOVABLE", "movable");
    const subSupport: AnalysisSupport = {
      entityId: deriveAnalysisEntityId("support", "P1"),
      sourceEntityId: "P1",
      sourceKind: "bridgeLayoutSupport",
      nodeId: NODE_ID,
      seatId: null,
      constraint: { ux: false, uy: true, uz: true, rx: false, ry: false, rz: false },
      constraintApproximation: null,
      springIds: [],
      localFrame: null,
      source: "FROM_SUPPORT",
    };
    const result = resolveBearingSupport({
      nodes,
      superBearings: [superBearing],
      subSupports: [subSupport],
      subBearings: [],
      foundationSprings: [],
    });
    expect(result.issues).toHaveLength(0);
    expect(result.supports).toHaveLength(1);
    expect(result.supports[0].seatId).toBe("BRG-P1-G1");
    expect(result.supports[0].nodeId).toBe(NODE_ID);
    expect(result.supports[0].constraint.ux).toBe(false);
    expect(result.supports[0].constraint.uz).toBe(true);
    expect(result.bearings).toHaveLength(1);
    expect(result.bearings[0].dofConstraint).toEqual(result.supports[0].constraint);
  });

  it("detects BEARING_SOURCE_MISMATCH on position differences", () => {
    const nodes = [makeNode("supportPoint:P1:G1", 10, 0)];
    const superBearing = makeBearing("BRG-P1-G1", "P1", "G1", "MOVABLE", "movable");
    const subBearing = {
      ...makeBearing("BRG-P1-G1", "P1", "G1", "MOVABLE", "movable"),
      position: { x: 10.5, y: 0, z: 0 },
    };
    const result = resolveBearingSupport({
      nodes,
      superBearings: [superBearing],
      subSupports: [],
      subBearings: [subBearing],
      foundationSprings: [],
    });
    expect(result.issues.some((i) => i.message.includes("BEARING_SOURCE_MISMATCH"))).toBe(true);
  });

  it("rubber springs close as SOURCE_NOT_AVAILABLE with the authorized mapping applied", () => {
    const nodes = [makeNode("supportPoint:P1:G1", 10, 0)];
    const superBearing = makeBearing("BRG-P1-G1", "P1", "G1", "UNDECIDED", "rubber");
    const result = resolveBearingSupport({
      nodes,
      superBearings: [superBearing],
      subSupports: [],
      subBearings: [],
      foundationSprings: [],
    });
    expect(result.springs).toHaveLength(1);
    expect(result.springs[0].valueState).toBe("SOURCE_NOT_AVAILABLE");
    expect(result.springs[0].stiffness).toBeNull();
    // Authorized DOF mapping still applies (uz+uy, ux released).
    expect(result.supports[0].constraint.uz).toBe(true);
    expect(result.supports[0].constraint.ux).toBe(false);
  });

  it("adds substructure-only supports as FROM_SUPPORT", () => {
    const nodes: AnalysisNode[] = [];
    const subSupport: AnalysisSupport = {
      entityId: deriveAnalysisEntityId("support", "P2"),
      sourceEntityId: "P2",
      sourceKind: "bridgeLayoutSupport",
      nodeId: NODE_ID,
      seatId: null,
      constraint: { ux: false, uy: true, uz: true, rx: false, ry: false, rz: false },
      constraintApproximation: null,
      springIds: [],
      localFrame: null,
      source: "FROM_SUPPORT",
    };
    const result = resolveBearingSupport({
      nodes,
      superBearings: [],
      subSupports: [subSupport],
      subBearings: [],
      foundationSprings: [],
    });
    expect(result.supports).toHaveLength(1);
    expect(result.supports[0].source).toBe("FROM_SUPPORT");
  });
});
