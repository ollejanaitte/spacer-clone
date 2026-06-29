export type CrossSectionZComponents = {
  centerlineZ: number;
  offset: number;
  templateElevation: number;
};

function finiteOrZero(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

/**
 * Cross-slope elevation delta (Pre-Decision #3).
 * `slopePercent` is % grade: positive = downward to the right.
 *
 * Simple test cases:
 * - applyCrossSlope(3, 2)   → -0.06  (offset > 0, slope > 0 → deltaZ negative)
 * - applyCrossSlope(-3, 2)  → +0.06  (offset < 0, slope > 0 → deltaZ positive)
 * - applyCrossSlope(5, 0)   → 0
 * - applyCrossSlope(NaN, 2) → 0      (non-finite offset/slopePercent treated as 0)
 */
export function applyCrossSlope(offset: number, slopePercent: number): number {
  const safeOffset = finiteOrZero(offset);
  const safeSlope = finiteOrZero(slopePercent);
  const result = -(safeSlope / 100) * safeOffset;
  return result === 0 ? 0 : result;
}

/**
 * Scalar cross-section Z merge: centerline profile Z plus template elevation,
 * optionally adjusted by cross-slope when `slopePercent` is provided.
 */
export function mergeCrossSectionZ(
  centerlineZ: number,
  offset: number,
  templateElevation: number,
  slopePercent?: number,
): number {
  const base =
    finiteOrZero(centerlineZ) + finiteOrZero(templateElevation);
  if (slopePercent === undefined) {
    return base;
  }
  return base + applyCrossSlope(offset, slopePercent);
}
