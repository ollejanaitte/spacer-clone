import { createIssue, LINER_DIAGNOSTIC_CODES } from "./diagnostics";
import { evaluateCircularArcElement } from "./geometry/arc";
import { evaluateClothoidElement } from "./geometry/clothoid";
import { evaluateStraightElement } from "./geometry/line";
import { DEFAULT_TOLERANCES } from "./tolerances";
import type { AlignmentElement, ValidationIssue } from "./types";
import { normalizeAngle } from "./vector";

function evaluateElementEndAzimuth(element: AlignmentElement): number {
  if (element.type === "straight") {
    return evaluateStraightElement(element, element.length).azimuth;
  }
  if (element.type === "arc") {
    return evaluateCircularArcElement(element, element.length).azimuth;
  }
  return evaluateClothoidElement(element, element.length).azimuth;
}

export function checkC1Continuity(elements: AlignmentElement[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (let index = 1; index < elements.length; index += 1) {
    const prev = elements[index - 1]!;
    const next = elements[index]!;
    const prevEndAzimuth = evaluateElementEndAzimuth(prev);
    const diff = normalizeAngle(next.azimuth - prevEndAzimuth);

    if (Math.abs(diff) > DEFAULT_TOLERANCES.azimuth) {
      issues.push(
        createIssue("error", LINER_DIAGNOSTIC_CODES.azimuthDiscontinuity, {
          entityType: "alignmentElement",
          entityId: next.id,
          entityPath: `elements[${index}].azimuth`,
          field: "azimuth",
          detail: `C1 azimuth gap ${Math.abs(diff)} rad exceeds tolerance ${DEFAULT_TOLERANCES.azimuth} rad`,
        }),
      );
    }
  }

  return issues;
}
