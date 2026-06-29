import { createIssue, LINER_DIAGNOSTIC_CODES } from "./diagnostics";
import { evaluateCircularArcElement } from "./geometry/arc";
import { evaluateClothoidElement } from "./geometry/clothoid";
import { evaluateStraightElement } from "./geometry/line";
import { DEFAULT_TOLERANCES } from "./tolerances";
import type { AlignmentElement, Vec2, ValidationIssue } from "./types";
import { distance2 } from "./vector";

function evaluateElementEndPoint(element: AlignmentElement): Vec2 {
  if (element.type === "straight") {
    return evaluateStraightElement(element, element.length).point;
  }
  if (element.type === "arc") {
    return evaluateCircularArcElement(element, element.length).point;
  }
  return evaluateClothoidElement(element, element.length).point;
}

export function checkC0Continuity(elements: AlignmentElement[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (let index = 1; index < elements.length; index += 1) {
    const prev = elements[index - 1]!;
    const next = elements[index]!;
    const prevEnd = evaluateElementEndPoint(prev);
    const gap = distance2(prevEnd, next.start);

    if (gap > DEFAULT_TOLERANCES.coordinate) {
      issues.push(
        createIssue("error", LINER_DIAGNOSTIC_CODES.positionDiscontinuity, {
          entityType: "alignmentElement",
          entityId: next.id,
          entityPath: `elements[${index}].start`,
          field: "start",
          detail: `C0 gap ${gap} m exceeds tolerance ${DEFAULT_TOLERANCES.coordinate} m`,
        }),
      );
    }
  }

  return issues;
}
