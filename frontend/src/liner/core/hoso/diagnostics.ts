import type { ComputationDiagnostic, DiagnosticLevel } from "../types";

export const LINER_HOSO_DIAGNOSTIC_CODES = {
  unsupportedType: "LINER_HOSO_UNSUPPORTED_TYPE",
  invalidReference: "LINER_HOSO_INVALID_REFERENCE",
  profileUnavailable: "LINER_HOSO_PROFILE_UNAVAILABLE",
  crossfallUnavailable: "LINER_HOSO_CROSSFALL_UNAVAILABLE",
  stationOutOfRange: "LINER_HOSO_STATION_OUT_OF_RANGE",
  offsetOutOfRange: "LINER_HOSO_OFFSET_OUT_OF_RANGE",
  lineOutOfRange: "LINER_HOSO_LINE_OUT_OF_RANGE",
  intersectingLines: "LINER_HOSO_INTERSECTING_LINES",
  degenerateGeometry: "LINER_HOSO_DEGENERATE_GEOMETRY",
  collinearAnchors: "LINER_HOSO_COLLINEAR_ANCHORS",
  negativeThickness: "LINER_HOSO_NEGATIVE_THICKNESS",
  minThickness: "LINER_HOSO_MIN_THICKNESS",
  autoNotConverged: "LINER_HOSO_AUTO_NOT_CONVERGED",
  overlappingBand: "LINER_HOSO_OVERLAPPING_BAND",
  definitionSchemaInvalid: "LINER_HOSO_DEFINITION_SCHEMA_INVALID",
  extractionRequired: "LINER_HOSO_EXTRACTION_REQUIRED",
} as const;

export type HosoDiagnosticCode =
  (typeof LINER_HOSO_DIAGNOSTIC_CODES)[keyof typeof LINER_HOSO_DIAGNOSTIC_CODES];

export const LINER_HOSO_MESSAGE_KEYS: Record<HosoDiagnosticCode, string> = {
  LINER_HOSO_UNSUPPORTED_TYPE: "liner.hoso.diagnostics.unsupportedType",
  LINER_HOSO_INVALID_REFERENCE: "liner.hoso.diagnostics.invalidReference",
  LINER_HOSO_PROFILE_UNAVAILABLE: "liner.hoso.diagnostics.profileUnavailable",
  LINER_HOSO_CROSSFALL_UNAVAILABLE: "liner.hoso.diagnostics.crossfallUnavailable",
  LINER_HOSO_STATION_OUT_OF_RANGE: "liner.hoso.diagnostics.stationOutOfRange",
  LINER_HOSO_OFFSET_OUT_OF_RANGE: "liner.hoso.diagnostics.offsetOutOfRange",
  LINER_HOSO_LINE_OUT_OF_RANGE: "liner.hoso.diagnostics.lineOutOfRange",
  LINER_HOSO_INTERSECTING_LINES: "liner.hoso.diagnostics.intersectingLines",
  LINER_HOSO_DEGENERATE_GEOMETRY: "liner.hoso.diagnostics.degenerateGeometry",
  LINER_HOSO_COLLINEAR_ANCHORS: "liner.hoso.diagnostics.collinearAnchors",
  LINER_HOSO_NEGATIVE_THICKNESS: "liner.hoso.diagnostics.negativeThickness",
  LINER_HOSO_MIN_THICKNESS: "liner.hoso.diagnostics.minThickness",
  LINER_HOSO_AUTO_NOT_CONVERGED: "liner.hoso.diagnostics.autoNotConverged",
  LINER_HOSO_OVERLAPPING_BAND: "liner.hoso.diagnostics.overlappingBand",
  LINER_HOSO_DEFINITION_SCHEMA_INVALID: "liner.hoso.diagnostics.definitionSchemaInvalid",
  LINER_HOSO_EXTRACTION_REQUIRED: "liner.hoso.diagnostics.extractionRequired",
};

export function createHosoDiagnostic(
  level: DiagnosticLevel,
  code: HosoDiagnosticCode,
  extra: Omit<ComputationDiagnostic, "level" | "code" | "messageKey"> = {},
): ComputationDiagnostic {
  return {
    level,
    code,
    messageKey: LINER_HOSO_MESSAGE_KEYS[code],
    ...extra,
  };
}

export function isHosoDiagnostic(diagnostic: ComputationDiagnostic): boolean {
  return diagnostic.code.startsWith("LINER_HOSO_");
}

export function hasHosoErrors(diagnostics: readonly ComputationDiagnostic[]): boolean {
  return diagnostics.some(
    (diagnostic) => diagnostic.level === "error" && isHosoDiagnostic(diagnostic),
  );
}
