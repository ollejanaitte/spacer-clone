/**
 * Shared station generators for 3D / quantity / drawings parity.
 * UNVERIFIED DEVELOPMENT ONLY — NOT FOR DESIGN OR CONSTRUCTION
 */

export type SpacingStationsResult = {
  readonly count: number;
  readonly stations: readonly number[];
  readonly ok: boolean;
  readonly reason?: string;
};

/**
 * Inclusive spacing stations: 0, spacing, 2*spacing, ... while <= length.
 * Matches existing generateBsdd / QuantityModel: floor(L/spacing)+1.
 */
export function generateSpacingStations(
  length: number,
  spacing: number | null | undefined,
): SpacingStationsResult {
  if (spacing === null || spacing === undefined) {
    return { count: 0, stations: [], ok: false, reason: "spacing NOT_PROVIDED" };
  }
  if (!(length > 0) || !(spacing > 0) || !Number.isFinite(length) || !Number.isFinite(spacing)) {
    return { count: 0, stations: [], ok: false, reason: "non-positive length or spacing" };
  }
  const count = Math.floor(length / spacing) + 1;
  const stations = Array.from({ length: count }, (_, index) => Math.min(index * spacing, length));
  return { count, stations, ok: true };
}

/**
 * Sway bracing stations: cross-beam indices 1..count-2 where index % interval === 0.
 * Station = index * crossBeamSpacing. Matches generateBsdd / QuantityModel.
 */
export function generateSwayBracingStations(
  crossBeamStations: readonly number[],
  swayBracingInterval: number | null | undefined,
): SpacingStationsResult {
  if (swayBracingInterval === null || swayBracingInterval === undefined) {
    return { count: 0, stations: [], ok: false, reason: "swayBracingInterval NOT_PROVIDED" };
  }
  if (!(swayBracingInterval > 0) || !Number.isInteger(swayBracingInterval)) {
    return { count: 0, stations: [], ok: false, reason: "invalid swayBracingInterval" };
  }
  const stations: number[] = [];
  for (let index = 1; index <= crossBeamStations.length - 2; index += 1) {
    if (index % swayBracingInterval === 0) {
      stations.push(crossBeamStations[index]!);
    }
  }
  return { count: stations.length, stations, ok: true };
}

/** Simple single-span supports: station 0 and L. */
export function generateSimpleSupportStations(bridgeLength: number): SpacingStationsResult {
  if (!(bridgeLength > 0) || !Number.isFinite(bridgeLength)) {
    return { count: 0, stations: [], ok: false, reason: "invalid bridgeLength" };
  }
  return { count: 2, stations: [0, bridgeLength], ok: true };
}

export function girderCenterOffsetsY(girderCount: number, girderSpacing: number): readonly number[] {
  if (girderCount < 1 || !(girderSpacing >= 0)) return [];
  const first = -((girderCount - 1) * girderSpacing) / 2;
  return Array.from({ length: girderCount }, (_, i) => first + i * girderSpacing);
}

export function computeDeckOverhang(
  width: number,
  girderCount: number,
  girderSpacing: number,
): { readonly overhang: number; readonly ok: boolean; readonly reason?: string } {
  const overhang = (width - (girderCount - 1) * girderSpacing) / 2;
  if (overhang < 0) return { overhang, ok: false, reason: "negative overhang — fail-closed" };
  return { overhang, ok: true };
}
