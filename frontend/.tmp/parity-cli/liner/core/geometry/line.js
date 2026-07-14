"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateStraightElement = evaluateStraightElement;
function evaluateStraightElement(element, localDistance) {
    const clampedDistance = Math.min(Math.max(localDistance, 0), element.length);
    return {
        point: {
            x: element.start.x + Math.cos(element.azimuth) * clampedDistance,
            y: element.start.y + Math.sin(element.azimuth) * clampedDistance,
        },
        azimuth: element.azimuth,
        curvature: 0,
        localDistance: clampedDistance,
        elementId: element.id,
    };
}
