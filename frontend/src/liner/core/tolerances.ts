import type { ToleranceConfig } from "./types";

export const DEFAULT_TOLERANCES: ToleranceConfig = {
  length: 1e-6,
  coordinate: 1e-6,
  clothoidCoordinate: 1e-3,
  azimuth: 1e-9,
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
