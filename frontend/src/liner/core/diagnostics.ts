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
  clothoidAccuracyExceeded: "LINER_GEOM_CLOTHOID_ACCURACY_EXCEEDED",
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
  profileElevationDiscontinuity: "LINER_PROFILE_ELEVATION_DISCONTINUITY",
  profileGradeDiscontinuity: "LINER_PROFILE_GRADE_DISCONTINUITY",
  profileCoverageGap: "LINER_PROFILE_COVERAGE_GAP",
  profileAdjacencyGap: "LINER_PROFILE_ADJACENCY_GAP",
  profileEndCoverageGap: "LINER_PROFILE_END_COVERAGE_GAP",
  spanEndExceedsAlignment: "LINER_SPAN_END_EXCEEDS_ALIGNMENT",
  originStationAmbiguous: "LINER_ORIGIN_STATION_AMBIGUOUS",
  profileParabolicZMergeDeferred: "LINER_PROFILE_PARABOLIC_Z_MERGE_DEFERRED",
  crossfallIntervalOverlap: "LINER_CROSSFALL_INTERVAL_OVERLAP",
  crossfallPivotChangeUnsupported: "LINER_CROSSFALL_PIVOT_CHANGE_UNSUPPORTED",
  crossfallMeasuredGridPrecedence: "LINER_CROSSFALL_MEASURED_GRID_PRECEDENCE",
} as const satisfies Record<string, LinerDiagnosticCode>;

export const LINER_DIAGNOSTIC_MESSAGE_KEYS = {
  LINER_GEOM_ZERO_LENGTH_SEGMENT: "liner.errors.geom_zero_length",
  LINER_GEOM_POSITION_DISCONTINUITY: "liner.errors.geom_position_gap",
  LINER_GEOM_AZIMUTH_DISCONTINUITY: "liner.errors.geom_azimuth_gap",
  LINER_GEOM_CLOTHOID_INVALID_RADIUS: "liner.errors.geom_clothoid_radius",
  LINER_GEOM_CLOTHOID_ACCURACY_EXCEEDED: "liner.errors.geom_clothoid_accuracy",
  LINER_GEOM_CLOTHOID_LONG_SPIRAL: "liner.errors.geom_clothoid_long",
  LINER_GEOM_INVERSE_PROJECTION_FAILED: "liner.errors.geom_inverse_failed",
  LINER_STATION_DUPLICATE_EQUATION: "liner.errors.station_duplicate",
  LINER_STATION_OUT_OF_RANGE: "liner.errors.station_range",
  LINER_GRID_SPACING_INVALID: "liner.errors.grid_spacing",
  LINER_FRAME_MISSING_NODE: "liner.errors.frame_missing_node",
  LINER_FRAME_MISSING_SECTION: "liner.errors.frame_missing_section",
  LINER_FRAME_ZERO_LENGTH_MEMBER: "liner.errors.frame_zero_member",
  LINER_FRAME_DISCONNECTED: "liner.errors.frame_disconnected",
  LINER_FRAME_DUPLICATE_ID: "liner.errors.frame_duplicate_id",
  LINER_FRAME_SCHEMA_INVALID: "liner.errors.frame_schema",
  LINER_PROFILE_ELEVATION_DISCONTINUITY: "liner.errors.profile_elevation_gap",
  LINER_PROFILE_GRADE_DISCONTINUITY: "liner.errors.profile_grade_gap",
  LINER_PROFILE_COVERAGE_GAP: "liner.errors.profile_coverage_gap",
  LINER_PROFILE_ADJACENCY_GAP: "liner.errors.profile_adjacency_gap",
  LINER_PROFILE_END_COVERAGE_GAP: "liner.errors.profile_end_coverage_gap",
  LINER_SPAN_END_EXCEEDS_ALIGNMENT: "liner.errors.span_end_exceeds_alignment",
  LINER_ORIGIN_STATION_AMBIGUOUS: "liner.errors.origin_station_ambiguous",
  LINER_PROFILE_PARABOLIC_Z_MERGE_DEFERRED: "liner.errors.profile_parabolic_z_merge_deferred",
  LINER_CROSSFALL_INTERVAL_OVERLAP: "liner.errors.crossfall_interval_overlap",
  LINER_CROSSFALL_PIVOT_CHANGE_UNSUPPORTED: "liner.errors.crossfall_pivot_change_unsupported",
  LINER_CROSSFALL_MEASURED_GRID_PRECEDENCE: "liner.errors.crossfall_measured_grid_precedence",
} as const satisfies Record<LinerDiagnosticCode, `liner.errors.${string}`>;

export function createIssue(
  level: DiagnosticLevel,
  code: LinerDiagnosticCode,
  extra: Omit<ValidationIssue, "level" | "code"> = {},
): ValidationIssue {
  return {
    level,
    code,
    messageKey: LINER_DIAGNOSTIC_MESSAGE_KEYS[code],
    ...extra,
  };
}

export function hasFatalIssues(issues: ValidationIssue[]): boolean {
  return issues.some((issue) => issue.level === "error");
}
