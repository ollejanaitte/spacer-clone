import { describe, expect, it } from "vitest";
import type { LinearAlignment } from "../../liner/core/types";
import { DefaultGeometryEngine } from "../geometry/engine";
import { RB001_GRID_PANEL_SPECS } from "../geometry/gridPoints";
import { RB001_DECK_SPEC } from "../geometry/deck";
import { RB001_CROSS_GIRDER_SPECS } from "../geometry/members";
import { buildGrillageModel } from "./grillageModel";
import { emptyNotAuthorizedResult, RB001_DESIGN_CONDITIONS } from "./index";

const ALIGNMENT: LinearAlignment = {
  id: "ALN-ACL",
  linerModelId: "RB-S10-001",
  coordinatePolicyId: "global",
  elements: [
    { type: "straight", id: "L1", start: { x: 0, y: 0 }, azimuth: 0, length: 134.001 },
  ],
};

function buildSnapshot() {
  const engine = new DefaultGeometryEngine({
    alignment: ALIGNMENT,
    stationDefinition: { originDisplayedStation: 0, interval: 10 },
    offsets: [0],
    z: 0,
    computedAt: "2026-01-01T00:00:00.000Z",
  });
  return engine.generateSnapshot({
    sourceModelVersion: "1.0.0",
    bridgeId: "RB-S10-001",
    alignmentIds: ["ALN-ACL"],
    supports: [
      { id: "SUP-AR2", state: "CONFIRMED" },
      { id: "SUP-PR1", state: "CONFIRMED" },
      { id: "SUP-PR2", state: "CONFIRMED" },
      { id: "SUP-PU15", state: "CONFIRMED" },
    ],
    girders: [
      { id: "GIRDER-AG1", state: "CONFIRMED" },
      { id: "GIRDER-AG2", state: "CONFIRMED" },
    ],
    gridPointIds: ["GRID-1001", "GRID-1027", "GRID-2001", "GRID-2027"],
    deckIds: ["DECK-01"],
    sectionIds: ["SECTION-DECK"],
    spanLengthsM: [40.201, 51.0, 40.2],
    bridgeLengthM: 134.001,
    girderOffsetsM: {
      "GIRDER-AG1": 1.47689,
      "GIRDER-AG1:end": 1.55372,
      "GIRDER-AG2": -3.02859,
      "GIRDER-AG2:end": -2.94155,
    },
    gridPanelSpecs: RB001_GRID_PANEL_SPECS,
    deckSpecs: [RB001_DECK_SPEC],
    crossGirderSpecs: RB001_CROSS_GIRDER_SPECS,
    unresolved: [],
  });
}

describe("design framework (Phase 7)", () => {
  it("builds a grillage model from the snapshot (8 nodes, 10 members, 8 supports)", () => {
    const grillage = buildGrillageModel(buildSnapshot(), RB001_DESIGN_CONDITIONS);
    expect(grillage.bridgeId).toBe("RB-S10-001");
    expect(grillage.nodes).toHaveLength(8); // 4 supports x 2 girders
    expect(grillage.members).toHaveLength(10); // 6 longitudinal + 4 transverse
    expect(grillage.members.filter((m) => m.kind === "mainGirder")).toHaveLength(6);
    expect(grillage.members.filter((m) => m.kind === "crossGirder")).toHaveLength(4);
    expect(grillage.supports).toHaveLength(8);
    expect(grillage.authorization).toBe("NOT_GRANTED");
    expect(grillage.materials[0].id).toBe("MAT-STEEL");
  });

  it("places nodes at snapshot support-point positions (LINER authority)", () => {
    const grillage = buildGrillageModel(buildSnapshot(), RB001_DESIGN_CONDITIONS);
    const ar2ag1 = grillage.nodes.find((n) => n.id === "N-SUP-AR2-GIRDER-AG1")!;
    expect(ar2ag1.x).toBeCloseTo(0, 9);
    expect(ar2ag1.y).toBeCloseTo(1.47689, 9);
    const pu15ag1 = grillage.nodes.find((n) => n.id === "N-SUP-PU15-GIRDER-AG1")!;
    expect(pu15ag1.x).toBeCloseTo(134.001, 9);
  });

  it("marks design results NOT_AUTHORIZED until numeric gates clear", () => {
    const result = emptyNotAuthorizedResult("RB-S10-001", ["GIRDER-AG1-CHECK-1"]);
    expect(result.authorization).toBe("NOT_GRANTED");
    expect(result.reactions.state).toBe("NOT_AUTHORIZED");
    expect(result.memberForces.state).toBe("NOT_AUTHORIZED");
    expect(result.checks[0].state).toBe("NOT_AUTHORIZED");
  });
});
