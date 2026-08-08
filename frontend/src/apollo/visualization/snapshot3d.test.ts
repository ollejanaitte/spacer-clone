import { describe, expect, it } from "vitest";
import type { LinearAlignment } from "../../liner/core/types";
import { DefaultGeometryEngine } from "../geometry/engine";
import { RB001_GRID_PANEL_SPECS } from "../geometry/gridPoints";
import { RB001_DECK_SPEC } from "../geometry/deck";
import { RB001_CROSS_GIRDER_SPECS } from "../geometry/members";
import { buildSnapshotSolidParameters, SNAPSHOT_3D_DEFAULTS } from "./snapshot3d";

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

describe("Snapshot -> 3D payload (Phase 6-3, CN-07)", () => {
  it("builds girder, deck, cross-beam and bearing solids from the snapshot", () => {
    const solids = buildSnapshotSolidParameters(buildSnapshot());
    const kinds = solids.map((s) => s.kind);
    expect(kinds.filter((k) => k === "girder")).toHaveLength(2); // AG1/AG2
    expect(kinds.filter((k) => k === "deck")).toHaveLength(1);
    expect(kinds.filter((k) => k === "cross_beam")).toHaveLength(4); // GE1/C1/C2/GE2
    expect(kinds.filter((k) => k === "bearing")).toHaveLength(8); // 4 supports x 2 girders
  });

  it("positions girders from the snapshot girder-line endpoints (LINER authority)", () => {
    const girder = buildSnapshotSolidParameters(buildSnapshot()).find(
      (s) => s.kind === "girder" && s.sourceEntityId === "GIRDER-AG1",
    )!;
    // origin at girder midpoint: x = 67.0005, y = 1.47689..1.55372 -> ~1.515
    expect(girder.localFrame.origin[0]).toBeCloseTo(67.0005, 4);
    expect(girder.dimensionsM.depth).toBeCloseTo(SNAPSHOT_3D_DEFAULTS.girder.depthM, 9);
    expect(girder.dimensionsM.flangeWidth).toBeCloseTo(SNAPSHOT_3D_DEFAULTS.girder.flangeWidthM, 9);
  });

  it("builds the deck solid from the deck reference (width 8.01, thickness 0.23)", () => {
    const deck = buildSnapshotSolidParameters(buildSnapshot()).find((s) => s.kind === "deck")!;
    expect(deck.dimensionsM.width).toBeCloseTo(8.01, 9);
    expect(deck.dimensionsM.thickness).toBeCloseTo(0.23, 9);
    expect(deck.dimensionsM.length).toBeCloseTo(134.001, 6);
    expect(deck.localFrame.origin[0]).toBeCloseTo(67.0005, 4);
  });

  it("is deterministic for the same snapshot", () => {
    const a = buildSnapshotSolidParameters(buildSnapshot());
    const b = buildSnapshotSolidParameters(buildSnapshot());
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
