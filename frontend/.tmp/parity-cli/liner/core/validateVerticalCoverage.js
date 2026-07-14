"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkVerticalProfileEndCoverage = checkVerticalProfileEndCoverage;
const diagnostics_1 = require("./diagnostics");
const tolerances_1 = require("./tolerances");
function verticalProfileEndStation(verticalAlignment) {
    let maxEnd = 0;
    for (const element of verticalAlignment.elements) {
        maxEnd = Math.max(maxEnd, element.endStation);
    }
    return maxEnd;
}
function checkVerticalProfileEndCoverage(verticalAlignment, horizontalTotalLength) {
    if (verticalAlignment === undefined) {
        return [];
    }
    if (verticalAlignment.elements.length === 0) {
        return [
            (0, diagnostics_1.createIssue)("error", diagnostics_1.LINER_DIAGNOSTIC_CODES.profileCoverageGap, {
                entityType: "verticalAlignment",
                detail: "No vertical alignment elements; profile does not cover horizontal alignment.",
            }),
        ];
    }
    const profileEnd = verticalProfileEndStation(verticalAlignment);
    const gap = horizontalTotalLength - profileEnd;
    if (gap > tolerances_1.DEFAULT_TOLERANCES.station) {
        return [
            (0, diagnostics_1.createIssue)("warning", diagnostics_1.LINER_DIAGNOSTIC_CODES.profileEndCoverageGap, {
                entityType: "verticalAlignment",
                entityId: verticalAlignment.id,
                station: profileEnd,
                detail: `Vertical profile ends at ${profileEnd} m but horizontal alignment ends at ${horizontalTotalLength} m (gap ${gap} m).`,
            }),
        ];
    }
    return [];
}
