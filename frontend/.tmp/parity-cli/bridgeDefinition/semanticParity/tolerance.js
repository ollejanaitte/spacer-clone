"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_SEMANTIC_TOLERANCE = void 0;
exports.mergeSemanticTolerance = mergeSemanticTolerance;
exports.compareScalarWithTolerance = compareScalarWithTolerance;
exports.nearlyEqual = nearlyEqual;
exports.nearlyZero = nearlyZero;
exports.distance = distance;
exports.distanceWithinTolerance = distanceWithinTolerance;
exports.angleWithinTolerance = angleWithinTolerance;
exports.DEFAULT_SEMANTIC_TOLERANCE = {
    coordinate: { absolute: 1e-6 },
    length: { absolute: 1e-4, relative: 1e-6, floor: 1 },
    scalar: { absolute: 1e-9, relative: 1e-6, floor: 1e-9 },
    angle: { absolute: 1e-6 },
};
function isUsableTolerance(value) {
    return value !== undefined && Number.isFinite(value) && value >= 0;
}
function mergeSemanticTolerance(override) {
    return {
        coordinate: { ...exports.DEFAULT_SEMANTIC_TOLERANCE.coordinate, ...override?.coordinate },
        length: { ...exports.DEFAULT_SEMANTIC_TOLERANCE.length, ...override?.length },
        scalar: { ...exports.DEFAULT_SEMANTIC_TOLERANCE.scalar, ...override?.scalar },
        angle: { ...exports.DEFAULT_SEMANTIC_TOLERANCE.angle, ...override?.angle },
    };
}
function compareScalarWithTolerance(left, right, tolerance) {
    if (!Number.isFinite(left) || !Number.isFinite(right)) {
        return { equal: false, delta: Number.NaN };
    }
    const delta = Math.abs(left - right);
    const absolutePass = isUsableTolerance(tolerance.absolute) && delta <= tolerance.absolute;
    let relativeDelta;
    let relativePass = false;
    if (isUsableTolerance(tolerance.relative)) {
        const floor = isUsableTolerance(tolerance.floor) ? tolerance.floor : 0;
        const denominator = Math.max(Math.abs(left), floor);
        relativeDelta = denominator === 0 ? (delta === 0 ? 0 : Number.POSITIVE_INFINITY) : delta / denominator;
        relativePass = relativeDelta <= tolerance.relative;
    }
    return { equal: absolutePass || relativePass, delta, relativeDelta };
}
function nearlyEqual(left, right, tolerance) {
    return compareScalarWithTolerance(left, right, tolerance).equal;
}
function nearlyZero(value, tolerance) {
    return compareScalarWithTolerance(value, 0, tolerance).equal;
}
function distance(left, right) {
    const dx = left.x - right.x;
    const dy = left.y - right.y;
    const dz = left.z - right.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
function distanceWithinTolerance(left, right, tolerance) {
    return compareScalarWithTolerance(distance(left, right), 0, tolerance);
}
function angleWithinTolerance(leftRad, rightRad, tolerance) {
    return compareScalarWithTolerance(leftRad, rightRad, tolerance).equal;
}
