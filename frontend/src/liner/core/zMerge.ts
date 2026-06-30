import type {
  VerticalAlignmentDraft,
  VerticalElementDraft,
} from "../schema/types";
import { elevationAt } from "./elevationAt";
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

    const z = elevationAt(station, verticalAlignment);

    if (z === null) {
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

    mergedPoints.push({
      ...point,
      z,
    });
  }

  return { points: mergedPoints, diagnostics };
}

export function verticalProfileEndStation(elements: readonly VerticalElementDraft[]): number {
  let maxEnd = 0;
  for (const element of elements) {
    maxEnd = Math.max(maxEnd, element.endStation);
  }
  return maxEnd;
}
