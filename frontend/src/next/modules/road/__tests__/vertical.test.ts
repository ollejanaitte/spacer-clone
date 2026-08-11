import { describe, expect, it } from "vitest";
import {
  createRoadVerticalAlignment,
  evaluateRoadElevation,
  evaluateRoadCenterline3D,
  evaluateVerticalElement,
} from "../vertical";
import type { VerticalElement } from "../../../../liner/core/geometry/vertical";
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

describe("Phase 2-04 Vertical Alignment (reuses LINER vertical)", () => {
  it("evaluates a grade segment elevation", () => {
    const element: VerticalElement = {
      type: "grade",
      id: "G1",
      startPhysicalDistance: 0,
      startElevation: 10,
      grade: 0.02,
      length: 100,
    };
    const eval0 = evaluateVerticalElement(element, 0);
    expect(eval0.elevation).toBeCloseTo(10, 9);
    const eval50 = evaluateVerticalElement(element, 50);
    expect(eval50.elevation).toBeCloseTo(11, 9);
    const eval100 = evaluateVerticalElement(element, 100);
    expect(eval100.elevation).toBeCloseTo(12, 9);
  });

  it("evaluates a parabolic vertical curve", () => {
    const element: VerticalElement = {
      type: "parabolic",
      id: "P1",
      startPhysicalDistance: 0,
      startElevation: 100,
      gradeIn: 0.02,
      gradeOut: -0.02,
      length: 100,
    };
    const eval0 = evaluateVerticalElement(element, 0);
    expect(eval0.elevation).toBeCloseTo(100, 9);
    const eval50 = evaluateVerticalElement(element, 50);
    // symmetric curve: elevation at midpoint = 100 + 0.02*50 - 0.5*0.0004*2500 = 100.5
    expect(eval50.elevation).toBeCloseTo(100.5, 6);
    const eval100 = evaluateVerticalElement(element, 100);
    expect(eval100.elevation).toBeCloseTo(100, 6);
  });

  it("validates vertical element bounds", () => {
    const good = createRoadVerticalAlignment([
      { type: "grade", id: "G1", startPhysicalDistance: 0, startElevation: 0, grade: 0, length: 100 },
    ]);
    expect(good.ok).toBe(true);

    const bad = createRoadVerticalAlignment([
      { type: "grade", id: "G1", startPhysicalDistance: 0, startElevation: 0, grade: 0, length: 0 },
    ]);
    expect(bad.ok).toBe(false);
  });

  it("evaluates 3D centerline (horizontal + vertical merge)", () => {
    const alignment = makeAlignment();
    const vertical: VerticalElement[] = [
      { type: "grade", id: "G1", startPhysicalDistance: 0, startElevation: 50, grade: 0.01, length: 150 },
    ];
    const p50 = evaluateRoadCenterline3D(alignment, vertical, 50);
    expect(p50).toBeDefined();
    if (!p50) return;
    expect(p50.point.x).toBeCloseTo(50, 9);
    expect(p50.point.z).toBeCloseTo(50.5, 9);
    expect(p50.azimuth).toBeCloseTo(0, 9);
    expect(p50.grade).toBeCloseTo(0.01, 9);

    const p101 = evaluateRoadCenterline3D(alignment, vertical, 101);
    expect(p101).toBeDefined();
    if (!p101) return;
    expect(p101.point.z).toBeCloseTo(51.01, 6);
    expect(p101.curvature).toBeCloseTo(0.02, 9);
  });

  it("returns undefined when vertical coverage is missing", () => {
    const alignment = makeAlignment();
    const result = evaluateRoadElevation([], 50);
    expect(result).toBeUndefined();
  });
});
