import { describe, expect, it } from "vitest";
import type { LinearAlignment } from "../../liner/core/types";
import { LinerAlignmentConnector } from "./alignmentConnector";
import {
  generateGridPanelPoints,
  parseGridId,
  RB001_GRID_PANEL_SPECS,
} from "./gridPoints";
import { rb001PlaneGridTransform } from "./planeGridTransform";

const ALIGNMENT: LinearAlignment = {
  id: "ALN-ACL",
  linerModelId: "RB-S10-001",
  coordinatePolicyId: "global",
  elements: [
    { type: "straight", id: "L1", start: { x: 0, y: 0 }, azimuth: 0, length: 134.001 },
  ],
};

function buildConnector(): LinerAlignmentConnector {
  return new LinerAlignmentConnector({
    alignment: ALIGNMENT,
    stationDefinition: { originDisplayedStation: 0, interval: 10 },
    offsets: [0],
    z: 0,
    computedAt: "2026-01-01T00:00:00.000Z",
  });
}

describe("grid / panel points (Phase 6-2)", () => {
  it("parses a grid id numeric suffix", () => {
    expect(parseGridId("GRID-1001")).toEqual({ prefix: "GRID-", number: 1001 });
    expect(parseGridId("GRID-2027")).toEqual({ prefix: "GRID-", number: 2027 });
    expect(() => parseGridId("GRID-X")).toThrow();
  });

  it("generates endpoints CONFIRMED and intermediates HOLD for RB-001 AG1", () => {
    const points = generateGridPanelPoints(
      RB001_GRID_PANEL_SPECS[0],
      buildConnector(),
      "ALN-ACL",
      rb001PlaneGridTransform(),
    );
    expect(points).toHaveLength(27);
    expect(points[0].gridPointId).toBe("GRID-1001");
    expect(points[26].gridPointId).toBe("GRID-1027");
    expect(points[0].role).toBe("endpoint");
    expect(points[0].state).toBe("CONFIRMED");
    expect(points[0].position).toBeDefined();
    // endpoint station from plane-grid transform: 1.21766 + 1.24055
    expect(points[0].stationM).toBeCloseTo(2.45821, 5);
    expect(points[26].stationM).toBeCloseTo(134.001, 5);
    // intermediates
    expect(points[1].gridPointId).toBe("GRID-1002");
    expect(points[1].role).toBe("intermediate");
    expect(points[1].state).toBe("HOLD_INSUFFICIENT_SOURCE");
    expect(points[1].position).toBeUndefined();
    expect(points[1].stationM).toBeUndefined();
    expect(points[1].stateReason).toContain("no interpolation");
    expect(points[25].gridPointId).toBe("GRID-1026");
    expect(points[25].role).toBe("intermediate");
  });

  it("endpoint positions are LINER-sampled (no fabricated coordinates)", () => {
    const connector = buildConnector();
    const points = generateGridPanelPoints(
      RB001_GRID_PANEL_SPECS[1],
      connector,
      "ALN-ACL",
      rb001PlaneGridTransform(),
    );
    const start = points[0];
    const expected = connector.samplePoint({
      alignmentId: "ALN-ACL",
      stationM: start.stationM!,
      offsetM: start.offsetM!,
    });
    expect(start.position!.x).toBeCloseTo(expected.position.x, 9);
    expect(start.position!.y).toBeCloseTo(-3.02859, 9);
    expect(points[26].position!.y).toBeCloseTo(-2.94155, 9);
  });

  it("rejects invalid panel counts", () => {
    expect(() =>
      generateGridPanelPoints(
        { ...RB001_GRID_PANEL_SPECS[0], panelCount: 1 },
        buildConnector(),
        "ALN-ACL",
        rb001PlaneGridTransform(),
      ),
    ).toThrow(/panelCount/);
  });
});
