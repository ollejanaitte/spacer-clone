import { describe, expect, it } from "vitest";
import { buildIntermediateResult } from "../../core/pipeline/pipeline";
import { mapToFrameModel } from "../frameModelMapper";
import type { CanonicalLinerIntermediateResult, LinearAlignment } from "../../core/types";
import type { CrossSectionTemplateDraft, VerticalAlignmentDraft } from "../../schema/types";

const alignment: LinearAlignment = {
  id: "alignment-frame",
  linerModelId: "fg1",
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

function createIntermediate(): CanonicalLinerIntermediateResult {
  const verticalAlignment: VerticalAlignmentDraft = {
    id: "VA-frame",
    elements: [
      {
        type: "grade",
        id: "VG-frame",
        startStation: 0,
        endStation: 20,
        startElevation: 10,
        grade: 0.05,
        length: 20,
      },
    ],
  };

  const crossSectionTemplate: CrossSectionTemplateDraft = {
    id: "CS-frame",
    name: "Frame",
    crossSlope: {
      signConvention: "right_down_positive",
      valuePercent: 2,
    },
    offsetLines: [
      { id: "left", offset: -5, elevation: 0.1 },
      { id: "center", offset: 0, elevation: 0 },
      { id: "right", offset: 5, elevation: -0.1 },
    ],
  };

  const intermediate = buildIntermediateResult({
    alignment,
    stationDefinition: {
      originDisplayedStation: 0,
      interval: 10,
    },
    verticalAlignment,
    crossSections: [crossSectionTemplate],
    offsets: [-5, 0, 5],
    z: 10,
    computedAt: "2026-01-01T00:00:00.000Z",
  });

  return {
    ...intermediate,
    frameHints: {
      ...intermediate.frameHints,
      defaultMemberGroupKey: "deck",
      memberGroupRules: [
        {
          key: "deck",
          match: {},
          materialId: "MAT_DECK",
          sectionId: "SEC_DECK",
        },
        {
          key: "cross",
          match: { direction: "transverse" },
          materialId: "MAT_DECK",
          sectionId: "SEC_CROSS",
        },
      ],
    },
  };
}

describe("frame generation with vertical and cross slope (PR-E)", () => {
  it("maps grid Z including vertical profile and crossfall offset to frame nodes", () => {
    const result = mapToFrameModel(createIntermediate(), {
      materialIds: ["MAT_DECK"],
      sectionIds: ["SEC_DECK", "SEC_CROSS"],
    });

    expect(result.diagnostics.filter((diagnostic) => diagnostic.level === "error")).toHaveLength(0);

    const centerNode = result.nodes.find((node) => node.id === "N_LINER_fg1_002_001");
    const rightNode = result.nodes.find((node) => node.id === "N_LINER_fg1_002_002");

    expect(centerNode?.z).toBeCloseTo(11, 6);
    expect(rightNode?.z).toBeCloseTo(10.8, 6);
  });
});
