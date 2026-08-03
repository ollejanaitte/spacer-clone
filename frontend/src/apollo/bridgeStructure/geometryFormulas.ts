/** Shared formula IDs and pure geometry helpers for Step 4-C (appurtenance / haunch). */

export const GEOMETRY_FORMULA_IDS = {
  APP_LENGTH: "F-S4C-APP-LENGTH",
  APP_RECT_AREA: "F-S4C-APP-RECT-AREA",
  APP_VOLUME: "F-S4C-APP-VOLUME",
  APP_TOTAL_WEIGHT: "F-S4C-APP-TOTAL-WEIGHT",
  HAUNCH_LENGTH: "F-S4C-HAUNCH-LENGTH",
  HAUNCH_RECT_AREA: "F-S4C-HAUNCH-RECT-AREA",
  HAUNCH_TRAP_AREA: "F-S4C-HAUNCH-TRAP-AREA",
  HAUNCH_VOLUME: "F-S4C-HAUNCH-VOLUME",
  HAUNCH_TOTAL_WEIGHT: "F-S4C-HAUNCH-TOTAL-WEIGHT",
} as const;

export type GeometryFormulaId = (typeof GEOMETRY_FORMULA_IDS)[keyof typeof GEOMETRY_FORMULA_IDS];

export type GeometryScalarResult =
  | { readonly ok: true; readonly value: number; readonly formulaId: GeometryFormulaId }
  | { readonly ok: false; readonly formulaId: GeometryFormulaId; readonly reason: string };

function requirePositiveFinite(value: number, label: string): string | null {
  if (!Number.isFinite(value)) return `${label} must be a finite number.`;
  if (!(value > 0)) return `${label} must be > 0.`;
  return null;
}

/** L = endStation - startStation (m). Requires end > start. */
export function deriveLengthMeters(
  startStation: number,
  endStation: number,
  formulaId: GeometryFormulaId,
): GeometryScalarResult {
  if (!Number.isFinite(startStation) || !Number.isFinite(endStation)) {
    return { ok: false, formulaId, reason: "station values must be finite." };
  }
  if (!(endStation > startStation)) {
    return { ok: false, formulaId, reason: "endStation must be greater than startStation." };
  }
  return { ok: true, value: endStation - startStation, formulaId };
}

/** A = width * height (m²) for rectangular cross-section. */
export function deriveRectAreaMeters2(
  width: number,
  height: number,
  formulaId: GeometryFormulaId = GEOMETRY_FORMULA_IDS.APP_RECT_AREA,
): GeometryScalarResult {
  const widthError = requirePositiveFinite(width, "width");
  if (widthError) return { ok: false, formulaId, reason: widthError };
  const heightError = requirePositiveFinite(height, "height");
  if (heightError) return { ok: false, formulaId, reason: heightError };
  return { ok: true, value: width * height, formulaId };
}

/** A = (topWidth + bottomWidth) / 2 * height (m²) for trapezoid. */
export function deriveTrapezoidAreaMeters2(
  topWidth: number,
  bottomWidth: number,
  height: number,
): GeometryScalarResult {
  const formulaId = GEOMETRY_FORMULA_IDS.HAUNCH_TRAP_AREA;
  const topError = requirePositiveFinite(topWidth, "topWidth");
  if (topError) return { ok: false, formulaId, reason: topError };
  const bottomError = requirePositiveFinite(bottomWidth, "bottomWidth");
  if (bottomError) return { ok: false, formulaId, reason: bottomError };
  const heightError = requirePositiveFinite(height, "height");
  if (heightError) return { ok: false, formulaId, reason: heightError };
  return { ok: true, value: ((topWidth + bottomWidth) / 2) * height, formulaId };
}

/** V = A * L (m³). */
export function deriveVolumeMeters3(
  area: number,
  length: number,
  formulaId: GeometryFormulaId,
): GeometryScalarResult {
  const areaError = requirePositiveFinite(area, "area");
  if (areaError) return { ok: false, formulaId, reason: areaError };
  const lengthError = requirePositiveFinite(length, "length");
  if (lengthError) return { ok: false, formulaId, reason: lengthError };
  return { ok: true, value: area * length, formulaId };
}

/**
 * W = V * gamma (kN). Returns NOT_AVAILABLE semantics via ok:false when gamma missing.
 * Callers must not invent default unit weights.
 */
export function deriveTotalWeightKN(
  volume: number,
  unitWeightKNPerM3: number | null,
  formulaId: GeometryFormulaId,
): GeometryScalarResult {
  if (unitWeightKNPerM3 === null) {
    return { ok: false, formulaId, reason: "unitWeight not provided; weight is NOT_AVAILABLE." };
  }
  const volumeError = requirePositiveFinite(volume, "volume");
  if (volumeError) return { ok: false, formulaId, reason: volumeError };
  if (!Number.isFinite(unitWeightKNPerM3) || unitWeightKNPerM3 < 0) {
    return { ok: false, formulaId, reason: "unitWeight must be finite and >= 0." };
  }
  return { ok: true, value: volume * unitWeightKNPerM3, formulaId };
}

/**
 * Canonical main-girder transverse offsets (m), +Y = right.
 * Matches visualization/BSDD convention: centered about Y=0 with girderSpacing.
 */
export function deriveMainGirderOffsets(
  girderCount: number,
  girderSpacing: number,
): readonly number[] | null {
  if (!Number.isInteger(girderCount) || girderCount < 1) return null;
  if (!Number.isFinite(girderSpacing) || girderSpacing < 0) return null;
  if (girderCount === 1) return [0];
  if (!(girderSpacing > 0)) return null;
  return Array.from({ length: girderCount }, (_, index) => {
    return (index - (girderCount - 1) / 2) * girderSpacing;
  });
}
