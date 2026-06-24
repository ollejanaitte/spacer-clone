import { describe, expect, it } from "vitest";
import {
  clothoidCurvatureAt,
  evaluateClothoidElement,
  isPhase0ClothoidApproximation,
} from "../geometry/clothoid";

describe("liner clothoid approximation", () => {
  it("evaluates a deterministic Phase 0 clothoid smoke case", () => {
    const element = {
      type: "clothoid" as const,
      id: "C1",
      start: { x: 0, y: 0 },
      azimuth: 0,
      clothoidParameter: 100,
      length: 50,
      startRadius: null,
      endRadius: 500,
      turn: "left" as const,
    };

    const end = evaluateClothoidElement(element, 50);

    expect(isPhase0ClothoidApproximation()).toBe(true);
    expect(end.point.x).toBeGreaterThan(49.9);
    expect(end.point.y).toBeGreaterThan(0);
    expect(end.azimuth).toBeCloseTo(0.05, 3);
    expect(clothoidCurvatureAt(element, 50)).toBeCloseTo(0.002, 9);
  });

  it("supports finite-radius transition curvature", () => {
    const element = {
      type: "clothoid" as const,
      id: "C2",
      start: { x: 0, y: 0 },
      azimuth: 0,
      clothoidParameter: 100,
      length: 60,
      startRadius: 800,
      endRadius: 500,
      turn: "left" as const,
    };

    expect(clothoidCurvatureAt(element, 0)).toBeCloseTo(1 / 800, 9);
    expect(clothoidCurvatureAt(element, 60)).toBeCloseTo(1 / 500, 9);
  });
});
