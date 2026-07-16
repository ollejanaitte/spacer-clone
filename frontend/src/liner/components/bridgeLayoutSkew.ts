import {
  SKEW_PARALLEL_TO_ALIGNMENT_RAD,
  SKEW_PERPENDICULAR_TO_ALIGNMENT_RAD,
  normalizeSkewAngleRad,
} from "../core/bridge/pierLineGeometry";

export type PierSkewMode = "parallel" | "perpendicular" | "arbitrary";

const SKEW_MODE_TOLERANCE_RAD = 1e-6;

export function pierSkewModeFromRad(skewAngleRad: number | undefined): PierSkewMode {
  const normalized = normalizeSkewAngleRad(skewAngleRad ?? 0);
  if (Math.abs(normalized - SKEW_PERPENDICULAR_TO_ALIGNMENT_RAD) <= SKEW_MODE_TOLERANCE_RAD) {
    return "perpendicular";
  }
  if (Math.abs(normalized - SKEW_PARALLEL_TO_ALIGNMENT_RAD) <= SKEW_MODE_TOLERANCE_RAD) {
    return "parallel";
  }
  return "arbitrary";
}

export function pierSkewAngleRadFromMode(
  mode: PierSkewMode,
  arbitraryDegrees = 0,
): number | undefined {
  if (mode === "perpendicular") {
    return SKEW_PERPENDICULAR_TO_ALIGNMENT_RAD;
  }
  if (mode === "parallel") {
    return SKEW_PARALLEL_TO_ALIGNMENT_RAD;
  }
  return (arbitraryDegrees * Math.PI) / 180;
}

export function pierSkewDegreesFromRad(skewAngleRad: number | undefined): number {
  return (normalizeSkewAngleRad(skewAngleRad ?? 0) * 180) / Math.PI;
}

export function primaryBearingOffset(pier: { bearingOffsets?: readonly { offset: number }[] }): number | undefined {
  return pier.bearingOffsets?.[0]?.offset;
}
