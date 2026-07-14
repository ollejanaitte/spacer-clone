"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.elementLength = elementLength;
exports.evaluateElementAtDistance = evaluateElementAtDistance;
exports.evaluateElementEndState = evaluateElementEndState;
exports.totalAlignmentLength = totalAlignmentLength;
exports.evaluateAlignmentAtDistance = evaluateAlignmentAtDistance;
exports.validateAlignment = validateAlignment;
const clothoidGate_1 = require("../clothoidGate");
const continuityC0_1 = require("../continuityC0");
const continuityC1_1 = require("../continuityC1");
const diagnostics_1 = require("../diagnostics");
const tolerances_1 = require("../tolerances");
const vector_1 = require("../vector");
const arc_1 = require("./arc");
const clothoid_1 = require("./clothoid");
const line_1 = require("./line");
function radiusFromCurvature(curvature) {
    if (!Number.isFinite(curvature) || Math.abs(curvature) <= 1e-12) {
        return null;
    }
    return 1 / Math.abs(curvature);
}
function elementLength(element) {
    return element.length;
}
function evaluateElementAtDistance(element, localDistance) {
    if (element.type === "straight") {
        return (0, line_1.evaluateStraightElement)(element, localDistance);
    }
    if (element.type === "arc") {
        return (0, arc_1.evaluateCircularArcElement)(element, localDistance);
    }
    return (0, clothoid_1.evaluateClothoidElement)(element, localDistance);
}
function evaluateElementEndState(element) {
    const endEvaluation = evaluateElementAtDistance(element, element.length);
    if (element.type === "straight") {
        return {
            point: endEvaluation.point,
            azimuth: endEvaluation.azimuth,
            endCurvature: 0,
            endRadius: null,
            turnDirection: null,
        };
    }
    if (element.type === "arc") {
        return {
            point: endEvaluation.point,
            azimuth: endEvaluation.azimuth,
            endCurvature: endEvaluation.curvature,
            endRadius: element.radius,
            turnDirection: element.turn,
        };
    }
    const endCurvature = (0, clothoid_1.clothoidCurvatureAt)(element, element.length);
    return {
        point: endEvaluation.point,
        azimuth: endEvaluation.azimuth,
        endCurvature,
        endRadius: radiusFromCurvature(endCurvature),
        turnDirection: element.turn ?? "left",
    };
}
function totalAlignmentLength(alignment) {
    return alignment.elements.reduce((sum, element) => sum + element.length, 0);
}
function evaluateAlignmentAtDistance(alignment, physicalDistance, displayedStation = physicalDistance) {
    const totalLength = totalAlignmentLength(alignment);
    const target = Math.min(Math.max(physicalDistance, 0), totalLength);
    let cursor = 0;
    for (const element of alignment.elements) {
        const nextCursor = cursor + element.length;
        if (target <= nextCursor + tolerances_1.DEFAULT_TOLERANCES.station) {
            const localDistance = Math.min(Math.max(target - cursor, 0), element.length);
            const evaluation = evaluateElementAtDistance(element, localDistance);
            return {
                ...evaluation,
                physicalDistance: target,
                displayedStation,
                localFrame: (0, vector_1.localFrameFromAzimuth)(evaluation.azimuth),
            };
        }
        cursor = nextCursor;
    }
    const lastElement = alignment.elements[alignment.elements.length - 1];
    if (!lastElement) {
        return {
            point: { x: 0, y: 0 },
            azimuth: 0,
            curvature: 0,
            localDistance: 0,
            elementId: "",
            physicalDistance: 0,
            displayedStation,
            localFrame: (0, vector_1.localFrameFromAzimuth)(0),
        };
    }
    const evaluation = evaluateElementAtDistance(lastElement, lastElement.length);
    return {
        ...evaluation,
        physicalDistance: totalLength,
        displayedStation,
        localFrame: (0, vector_1.localFrameFromAzimuth)(evaluation.azimuth),
    };
}
function validateAlignment(alignment) {
    const issues = [];
    for (const [index, element] of alignment.elements.entries()) {
        if (!Number.isFinite(element.length) || element.length <= tolerances_1.DEFAULT_TOLERANCES.length) {
            issues.push((0, diagnostics_1.createIssue)("error", diagnostics_1.LINER_DIAGNOSTIC_CODES.zeroLengthSegment, {
                entityType: "alignmentElement",
                entityId: element.id,
                entityPath: `elements[${index}].length`,
                field: "length",
            }));
        }
        if (element.type === "arc" && element.radius <= tolerances_1.DEFAULT_TOLERANCES.length) {
            issues.push((0, diagnostics_1.createIssue)("error", diagnostics_1.LINER_DIAGNOSTIC_CODES.clothoidInvalidRadius, {
                entityType: "alignmentElement",
                entityId: element.id,
                entityPath: `elements[${index}].radius`,
                field: "radius",
            }));
        }
        if (element.type === "clothoid" &&
            (!Number.isFinite(element.clothoidParameter) ||
                element.clothoidParameter <= tolerances_1.DEFAULT_TOLERANCES.length)) {
            issues.push((0, diagnostics_1.createIssue)("error", diagnostics_1.LINER_DIAGNOSTIC_CODES.clothoidInvalidRadius, {
                entityType: "alignmentElement",
                entityId: element.id,
                entityPath: `elements[${index}].clothoidParameter`,
                field: "clothoidParameter",
            }));
        }
    }
    issues.push(...(0, continuityC0_1.checkC0Continuity)(alignment.elements));
    issues.push(...(0, continuityC1_1.checkC1Continuity)(alignment.elements));
    const clothoidElements = alignment.elements.filter((element) => element.type === "clothoid");
    issues.push(...(0, clothoidGate_1.checkClothoidPrecision)(clothoidElements));
    return issues;
}
