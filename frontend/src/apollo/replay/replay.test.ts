import { describe, expect, it } from "vitest";
import type { LinearAlignment } from "../../liner/core/types";
import { DefaultGeometryEngine } from "../geometry/engine";
import { RB001_GRID_PANEL_SPECS } from "../geometry/gridPoints";
import { RB001_DECK_SPEC } from "../geometry/deck";
import { RB001_CROSS_GIRDER_SPECS } from "../geometry/members";
import { classifyGeometryReplay, type ReplayReport } from "./replay";

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

const GOLDEN = {
  expectedSupportStationsM: [0, 40.201, 91.201, 134.001],
  expectedGirderOffsetsM: { "GIRDER-AG1": 1.47689, "GIRDER-AG2": -3.02859 },
  expectedGridPanelCount: 54,
  expectedGridHoldCount: 50,
};

describe("RB-001 geometry replay (Phase 6-4)", () => {
  it("produces a PASS report for the golden-derived inputs", () => {
    const report: ReplayReport = classifyGeometryReplay(buildSnapshot(), GOLDEN);
    expect(report.verdict).toBe("PASS");
    expect(report.entries.every((e) => e.status !== "FAIL")).toBe(true);
    expect(report.fingerprint).toMatch(/^fnv1a32:/);
  });

  it("classifies a numeric discrepancy as FAIL_NUMERIC", () => {
    const report = classifyGeometryReplay(buildSnapshot(), {
      ...GOLDEN,
      expectedSupportStationsM: [0, 40.0, 91.201, 134.001],
    });
    expect(report.verdict).toBe("FAIL");
    expect(report.entries.some((e) => e.discrepancyClass === "FAIL_NUMERIC")).toBe(true);
  });

  it("is deterministic across replays", () => {
    const a = classifyGeometryReplay(buildSnapshot(), GOLDEN);
    const b = classifyGeometryReplay(buildSnapshot(), GOLDEN);
    expect(a.fingerprint).toBe(b.fingerprint);
  });
});
