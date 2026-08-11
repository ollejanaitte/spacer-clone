import {
  resolveWidthAtDistance,
  validateWidthChangePoints,
} from "../../../liner/core/width/widthResolution";
import {
  resolveCrossfallState,
  resolveCrossfallOffset,
  validateCrossSlopeIntervals,
} from "../../../liner/core/grid/crossfallResolution";
import type {
  CrossSectionTemplateDraft,
  CrossSlopeIntervalDraft,
  WidthChangePointDraft,
} from "../../../liner/schema/types";

/**
 * Phase 2-06: Width change / widening / cross-slope transition.
 * Reuses the proven LINER width and crossfall resolution (KEEP/ADAPT).
 */
export {
  resolveWidthAtDistance,
  validateWidthChangePoints,
  resolveCrossfallState,
  resolveCrossfallOffset,
  validateCrossSlopeIntervals,
};

export type {
  CrossSectionTemplateDraft,
  CrossSlopeIntervalDraft,
  WidthChangePointDraft,
};

export interface RoadWidthAtStation {
  readonly leftOffset: number;
  readonly rightOffset: number;
  readonly source: string;
}

export function evaluateRoadWidth(
  template: CrossSectionTemplateDraft | undefined,
  widthChangePoints: readonly WidthChangePointDraft[] | undefined,
  physicalDistance: number,
): RoadWidthAtStation {
  const resolved = resolveWidthAtDistance(template, widthChangePoints, physicalDistance);
  return {
    leftOffset: resolved.leftHalfWidth,
    rightOffset: resolved.rightHalfWidth,
    source: resolved.source,
  };
}

export interface RoadCrossfallAtStation {
  readonly leftSlopePercent: number;
  readonly rightSlopePercent: number;
  readonly pivotDistance: number;
}

export function evaluateRoadCrossfall(
  template: CrossSectionTemplateDraft | undefined,
  crossSlopeIntervals: readonly CrossSlopeIntervalDraft[] | undefined,
  physicalDistance: number,
  displayedStation: number,
): RoadCrossfallAtStation {
  const state = resolveCrossfallState(
    {
      crossSectionTemplate: template,
      crossSlopeIntervals: crossSlopeIntervals ? [...crossSlopeIntervals] : undefined,
    },
    physicalDistance,
    displayedStation,
  );
  return {
    leftSlopePercent: state.leftSlopePercent,
    rightSlopePercent: state.rightSlopePercent,
    pivotDistance: state.pivotDistance,
  };
}

export function evaluateRoadCrossfallOffset(
  template: CrossSectionTemplateDraft | undefined,
  crossSlopeIntervals: readonly CrossSlopeIntervalDraft[] | undefined,
  physicalDistance: number,
  displayedStation: number,
  offset: number,
): number {
  const state = resolveCrossfallState(
    {
      crossSectionTemplate: template,
      crossSlopeIntervals: crossSlopeIntervals ? [...crossSlopeIntervals] : undefined,
    },
    physicalDistance,
    displayedStation,
  );
  return resolveCrossfallOffset(state, offset);
}
