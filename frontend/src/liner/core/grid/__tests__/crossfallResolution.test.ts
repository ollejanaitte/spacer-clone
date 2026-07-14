import { describe, expect, it } from "vitest";
import {
  resolveCrossfallState,
  validateCrossSlopeIntervals,
} from "../crossfallResolution";

describe("crossfall resolution", () => {
  it("flags overlap but allows touching interval boundaries", () => {
    expect(
      validateCrossSlopeIntervals([
        {
          id: "CF-1",
          startPhysicalDistance: 0,
          endPhysicalDistance: 10,
          mode: "one_way_right",
          leftSlopePercent: 2,
          rightSlopePercent: 2,
        },
        {
          id: "CF-2",
          startPhysicalDistance: 10,
          endPhysicalDistance: 20,
          mode: "one_way_right",
          leftSlopePercent: 2,
          rightSlopePercent: 2,
        },
      ]),
    ).toEqual([]);

    const overlapIssues = validateCrossSlopeIntervals([
      {
        id: "CF-1",
        startPhysicalDistance: 0,
        endPhysicalDistance: 10,
        mode: "one_way_right",
        leftSlopePercent: 2,
        rightSlopePercent: 2,
      },
      {
        id: "CF-2",
        startPhysicalDistance: 9,
        endPhysicalDistance: 20,
        mode: "one_way_right",
        leftSlopePercent: 2,
        rightSlopePercent: 2,
      },
    ]);
    expect(overlapIssues).toHaveLength(1);
    expect(overlapIssues[0]?.code).toBe("LINER_CROSSFALL_INTERVAL_OVERLAP");
  });

  it("fills gaps by physical distance and passes through zero between right and left one-way states", () => {
    const state = resolveCrossfallState(
      {
        crossSlopeIntervals: [
          {
            id: "CF-right",
            startPhysicalDistance: 0,
            endPhysicalDistance: 10,
            mode: "one_way_right",
            leftSlopePercent: 2,
            rightSlopePercent: 2,
          },
          {
            id: "CF-left",
            startPhysicalDistance: 20,
            endPhysicalDistance: 30,
            mode: "one_way_left",
            leftSlopePercent: -2,
            rightSlopePercent: -2,
          },
        ],
      },
      15,
      15,
    );

    expect(state.source).toBe("transition");
    expect(state.mode).toBe("independent");
    expect(state.leftSlopePercent).toBeCloseTo(0, 9);
    expect(state.rightSlopePercent).toBeCloseTo(0, 9);
  });

  it("does not auto-transition across pivot mismatches", () => {
    const issues = validateCrossSlopeIntervals([
      {
        id: "CF-left",
        startPhysicalDistance: 0,
        endPhysicalDistance: 10,
        mode: "crown",
        leftSlopePercent: -2,
        rightSlopePercent: 2,
        pivotDistance: 0,
      },
      {
        id: "CF-right",
        startPhysicalDistance: 20,
        endPhysicalDistance: 30,
        mode: "crown",
        leftSlopePercent: -2,
        rightSlopePercent: 2,
        pivotDistance: 1,
      },
    ]);
    expect(issues.some((issue) => issue.code === "LINER_CROSSFALL_PIVOT_CHANGE_UNSUPPORTED")).toBe(true);

    const state = resolveCrossfallState(
      {
        crossSlopeIntervals: [
          {
            id: "CF-left",
            startPhysicalDistance: 0,
            endPhysicalDistance: 10,
            mode: "crown",
            leftSlopePercent: -2,
            rightSlopePercent: 2,
            pivotDistance: 0,
          },
          {
            id: "CF-right",
            startPhysicalDistance: 20,
            endPhysicalDistance: 30,
            mode: "crown",
            leftSlopePercent: -2,
            rightSlopePercent: 2,
            pivotDistance: 1,
          },
        ],
      },
      15,
      15,
    );

    expect(state.source).toBe("flat");
    expect(state.leftSlopePercent).toBe(0);
    expect(state.rightSlopePercent).toBe(0);
  });
});
