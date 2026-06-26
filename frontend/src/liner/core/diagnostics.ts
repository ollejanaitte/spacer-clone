import type {
  DiagnosticLevel,
  LinerDiagnosticCode,
  ValidationIssue,
} from "./types";

export const LINER_DIAGNOSTIC_CODES = {
  zeroLengthSegment: "LINER_GEOM_ZERO_LENGTH_SEGMENT",
  positionDiscontinuity: "LINER_GEOM_POSITION_DISCONTINUITY",
  azimuthDiscontinuity: "LINER_GEOM_AZIMUTH_DISCONTINUITY",
  clothoidInvalidRadius: "LINER_GEOM_CLOTHOID_INVALID_RADIUS",
  clothoidLongSpiral: "LINER_GEOM_CLOTHOID_LONG_SPIRAL",
  inverseProjectionFailed: "LINER_GEOM_INVERSE_PROJECTION_FAILED",
  duplicateStationEquation: "LINER_STATION_DUPLICATE_EQUATION",
  stationOutOfRange: "LINER_STATION_OUT_OF_RANGE",
  gridSpacingInvalid: "LINER_GRID_SPACING_INVALID",
  missingFrameNode: "LINER_FRAME_MISSING_NODE",
  missingFrameSection: "LINER_FRAME_MISSING_SECTION",
  zeroLengthMember: "LINER_FRAME_ZERO_LENGTH_MEMBER",
  disconnectedFrame: "LINER_FRAME_DISCONNECTED",
  duplicateFrameId: "LINER_FRAME_DUPLICATE_ID",
  invalidFrameSchema: "LINER_FRAME_SCHEMA_INVALID",
} as const satisfies Record<string, LinerDiagnosticCode>;

export function createIssue(
  level: DiagnosticLevel,
  code: LinerDiagnosticCode,
  extra: Omit<ValidationIssue, "level" | "code"> = {},
): ValidationIssue {
  return {
    level,
    code,
    ...extra,
  };
}

export function hasFatalIssues(issues: ValidationIssue[]): boolean {
  return issues.some((issue) => issue.level === "error");
}
