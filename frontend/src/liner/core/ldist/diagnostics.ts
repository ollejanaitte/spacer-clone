import type { ComputationDiagnostic, DiagnosticLevel } from "../types";

export const LINER_LDIST_DIAGNOSTIC_CODES = {
  alignmentReferenceMissing: "LINER_LDIST_ALIGNMENT_REFERENCE_MISSING",
  lineReferenceMissing: "LINER_LDIST_LINE_REFERENCE_MISSING",
  referenceLineRequired: "LINER_LDIST_REFERENCE_LINE_REQUIRED",
  stationOutOfRange: "LINER_LDIST_STATION_OUT_OF_RANGE",
  degenerateGeometry: "LINER_LDIST_DEGENERATE_GEOMETRY",
  pierReferenceInvalid: "LINER_LDIST_PIER_REFERENCE_INVALID",
  pierIdRequired: "LINER_LDIST_PIER_ID_REQUIRED",
  jobSchemaInvalid: "LINER_LDIST_JOB_SCHEMA_INVALID",
  pairsEmpty: "LINER_LDIST_PAIRS_EMPTY",
} as const;

export type LdistDiagnosticCode =
  (typeof LINER_LDIST_DIAGNOSTIC_CODES)[keyof typeof LINER_LDIST_DIAGNOSTIC_CODES];

export const LINER_LDIST_MESSAGE_KEYS: Record<LdistDiagnosticCode, string> = {
  LINER_LDIST_ALIGNMENT_REFERENCE_MISSING: "liner.ldist.diagnostics.alignmentReferenceMissing",
  LINER_LDIST_LINE_REFERENCE_MISSING: "liner.ldist.diagnostics.lineReferenceMissing",
  LINER_LDIST_REFERENCE_LINE_REQUIRED: "liner.ldist.diagnostics.referenceLineRequired",
  LINER_LDIST_STATION_OUT_OF_RANGE: "liner.ldist.diagnostics.stationOutOfRange",
  LINER_LDIST_DEGENERATE_GEOMETRY: "liner.ldist.diagnostics.degenerateGeometry",
  LINER_LDIST_PIER_REFERENCE_INVALID: "liner.ldist.diagnostics.pierReferenceInvalid",
  LINER_LDIST_PIER_ID_REQUIRED: "liner.ldist.diagnostics.pierIdRequired",
  LINER_LDIST_JOB_SCHEMA_INVALID: "liner.ldist.diagnostics.jobSchemaInvalid",
  LINER_LDIST_PAIRS_EMPTY: "liner.ldist.diagnostics.pairsEmpty",
};

export function createLdistDiagnostic(
  level: DiagnosticLevel,
  code: LdistDiagnosticCode,
  extra: Omit<ComputationDiagnostic, "level" | "code" | "messageKey"> = {},
): ComputationDiagnostic {
  return {
    level,
    code,
    messageKey: LINER_LDIST_MESSAGE_KEYS[code],
    ...extra,
  };
}

export function isLdistDiagnostic(diagnostic: ComputationDiagnostic): boolean {
  return diagnostic.code.startsWith("LINER_LDIST_");
}

export function hasLdistErrors(diagnostics: readonly ComputationDiagnostic[]): boolean {
  return diagnostics.some((diagnostic) => diagnostic.level === "error" && isLdistDiagnostic(diagnostic));
}
