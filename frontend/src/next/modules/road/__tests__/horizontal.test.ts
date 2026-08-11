import { describe, expect, it } from "vitest";
import {
  createRoadHorizontal,
  evaluateAlignmentAtDistance,
  evaluateElementEndState,
  totalAlignmentLength,
  validateAlignment,
} from "../horizontal";
import type { AlignmentElement, LinearAlignment } from "../../../../liner/core/types";

describe("Phase 2-02 Horizontal Core (reuses LINER geometry)", () => {
  it("evaluates a straight element end point and azimuth", () => {
    const element: AlignmentElement = {
      id: "S1",
      type: "straight",
      start: { x: 10, y: 20 },
      azimuth: Math.PI / 4,
      length: 100,
    };
    const endState = evaluateElementEndState(element);
    expect(endState.point.x).toBeCloseTo(10 + Math.cos(Math.PI / 4) * 100, 9);
    expect(endState.point.y).toBeCloseTo(20 + Math.sin(Math.PI / 4) * 100, 9);
    expect(endState.azimuth).toBeCloseTo(Math.PI / 4, 9);
    expect(endState.endCurvature).toBe(0);
  });

  it("evaluates a left arc with signed curvature", () => {
    const element: AlignmentElement = {
      id: "A1",
      type: "arc",
      start: { x: 0, y: 0 },
      azimuth: 0,
      radius: 100,
      turn: "left",
      length: 50,
    };
    const endState = evaluateElementEndState(element);
    expect(endState.endCurvature).toBeCloseTo(0.01, 12);
    expect(endState.endRadius).toBe(100);
    expect(endState.turnDirection).toBe("left");
  });

  it("evaluates a clothoid end radius", () => {
    const element: AlignmentElement = {
      id: "C1",
      type: "clothoid",
      start: { x: 0, y: 0 },
      azimuth: 0,
      clothoidParameter: 100,
      startRadius: null,
      endRadius: 50,
      turn: "left",
      length: 50,
    };
    const endState = evaluateElementEndState(element);
    expect(endState.endCurvature).toBeCloseTo(0.02, 12);
    expect(endState.endRadius).toBeCloseTo(50, 9);
  });

  it("creates a valid composite alignment and evaluates at distance", () => {
    const alignment: LinearAlignment = {
      id: "ALIGN-1",
      linerModelId: "MODEL-1",
      coordinatePolicyId: "COORD-1",
      elements: [
        { id: "S1", type: "straight", start: { x: 0, y: 0 }, azimuth: 0, length: 100 },
        { id: "A1", type: "arc", start: { x: 100, y: 0 }, azimuth: 0, radius: 50, turn: "left", length: 50 },
      ],
    };
    const horizontal = createRoadHorizontal(alignment);
    expect(horizontal.ok).toBe(true);
    expect(horizontal.totalLength).toBeCloseTo(150, 9);

    const eval0 = horizontal.evaluateAt(0);
    expect(eval0.point.x).toBeCloseTo(0, 9);
    expect(eval0.azimuth).toBeCloseTo(0, 9);

    const eval100 = horizontal.evaluateAt(100);
    expect(eval100.point.x).toBeCloseTo(100, 6);

    const eval101 = horizontal.evaluateAt(101);
    expect(eval101.curvature).toBeCloseTo(0.02, 9);
  });

  it("validates invalid alignment (zero length segment rejected)", () => {
    const alignment: LinearAlignment = {
      id: "ALIGN-BAD",
      linerModelId: "MODEL-1",
      coordinatePolicyId: "COORD-1",
      elements: [
        { id: "S1", type: "straight", start: { x: 0, y: 0 }, azimuth: 0, length: 0 },
      ],
    };
    const issues = validateAlignment(alignment);
    expect(issues.length).toBeGreaterThan(0);
    const horizontal = createRoadHorizontal(alignment);
    expect(horizontal.ok).toBe(false);
  });
});
