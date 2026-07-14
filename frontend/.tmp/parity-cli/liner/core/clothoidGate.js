"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkClothoidPrecision = checkClothoidPrecision;
const diagnostics_1 = require("./diagnostics");
const clothoid_1 = require("./geometry/clothoid");
const tolerances_1 = require("./tolerances");
const vector_1 = require("./vector");
const REFERENCE_SIMPSON_INTERVALS = 16384;
function clothoidHeadingAt(element, distance) {
    const k0 = (0, clothoid_1.clothoidCurvatureAt)(element, 0);
    const k1 = (0, clothoid_1.clothoidCurvatureAt)(element, element.length);
    const slope = element.length === 0 ? 0 : (k1 - k0) / element.length;
    return element.azimuth + k0 * distance + 0.5 * slope * distance * distance;
}
function simpsonIntegrate(length, intervals, valueAt) {
    const evenIntervals = intervals % 2 === 0 ? intervals : intervals + 1;
    const step = length / evenIntervals;
    let sum = valueAt(0) + valueAt(length);
    for (let index = 1; index < evenIntervals; index += 1) {
        sum += (index % 2 === 0 ? 2 : 4) * valueAt(index * step);
    }
    return (sum * step) / 3;
}
function evaluateClothoidEndpointReference(element) {
    const xLocal = simpsonIntegrate(element.length, REFERENCE_SIMPSON_INTERVALS, (distance) => Math.cos(clothoidHeadingAt(element, distance)));
    const yLocal = simpsonIntegrate(element.length, REFERENCE_SIMPSON_INTERVALS, (distance) => Math.sin(clothoidHeadingAt(element, distance)));
    return {
        x: element.start.x + xLocal,
        y: element.start.y + yLocal,
    };
}
function checkClothoidPrecision(elements) {
    const issues = [];
    for (const element of elements) {
        if (!Number.isFinite(element.length) || element.length <= tolerances_1.DEFAULT_TOLERANCES.length) {
            continue;
        }
        const productionEnd = (0, clothoid_1.evaluateClothoidElement)(element, element.length).point;
        const referenceEnd = evaluateClothoidEndpointReference(element);
        const error = (0, vector_1.distance2)(productionEnd, referenceEnd);
        if (error > tolerances_1.DEFAULT_TOLERANCES.clothoidCoordinate) {
            issues.push((0, diagnostics_1.createIssue)("error", diagnostics_1.LINER_DIAGNOSTIC_CODES.clothoidAccuracyExceeded, {
                entityType: "alignmentElement",
                entityId: element.id,
                field: "clothoidParameter",
                detail: `Clothoid endpoint error ${error} m exceeds tolerance ${tolerances_1.DEFAULT_TOLERANCES.clothoidCoordinate} m`,
            }));
        }
    }
    return issues;
}
