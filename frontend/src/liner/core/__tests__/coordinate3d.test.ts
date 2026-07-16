import { describe, expect, it } from "vitest";
import { buildIntermediateResult } from "../pipeline/pipeline";
import {
  crossSectionAtStation,
  elevationAtStation,
  pointAtStationOffset,
} from "../coordinate3d";
import type { LinearAlignment } from "../types";
import type { VerticalAlignmentDraft } from "../../schema/types";

describe("coordinate3d public API", () => {
  const alignment: LinearAlignment = {
    id: "alignment-1",
    linerModelId: "coord3d",
    coordinatePolicyId: "global",
    elements: [
      {
        type: "straight",
        id: "L1",
        start: { x: 0, y: 0 },
        azimuth: 0,
        length: 20,
      },
    ],
  };

  const baseInput = {
    alignment,
    stationDefinition: {
      originDisplayedStation: 0,
      interval: 10,
    },
    offsets: [-5, 0, 5],
    z: 10,
    computedAt: "2026-01-01T00:00:00.000Z",
  };

  it("returns profile elevation at station via elevationAtStation", () => {
    const result = elevationAtStation(baseInput, 10);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBeCloseTo(10, 6);
    }
  });

  it("returns 3D point at station and offset via pointAtStationOffset", () => {
    const result = pointAtStationOffset(baseInput, 10, 0);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toMatchObject({
        x: 10,
        y: 0,
        z: 10,
        physicalDistance: 10,
        displayedStation: 10,
        offset: 0,
        elementId: "L1",
      });
      expect(result.value.zProvenance.profileElevation).toBeCloseTo(10, 6);
      expect(result.value.zProvenance.crossfallOffset).toBeCloseTo(0, 6);
    }
  });

  it("matches buildIntermediateResult grid points for the same station and offset", () => {
    const intermediate = buildIntermediateResult(baseInput);
    const centerGridPoint = intermediate.grid.points.find(
      (point) => point.physicalDistance === 10 && point.offset === 0,
    );
    expect(centerGridPoint).toBeDefined();

    const result = pointAtStationOffset(baseInput, 10, 0);
    expect(result.ok).toBe(true);
    if (result.ok && centerGridPoint) {
      expect(result.value.x).toBeCloseTo(centerGridPoint.x, 6);
      expect(result.value.y).toBeCloseTo(centerGridPoint.y, 6);
      expect(result.value.z).toBeCloseTo(centerGridPoint.z, 6);
    }
  });

  it("returns cross-section offset lines and elevations at station", () => {
    const result = crossSectionAtStation(baseInput, 10);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.physicalDistance).toBeCloseTo(10, 6);
      expect(result.value.profileElevation).toBeCloseTo(10, 6);
      expect(result.value.offsetLines).toHaveLength(3);
      expect(result.value.offsetLines.map((line) => line.offset)).toEqual([-5, 0, 5]);
      expect(result.value.offsetLines[1]).toMatchObject({
        offset: 0,
        z: 10,
        x: 10,
        y: 0,
      });
    }
  });

  it("combines vertical grade and crossfall into point elevation", () => {
    const verticalAlignment: VerticalAlignmentDraft = {
      id: "VA-grade",
      elements: [
        {
          type: "grade",
          id: "VG-1",
          startStation: 0,
          endStation: 20,
          startElevation: 10,
          grade: 0.01,
          length: 20,
        },
      ],
    };
    const input = {
      ...baseInput,
      verticalAlignment,
      crossSections: [
        {
          id: "CS-default",
          name: "Default",
          offsetLines: [
            { id: "OL-l", offset: -5, elevation: 0, role: "edge" as const },
            { id: "OL-c", offset: 0, elevation: 0, role: "lane" as const },
            { id: "OL-r", offset: 5, elevation: 0, role: "edge" as const },
          ],
        },
      ],
      crossSlopeIntervals: [
        {
          id: "CF-1",
          startPhysicalDistance: 0,
          endPhysicalDistance: 20,
          mode: "one_way_right" as const,
          leftSlopePercent: 0,
          rightSlopePercent: 2,
          pivotDistance: 0,
        },
      ],
      z: 0,
    };

    const center = pointAtStationOffset(input, 20, 0);
    expect(center.ok).toBe(true);
    if (center.ok) {
      expect(center.value.zProvenance.profileElevation).toBeCloseTo(10.2, 6);
      expect(center.value.z).toBeCloseTo(10.2, 6);
    }

    const right = pointAtStationOffset(input, 20, 5);
    expect(right.ok).toBe(true);
    if (right.ok) {
      expect(right.value.zProvenance.crossfallOffset).toBeCloseTo(-0.1, 6);
      expect(right.value.z).toBeCloseTo(10.1, 6);
    }
  });

  it("fails closed for non-finite station", () => {
    const result = elevationAtStation(baseInput, Number.NaN);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("LINER_COORDINATE_INVALID_STATION");
    }
  });

  it("fails closed for station outside alignment length", () => {
    const result = pointAtStationOffset(baseInput, 25, 0);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("LINER_COORDINATE_STATION_OUT_OF_RANGE");
    }
  });

  it("fails closed for non-finite offset", () => {
    const result = pointAtStationOffset(baseInput, 10, Number.POSITIVE_INFINITY);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("LINER_COORDINATE_INVALID_OFFSET");
    }
  });

  it("fails closed when fatal diagnostics block evaluation", () => {
    const result = pointAtStationOffset(
      {
        ...baseInput,
        widthChangePoints: [
          {
            id: "WP-1",
            physicalDistance: 0,
            leftOffset: 4,
            rightOffset: 4,
          },
          {
            id: "WP-2",
            physicalDistance: 0,
            leftOffset: 5,
            rightOffset: 5,
          },
        ],
      },
      0,
      0,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("LINER_COORDINATE_FATAL_DIAGNOSTICS");
      expect(
        result.error.diagnostics.some((diagnostic) => diagnostic.code === "LINER_WIDTH_CHANGE_POINT_OVERLAP"),
      ).toBe(true);
    }
  });

  it("fails closed for measured-grid inputs", () => {
    const result = elevationAtStation(
      {
        ...baseInput,
        measuredGrid: {
          id: "MG-1",
          source: "test",
          sections: [],
          lines: [],
          points: [],
        },
      },
      0,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("LINER_COORDINATE_MEASURED_GRID_UNSUPPORTED");
    }
  });

  it("fails closed when vertical profile does not cover the requested station", () => {
    const result = elevationAtStation(
      {
        ...baseInput,
        verticalAlignment: {
          id: "VA-short",
          elements: [
            {
              type: "grade",
              id: "VG-short",
              startStation: 0,
              endStation: 5,
              startElevation: 10,
              grade: 0,
              length: 5,
            },
          ],
        },
        z: 0,
      },
      10,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("LINER_COORDINATE_PROFILE_COVERAGE_GAP");
    }
  });
});
