import type { HaunchAnchorDraft } from "../../schema/types";
import type { CanonicalLinerIntermediateResult, SectionSliceResult } from "../types";
import type { Vec2 } from "../types";
import { DEFAULT_TOLERANCES } from "../tolerances";
import {
  buildLineOffsetMap,
  findSectionPointForLine,
  type LineOffsetEntry,
} from "../ldist/sectionLineIntersection";

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

export function resolveAnchorTopElevation(anchor: HaunchAnchorDraft, zRef: number): number {
  if (anchor.mode === "elevation") {
    return anchor.valueM;
  }
  return zRef + anchor.valueM;
}

export function resolveAnchorHaunchThickness(
  anchor: HaunchAnchorDraft,
  zRef: number,
  zTop: number,
): number {
  if (anchor.mode === "haunch") {
    return anchor.valueM;
  }
  return zTop - zRef;
}

export function intersectGirderAtSection(
  lineId: string,
  section: SectionSliceResult,
  lineOffsetMap: ReadonlyMap<string, LineOffsetEntry>,
): Vec2 | null {
  return findSectionPointForLine(section, lineId, lineOffsetMap);
}

export function resolveLateralOffsetM(
  lineId: string,
  lineOffsetMap: ReadonlyMap<string, LineOffsetEntry>,
): number | null {
  const entry = lineOffsetMap.get(lineId);
  return entry?.offset ?? null;
}

export function buildHaunchLineOffsetMap(
  alignments: readonly import("../../schema/types").AlignmentBundleDraft[],
): ReadonlyMap<string, LineOffsetEntry> {
  return buildLineOffsetMap(alignments);
}

export function findSectionAtStation(
  sections: readonly SectionSliceResult[],
  physicalDistance: number,
): SectionSliceResult | null {
  const match = sections.find(
    (section) => Math.abs(section.physicalDistance - physicalDistance) <= DEFAULT_TOLERANCES.station,
  );
  return match ?? null;
}
