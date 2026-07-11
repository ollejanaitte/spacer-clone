import type { SemanticTolerance, ToleranceBand, Vector3 } from "./types";

export const DEFAULT_SEMANTIC_TOLERANCE: SemanticTolerance = {
  coordinate: { absolute: 1e-6 },
  length: { absolute: 1e-4, relative: 1e-6, floor: 1 },
  scalar: { absolute: 1e-9, relative: 1e-6, floor: 1e-9 },
  angle: { absolute: 1e-6 },
};

function isUsableTolerance(value: number | undefined): value is number {
  return value !== undefined && Number.isFinite(value) && value >= 0;
}

export function mergeSemanticTolerance(
  override: Partial<SemanticTolerance> | undefined,
): SemanticTolerance {
  return {
    coordinate: { ...DEFAULT_SEMANTIC_TOLERANCE.coordinate, ...override?.coordinate },
    length: { ...DEFAULT_SEMANTIC_TOLERANCE.length, ...override?.length },
    scalar: { ...DEFAULT_SEMANTIC_TOLERANCE.scalar, ...override?.scalar },
    angle: { ...DEFAULT_SEMANTIC_TOLERANCE.angle, ...override?.angle },
  };
}

export function compareScalarWithTolerance(
  left: number,
  right: number,
  tolerance: ToleranceBand,
): { equal: boolean; delta: number; relativeDelta?: number } {
  if (!Number.isFinite(left) || !Number.isFinite(right)) {
    return { equal: false, delta: Number.NaN };
  }

  const delta = Math.abs(left - right);
  const absolutePass = isUsableTolerance(tolerance.absolute) && delta <= tolerance.absolute;

  let relativeDelta: number | undefined;
  let relativePass = false;
  if (isUsableTolerance(tolerance.relative)) {
    const floor = isUsableTolerance(tolerance.floor) ? tolerance.floor : 0;
    const denominator = Math.max(Math.abs(left), floor);
    relativeDelta = denominator === 0 ? (delta === 0 ? 0 : Number.POSITIVE_INFINITY) : delta / denominator;
    relativePass = relativeDelta <= tolerance.relative;
  }

  return { equal: absolutePass || relativePass, delta, relativeDelta };
}

export function nearlyEqual(left: number, right: number, tolerance: ToleranceBand): boolean {
  return compareScalarWithTolerance(left, right, tolerance).equal;
}

export function nearlyZero(value: number, tolerance: ToleranceBand): boolean {
  return compareScalarWithTolerance(value, 0, tolerance).equal;
}

export function distance(left: Vector3, right: Vector3): number {
  const dx = left.x - right.x;
  const dy = left.y - right.y;
  const dz = left.z - right.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function distanceWithinTolerance(
  left: Vector3,
  right: Vector3,
  tolerance: ToleranceBand,
): { equal: boolean; delta: number; relativeDelta?: number } {
  return compareScalarWithTolerance(distance(left, right), 0, tolerance);
}

export function angleWithinTolerance(leftRad: number, rightRad: number, tolerance: ToleranceBand): boolean {
  return compareScalarWithTolerance(leftRad, rightRad, tolerance).equal;
}
