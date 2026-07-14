import type { Bounds2, Point2 } from "../model/geometry";

export type AffineTransform2 = {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
};

export function identityAffineTransform2(): AffineTransform2 {
  return {
    a: 1,
    b: 0,
    c: 0,
    d: 1,
    e: 0,
    f: 0,
  };
}

export function translateAffineTransform2(tx: number, ty: number): AffineTransform2 {
  return {
    a: 1,
    b: 0,
    c: 0,
    d: 1,
    e: tx,
    f: ty,
  };
}

export function scaleAffineTransform2(sx: number, sy: number = sx): AffineTransform2 {
  return {
    a: sx,
    b: 0,
    c: 0,
    d: sy,
    e: 0,
    f: 0,
  };
}

export function rotateAffineTransform2(
  radians: number,
  center: Point2 = { x: 0, y: 0 },
): AffineTransform2 {
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const base = {
    a: cos,
    b: sin,
    c: -sin,
    d: cos,
    e: 0,
    f: 0,
  };
  return composeAffineTransform2(
    translateAffineTransform2(-center.x, -center.y),
    base,
    translateAffineTransform2(center.x, center.y),
  );
}

export function multiplyAffineTransform2(left: AffineTransform2, right: AffineTransform2): AffineTransform2 {
  return {
    a: right.a * left.a + right.c * left.b,
    b: right.b * left.a + right.d * left.b,
    c: right.a * left.c + right.c * left.d,
    d: right.b * left.c + right.d * left.d,
    e: right.a * left.e + right.c * left.f + right.e,
    f: right.b * left.e + right.d * left.f + right.f,
  };
}

export function composeAffineTransform2(...transforms: readonly AffineTransform2[]): AffineTransform2 {
  return transforms.reduce(multiplyAffineTransform2, identityAffineTransform2());
}

export function transformPoint2(transform: AffineTransform2, point: Point2): Point2 {
  return {
    x: transform.a * point.x + transform.c * point.y + transform.e,
    y: transform.b * point.x + transform.d * point.y + transform.f,
  };
}

export function transformBounds2(transform: AffineTransform2, bounds: Bounds2): Bounds2 {
  if (bounds.isEmpty) {
    return { ...bounds };
  }

  const corners = [
    { x: bounds.minX, y: bounds.minY },
    { x: bounds.minX, y: bounds.maxY },
    { x: bounds.maxX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.maxY },
  ].map((point) => transformPoint2(transform, point));

  const xs = corners.map((point) => point.x);
  const ys = corners.map((point) => point.y);

  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
    isEmpty: false,
  };
}

export function isValidAffineTransform2(transform: AffineTransform2): boolean {
  return (
    Number.isFinite(transform.a)
    && Number.isFinite(transform.b)
    && Number.isFinite(transform.c)
    && Number.isFinite(transform.d)
    && Number.isFinite(transform.e)
    && Number.isFinite(transform.f)
  );
}
