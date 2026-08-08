import { describe, expect, it } from "vitest";
import type { LinearAlignment } from "../../liner/core/types";
import { DefaultGeometryEngine } from "./engine";
import type { GeometryEngineInput } from "./contracts";
import { RB001_GRID_PANEL_SPECS } from "./gridPoints";
import { RB001_DECK_SPEC } from "./deck";
import { RB001_CROSS_GIRDER_SPECS } from "./members";

const ALIGNMENT: LinearAlignment = {
  id: "ALN-ACL",
  linerModelId: "RB-S10-001",
  coordinatePolicyId: "global",
  elements: [
    { type: "straight", id: "L1", start: { x: 0, y: 0 }, azimuth: 0, length: 134.001 },
  ],
};

function buildFullInput(): GeometryEngineInput {
  return {
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
    sectionStations: [20.1005, 65.701, 112.601],
    unresolved: [],
  };
}

function buildEngine() {
  return new DefaultGeometryEngine({
    alignment: ALIGNMENT,
    stationDefinition: { originDisplayedStation: 0, interval: 10 },
    offsets: [0],
    z: 0,
    computedAt: "2026-01-01T00:00:00.000Z",
  });
}

describe("Phase 6-2 Reference Bridge 001 full snapshot parity", () => {
  it("produces a complete, deterministic snapshot with all Phase 6-2 entities", () => {
    const a = buildEngine().generateSnapshot(buildFullInput());
    const b = buildEngine().generateSnapshot(buildFullInput());
    expect(a.fingerprint).toBe(b.fingerprint);

    // supports
    expect(a.supportLines.map((l) => l.stationM.value)).toEqual([0, 40.201, 91.201, 134.001]);
    // grid panel structure (2 girders x 27)
    expect(a.gridPoints).toHaveLength(54);
    const holdCount = a.gridPoints.filter((g) => g.state === "HOLD_INSUFFICIENT_SOURCE").length;
    expect(holdCount).toBe(50); // 2 x 25 intermediate
    // deck
    expect(a.deckReferences[0].widthM.value).toBeCloseTo(8.01, 9);
    expect(a.deckReferences[0].boundary).toHaveLength(4);
    // members + cross girders
    expect(a.memberPlacementReferences).toHaveLength(6);
    expect(a.crossGirderReferences).toHaveLength(4);
    // bearings
    expect(a.bearingPoints).toHaveLength(8);
    // section frames (4 supports + 3 mid-spans)
    expect(a.crossSectionFrames).toHaveLength(7);
    // traceability covers mapping IDs
    const mappingIds = new Set(a.traceability.map((t) => t.mappingId));
    for (const id of ["GM-001", "GM-002", "GM-006", "GM-008", "GM-014"]) {
      expect(mappingIds.has(id)).toBe(true);
    }
  });

  it("propagates no fabricated coordinates: HOLD intermediates have no position", () => {
    const snap = buildEngine().generateSnapshot(buildFullInput());
    for (const gp of snap.gridPoints) {
      if (gp.state === "HOLD_INSUFFICIENT_SOURCE") {
        expect(gp.position).toBeUndefined();
        expect(gp.stationM).toBeUndefined();
        expect(gp.offsetM).toBeUndefined();
      } else {
        expect(gp.position).toBeDefined();
      }
    }
  });
});
