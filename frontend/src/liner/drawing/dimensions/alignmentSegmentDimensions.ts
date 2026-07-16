import type { CanonicalLinerIntermediateResult } from "../../core/types";
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
