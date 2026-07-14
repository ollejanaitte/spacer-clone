"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SAMPLING_INTERVAL_FRAME = exports.SAMPLING_INTERVAL_DXF = exports.SAMPLING_INTERVAL_DISPLAY = void 0;
exports.sampleDisplay = sampleDisplay;
exports.sampleDxf = sampleDxf;
exports.sampleFrame = sampleFrame;
const horizontal_1 = require("./geometry/horizontal");
const stationRules_1 = require("./station/stationRules");
exports.SAMPLING_INTERVAL_DISPLAY = 0.5;
exports.SAMPLING_INTERVAL_DXF = 0.1;
exports.SAMPLING_INTERVAL_FRAME = 0.25;
function toSamplePoint(evaluation) {
    return {
        physicalDistance: evaluation.physicalDistance,
        displayedStation: evaluation.displayedStation,
        x: evaluation.point.x,
        y: evaluation.point.y,
        azimuth: evaluation.azimuth,
        curvature: evaluation.curvature,
        segmentId: evaluation.elementId,
        localFrame: evaluation.localFrame,
    };
}
function sampleAlignmentAtInterval(alignment, stationDefinition, interval) {
    const totalLength = (0, horizontal_1.totalAlignmentLength)(alignment);
    if (totalLength === 0) {
        return [];
    }
    const points = [];
    for (let distance = 0; distance < totalLength; distance += interval) {
        points.push(toSamplePoint((0, horizontal_1.evaluateAlignmentAtDistance)(alignment, distance, (0, stationRules_1.displayedStationAtPhysicalDistance)(distance, stationDefinition, distance > 0))));
    }
    points.push(toSamplePoint((0, horizontal_1.evaluateAlignmentAtDistance)(alignment, totalLength, (0, stationRules_1.displayedStationAtPhysicalDistance)(totalLength, stationDefinition))));
    return points;
}
function sampleDisplay(alignment, stationDefinition) {
    return sampleAlignmentAtInterval(alignment, stationDefinition, exports.SAMPLING_INTERVAL_DISPLAY);
}
function sampleDxf(alignment, stationDefinition) {
    return sampleAlignmentAtInterval(alignment, stationDefinition, exports.SAMPLING_INTERVAL_DXF);
}
function sampleFrame(alignment, stationDefinition) {
    return sampleAlignmentAtInterval(alignment, stationDefinition, exports.SAMPLING_INTERVAL_FRAME);
}
