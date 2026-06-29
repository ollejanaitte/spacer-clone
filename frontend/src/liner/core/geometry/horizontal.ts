import { checkClothoidPrecision } from "../clothoidGate";
import { checkC0Continuity } from "../continuityC0";
import { checkC1Continuity } from "../continuityC1";
import { createIssue, LINER_DIAGNOSTIC_CODES } from "../diagnostics";
import { DEFAULT_TOLERANCES } from "../tolerances";
import type {
  AlignmentElement,
  AlignmentEvaluation,
  ClothoidElement,
  ElementEvaluation,
  LinearAlignment,
  ValidationIssue,
} from "../types";
import { localFrameFromAzimuth } from "../vector";
import { evaluateCircularArcElement } from "./arc";
import { evaluateClothoidElement } from "./clothoid";
import { evaluateStraightElement } from "./line";

export function elementLength(element: AlignmentElement): number {
  return element.length;
}

export function evaluateElementAtDistance(
  element: AlignmentElement,
  localDistance: number,
): ElementEvaluation {
  if (element.type === "straight") {
    return evaluateStraightElement(element, localDistance);
  }
  if (element.type === "arc") {
    return evaluateCircularArcElement(element, localDistance);
  }
  return evaluateClothoidElement(element, localDistance);
}

export function totalAlignmentLength(alignment: LinearAlignment): number {
  return alignment.elements.reduce((sum, element) => sum + element.length, 0);
}

export function evaluateAlignmentAtDistance(
  alignment: LinearAlignment,
  physicalDistance: number,
  displayedStation = physicalDistance,
): AlignmentEvaluation {
  const totalLength = totalAlignmentLength(alignment);
  const target = Math.min(Math.max(physicalDistance, 0), totalLength);
  let cursor = 0;

  for (const element of alignment.elements) {
    const nextCursor = cursor + element.length;
    if (target <= nextCursor + DEFAULT_TOLERANCES.station) {
      const localDistance = Math.min(Math.max(target - cursor, 0), element.length);
      const evaluation = evaluateElementAtDistance(element, localDistance);
      return {
        ...evaluation,
        physicalDistance: target,
        displayedStation,
        localFrame: localFrameFromAzimuth(evaluation.azimuth),
      };
    }
    cursor = nextCursor;
  }

  const lastElement = alignment.elements[alignment.elements.length - 1];
  if (!lastElement) {
    return {
      point: { x: 0, y: 0 },
      azimuth: 0,
      curvature: 0,
      localDistance: 0,
      elementId: "",
      physicalDistance: 0,
      displayedStation,
      localFrame: localFrameFromAzimuth(0),
    };
  }
  const evaluation = evaluateElementAtDistance(lastElement, lastElement.length);
  return {
    ...evaluation,
    physicalDistance: totalLength,
    displayedStation,
    localFrame: localFrameFromAzimuth(evaluation.azimuth),
  };
}

export function validateAlignment(alignment: LinearAlignment): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const [index, element] of alignment.elements.entries()) {
    if (!Number.isFinite(element.length) || element.length <= DEFAULT_TOLERANCES.length) {
      issues.push(
        createIssue("error", LINER_DIAGNOSTIC_CODES.zeroLengthSegment, {
          entityType: "alignmentElement",
          entityId: element.id,
          entityPath: `elements[${index}].length`,
          field: "length",
        }),
      );
    }
    if (element.type === "arc" && element.radius <= DEFAULT_TOLERANCES.length) {
      issues.push(
        createIssue("error", LINER_DIAGNOSTIC_CODES.clothoidInvalidRadius, {
          entityType: "alignmentElement",
          entityId: element.id,
          entityPath: `elements[${index}].radius`,
          field: "radius",
        }),
      );
    }
    if (
      element.type === "clothoid" &&
      (!Number.isFinite(element.clothoidParameter) ||
        element.clothoidParameter <= DEFAULT_TOLERANCES.length)
    ) {
      issues.push(
        createIssue("error", LINER_DIAGNOSTIC_CODES.clothoidInvalidRadius, {
          entityType: "alignmentElement",
          entityId: element.id,
          entityPath: `elements[${index}].clothoidParameter`,
          field: "clothoidParameter",
        }),
      );
    }
  }
  issues.push(...checkC0Continuity(alignment.elements));
  issues.push(...checkC1Continuity(alignment.elements));
  const clothoidElements = alignment.elements.filter(
    (element): element is ClothoidElement => element.type === "clothoid",
  );
  issues.push(...checkClothoidPrecision(clothoidElements));
  return issues;
}
