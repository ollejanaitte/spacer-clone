"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_TOLERANCES = exports.AZIMUTH_TOLERANCE_RAD = void 0;
exports.nearlyEqual = nearlyEqual;
exports.assertPositiveLength = assertPositiveLength;
/** C1 azimuth tolerance: 0.001 deg expressed in radians. */
exports.AZIMUTH_TOLERANCE_RAD = 0.001 * (Math.PI / 180);
exports.DEFAULT_TOLERANCES = {
    length: 1e-6,
    coordinate: 0.001,
    clothoidCoordinate: 1e-3,
    azimuth: exports.AZIMUTH_TOLERANCE_RAD,
    elevation: 1e-6,
    station: 1e-6,
    offset: 1e-4,
};
function nearlyEqual(actual, expected, tolerance = exports.DEFAULT_TOLERANCES.coordinate) {
    return Math.abs(actual - expected) <= tolerance;
}
function assertPositiveLength(value) {
    return Number.isFinite(value) && value > exports.DEFAULT_TOLERANCES.length;
}
