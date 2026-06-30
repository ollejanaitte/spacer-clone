import type { ToleranceConfig } from "./types";

/** C1 azimuth tolerance: 0.001 deg expressed in radians. */
export const AZIMUTH_TOLERANCE_RAD = 0.001 * (Math.PI / 180);

export const DEFAULT_TOLERANCES: ToleranceConfig = {
  length: 1e-6,
  coordinate: 0.001,
  clothoidCoordinate: 1e-3,
  azimuth: AZIMUTH_TOLERANCE_RAD,
  elevation: 1e-6,
  station: 1e-6,
  offset: 1e-4,
};

export function nearlyEqual(
  actual: number,
  expected: number,
  tolerance = DEFAULT_TOLERANCES.coordinate,
): boolean {
  return Math.abs(actual - expected) <= tolerance;
}

export function assertPositiveLength(value: number): boolean {
  return Number.isFinite(value) && value > DEFAULT_TOLERANCES.length;
}
