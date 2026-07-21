import type { CanonicalLinerIntermediateResult, GridPointResult } from "../../core/types";
import type { DrawingLayer } from "../model/document";
import { createPoint2, type Point2 } from "../model/geometry";

function sampleAtPhysicalDistance(
  result: CanonicalLinerIntermediateResult,
  physicalDistance: number,
): { x: number; y: number } | null {
  const exact = result.horizontal.sampledPoints.find(
    (entry) => Math.abs(entry.physicalDistance - physicalDistance) <= 1e-6,
  );
  if (exact) {
    return exact;
  }
  const sorted = [...result.horizontal.sampledPoints].sort(
    (left, right) => left.physicalDistance - right.physicalDistance,
  );
  if (sorted.length === 0) {
    return null;
  }
  const nextIndex = sorted.findIndex((entry) => entry.physicalDistance >= physicalDistance);
  if (nextIndex <= 0) {
    return sorted[0] ?? null;
  }
  if (nextIndex < 0) {
    return sorted.at(-1) ?? null;
  }
  const previous = sorted[nextIndex - 1]!;
  const next = sorted[nextIndex]!;
  const span = next.physicalDistance - previous.physicalDistance;
  if (span <= 0) {
    return previous;
  }
  const ratio = (physicalDistance - previous.physicalDistance) / span;
  return {
    x: previous.x + (next.x - previous.x) * ratio,
    y: previous.y + (next.y - previous.y) * ratio,
  };
}

export function appendAlignmentSegmentDimensions(
  layer: DrawingLayer,
  result: CanonicalLinerIntermediateResult,
  toLocal?: (point: Point2) => Point2,
): void {
  const localize = (point: Point2): Point2 => (toLocal ? toLocal(point) : point);
  for (const segment of result.horizontal.segments) {
    if (segment.type !== "straight") {
      continue;
    }
    const lengthM = segment.endPhysicalDistance - segment.startPhysicalDistance;
    if (!(lengthM > 0)) {
      continue;
    }
    const start = sampleAtPhysicalDistance(result, segment.startPhysicalDistance);
    const end = sampleAtPhysicalDistance(result, segment.endPhysicalDistance);
    if (!start || !end) {
      continue;
    }
    layer.primitives.push({
      kind: "dimension",
      id: `plan-segment-dimension-${segment.id}`,
      start: localize(createPoint2(start.x, start.y)),
      end: localize(createPoint2(end.x, end.y)),
      offset: -2.5,
      text: lengthM.toFixed(2),
    });
  }
}

export function appendPlanLineSpacingDimensions(
  layer: DrawingLayer,
  result: CanonicalLinerIntermediateResult,
  toLocal?: (point: Point2) => Point2,
): void {
  const localize = (point: Point2): Point2 => (toLocal ? toLocal(point) : point);
  const pointById = new Map(result.grid.points.map((point) => [point.id, point]));
  const transverseLines = result.grid.lines
    .filter((line) => line.direction === "transverse")
    .sort((left, right) => {
      const leftDistance = firstPhysicalDistance(left.pointIds, pointById);
      const rightDistance = firstPhysicalDistance(right.pointIds, pointById);
      return leftDistance - rightDistance || left.id.localeCompare(right.id);
    });

  for (const line of transverseLines) {
    const points = line.pointIds
      .map((pointId) => pointById.get(pointId))
      .filter((point): point is GridPointResult => Boolean(point))
      .sort((left, right) => left.offset - right.offset || left.id.localeCompare(right.id));

    for (let index = 0; index < points.length - 1; index += 1) {
      const startPoint = points[index]!;
      const endPoint = points[index + 1]!;
      const widthM = Math.abs(endPoint.offset - startPoint.offset);
      if (!(widthM > 0)) {
        continue;
      }
      layer.primitives.push({
        kind: "dimension",
        id: `plan-line-spacing-dimension-${line.id}-${startPoint.id}-${endPoint.id}`,
        start: localize(createPoint2(startPoint.x, startPoint.y)),
        end: localize(createPoint2(endPoint.x, endPoint.y)),
        offset: 2.5,
        text: widthM.toFixed(2),
      });
    }
  }
}

function firstPhysicalDistance(
  pointIds: readonly string[],
  pointById: ReadonlyMap<string, GridPointResult>,
): number {
  for (const pointId of pointIds) {
    const point = pointById.get(pointId);
    if (point) {
      return point.physicalDistance;
    }
  }
  return Number.POSITIVE_INFINITY;
}
