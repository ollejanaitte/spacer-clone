import { createIssue, LINER_DIAGNOSTIC_CODES } from "./diagnostics";
import { clothoidCurvatureAt, evaluateClothoidElement } from "./geometry/clothoid";
import { DEFAULT_TOLERANCES } from "./tolerances";
import type { ClothoidElement, ValidationIssue } from "./types";
import { distance2 } from "./vector";

const REFERENCE_SIMPSON_INTERVALS = 16384;

function clothoidHeadingAt(element: ClothoidElement, distance: number): number {
  const k0 = clothoidCurvatureAt(element, 0);
  const k1 = clothoidCurvatureAt(element, element.length);
  const slope = element.length === 0 ? 0 : (k1 - k0) / element.length;
  return element.azimuth + k0 * distance + 0.5 * slope * distance * distance;
}

function simpsonIntegrate(
  length: number,
  intervals: number,
  valueAt: (distance: number) => number,
): number {
  const evenIntervals = intervals % 2 === 0 ? intervals : intervals + 1;
  const step = length / evenIntervals;
  let sum = valueAt(0) + valueAt(length);
  for (let index = 1; index < evenIntervals; index += 1) {
    sum += (index % 2 === 0 ? 2 : 4) * valueAt(index * step);
  }
  return (sum * step) / 3;
}

function evaluateClothoidEndpointReference(element: ClothoidElement) {
  const xLocal = simpsonIntegrate(element.length, REFERENCE_SIMPSON_INTERVALS, (distance) =>
    Math.cos(clothoidHeadingAt(element, distance)),
  );
  const yLocal = simpsonIntegrate(element.length, REFERENCE_SIMPSON_INTERVALS, (distance) =>
    Math.sin(clothoidHeadingAt(element, distance)),
  );
  return {
    x: element.start.x + xLocal,
    y: element.start.y + yLocal,
  };
}

export function checkClothoidPrecision(elements: ClothoidElement[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const element of elements) {
    if (!Number.isFinite(element.length) || element.length <= DEFAULT_TOLERANCES.length) {
      continue;
    }

    const productionEnd = evaluateClothoidElement(element, element.length).point;
    const referenceEnd = evaluateClothoidEndpointReference(element);
    const error = distance2(productionEnd, referenceEnd);

    if (error > DEFAULT_TOLERANCES.clothoidCoordinate) {
      issues.push(
        createIssue("error", LINER_DIAGNOSTIC_CODES.clothoidAccuracyExceeded, {
          entityType: "alignmentElement",
          entityId: element.id,
          field: "clothoidParameter",
          detail: `Clothoid endpoint error ${error} m exceeds tolerance ${DEFAULT_TOLERANCES.clothoidCoordinate} m`,
        }),
      );
    }
  }

  return issues;
}
