/**
 * Pure-geometry girder section properties derived from the resolved bridge
 * structure input. No design authority is claimed: these values are computed
 * from user-entered dimensions only and always carry NOT_AUTHORIZED semantics.
 */

export type ResolvedBridgeStructureInput = {
  readonly spanLength: number;
  readonly bridgeLength: number;
  readonly width: number;
  readonly girderCount: number;
  readonly girderSpacing: number;
  readonly girderDepth: number;
  readonly topFlangeWidth: number;
  readonly topFlangeThickness: number;
  readonly bottomFlangeWidth: number;
  readonly bottomFlangeThickness: number;
  readonly webThickness: number;
  readonly deckThickness: number;
  readonly crossBeamSpacing: number;
};

export type GirderSectionProperties = {
  readonly webHeight: number;
  readonly topFlangeArea: number;
  readonly bottomFlangeArea: number;
  readonly webArea: number;
  readonly totalArea: number;
  /** Distance from the bottom fiber to the neutral axis (m). */
  readonly centroidFromBottom: number;
  /** Strong-axis second moment of area about the neutral axis (m^4). */
  readonly secondMomentOfArea: number;
  readonly sectionModulusTop: number;
  readonly sectionModulusBottom: number;
  /** Steel volume of one girder line (m^3). */
  readonly steelVolumePerGirder: number;
};

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

/**
 * Compute I-beam section properties about the strong axis (bending about the
 * transverse horizontal axis, longitudinal axis = x). The section is composed
 * of two rectangular flanges and a rectangular web (geometrically sharp edges).
 */
export function computeGirderSectionProperties(
  input: ResolvedBridgeStructureInput,
): GirderSectionProperties | null {
  const { girderDepth, topFlangeWidth, topFlangeThickness, bottomFlangeWidth, bottomFlangeThickness, webThickness } = input;
  const webHeight = girderDepth - topFlangeThickness - bottomFlangeThickness;
  if (webHeight <= 0) {
    return null;
  }
  if (
    !isPositiveFinite(girderDepth) ||
    !isPositiveFinite(topFlangeWidth) ||
    !isPositiveFinite(topFlangeThickness) ||
    !isPositiveFinite(bottomFlangeWidth) ||
    !isPositiveFinite(bottomFlangeThickness) ||
    !isPositiveFinite(webThickness)
  ) {
    return null;
  }

  const topFlangeArea = topFlangeWidth * topFlangeThickness;
  const bottomFlangeArea = bottomFlangeWidth * bottomFlangeThickness;
  const webArea = webThickness * webHeight;
  const totalArea = topFlangeArea + bottomFlangeArea + webArea;

  const topFlangeCentroid = girderDepth - topFlangeThickness / 2;
  const bottomFlangeCentroid = bottomFlangeThickness / 2;
  const webCentroid = bottomFlangeThickness + webHeight / 2;

  const centroidFromBottom =
    (topFlangeArea * topFlangeCentroid +
      bottomFlangeArea * bottomFlangeCentroid +
      webArea * webCentroid) /
    totalArea;

  const topFlangeIx =
    (topFlangeWidth * topFlangeThickness ** 3) / 12 +
    topFlangeArea * (topFlangeCentroid - centroidFromBottom) ** 2;
  const bottomFlangeIx =
    (bottomFlangeWidth * bottomFlangeThickness ** 3) / 12 +
    bottomFlangeArea * (bottomFlangeCentroid - centroidFromBottom) ** 2;
  const webIx =
    (webThickness * webHeight ** 3) / 12 +
    webArea * (webCentroid - centroidFromBottom) ** 2;

  const secondMomentOfArea = topFlangeIx + bottomFlangeIx + webIx;

  const sectionModulusBottom = secondMomentOfArea / centroidFromBottom;
  const sectionModulusTop = secondMomentOfArea / (girderDepth - centroidFromBottom);

  return {
    webHeight,
    topFlangeArea,
    bottomFlangeArea,
    webArea,
    totalArea,
    centroidFromBottom,
    secondMomentOfArea,
    sectionModulusTop,
    sectionModulusBottom,
    steelVolumePerGirder: totalArea * input.bridgeLength,
  };
}
