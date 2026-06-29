import { describe, expect, it } from "vitest";
import { evaluateAlignmentAtDistance } from "../geometry/horizontal";
import {
  SAMPLING_INTERVAL_DISPLAY,
  SAMPLING_INTERVAL_DXF,
  SAMPLING_INTERVAL_FRAME,
  sampleDisplay,
  sampleDxf,
  sampleFrame,
} from "../sampling";
import { DEFAULT_TOLERANCES } from "../tolerances";
import type {
  AlignmentSamplePoint,
  CircularArcElement,
  ClothoidElement,
  LinearAlignment,
  StationDefinition,
  StraightElement,
} from "../types";

const TOLERANCE_DISPLAY_XY = 0.01;
const TOLERANCE_DXF_XY = 0.001;
const TOLERANCE_FRAME_XY = 0.0005;

const MAX_CHORD_DISPLAY = 0.5;
const MAX_CHORD_DXF = 0.1;
const MAX_CHORD_FRAME = 0.25;

const HIGH_RES_SIMPSON_INTERVALS = 8192;

const stationDefinition: StationDefinition = {
  originDisplayedStation: 0,
  interval: 10,
};

function singleElementAlignment(
  element: StraightElement | CircularArcElement | ClothoidElement,
): LinearAlignment {
  return {
    id: "golden-alignment",
    linerModelId: "golden",
    coordinatePolicyId: "global",
    elements: [element],
  };
}

function straightReferenceAt(element: StraightElement, localDistance: number) {
  const distance = Math.min(Math.max(localDistance, 0), element.length);
  return {
    x: element.start.x + Math.cos(element.azimuth) * distance,
    y: element.start.y + Math.sin(element.azimuth) * distance,
    azimuth: element.azimuth,
    curvature: 0,
  };
}

function arcReferenceAt(element: CircularArcElement, localDistance: number) {
  const distance = Math.min(Math.max(localDistance, 0), element.length);
  const sign = element.turn === "left" ? 1 : -1;
  const delta = (distance / element.radius) * sign;
  const azimuth = element.azimuth + delta;
  const sin0 = Math.sin(element.azimuth);
  const cos0 = Math.cos(element.azimuth);
  const sin1 = Math.sin(azimuth);
  const cos1 = Math.cos(azimuth);

  return {
    x: element.start.x + sign * element.radius * (sin1 - sin0),
    y: element.start.y - sign * element.radius * (cos1 - cos0),
    azimuth,
    curvature: sign / element.radius,
  };
}

function clothoidCurvatureReference(element: ClothoidElement, localDistance: number): number {
  const sign = element.turn === "right" ? -1 : 1;
  const startCurvature =
    (element.startRadius == null || !Number.isFinite(element.startRadius)
      ? 0
      : 1 / element.startRadius) * sign;
  const endCurvature =
    element.endRadius == null || !Number.isFinite(element.endRadius)
      ? sign * (element.length / element.clothoidParameter ** 2)
      : (1 / element.endRadius) * sign;
  const t = element.length === 0 ? 0 : localDistance / element.length;
  return startCurvature + (endCurvature - startCurvature) * t;
}

function clothoidHeadingReference(element: ClothoidElement, distance: number): number {
  const k0 = clothoidCurvatureReference(element, 0);
  const k1 = clothoidCurvatureReference(element, element.length);
  const slope = element.length === 0 ? 0 : (k1 - k0) / element.length;
  return element.azimuth + k0 * distance + 0.5 * slope * distance * distance;
}

function simpsonIntegrateReference(
  length: number,
  intervals: number,
  valueAt: (distance: number) => number,
): number {
  const evenIntervals = intervals % 2 === 0 ? intervals : intervals + 1;
  const step = length / evenIntervals;
  let sum = valueAt(0) + valueAt(length);
  for (let index = 1; index < evenIntervals; index += 1) {
    sum += (index % 2 === 0 ? 2 : 4) * valueAt(index * step);
  }
  return (sum * step) / 3;
}

function clothoidReferenceAt(element: ClothoidElement, localDistance: number) {
  const distance = Math.min(Math.max(localDistance, 0), element.length);
  const xLocal = simpsonIntegrateReference(distance, HIGH_RES_SIMPSON_INTERVALS, (s) =>
    Math.cos(clothoidHeadingReference(element, s)),
  );
  const yLocal = simpsonIntegrateReference(distance, HIGH_RES_SIMPSON_INTERVALS, (s) =>
    Math.sin(clothoidHeadingReference(element, s)),
  );

  return {
    x: element.start.x + xLocal,
    y: element.start.y + yLocal,
    azimuth: clothoidHeadingReference(element, distance),
    curvature: clothoidCurvatureReference(element, distance),
  };
}

function maxChordLength(points: Pick<AlignmentSamplePoint, "x" | "y">[]): number {
  let max = 0;
  for (let index = 1; index < points.length; index += 1) {
    const chord = Math.hypot(
      points[index].x - points[index - 1].x,
      points[index].y - points[index - 1].y,
    );
    max = Math.max(max, chord);
  }
  return max;
}

function expectWithinTolerance(actual: number, expected: number, tolerance: number): void {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
}

function expectSampledPointsNearReference(
  sampledPoints: AlignmentSamplePoint[],
  referenceAt: (physicalDistance: number) => { x: number; y: number },
  tolerance: number,
): void {
  for (const point of sampledPoints) {
    const reference = referenceAt(point.physicalDistance);
    expectWithinTolerance(point.x, reference.x, tolerance);
    expectWithinTolerance(point.y, reference.y, tolerance);
  }
}

describe("horizontal curve golden tests", () => {
  describe("straight segment", () => {
    const straight: StraightElement = {
      type: "straight",
      id: "L-golden",
      start: { x: 0, y: 0 },
      azimuth: 0,
      length: 20,
    };
    const alignment = singleElementAlignment(straight);

    it("matches analytical values from evaluateAlignmentAtDistance", () => {
      for (const distance of [0, 5, 10, 15, 20]) {
        const reference = straightReferenceAt(straight, distance);
        const evaluation = evaluateAlignmentAtDistance(alignment, distance);

        expect(evaluation.point.x).toBeCloseTo(reference.x, 9);
        expect(evaluation.point.y).toBeCloseTo(reference.y, 9);
        expect(evaluation.azimuth).toBeCloseTo(reference.azimuth, 9);
        expect(evaluation.curvature).toBeCloseTo(reference.curvature, 9);
      }
    });

    it("samples display, dxf, and frame profiles within tolerance", () => {
      const referenceAt = (physicalDistance: number) =>
        straightReferenceAt(straight, physicalDistance);

      const displayPoints = sampleDisplay(alignment, stationDefinition);
      const dxfPoints = sampleDxf(alignment, stationDefinition);
      const framePoints = sampleFrame(alignment, stationDefinition);

      expectSampledPointsNearReference(displayPoints, referenceAt, TOLERANCE_DISPLAY_XY);
      expectSampledPointsNearReference(dxfPoints, referenceAt, TOLERANCE_DXF_XY);
      expectSampledPointsNearReference(framePoints, referenceAt, TOLERANCE_FRAME_XY);

      expect(displayPoints).toHaveLength(41);
      expect(dxfPoints).toHaveLength(201);
      expect(framePoints).toHaveLength(81);
    });

    it("keeps chord lengths within each sampling profile limit", () => {
      expect(maxChordLength(sampleDisplay(alignment, stationDefinition))).toBeLessThanOrEqual(
        MAX_CHORD_DISPLAY + DEFAULT_TOLERANCES.coordinate,
      );
      expect(maxChordLength(sampleDxf(alignment, stationDefinition))).toBeLessThanOrEqual(
        MAX_CHORD_DXF + DEFAULT_TOLERANCES.coordinate,
      );
      expect(maxChordLength(sampleFrame(alignment, stationDefinition))).toBeLessThanOrEqual(
        MAX_CHORD_FRAME + DEFAULT_TOLERANCES.coordinate,
      );
    });

    it("uses Decision #9 sampling intervals", () => {
      expect(SAMPLING_INTERVAL_DISPLAY).toBe(MAX_CHORD_DISPLAY);
      expect(SAMPLING_INTERVAL_DXF).toBe(MAX_CHORD_DXF);
      expect(SAMPLING_INTERVAL_FRAME).toBe(MAX_CHORD_FRAME);
    });
  });

  describe("circular arc", () => {
    const arcLength = 500 * (Math.PI / 6);
    const arc: CircularArcElement = {
      type: "arc",
      id: "A-golden",
      start: { x: 0, y: 0 },
      azimuth: 0,
      radius: 500,
      turn: "left",
      length: arcLength,
    };
    const alignment = singleElementAlignment(arc);

    it("matches arc-formula representative points from evaluateAlignmentAtDistance", () => {
      const checkpoints = [
        { distance: 0, x: 0, y: 0, azimuth: 0 },
        { distance: arcLength / 2, x: 129.409522, y: 17.037087, azimuth: Math.PI / 12 },
        { distance: arcLength, x: 250, y: 66.987298, azimuth: Math.PI / 6 },
      ];

      for (const checkpoint of checkpoints) {
        const evaluation = evaluateAlignmentAtDistance(alignment, checkpoint.distance);
        expect(evaluation.point.x).toBeCloseTo(checkpoint.x, 5);
        expect(evaluation.point.y).toBeCloseTo(checkpoint.y, 5);
        expect(evaluation.azimuth).toBeCloseTo(checkpoint.azimuth, 9);
        expect(evaluation.curvature).toBeCloseTo(0.002, 9);
      }
    });

    it("samples display, dxf, and frame profiles within tolerance", () => {
      const referenceAt = (physicalDistance: number) =>
        arcReferenceAt(arc, physicalDistance);

      expectSampledPointsNearReference(
        sampleDisplay(alignment, stationDefinition),
        referenceAt,
        TOLERANCE_DISPLAY_XY,
      );
      expectSampledPointsNearReference(
        sampleDxf(alignment, stationDefinition),
        referenceAt,
        TOLERANCE_DXF_XY,
      );
      expectSampledPointsNearReference(
        sampleFrame(alignment, stationDefinition),
        referenceAt,
        TOLERANCE_FRAME_XY,
      );
    });

    it("keeps chord lengths within each sampling profile limit", () => {
      expect(maxChordLength(sampleDisplay(alignment, stationDefinition))).toBeLessThanOrEqual(
        MAX_CHORD_DISPLAY + DEFAULT_TOLERANCES.coordinate,
      );
      expect(maxChordLength(sampleDxf(alignment, stationDefinition))).toBeLessThanOrEqual(
        MAX_CHORD_DXF + DEFAULT_TOLERANCES.coordinate,
      );
      expect(maxChordLength(sampleFrame(alignment, stationDefinition))).toBeLessThanOrEqual(
        MAX_CHORD_FRAME + DEFAULT_TOLERANCES.coordinate,
      );
    });
  });

  describe("clothoid segment", () => {
    const clothoid: ClothoidElement = {
      type: "clothoid",
      id: "C-golden",
      start: { x: 0, y: 0 },
      azimuth: 0,
      clothoidParameter: 100,
      length: 50,
      startRadius: null,
      endRadius: 500,
      turn: "left",
    };
    const alignment = singleElementAlignment(clothoid);

    it("matches high-resolution Simpson reference from evaluateAlignmentAtDistance", () => {
      for (const distance of [0, 12.5, 25, 37.5, 50]) {
        const reference = clothoidReferenceAt(clothoid, distance);
        const evaluation = evaluateAlignmentAtDistance(alignment, distance);

        expect(evaluation.point.x).toBeCloseTo(reference.x, 3);
        expect(evaluation.point.y).toBeCloseTo(reference.y, 3);
        expect(evaluation.azimuth).toBeCloseTo(reference.azimuth, 6);
        expect(evaluation.curvature).toBeCloseTo(reference.curvature, 6);
      }
    });

    it("samples display, dxf, and frame profiles within tolerance", () => {
      const referenceAt = (physicalDistance: number) =>
        clothoidReferenceAt(clothoid, physicalDistance);

      expectSampledPointsNearReference(
        sampleDisplay(alignment, stationDefinition),
        referenceAt,
        TOLERANCE_DISPLAY_XY,
      );
      expectSampledPointsNearReference(
        sampleDxf(alignment, stationDefinition),
        referenceAt,
        TOLERANCE_DXF_XY,
      );
      expectSampledPointsNearReference(
        sampleFrame(alignment, stationDefinition),
        referenceAt,
        TOLERANCE_FRAME_XY,
      );
    });

    it("keeps chord lengths within each sampling profile limit", () => {
      expect(maxChordLength(sampleDisplay(alignment, stationDefinition))).toBeLessThanOrEqual(
        MAX_CHORD_DISPLAY + DEFAULT_TOLERANCES.coordinate,
      );
      expect(maxChordLength(sampleDxf(alignment, stationDefinition))).toBeLessThanOrEqual(
        MAX_CHORD_DXF + DEFAULT_TOLERANCES.coordinate,
      );
      expect(maxChordLength(sampleFrame(alignment, stationDefinition))).toBeLessThanOrEqual(
        MAX_CHORD_FRAME + DEFAULT_TOLERANCES.coordinate,
      );
    });
  });
});
