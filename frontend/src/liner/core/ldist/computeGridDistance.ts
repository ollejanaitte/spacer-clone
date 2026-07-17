import type { LdistLinePairDraft } from "../../schema/types";
import type { SectionSliceResult } from "../types";
import type { Vec2 } from "../types";
import { DEFAULT_TOLERANCES } from "../tolerances";
import {
  angleBetweenUnitVectors,
  distance2D,
  intersectLineWithSection,
  lineDirectionAtSection,
  resolveAlignmentAzimuth,
  sectionTraverseDirection,
  type LineOffsetEntry,
} from "./sectionLineIntersection";

const SIN_DEGENERATE_EPSILON = DEFAULT_TOLERANCES.length;

export interface GridDistanceResult {
  distanceM: number;
  signConvention: string;
}

export function computeGridDistanceModeA(
  pair: LdistLinePairDraft,
  section: SectionSliceResult,
  lineOffsetMap: ReadonlyMap<string, LineOffsetEntry>,
): GridDistanceResult | null {
  const fromPoint = intersectLineWithSection(pair.fromLineId, section, lineOffsetMap);
  const toPoint = intersectLineWithSection(pair.toLineId, section, lineOffsetMap);
  if (!fromPoint || !toPoint) {
    return null;
  }
  const distanceM = distance2D(fromPoint, toPoint);
  if (distanceM <= DEFAULT_TOLERANCES.length) {
    return null;
  }
  return {
    distanceM,
    signConvention: "mode_a_unsigned",
  };
}

export function computeGridDistanceModeB(
  pair: LdistLinePairDraft,
  referenceLineId: string,
  section: SectionSliceResult,
  lineOffsetMap: ReadonlyMap<string, LineOffsetEntry>,
  alignmentAzimuth: number,
): GridDistanceResult | null {
  const base = computeGridDistanceModeA(pair, section, lineOffsetMap);
  if (!base) {
    return null;
  }
  const sectionDirection = sectionTraverseDirection(section);
  if (!sectionDirection) {
    return null;
  }
  const referenceDirection = lineDirectionAtSection(alignmentAzimuth);
  const thetaRef = angleBetweenUnitVectors(sectionDirection, referenceDirection);
  const sinTheta = Math.sin(thetaRef);
  if (Math.abs(sinTheta) <= SIN_DEGENERATE_EPSILON) {
    return null;
  }
  if (!intersectLineWithSection(referenceLineId, section, lineOffsetMap)) {
    return null;
  }
  return {
    distanceM: base.distanceM * sinTheta,
    signConvention: "mode_b_sin_theta_ref",
  };
}

export function resolveSectionAlignmentAzimuth(
  section: SectionSliceResult,
  sampledPoints: readonly { physicalDistance: number; azimuth: number }[],
): number | null {
  return resolveAlignmentAzimuth(sampledPoints, section.physicalDistance);
}

export function arePointsCoincident(left: Vec2 | null, right: Vec2 | null): boolean {
  if (!left || !right) {
    return false;
  }
  return distance2D(left, right) <= DEFAULT_TOLERANCES.length;
}
