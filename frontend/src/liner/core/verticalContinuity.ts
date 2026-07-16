import type {
  VerticalAlignmentDraft,
  VerticalElementDraft,
} from "../schema/types";
import { createIssue, LINER_DIAGNOSTIC_CODES } from "./diagnostics";
import { DEFAULT_TOLERANCES } from "./tolerances";
import type { ValidationIssue } from "./types";

const GRADE_CONTINUITY_TOLERANCE = 1e-9;

type VerticalEndpointEvaluation = {
  elevation: number;
  grade: number;
};

function displayStartElevation(value: number | undefined): number {
  return value ?? 0;
}

function evaluateElementStart(element: VerticalElementDraft): VerticalEndpointEvaluation {
  if (element.type === "grade") {
    return {
      elevation: element.startElevation,
      grade: element.grade,
    };
  }

  return {
    elevation: displayStartElevation(element.startElevation),
    grade: element.startGrade,
  };
}

function evaluateElementEnd(element: VerticalElementDraft): VerticalEndpointEvaluation {
  if (element.type === "grade") {
    const deltaStation = element.endStation - element.startStation;
    return {
      elevation: element.startElevation + element.grade * deltaStation,
      grade: element.grade,
    };
  }

  const startElevation = displayStartElevation(element.startElevation);
  const length = element.length;
  const rate = length === 0 ? 0 : (element.endGrade - element.startGrade) / length;
  const endElevation =
    startElevation + element.startGrade * length + 0.5 * rate * length * length;

  return {
    elevation: endElevation,
    grade: element.endGrade,
  };
}

export function checkVerticalContinuity(
  verticalAlignment: VerticalAlignmentDraft,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const { elements } = verticalAlignment;

  for (let index = 1; index < elements.length; index += 1) {
    const prev = elements[index - 1]!;
    const next = elements[index]!;
    const prevEnd = evaluateElementEnd(prev);
    const nextStart = evaluateElementStart(next);

    const elevationGap = Math.abs(prevEnd.elevation - nextStart.elevation);
    if (elevationGap > DEFAULT_TOLERANCES.elevation) {
      issues.push(
        createIssue("error", LINER_DIAGNOSTIC_CODES.profileElevationDiscontinuity, {
          entityType: "verticalElement",
          entityId: next.id,
          entityPath: `elements[${index}]`,
          field: "startElevation",
          detail: `C0 elevation gap ${elevationGap} m exceeds tolerance ${DEFAULT_TOLERANCES.elevation} m`,
        }),
      );
    }

    const requiresGradeContinuity = prev.type === "parabolic" || next.type === "parabolic";
    const gradeGap = Math.abs(prevEnd.grade - nextStart.grade);
    if (requiresGradeContinuity && gradeGap > GRADE_CONTINUITY_TOLERANCE) {
      issues.push(
        createIssue("error", LINER_DIAGNOSTIC_CODES.profileGradeDiscontinuity, {
          entityType: "verticalElement",
          entityId: next.id,
          entityPath: `elements[${index}]`,
          field: "grade",
          detail: `C1 grade gap ${gradeGap} exceeds tolerance ${GRADE_CONTINUITY_TOLERANCE}`,
        }),
      );
    }
  }

  return issues;
}
