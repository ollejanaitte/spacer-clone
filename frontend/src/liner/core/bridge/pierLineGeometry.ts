import type { Vec2 } from "../types";
import { DEFAULT_TOLERANCES } from "../tolerances";
import { localFrameFromAzimuth, normalize2 } from "../vector";

/** Pier line parallel to alignment tangent (road centerline direction). */
export const SKEW_PARALLEL_TO_ALIGNMENT_RAD = Math.PI / 2;

/** Pier line perpendicular to alignment tangent (along alignment normal). */
export const SKEW_PERPENDICULAR_TO_ALIGNMENT_RAD = 0;

export function normalizeSkewAngleRad(angleRad: number): number {
  const fullTurn = Math.PI * 2;
  const normalized = ((angleRad + Math.PI) % fullTurn + fullTurn) % fullTurn;
  return normalized - Math.PI;
}

/**
 * Unit direction of the pier line in plan.
 * skewAngleRad is measured from the alignment left normal toward the tangent.
 */
export function pierLineDirectionFromSkew(azimuth: number, skewAngleRad: number): Vec2 {
  const frame = localFrameFromAzimuth(azimuth);
  const cosine = Math.cos(skewAngleRad);
  const sine = Math.sin(skewAngleRad);
  return normalize2({
    x: cosine * frame.normal.x + sine * frame.tangent.x,
    y: cosine * frame.normal.y + sine * frame.tangent.y,
  });
}

/** Plan position on the pier line at `alongPierOffset` from the alignment point. */
export function pierLinePointAtOffset(
  alignmentPoint: Vec2,
  azimuth: number,
  skewAngleRad: number,
  alongPierOffset: number,
): Vec2 {
  const direction = pierLineDirectionFromSkew(azimuth, skewAngleRad);
  return {
    x: alignmentPoint.x + direction.x * alongPierOffset,
    y: alignmentPoint.y + direction.y * alongPierOffset,
  };
}

export function distancePointToPierLine(
  point: Vec2,
  alignmentPoint: Vec2,
  azimuth: number,
  skewAngleRad: number,
): number {
  const direction = pierLineDirectionFromSkew(azimuth, skewAngleRad);
  const deltaX = point.x - alignmentPoint.x;
  const deltaY = point.y - alignmentPoint.y;
  const cross = Math.abs(deltaX * direction.y - deltaY * direction.x);
  return cross;
}

export function isPointOnPierLine(
  point: Vec2,
  alignmentPoint: Vec2,
  azimuth: number,
  skewAngleRad: number,
  tolerance = DEFAULT_TOLERANCES.coordinate,
): boolean {
  return (
    distancePointToPierLine(point, alignmentPoint, azimuth, skewAngleRad) <= tolerance
  );
}
