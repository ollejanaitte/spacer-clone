import { describe, expect, it } from "vitest";
import type { AlignmentElement } from "../types";
import { evaluateElementEndState } from "./horizontal";

describe("evaluateElementEndState", () => {
  it("returns end point and no radius for a straight element", () => {
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
    expect(endState.endRadius).toBeNull();
    expect(endState.turnDirection).toBeNull();
  });

  it("returns signed curvature, radius, and turn for a left arc", () => {
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

  it("returns end radius and turn for a clothoid", () => {
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
    expect(endState.turnDirection).toBe("left");
  });
});
