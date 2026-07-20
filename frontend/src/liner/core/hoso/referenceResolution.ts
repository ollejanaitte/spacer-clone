import type { CrossSectionTemplateDraft, CrossSlopeIntervalDraft } from "../../schema/types";
import type { CanonicalLinerIntermediateResult } from "../types";
import { resolveCrossfallOffset, resolveCrossfallState } from "../grid/crossfallResolution";
import { DEFAULT_TOLERANCES } from "../tolerances";

export function resolveProfileElevationAt(
  physicalDistance: number,
  intermediate: CanonicalLinerIntermediateResult,
): number | null {
  const points = intermediate.vertical.sampledPoints;
  if (points.length === 0) {
    return null;
  }
  let nearest = points[0]!;
  let nearestDelta = Math.abs(nearest.physicalDistance - physicalDistance);
  for (const point of points) {
    const delta = Math.abs(point.physicalDistance - physicalDistance);
    if (delta < nearestDelta) {
      nearest = point;
      nearestDelta = delta;
    }
  }
  if (nearestDelta > DEFAULT_TOLERANCES.station) {
    return null;
  }
  return nearest.profileElevation;
}

export function resolveReferenceElevation(
  physicalDistance: number,
  displayedStation: number,
  lateralOffsetM: number,
  intermediate: CanonicalLinerIntermediateResult,
  crossSectionTemplate: CrossSectionTemplateDraft | undefined,
  crossSlopeIntervals: readonly CrossSlopeIntervalDraft[] | undefined,
): number | null {
  const zProfile = resolveProfileElevationAt(physicalDistance, intermediate);
  if (zProfile === null) {
    return null;
  }
  const crossfallState = resolveCrossfallState(
    {
      crossSectionTemplate,
      crossSlopeIntervals: crossSlopeIntervals
        ? [...crossSlopeIntervals]
        : undefined,
    },
    physicalDistance,
    displayedStation,
  );
  const crossfallDelta = resolveCrossfallOffset(crossfallState, lateralOffsetM);
  return zProfile + crossfallDelta;
}

export function pavementElevationFromThickness(
  thicknessM: number,
  physicalDistance: number,
  displayedStation: number,
  lateralOffsetM: number,
  intermediate: CanonicalLinerIntermediateResult,
  crossSectionTemplate: CrossSectionTemplateDraft | undefined,
  crossSlopeIntervals: readonly CrossSlopeIntervalDraft[] | undefined,
): number | null {
  const zRef = resolveReferenceElevation(
    physicalDistance,
    displayedStation,
    lateralOffsetM,
    intermediate,
    crossSectionTemplate,
    crossSlopeIntervals,
  );
  if (zRef === null) {
    return null;
  }
  return zRef + thicknessM;
}
