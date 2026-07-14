"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signedArcCurvature = signedArcCurvature;
exports.evaluateCircularArcElement = evaluateCircularArcElement;
function signedArcCurvature(element) {
    return (element.turn === "left" ? 1 : -1) / element.radius;
}
function evaluateCircularArcElement(element, localDistance) {
    const clampedDistance = Math.min(Math.max(localDistance, 0), element.length);
    const sign = element.turn === "left" ? 1 : -1;
    const delta = (clampedDistance / element.radius) * sign;
    const azimuth = element.azimuth + delta;
    const sin0 = Math.sin(element.azimuth);
    const cos0 = Math.cos(element.azimuth);
    const sin1 = Math.sin(azimuth);
    const cos1 = Math.cos(azimuth);
    return {
        point: {
            x: element.start.x + sign * element.radius * (sin1 - sin0),
            y: element.start.y - sign * element.radius * (cos1 - cos0),
        },
        azimuth,
        curvature: signedArcCurvature(element),
        localDistance: clampedDistance,
        elementId: element.id,
    };
}
