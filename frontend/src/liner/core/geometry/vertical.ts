export type GradeSegment = {
  type: "grade";
  id: string;
  startPhysicalDistance: number;
  startElevation: number;
  grade: number;
  length: number;
};

export type ParabolicVerticalCurve = {
  type: "parabolic";
  id: string;
  startPhysicalDistance: number;
  startElevation: number;
  gradeIn: number;
  gradeOut: number;
  length: number;
};

export type VerticalElement = GradeSegment | ParabolicVerticalCurve;

export type VerticalEvaluation = {
  physicalDistance: number;
  elevation: number;
  grade: number;
  elementId: string;
};

export function evaluateVerticalElement(
  element: VerticalElement,
  physicalDistance: number,
): VerticalEvaluation {
  const s = Math.min(
    Math.max(physicalDistance - element.startPhysicalDistance, 0),
    element.length,
  );
  if (element.type === "grade") {
    return {
      physicalDistance,
      elevation: element.startElevation + element.grade * s,
      grade: element.grade,
      elementId: element.id,
    };
  }

  const gradeRate =
    element.length === 0 ? 0 : (element.gradeOut - element.gradeIn) / element.length;
  return {
    physicalDistance,
    elevation: element.startElevation + element.gradeIn * s + 0.5 * gradeRate * s * s,
    grade: element.gradeIn + gradeRate * s,
    elementId: element.id,
  };
}
