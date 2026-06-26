import type { CanonicalLinerIntermediateResult } from "../core/types";
import {
  LINER_HEADLESS_FIXTURE_MATERIAL_IDS,
  LINER_HEADLESS_FIXTURE_SECTION_IDS,
} from "./linerProjectDefaults";

export function applyLinerHeadlessFixtureMemberRules(
  intermediate: CanonicalLinerIntermediateResult,
): CanonicalLinerIntermediateResult {
  return {
    ...intermediate,
    frameHints: {
      ...intermediate.frameHints,
      defaultMemberGroupKey: "deck",
      memberGroupRules: [
        {
          key: "deck",
          match: {},
          materialId: LINER_HEADLESS_FIXTURE_MATERIAL_IDS.deck,
          sectionId: LINER_HEADLESS_FIXTURE_SECTION_IDS.deck,
        },
        {
          key: "cross",
          match: { direction: "transverse" },
          materialId: LINER_HEADLESS_FIXTURE_MATERIAL_IDS.cross,
          sectionId: LINER_HEADLESS_FIXTURE_SECTION_IDS.cross,
        },
      ],
    },
  };
}

export function applyPinnedBoundarySupportTemplates(
  intermediate: CanonicalLinerIntermediateResult,
): CanonicalLinerIntermediateResult {
  const longitudinalIndices = [
    ...new Set(intermediate.grid.points.map((point) => point.labels.longitudinalIndex)),
  ].sort((a, b) => a - b);
  const minLi = longitudinalIndices[0];
  const maxLi = longitudinalIndices[longitudinalIndices.length - 1];
  const startDistance = intermediate.grid.points.find(
    (point) => point.labels.longitudinalIndex === minLi,
  )?.physicalDistance;
  const endDistance = intermediate.grid.points.find(
    (point) => point.labels.longitudinalIndex === maxLi,
  )?.physicalDistance;

  if (startDistance === undefined || endDistance === undefined) {
    return intermediate;
  }

  const pinnedDof = {
    ux: true,
    uy: true,
    uz: true,
    rx: true,
    ry: true,
    rz: true,
  };

  return {
    ...intermediate,
    frameHints: {
      ...intermediate.frameHints,
      supportTemplates: [
        {
          templateId: "pinned-start",
          physicalDistance: startDistance,
          nodeRoles: [],
          dof: pinnedDof,
          coordinateSystem: "global",
        },
        {
          templateId: "pinned-end",
          physicalDistance: endDistance,
          nodeRoles: [],
          dof: pinnedDof,
          coordinateSystem: "global",
        },
      ],
    },
  };
}
