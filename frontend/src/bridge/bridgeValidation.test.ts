import { describe, expect, it } from "vitest";
import { makeInitialBridgeProject, yPositionsFor, xPositionsFor, computeImpactFactor } from "./BridgeWizardState";

describe("bridge validation helpers", () => {
  it("yPositionsFor produces at least 3 entries and is sorted", () => {
    const ys = yPositionsFor({ lane_count: 1, lane_width: 3.5, median_width: 0, sidewalk_width: 0, barrier_width: 0 });
    expect(ys.length).toBeGreaterThanOrEqual(3);
    const sorted = [...ys].sort((a, b) => a - b);
    expect(ys).toEqual(sorted);
  });

  it("xPositionsFor for mesh_division < 1 returns [0]", () => {
    expect(xPositionsFor([], 0)).toEqual([0]);
    expect(xPositionsFor([], -1)).toEqual([0]);
  });

  it("xPositionsFor for multi-span chains x positions", () => {
    const xs = xPositionsFor(
      [
        { index: 1, length: 10, offset: 0 },
        { index: 2, length: 20, offset: 0 },
      ],
      2,
    );
    expect(xs[0]).toBe(0);
    expect(xs[xs.length - 1]).toBeCloseTo(30);
  });

  it("computeImpactFactor returns 0 when L_max is 0", () => {
    expect(computeImpactFactor([0, 0])).toBe(0);
  });

  it("default project crosses basic validity", () => {
    const p = makeInitialBridgeProject();
    expect(p.crossSection.lane_width).toBeGreaterThan(0);
    expect(p.spans.every((s) => s.length > 0)).toBe(true);
    expect(p.generationSettings.mesh_division).toBeGreaterThanOrEqual(1);
  });
});
