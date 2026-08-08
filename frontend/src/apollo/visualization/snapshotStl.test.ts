import { describe, expect, it } from "vitest";
import type { LinearAlignment } from "../../liner/core/types";
import { DefaultGeometryEngine } from "../geometry/engine";
import { RB001_GRID_PANEL_SPECS } from "../geometry/gridPoints";
import { RB001_DECK_SPEC } from "../geometry/deck";
import { RB001_CROSS_GIRDER_SPECS } from "../geometry/members";
import { buildSnapshotVisualizationModel } from "./snapshotVisualizationModel";
import { exportApolloBinaryStl } from "../export/apolloStlExport";

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

describe("Snapshot -> 3D model + STL export (Phase 6-3)", () => {
  it("builds an ApolloVisualizationModel from the snapshot", () => {
    const model = buildSnapshotVisualizationModel(buildSnapshot(), { bridgeName: "RB-S10-001" });
    expect(model.sourceProjectId).toBe("RB-S10-001");
    expect(model.solidGeometryParameters.length).toBeGreaterThan(0);
    expect(model.units.exportLength).toBe("mm");
    expect(model.coordinateSystem.axisConvention).toBe("x-longitudinal-y-transverse-z-up");
  });

  it("exports snapshot solids to a valid binary STL with manifest", () => {
    const model = buildSnapshotVisualizationModel(buildSnapshot());
    const result = exportApolloBinaryStl(model, { includeBearings: true });
    expect(result.triangleCount).toBeGreaterThan(0);
    expect(result.digest).toMatch(/^fnv1a32:/);
    // bridge length 134.001 m -> ~134001 mm (within tolerance for box extents)
    expect(result.boundingBoxMm.max[0]).toBeGreaterThan(100000);
    // digest is deterministic
    const again = exportApolloBinaryStl(model, { includeBearings: true });
    expect(again.digest).toBe(result.digest);
  });
});
