import { describe, expect, it } from "vitest";
import { elevationAt } from "../elevationAt";
import {
  SAMPLING_INTERVAL_DISPLAY,
  SAMPLING_INTERVAL_DXF,
  SAMPLING_INTERVAL_FRAME,
} from "../sampling";
import type {
  VerticalAlignmentDraft,
  VerticalGradeElementDraft,
  VerticalParabolicElementDraft,
} from "../../schema/types";
import {
  sampleVerticalDisplay,
  sampleVerticalDxf,
  sampleVerticalFrame,
  type VerticalSamplePoint,
} from "../verticalSampling";

const TOLERANCE_DISPLAY_Z = 0.01;
const TOLERANCE_DXF_Z = 0.001;
const TOLERANCE_FRAME_Z = 0.0005;

function singleElementVerticalAlignment(
  element: VerticalGradeElementDraft | VerticalParabolicElementDraft,
): VerticalAlignmentDraft {
  return {
    id: "golden-vertical",
    elements: [element],
  };
}

function gradeReferenceElevation(
  startElevation: number,
  grade: number,
  startStation: number,
  station: number,
): number {
  return startElevation + grade * (station - startStation);
}

function parabolicReferenceAt(
  element: VerticalParabolicElementDraft,
  station: number,
): { elevation: number; grade: number } {
  const u = Math.min(
    Math.max(station - element.startStation, 0),
    element.length,
  );
  const startElevation = element.startElevation ?? 0;
  const rate =
    element.length === 0
      ? 0
      : (element.endGrade - element.startGrade) / element.length;

  return {
    elevation: startElevation + element.startGrade * u + 0.5 * rate * u * u,
    grade: element.startGrade + rate * u,
  };
}

function expectWithinTolerance(actual: number, expected: number, tolerance: number): void {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
}

function expectSampledElevationsNearReference(
  sampledPoints: VerticalSamplePoint[],
  referenceElevationAt: (station: number) => number,
  tolerance: number,
): void {
  for (const point of sampledPoints) {
    expectWithinTolerance(point.elevation, referenceElevationAt(point.station), tolerance);
  }
}

describe("vertical golden tests", () => {
  describe("grade segment", () => {
    describe("0% grade", () => {
      const gradeElement: VerticalGradeElementDraft = {
        type: "grade",
        id: "VG-0pct",
        startStation: 0,
        endStation: 50,
        startElevation: 10,
        grade: 0,
        length: 50,
      };
      const verticalAlignment = singleElementVerticalAlignment(gradeElement);

      it("matches analytical values from elevationAt", () => {
        for (const station of [0, 12.5, 25, 37.5, 50]) {
          const reference = gradeReferenceElevation(
            gradeElement.startElevation,
            gradeElement.grade,
            gradeElement.startStation,
            station,
          );
          expect(elevationAt(station, verticalAlignment)).toBeCloseTo(reference, 9);
        }

        expect(elevationAt(-0.001, verticalAlignment)).toBeNull();
        expect(elevationAt(50.001, verticalAlignment)).toBeNull();
      });

      it("samples display, dxf, and frame profiles within tolerance", () => {
        const referenceElevationAt = (station: number) =>
          gradeReferenceElevation(
            gradeElement.startElevation,
            gradeElement.grade,
            gradeElement.startStation,
            station,
          );

        const displayPoints = sampleVerticalDisplay(verticalAlignment);
        const dxfPoints = sampleVerticalDxf(verticalAlignment);
        const framePoints = sampleVerticalFrame(verticalAlignment);

        expectSampledElevationsNearReference(
          displayPoints,
          referenceElevationAt,
          TOLERANCE_DISPLAY_Z,
        );
        expectSampledElevationsNearReference(dxfPoints, referenceElevationAt, TOLERANCE_DXF_Z);
        expectSampledElevationsNearReference(
          framePoints,
          referenceElevationAt,
          TOLERANCE_FRAME_Z,
        );

        expect(displayPoints).toHaveLength(101);
        expect(dxfPoints).toHaveLength(501);
        expect(framePoints).toHaveLength(201);
      });
    });

    describe("2% grade", () => {
      const gradeElement: VerticalGradeElementDraft = {
        type: "grade",
        id: "VG-2pct",
        startStation: 0,
        endStation: 100,
        startElevation: 0,
        grade: 0.02,
        length: 100,
      };
      const verticalAlignment = singleElementVerticalAlignment(gradeElement);

      it("matches analytical values from elevationAt", () => {
        for (const station of [0, 25, 50, 75, 100]) {
          const reference = gradeReferenceElevation(
            gradeElement.startElevation,
            gradeElement.grade,
            gradeElement.startStation,
            station,
          );
          expect(elevationAt(station, verticalAlignment)).toBeCloseTo(reference, 9);
        }
      });

      it("samples display, dxf, and frame profiles within tolerance", () => {
        const referenceElevationAt = (station: number) =>
          gradeReferenceElevation(
            gradeElement.startElevation,
            gradeElement.grade,
            gradeElement.startStation,
            station,
          );

        expectSampledElevationsNearReference(
          sampleVerticalDisplay(verticalAlignment),
          referenceElevationAt,
          TOLERANCE_DISPLAY_Z,
        );
        expectSampledElevationsNearReference(
          sampleVerticalDxf(verticalAlignment),
          referenceElevationAt,
          TOLERANCE_DXF_Z,
        );
        expectSampledElevationsNearReference(
          sampleVerticalFrame(verticalAlignment),
          referenceElevationAt,
          TOLERANCE_FRAME_Z,
        );
      });
    });
  });

  describe("parabolic segment", () => {
    describe("startGrade 0 -> endGrade 0.02", () => {
      const parabolicElement: VerticalParabolicElementDraft = {
        type: "parabolic",
        id: "VP-0to2pct",
        startStation: 0,
        endStation: 100,
        startGrade: 0,
        endGrade: 0.02,
        length: 100,
        startElevation: 0,
      };
      const verticalAlignment = singleElementVerticalAlignment(parabolicElement);

      it("matches analytical values from elevationAt", () => {
        for (const station of [0, 25, 50, 75, 100]) {
          const reference = parabolicReferenceAt(parabolicElement, station);
          expect(elevationAt(station, verticalAlignment)).toBeCloseTo(reference.elevation, 9);
        }
      });

      it("samples display, dxf, and frame profiles within tolerance", () => {
        const referenceElevationAt = (station: number) =>
          parabolicReferenceAt(parabolicElement, station).elevation;

        const displayPoints = sampleVerticalDisplay(verticalAlignment);
        const dxfPoints = sampleVerticalDxf(verticalAlignment);
        const framePoints = sampleVerticalFrame(verticalAlignment);

        expectSampledElevationsNearReference(
          displayPoints,
          referenceElevationAt,
          TOLERANCE_DISPLAY_Z,
        );
        expectSampledElevationsNearReference(dxfPoints, referenceElevationAt, TOLERANCE_DXF_Z);
        expectSampledElevationsNearReference(
          framePoints,
          referenceElevationAt,
          TOLERANCE_FRAME_Z,
        );

        expect(displayPoints).toHaveLength(201);
        expect(dxfPoints).toHaveLength(1001);
        expect(framePoints).toHaveLength(401);
      });
    });

    describe("startGrade 0.03 -> endGrade -0.01", () => {
      const parabolicElement: VerticalParabolicElementDraft = {
        type: "parabolic",
        id: "VP-3to-1pct",
        startStation: 0,
        endStation: 80,
        startGrade: 0.03,
        endGrade: -0.01,
        length: 80,
        startElevation: 5,
        curveType: "crest",
      };
      const verticalAlignment = singleElementVerticalAlignment(parabolicElement);

      it("matches analytical values from elevationAt", () => {
        for (const station of [0, 20, 40, 60, 80]) {
          const reference = parabolicReferenceAt(parabolicElement, station);
          expect(elevationAt(station, verticalAlignment)).toBeCloseTo(reference.elevation, 9);
        }
      });

      it("samples display, dxf, and frame profiles within tolerance", () => {
        const referenceElevationAt = (station: number) =>
          parabolicReferenceAt(parabolicElement, station).elevation;

        expectSampledElevationsNearReference(
          sampleVerticalDisplay(verticalAlignment),
          referenceElevationAt,
          TOLERANCE_DISPLAY_Z,
        );
        expectSampledElevationsNearReference(
          sampleVerticalDxf(verticalAlignment),
          referenceElevationAt,
          TOLERANCE_DXF_Z,
        );
        expectSampledElevationsNearReference(
          sampleVerticalFrame(verticalAlignment),
          referenceElevationAt,
          TOLERANCE_FRAME_Z,
        );
      });
    });
  });

  it("uses Decision #9 sampling intervals", () => {
    expect(SAMPLING_INTERVAL_DISPLAY).toBe(0.5);
    expect(SAMPLING_INTERVAL_DXF).toBe(0.1);
    expect(SAMPLING_INTERVAL_FRAME).toBe(0.25);
  });
});
