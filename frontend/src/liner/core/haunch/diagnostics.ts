import type { ComputationDiagnostic, DiagnosticLevel } from "../types";

export const LINER_HAUNCH_DIAGNOSTIC_CODES = {
  unsupportedType: "LINER_HAUNCH_UNSUPPORTED_TYPE",
  invalidReference: "LINER_HAUNCH_INVALID_REFERENCE",
  profileUnavailable: "LINER_HAUNCH_PROFILE_UNAVAILABLE",
  stationOutOfRange: "LINER_HAUNCH_STATION_OUT_OF_RANGE",
  rangeInvalid: "LINER_HAUNCH_RANGE_INVALID",
  overlappingRange: "LINER_HAUNCH_OVERLAPPING_RANGE",
  degenerateGeometry: "LINER_HAUNCH_DEGENERATE_GEOMETRY",
  negativeThickness: "LINER_HAUNCH_NEGATIVE_THICKNESS",
  referenceGirderRequired: "LINER_HAUNCH_REFERENCE_GIRDER_REQUIRED",
  linerHeightRequired: "LINER_HAUNCH_LINER_HEIGHT_REQUIRED",
  collinearAnchors: "LINER_HAUNCH_COLLINEAR_ANCHORS",
  definitionSchemaInvalid: "LINER_HAUNCH_DEFINITION_SCHEMA_INVALID",
} as const;

export type HaunchDiagnosticCode =
  (typeof LINER_HAUNCH_DIAGNOSTIC_CODES)[keyof typeof LINER_HAUNCH_DIAGNOSTIC_CODES];

export const LINER_HAUNCH_MESSAGE_KEYS: Record<HaunchDiagnosticCode, string> = {
  LINER_HAUNCH_UNSUPPORTED_TYPE: "liner.haunch.diagnostics.unsupportedType",
  LINER_HAUNCH_INVALID_REFERENCE: "liner.haunch.diagnostics.invalidReference",
  LINER_HAUNCH_PROFILE_UNAVAILABLE: "liner.haunch.diagnostics.profileUnavailable",
  LINER_HAUNCH_STATION_OUT_OF_RANGE: "liner.haunch.diagnostics.stationOutOfRange",
  LINER_HAUNCH_RANGE_INVALID: "liner.haunch.diagnostics.rangeInvalid",
  LINER_HAUNCH_OVERLAPPING_RANGE: "liner.haunch.diagnostics.overlappingRange",
  LINER_HAUNCH_DEGENERATE_GEOMETRY: "liner.haunch.diagnostics.degenerateGeometry",
  LINER_HAUNCH_NEGATIVE_THICKNESS: "liner.haunch.diagnostics.negativeThickness",
  LINER_HAUNCH_REFERENCE_GIRDER_REQUIRED: "liner.haunch.diagnostics.referenceGirderRequired",
  LINER_HAUNCH_LINER_HEIGHT_REQUIRED: "liner.haunch.diagnostics.linerHeightRequired",
  LINER_HAUNCH_COLLINEAR_ANCHORS: "liner.haunch.diagnostics.collinearAnchors",
  LINER_HAUNCH_DEFINITION_SCHEMA_INVALID: "liner.haunch.diagnostics.definitionSchemaInvalid",
};

export function createHaunchDiagnostic(
  level: DiagnosticLevel,
  code: HaunchDiagnosticCode,
  extra: Omit<ComputationDiagnostic, "level" | "code" | "messageKey"> = {},
): ComputationDiagnostic {
  return {
    level,
    code,
    messageKey: LINER_HAUNCH_MESSAGE_KEYS[code],
    ...extra,
  };
}

export function isHaunchDiagnostic(diagnostic: ComputationDiagnostic): boolean {
  return diagnostic.code.startsWith("LINER_HAUNCH_");
}

export function hasHaunchErrors(diagnostics: readonly ComputationDiagnostic[]): boolean {
  return diagnostics.some(
    (diagnostic) => diagnostic.level === "error" && isHaunchDiagnostic(diagnostic),
  );
}
