import { describe, expect, it } from "vitest";
import {
  createRoadStationing,
  createDefaultStationDefinition,
  evaluatePointAtStation,
  formatStationDisplay,
  formatStationNoPlus,
  parseStationInput,
} from "../stationing";
import type { LinearAlignment } from "../../../../liner/core/types";

function makeAlignment(): LinearAlignment {
  return {
    id: "ALIGN-1",
    linerModelId: "MODEL-1",
    coordinatePolicyId: "COORD-1",
    elements: [
      { id: "S1", type: "straight", start: { x: 0, y: 0 }, azimuth: 0, length: 100 },
      { id: "A1", type: "arc", start: { x: 100, y: 0 }, azimuth: 0, radius: 50, turn: "left", length: 50 },
    ],
  };
}

describe("Phase 2-03 Stationing (reuses LINER station logic)", () => {
  it("generates interval stations over the alignment length", () => {
    const definition = { originDisplayedStation: 0, interval: 25 };
    const result = createRoadStationing(definition, 150);
    expect(result.ok).toBe(true);
    const distances = result.stations.map((s) => s.physicalDistance);
    expect(distances[0]).toBe(0);
    expect(distances).toContain(100);
    expect(result.stations.every((s) => s.physicalDistance <= 150)).toBe(true);
  });

  it("formats stations as No.XX+YY", () => {
    expect(formatStationNoPlus(1234.5)).toMatch(/^No\.\d+\+\d/);
    expect(formatStationDisplay(1234.5)).toContain("+");
    // parseStationInput returns {ok, value}; the LINER convention for
    // "N+xxx" is No.N + xxx meters where N is the No index (100m units).
    const parsed = parseStationInput("1+234.5");
    if (!parsed.ok) throw new Error("parse failed");
    expect(parsed.value).toBe(334.5);
  });

  it("evaluates a point at a physical distance on the alignment", () => {
    const alignment = makeAlignment();
    const definition = createDefaultStationDefinition();
    const point = evaluatePointAtStation(alignment, definition, 50);
    expect(point.physicalDistance).toBeCloseTo(50, 9);
    expect(point.point.x).toBeCloseTo(50, 9);
    expect(point.azimuth).toBeCloseTo(0, 9);
    expect(point.displayedStation).toBeCloseTo(50, 9);
  });

  it("evaluates a point inside the arc (curvature non-zero)", () => {
    const alignment = makeAlignment();
    const definition = createDefaultStationDefinition();
    const point = evaluatePointAtStation(alignment, definition, 101);
    expect(point.curvature).toBeCloseTo(0.02, 9);
  });

  it("applies station equations to displayed station", () => {
    const alignment = makeAlignment();
    const definition = {
      originDisplayedStation: 0,
      equations: [{ id: "EQ1", physicalDistance: 100, type: "add_constant" as const, value: 10, sortIndex: 0 }],
    };
    const before = evaluatePointAtStation(alignment, definition, 50);
    const after = evaluatePointAtStation(alignment, definition, 120);
    expect(before.displayedStation).toBeCloseTo(50, 9);
    // after the boundary at 100, +10 applied
    expect(after.displayedStation).toBeCloseTo(130, 9);
  });
});
