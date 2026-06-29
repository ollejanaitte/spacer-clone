export type CrossSectionZComponents = {
  centerlineZ: number;
  offset: number;
  templateElevation: number;
};

function finiteOrZero(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

/**
 * Scalar cross-section Z merge: centerline profile Z plus template elevation.
 * `offset` is reserved for future crossSlope (Phase 3.5-4 localFrame); not applied in PR-3b-1.
 */
export function mergeCrossSectionZ(
  centerlineZ: number,
  offset: number,
  templateElevation: number,
): number {
  void offset;
  return finiteOrZero(centerlineZ) + finiteOrZero(templateElevation);
}
