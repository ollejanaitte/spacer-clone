"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkC0Continuity = checkC0Continuity;
const diagnostics_1 = require("./diagnostics");
const arc_1 = require("./geometry/arc");
const clothoid_1 = require("./geometry/clothoid");
const line_1 = require("./geometry/line");
const tolerances_1 = require("./tolerances");
const vector_1 = require("./vector");
function evaluateElementEndPoint(element) {
    if (element.type === "straight") {
        return (0, line_1.evaluateStraightElement)(element, element.length).point;
    }
    if (element.type === "arc") {
        return (0, arc_1.evaluateCircularArcElement)(element, element.length).point;
    }
    return (0, clothoid_1.evaluateClothoidElement)(element, element.length).point;
}
function checkC0Continuity(elements) {
    const issues = [];
    for (let index = 1; index < elements.length; index += 1) {
        const prev = elements[index - 1];
        const next = elements[index];
        const prevEnd = evaluateElementEndPoint(prev);
        const gap = (0, vector_1.distance2)(prevEnd, next.start);
        if (gap > tolerances_1.DEFAULT_TOLERANCES.coordinate) {
            issues.push((0, diagnostics_1.createIssue)("error", diagnostics_1.LINER_DIAGNOSTIC_CODES.positionDiscontinuity, {
                entityType: "alignmentElement",
                entityId: next.id,
                entityPath: `elements[${index}].start`,
                field: "start",
                detail: `C0 gap ${gap} m exceeds tolerance ${tolerances_1.DEFAULT_TOLERANCES.coordinate} m`,
            }));
        }
    }
    return issues;
}
