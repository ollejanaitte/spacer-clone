import { describe, expect, it } from "vitest";
import { evaluateClothoidElement } from "../geometry/clothoid";
import type { ClothoidElement } from "../types";

const PRODUCTION_INTERVALS = 128;
const REFERENCE_INTERVALS = 16384;
const PRE_DECISION_1_TOLERANCE_M = 0.001;
const TIMING_ITERATIONS = 1000;
const SPIKE_TIMEOUT_MS = 30000;

const END_RADII_M = [50, 100, 500, 1000] as const;
const CLOTHOID_PARAMETERS = [30, 50, 100, 150] as const;

function radiusToCurvature(radius: number | null | undefined): number {
  if (radius == null || !Number.isFinite(radius)) {
    return 0;
  }
  return 1 / radius;
}

function clothoidCurvatureAt(
  element: ClothoidElement,
  localDistance: number,
): number {
  const sign = element.turn === "right" ? -1 : 1;
  const startCurvature = radiusToCurvature(element.startRadius) * sign;
  const endCurvature =
    element.endRadius == null || !Number.isFinite(element.endRadius)
      ? sign * (element.length / element.clothoidParameter ** 2)
      : radiusToCurvature(element.endRadius) * sign;
  const t = element.length === 0 ? 0 : localDistance / element.length;
  return startCurvature + (endCurvature - startCurvature) * t;
}

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

function referenceEvaluateClothoidEndpoint(
  element: ClothoidElement,
  intervals: number,
): { x: number; y: number } {
  const length = element.length;
  const xLocal = simpsonIntegrate(length, intervals, (distance) =>
    Math.cos(clothoidHeadingAt(element, distance)),
  );
  const yLocal = simpsonIntegrate(length, intervals, (distance) =>
    Math.sin(clothoidHeadingAt(element, distance)),
  );
  return {
    x: element.start.x + xLocal,
    y: element.start.y + yLocal,
  };
}

function buildSpiralElement(endRadiusM: number, clothoidParameter: number): ClothoidElement {
  const length = (clothoidParameter ** 2) / endRadiusM;
  return {
    type: "clothoid",
    id: `spike-R${endRadiusM}-A${clothoidParameter}`,
    start: { x: 0, y: 0 },
    azimuth: 0,
    clothoidParameter,
    length,
    startRadius: null,
    endRadius: endRadiusM,
    turn: "left",
  };
}

function endpointPositionErrorM(
  production: { x: number; y: number },
  reference: { x: number; y: number },
): number {
  return Math.hypot(production.x - reference.x, production.y - reference.y);
}

function averageEvaluateTimeMs(
  evaluate: () => void,
  iterations: number,
): number {
  evaluate();
  const start = performance.now();
  for (let index = 0; index < iterations; index += 1) {
    evaluate();
  }
  const elapsedMs = performance.now() - start;
  return elapsedMs / iterations;
}

type SpikeMeasurementRow = {
  endRadiusM: number;
  clothoidParameter: number;
  lengthM: number;
  errorM: number;
  errorMm: number;
  productionTimeMs: number;
  referenceTimeMs: number;
};

describe("PR-1b-0 clothoid precision spike", () => {
  it("measures endpoint error vs high-resolution Simpson reference (Pre-Decision #1)", () => {
    const rows: SpikeMeasurementRow[] = [];

    for (const endRadiusM of END_RADII_M) {
      for (const clothoidParameter of CLOTHOID_PARAMETERS) {
        const element = buildSpiralElement(endRadiusM, clothoidParameter);
        const reference = referenceEvaluateClothoidEndpoint(
          element,
          REFERENCE_INTERVALS,
        );

        const productionTimeMs = averageEvaluateTimeMs(
          () => {
            evaluateClothoidElement(element, element.length);
          },
          TIMING_ITERATIONS,
        );
        const referenceTimeMs = averageEvaluateTimeMs(
          () => {
            referenceEvaluateClothoidEndpoint(element, REFERENCE_INTERVALS);
          },
          TIMING_ITERATIONS,
        );

        const production = evaluateClothoidElement(element, element.length);
        const errorM = endpointPositionErrorM(production.point, reference);
        const errorMm = errorM * 1000;

        rows.push({
          endRadiusM,
          clothoidParameter,
          lengthM: element.length,
          errorM,
          errorMm,
          productionTimeMs,
          referenceTimeMs,
        });

        expect(errorM).toBeLessThanOrEqual(PRE_DECISION_1_TOLERANCE_M);
      }
    }

    const header =
      "| R (m) | A (m) | L (m) | error (m) | error (mm) | prod (ms) | ref (ms) |";
    const separator =
      "| ---: | ---: | ---: | ---: | ---: | ---: | ---: |";
    const tableBody = rows
      .map(
        (row) =>
          `| ${row.endRadiusM} | ${row.clothoidParameter} | ${row.lengthM.toFixed(3)} | ${row.errorM.toExponential(3)} | ${row.errorMm.toFixed(4)} | ${row.productionTimeMs.toFixed(4)} | ${row.referenceTimeMs.toFixed(4)} |`,
      )
      .join("\n");
    const maxErrorM = Math.max(...rows.map((row) => row.errorM));

    console.log("\nPR-1b-0 Clothoid Precision Spike");
    console.log(
      `Production: evaluateClothoidElement (Simpson ${PRODUCTION_INTERVALS})`,
    );
    console.log(
      `Reference: closed high-resolution Simpson (${REFERENCE_INTERVALS} even intervals)`,
    );
    console.log(
      `Pre-Decision #1 tolerance: endpoint position error <= ${PRE_DECISION_1_TOLERANCE_M} m (1 mm)`,
    );
    console.log(header);
    console.log(separator);
    console.log(tableBody);
    console.log(`max endpoint error (m): ${maxErrorM.toExponential(3)}`);
    console.log(`max endpoint error (mm): ${(maxErrorM * 1000).toFixed(4)}`);
    console.log(
      `timing: average of ${TIMING_ITERATIONS} endpoint evaluations per case\n`,
    );

    expect(maxErrorM).toBeLessThanOrEqual(PRE_DECISION_1_TOLERANCE_M);
  }, SPIKE_TIMEOUT_MS);
});
