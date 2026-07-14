"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clothoidCurvatureAt = clothoidCurvatureAt;
exports.evaluateClothoidElement = evaluateClothoidElement;
exports.isPhase0ClothoidApproximation = isPhase0ClothoidApproximation;
const SIMPSON_INTERVALS = 128;
function radiusToCurvature(radius) {
    if (radius == null || !Number.isFinite(radius)) {
        return 0;
    }
    return 1 / radius;
}
function clothoidCurvatureAt(element, localDistance) {
    const sign = element.turn === "right" ? -1 : 1;
    const startCurvature = radiusToCurvature(element.startRadius) * sign;
    const endCurvature = element.endRadius == null || !Number.isFinite(element.endRadius)
        ? sign * (element.length / (element.clothoidParameter ** 2))
        : radiusToCurvature(element.endRadius) * sign;
    const t = element.length === 0 ? 0 : localDistance / element.length;
    return startCurvature + (endCurvature - startCurvature) * t;
}
function clothoidHeadingAt(element, distance) {
    const k0 = clothoidCurvatureAt(element, 0);
    const k1 = clothoidCurvatureAt(element, element.length);
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
function evaluateClothoidElement(element, localDistance) {
    const clampedDistance = Math.min(Math.max(localDistance, 0), element.length);
    const intervals = Math.max(16, SIMPSON_INTERVALS);
    const xLocal = simpsonIntegrate(clampedDistance, intervals, (distance) => Math.cos(clothoidHeadingAt(element, distance)));
    const yLocal = simpsonIntegrate(clampedDistance, intervals, (distance) => Math.sin(clothoidHeadingAt(element, distance)));
    return {
        point: {
            x: element.start.x + xLocal,
            y: element.start.y + yLocal,
        },
        azimuth: clothoidHeadingAt(element, clampedDistance),
        curvature: clothoidCurvatureAt(element, clampedDistance),
        localDistance: clampedDistance,
        elementId: element.id,
    };
}
function isPhase0ClothoidApproximation() {
    return true;
}
