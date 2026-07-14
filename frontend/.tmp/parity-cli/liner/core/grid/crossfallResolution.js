"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCrossSlopeIntervals = validateCrossSlopeIntervals;
exports.resolveCrossfallState = resolveCrossfallState;
exports.resolveCrossfallOffset = resolveCrossfallOffset;
const diagnostics_1 = require("../diagnostics");
const tolerances_1 = require("../tolerances");
const FLAT_MODE = "flat";
function compareIntervals(left, right) {
    if (left.startPhysicalDistance !== right.startPhysicalDistance) {
        return left.startPhysicalDistance - right.startPhysicalDistance;
    }
    if (left.endPhysicalDistance !== right.endPhysicalDistance) {
        return left.endPhysicalDistance - right.endPhysicalDistance;
    }
    return left.id.localeCompare(right.id);
}
function sortedIntervals(intervals) {
    return [...intervals].sort(compareIntervals);
}
function nearlyEqual(left, right) {
    return Math.abs(left - right) <= tolerances_1.DEFAULT_TOLERANCES.station;
}
function pivotDistanceOf(interval) {
    return Number.isFinite(interval.pivotDistance) ? interval.pivotDistance : 0;
}
function buildFlatState(physicalDistance, displayedStation) {
    return {
        physicalDistance,
        displayedStation,
        mode: FLAT_MODE,
        leftSlopePercent: 0,
        rightSlopePercent: 0,
        pivotDistance: 0,
        source: "flat",
    };
}
function buildLegacyScalarState(physicalDistance, displayedStation, crossSlope) {
    if (!crossSlope || !Number.isFinite(crossSlope.valuePercent) || crossSlope.valuePercent === 0) {
        return buildFlatState(physicalDistance, displayedStation);
    }
    const slopePercent = crossSlope.valuePercent;
    return {
        physicalDistance,
        displayedStation,
        mode: slopePercent >= 0 ? "one_way_right" : "one_way_left",
        leftSlopePercent: slopePercent,
        rightSlopePercent: slopePercent,
        pivotDistance: 0,
        source: "legacy_scalar",
    };
}
function buildIntervalState(interval, physicalDistance, displayedStation, source) {
    return {
        physicalDistance,
        displayedStation,
        mode: interval.mode,
        leftSlopePercent: interval.leftSlopePercent,
        rightSlopePercent: interval.rightSlopePercent,
        pivotDistance: pivotDistanceOf(interval),
        source,
        intervalId: interval.id,
    };
}
function findContainingInterval(intervals, physicalDistance) {
    for (let index = 0; index < intervals.length; index += 1) {
        const interval = intervals[index];
        const isLast = index === intervals.length - 1;
        const afterStart = physicalDistance > interval.startPhysicalDistance
            || nearlyEqual(physicalDistance, interval.startPhysicalDistance);
        const beforeEnd = isLast
            ? physicalDistance < interval.endPhysicalDistance
                || nearlyEqual(physicalDistance, interval.endPhysicalDistance)
            : physicalDistance < interval.endPhysicalDistance
                && !nearlyEqual(physicalDistance, interval.endPhysicalDistance);
        if (afterStart && beforeEnd) {
            return interval;
        }
    }
    return null;
}
function lerp(left, right, t) {
    return left + (right - left) * t;
}
function transitionMode(left, right) {
    return left.mode === right.mode ? left.mode : "independent";
}
function buildTransitionState(left, right, physicalDistance, displayedStation) {
    const gapStart = left.endPhysicalDistance;
    const gapEnd = right.startPhysicalDistance;
    if (!(physicalDistance > gapStart && physicalDistance < gapEnd)) {
        return null;
    }
    const leftPivot = pivotDistanceOf(left);
    const rightPivot = pivotDistanceOf(right);
    if (!nearlyEqual(leftPivot, rightPivot)) {
        return null;
    }
    const gapLength = gapEnd - gapStart;
    if (gapLength <= tolerances_1.DEFAULT_TOLERANCES.station) {
        return null;
    }
    const t = Math.max(0, Math.min(1, (physicalDistance - gapStart) / gapLength));
    return {
        physicalDistance,
        displayedStation,
        mode: transitionMode(left, right),
        leftSlopePercent: lerp(left.leftSlopePercent, right.leftSlopePercent, t),
        rightSlopePercent: lerp(left.rightSlopePercent, right.rightSlopePercent, t),
        pivotDistance: leftPivot,
        source: "transition",
    };
}
function validateCrossSlopeIntervals(intervals) {
    if (!intervals || intervals.length === 0) {
        return [];
    }
    const issues = [];
    const ordered = sortedIntervals(intervals);
    let baselinePivot = pivotDistanceOf(ordered[0]);
    for (let index = 0; index < ordered.length; index += 1) {
        const interval = ordered[index];
        const pivot = pivotDistanceOf(interval);
        if (!nearlyEqual(pivot, baselinePivot)) {
            issues.push((0, diagnostics_1.createIssue)("error", diagnostics_1.LINER_DIAGNOSTIC_CODES.crossfallPivotChangeUnsupported, {
                entityType: "crossSlopeInterval",
                entityId: interval.id,
                physicalDistance: interval.startPhysicalDistance,
                detail: "Crossfall pivot changes are not supported in the current MVP.",
            }));
        }
        baselinePivot = pivot;
        const next = ordered[index + 1];
        if (!next) {
            continue;
        }
        if (next.startPhysicalDistance < interval.endPhysicalDistance
            && !nearlyEqual(next.startPhysicalDistance, interval.endPhysicalDistance)) {
            issues.push((0, diagnostics_1.createIssue)("error", diagnostics_1.LINER_DIAGNOSTIC_CODES.crossfallIntervalOverlap, {
                entityType: "crossSlopeInterval",
                entityId: `${interval.id}:${next.id}`,
                physicalDistance: next.startPhysicalDistance,
                detail: "Crossfall intervals overlap; touching boundaries are allowed but overlap is not.",
            }));
        }
    }
    return issues;
}
function resolveCrossfallState(input, physicalDistance, displayedStation) {
    const explicitIntervals = input.crossSlopeIntervals;
    if (!explicitIntervals || explicitIntervals.length === 0) {
        return buildLegacyScalarState(physicalDistance, displayedStation, input.crossSectionTemplate?.crossSlope);
    }
    const ordered = sortedIntervals(explicitIntervals);
    const containing = findContainingInterval(ordered, physicalDistance);
    if (containing) {
        return buildIntervalState(containing, physicalDistance, displayedStation, "interval");
    }
    for (let index = 0; index < ordered.length - 1; index += 1) {
        const left = ordered[index];
        const right = ordered[index + 1];
        const transition = buildTransitionState(left, right, physicalDistance, displayedStation);
        if (transition) {
            return transition;
        }
    }
    return buildFlatState(physicalDistance, displayedStation);
}
function resolveCrossfallOffset(state, offset) {
    if (!Number.isFinite(offset)) {
        return 0;
    }
    const relativeOffset = offset - state.pivotDistance;
    if (Math.abs(relativeOffset) <= tolerances_1.DEFAULT_TOLERANCES.offset) {
        return 0;
    }
    const slopePercent = relativeOffset < 0
        ? state.leftSlopePercent
        : state.rightSlopePercent;
    const result = -(slopePercent / 100) * relativeOffset;
    return result === 0 ? 0 : result;
}
