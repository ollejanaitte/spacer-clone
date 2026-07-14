"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkC1Continuity = checkC1Continuity;
const diagnostics_1 = require("./diagnostics");
const arc_1 = require("./geometry/arc");
const clothoid_1 = require("./geometry/clothoid");
const line_1 = require("./geometry/line");
const tolerances_1 = require("./tolerances");
const vector_1 = require("./vector");
function evaluateElementEndAzimuth(element) {
    if (element.type === "straight") {
        return (0, line_1.evaluateStraightElement)(element, element.length).azimuth;
    }
    if (element.type === "arc") {
        return (0, arc_1.evaluateCircularArcElement)(element, element.length).azimuth;
    }
    return (0, clothoid_1.evaluateClothoidElement)(element, element.length).azimuth;
}
function checkC1Continuity(elements) {
    const issues = [];
    for (let index = 1; index < elements.length; index += 1) {
        const prev = elements[index - 1];
        const next = elements[index];
        const prevEndAzimuth = evaluateElementEndAzimuth(prev);
        const diff = (0, vector_1.normalizeAngle)(next.azimuth - prevEndAzimuth);
        if (Math.abs(diff) > tolerances_1.DEFAULT_TOLERANCES.azimuth) {
            issues.push((0, diagnostics_1.createIssue)("error", diagnostics_1.LINER_DIAGNOSTIC_CODES.azimuthDiscontinuity, {
                entityType: "alignmentElement",
                entityId: next.id,
                entityPath: `elements[${index}].azimuth`,
                field: "azimuth",
                detail: `C1 azimuth gap ${Math.abs(diff)} rad exceeds tolerance ${tolerances_1.DEFAULT_TOLERANCES.azimuth} rad`,
            }));
        }
    }
    return issues;
}
