import type {
  VerticalAlignmentDraft,
  VerticalElementDraft,
} from "../schema/types";
import { createIssue, LINER_DIAGNOSTIC_CODES } from "./diagnostics";
import { DEFAULT_TOLERANCES } from "./tolerances";
import type { ValidationIssue } from "./types";
import { checkVerticalContinuity } from "./verticalContinuity";
import { checkVerticalProfileEndCoverage } from "./validateVerticalCoverage";

/** Soft grade limit (|g| > 8%) per profile_rules.md */
export const VERTICAL_GRADE_SOFT_LIMIT = 0.08;

/** Hard grade limit (|g| > 12%) per profile_rules.md */
export const VERTICAL_GRADE_HARD_LIMIT = 0.12;

function gradesForElement(element: VerticalElementDraft): number[] {
  if (element.type === "grade") {
    return [element.grade];
  }
  return [element.startGrade, element.endGrade];
}

export function checkVerticalElementBounds(
  verticalAlignment: VerticalAlignmentDraft,
  horizontalTotalLength: number,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const stationTolerance = DEFAULT_TOLERANCES.station;

  for (let index = 0; index < verticalAlignment.elements.length; index += 1) {
    const element = verticalAlignment.elements[index]!;

    if (element.startStation < -stationTolerance) {
      issues.push(
        createIssue("error", LINER_DIAGNOSTIC_CODES.stationOutOfRange, {
          entityType: "verticalElement",
          entityId: element.id,
          entityPath: `elements[${index}]`,
          field: "startStation",
          station: element.startStation,
          detail: `Vertical element start station ${element.startStation} m is below 0.`,
        }),
      );
    }

    if (element.startStation >= element.endStation - stationTolerance) {
      issues.push(
        createIssue("error", LINER_DIAGNOSTIC_CODES.zeroLengthSegment, {
          entityType: "verticalElement",
          entityId: element.id,
          entityPath: `elements[${index}]`,
          field: "length",
          detail: `Vertical element ${element.id} has non-positive length.`,
        }),
      );
    }

    if (element.endStation > horizontalTotalLength + stationTolerance) {
      issues.push(
        createIssue("error", LINER_DIAGNOSTIC_CODES.stationOutOfRange, {
          entityType: "verticalElement",
          entityId: element.id,
          entityPath: `elements[${index}]`,
          field: "endStation",
          station: element.endStation,
          detail: `Vertical element end station ${element.endStation} m exceeds alignment length ${horizontalTotalLength} m.`,
        }),
      );
    }
  }

  return issues;
}

export function checkVerticalStartCoverage(
  verticalAlignment: VerticalAlignmentDraft,
): ValidationIssue[] {
  const first = verticalAlignment.elements[0];
  if (first === undefined) {
    return [];
  }

  if (first.startStation > DEFAULT_TOLERANCES.station) {
    return [
      createIssue("error", LINER_DIAGNOSTIC_CODES.profileCoverageGap, {
        entityType: "verticalAlignment",
        entityId: verticalAlignment.id,
        entityPath: "elements[0]",
        field: "startStation",
        station: first.startStation,
        detail: `Vertical profile starts at ${first.startStation} m but must cover from 0 m.`,
      }),
    ];
  }

  return [];
}

export function checkVerticalOverlapAndAdjacency(
  verticalAlignment: VerticalAlignmentDraft,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const elements = verticalAlignment.elements;
  const stationTolerance = DEFAULT_TOLERANCES.station;

  for (let leftIndex = 0; leftIndex < elements.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < elements.length; rightIndex += 1) {
      const left = elements[leftIndex]!;
      const right = elements[rightIndex]!;
      const overlapStart = Math.max(left.startStation, right.startStation);
      const overlapEnd = Math.min(left.endStation, right.endStation);
      if (overlapEnd - overlapStart > stationTolerance) {
        issues.push(
          createIssue("error", LINER_DIAGNOSTIC_CODES.profileOverlap, {
            entityType: "verticalElement",
            entityId: right.id,
            entityPath: `elements[${rightIndex}]`,
            detail: `Vertical segments ${left.id} and ${right.id} overlap between ${overlapStart} m and ${overlapEnd} m.`,
          }),
        );
      }
    }
  }

  for (let index = 1; index < elements.length; index += 1) {
    const previous = elements[index - 1]!;
    const current = elements[index]!;
    const gap = current.startStation - previous.endStation;

    if (gap > stationTolerance) {
      issues.push(
        createIssue("error", LINER_DIAGNOSTIC_CODES.profileAdjacencyGap, {
          entityType: "verticalElement",
          entityId: current.id,
          entityPath: `elements[${index}]`,
          field: "startStation",
          station: current.startStation,
          detail: `Gap of ${gap} m between vertical elements ${previous.id} and ${current.id}.`,
        }),
      );
    }
  }

  return issues;
}

export function checkVerticalGradeLimits(
  verticalAlignment: VerticalAlignmentDraft,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (let index = 0; index < verticalAlignment.elements.length; index += 1) {
    const element = verticalAlignment.elements[index]!;
    for (const grade of gradesForElement(element)) {
      const absGrade = Math.abs(grade);
      if (absGrade > VERTICAL_GRADE_HARD_LIMIT) {
        issues.push(
          createIssue("error", LINER_DIAGNOSTIC_CODES.profileGradeExceedsLimit, {
            entityType: "verticalElement",
            entityId: element.id,
            entityPath: `elements[${index}]`,
            field: "grade",
            detail: `Grade ${(grade * 100).toFixed(3)}% exceeds hard limit ${VERTICAL_GRADE_HARD_LIMIT * 100}%.`,
          }),
        );
      } else if (absGrade > VERTICAL_GRADE_SOFT_LIMIT) {
        issues.push(
          createIssue("warning", LINER_DIAGNOSTIC_CODES.profileGradeExceedsLimit, {
            entityType: "verticalElement",
            entityId: element.id,
            entityPath: `elements[${index}]`,
            field: "grade",
            detail: `Grade ${(grade * 100).toFixed(3)}% exceeds soft limit ${VERTICAL_GRADE_SOFT_LIMIT * 100}%.`,
          }),
        );
      }
    }
  }

  return issues;
}

export function validateVerticalAlignment(
  verticalAlignment: VerticalAlignmentDraft | undefined,
  horizontalTotalLength: number,
): ValidationIssue[] {
  if (verticalAlignment === undefined) {
    return [];
  }

  const issues: ValidationIssue[] = [
    ...checkVerticalElementBounds(verticalAlignment, horizontalTotalLength),
    ...checkVerticalStartCoverage(verticalAlignment),
    ...checkVerticalOverlapAndAdjacency(verticalAlignment),
    ...checkVerticalContinuity(verticalAlignment),
    ...checkVerticalGradeLimits(verticalAlignment),
    ...checkVerticalProfileEndCoverage(verticalAlignment, horizontalTotalLength),
  ];

  return issues;
}
