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
    id: "VA-20pct",
    elements: [
      {
        type: "grade",
        id: "VG-1",
        startStation: 0,
        endStation: 100,
        startElevation: 0,
        grade: 0.2,
        length: 100,
      },
    ],
  };

  it("case 1: 100 m plan with 20% grade yields 20 m rise at end", () => {
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
    expect(endSample?.profileElevation).toBeCloseTo(20, 6);

    const endGrid = result.grid.points.find(
      (point) => point.offset === 0 && point.physicalDistance === 100,
    );
    expect(endGrid?.z).toBeCloseTo(20, 6);
    expect(endGrid?.zProvenance.profileElevation).toBeCloseTo(20, 6);
  });

  it("case 3: short vertical profile blocks evaluation with error", () => {
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

    const coverageErrors = result.diagnostics.filter(
      (diagnostic) =>
        diagnostic.level === "error" && diagnostic.code === "LINER_PROFILE_COVERAGE_GAP",
    );
    expect(coverageErrors.length).toBeGreaterThan(0);
  });
});
