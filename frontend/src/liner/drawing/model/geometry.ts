export type Point2 = {
  x: number;
  y: number;
};

export type Bounds2 = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  isEmpty: boolean;
};

export function createPoint2(x: number, y: number): Point2 {
  return { x, y };
}

export function isFinitePoint2(point: Point2): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}

export function createEmptyBounds2(): Bounds2 {
  return {
    minX: 0,
    minY: 0,
    maxX: 0,
    maxY: 0,
    isEmpty: true,
  };
}

export function isEmptyBounds2(bounds: Bounds2): boolean {
  return bounds.isEmpty;
}

export function isFiniteBounds2(bounds: Bounds2): boolean {
  return (
    Number.isFinite(bounds.minX)
    && Number.isFinite(bounds.minY)
    && Number.isFinite(bounds.maxX)
    && Number.isFinite(bounds.maxY)
  );
}

export function isValidBounds2(bounds: Bounds2): boolean {
  if (bounds.isEmpty) {
    return isFiniteBounds2(bounds);
  }

  return (
    isFiniteBounds2(bounds)
    && bounds.minX <= bounds.maxX
    && bounds.minY <= bounds.maxY
  );
}

export function boundsFromPoints2(points: readonly Point2[]): Bounds2 {
  const finitePoints = points.filter(isFinitePoint2);
  if (finitePoints.length === 0) {
    return createEmptyBounds2();
  }

  let minX = finitePoints[0]!.x;
  let minY = finitePoints[0]!.y;
  let maxX = finitePoints[0]!.x;
  let maxY = finitePoints[0]!.y;

  for (const point of finitePoints.slice(1)) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    isEmpty: false,
  };
}

export function unionBounds2(left: Bounds2, right: Bounds2): Bounds2 {
  if (left.isEmpty) {
    return { ...right };
  }
  if (right.isEmpty) {
    return { ...left };
  }

  return {
    minX: Math.min(left.minX, right.minX),
    minY: Math.min(left.minY, right.minY),
    maxX: Math.max(left.maxX, right.maxX),
    maxY: Math.max(left.maxY, right.maxY),
    isEmpty: false,
  };
}
