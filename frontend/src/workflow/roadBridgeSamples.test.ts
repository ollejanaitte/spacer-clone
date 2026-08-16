import { describe, expect, it } from "vitest";
import {
  buildRb001RoadWorkflowState,
  computePierStations,
  computeSpanArrangement,
  totalSpanLength,
} from "./roadBridgeSamples";

describe("roadBridgeSamples (Lane U U-4)", () => {
  it("builds the RB001 road workflow state with the bridge candidate", () => {
    const state = buildRb001RoadWorkflowState("2026-08-16T00:00:00.000Z");
    expect(state.roadId).toBe("RB001-ROAD-1");
    expect(state.alignmentId).toBe("RB001-ROAD-1");
    expect(state.totalLengthM).toBeCloseTo(2450, 1);
    expect(state.bridgeCandidate.startStation).toBe(1200);
    expect(state.bridgeCandidate.endStation).toBe(1500);
    expect(state.bridgeCandidate.nominalSpanM).toBe(50);
  });

  it("computes equal-interval pier stations strictly inside the range", () => {
    expect(computePierStations(1200, 1500, 5)).toEqual([1250, 1300, 1350, 1400, 1450]);
    expect(computePierStations(1200, 1500, 0)).toEqual([]);
    expect(computePierStations(1500, 1200, 5)).toEqual([]);
  });

  it("arranges piers + spans with the candidate nominal span", () => {
    const { piers, spans } = computeSpanArrangement(1200, 1500, 5);
    expect(piers).toHaveLength(5);
    expect(spans).toHaveLength(6);
    expect(spans[0].startSupportId).toBe("A1");
    expect(spans[0].endSupportId).toBe("P1");
    expect(spans[5].startSupportId).toBe("P5");
    expect(spans[5].endSupportId).toBe("A2");
    for (const span of spans) {
      expect(span.length).toBeCloseTo(50, 6);
    }
    expect(totalSpanLength(spans)).toBeCloseTo(300, 6);
  });
});