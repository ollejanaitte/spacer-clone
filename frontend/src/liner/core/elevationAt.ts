import type {
  VerticalAlignmentDraft,
  VerticalElementDraft,
} from "../schema/types";

function displayStartElevation(value: number | undefined): number {
  return value ?? 0;
}

function evaluateVerticalElementElevation(
  element: VerticalElementDraft,
  station: number,
): number {
  const u = station - element.startStation;

  if (element.type === "grade") {
    return element.startElevation + element.grade * u;
  }

  const startElevation = displayStartElevation(element.startElevation);
  const length = element.length;
  const rate = length === 0 ? 0 : (element.endGrade - element.startGrade) / length;

  return startElevation + element.startGrade * u + 0.5 * rate * u * u;
}

function findContainingElement(
  elements: VerticalElementDraft[],
  station: number,
): VerticalElementDraft | null {
  for (const element of elements) {
    if (element.startStation <= station && station <= element.endStation) {
      return element;
    }
  }
  return null;
}

export function elevationAt(
  station: number,
  verticalAlignment: VerticalAlignmentDraft,
): number | null {
  if (!Number.isFinite(station)) {
    return null;
  }

  const element = findContainingElement(verticalAlignment.elements, station);
  if (element === null) {
    return null;
  }

  return evaluateVerticalElementElevation(element, station);
}
