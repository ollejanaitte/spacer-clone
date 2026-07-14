import type { Point2 } from "../../drawing/model/geometry";
import type { AffineTransform2 } from "../../drawing/transforms/affineTransform2";
import { transformPoint2 } from "../../drawing/transforms/affineTransform2";

export function determinantAffineTransform2(transform: AffineTransform2): number {
  return transform.a * transform.d - transform.b * transform.c;
}

export function invertAffineTransform2(transform: AffineTransform2): AffineTransform2 | null {
  const det = determinantAffineTransform2(transform);
  if (!Number.isFinite(det) || Math.abs(det) < 1e-12) {
    return null;
  }

  const invDet = 1 / det;
  const a = transform.d * invDet;
  const b = -transform.b * invDet;
  const c = -transform.c * invDet;
  const d = transform.a * invDet;
  const e = -(a * transform.e + c * transform.f);
  const f = -(b * transform.e + d * transform.f);

  if (![a, b, c, d, e, f].every(Number.isFinite)) {
    return null;
  }

  return { a, b, c, d, e, f };
}

export function isIdentityAffineTransform2(transform: AffineTransform2, epsilon = 1e-9): boolean {
  return (
    Math.abs(transform.a - 1) <= epsilon
    && Math.abs(transform.b) <= epsilon
    && Math.abs(transform.c) <= epsilon
    && Math.abs(transform.d - 1) <= epsilon
    && Math.abs(transform.e) <= epsilon
    && Math.abs(transform.f) <= epsilon
  );
}

export function transformPointToModel(
  point: Point2,
  transform: AffineTransform2,
  coordinateSpace: "model" | "paper" | undefined,
): Point2 {
  if (coordinateSpace !== "paper") {
    return { x: point.x, y: point.y };
  }

  if (isIdentityAffineTransform2(transform)) {
    // Band / sheet paper layers: keep paper mm as millimeters converted to meters
    // so they remain finite and ordered without colliding with model meters.
    // Placement relative to geometry is handled by callers that supply a placement transform.
    return { x: point.x / 1000, y: point.y / 1000 };
  }

  const inverse = invertAffineTransform2(transform);
  if (!inverse) {
    return { x: point.x / 1000, y: point.y / 1000 };
  }
  return transformPoint2(inverse, point);
}
