"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.elevationAt = elevationAt;
function displayStartElevation(value) {
    return value ?? 0;
}
function evaluateVerticalElementElevation(element, station) {
    const u = station - element.startStation;
    if (element.type === "grade") {
        return element.startElevation + element.grade * u;
    }
    const startElevation = displayStartElevation(element.startElevation);
    const length = element.length;
    const rate = length === 0 ? 0 : (element.endGrade - element.startGrade) / length;
    return startElevation + element.startGrade * u + 0.5 * rate * u * u;
}
function findContainingElement(elements, station) {
    for (const element of elements) {
        if (element.startStation <= station && station <= element.endStation) {
            return element;
        }
    }
    return null;
}
function elevationAt(station, verticalAlignment) {
    if (!Number.isFinite(station)) {
        return null;
    }
    const element = findContainingElement(verticalAlignment.elements, station);
    if (element === null) {
        return null;
    }
    return evaluateVerticalElementElevation(element, station);
}
