import { describe, expect, it } from "vitest";
import { evaluateCircularArcElement } from "../geometry/arc";
import { evaluateAlignmentAtDistance, validateAlignment } from "../geometry/horizontal";
import { evaluateStraightElement } from "../geometry/line";
import { offsetPoint } from "../vector";
import type { LinearAlignment } from "../types";
import { DEFAULT_TOLERANCES, nearlyEqual } from "../tolerances";

describe("liner geometry core", () => {
  it("evaluates a straight segment at start, middle, and end", () => {
    const element = {
      type: "straight" as const,
      id: "L1",
      start: { x: 0, y: 0 },
      azimuth: 0,
      length: 100,
    };

    expect(evaluateStraightElement(element, 0).point).toEqual({ x: 0, y: 0 });
    expect(evaluateStraightElement(element, 50).point).toEqual({ x: 50, y: 0 });
    expect(evaluateStraightElement(element, 100).point).toEqual({ x: 100, y: 0 });
    expect(evaluateStraightElement(element, 50).curvature).toBe(0);
  });

  it("evaluates a left circular arc using signed curvature", () => {
    const length = 500 * (Math.PI / 6);
    const element = {
      type: "arc" as const,
      id: "A1",
      start: { x: 0, y: 0 },
      azimuth: 0,
      radius: 500,
      turn: "left" as const,
      length,
    };

    const end = evaluateCircularArcElement(element, length);
    const mid = evaluateCircularArcElement(element, length / 2);

    expect(end.point.x).toBeCloseTo(250, 6);
    expect(end.point.y).toBeCloseTo(66.987298, 6);
    expect(mid.point.x).toBeCloseTo(129.409522, 5);
    expect(mid.point.y).toBeCloseTo(17.037087, 6);
    expect(mid.azimuth).toBeCloseTo(Math.PI / 12, 9);
    expect(end.curvature).toBeCloseTo(0.002, 9);
  });

  it("evaluates an alignment across multiple elements", () => {
    const arcLength = 500 * (Math.PI / 6);
    const alignment: LinearAlignment = {
      id: "alignment-1",
      linerModelId: "gc03",
      coordinatePolicyId: "global",
      elements: [
        {
          type: "straight",
          id: "L1",
          start: { x: 0, y: 0 },
          azimuth: 0,
          length: 100,
        },
        {
          type: "arc",
          id: "A1",
          start: { x: 100, y: 0 },
          azimuth: 0,
          radius: 500,
          turn: "left",
          length: arcLength,
        },
      ],
    };

    const junction = evaluateAlignmentAtDistance(alignment, 100);
    const end = evaluateAlignmentAtDistance(alignment, 100 + arcLength);

    expect(junction.point.x).toBeCloseTo(100, 6);
    expect(junction.point.y).toBeCloseTo(0, 6);
    expect(junction.azimuth).toBeCloseTo(0, 9);
    expect(end.point.x).toBeCloseTo(350, 6);
    expect(end.point.y).toBeCloseTo(66.987298, 6);
  });

  it("offsets points to the left of the tangent", () => {
    const base = { x: 50 / Math.sqrt(2), y: 50 / Math.sqrt(2) };
    const point = offsetPoint(base, Math.PI / 4, 5);

    expect(point.x).toBeCloseTo(31.819805, 6);
    expect(point.y).toBeCloseTo(38.890873, 6);
  });

  it("compares values with configured tolerances", () => {
    expect(nearlyEqual(1, 1 + DEFAULT_TOLERANCES.coordinate / 2)).toBe(true);
    expect(nearlyEqual(1, 1 + DEFAULT_TOLERANCES.coordinate * 2)).toBe(false);
  });

  it("returns validation issues for invalid input", () => {
    const alignment: LinearAlignment = {
      id: "bad",
      linerModelId: "bad",
      coordinatePolicyId: "global",
      elements: [
        {
          type: "straight",
          id: "zero",
          start: { x: 0, y: 0 },
          azimuth: 0,
          length: 0,
        },
      ],
    };

    expect(validateAlignment(alignment)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: "error",
          code: "LINER_GEOM_ZERO_LENGTH_SEGMENT",
        }),
      ]),
    );
  });

  it("rejects invalid circular arc radius with stable diagnostic metadata", () => {
    const alignment: LinearAlignment = {
      id: "bad-arc",
      linerModelId: "bad-arc",
      coordinatePolicyId: "global",
      elements: [
        {
          type: "arc",
          id: "A-bad",
          start: { x: 0, y: 0 },
          azimuth: 0,
          radius: 0,
          turn: "left",
          length: 10,
        },
      ],
    };

    expect(validateAlignment(alignment)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: "error",
          code: "LINER_GEOM_CLOTHOID_INVALID_RADIUS",
          messageKey: "liner.errors.geom_clothoid_radius",
          entityPath: "elements[0].radius",
          field: "radius",
        }),
      ]),
    );
  });
});
