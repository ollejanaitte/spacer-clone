import type { AlignmentBundleDraft } from "../../schema/types";
import type { SectionSliceResult } from "../types";
import type { Vec2 } from "../types";
import { DEFAULT_TOLERANCES } from "../tolerances";
import { normalize2 } from "../vector";

export type LineOffsetEntry = {
  alignmentId: string;
  offset: number;
};

export function buildLineOffsetMap(
  alignments: readonly AlignmentBundleDraft[],
): ReadonlyMap<string, LineOffsetEntry> {
  const map = new Map<string, LineOffsetEntry>();
  for (const bundle of alignments) {
    for (const template of bundle.crossSections) {
      for (const line of template.offsetLines) {
        map.set(line.id, { alignmentId: bundle.id, offset: line.offset });
      }
    }
  }
  return map;
}

export function findSectionPointForLine(
  section: SectionSliceResult,
  lineId: string,
  lineOffsetMap: ReadonlyMap<string, LineOffsetEntry>,
): Vec2 | null {
  const entry = lineOffsetMap.get(lineId);
  if (!entry) {
    return null;
  }
  const match = section.points.find(
    (point) => Math.abs(point.offset - entry.offset) <= DEFAULT_TOLERANCES.offset,
  );
  if (!match) {
    return null;
  }
  return { x: match.x, y: match.y };
}

export function intersectLineWithSection(
  lineId: string,
  section: SectionSliceResult,
  lineOffsetMap: ReadonlyMap<string, LineOffsetEntry>,
): Vec2 | null {
  return findSectionPointForLine(section, lineId, lineOffsetMap);
}

export function lineDirectionAtSection(alignmentAzimuth: number): Vec2 {
  return normalize2({
    x: Math.cos(alignmentAzimuth),
    y: Math.sin(alignmentAzimuth),
  });
}

export function sectionTraverseDirection(section: SectionSliceResult): Vec2 | null {
  if (section.points.length < 2) {
    return null;
  }
  const ordered = [...section.points].sort((left, right) => left.offset - right.offset);
  const left = ordered[0]!;
  const right = ordered[ordered.length - 1]!;
  const delta = { x: right.x - left.x, y: right.y - left.y };
  const length = Math.hypot(delta.x, delta.y);
  if (length <= DEFAULT_TOLERANCES.length) {
    return null;
  }
  return { x: delta.x / length, y: delta.y / length };
}

export function angleBetweenUnitVectors(left: Vec2, right: Vec2): number {
  const dot = left.x * right.x + left.y * right.y;
  const cross = left.x * right.y - left.y * right.x;
  return Math.atan2(Math.abs(cross), dot);
}

export function distance2D(left: Vec2, right: Vec2): number {
  return Math.hypot(left.x - right.x, left.y - right.y);
}

export function resolveAlignmentAzimuth(
  sampledPoints: readonly { physicalDistance: number; azimuth: number }[],
  physicalDistance: number,
): number | null {
  if (sampledPoints.length === 0) {
    return null;
  }
  let nearest = sampledPoints[0]!;
  let nearestDelta = Math.abs(nearest.physicalDistance - physicalDistance);
  for (const point of sampledPoints) {
    const delta = Math.abs(point.physicalDistance - physicalDistance);
    if (delta < nearestDelta) {
      nearest = point;
      nearestDelta = delta;
    }
  }
  if (nearestDelta > DEFAULT_TOLERANCES.station) {
    return null;
  }
  return nearest.azimuth;
}
