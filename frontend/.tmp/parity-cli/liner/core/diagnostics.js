"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LINER_DIAGNOSTIC_CODES = void 0;
exports.createIssue = createIssue;
exports.hasFatalIssues = hasFatalIssues;
exports.LINER_DIAGNOSTIC_CODES = {
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
};
function createIssue(level, code, extra = {}) {
    return {
        level,
        code,
        ...extra,
    };
}
function hasFatalIssues(issues) {
    return issues.some((issue) => issue.level === "error");
}
