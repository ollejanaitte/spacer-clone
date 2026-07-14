import { describe, expect, it } from "vitest";
import { applyCrossSlope, mergeCrossSectionZ } from "../crossSectionZMerge";
import { buildIntermediateResult } from "../pipeline/pipeline";
import type { LinearAlignment } from "../types";
import type { CrossSectionTemplateDraft, VerticalAlignmentDraft } from "../../schema/types";

describe("cross slope Z merge (PR-E)", () => {
  it("case 2: offset 5 m and 2% slope yields 0.10 m delta", () => {
    expect(applyCrossSlope(5, 2)).toBeCloseTo(-0.1, 9);
    expect(mergeCrossSectionZ(100, 5, 0, 2)).toBeCloseTo(99.9, 9);
  });

  it("combines vertical and cross slope in grid generation", () => {
    const alignment: LinearAlignment = {
      id: "alignment-cross",
      linerModelId: "cs1",
      coordinatePolicyId: "global",
      elements: [
        {
          type: "straight",
          id: "L1",
          start: { x: 0, y: 0 },
          azimuth: 0,
          length: 50,
        },
      ],
    };

    const verticalAlignment: VerticalAlignmentDraft = {
      id: "VA-flat",
      elements: [
        {
          type: "grade",
          id: "VG-flat",
          startStation: 0,
          endStation: 50,
          startElevation: 100,
          grade: 0,
          length: 50,
        },
      ],
    };

    const crossSectionTemplate: CrossSectionTemplateDraft = {
      id: "CS-cross",
      name: "Cross",
      crossSlope: {
        signConvention: "right_down_positive",
        valuePercent: 2,
      },
      offsetLines: [
        { id: "center", offset: 0, elevation: 0 },
        { id: "right", offset: 5, elevation: -0.1 },
      ],
    };

    const result = buildIntermediateResult({
      alignment,
      stationDefinition: { originDisplayedStation: 0, interval: 50 },
      verticalAlignment,
      crossSections: [crossSectionTemplate],
      offsets: [0, 5],
      z: 100,
    });

    const center = result.grid.points.find((point) => point.offset === 0);
    const right = result.grid.points.find((point) => point.offset === 5);

    expect(center?.z).toBeCloseTo(100, 6);
    expect(right?.z).toBeCloseTo(99.8, 6);
    expect(right?.zProvenance.profileElevation).toBeCloseTo(100, 6);
    expect(right?.zProvenance.crossfallOffset).toBeCloseTo(-0.1, 6);
    expect(right?.zProvenance.sectionDepthOffset).toBeCloseTo(-0.1, 6);
  });
});
