import { describe, expect, it } from "vitest";
import {
  clothoidCurvatureAt,
  evaluateClothoidElement,
  isPhase0ClothoidApproximation,
} from "../geometry/clothoid";
import { validateAlignment } from "../geometry/horizontal";
import type { ClothoidElement, LinearAlignment } from "../types";

function alignmentWith(element: ClothoidElement): LinearAlignment {
  return {
    id: "clothoid-validation",
    linerModelId: "clothoid-validation",
    coordinatePolicyId: "global",
    elements: [element],
  };
}

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

  it("keeps GC-08 through GC-10 production shipping fail-closed behind the Phase 0 guard", () => {
    expect(isPhase0ClothoidApproximation()).toBe(true);
  });

  it("rejects invalid clothoid parameter with stable diagnostic metadata", () => {
    const element: ClothoidElement = {
      type: "clothoid",
      id: "C-invalid-a",
      start: { x: 0, y: 0 },
      azimuth: 0,
      clothoidParameter: 0,
      length: 50,
      startRadius: null,
      endRadius: 500,
      turn: "left",
    };

    expect(validateAlignment(alignmentWith(element))).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: "error",
          code: "LINER_GEOM_CLOTHOID_INVALID_RADIUS",
          messageKey: "liner.errors.geom_clothoid_radius",
          entityPath: "elements[0].clothoidParameter",
          field: "clothoidParameter",
        }),
      ]),
    );
  });

  it("rejects invalid finite clothoid radii with stable diagnostic metadata", () => {
    const element: ClothoidElement = {
      type: "clothoid",
      id: "C-invalid-radius",
      start: { x: 0, y: 0 },
      azimuth: 0,
      clothoidParameter: 100,
      length: 50,
      startRadius: -800,
      endRadius: 0,
      turn: "left",
    };

    const diagnostics = validateAlignment(alignmentWith(element));

    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: "error",
          code: "LINER_GEOM_CLOTHOID_INVALID_RADIUS",
          messageKey: "liner.errors.geom_clothoid_radius",
          entityPath: "elements[0].startRadius",
          field: "startRadius",
        }),
        expect.objectContaining({
          level: "error",
          code: "LINER_GEOM_CLOTHOID_INVALID_RADIUS",
          messageKey: "liner.errors.geom_clothoid_radius",
          entityPath: "elements[0].endRadius",
          field: "endRadius",
        }),
      ]),
    );
  });
});
