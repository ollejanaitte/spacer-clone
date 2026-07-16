import { describe, expect, it } from "vitest";
import { buildIntermediateResult } from "../pipeline/pipeline";
import type { LinearAlignment } from "../types";
import type { VerticalAlignmentDraft } from "../../schema/types";

describe("pipeline vertical integration (PR-C)", () => {
  const alignment: LinearAlignment = {
    id: "alignment-vertical",
    linerModelId: "pv1",
    coordinatePolicyId: "global",
    elements: [
      {
        type: "straight",
        id: "L1",
        start: { x: 0, y: 0 },
        azimuth: 0,
        length: 100,
      },
    ],
  };

  const verticalAlignment: VerticalAlignmentDraft = {
    id: "VA-10pct",
    elements: [
      {
        type: "grade",
        id: "VG-1",
        startStation: 0,
        endStation: 100,
        startElevation: 0,
        grade: 0.1,
        length: 100,
      },
    ],
  };

  it("case 1: 100 m plan with 10% grade yields 10 m rise at end", () => {
    const result = buildIntermediateResult({
      alignment,
      stationDefinition: { originDisplayedStation: 0, interval: 50 },
      verticalAlignment,
      offsets: [0],
      z: 0,
    });

    const endSample = result.vertical.sampledPoints.find(
      (point) => point.physicalDistance === 100,
    );
    expect(endSample?.profileElevation).toBeCloseTo(10, 6);

    const endGrid = result.grid.points.find(
      (point) => point.offset === 0 && point.physicalDistance === 100,
    );
    expect(endGrid?.z).toBeCloseTo(10, 6);
    expect(endGrid?.zProvenance.profileElevation).toBeCloseTo(10, 6);
  });

  it("case 2: grade above hard limit blocks grid evaluation", () => {
    const steepVertical: VerticalAlignmentDraft = {
      id: "VA-20pct",
      elements: [
        {
          type: "grade",
          id: "VG-steep",
          startStation: 0,
          endStation: 100,
          startElevation: 0,
          grade: 0.2,
          length: 100,
        },
      ],
    };

    const result = buildIntermediateResult({
      alignment,
      stationDefinition: { originDisplayedStation: 0, interval: 50 },
      verticalAlignment: steepVertical,
      offsets: [0],
      z: 0,
    });

    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: "error",
          code: "LINER_PROFILE_GRADE_EXCEEDS_LIMIT",
        }),
      ]),
    );
    expect(result.grid.points).toHaveLength(0);
  });

  it("case 3: short vertical profile emits end-coverage warning", () => {
    const shortVertical: VerticalAlignmentDraft = {
      id: "VA-short",
      elements: [
        {
          type: "grade",
          id: "VG-short",
          startStation: 0,
          endStation: 80,
          startElevation: 0,
          grade: 0,
          length: 80,
        },
      ],
    };

    const result = buildIntermediateResult({
      alignment,
      stationDefinition: { originDisplayedStation: 0, interval: 50 },
      verticalAlignment: shortVertical,
      offsets: [0],
      z: 0,
    });

    const endCoverageWarnings = result.diagnostics.filter(
      (diagnostic) =>
        diagnostic.level === "warning" &&
        diagnostic.code === "LINER_PROFILE_END_COVERAGE_GAP",
    );
    expect(endCoverageWarnings.length).toBeGreaterThan(0);
  });

  it("case 4: overlapping vertical segments emit fail-closed overlap errors", () => {
    const overlappingVertical: VerticalAlignmentDraft = {
      id: "VA-overlap",
      elements: [
        {
          type: "grade",
          id: "VG-a",
          startStation: 0,
          endStation: 60,
          startElevation: 0,
          grade: 0,
          length: 60,
        },
        {
          type: "grade",
          id: "VG-b",
          startStation: 50,
          endStation: 100,
          startElevation: 0,
          grade: 0,
          length: 50,
        },
      ],
    };

    const result = buildIntermediateResult({
      alignment,
      stationDefinition: { originDisplayedStation: 0, interval: 50 },
      verticalAlignment: overlappingVertical,
      offsets: [0],
      z: 0,
    });

    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: "error",
          code: "LINER_PROFILE_OVERLAP",
        }),
      ]),
    );
  });
});
