import type {
  VerticalAlignmentDraft,
  VerticalElementDraft,
  VerticalGradeElementDraft,
} from "../schema/types";
import { createIssue, LINER_DIAGNOSTIC_CODES } from "./diagnostics";
import type { ValidationIssue } from "./types";

export type HorizontalStationPoint = {
  x: number;
  y: number;
  station: number;
};

export type MergedVerticalPoint = HorizontalStationPoint & {
  z: number | null;
};

export type MergeVerticalZResult = {
  points: MergedVerticalPoint[];
  diagnostics: ValidationIssue[];
};

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

function gradeElevationAt(element: VerticalGradeElementDraft, station: number): number {
  return element.startElevation + element.grade * (station - element.startStation);
}

export function mergeVerticalZ(
  points: HorizontalStationPoint[],
  verticalAlignment: VerticalAlignmentDraft,
): MergeVerticalZResult {
  const diagnostics: ValidationIssue[] = [];
  const mergedPoints: MergedVerticalPoint[] = [];

  for (const point of points) {
    const { station } = point;

    if (!Number.isFinite(station)) {
      mergedPoints.push({ ...point, z: null });
      diagnostics.push(
        createIssue("error", LINER_DIAGNOSTIC_CODES.profileCoverageGap, {
          station,
          detail: "Station is not finite; no vertical profile coverage.",
        }),
      );
      continue;
    }

    const element = findContainingElement(verticalAlignment.elements, station);

    if (element === null) {
      mergedPoints.push({ ...point, z: null });
      diagnostics.push(
        createIssue("error", LINER_DIAGNOSTIC_CODES.profileCoverageGap, {
          station,
          entityType: "verticalAlignment",
          entityId: verticalAlignment.id,
          detail: `No vertical element covers station ${station}.`,
        }),
      );
      continue;
    }

    if (element.type === "parabolic") {
      mergedPoints.push({ ...point, z: null });
      diagnostics.push(
        createIssue("warning", LINER_DIAGNOSTIC_CODES.profileParabolicZMergeDeferred, {
          station,
          entityType: "verticalElement",
          entityId: element.id,
          // Phase 3.5-4: parabolic z merge via elevationAt / full profile evaluation.
          detail:
            "Parabolic vertical element; z merge is grade-only until Phase 3.5-4 combine3DCoordinates.",
        }),
      );
      continue;
    }

    mergedPoints.push({
      ...point,
      z: gradeElevationAt(element, station),
    });
  }

  return { points: mergedPoints, diagnostics };
}
