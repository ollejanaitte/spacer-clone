import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { LinearAlignment } from "../../liner/core/types";
import { DefaultGeometryEngine } from "../geometry/engine";
import { RB001_GRID_PANEL_SPECS } from "../geometry/gridPoints";
import { RB001_DECK_SPEC } from "../geometry/deck";
import { RB001_CROSS_GIRDER_SPECS } from "../geometry/members";
import { buildSnapshotVisualizationModel } from "./snapshotVisualizationModel";
import { exportApolloBinaryStl } from "../export/apolloStlExport";

const FIXTURE = resolve(
  process.cwd(),
  "../docs/apollo/step10/reference_bridge_001/phase5/fixtures/reference_bridge_001_common_model.json",
);

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

describe("Phase 6-3 Reference Bridge 001 3D parity (fixture -> geometry -> 3D -> export)", () => {
  it("reproduces the fixture entity id set through the 3D payload", () => {
    const fixture = JSON.parse(readFileSync(FIXTURE, "utf-8")) as {
      bridgeGeometry: {
        girders: { id: string }[];
        deck: { id: string }[];
      };
    };
    const model = buildSnapshotVisualizationModel(buildSnapshot());
    const girderSolids = model.solidGeometryParameters.filter((s) => s.kind === "girder");
    const deckSolids = model.solidGeometryParameters.filter((s) => s.kind === "deck");
    expect(girderSolids.map((s) => s.sourceEntityId)).toEqual(
      fixture.bridgeGeometry.girders.map((g) => g.id),
    );
    expect(deckSolids.map((s) => s.sourceEntityId)).toEqual(
      fixture.bridgeGeometry.deck.map((d) => d.id),
    );
  });

  it("deterministically replays fixture -> geometry -> 3D -> STL", () => {
    const stl1 = exportApolloBinaryStl(buildSnapshotVisualizationModel(buildSnapshot()), {
      includeBearings: true,
    });
    const stl2 = exportApolloBinaryStl(buildSnapshotVisualizationModel(buildSnapshot()), {
      includeBearings: true,
    });
    expect(stl1.digest).toBe(stl2.digest);
    expect(stl1.triangleCount).toBeGreaterThan(0);
  });
});
