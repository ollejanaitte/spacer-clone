"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sampleVerticalAlignmentAtInterval = sampleVerticalAlignmentAtInterval;
exports.sampleVerticalDisplay = sampleVerticalDisplay;
exports.sampleVerticalDxf = sampleVerticalDxf;
exports.sampleVerticalFrame = sampleVerticalFrame;
const sampling_1 = require("./sampling");
const STATION_EPSILON = 1e-9;
function displayStartElevation(value) {
    return value ?? 0;
}
function evaluateVerticalElementAtStation(element, station) {
    const u = Math.min(Math.max(station - element.startStation, 0), element.length);
    if (element.type === "grade") {
        return {
            elevation: element.startElevation + element.grade * u,
            grade: element.grade,
        };
    }
    const startElevation = displayStartElevation(element.startElevation);
    const length = element.length;
    const rate = length === 0 ? 0 : (element.endGrade - element.startGrade) / length;
    return {
        elevation: startElevation + element.startGrade * u + 0.5 * rate * u * u,
        grade: element.startGrade + rate * u,
    };
}
function toSamplePoint(element, station) {
    const { elevation, grade } = evaluateVerticalElementAtStation(element, station);
    return {
        station,
        elevation,
        grade,
        sourceElementId: element.id,
    };
}
function sameStation(left, right) {
    return Math.abs(left - right) <= STATION_EPSILON;
}
function sampleElementAtInterval(element, interval, points) {
    const { startStation, endStation } = element;
    if (sameStation(startStation, endStation)) {
        if (points.length === 0 || !sameStation(points[points.length - 1].station, startStation)) {
            points.push(toSamplePoint(element, startStation));
        }
        return;
    }
    let station = startStation;
    if (points.length > 0 && sameStation(points[points.length - 1].station, station)) {
        station += interval;
    }
    for (; station < endStation - STATION_EPSILON; station += interval) {
        points.push(toSamplePoint(element, station));
    }
    if (points.length === 0 || !sameStation(points[points.length - 1].station, endStation)) {
        points.push(toSamplePoint(element, endStation));
    }
}
function sampleVerticalAlignmentAtInterval(verticalAlignment, interval) {
    if (!Number.isFinite(interval) || interval <= 0) {
        return [];
    }
    const points = [];
    for (const element of verticalAlignment.elements) {
        sampleElementAtInterval(element, interval, points);
    }
    return points;
}
function sampleVerticalDisplay(verticalAlignment) {
    return sampleVerticalAlignmentAtInterval(verticalAlignment, sampling_1.SAMPLING_INTERVAL_DISPLAY);
}
function sampleVerticalDxf(verticalAlignment) {
    return sampleVerticalAlignmentAtInterval(verticalAlignment, sampling_1.SAMPLING_INTERVAL_DXF);
}
function sampleVerticalFrame(verticalAlignment) {
    return sampleVerticalAlignmentAtInterval(verticalAlignment, sampling_1.SAMPLING_INTERVAL_FRAME);
}
