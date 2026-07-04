export const IMPORTER_TOLERANCE_DISTANCE_M = 0.001;
export const IMPORTER_TOLERANCE_ELEVATION_M = 0.001;
export const IMPORTER_TOLERANCE_GRADE_PERCENT = 0.001;
export const IMPORTER_TOLERANCE_AZIMUTH_DEG = 0.001;
export const IMPORTER_TOLERANCE_SYMMETRY_M = 0.001;

export function withinTolerance(
  left: number,
  right: number,
  tolerance: number,
): boolean {
  return Math.abs(left - right) <= tolerance;
}
